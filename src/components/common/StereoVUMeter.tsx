import React, { useEffect, useRef, useState, useId } from 'react';
import { audioEngine, StereoPeakData } from '../../services/audioEngine';
import { Sliders, Gauge, Activity, RotateCcw } from 'lucide-react';

export type VUMeterDisplayMode = 'led' | 'analog' | 'compact';

export interface StereoVUMeterProps {
  isPlaying: boolean;
  mode?: VUMeterDisplayMode;
  variant?: 'plinth' | 'console' | 'compact' | 'mini';
  showDbLabels?: boolean;
  showCorrelation?: boolean;
  showClipIndicators?: boolean;
  interactive?: boolean;
  className?: string;
  onModeChange?: (mode: VUMeterDisplayMode) => void;
}

// 16-Segment Calibrated Studio Ladder
const LED_SEGMENTS = [
  { db: -36, label: '-36', color: 'bg-emerald-500', glow: '0 0 7px #10b981', tier: 'green' },
  { db: -30, label: '-30', color: 'bg-emerald-500', glow: '0 0 7px #10b981', tier: 'green' },
  { db: -24, label: '-24', color: 'bg-emerald-500', glow: '0 0 7px #10b981', tier: 'green' },
  { db: -20, label: '-20', color: 'bg-emerald-400', glow: '0 0 7px #34d399', tier: 'green' },
  { db: -16, label: '-16', color: 'bg-emerald-400', glow: '0 0 8px #34d399', tier: 'green' },
  { db: -12, label: '-12', color: 'bg-emerald-400', glow: '0 0 8px #34d399', tier: 'green' },
  { db: -9,  label: '-9',  color: 'bg-emerald-300', glow: '0 0 8px #6ee7b7', tier: 'green' },
  { db: -6,  label: '-6',  color: 'bg-emerald-300', glow: '0 0 9px #6ee7b7', tier: 'green' },
  { db: -4,  label: '-4',  color: 'bg-yellow-400',  glow: '0 0 9px #facc15', tier: 'yellow' },
  { db: -2,  label: '-2',  color: 'bg-amber-400',   glow: '0 0 9px #fbbf24', tier: 'yellow' },
  { db: -1,  label: '-1',  color: 'bg-amber-500',   glow: '0 0 10px #f59e0b', tier: 'yellow' },
  { db: 0,   label: '0',   color: 'bg-orange-500',  glow: '0 0 11px #f97316', tier: 'yellow' },
  { db: 1,   label: '+1',  color: 'bg-orange-600',  glow: '0 0 11px #ea580c', tier: 'red' },
  { db: 2,   label: '+2',  color: 'bg-red-500',     glow: '0 0 12px #ef4444', tier: 'red' },
  { db: 4,   label: '+4',  color: 'bg-red-600',     glow: '0 0 13px #dc2626', tier: 'red' },
  { db: 6,   label: '+6',  color: 'bg-red-700',     glow: '0 0 14px #b91c1c', tier: 'red' },
];

