import React, { useEffect, useState, useMemo } from 'react';
import { Mic2, Sparkles, Disc, Image as ImageIcon, Flame, Sliders, Layers } from 'lucide-react';
import { MediaItem, VisualizerMode, SlipmatConfig } from '../../types';
import { VinylDustCanvas } from './VinylDustCanvas';
import { useVinylPalette } from './useVinylPalette';
import { VinylLyricsOverlay } from './VinylLyricsOverlay';
import { VinylHeatmapOverlay, HeatmapPalette } from './VinylHeatmapOverlay';
import { VinylHeatmapHUD } from './VinylHeatmapHUD';
import { SLIPMAT_DESIGNS, loadSlipmatConfig, saveSlipmatConfig } from './slipmatData';
import { SlipmatRenderer } from './SlipmatRenderer';
import { SlipmatCustomizerModal } from './SlipmatCustomizerModal';
import { LedVuMeter } from './LedVuMeter';

export type AmbientLightingMode = 'dynamic' | 'vivid' | 'warm' | 'pristine';

interface VinylTurntableProps {
  currentTrack: MediaItem | null;
  isPlaying: boolean;
  isBraking?: boolean;
  progress: number; // 0 to 1
  currentTime?: number;
  duration?: number;
  accentColor?: string;
  enableDust?: boolean;
  enableStrobe?: boolean;
  isCrackleEnabled?: boolean;
  onToggleCrackle?: () => void;
  bassEnergy?: number; // 0 to 1 audio reactive
  onSeekToRatio?: (ratio: number) => void;
  onSeek?: (seconds: number) => void;
  onPlayPause?: () => void;
  playbackSpeed?: number;
  pitchPercent?: number;
  pitchRange?: 8 | 16;
  isKeyLock?: boolean;
  onPitchChange?: (pitch: number) => void;
  onPitchRangeToggle?: () => void;
  onKeyLockToggle?: () => void;
  onResetPitch?: () => void;
  onSpeedChange?: (speed: number) => void;
  onOpenArtworkEditor?: () => void;
  visualizerMode?: VisualizerMode;
  onVisualizerModeChange?: (mode: VisualizerMode) => void;
  slipmatConfig?: SlipmatConfig;
  onUpdateSlipmatConfig?: (config: SlipmatConfig) => void;
  onOpenSlipmatStudio?: () => void;
}

