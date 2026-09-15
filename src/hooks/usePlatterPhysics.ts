import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  calculatePlatterTargetVelocity,
  computeNextPlatterVelocity,
  audioEngine,
  RPM_TO_DEG_PER_SEC,
  DEG_TO_RAD,
} from '../services/audioEngine';

export interface UsePlatterPhysicsOptions {
  /** Playback state (motor powered vs unpowered) */
  isPlaying: boolean;
  /** Current playback speed multiplier (e.g. 1.0, 1.25, 0.5) */
  playbackSpeed?: number;
  /** Technics pitch fader percentage offset (e.g. -8 to +8, -16 to +16) */
  pitchPercent?: number;
  /** RPM Mode: true for 33⅓ RPM (200°/s), false for 45 RPM (270°/s) */
  is33?: boolean;
  /** External brake signal (true during solenoid reverse-torque motor brake) */
  isBraking?: boolean;
  /** Optional HTMLMediaElement to couple with realistic slow-start and spin-down audio pitch */
  audioElement?: HTMLMediaElement | null;
  /** Whether to preserve audio pitch when locked at steady-state speed (Key Lock / Master Tempo) */
  isKeyLock?: boolean;
  /** Whether this hook should drive the audio element's playbackRate and pitch during transitions */
  enableAudioSync?: boolean;
  /** Motor slow-start spin-up time in milliseconds (default: 450ms) */
  startDurationMs?: number;
  /** Electronic solenoid motor brake spin-down time in milliseconds (default: 750ms) */
  brakeDurationMs?: number;
  /** Callback when platter has completely spun up to target quartz speed */
  onSpinUpComplete?: () => void;
  /** Callback when platter has completely come to a halt */
  onBrakeComplete?: () => void;
  /** High-frequency velocity telemetry callback */
  onVelocityChange?: (velocityDegPerSec: number, rpm: number) => void;
}

export interface PlatterPhysicsResult {
  /** Current instantaneous angular velocity in degrees per second */
  angularVelocity: number;
  /** Current angular velocity in radians per second */
  angularVelocityRad: number;
  /** Current continuous platter rotation angle in degrees [0, 360) for CSS rotate transforms */
  platterAngle: number;
  /** Total cumulative platter rotation in degrees since mount */
  totalAngle: number;
  /** Current instantaneous platter RPM */
  rpm: number;
  /** Target platter RPM based on speed switch + pitch fader */
  targetRpm: number;
  /** Target angular velocity in degrees per second */
  targetVelocity: number;
  /** Normalized speed ratio (angularVelocity / targetVelocity), 0.0 to 1.0+ */
  speedRatio: number;
  /** Physical motor state */
  status: 'stopped' | 'accelerating' | 'running' | 'decelerating';
  /** Whether the platter is actively in motion */
  isSpinning: boolean;
  /** Whether the motor is accelerating (slow-start or positive pitch transition) */
  isAccelerating: boolean;
  /** Whether the platter is decelerating (spin-down brake or negative pitch transition) */
  isDecelerating: boolean;
  /** Whether the motor electronic brake is actively engaged */
  isBraking: boolean;
  /** Apply momentary angular nudge (DJ platter push/drag in deg/s) */
  nudge: (deltaDegPerSec: number) => void;
  /** Directly set or calibrate platter rotational angle */
  setPlatterAngle: (angle: number) => void;
  /** Reset platter rotation to 0 */
  resetPlatter: () => void;
}

/**
 * Custom physics-based hook in the audio engine that calculates the platter's
 * angular velocity based on playback speed and pitch fader adjustments, allowing
 * for realistic slow-start and spin-down physics when the user toggles play/pause.
 */