export const StereoVUMeter: React.FC<StereoVUMeterProps> = ({
  isPlaying,
  mode: controlledMode,
  variant = 'plinth',
  showDbLabels = true,
  showCorrelation = true,
  showClipIndicators = true,
  interactive = true,
  className = '',
  onModeChange,
}) => {
  const [internalMode, setInternalMode] = useState<VUMeterDisplayMode>('led');
  const activeMode = controlledMode || internalMode;

  const [stereoData, setStereoData] = useState<StereoPeakData>({
    left: 0,
    right: 0,
    peakL: 0,
    peakR: 0,
    peakRawL: 0,
    peakRawR: 0,
    dbL: -60,
    dbR: -60,
    peakDbL: -60,
    peakDbR: -60,
    isClippingL: false,
    isClippingR: false,
    correlation: 1.0,
  });

  const meterId = useId().replace(/:/g, '');
  const rafRef = useRef<number | null>(null);

  // Ballistic smoothing refs
  const smoothedLeftRef = useRef(0);
  const smoothedRightRef = useRef(0);
  const peakHoldLRef = useRef(0);
  const peakHoldRRef = useRef(0);
  const peakHoldDecayLRef = useRef(0);
  const peakHoldDecayRRef = useRef(0);

  // Needle angle dampening
  const needleAngleLRef = useRef(-38);
  const needleAngleRRef = useRef(-38);

  const handleToggleMode = (newMode: VUMeterDisplayMode) => {
    setInternalMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const handleResetPeaks = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    peakHoldLRef.current = 0;
    peakHoldRRef.current = 0;
    peakHoldDecayLRef.current = 0;
    peakHoldDecayRRef.current = 0;
    setStereoData((prev) => ({
      ...prev,
      peakL: 0,
      peakR: 0,
      peakDbL: -60,
      peakDbR: -60,
    }));
  };

  useEffect(() => {
    let isSubscribed = true;

    const tick = () => {
      if (!isSubscribed) return;

      if (isPlaying) {
        const raw = audioEngine.getStereoPeakData();

        // Responsive attack & decay ballistics
        const attack = 0.58;
        const decay = 0.16;

        smoothedLeftRef.current = raw.left > smoothedLeftRef.current
          ? smoothedLeftRef.current + (raw.left - smoothedLeftRef.current) * attack
          : smoothedLeftRef.current + (raw.left - smoothedLeftRef.current) * decay;

        smoothedRightRef.current = raw.right > smoothedRightRef.current
          ? smoothedRightRef.current + (raw.right - smoothedRightRef.current) * attack
          : smoothedRightRef.current + (raw.right - smoothedRightRef.current) * decay;

        // Peak Hold logic Left
        if (smoothedLeftRef.current >= peakHoldLRef.current) {
          peakHoldLRef.current = smoothedLeftRef.current;
          peakHoldDecayLRef.current = 24; // frames to hold
        } else {
          if (peakHoldDecayLRef.current > 0) {
            peakHoldDecayLRef.current--;
          } else {
            peakHoldLRef.current = Math.max(0, peakHoldLRef.current - 0.02);
          }
        }

        // Peak Hold logic Right
        if (smoothedRightRef.current >= peakHoldRRef.current) {
          peakHoldRRef.current = smoothedRightRef.current;
          peakHoldDecayRRef.current = 24;
        } else {
          if (peakHoldDecayRRef.current > 0) {
            peakHoldDecayRRef.current--;
          } else {
            peakHoldRRef.current = Math.max(0, peakHoldRRef.current - 0.02);
          }
        }

        // Calculate Needle Angles (-38° at zero to +38° at peak overload)
        const targetAngleL = -38 + Math.min(1, Math.max(0, smoothedLeftRef.current)) * 76;
        const targetAngleR = -38 + Math.min(1, Math.max(0, smoothedRightRef.current)) * 76;

        needleAngleLRef.current += (targetAngleL - needleAngleLRef.current) * 0.45;
        needleAngleRRef.current += (targetAngleR - needleAngleRRef.current) * 0.45;

        setStereoData({
          left: smoothedLeftRef.current,
          right: smoothedRightRef.current,
          peakL: peakHoldLRef.current,
          peakR: peakHoldRRef.current,
          peakRawL: raw.peakRawL,
          peakRawR: raw.peakRawR,
          dbL: raw.dbL,
          dbR: raw.dbR,
          peakDbL: raw.peakDbL,
          peakDbR: raw.peakDbR,
          isClippingL: raw.isClippingL,
          isClippingR: raw.isClippingR,
          correlation: raw.correlation,
        });
      } else {
        // Natural release down to rest position when stopped
        smoothedLeftRef.current = Math.max(0, smoothedLeftRef.current * 0.85);
        smoothedRightRef.current = Math.max(0, smoothedRightRef.current * 0.85);
        peakHoldLRef.current = Math.max(0, peakHoldLRef.current * 0.88);
        peakHoldRRef.current = Math.max(0, peakHoldRRef.current * 0.88);

        const targetRest = -38;
        needleAngleLRef.current += (targetRest - needleAngleLRef.current) * 0.2;
        needleAngleRRef.current += (targetRest - needleAngleRRef.current) * 0.2;

        setStereoData({
          left: smoothedLeftRef.current,
          right: smoothedRightRef.current,
          peakL: peakHoldLRef.current,
          peakR: peakHoldRRef.current,
          peakRawL: 0,
          peakRawR: 0,
          dbL: -60,
          dbR: -60,
          peakDbL: -60,
          peakDbR: -60,
          isClippingL: false,
          isClippingR: false,
          correlation: 1.0,
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      isSubscribed = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const numSegments = LED_SEGMENTS.length;
  const activeCountL = Math.round(stereoData.left * numSegments);
  const activeCountR = Math.round(stereoData.right * numSegments);
  const peakIndexL = Math.min(numSegments - 1, Math.floor(stereoData.peakL * numSegments));
  const peakIndexR = Math.min(numSegments - 1, Math.floor(stereoData.peakR * numSegments));

  // ========================================================
  // 1. VINTAGE DUAL ANALOG NEEDLE VU METER DISPLAY
  // ========================================================
  if (activeMode === 'analog') {
    return (
      <div
        id={`stereo-vu-analog-${meterId}`}
        className={`relative flex flex-col p-2 sm:p-2.5 rounded-xl bg-neutral-950/95 border border-amber-500/50 shadow-2xl select-none group ${className}`}
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 1px 2px rgba(251,191,36,0.3)',
        }}
      >
        {/* Precision Bezel Corner Rivets */}
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-600/80 border border-amber-300/60 pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-600/80 border border-amber-300/60 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-600/80 border border-amber-300/60 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-600/80 border border-amber-300/60 pointer-events-none" />

        {/* Top Header Bar with Mode Toggle & Peak Info */}
        <div className="flex items-center justify-between px-1 mb-1.5 text-[8px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold tracking-widest uppercase">
              VU STEREO
            </span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400">ANALOG BAL</span>
          </div>

          <div className="flex items-center gap-2">
            {showCorrelation && (
              <span
                className="text-[7px] text-amber-300/80 font-semibold hidden sm:inline"
                title="Stereo Phase Correlation (-1: Out-of-Phase, +1: Mono In-Phase)"
              >
                PHASE: {stereoData.correlation >= 0 ? `+${stereoData.correlation.toFixed(2)}` : stereoData.correlation.toFixed(2)}
              </span>
            )}

            {interactive && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleMode('led')}
                  className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 transition cursor-pointer text-[7.5px]"
                  title="Switch to LED Segment Ladder"
                >
                  LED
                </button>
                <button
                  type="button"
                  onClick={handleResetPeaks}
                  className="p-0.5 rounded hover:text-amber-300 text-neutral-400 transition cursor-pointer"
                  title="Reset Peak Hold"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dual Analog Dials Container */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left Analog Dial */}
          <div className="relative flex flex-col items-center justify-center rounded-lg p-1.5 border border-amber-500/30 vu-vintage-meter-glass overflow-hidden">
            {/* Dial Background Face SVG */}
            <svg
              viewBox="0 0 140 85"
              className="w-full h-auto max-h-[85px] overflow-visible"
            >
              {/* Backlight Glow Filter */}
              <defs>
                <radialGradient id={`backlight-glow-l-${meterId}`} cx="50%" cy="100%" r="90%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.45 + stereoData.left * 0.35} />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
                </radialGradient>
              </defs>

              <rect x="0" y="0" width="140" height="85" rx="4" fill={`url(#backlight-glow-l-${meterId})`} />

              {/* Calibrated Arc Lines */}
              {/* Normal Operating Zone (-20dB to 0dB) */}
              <path
                d="M 18 64 A 65 65 0 0 1 96 22"
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="1.2"
              />
              {/* Red Overload Zone (0dB to +3dB) */}
              <path
                d="M 96 22 A 65 65 0 0 1 124 38"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.2"
              />

              {/* Major Tick Marks & Numbers */}
              {/* -20 dB */}
              <line x1="20" y1="62" x2="26" y2="58" stroke="#d4d4d8" strokeWidth="1" />
              <text x="24" y="69" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-20</text>

              {/* -10 dB */}
              <line x1="42" y1="42" x2="47" y2="40" stroke="#d4d4d8" strokeWidth="1" />
              <text x="44" y="49" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-10</text>

              {/* -5 dB */}
              <line x1="68" y1="28" x2="71" y2="24" stroke="#d4d4d8" strokeWidth="1" />
              <text x="69" y="34" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-5</text>

              {/* 0 dB (Nominal Reference) */}
              <line x1="96" y1="22" x2="98" y2="17" stroke="#ef4444" strokeWidth="1.6" />
              <text x="96" y="14" fontSize="7.5" fill="#ef4444" fontFamily="monospace" fontWeight="bold" textAnchor="middle">0</text>

              {/* +3 dB */}
              <line x1="123" y1="37" x2="127" y2="34" stroke="#ef4444" strokeWidth="1.4" />
              <text x="127" y="43" fontSize="6.5" fill="#ef4444" fontFamily="monospace" fontWeight="bold" textAnchor="middle">+3</text>

              {/* Label Marks */}
              <text x="70" y="52" fontSize="7" fill="#fbbf24" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
                LEFT
              </text>
              <text x="70" y="60" fontSize="5" fill="#9ca3af" fontFamily="monospace" textAnchor="middle">
                VU / dB
              </text>

              {/* Mechanical Needle */}
              <g
                className="vu-needle-pivot"
                style={{
                  transformOrigin: '70px 76px',
                  transform: `rotate(${needleAngleLRef.current}deg)`,
                  transition: 'transform 60ms cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                }}
              >
                {/* Needle Shadow */}
                <line x1="71" y1="77" x2="71" y2="18" stroke="#000000" strokeWidth="1.8" opacity="0.45" />
                {/* Needle Rod */}
                <line x1="70" y1="76" x2="70" y2="17" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
                {/* Needle Tip Highlight */}
                <circle cx="70" cy="18" r="0.8" fill="#fca5a5" />
              </g>

              {/* Brass Pivot Cap */}
              <circle cx="70" cy="76" r="6" fill="#18181b" stroke="#dfbf66" strokeWidth="1" />
              <circle cx="70" cy="76" r="3" fill="#b45309" />
              <circle cx="70" cy="76" r="1" fill="#fef3c7" />
            </svg>

            {/* Bottom Real-time Decibel Readout & Clip Indicator */}
            <div className="flex items-center justify-between w-full px-1 pt-1 border-t border-amber-500/20 text-[7px] font-mono">
              <span className="text-amber-300 font-semibold">
                {stereoData.dbL > -55 ? `${stereoData.dbL.toFixed(1)} dB` : '-∞ dB'}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">PEAK:</span>
                <span className={`font-bold ${stereoData.isClippingL ? 'text-red-400' : 'text-amber-300'}`}>
                  {stereoData.peakDbL > -55 ? `${stereoData.peakDbL.toFixed(1)}` : '-∞'}
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                    stereoData.isClippingL ? 'bg-red-500 animate-vu-clip' : 'bg-red-950/60 border border-red-900/40'
                  }`}
                  title="Left Channel Clip Indicator"
                />
              </div>
            </div>
          </div>

          {/* Right Analog Dial */}
          <div className="relative flex flex-col items-center justify-center rounded-lg p-1.5 border border-amber-500/30 vu-vintage-meter-glass overflow-hidden">
            {/* Dial Background Face SVG */}
            <svg
              viewBox="0 0 140 85"
              className="w-full h-auto max-h-[85px] overflow-visible"
            >
              <defs>
                <radialGradient id={`backlight-glow-r-${meterId}`} cx="50%" cy="100%" r="90%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.45 + stereoData.right * 0.35} />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
                </radialGradient>
              </defs>

              <rect x="0" y="0" width="140" height="85" rx="4" fill={`url(#backlight-glow-r-${meterId})`} />

              {/* Calibrated Arc Lines */}
              <path
                d="M 18 64 A 65 65 0 0 1 96 22"
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="1.2"
              />
              <path
                d="M 96 22 A 65 65 0 0 1 124 38"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.2"
              />

              {/* Ticks */}
              <line x1="20" y1="62" x2="26" y2="58" stroke="#d4d4d8" strokeWidth="1" />
              <text x="24" y="69" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-20</text>

              <line x1="42" y1="42" x2="47" y2="40" stroke="#d4d4d8" strokeWidth="1" />
              <text x="44" y="49" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-10</text>

              <line x1="68" y1="28" x2="71" y2="24" stroke="#d4d4d8" strokeWidth="1" />
              <text x="69" y="34" fontSize="6.5" fill="#a1a1aa" fontFamily="monospace" textAnchor="middle">-5</text>

              <line x1="96" y1="22" x2="98" y2="17" stroke="#ef4444" strokeWidth="1.6" />
              <text x="96" y="14" fontSize="7.5" fill="#ef4444" fontFamily="monospace" fontWeight="bold" textAnchor="middle">0</text>

              <line x1="123" y1="37" x2="127" y2="34" stroke="#ef4444" strokeWidth="1.4" />
              <text x="127" y="43" fontSize="6.5" fill="#ef4444" fontFamily="monospace" fontWeight="bold" textAnchor="middle">+3</text>

              {/* Label Marks */}
              <text x="70" y="52" fontSize="7" fill="#fbbf24" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
                RIGHT
              </text>
              <text x="70" y="60" fontSize="5" fill="#9ca3af" fontFamily="monospace" textAnchor="middle">
                VU / dB
              </text>

              {/* Mechanical Needle */}
              <g
                className="vu-needle-pivot"
                style={{
                  transformOrigin: '70px 76px',
                  transform: `rotate(${needleAngleRRef.current}deg)`,
                  transition: 'transform 60ms cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                }}
              >
                <line x1="71" y1="77" x2="71" y2="18" stroke="#000000" strokeWidth="1.8" opacity="0.45" />
                <line x1="70" y1="76" x2="70" y2="17" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="70" cy="18" r="0.8" fill="#fca5a5" />
              </g>

              {/* Brass Pivot Cap */}
              <circle cx="70" cy="76" r="6" fill="#18181b" stroke="#dfbf66" strokeWidth="1" />
              <circle cx="70" cy="76" r="3" fill="#b45309" />
              <circle cx="70" cy="76" r="1" fill="#fef3c7" />
            </svg>

            {/* Bottom Decibel Readout */}
            <div className="flex items-center justify-between w-full px-1 pt-1 border-t border-amber-500/20 text-[7px] font-mono">
              <span className="text-amber-300 font-semibold">
                {stereoData.dbR > -55 ? `${stereoData.dbR.toFixed(1)} dB` : '-∞ dB'}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">PEAK:</span>
                <span className={`font-bold ${stereoData.isClippingR ? 'text-red-400' : 'text-amber-300'}`}>
                  {stereoData.peakDbR > -55 ? `${stereoData.peakDbR.toFixed(1)}` : '-∞'}
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                    stereoData.isClippingR ? 'bg-red-500 animate-vu-clip' : 'bg-red-950/60 border border-red-900/40'
                  }`}
                  title="Right Channel Clip Indicator"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. STUDIO LED SEGMENT LADDER DISPLAY (DEFAULT / MASTERING)
  // ========================================================
  return (
    <div
      id={`stereo-vu-led-${meterId}`}
      className={`relative flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl bg-neutral-950/95 border border-amber-500/40 shadow-xl select-none group ${className}`}
      style={{
        boxShadow: '0 6px 20px rgba(0,0,0,0.85), inset 0 1px 2px rgba(251,191,36,0.25)',
      }}
    >
      {/* Precision Corner Rivets */}
      <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-0.5 text-[7.5px] sm:text-[8px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-widest text-amber-400">
            STEREO VU
          </span>
          <span className="text-[6.5px] px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-amber-300/90 font-mono">
            PEAK/RMS
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {showCorrelation && (
            <span
              className="text-[7px] text-amber-300/70 hidden md:inline font-mono"
              title="Phase Correlation (-1.0 to +1.0)"
            >
              Ø: {stereoData.correlation >= 0 ? `+${stereoData.correlation.toFixed(2)}` : stereoData.correlation.toFixed(2)}
            </span>
          )}

          {interactive && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleMode('analog')}
                className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 transition cursor-pointer text-[7px]"
                title="Switch to Vintage Analog Dial"
              >
                ANALOG
              </button>
              <button
                type="button"
                onClick={handleResetPeaks}
                className="p-0.5 rounded text-neutral-400 hover:text-amber-300 transition cursor-pointer"
                title="Clear Peak Hold"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dual Channel Ladder Container */}
      <div className="flex flex-col gap-1 sm:gap-1.5">
        {/* Left Channel Row */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[7px] sm:text-[8px] font-mono font-black text-amber-300 w-2.5 sm:w-3 text-center shrink-0">
            L
          </span>
          <div className="flex items-center gap-[1.5px] sm:gap-[2px] flex-1 bg-black/60 p-1 rounded-md border border-neutral-800/80">
            {LED_SEGMENTS.map((seg, idx) => {
              const isActive = idx < activeCountL;
              const isPeak = idx === peakIndexL && stereoData.peakL > 0.05;
              const isLit = isActive || isPeak;

              return (
                <div
                  key={`seg-l-${idx}`}
                  className="relative flex-1 h-2 sm:h-2.5 rounded-[1px] transition-all duration-75"
                  style={{
                    backgroundColor: isLit ? undefined : 'rgba(24, 24, 28, 0.95)',
                    boxShadow: isLit ? seg.glow : 'none',
                    opacity: isLit ? 1 : 0.22,
                  }}
                  title={`L: ${seg.label} dB`}
                >
                  <div className={`w-full h-full rounded-[1px] ${isLit ? seg.color : 'bg-neutral-800'}`} />
                  {/* Glass segment reflection */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent rounded-[1px] pointer-events-none" />
                </div>
              );
            })}
          </div>

          {/* Left Peak dB Badge */}
          <div className="w-9 sm:w-10 text-right text-[7px] sm:text-[7.5px] font-mono text-amber-300 shrink-0 font-bold">
            {stereoData.dbL > -55 ? `${stereoData.dbL.toFixed(0)}dB` : '-∞'}
          </div>

          {/* Left Clip Indicator */}
          {showClipIndicators && (
            <div
              className={`w-2 h-2 rounded-full transition-all duration-75 shrink-0 ${
                stereoData.isClippingL ? 'bg-red-500 animate-vu-clip' : 'bg-red-950/60 border border-red-900/40'
              }`}
              title="Left Channel Clip Indicator"
            />
          )}
        </div>

        {/* Right Channel Row */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[7px] sm:text-[8px] font-mono font-black text-amber-300 w-2.5 sm:w-3 text-center shrink-0">
            R
          </span>
          <div className="flex items-center gap-[1.5px] sm:gap-[2px] flex-1 bg-black/60 p-1 rounded-md border border-neutral-800/80">
            {LED_SEGMENTS.map((seg, idx) => {
              const isActive = idx < activeCountR;
              const isPeak = idx === peakIndexR && stereoData.peakR > 0.05;
              const isLit = isActive || isPeak;

              return (
                <div
                  key={`seg-r-${idx}`}
                  className="relative flex-1 h-2 sm:h-2.5 rounded-[1px] transition-all duration-75"
                  style={{
                    backgroundColor: isLit ? undefined : 'rgba(24, 24, 28, 0.95)',
                    boxShadow: isLit ? seg.glow : 'none',
                    opacity: isLit ? 1 : 0.22,
                  }}
                  title={`R: ${seg.label} dB`}
                >
                  <div className={`w-full h-full rounded-[1px] ${isLit ? seg.color : 'bg-neutral-800'}`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent rounded-[1px] pointer-events-none" />
                </div>
              );
            })}
          </div>

          {/* Right Peak dB Badge */}
          <div className="w-9 sm:w-10 text-right text-[7px] sm:text-[7.5px] font-mono text-amber-300 shrink-0 font-bold">
            {stereoData.dbR > -55 ? `${stereoData.dbR.toFixed(0)}dB` : '-∞'}
          </div>

          {/* Right Clip Indicator */}
          {showClipIndicators && (
            <div
              className={`w-2 h-2 rounded-full transition-all duration-75 shrink-0 ${
                stereoData.isClippingR ? 'bg-red-500 animate-vu-clip' : 'bg-red-950/60 border border-red-900/40'
              }`}
              title="Right Channel Clip Indicator"
            />
          )}
        </div>
      </div>

      {/* Scale Tick Labels */}
      {showDbLabels && (
        <div className="flex items-center justify-between px-3 sm:px-4 text-[6px] sm:text-[6.5px] font-mono text-neutral-500 pt-0.5 border-t border-neutral-900">
          <span>-36</span>
          <span>-24</span>
          <span>-12</span>
          <span>-6</span>
          <span className="text-amber-400 font-bold">0 dB</span>
          <span className="text-red-400">+2</span>
          <span className="text-red-500 font-bold">+6</span>
        </div>
      )}
    </div>
  );
};