export const VinylTurntable = ({
  currentTrack,
  isPlaying,
  isBraking = false,
  progress,
  currentTime,
  duration,
  accentColor = '#06b6d4',
  enableDust = true,
  enableStrobe = true,
  isCrackleEnabled = true,
  onToggleCrackle,
  bassEnergy = 0,
  onSeekToRatio,
  onSeek,
  onPlayPause,
  playbackSpeed = 1,
  pitchPercent = 0,
  pitchRange = 8,
  isKeyLock = false,
  onPitchChange,
  onPitchRangeToggle,
  onKeyLockToggle,
  onResetPitch,
  onSpeedChange,
  onOpenArtworkEditor,
  visualizerMode,
  onVisualizerModeChange,
  slipmatConfig,
  onUpdateSlipmatConfig,
  onOpenSlipmatStudio,
}: VinylTurntableProps) => {
  const [internalPitch, setInternalPitch] = useState(0);
  const [targetLightOn, setTargetLightOn] = useState(true);
  const [dustActive, setDustActive] = useState(enableDust);
  const [ambientMode, setAmbientMode] = useState<AmbientLightingMode>('dynamic');
  const [isDraggingPitch, setIsDraggingPitch] = useState(false);
  const [showPitchTooltip, setShowPitchTooltip] = useState(false);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);
  const [lyricsMode, setLyricsMode] = useState<'full' | 'hud'>('full');

  // --- Real-Time Slipmat Customization State ---
  const [localSlipmatConfig, setLocalSlipmatConfig] = useState<SlipmatConfig>(() => loadSlipmatConfig());
  const [showSlipmatModal, setShowSlipmatModal] = useState<boolean>(false);

  const activeSlipmatConfig = slipmatConfig || localSlipmatConfig;

  const handleUpdateSlipmat = (newConfig: SlipmatConfig) => {
    saveSlipmatConfig(newConfig);
    setLocalSlipmatConfig(newConfig);
    if (onUpdateSlipmatConfig) {
      onUpdateSlipmatConfig(newConfig);
    }
  };

  const activeSlipmatDesign = useMemo(() => {
    return (
      SLIPMAT_DESIGNS.find((d) => d.id === activeSlipmatConfig.activeDesignId) ||
      SLIPMAT_DESIGNS[0]
    );
  }, [activeSlipmatConfig.activeDesignId]);

  const isBarePlatter = activeSlipmatConfig.vinylDisplayMode === 'bare-platter';
  const isClearCrystal = activeSlipmatConfig.vinylDisplayMode === 'clear-crystal';
  const isSmokeTranslucent = activeSlipmatConfig.vinylDisplayMode === 'smoke-translucent';
  const isClassicBlack = activeSlipmatConfig.vinylDisplayMode === 'classic-black';
  const isPictureDisc = activeSlipmatConfig.vinylDisplayMode === 'picture-disc' || !activeSlipmatConfig.vinylDisplayMode;

  // --- Real-Time Vinyl Frequency Heatmap Overlay State ---
  const [heatmapActive, setHeatmapActive] = useState<boolean>(() => visualizerMode === 'vinyl-heatmap');
  const [heatmapPalette, setHeatmapPalette] = useState<HeatmapPalette>('thermal');
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(0.85);
  const [showHeatmapHUD, setShowHeatmapHUD] = useState<boolean>(false);

  // Synchronize when visualizerMode changes externally to or from vinyl-heatmap
  useEffect(() => {
    if (visualizerMode === 'vinyl-heatmap') {
      setHeatmapActive(true);
    }
  }, [visualizerMode]);

  const toggleHeatmap = () => {
    const next = !heatmapActive;
    setHeatmapActive(next);
    if (next && onVisualizerModeChange) {
      onVisualizerModeChange('vinyl-heatmap');
    }
  };

  const cycleHeatmapPalette = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: HeatmapPalette[] = ['thermal', 'plasma', 'viridis', 'cyberpunk'];
    const idx = order.indexOf(heatmapPalette);
    const next = order[(idx + 1) % order.length];
    setHeatmapPalette(next);
  };

  // Physical Tonearm Lift & Swing Lifecycle Stages
  type TonearmStage =
    | 'parked'           // Resting at 0.0deg on cradle clamp (lowered)
    | 'lifting_to_play'  // Cue lift active at 0.0deg (raising up before swing)
    | 'swinging_to_play' // Elevated, rotating from 0.0deg -> grooveAngle
    | 'lowering_to_play' // At grooveAngle, gently descending onto the record
    | 'tracking'         // Stylus diamond in groove, tracking music progress
    | 'lifting_to_rest'  // Paused/ended: lifting vertically up off the record at current angle
    | 'swinging_to_rest' // Elevated, rotating from grooveAngle -> 0.0deg
    | 'lowering_to_rest';// At 0.0deg, descending into rest cradle clamp

  const [tonearmStage, setTonearmStage] = useState<TonearmStage>(() => (isPlaying ? 'tracking' : 'parked'));
  const [dragArmAngle, setDragArmAngle] = useState<number | null>(null);
  const [isDraggingArm, setIsDraggingArm] = useState<boolean>(false);
  const tonearmTimersRef = React.useRef<number[]>([]);
  const tonearmGimbalRef = React.useRef<HTMLDivElement>(null);
  const pitchTrackRef = React.useRef<HTMLDivElement>(null);

  const calculatedDuration = duration || currentTrack?.duration || 180;
  const calculatedCurrentTime = currentTime !== undefined ? currentTime : progress * calculatedDuration;

  // Clamped progress from 0 (start of music) to 1 (end of music)
  const clampedProgress = Math.max(0, Math.min(1, progress || 0));

  // Clear active tonearm animation transition timers
  const clearTonearmTimers = () => {
    tonearmTimersRef.current.forEach((t) => window.clearTimeout(t));
    tonearmTimersRef.current = [];
  };

  // Orchestrate physical tonearm cue lift, swing, and drop lifecycle
  // NOTE: do NOT include clampedProgress in deps to avoid cancelling timers mid-transition
  useEffect(() => {
    if (isDraggingArm) return;
    clearTonearmTimers();

    const isTrackAtEnd = clampedProgress >= 0.998;
    const shouldPlay = (isPlaying || isBraking) && !isTrackAtEnd && Boolean(currentTrack);

    if (shouldPlay) {
      // Transition from resting or returning to active tracking
      if (
        tonearmStage === 'parked' ||
        tonearmStage === 'lowering_to_rest' ||
        tonearmStage === 'swinging_to_rest'
      ) {
        setTonearmStage('lifting_to_play');

        const t1 = window.setTimeout(() => {
          setTonearmStage('swinging_to_play');
        }, 260);

        const t2 = window.setTimeout(() => {
          setTonearmStage('lowering_to_play');
        }, 260 + 560);

        const t3 = window.setTimeout(() => {
          setTonearmStage('tracking');
        }, 260 + 560 + 320);

        tonearmTimersRef.current = [t1, t2, t3];
      } else if (tonearmStage === 'lifting_to_rest') {
        // Interrupted while lifting to rest: swing back to vinyl
        setTonearmStage('swinging_to_play');

        const t2 = window.setTimeout(() => {
          setTonearmStage('lowering_to_play');
        }, 560);

        const t3 = window.setTimeout(() => {
          setTonearmStage('tracking');
        }, 560 + 320);

        tonearmTimersRef.current = [t2, t3];
      }
    } else {
      // Transition from playing or swinging to resting position
      if (
        tonearmStage === 'tracking' ||
        tonearmStage === 'lowering_to_play' ||
        tonearmStage === 'swinging_to_play'
      ) {
        // 1. Physically lift vertically off the vinyl record surface
        setTonearmStage('lifting_to_rest');

        // 2. Swing back to 0.0deg (resting post outside the platter)
        const t1 = window.setTimeout(() => {
          setTonearmStage('swinging_to_rest');
        }, 260);

        // 3. Gently lower down into the rest cradle clamp
        const t2 = window.setTimeout(() => {
          setTonearmStage('lowering_to_rest');
        }, 260 + 580);

        // 4. Parked at rest
        const t3 = window.setTimeout(() => {
          setTonearmStage('parked');
        }, 260 + 580 + 300);

        tonearmTimersRef.current = [t1, t2, t3];
      } else if (tonearmStage === 'lifting_to_play') {
        // Interrupted while lifting at rest: lower back down
        setTonearmStage('lowering_to_rest');
        const t1 = window.setTimeout(() => {
          setTonearmStage('parked');
        }, 280);
        tonearmTimersRef.current = [t1];
      }
    }

    return () => clearTonearmTimers();
  }, [isPlaying, isBraking, currentTrack?.id]);

  // Auto-return at end of record
  useEffect(() => {
    if (clampedProgress >= 0.998 && tonearmStage === 'tracking' && !isDraggingArm) {
      setTonearmStage('lifting_to_rest');
      const t1 = window.setTimeout(() => setTonearmStage('swinging_to_rest'), 260);
      const t2 = window.setTimeout(() => setTonearmStage('lowering_to_rest'), 260 + 580);
      const t3 = window.setTimeout(() => setTonearmStage('parked'), 260 + 580 + 300);
      tonearmTimersRef.current = [t1, t2, t3];
    }
  }, [clampedProgress, tonearmStage, isDraggingArm]);

  const handleSeekSeconds = (seconds: number) => {
    if (onSeek) {
      onSeek(seconds);
    } else if (onSeekToRatio && calculatedDuration > 0) {
      onSeekToRatio(seconds / calculatedDuration);
    }
  };

  // Technics S-Shaped Tonearm mechanical tracking angles:
  // - Rest cradle: 0.0° (tonearm parked securely on rest post outside platter)
  // - Outer lead-in groove (start of music, 0% progress): 17.5°
  // - Inner run-out groove (end of music, 100% progress): 47.0°
  // Sweeps horizontally across the vinyl platter by 29.5° as track percentage advances from 0% to 100%
  const MIN_GROOVE_ANGLE = 17.5;
  const MAX_GROOVE_ANGLE = 47.0;
  const GROOVE_ANGLE_SPAN = MAX_GROOVE_ANGLE - MIN_GROOVE_ANGLE; // 29.5°

  // Interactive Dragging of Tonearm to Drop Needle / Seek
  const handleTonearmPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearTonearmTimers();
    setIsDraggingArm(true);
    setTonearmStage('tracking');

    const computeAngleFromEvent = (clientX: number, clientY: number) => {
      if (!tonearmGimbalRef.current) return 0;
      const rect = tonearmGimbalRef.current.getBoundingClientRect();
      const pivotX = rect.left + rect.width / 2;
      const pivotY = rect.top + rect.height / 2;
      const dx = clientX - pivotX;
      const dy = clientY - pivotY;

      // Vector down is 0 deg; inward to the left increases angle
      let deg = Math.atan2(-dx, dy) * (180 / Math.PI);
      if (deg < 0) deg = 0;
      if (deg > 52) deg = 52;
      return deg;
    };

    const initialAngle = computeAngleFromEvent(e.clientX, e.clientY);
    setDragArmAngle(initialAngle);

    const onPointerMove = (moveEvt: PointerEvent) => {
      moveEvt.preventDefault();
      const angle = computeAngleFromEvent(moveEvt.clientX, moveEvt.clientY);
      setDragArmAngle(angle);
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const finalAngle = computeAngleFromEvent(upEvt.clientX, upEvt.clientY);
      setIsDraggingArm(false);
      setDragArmAngle(null);
      // If dropped near rest cradle (< 12.5deg): Park and pause
      if (finalAngle < 12.5) {
        setTonearmStage('lowering_to_rest');
        const t1 = window.setTimeout(() => setTonearmStage('parked'), 280);
        tonearmTimersRef.current = [t1];
        if (isPlaying && onPlayPause) {
          onPlayPause();
        }
      } else {
        // Dropped on vinyl platter (tracks from MIN_GROOVE_ANGLE lead-in to MAX_GROOVE_ANGLE run-out)
        const ratio = Math.max(0, Math.min(1, (finalAngle - MIN_GROOVE_ANGLE) / GROOVE_ANGLE_SPAN));
        handleSeekSeconds(ratio * calculatedDuration);
        setTonearmStage('lowering_to_play');
        const t1 = window.setTimeout(() => setTonearmStage('tracking'), 280);
        tonearmTimersRef.current = [t1];

        if (!isPlaying && onPlayPause) {
          onPlayPause();
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Cue Lift Lever Click
  const handleCueLeverToggle = () => {
    clearTonearmTimers();
    if (tonearmStage === 'tracking' || tonearmStage === 'lowering_to_play') {
      setTonearmStage('lifting_to_rest');
    } else if (tonearmStage === 'lifting_to_rest' || tonearmStage === 'swinging_to_play') {
      setTonearmStage('lowering_to_play');
      const t1 = window.setTimeout(() => setTonearmStage('tracking'), 280);
      tonearmTimersRef.current = [t1];
    } else if (tonearmStage === 'parked') {
      if (onPlayPause) onPlayPause();
    }
  };

  // Rest Cradle Click
  const handleRestCradleClick = () => {
    clearTonearmTimers();
    setTonearmStage('swinging_to_rest');
    const t1 = window.setTimeout(() => setTonearmStage('lowering_to_rest'), 400);
    const t2 = window.setTimeout(() => setTonearmStage('parked'), 400 + 260);
    tonearmTimersRef.current = [t1, t2];
    if (isPlaying && onPlayPause) {
      onPlayPause();
    }
  };

  // Keyboard shortcut: Press 'L' to toggle turntable live lyrics overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setShowLyricsOverlay((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activePitch = onPitchChange !== undefined ? pitchPercent : internalPitch;
  const activePitchRange = pitchRange || 8;

  const handlePitchUpdate = (newPitch: number) => {
    if (onPitchChange) {
      onPitchChange(newPitch);
    } else {
      setInternalPitch(newPitch);
    }
  };

  // Dynamic Ambient Palette extracted from current track (artwork + metadata)
  const songPalette = useVinylPalette(currentTrack, accentColor);

  // Active ambient lighting profile based on selected mode
  const activeAmbient = useMemo(() => {
    if (ambientMode === 'warm') {
      return {
        primary: '#f59e0b',
        primaryRgb: [245, 158, 11] as [number, number, number],
        secondary: '#fbbf24',
        secondaryRgb: [251, 191, 36] as [number, number, number],
        highlight: '#fef3c7',
        highlightRgb: [254, 243, 199] as [number, number, number],
        ambientRgba: (alpha = 0.2) => `rgba(245, 158, 11, ${alpha})`,
        glowRgba: (alpha = 0.5) => `rgba(245, 158, 11, ${alpha})`,
        secondaryRgba: (alpha = 0.25) => `rgba(251, 191, 36, ${alpha})`,
        label: 'Studio Warm Gold',
      };
    }
    if (ambientMode === 'pristine') {
      return {
        primary: '#e2e8f0',
        primaryRgb: [226, 232, 240] as [number, number, number],
        secondary: '#cbd5e1',
        secondaryRgb: [203, 213, 225] as [number, number, number],
        highlight: '#ffffff',
        highlightRgb: [255, 255, 255] as [number, number, number],
        ambientRgba: (alpha = 0.2) => `rgba(255, 255, 255, ${alpha * 0.7})`,
        glowRgba: (alpha = 0.5) => `rgba(255, 255, 255, ${alpha * 0.7})`,
        secondaryRgba: (alpha = 0.25) => `rgba(200, 210, 230, ${alpha * 0.7})`,
        label: 'Hi-Fi Pristine',
      };
    }
    if (ambientMode === 'vivid') {
      return {
        ...songPalette,
        ambientRgba: (alpha = 0.3) => songPalette.ambientRgba(Math.min(1, alpha * 1.6)),
        glowRgba: (alpha = 0.7) => songPalette.glowRgba(Math.min(1, alpha * 1.5)),
        secondaryRgba: (alpha = 0.25) => songPalette.secondaryRgba(Math.min(1, alpha * 1.5)),
        label: `Vivid ${songPalette.label}`,
      };
    }
    return songPalette;
  }, [ambientMode, songPalette]);

  const cycleAmbientMode = () => {
    const modes: AmbientLightingMode[] = ['dynamic', 'vivid', 'warm', 'pristine'];
    setAmbientMode((prev) => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  };

  // Primary Anisotropic Conic Wedge Sheen (Anisotropic reflection from ambient light)
  const primarySheenStyle = useMemo(() => {
    const p = activeAmbient.primary;
    const hl = activeAmbient.highlight;
    const amb = activeAmbient.ambientRgba;
    const isVivid = ambientMode === 'vivid';
    const alphaEdge = isVivid ? 0.12 : 0.06;

    return {
      background: `conic-gradient(
        from 38deg at 50% 50%,
        transparent 0deg,
        ${amb(alphaEdge)} 16deg,
        ${p} 29deg,
        ${hl} 36deg,
        #ffffff 38deg,
        ${hl} 40deg,
        ${p} 47deg,
        ${amb(alphaEdge)} 60deg,
        transparent 75deg,
        transparent 180deg,
        ${amb(alphaEdge)} 196deg,
        ${p} 209deg,
        ${hl} 216deg,
        #ffffff 218deg,
        ${hl} 220deg,
        ${p} 227deg,
        ${amb(alphaEdge)} 240deg,
        transparent 255deg,
        transparent 360deg
      )`,
      opacity: (isPlaying ? 0.86 : 0.64) + bassEnergy * 0.14,
      mixBlendMode: 'screen' as const,
      transition: 'opacity 0.4s ease, filter 0.4s ease',
    };
  }, [activeAmbient, isPlaying, bassEnergy, ambientMode]);

  // Secondary Anisotropic Conic Wedge Sheen (Secondary chromatic reflection)
  const secondarySheenStyle = useMemo(() => {
    const sec = activeAmbient.secondary;
    const amb = activeAmbient.secondaryRgba;
    const isVivid = ambientMode === 'vivid';
    const alphaEdge = isVivid ? 0.1 : 0.05;

    return {
      background: `conic-gradient(
        from 128deg at 50% 50%,
        transparent 0deg,
        ${amb(alphaEdge)} 14deg,
        ${sec} 26deg,
        rgba(255, 255, 255, 0.5) 32deg,
        ${sec} 38deg,
        ${amb(alphaEdge)} 52deg,
        transparent 66deg,
        transparent 180deg,
        ${amb(alphaEdge)} 194deg,
        ${sec} 206deg,
        rgba(255, 255, 255, 0.5) 212deg,
        ${sec} 218deg,
        ${amb(alphaEdge)} 232deg,
        transparent 246deg,
        transparent 360deg
      )`,
      opacity: (isPlaying ? 0.72 : 0.52) + bassEnergy * 0.12,
      mixBlendMode: 'screen' as const,
      transition: 'opacity 0.4s ease, filter 0.4s ease',
    };
  }, [activeAmbient, isPlaying, bassEnergy, ambientMode]);

  // Concentric Microgroove Refraction Sheen
  const grooveRefractionStyle = useMemo(() => {
    return {
      background: `repeating-radial-gradient(
        circle at 50% 50%,
        transparent 0,
        transparent 6px,
        ${activeAmbient.ambientRgba(0.05)} 8px,
        transparent 11px
      )`,
      mixBlendMode: 'screen' as const,
      opacity: isPlaying ? 0.8 : 0.45,
    };
  }, [activeAmbient, isPlaying]);

  // Fresnel Grazing Outer Rim Reflection
  const fresnelRimStyle = useMemo(() => {
    return {
      background: `radial-gradient(
        circle at 50% 50%,
        transparent 82%,
        ${activeAmbient.ambientRgba(0.04)} 88%,
        ${activeAmbient.ambientRgba(0.24)} 94%,
        ${activeAmbient.glowRgba(0.4)} 97.5%,
        transparent 100%
      )`,
      mixBlendMode: 'screen' as const,
    };
  }, [activeAmbient]);

  // Track seek jumps to provide smooth easing on manual seek/scrub
  const lastProgressRef = React.useRef(clampedProgress);
  const isLargeSeek = Math.abs(clampedProgress - lastProgressRef.current) > 0.025;
  useEffect(() => {
    lastProgressRef.current = clampedProgress;
  }, [clampedProgress]);

  // Technics S-Shaped Tonearm mechanical tracking angles:
  // - Rest cradle: 0.0° (tonearm parked securely on rest post)
  // - Outer lead-in groove (start of music, 0% progress): MIN_GROOVE_ANGLE (17.5°)
  // - Inner run-out groove (end of music, 100% progress): MAX_GROOVE_ANGLE (47.0°)
  // Sweeps horizontally across the vinyl platter in real-time based on track percentage progress
  const targetArmAngle = useMemo(() => {
    if (dragArmAngle !== null) {
      return dragArmAngle;
    }
    if (!currentTrack) return 0.0;

    // When parked or returning to the rest post
    if (
      tonearmStage === 'parked' ||
      tonearmStage === 'lifting_to_play' ||
      tonearmStage === 'swinging_to_rest' ||
      tonearmStage === 'lowering_to_rest'
    ) {
      return 0.0;
    }

    // When tracking or descending onto the vinyl groove:
    // Moves horizontally across the platter proportional to clampedProgress (0% to 100%)
    return MIN_GROOVE_ANGLE + clampedProgress * GROOVE_ANGLE_SPAN;
  }, [currentTrack, tonearmStage, clampedProgress, dragArmAngle]);

  // Is the tonearm physically elevated in the air via the cue lifter?
  const isArmElevated =
    isDraggingArm ||
    tonearmStage === 'lifting_to_play' ||
    tonearmStage === 'swinging_to_play' ||
    tonearmStage === 'lifting_to_rest' ||
    tonearmStage === 'swinging_to_rest';

  const isCueLeverDown =
    tonearmStage === 'tracking' || tonearmStage === 'lowering_to_play';

  const isStylusGrounded =
    !isDraggingArm && (tonearmStage === 'tracking' || tonearmStage === 'lowering_to_play');

  const armTransitionDuration = useMemo(() => {
    if (isDraggingArm) return '0ms';
    switch (tonearmStage) {
      case 'swinging_to_play':
        return '560ms';
      case 'swinging_to_rest':
        return '580ms';
      case 'lifting_to_play':
      case 'lifting_to_rest':
      case 'lowering_to_play':
      case 'lowering_to_rest':
        return '260ms';
      case 'tracking':
      default:
        return isLargeSeek ? '360ms' : '280ms';
    }
  }, [tonearmStage, isDraggingArm, isLargeSeek]);

  const armTransitionTiming =
    tonearmStage === 'swinging_to_play' || tonearmStage === 'swinging_to_rest' || isLargeSeek
      ? 'cubic-bezier(0.25, 1, 0.5, 1)'
      : tonearmStage === 'tracking'
      ? 'linear'
      : 'cubic-bezier(0.4, 0, 0.2, 1)';

  // Current active groove radius inset: 3.5% at beginning (outer rim), 32% at last (inner rim)
  const currentGrooveInset = useMemo(() => {
    return 3.5 + clampedProgress * 28.5;
  }, [clampedProgress]);

  // Handle click on vinyl to seek across tracks (interactive vinyl touch!)
  const handleVinylClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeekToRatio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;

    // Outer lead-in groove is ~0.94 * radius (0% of music, beginning of vinyl)
    // Inner run-out groove is ~0.36 * radius (100% of music, last of vinyl)
    const minR = 0.36 * radius;
    const maxR = 0.94 * radius;

    if (dist >= minR && dist <= maxR) {
      // Linear mapping: outer edge = 0 (beginning of music), inner edge = 1 (last of music)
      const ratio = (maxR - dist) / (maxR - minR);
      onSeekToRatio(Math.max(0, Math.min(1, ratio)));
    }
  };

  // Speed switch toggling (33.3 RPM vs 45 RPM)
  const handleSpeedToggle = (speed: number) => {
    if (onSpeedChange) {
      onSpeedChange(speed);
    }
  };

  const is33 = playbackSpeed <= 1.1;

  // --- Dynamic Vinyl Mounting & Platter Departure Lifecycle ---
  const [isMounting, setIsMounting] = useState<boolean>(false);
  const mountTimerRef = React.useRef<number | null>(null);

  const isVinylPresent = (isPlaying || isBraking) && !isBarePlatter;

  useEffect(() => {
    if (isVinylPresent) {
      setIsMounting(true);
      if (mountTimerRef.current) window.clearTimeout(mountTimerRef.current);
      mountTimerRef.current = window.setTimeout(() => {
        setIsMounting(false);
      }, 700);
    } else {
      setIsMounting(false);
    }
    return () => {
      if (mountTimerRef.current) window.clearTimeout(mountTimerRef.current);
    };
  }, [isVinylPresent]);

  // --- Physical Direct-Drive High-Torque Motor Rotation & Braking Engine ---
  const [platterAngle, setPlatterAngle] = useState<number>(0);
  const rotationAngleRef = React.useRef<number>(0);
  const angularVelocityRef = React.useRef<number>(0); // in degrees per second
  const lastTimestampRef = React.useRef<number | null>(null);
  const rafIdRef = React.useRef<number | null>(null);

  // Target angular velocity when powered: 33⅓ RPM = 200 deg/s, 45 RPM = 270 deg/s
  const targetVelocity = useMemo(() => {
    if (!isPlaying || isBraking) return 0;
    const baseDegPerSec = is33 ? 200 : 270;
    const speedMult = Math.max(0.2, playbackSpeed || 1);
    const pitchMult = 1 + activePitch / 100;
    return baseDegPerSec * speedMult * pitchMult;
  }, [isPlaying, isBraking, is33, playbackSpeed, activePitch]);

  useEffect(() => {
    let isMounted = true;

    const updatePlatterPhysics = (now: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = now;
      }
      const dt = Math.min(0.05, (now - lastTimestampRef.current) / 1000); // delta in seconds
      lastTimestampRef.current = now;

      const currentVel = angularVelocityRef.current;
      const targetVel = targetVelocity;

      let nextVel = currentVel;

      if (isPlaying && !isBraking) {
        // Direct-Drive High-Torque Brushless Motor: Spin-up acceleration in ~350ms
        const maxAccel = (is33 ? 200 : 270) / 0.35;
        if (currentVel < targetVel) {
          nextVel = Math.min(targetVel, currentVel + maxAccel * dt);
        } else if (currentVel > targetVel) {
          nextVel = Math.max(targetVel, currentVel - maxAccel * dt);
        }
      } else {
        // Technics Solenoid Reverse-Torque Motor Electronic Brake: Decelerates smoothly to 0 over 750ms
        const baseVel = is33 ? 200 : 270;
        const maxDecel = baseVel / 0.75;
        if (currentVel > 0) {
          nextVel = Math.max(0, currentVel - maxDecel * dt);
        } else {
          nextVel = 0;
        }
      }

      angularVelocityRef.current = nextVel;
      rotationAngleRef.current = (rotationAngleRef.current + nextVel * dt) % 360;

      if (isMounted) {
        setPlatterAngle(rotationAngleRef.current);
      }

      // Loop continues while motor is active or platter is still spinning/braking
      if (isPlaying || isBraking || nextVel > 0.05) {
        rafIdRef.current = requestAnimationFrame(updatePlatterPhysics);
      } else {
        lastTimestampRef.current = null;
        rafIdRef.current = null;
      }
    };

    if (isPlaying || isBraking || angularVelocityRef.current > 0.05) {
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
  }, [isPlaying, isBraking, targetVelocity, is33]);

  // Track rotational progress in degrees for display (0° to 360°)
  const trackAngleDeg = Math.round(clampedProgress * 360);

  return (
    <div
      id="technics-sl1200-gold-turntable"
      className="relative w-full max-w-[720px] aspect-[1.32/1] rounded-2xl select-none technics-gold-plinth transition-transform duration-300 shadow-2xl overflow-visible"
      style={{
        boxShadow: `
          0 40px 90px -15px rgba(0, 0, 0, 0.96),
          0 20px 40px -5px rgba(0, 0, 0, 0.8),
          inset 0 2px 4px rgba(255, 255, 230, 0.85),
          inset 0 -3px 8px rgba(50, 35, 10, 0.65),
          0 0 0 1px rgba(230, 195, 95, 0.55)
        `,
      }}
    >


      {/* Plinth Brushed Champagne Gold Surface Sheen */}
      <div className="absolute inset-1 rounded-xl pointer-events-none opacity-45 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100 via-transparent to-black" />

      {/* ======================================================== */}
      {/* 1. TOP PANEL: 45 RPM EP ADAPTER DOCK & DUAL LED VU METERS */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 absolute top-3 sm:top-3.5 left-3 sm:left-3.5 z-20 select-none max-w-[calc(100%-120px)]">
        {/* 45 RPM Adapter Dock */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-amber-500/80 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group shadow-md shrink-0"
          style={{
            background: 'radial-gradient(circle, #f5df93 0%, #cda335 60%, #9a6f15 100%)',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5)',
          }}
          title="45 RPM EP Solid Aluminum Adapter Dock"
        >
          <div className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-full bg-gradient-to-tr from-[#dfbf66] via-[#fbf0cc] to-[#b58622] border border-amber-400/90 shadow-sm flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-amber-500 flex items-center justify-center shadow-inner">
              <div className="w-1 h-1 rounded-full bg-neutral-900 border border-amber-400/60" />
            </div>
          </div>
        </div>

        {/* Real-time Stereo Animated LED VU Meter */}
        <LedVuMeter isPlaying={isPlaying} />
      </div>

      {/* Plinth Ambient Underglow Halo - centered behind the platter */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[64%] aspect-square rounded-full pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${activeAmbient.ambientRgba(0.4)} 0%, ${activeAmbient.ambientRgba(0.14)} 54%, transparent 75%)`,
          filter: 'blur(28px)',
          transform: `translate(-50%, -50%) scale(${1 + bassEnergy * 0.05})`,
          opacity: isPlaying ? 0.92 : 0.45,
        }}
      />

      {/* ======================================================== */}
      {/* 2. THE PLATTER, STROBE RIM, AND CENTERED VINYL RECORD    */}
      {/* ======================================================== */}
      <div
        id="technics-platter-well"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[63%] sm:w-[64%] aspect-square rounded-full flex items-center justify-center transition-all duration-1000 z-10"
        style={{
          background: 'radial-gradient(circle, #101014 0%, #1c1c24 70%, #0d0d10 100%)',
          boxShadow: `inset 0 6px 18px rgba(0,0,0,0.95), 0 0 0 2px rgba(220, 180, 70, 0.65), 0 0 45px -6px ${activeAmbient.ambientRgba(0.38)}`,
        }}
      >
        {/* Die-Cast Aluminum & Gold Platter Outer Rim */}
        <div
          className="relative w-[98.5%] aspect-square rounded-full flex items-center justify-center p-1.5 sm:p-2 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #dfbc60 0%, #fae8af 25%, #be942f 50%, #f6deb4 75%, #b0811e 100%)',
            boxShadow: '0 8px 26px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.6)',
          }}
        >
          {/* Stroboscopic Rim: 4 Rows of Machined Precision Dots (Turns 360° when music is playing) */}
          {enableStrobe && (
            <div
              className="absolute inset-0.5 rounded-full pointer-events-none"
              style={{
                transform: `rotate(${platterAngle}deg)`,
                background: `
                  repeating-conic-gradient(from 0deg, #1c1c22 0deg 1.2deg, transparent 1.2deg 3.6deg),
                  repeating-conic-gradient(from 0deg, #2a2a34 0deg 1.5deg, transparent 1.5deg 4.2deg)
                `,
                opacity: 0.85,
              }}
            />
          )}

          {/* Platter Inner Well Ring with ambient light reflection */}
          <div
            className="relative w-full h-full rounded-full bg-[#0c0c10] border-2 flex items-center justify-center overflow-hidden transition-all duration-1000"
            style={{
              borderColor: activeAmbient.ambientRgba(0.38),
              boxShadow: `inset 0 0 40px rgba(0,0,0,0.9), inset 0 0 24px ${activeAmbient.ambientRgba(0.18)}`,
            }}
          >
            {/* --- REAL-TIME HIGH-FIDELITY CUSTOMIZABLE SLIPMAT SURFACE (Revealed when vinyl leaves) --- */}
            <div
              id="technics-slipmat-surface"
              onClick={!isVinylPresent ? onPlayPause : undefined}
              className={`absolute inset-0 rounded-full flex items-center justify-center select-none ${
                !isVinylPresent ? 'cursor-pointer group' : 'pointer-events-none'
              }`}
              style={{
                transform: `rotate(${platterAngle}deg)`,
              }}
              title={!isVinylPresent ? 'Click to place vinyl record onto turntable and play' : undefined}
            >
              <SlipmatRenderer
                design={activeSlipmatDesign}
                config={activeSlipmatConfig}
                showSpindle={true}
              />

              {/* Solid Brass Center Spindle Bushing */}
              <div
                className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#fae6a6] via-[#dfbf66] to-[#9a6f15] border-2 border-amber-300 shadow-xl flex items-center justify-center z-20 pointer-events-none"
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-950 border border-amber-700 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                </div>
              </div>

              {/* Cue / Load Overlay when vinyl is unmounted */}
              {!isVinylPresent && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-10 px-3 py-1.5 rounded-full bg-neutral-950/90 border border-amber-400/50 text-[9.5px] font-mono font-bold tracking-wider text-amber-300 backdrop-blur-md pointer-events-none shadow-2xl flex items-center gap-1.5 z-30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  LOAD RECORD & PLAY
                </div>
              )}
            </div>

            {/* --- THE ROTATING VINYL RECORD (Animated departure when music stops, slides in when played) --- */}
            <div
              id="vinyl-record"
              onClick={isVinylPresent ? handleVinylClick : onPlayPause}
              title={isVinylPresent ? "Click vinyl groove to seek (Outer Edge = 0:00, Inner Edge = End)" : "Click to load vinyl"}
              className="relative w-[97.5%] aspect-square rounded-full cursor-pointer z-10"
              style={{
                background: isClearCrystal
                  ? 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, rgba(6, 182, 212, 0.02) 50%, rgba(255, 255, 255, 0.08) 100%)'
                  : isSmokeTranslucent
                  ? 'radial-gradient(circle, rgba(16, 16, 24, 0.72) 0%, rgba(8, 8, 12, 0.88) 100%)'
                  : isClassicBlack
                  ? 'radial-gradient(circle, #101015 0%, #08080b 100%)'
                  : undefined,
                boxShadow: isClearCrystal
                  ? `inset 0 0 50px rgba(6, 182, 212, 0.35), 0 8px 30px rgba(0,0,0,0.7), 0 0 24px ${activeAmbient.ambientRgba(0.22)}`
                  : `inset 0 0 55px rgba(0, 0, 0, 0.98), 0 10px 32px rgba(0,0,0,0.75), 0 0 28px ${activeAmbient.ambientRgba(0.22)}`,
                backdropFilter: isClearCrystal || isSmokeTranslucent ? 'blur(0.5px)' : undefined,
                transform: isVinylPresent
                  ? isMounting
                    ? 'translate(0, 0) scale(1) rotate(0deg)'
                    : `scale(${1 + bassEnergy * 0.012}) rotate(${platterAngle}deg)`
                  : 'translate(-140%, -18%) rotate(-28deg) scale(0.82) perspective(700px) rotateX(16deg)',
                opacity: isVinylPresent ? 1 : 0,
                pointerEvents: isVinylPresent ? 'auto' : 'none',
                filter: isVinylPresent ? 'none' : 'drop-shadow(0 25px 35px rgba(0,0,0,0.85)) blur(0.5px)',
                transition: isMounting
                  ? 'transform 680ms cubic-bezier(0.16, 1, 0.3, 1), opacity 480ms ease, filter 500ms ease'
                  : !isVinylPresent
                  ? 'transform 850ms cubic-bezier(0.4, 0, 0.2, 1), opacity 700ms cubic-bezier(0.4, 0, 0.2, 1), filter 800ms ease'
                  : 'none',
              }}
            >
                {/* Realistic Microgrooves Texture */}
                <div
                  className={`absolute inset-0 rounded-full vinyl-grooves ${
                    isClearCrystal ? 'opacity-40 mix-blend-screen' : isSmokeTranslucent ? 'opacity-35' : ''
                  }`}
                />

                {/* Guide Spiral Grooves: First Line (Lead-In) to Last Line (Run-Out) */}
                <div
                  className={`absolute inset-[3.2%] rounded-full border-2 ${
                    isClearCrystal ? 'border-cyan-300/60 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'border-amber-300/60 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                  }`}
                  title="First line on vinyl (Start of Music at 0:00)"
                />
                <div className="absolute inset-[10%] rounded-full border border-neutral-700/30" />
                <div className="absolute inset-[18%] rounded-full border border-neutral-700/25" />
                <div className="absolute inset-[25%] rounded-full border border-neutral-700/30" />
                <div
                  className={`absolute inset-[32%] rounded-full border-2 ${
                    isClearCrystal ? 'border-cyan-300/60 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'border-amber-300/60 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                  }`}
                  title="Last line on vinyl (End of Music at 100%)"
                />

                {/* Active Stylus Contact Ring (Shows where the needle is tracking across the vinyl) */}
                <div
                  className="absolute rounded-full pointer-events-none transition-all duration-300"
                  style={{
                    inset: `${currentGrooveInset}%`,
                    border: `1.5px solid ${isPlaying ? activeAmbient.primary : 'rgba(255, 255, 255, 0.4)'}`,
                    boxShadow: isPlaying
                      ? `0 0 12px ${activeAmbient.primary}, inset 0 0 8px ${activeAmbient.glowRgba(0.6)}`
                      : '0 0 4px rgba(255, 255, 255, 0.3)',
                  }}
                />

                {/* Traversed Vinyl Grooves Overlay */}
                <div
                  className="absolute rounded-full pointer-events-none transition-all duration-300"
                  style={{
                    inset: '3.2%',
                    background: `radial-gradient(circle, transparent ${Math.max(0, 100 - (currentGrooveInset - 3.2) * 2.8)}%, ${activeAmbient.ambientRgba(0.12)} 90%, ${activeAmbient.ambientRgba(0.24)} 100%)`,
                    opacity: isPlaying ? 0.7 : 0.25,
                  }}
                />

                {/* Rotating Microgroove Specular Glint (Syncs with physical record rotation) */}
                <div
                  className="absolute inset-0 rounded-full vinyl-sheen pointer-events-none opacity-25"
                />

                {/* Primary Conic Anisotropic Sheen */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={primarySheenStyle}
                />

                {/* Secondary Chromatic Conic Sheen */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={secondarySheenStyle}
                />

                {/* Dynamic Bass Light Pulse Wave */}
                {bassEnergy > 0.35 && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-75"
                    style={{
                      background: `radial-gradient(circle, transparent 40%, ${activeAmbient.glowRgba(bassEnergy * 0.35)} 75%, transparent 95%)`,
                      opacity: bassEnergy,
                    }}
                  />
                )}

                {/* Microscopic Dust Particles Canvas */}
                {dustActive && <VinylDustCanvas isPlaying={isPlaying} />}

                {/* Center Spindle Runout Groove */}
                <div className="absolute inset-[33%] rounded-full border border-neutral-800 pointer-events-none" />

                {/* ======================================================== */}
                {/* VINYL CENTER SURFACE (Picture Disc or Center Label)     */}
                {/* ======================================================== */}
                {isPictureDisc ? (
                  /* 80% Full-Bleed Picture Disc Artwork */
                  <div
                    id="vinyl-picture-disc-artwork"
                    className="absolute inset-[10%] rounded-full overflow-hidden shadow-2xl flex items-center justify-center border-2 border-amber-400/40"
                    style={{
                      background: currentTrack
                        ? `radial-gradient(circle at 40% 40%, ${activeAmbient.primary} 0%, #171510 75%, #0a0907 100%)`
                        : 'radial-gradient(circle, #2d261a 0%, #15120c 100%)',
                      boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.6)',
                    }}
                  >
                    {currentTrack?.artwork ? (
                      <img
                        src={currentTrack.artwork}
                        alt={currentTrack.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover select-none pointer-events-none filter brightness-95 saturate-115"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-950 text-white">
                        <span className="text-sm font-black uppercase tracking-widest text-amber-400 font-serif">Technics</span>
                        <span className="text-xs text-amber-200/80 mt-1">SL-1200GLD Special Edition</span>
                      </div>
                    )}

                    {/* Picture Disc Clear Vinyl Resin Glaze & Concentric Sound Grooves */}
                    <div className="absolute inset-0 rounded-full vinyl-grooves opacity-30 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/40 via-transparent to-white/15 pointer-events-none" />
                    <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />
                    <div className="absolute inset-10 rounded-full border border-black/25 pointer-events-none" />
                    <div className="absolute inset-16 rounded-full border border-white/10 pointer-events-none" />

                    {/* Center Compact Technics Gold Spindle Hub & Label Disc */}
                    <div
                      className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-amber-300/80 shadow-2xl flex flex-col items-center justify-center p-1 bg-neutral-950/85 backdrop-blur-sm z-10"
                      style={{
                        boxShadow: '0 4px 15px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.4)',
                      }}
                    >
                      {/* Rotating DJ Cue Marker Line */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-gradient-to-b from-amber-200 via-amber-400/80 to-transparent pointer-events-none shadow-[0_0_4px_#fde68a]" />

                      <div className="text-[6.5px] sm:text-[7px] font-mono text-amber-300 font-bold uppercase tracking-widest">
                        {is33 ? '33⅓ RPM' : '45 RPM'}
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-serif font-black text-amber-200 uppercase tracking-tighter my-0.5">
                        TECHNICS
                      </div>
                      <div className="text-[6.5px] sm:text-[7px] font-bold text-white max-w-[65px] truncate font-mono">
                        {currentTrack ? currentTrack.title : 'NO DISC'}
                      </div>
                      <div className="text-[5.5px] sm:text-[6px] text-amber-200/80 max-w-[60px] truncate font-sans">
                        {currentTrack ? currentTrack.artist : 'HI-FI STEREO'}
                      </div>

                      {/* Center Spindle Hole with Solid Brass Bushing Ring */}
                      <div
                        className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#fae6a6] via-[#dfbf66] to-[#9a6f15] border border-amber-300/90 shadow-inner flex items-center justify-center z-20"
                      >
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neutral-950 border border-amber-700 shadow-inner flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-neutral-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact 4" Audiophile Center Label (Allows Slipmat to shine through!) */
                  <div
                    id="vinyl-audiophile-center-label"
                    className="absolute inset-[28%] rounded-full border-2 border-amber-300/80 shadow-2xl flex flex-col items-center justify-center p-2 z-10"
                    style={{
                      background: 'radial-gradient(circle, #1a1a24 0%, #0c0c12 80%, #050508 100%)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.3)',
                    }}
                  >
                    {/* Rotating DJ Cue Marker Line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-gradient-to-b from-amber-200 via-amber-400/80 to-transparent pointer-events-none shadow-[0_0_4px_#fde68a]" />

                    {/* Miniature Album Thumbnail or Brand Logo */}
                    {currentTrack?.artwork && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-400/60 mb-0.5 shadow-sm">
                        <img
                          src={currentTrack.artwork}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="text-[7px] sm:text-[8px] font-serif font-black text-amber-300 uppercase tracking-tight">
                      TECHNICS
                    </div>
                    <div className="text-[6px] sm:text-[6.5px] font-mono font-bold text-white max-w-[70px] truncate">
                      {currentTrack ? currentTrack.title : 'ANALOG LP'}
                    </div>
                    <div className="text-[5px] sm:text-[5.5px] text-amber-200/80 max-w-[65px] truncate">
                      {currentTrack ? currentTrack.artist : 'DIRECT DRIVE'}
                    </div>

                    {/* Center Spindle Hole with Solid Brass Bushing Ring */}
                    <div
                      className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#fae6a6] via-[#dfbf66] to-[#9a6f15] border border-amber-300/90 shadow-inner flex items-center justify-center z-20"
                    >
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neutral-950 border border-amber-700 shadow-inner flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-neutral-900" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time Frequency Energy Distribution Heatmap Overlay on Vinyl Surface */}
                {heatmapActive && (
                  <VinylHeatmapOverlay
                    isPlaying={isPlaying}
                    progress={clampedProgress}
                    palette={heatmapPalette}
                    intensity={heatmapIntensity}
                    enableStylusBloom={true}
                  />
                )}
              </div>
          </div>
        </div>
      </div>
      {/* Red Strobe Light Beam Cast on Platter Rim */}
      {enableStrobe && (
        <div
          className="absolute bottom-5 left-5 sm:bottom-6 sm:left-6 w-24 h-24 rounded-full pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.35) 45%, transparent 75%)',
            filter: 'blur(8px)',
            opacity: isPlaying || isBraking ? 0.95 : 0.15,
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 3. BOTTOM-LEFT: AUTHENTIC CONTROL BAY (POWER/SPEED/START) */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 left-3 sm:bottom-3.5 sm:left-3.5 w-[68px] sm:w-[76px] flex flex-col items-stretch gap-1.5 sm:gap-2 z-20 select-none">
        {/* Row 1: Rotary Power Dial & Strobe Light Tower */}
        <div className="flex items-center justify-between gap-1 w-full px-0.5">
          {/* Rotary Power Switch */}
          <div
            onClick={onPlayPause}
            className="group relative flex flex-col items-center cursor-pointer"
            title="Main Power Switch (Click to toggle)"
          >
            <div
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-amber-500/80 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 shadow-md flex items-center justify-center group-hover:border-amber-400 group-hover:scale-105 transition"
              style={{
                boxShadow: '0 2px 6px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.3)',
              }}
            >
              {/* Knurled Outer Ring */}
              <div
                className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-[#dfbf66] to-[#b58622] border border-amber-300/90 flex items-center justify-center transition-transform duration-300 shadow-inner"
                style={{
                  transform: `rotate(${isPlaying || isBraking ? 35 : 0}deg)`,
                }}
              >
                {/* Switch Position Line */}
                <div className="w-0.5 h-2.5 sm:h-3 bg-neutral-950 rounded-full border-t border-amber-200" />
              </div>
            </div>
            <div className="flex items-center gap-0.5 mt-0.5 text-[4.5px] sm:text-[5px] font-mono font-bold text-neutral-900 tracking-tighter uppercase">
              <span className={!isPlaying && !isBraking ? 'text-neutral-950 font-black' : 'text-neutral-700'}>OFF</span>
              <span>•</span>
              <span className={isPlaying || isBraking ? 'text-amber-800 font-black' : 'text-neutral-700'}>ON</span>
            </div>
          </div>

          {/* Strobe Light Tower */}
          <div
            id="technics-strobe-glow-container"
            className="relative w-5 sm:w-6 h-7 sm:h-8 rounded-sm bg-neutral-950 border border-amber-600/70 shadow-md flex flex-col items-center justify-center overflow-hidden"
            style={{
              boxShadow: '0 3px 6px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.2)',
            }}
            title="Stroboscopic Speed Indicator"
          >
            <div
              id="technics-strobe-glow"
              className={`w-3 sm:w-3.5 h-3.5 sm:h-4 rounded-xs flex flex-col justify-around py-0.5 items-center ${
                isPlaying || isBraking ? 'bg-red-600 technics-strobe-glow' : 'bg-red-950'
              } transition-all`}
            >
              <div className="w-2 h-0.5 bg-red-100 rounded-xs shadow-[0_0_2px_#ef4444]" />
              <div className="w-2 h-0.5 bg-red-100 rounded-xs shadow-[0_0_2px_#ef4444]" />
              <div className="w-2 h-0.5 bg-red-100 rounded-xs shadow-[0_0_2px_#ef4444]" />
            </div>
            <div className="text-[4px] sm:text-[4.5px] font-mono text-amber-400 font-bold mt-0.5 tracking-tighter">STROBE</div>
          </div>
        </div>

        {/* Row 2: Dual Speed Selectors Recessed Bay (33⅓ & 45 RPM) */}
        <div
          className="flex items-center justify-between p-0.5 rounded-md bg-neutral-950/90 border border-neutral-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] gap-1 w-full"
        >
          {/* 33 RPM Push Button */}
          <button
            onClick={() => handleSpeedToggle(1.0)}
            className={`flex-1 py-1 sm:py-1.5 rounded text-[8px] sm:text-[8.5px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:translate-y-0.5 active:scale-95 ${
              is33
                ? 'bg-gradient-to-b from-neutral-800 to-neutral-900 text-amber-300 border border-amber-400/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_5px_rgba(0,0,0,0.6)]'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 border border-white/5'
            }`}
            title="33⅓ RPM Standard Speed"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ring-1 ${
                is33
                  ? 'bg-red-500 ring-red-400 shadow-[0_0_6px_#ef4444,0_0_2px_#ffffff]'
                  : 'bg-red-950/80 ring-red-900/40'
              }`}
            />
            <span>33⅓</span>
          </button>

          {/* 45 RPM Push Button */}
          <button
            onClick={() => handleSpeedToggle(1.25)}
            className={`flex-1 py-1 sm:py-1.5 rounded text-[8px] sm:text-[8.5px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:translate-y-0.5 active:scale-95 ${
              !is33
                ? 'bg-gradient-to-b from-neutral-800 to-neutral-900 text-amber-300 border border-amber-400/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_5px_rgba(0,0,0,0.6)]'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 border border-white/5'
            }`}
            title="45 RPM Single Speed"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ring-1 ${
                !is33
                  ? 'bg-red-500 ring-red-400 shadow-[0_0_6px_#ef4444,0_0_2px_#ffffff]'
                  : 'bg-red-950/80 ring-red-900/40'
              }`}
            />
            <span>45</span>
          </button>
        </div>

        {/* Row 3: Iconic Machined Technics START • STOP Push Button */}
        <div className="p-0.5 rounded-md bg-neutral-950/90 border border-neutral-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),0_2px_5px_rgba(0,0,0,0.6)] w-full">
          <button
            id="technics-start-stop-btn"
            onClick={onPlayPause}
            className="group relative w-full h-9 sm:h-10 rounded-sm p-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 active:translate-y-0.5 active:scale-[0.98] select-none overflow-hidden"
            style={{
              background: isBraking
                ? 'linear-gradient(180deg, #382c18 0%, #291e0d 55%, #191206 100%)'
                : isPlaying
                ? 'linear-gradient(180deg, #2c2c34 0%, #1e1e24 55%, #141418 100%)'
                : 'linear-gradient(180deg, #24242a 0%, #1a1a1f 55%, #101014 100%)',
              boxShadow: isBraking
                ? 'inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.8), 0 0 16px rgba(245,158,11,0.5)'
                : isPlaying
                ? 'inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.8), 0 0 12px rgba(245,158,11,0.25)'
                : 'inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 2px rgba(0,0,0,0.8)',
              border: isBraking
                ? '1px solid rgba(245,158,11,0.85)'
                : isPlaying
                ? '1px solid rgba(251,191,36,0.65)'
                : '1px solid rgba(255,255,255,0.12)',
            }}
            title="START • STOP (Space / Click to toggle)"
          >
            {/* Top Edge Metallic Specular Bevel Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-200/50 to-transparent pointer-events-none" />

            {/* Active Drive Optical Micro-Jewel LED */}
            <div className="flex items-center gap-1 mb-0.5">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ring-1 ${
                  isBraking
                    ? 'bg-amber-400 ring-amber-300 shadow-[0_0_10px_#f59e0b] animate-pulse'
                    : isPlaying
                    ? 'bg-amber-400 ring-amber-300 shadow-[0_0_8px_#f59e0b,0_0_2px_#ffffff]'
                    : 'bg-neutral-700 ring-neutral-600'
                }`}
              />
              <span className={`text-[5.5px] sm:text-[6px] font-mono tracking-widest font-bold uppercase transition-colors ${
                isBraking ? 'text-amber-400 animate-pulse' : isPlaying ? 'text-amber-400' : 'text-neutral-500'
              }`}>
                {isBraking ? 'BRAKE' : isPlaying ? 'ACTIVE' : 'READY'}
              </span>
            </div>

            {/* Silk-Screened / Laser-Etched Push Key Typography */}
            <span className="text-[7.5px] sm:text-[8.5px] font-mono font-black tracking-wider text-neutral-200 group-hover:text-white uppercase transition-colors">
              START · STOP
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TOP-RIGHT: AUTHENTIC TECHNICS S-SHAPED TONEARM ASSEMBLY */}
      {/* ======================================================== */}
      <div
        id="technics-tonearm-assembly"
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-[155px] sm:w-[170px] h-[310px] sm:h-[330px] pointer-events-none z-30 select-none"
      >
        {/* Recessed Circular Tonearm Base & Helicoid VTA Assembly */}
        <div
          ref={tonearmGimbalRef}
          className="absolute top-3.5 right-4 sm:top-4 sm:right-5 w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-full border-2 border-amber-500/80 shadow-2xl flex items-center justify-center pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 45% 45%, #2a251b 0%, #171510 60%, #0a0908 100%)',
            boxShadow: `
              inset 0 4px 12px rgba(0,0,0,0.9),
              0 6px 14px rgba(0,0,0,0.7),
              0 0 0 1px rgba(220,180,80,0.4),
              inset 0 1px 2px rgba(255,255,255,0.3)
            `,
          }}
        >
          {/* Base Mounting Hex Screws (3 authentic countersunk micro-screws) */}
          <div className="absolute top-1.5 left-5 w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 border border-amber-800 shadow-inner flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-neutral-950 rounded-full" />
          </div>
          <div className="absolute bottom-2 left-3 w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 border border-amber-800 shadow-inner flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-neutral-950 rounded-full" />
          </div>
          <div className="absolute bottom-3 right-2 w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 border border-amber-800 shadow-inner flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-neutral-950 rounded-full" />
          </div>

          {/* Knurled Outer Helicoid Arm Height / VTA Ring (0 to 6 mm) */}
          <div
            className="absolute inset-1 rounded-full border border-amber-500/50 flex items-center justify-center pointer-events-none"
            style={{
              background: 'repeating-conic-gradient(from 0deg, #383020 0deg 3deg, #1f1a12 3deg 6deg)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {/* VTA Millimeter Calibration Ring */}
            <div className="absolute inset-1 rounded-full border border-amber-400/30 flex items-center justify-center bg-neutral-950/80">
              <div className="absolute top-0.5 text-[5px] font-mono text-amber-300/90 font-black">
                HEIGHT 0-6mm
              </div>
            </div>
          </div>

          {/* VTA Lock Lever (Mini mechanical clamp lever) */}
          <div
            className="absolute -right-2 top-7 sm:top-8 w-2.5 h-4 bg-gradient-to-b from-amber-300 to-amber-700 rounded-sm shadow-md border border-amber-200/50 flex flex-col items-center justify-between py-0.5 pointer-events-auto"
            title="Arm Height Lock Lever (LOCK)"
          >
            <div className="w-1.5 h-0.5 bg-neutral-900 rounded-xs" />
            <div className="text-[4px] font-mono font-black text-neutral-950">LK</div>
          </div>

          {/* Heavy Rear Gold Counterweight with Calibrated Tracking Force Dial Ring */}
          <div
            className="absolute -top-4 sm:-top-5 w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-amber-400/90 shadow-2xl flex items-center justify-center font-mono font-bold text-neutral-900 z-10"
            style={{
              background: 'linear-gradient(135deg, #fcedc0 0%, #dfbf66 35%, #be942f 70%, #9a6f15 100%)',
              boxShadow: '0 6px 14px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.7)',
            }}
            title="Counterweight & Tracking Force Dial (1.75g)"
          >
            {/* Rear Auxiliary Weight Threaded Stub */}
            <div className="absolute -top-2 w-3 h-2 rounded-t-xs bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 border-t border-amber-200" />

            {/* Numbered Tracking Force Gram Ring (Obsidian & Gold) */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-950 border-2 border-amber-500/80 flex flex-col items-center justify-center shadow-inner">
              <span className="text-amber-300 font-mono text-[7.5px] sm:text-[8px] font-black leading-none">
                1.75
              </span>
              <span className="text-[4.5px] font-mono text-amber-200/60 uppercase tracking-tighter mt-0.5">
                GRAMS
              </span>
            </div>
          </div>

          {/* Center 4-Point Gimbal Yoke with Dual Sapphire Bearings */}
          <div
            className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-amber-300/90 shadow-md flex items-center justify-center z-10"
            style={{
              background: 'linear-gradient(135deg, #f7e4a8 0%, #dfbf66 45%, #be942f 80%, #9a6f15 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.5)',
            }}
          >
            {/* Top Conical Pivot Screw with Slotted Cap */}
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-950 border border-amber-400 flex items-center justify-center shadow-inner">
              <div className="w-2 h-0.5 bg-amber-200/90 rounded-xs shadow-[0_0_2px_#ffffff]" />
            </div>
          </div>

          {/* Anti-Skate Calibrated Control Dial */}
          <div
            className="absolute -left-2.5 top-6 sm:top-7 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-neutral-950 border border-amber-500/90 flex flex-col items-center justify-center shadow-md pointer-events-auto"
            title="Anti-Skate Dial (Set to 2)"
          >
            <div className="text-[5.5px] sm:text-[6px] font-mono font-black text-amber-400 leading-none">
              2
            </div>
            <div className="w-1.5 h-0.5 bg-red-500 rounded-full mt-0.5 shadow-[0_0_2px_#ef4444]" />
          </div>

          {/* Silicone-Damped Curved Arm Lift Shelf (Cue Bar) */}
          <div
            className="absolute -left-5 top-9 sm:top-10 w-8 h-3 pointer-events-none transition-all duration-300"
            style={{
              transform: isArmElevated ? 'translateY(-2px)' : 'translateY(1px)',
            }}
          >
            {/* Curved rubber cue bar that cradles tonearm */}
            <div className="w-full h-1.5 rounded-full bg-neutral-900 border border-amber-600/70 shadow-md flex items-center justify-center">
              <div className="w-5 h-0.5 bg-neutral-950 rounded-full border-t border-neutral-700" />
            </div>
            {/* Hydraulic lifter piston rod */}
            <div className="w-1 h-2 mx-auto bg-gradient-to-r from-amber-400 via-white to-amber-600 shadow-sm" />
          </div>

          {/* Cueing / Arm Lift Lever (Interactive!) */}
          <button
            type="button"
            onClick={handleCueLeverToggle}
            className="absolute -left-4.5 top-11.5 sm:top-12.5 w-6 h-9 p-0.5 flex items-center justify-center pointer-events-auto cursor-pointer group focus:outline-none z-20"
            title={`Cue Lift Lever (${isCueLeverDown ? 'Down: Playback Mode' : 'Up: Arm Elevated'}) - Click to toggle`}
          >
            <div
              className="w-2.5 h-7 sm:h-8 rounded-full shadow-lg transition-transform duration-300 origin-bottom flex flex-col items-center justify-start p-0.5 border border-white/20 group-hover:brightness-110"
              style={{
                transform: isCueLeverDown ? 'rotate(-18deg)' : 'rotate(18deg)',
                background: 'linear-gradient(180deg, #fcedc0 0%, #dfbf66 40%, #855e14 100%)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.8)',
              }}
            >
              {/* Textured knurled rubber grip tip */}
              <div className="w-2 h-2.5 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 rounded-xs border border-amber-300/60 shadow-inner" />
            </div>
          </button>
        </div>

        {/* Tonearm Wand & Headshell (Pivots from Gimbal center with 3D Z-Lift Elevation) */}
        <div
          id="technics-tonearm-wand"
          className="absolute pointer-events-none transition-all"
          style={{
            top: '58px',
            right: '62px',
            width: '0px',
            height: '0px',
            transformOrigin: '0 0',
            transform: `rotate(${targetArmAngle}deg) ${
              isArmElevated ? 'translateY(-7px) scale(1.03)' : 'translateY(0px) scale(1.0)'
            }`,
            transitionDuration: armTransitionDuration,
            transitionTimingFunction: armTransitionTiming,
          }}
        >
          {/* Master SVG for 24K Gold S-Wand, Headshell, Cartridge, and Stylus */}
          <svg
            className="overflow-visible pointer-events-none select-none"
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <defs>
              {/* 3D Cylindrical Gold Shader for Tonearm Wand */}
              <linearGradient id="technics-wand-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fcedc0" />
                <stop offset="22%" stopColor="#dfbf66" />
                <stop offset="48%" stopColor="#be942f" />
                <stop offset="72%" stopColor="#7a5510" />
                <stop offset="88%" stopColor="#dfbf66" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>

              {/* Specular Ridge Reflection Catching Studio Lights */}
              <linearGradient id="technics-wand-specular" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#fff8e7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#dfbf66" stopOpacity="0.0" />
              </linearGradient>

              {/* Deep Ambient Occlusion Core */}
              <linearGradient id="technics-wand-core" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#453108" />
                <stop offset="100%" stopColor="#1a1205" />
              </linearGradient>

              {/* Brushed Champagne Gold for Magnesium Headshell */}
              <linearGradient id="technics-headshell-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fae6a6" />
                <stop offset="25%" stopColor="#dfbf66" />
                <stop offset="60%" stopColor="#be942f" />
                <stop offset="85%" stopColor="#9a6f15" />
                <stop offset="100%" stopColor="#e2c473" />
              </linearGradient>

              {/* Bayonet Collet Nut Lathed Texture */}
              <linearGradient id="technics-collet-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fcedc0" />
                <stop offset="30%" stopColor="#dfbf66" />
                <stop offset="65%" stopColor="#8c6212" />
                <stop offset="85%" stopColor="#dfbf66" />
                <stop offset="100%" stopColor="#fae6a6" />
              </linearGradient>

              {/* Realistic Contact Shadow Blur Filter */}
              <filter id="technics-arm-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation={isArmElevated ? 4.5 : 1.8} />
              </filter>
            </defs>

            {/* Realistic Plinth Drop Shadow Under S-Wand */}
            <path
              d="M 0 0 L 0 24 C 0 50, 11 74, 11 106 C 11 138, -8 168, -8 200 C -8 210, -5 218, -5 222"
              stroke="#000000"
              strokeWidth={isArmElevated ? 7.5 : 5.5}
              strokeLinecap="round"
              fill="none"
              opacity={isArmElevated ? 0.22 : 0.45}
              filter="url(#technics-arm-shadow)"
              transform={isArmElevated ? 'translate(6, 8)' : 'translate(2.5, 3.5)'}
              className="transition-all duration-300"
            />

            {/* Outer Ambient Occlusion Tube Underlay */}
            <path
              d="M 0 0 L 0 24 C 0 50, 11 74, 11 106 C 11 138, -8 168, -8 200 C -8 210, -5 218, -5 222"
              stroke="url(#technics-wand-core)"
              strokeWidth="5.6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Main 24K Gold S-Tube (Technics EPA-120 Geometry) */}
            <path
              d="M 0 0 L 0 24 C 0 50, 11 74, 11 106 C 11 138, -8 168, -8 200 C -8 210, -5 218, -5 222"
              stroke="url(#technics-wand-gold)"
              strokeWidth="4.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Specular Highlight Stripe along Ridge */}
            <path
              d="M 0 0 L 0 24 C 0 50, 11 74, 11 106 C 11 138, -8 168, -8 200 C -8 210, -5 218, -5 222"
              stroke="url(#technics-wand-specular)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* ======================================================== */}
            {/* H-4 BAYONET COLLET NUT, HEADSHELL, AND CARTRIDGE ASSEMBLY */}
            {/* Mounted at (-5, 222) with authentic 20.5° offset angle  */}
            {/* ======================================================== */}
            <g transform="translate(-5, 222) rotate(-20.5)">
              {/* Drop Shadow for Headshell and Cartridge */}
              <rect
                x="-8"
                y="6"
                width="16"
                height="40"
                rx="2"
                fill="#000000"
                opacity={isArmElevated ? 0.25 : 0.45}
                filter="url(#technics-arm-shadow)"
                transform={isArmElevated ? 'translate(6, 8)' : 'translate(2.5, 3.5)'}
                className="transition-all duration-300"
              />

              {/* H-4 Bayonet Locking Collet Nut (Knurled Gold Connector Ring) */}
              <rect
                x="-4.5"
                y="0"
                width="9"
                height="8"
                rx="1"
                fill="url(#technics-collet-gold)"
                stroke="#dfbf66"
                strokeWidth="0.5"
              />
              {/* Knurled Grip Slits on Collet Nut */}
              <line x1="-2.5" y1="1" x2="-2.5" y2="7" stroke="#332408" strokeWidth="0.6" />
              <line x1="0" y1="1" x2="0" y2="7" stroke="#332408" strokeWidth="0.6" />
              <line x1="2.5" y1="1" x2="2.5" y2="7" stroke="#332408" strokeWidth="0.6" />

              {/* Headshell Magnesium Body (24K Gold Plated) */}
              <path
                d="M -7.5 7 L 7.5 7 C 9 7, 9.5 10, 9 15 L 8 36 C 7.5 40, 5 42, 2 42 L -2 42 C -5 42, -7.5 40, -8 36 L -9 15 C -9.5 10, -9 7, -7.5 7 Z"
                fill="url(#technics-headshell-gold)"
                stroke="#fcedc0"
                strokeWidth="0.75"
              />

              {/* 4 Iconic Technics Perforated Ventilation Holes with Beveled Insets */}
              {/* Top Row */}
              <circle cx="-3.8" cy="13" r="1.8" fill="#14110b" stroke="#7a5510" strokeWidth="0.5" />
              <circle cx="3.8" cy="13" r="1.8" fill="#14110b" stroke="#7a5510" strokeWidth="0.5" />
              {/* Bottom Row */}
              <circle cx="-3.8" cy="19" r="1.8" fill="#14110b" stroke="#7a5510" strokeWidth="0.5" />
              <circle cx="3.8" cy="19" r="1.8" fill="#14110b" stroke="#7a5510" strokeWidth="0.5" />

              {/* Laser-Etched Technics Wordmark */}
              <text
                x="0"
                y="27"
                textAnchor="middle"
                fill="#0d0a06"
                fontSize="4.6"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                letterSpacing="-0.3"
              >
                Technics
              </text>

              {/* 4 Miniature Color-Coded Cartridge Terminal Lead Wires */}
              <rect x="-4.2" y="30.5" width="1.2" height="2.5" rx="0.5" fill="#ef4444" />
              <rect x="-1.4" y="30.5" width="1.2" height="2.5" rx="0.5" fill="#10b981" />
              <rect x="1.4" y="30.5" width="1.2" height="2.5" rx="0.5" fill="#ffffff" />
              <rect x="4.2" y="30.5" width="1.2" height="2.5" rx="0.5" fill="#0284c7" />

              {/* Ergonomic Curved Finger Lift Hook (Swoops outward to the right) */}
              <path
                d="M 8.5 13 C 13 13, 18 11, 20.5 8 C 21.5 7, 21.8 6.2, 21 6 C 20.2 5.8, 17 7.5, 8.5 10.5 Z"
                fill="url(#technics-headshell-gold)"
                stroke="#fff2c2"
                strokeWidth="0.5"
              />
              {/* Textured Black Rubber Grip on Finger Lift Tip */}
              <rect x="18" y="5.5" width="3.5" height="3" rx="0.8" fill="#171511" stroke="#be942f" strokeWidth="0.4" />

              {/* Audiophile Gold Cartridge Body */}
              <rect
                x="-4"
                y="38"
                width="8"
                height="9"
                rx="1"
                fill="#12100d"
                stroke="#be942f"
                strokeWidth="0.6"
              />
              <rect x="-2.5" y="44" width="5" height="2" rx="0.5" fill="#fae6a6" />

              {/* Cantilever Stylus Needle (20° VTA angle) */}
              <line x1="0" y1="44" x2="-0.5" y2="52" stroke="#e5e7eb" strokeWidth="0.8" strokeLinecap="round" />

              {/* Polished Diamond Stylus Tip Spark */}
              <circle
                cx="-0.5"
                cy="52"
                r="1.2"
                fill={isStylusGrounded ? activeAmbient.highlight : '#ffffff'}
                className="transition-all duration-300"
                style={{
                  filter: isStylusGrounded
                    ? `drop-shadow(0 0 4px ${activeAmbient.primary}) drop-shadow(0 0 8px ${activeAmbient.highlight})`
                    : 'none',
                  opacity: isArmElevated ? 0.35 : 1.0,
                }}
              />

              {/* Full Interactive Hit Target for Dragging / Needle Dropping */}
              <rect
                x="-14"
                y="2"
                width="38"
                height="54"
                fill="transparent"
                pointerEvents="auto"
                cursor={isDraggingArm ? 'grabbing' : 'grab'}
                onPointerDown={handleTonearmPointerDown}
                className="select-none"
              >
                <title>Grab Headshell to Drop Needle or Cue anywhere on record</title>
              </rect>

              {/* Dragging Needle Tooltip Floating Above Finger Lift */}
              {isDraggingArm && (
                <foreignObject x="-45" y="-28" width="130" height="30" className="overflow-visible pointer-events-none">
                  <div className="bg-neutral-950/95 border border-amber-400 text-amber-300 font-mono text-[7.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap flex items-center gap-1 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>
                      {targetArmAngle < 12.5
                        ? 'PARK IN REST CRADLE'
                        : `NEEDLE DROP: ${Math.round(((Math.min(MAX_GROOVE_ANGLE, Math.max(MIN_GROOVE_ANGLE, targetArmAngle)) - MIN_GROOVE_ANGLE) / GROOVE_ANGLE_SPAN) * 100)}%`}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          </svg>
        </div>

        {/* Tonearm Rest Cradle & Lock Clip (Centered precisely under parked tonearm at 0°) */}
        <button
          type="button"
          onClick={handleRestCradleClick}
          className="absolute top-[186px] sm:top-[192px] right-[51px] sm:right-[51px] w-[22px] sm:w-[24px] h-[34px] sm:h-[36px] rounded-md border border-amber-400/60 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 shadow-xl flex flex-col items-center justify-between p-1 pointer-events-auto cursor-pointer hover:border-amber-300 hover:scale-105 active:scale-95 focus:outline-none group transition-all z-20"
          style={{
            boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.25)',
          }}
          title="Tonearm Rest Cradle - Click to Park/Unpark Arm"
        >
          {/* V-shaped Arm Rest Notch Fork */}
          <div className="w-full flex items-center justify-center pt-0.5">
            <div className="w-3.5 h-2.5 rounded-b-full border-b-2 border-x-2 border-amber-400/90 bg-neutral-950 shadow-inner flex items-center justify-center">
              {/* Arm Clamp Lock Latch */}
              <div
                className={`w-2.5 h-1 rounded-full transition-colors ring-1 ${
                  tonearmStage === 'parked'
                    ? 'bg-amber-400 ring-amber-300 shadow-[0_0_4px_#fbbf24]'
                    : 'bg-neutral-700 ring-neutral-600'
                }`}
              />
            </div>
          </div>
          <div className="text-[5.5px] sm:text-[6px] text-amber-300 font-mono font-black tracking-wider group-hover:text-white uppercase leading-none">
            {tonearmStage === 'parked' ? 'LOCKED' : 'PARK'}
          </div>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 5. LEFT-SIDE: DEDICATED TECHNICS PITCH FADER             */}
      {/* ======================================================== */}
      {(() => {
        const normalizedPitch = Math.max(-1, Math.min(1, activePitch / activePitchRange));
        // Invert: on Technics SL-1200, UP is (-) slower, DOWN is (+) faster
        const knobTopPercent = 50 + normalizedPitch * 45;
        const isQuartzLocked = Math.abs(activePitch) < 0.05;

        const updateFromY = (clientY: number) => {
          if (!pitchTrackRef.current) return;
          const rect = pitchTrackRef.current.getBoundingClientRect();
          const relativeY = clientY - rect.top;
          const ratio = Math.max(0, Math.min(1, relativeY / rect.height)); // 0 (top = -range) to 1 (bottom = +range)
          let calculated = (ratio * 2 - 1) * activePitchRange;
          // Magnetic center detent snap within 0.25%
          if (Math.abs(calculated) < 0.25) {
            calculated = 0;
          }
          handlePitchUpdate(Math.round(calculated * 100) / 100);
        };

        const onPitchPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // fallback
          }
          setIsDraggingPitch(true);
          setShowPitchTooltip(true);
          updateFromY(e.clientY);
        };

        const onPitchPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
          if (!isDraggingPitch) return;
          e.preventDefault();
          updateFromY(e.clientY);
        };

        const onPitchPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
          setIsDraggingPitch(false);
          setShowPitchTooltip(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // fallback
          }
        };

        const onWheelAdjust = (e: React.WheelEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY > 0 ? 0.2 : -0.2;
          const next = Math.max(-activePitchRange, Math.min(activePitchRange, activePitch + delta));
          handlePitchUpdate(Math.round(next * 100) / 100);
        };

        return (
          <div
            id="technics-pitch-assembly"
            className="absolute top-[86px] sm:top-[96px] left-2.5 sm:left-3.5 w-11 sm:w-13 h-[185px] sm:h-[200px] bg-neutral-950/95 rounded-lg border border-amber-500/70 p-1 sm:p-1.5 flex flex-col items-center justify-between shadow-2xl z-30 select-none cursor-pointer"
            style={{
              boxShadow: '0 12px 28px rgba(0,0,0,0.9), inset 0 1px 2px rgba(251,191,36,0.35)',
              touchAction: 'none',
            }}
            onWheel={onWheelAdjust}
            onMouseEnter={() => setShowPitchTooltip(true)}
            onMouseLeave={() => {
              if (!isDraggingPitch) setShowPitchTooltip(false);
            }}
          >
            {/* Top: x2 Pitch Range Button with Red LED */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPitchRangeToggle) {
                  onPitchRangeToggle();
                }
              }}
              className={`flex items-center gap-1.5 w-full justify-between px-1.5 py-0.5 sm:py-1 rounded-md border transition-all duration-150 active:scale-95 cursor-pointer z-20 ${
                activePitchRange === 16
                  ? 'bg-neutral-850 border-amber-400/80 text-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title="Toggle ±8% (standard) / ±16% (wide) Pitch Range"
            >
              <div className="text-[7px] sm:text-[7.5px] font-mono font-bold tracking-wider">±16%</div>
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ring-1 ${
                  activePitchRange === 16
                    ? 'bg-red-500 ring-red-400 shadow-[0_0_8px_#ef4444]'
                    : 'bg-red-950 ring-red-900/40'
                }`}
              />
            </button>

            {/* Pitch Scale & Slider Slot Track */}
            <div
              ref={pitchTrackRef}
              onPointerDown={onPitchPointerDown}
              onPointerMove={onPitchPointerMove}
              onPointerUp={onPitchPointerUp}
              onPointerCancel={onPitchPointerUp}
              className="relative w-full h-[120px] sm:h-[132px] flex items-center justify-center cursor-ns-resize my-0.5"
              style={{ touchAction: 'none' }}
            >
              {/* Calibrated Ticks */}
              <div className="absolute left-0.5 text-[5.5px] sm:text-[6px] font-mono leading-[13px] sm:leading-[14px] text-amber-200/80 font-bold select-none pointer-events-none">
                <div>-{activePitchRange}</div>
                <div>-{(activePitchRange * 0.5).toFixed(0)}</div>
                <div className={isQuartzLocked ? 'text-emerald-400 font-black' : 'text-amber-400/60'}>0</div>
                <div>+{(activePitchRange * 0.5).toFixed(0)}</div>
                <div>+{activePitchRange}</div>
              </div>

              {/* Slot Track */}
              <div className="w-1.5 sm:w-2 h-full bg-neutral-900 rounded-full border border-neutral-700/80 shadow-inner relative pointer-events-none">
                {/* Center Detent Marker */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400/80 shadow-[0_0_4px_#34d399]" />
              </div>

              {/* Gold Pitch Fader Slider Knob */}
              <div
                className="absolute w-6.5 sm:w-7.5 h-4 rounded-xs border border-amber-300/90 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform z-10"
                style={{
                  top: `${knobTopPercent}%`,
                  transform: 'translateY(-50%)',
                  background: 'linear-gradient(135deg, #fae6a6 0%, #dfbf66 50%, #9a6f15 100%)',
                  boxShadow: isDraggingPitch
                    ? '0 0 14px rgba(251,191,36,0.95), 0 3px 6px rgba(0,0,0,0.9)'
                    : '0 2px 6px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.7)',
                }}
                title="Technics Pitch Fader - Click/drag or use mouse wheel"
              >
                <div className="w-full h-0.5 bg-white shadow-sm" />
              </div>

              {/* Floating Real-time Pitch Readout Tooltip (on right side of fader) */}
              {(showPitchTooltip || isDraggingPitch) && (
                <div
                  className="absolute left-[115%] top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-neutral-950/95 border border-amber-400/80 text-amber-300 text-[8px] font-mono font-bold whitespace-nowrap shadow-xl pointer-events-none z-40"
                  style={{
                    boxShadow: '0 4px 12px rgba(0,0,0,0.9)',
                  }}
                >
                  {activePitch > 0 ? `+${activePitch.toFixed(2)}%` : `${activePitch.toFixed(2)}%`}
                </div>
              )}
            </div>

            {/* Quartz Lock Reset Button & Pitch Adj Label */}
            <div className="w-full flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onResetPitch) {
                    onResetPitch();
                  } else {
                    handlePitchUpdate(0);
                  }
                }}
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border flex items-center justify-center mb-0.5 cursor-pointer transition-all duration-150 hover:scale-105 active:scale-90 z-20 shadow-md ${
                  isQuartzLocked
                    ? 'bg-gradient-to-b from-neutral-800 to-neutral-900 border-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.35)]'
                    : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-700'
                }`}
                style={{
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.6)',
                }}
                title="Quartz Lock / 0% Pitch Reset"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ring-1 ${
                    isQuartzLocked
                      ? 'bg-emerald-400 ring-emerald-300 shadow-[0_0_8px_#34d399,0_0_2px_#ffffff]'
                      : 'bg-neutral-700 ring-neutral-600'
                  }`}
                />
              </button>
              <div className="text-[5.5px] sm:text-[6px] font-mono font-extrabold text-amber-300 tracking-wider uppercase">
                {isQuartzLocked ? 'QUARTZ LOCK' : 'RESET 0%'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 6. BOTTOM BRANDING & LIMITED GOLD EDITION PLAQUE         */}
      {/* ======================================================== */}
      <div className="absolute bottom-3.5 right-4 sm:right-6 flex flex-col items-end gap-1 pointer-events-none select-none z-20">
        {/* Pop-Up Stylus Target Light Tower Button */}
        <button
          type="button"
          onClick={() => setTargetLightOn(!targetLightOn)}
          className={`absolute -top-8 right-0 w-6 h-6 rounded-full border border-amber-300/80 p-0.5 shadow-lg flex items-center justify-center pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 transition-all focus:outline-none ${
            targetLightOn ? 'shadow-[0_0_14px_rgba(253,230,138,0.7)]' : 'shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
          }`}
          style={{
            background: 'linear-gradient(135deg, #fae6a6 0%, #dfbf66 50%, #9a6f15 100%)',
          }}
          title={`Stylus Target Light (${targetLightOn ? 'ON' : 'OFF'}) - Click to toggle illumination`}
        >
          {/* Inner Machined Bezel & Halogen/LED Lens */}
          <div className="w-full h-full rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center shadow-inner">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ring-1 ${
                targetLightOn
                  ? 'bg-amber-100 ring-amber-200 shadow-[0_0_8px_#ffffff,0_0_12px_#fde68a]'
                  : 'bg-neutral-800 ring-neutral-700'
              }`}
            />
          </div>
        </button>

        {/* Technics Typography */}
        <div className="text-right">
          <div className="font-serif font-black text-xs sm:text-sm tracking-tight text-neutral-900 uppercase drop-shadow-sm">
            Technics
          </div>
          <div className="text-[6px] sm:text-[7px] font-mono font-extrabold text-neutral-800 uppercase tracking-tighter">
            DIRECT DRIVE TURNTABLE SYSTEM SL-1200GLD
          </div>
        </div>

        {/* Commemorative Gold Edition Plaque */}
        <div
          className="px-2.5 py-1 rounded-sm bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-amber-400/90 shadow-lg flex flex-col items-center justify-center pointer-events-auto"
          style={{
            boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 1px 2px rgba(251,191,36,0.3)',
          }}
        >
          <span className="text-[7.5px] font-serif font-bold italic tracking-wide text-amber-300">
            Gold Edition
          </span>
          <span className="text-[5.5px] font-mono font-bold tracking-widest text-amber-200/70 uppercase">
            LIMITED EDITION No. 0724
          </span>
        </div>
      </div>



      {/* ======================================================== */}
      {/* 8. REAL-TIME SYNCHRONIZED LYRICS OVERLAY (TURNTABLE HUD) */}
      {/* ======================================================== */}
      <VinylLyricsOverlay
        currentTrack={currentTrack}
        currentTime={calculatedCurrentTime}
        duration={calculatedDuration}
        isPlaying={isPlaying}
        accentColor={currentTrack?.colorAccent || activeAmbient.primary}
        onSeek={handleSeekSeconds}
        isOpen={showLyricsOverlay}
        onClose={() => setShowLyricsOverlay(false)}
        mode={lyricsMode}
        onToggleMode={() => setLyricsMode((prev) => (prev === 'full' ? 'hud' : 'full'))}
      />

      {/* ======================================================== */}
      {/* 9. REAL-TIME FREQUENCY HEATMAP HUD GAUGES & SPECTRUM     */}
      {/* ======================================================== */}
      <VinylHeatmapHUD
        isOpen={showHeatmapHUD && heatmapActive}
        onClose={() => setShowHeatmapHUD(false)}
        palette={heatmapPalette}
        onPaletteChange={setHeatmapPalette}
        intensity={heatmapIntensity}
        onIntensityChange={setHeatmapIntensity}
        isPlaying={isPlaying}
      />

      {/* ======================================================== */}
      {/* 10. TURNTABLE SLIPMAT & DECK CUSTOMIZATION STUDIO MODAL  */}
      {/* ======================================================== */}
      <SlipmatCustomizerModal
        isOpen={showSlipmatModal}
        onClose={() => setShowSlipmatModal(false)}
        config={activeSlipmatConfig}
        onUpdateConfig={handleUpdateSlipmat}
        albumArtwork={currentTrack?.artwork}
        albumTitle={currentTrack?.title}
      />
    </div>
  );
};