export function usePlatterPhysics(options: UsePlatterPhysicsOptions): PlatterPhysicsResult {
  const {
    isPlaying,
    playbackSpeed = 1.0,
    pitchPercent = 0,
    is33 = true,
    isBraking = false,
    audioElement = null,
    isKeyLock = false,
    enableAudioSync = false,
    startDurationMs = 450,
    brakeDurationMs = 750,
    onSpinUpComplete,
    onBrakeComplete,
    onVelocityChange,
  } = options;

  // Internal physics refs to avoid unnecessary re-renders in the high-frequency animation loop
  const angularVelocityRef = useRef<number>(0);
  const platterAngleRef = useRef<number>(0);
  const totalAngleRef = useRef<number>(0);
  const lastTimestampRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const wasSpinningUpRef = useRef<boolean>(false);
  const wasSpinningDownRef = useRef<boolean>(false);

  // Synchronized state for UI rendering
  const [angularVelocity, setAngularVelocity] = useState<number>(0);
  const [platterAngle, setPlatterAngleState] = useState<number>(0);
  const [totalAngle, setTotalAngle] = useState<number>(0);

  // Compute steady-state target velocity based on 33⅓/45 RPM, speed factor, and pitch slider
  const targetVelocityData = useMemo(() => {
    return calculatePlatterTargetVelocity({
      is33,
      playbackSpeed,
      pitchPercent,
    });
  }, [is33, playbackSpeed, pitchPercent]);

  // Target velocity in degrees/second when motor is powered and not braking
  const targetVelocity = useMemo(() => {
    if (!isPlaying || isBraking) return 0;
    return targetVelocityData.targetDegPerSec;
  }, [isPlaying, isBraking, targetVelocityData.targetDegPerSec]);

  // Compute effective audio speed for coupling
  const effectiveAudioRate = useMemo(() => {
    return Math.max(0.1, playbackSpeed * (1 + pitchPercent / 100));
  }, [playbackSpeed, pitchPercent]);

  // Safe manual angle setter
  const setPlatterAngle = useCallback((angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    platterAngleRef.current = normalized;
    totalAngleRef.current = angle;
    setPlatterAngleState(normalized);
    setTotalAngle(angle);
  }, []);

  const resetPlatter = useCallback(() => {
    setPlatterAngle(0);
  }, [setPlatterAngle]);

  // Momentary nudge for manual platter manipulation
  const nudge = useCallback((deltaDegPerSec: number) => {
    angularVelocityRef.current = Math.max(0, angularVelocityRef.current + deltaDegPerSec);
    setAngularVelocity(angularVelocityRef.current);
  }, []);

  // Main physics simulation loop driven by requestAnimationFrame
  useEffect(() => {
    let isMounted = true;
    const startSec = Math.max(0.1, startDurationMs / 1000);
    const brakeSec = Math.max(0.1, brakeDurationMs / 1000);

    const updatePlatterPhysics = (now: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = now;
      }
      // Clamped delta time in seconds (max 50ms to prevent huge jumps if tab was backgrounded)
      const dt = Math.min(0.05, (now - lastTimestampRef.current) / 1000);
      lastTimestampRef.current = now;

      const currentVel = angularVelocityRef.current;
      const targetVel = targetVelocity;

      // Integrate velocity using direct-drive motor acceleration and brake deceleration models
      const nextVel = computeNextPlatterVelocity(
        currentVel,
        targetVel,
        dt,
        isBraking || !isPlaying,
        startSec,
        brakeSec
      );

      angularVelocityRef.current = nextVel;

      // Integrate angular position
      const nextTotalAngle = totalAngleRef.current + nextVel * dt;
      totalAngleRef.current = nextTotalAngle;
      const nextPlatterAngle = (platterAngleRef.current + nextVel * dt) % 360;
      platterAngleRef.current = nextPlatterAngle;

      // Audio engine coupling: dynamically bend audio pitch during slow-start and spin-down
      if (enableAudioSync && audioElement) {
        audioEngine.applyPlatterPitchRamp(
          audioElement,
          nextVel,
          targetVel > 0 ? targetVel : targetVelocityData.targetDegPerSec,
          effectiveAudioRate,
          isKeyLock,
          isBraking || (!isPlaying && nextVel > 0)
        );
      }

      // Check for state transitions and fire callbacks
      if (isPlaying && !isBraking && targetVel > 0) {
        if (currentVel < targetVel * 0.985 && nextVel >= targetVel * 0.985) {
          if (!wasSpinningUpRef.current) {
            wasSpinningUpRef.current = true;
            onSpinUpComplete?.();
          }
        } else if (nextVel < targetVel * 0.985) {
          wasSpinningUpRef.current = false;
        }
      }

      if ((isBraking || !isPlaying) && currentVel > 0 && nextVel === 0) {
        if (!wasSpinningDownRef.current) {
          wasSpinningDownRef.current = true;
          if (enableAudioSync && audioElement && !audioElement.paused) {
            try {
              audioElement.pause();
              audioElement.playbackRate = effectiveAudioRate;
            } catch {}
          }
          onBrakeComplete?.();
        }
      } else if (isPlaying && !isBraking) {
        wasSpinningDownRef.current = false;
      }

      // High-frequency telemetry
      if (onVelocityChange) {
        const instantRpm = (nextVel / 360) * 60;
        onVelocityChange(nextVel, instantRpm);
      }

      // Update React state for visual frame rendering
      if (isMounted) {
        setAngularVelocity(nextVel);
        setPlatterAngleState(nextPlatterAngle);
        setTotalAngle(nextTotalAngle);
      }

      // Continue animation loop if motor is active or platter is still rotating
      if (isPlaying || isBraking || nextVel > 0.1) {
        rafIdRef.current = requestAnimationFrame(updatePlatterPhysics);
      } else {
        lastTimestampRef.current = null;
        rafIdRef.current = null;
      }
    };

    // Start loop if needed
    if (isPlaying || isBraking || angularVelocityRef.current > 0.1) {
      if (!rafIdRef.current) {
        lastTimestampRef.current = null;
        rafIdRef.current = requestAnimationFrame(updatePlatterPhysics);
      }
    }

    return () => {
      isMounted = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [
    isPlaying,
    isBraking,
    targetVelocity,
    targetVelocityData.targetDegPerSec,
    effectiveAudioRate,
    isKeyLock,
    enableAudioSync,
    audioElement,
    startDurationMs,
    brakeDurationMs,
    onSpinUpComplete,
    onBrakeComplete,
    onVelocityChange,
  ]);

  // Derived metrics
  const isSpinning = angularVelocity > 0.1;
  const isAccelerating = isPlaying && !isBraking && targetVelocity > 0 && angularVelocity < targetVelocity * 0.985;
  const isDecelerating = (isBraking || !isPlaying) ? isSpinning : angularVelocity > targetVelocity * 1.015;

  const status: PlatterPhysicsResult['status'] = !isSpinning
    ? 'stopped'
    : isAccelerating
    ? 'accelerating'
    : isDecelerating
    ? 'decelerating'
    : 'running';

  const rpm = (angularVelocity / 360) * 60;
  const targetRpm = targetVelocityData.targetRpm;
  const speedRatio = targetVelocity > 0 ? Math.min(1.5, angularVelocity / targetVelocity) : 0;
  const angularVelocityRad = angularVelocity * DEG_TO_RAD;

  return {
    angularVelocity,
    angularVelocityRad,
    platterAngle,
    totalAngle,
    rpm,
    targetRpm,
    targetVelocity,
    speedRatio,
    status,
    isSpinning,
    isAccelerating,
    isDecelerating,
    isBraking,
    nudge,
    setPlatterAngle,
    resetPlatter,
  };
}
