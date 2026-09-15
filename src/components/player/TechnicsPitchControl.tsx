import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Gauge, Lock, Unlock, RotateCcw, Zap, ChevronUp, ChevronDown, Music2, Activity } from 'lucide-react';

interface TechnicsPitchControlProps {
  pitchPercent: number; // -16 to +16
  pitchRange: 8 | 16;
  isKeyLock: boolean;
  baseSpeed: number; // 1.0 for 33.3 RPM, 1.35 for 45 RPM
  trackBpm?: number; // Base detected BPM (e.g. 128)
  accentColor?: string;
  onPitchChange: (pitch: number) => void;
  onPitchRangeToggle: () => void;
  onKeyLockToggle: () => void;
  onResetPitch: () => void;
  onBaseSpeedChange: (speed: number) => void;
  className?: string;
}

export const TechnicsPitchControl: React.FC<TechnicsPitchControlProps> = ({
  pitchPercent,
  pitchRange,
  isKeyLock,
  baseSpeed,
  trackBpm = 120,
  accentColor = '#dfbf66',
  onPitchChange,
  onPitchRangeToggle,
  onKeyLockToggle,
  onResetPitch,
  onBaseSpeedChange,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNudgingPlus, setIsNudgingPlus] = useState(false);
  const [isNudgingMinus, setIsNudgingMinus] = useState(false);

  // Effective speed ratio
  const effectiveSpeed = baseSpeed * (1 + pitchPercent / 100);

  // Live BPM Calculation
  const liveBpm = Math.round(trackBpm * effectiveSpeed * 10) / 10;
  const bpmDelta = Math.round((liveBpm - trackBpm) * 10) / 10;

  // Semitones and cents offset calculation
  // 12 * log2(1 + pitch/100) semitones
  const semitonesOffset = isKeyLock ? 0 : 12 * Math.log2(Math.max(0.01, 1 + pitchPercent / 100));
  const totalCents = Math.round(semitonesOffset * 100);

  // Clamped position for fader (0% at top = -pitchRange, 50% = 0, 100% at bottom = +pitchRange)
  // On Technics SL-1200: Top is -%, Center is 0%, Bottom is +%
  const faderNormalized = (pitchPercent / pitchRange + 1) / 2; // 0 to 1
  const faderTopPercent = Math.max(0, Math.min(100, faderNormalized * 100));
  const isQuartzLocked = Math.abs(pitchPercent) < 0.05;

  const updatePitchFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, relativeY / rect.height)); // 0 (top) to 1 (bottom)
      
      // Map 0 -> -pitchRange, 0.5 -> 0, 1 -> +pitchRange
      let calculatedPitch = (ratio * 2 - 1) * pitchRange;

      // Magnetic snap around 0% center detent (within 0.25%)
      if (Math.abs(calculatedPitch) < 0.25) {
        calculatedPitch = 0;
      }

      // Round to 2 decimal places for audio precision
      const rounded = Math.round(calculatedPitch * 100) / 100;
      onPitchChange(rounded);
    },
    [pitchRange, onPitchChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
    setIsDragging(true);
    updatePitchFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    updatePitchFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  // Mouse wheel fine tuning
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.2 : -0.2;
    const next = Math.max(-pitchRange, Math.min(pitchRange, pitchPercent + delta));
    onPitchChange(Math.round(next * 100) / 100);
  };

  // Nudge / Pitch Bend (+/- 0.2%)
  const handleNudge = (delta: number) => {
    const next = Math.max(-pitchRange, Math.min(pitchRange, pitchPercent + delta));
    onPitchChange(Math.round(next * 100) / 100);
  };

  return (
    <div
      id="technics-pitch-control-module"
      className={`relative rounded-2xl bg-neutral-950/90 border border-neutral-800 backdrop-blur-xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 text-white select-none ${className}`}
      style={{
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
      }}
    >
      {/* Header with Technics Brushed Plaque & Status */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider font-display text-white">
                Technics Pitch Fader
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SL-1200
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">
              Real-time Varispeed & Analog Pitch Shift
            </p>
          </div>
        </div>

        {/* Quartz Lock Indicator LED */}
        <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              isQuartzLocked
                ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                : 'bg-neutral-700'
            }`}
          />
          <span
            className={`text-[10px] font-mono uppercase font-bold tracking-tight ${
              isQuartzLocked ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            {isQuartzLocked ? 'Quartz 0% Locked' : 'Pitch Shift Active'}
          </span>
        </div>
      </div>

      {/* Main Pitch Engine HUD Display */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80">
        {/* Live Track BPM Display */}
        <div className="flex flex-col col-span-2 sm:col-span-1 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400 animate-pulse" /> Live BPM
            </span>
            <span className="text-[9px] font-mono text-neutral-400">
              Orig: {trackBpm}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-tight">
              {liveBpm.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400/80">
              BPM
            </span>
            {bpmDelta !== 0 && (
              <span className={`text-[9px] font-mono font-bold ml-auto ${bpmDelta > 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                {bpmDelta > 0 ? `+${bpmDelta.toFixed(1)}` : `${bpmDelta.toFixed(1)}`}
              </span>
            )}
          </div>
        </div>

        {/* Current Pitch Percent */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">
            Pitch Delta
          </span>
          <span
            className={`text-lg sm:text-xl font-mono font-extrabold tracking-tight ${
              pitchPercent > 0
                ? 'text-cyan-400'
                : pitchPercent < 0
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {pitchPercent > 0 ? `+${pitchPercent.toFixed(2)}%` : `${pitchPercent.toFixed(2)}%`}
          </span>
        </div>

        {/* Musical Pitch Shift Offset */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">
            Key / Tone Shift
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-neutral-200 truncate mt-0.5">
            {isKeyLock
              ? '0.0 st (Locked)'
              : totalCents === 0
              ? 'Natural Pitch'
              : `${semitonesOffset > 0 ? '+' : ''}${semitonesOffset.toFixed(2)} st (${totalCents > 0 ? '+' : ''}${totalCents}¢)`}
          </span>
        </div>

        {/* Speed Multiplier */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">
            Playback Speed
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-neutral-200 mt-0.5">
            {effectiveSpeed.toFixed(3)}x
          </span>
        </div>

        {/* Turntable RPM Setting */}
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">
            Platter RPM
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-amber-300 mt-0.5">
            {(baseSpeed <= 1.1 ? 33.33 * (1 + pitchPercent / 100) : 45.0 * (1 + pitchPercent / 100)).toFixed(1)} RPM
          </span>
        </div>
      </div>

      {/* Interactive Fader & Scale Assembly */}
      <div className="flex items-center justify-between gap-4 py-1">
        {/* Left Side: Pitch Bend & Preset Nudge Buttons */}
        <div className="flex flex-col gap-2 w-28 shrink-0">
          <div className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider font-semibold">
            Pitch Bend / Nudge
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleNudge(-0.2)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
              title="Pitch Bend - (Slow Down momentarily)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              -0.2%
            </button>
            <button
              onClick={() => handleNudge(0.2)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition"
              title="Pitch Bend + (Speed Up momentarily)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              +0.2%
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            {[-pitchRange, -pitchRange / 2, 0, pitchRange / 2, pitchRange].map((p, idx) => (
              <button
                key={idx}
                onClick={() => onPitchChange(p)}
                className={`py-1 rounded text-[10px] font-mono transition ${
                  Math.abs(pitchPercent - p) < 0.1
                    ? 'bg-amber-500 text-neutral-950 font-extrabold'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                {p > 0 ? `+${p}%` : `${p}%`}
              </button>
            ))}
            <button
              onClick={onResetPitch}
              className="py-1 rounded text-[10px] font-mono font-bold bg-neutral-800 hover:bg-emerald-950 text-emerald-400 border border-emerald-500/30"
              title="Reset to 0% Quartz Lock"
            >
              0.0%
            </button>
          </div>
        </div>

        {/* Center: The Technics Pitch Fader Assembly Track */}
        <div className="flex-1 flex flex-col items-center gap-2 max-w-[280px]">
          {/* Fader Track & Scale */}
          <div className="relative w-full h-32 flex items-center justify-center px-4">
            {/* Calibrated Ticks Left & Right */}
            <div className="absolute left-0 h-full flex flex-col justify-between text-[8px] font-mono text-neutral-500 select-none py-1">
              <span>-{pitchRange}%</span>
              <span>-{(pitchRange * 0.75).toFixed(0)}%</span>
              <span>-{(pitchRange * 0.5).toFixed(0)}%</span>
              <span className="text-emerald-400 font-bold">0%</span>
              <span>+{(pitchRange * 0.5).toFixed(0)}%</span>
              <span>+{(pitchRange * 0.75).toFixed(0)}%</span>
              <span>+{pitchRange}%</span>
            </div>

            <div className="absolute right-0 h-full flex flex-col justify-between text-[8px] font-mono text-neutral-500 select-none py-1 text-right">
              <span>SLOW</span>
              <span></span>
              <span></span>
              <span className="text-emerald-400 font-bold">LOCK</span>
              <span></span>
              <span></span>
              <span>FAST</span>
            </div>

            {/* Fader Track Slot */}
            <div
              ref={trackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{ touchAction: 'none' }}
              className="relative w-3 h-full bg-neutral-950 rounded-full border border-neutral-700/80 cursor-ns-resize shadow-inner flex items-center justify-center"
            >
              {/* Center Detent Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/80 shadow-[0_0_4px_#10b981]" />

              {/* Fader Active Colored Fill */}
              <div
                className="absolute w-1 rounded-full pointer-events-none"
                style={{
                  top: pitchPercent < 0 ? `${faderTopPercent}%` : '50%',
                  bottom: pitchPercent > 0 ? `${100 - faderTopPercent}%` : '50%',
                  background: pitchPercent > 0 ? '#06b6d4' : pitchPercent < 0 ? '#f59e0b' : '#10b981',
                  boxShadow: `0 0 8px ${pitchPercent > 0 ? '#06b6d4' : pitchPercent < 0 ? '#f59e0b' : '#10b981'}`,
                }}
              />

              {/* Technics Solid Gold/Silver Fader Slider Knob */}
              <div
                className="absolute w-10 h-6 rounded-md border border-amber-300/80 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform z-10"
                style={{
                  top: `${faderTopPercent}%`,
                  transform: 'translateY(-50%)',
                  background: 'linear-gradient(135deg, #fcedc0 0%, #dfbf66 40%, #a1771f 100%)',
                  boxShadow: isDragging
                    ? '0 0 15px rgba(251, 191, 36, 0.8), 0 4px 10px rgba(0,0,0,0.9)'
                    : '0 2px 6px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.7)',
                }}
              >
                {/* Center High-Contrast White Line Indicator */}
                <div className="w-full h-0.5 bg-white shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Range Toggle & Key Lock Mode */}
        <div className="flex flex-col gap-2 w-32 shrink-0">
          <div className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider font-semibold">
            Pitch Controls
          </div>

          {/* x2 Range Switch */}
          <button
            onClick={onPitchRangeToggle}
            className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-between transition ${
              pitchRange === 16
                ? 'bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
            }`}
            title="Toggle Pitch Range (±8% standard / ±16% wide)"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Range
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${pitchRange === 16 ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              ±{pitchRange}%
            </span>
          </button>

          {/* Key Lock (Master Tempo) Toggle */}
          <button
            onClick={onKeyLockToggle}
            className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-between transition ${
              isKeyLock
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
            }`}
            title={
              isKeyLock
                ? 'Key Lock is ON: Pitch is preserved while tempo changes'
                : 'Key Lock is OFF: Authentic Analog Vinyl Pitch Shift (speeding up raises pitch)'
            }
          >
            <span className="flex items-center gap-1.5">
              {isKeyLock ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <Unlock className="w-3.5 h-3.5 text-neutral-500" />}
              Key Lock
            </span>
            <span className={`text-[10px] uppercase font-mono ${isKeyLock ? 'text-cyan-400' : 'text-neutral-500'}`}>
              {isKeyLock ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Reset Pitch Button */}
          <button
            onClick={onResetPitch}
            className="w-full py-1.5 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            title="Reset pitch to 0.00% (Quartz Detent)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            Reset (0%)
          </button>
        </div>
      </div>

      {/* Turntable RPM Base Mode Selectors */}
      <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-400 uppercase">Base RPM:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onBaseSpeedChange(1.0)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                baseSpeed <= 1.1
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              33⅓ RPM
            </button>
            <button
              onClick={() => onBaseSpeedChange(1.35)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                baseSpeed > 1.1
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              45 RPM
            </button>
          </div>
        </div>

        <div className="text-[10px] font-mono text-neutral-500">
          Direct Drive Quartz Synthesizer
        </div>
      </div>
    </div>
  );
};
