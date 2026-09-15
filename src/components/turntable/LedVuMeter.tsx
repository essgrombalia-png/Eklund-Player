import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../services/audioEngine';

interface LedVuMeterProps {
  isPlaying: boolean;
  accentColor?: string;
  className?: string;
}

const SEGMENTS = [
  { db: -24, color: 'bg-emerald-500', activeGlow: '0 0 6px #10b981', type: 'normal' },
  { db: -18, color: 'bg-emerald-500', activeGlow: '0 0 6px #10b981', type: 'normal' },
  { db: -14, color: 'bg-emerald-500', activeGlow: '0 0 6px #10b981', type: 'normal' },
  { db: -10, color: 'bg-emerald-400', activeGlow: '0 0 7px #34d399', type: 'normal' },
  { db: -7,  color: 'bg-emerald-400', activeGlow: '0 0 7px #34d399', type: 'normal' },
  { db: -4,  color: 'bg-emerald-300', activeGlow: '0 0 8px #6ee7b7', type: 'normal' },
  { db: -2,  color: 'bg-amber-400',   activeGlow: '0 0 8px #fbbf24', type: 'warning' },
  { db: 0,   color: 'bg-amber-500',   activeGlow: '0 0 9px #f59e0b', type: 'warning' },
  { db: +2,  color: 'bg-orange-500',  activeGlow: '0 0 10px #f97316', type: 'warning' },
  { db: +4,  color: 'bg-red-500',     activeGlow: '0 0 11px #ef4444', type: 'peak' },
  { db: +6,  color: 'bg-red-600',     activeGlow: '0 0 12px #dc2626', type: 'peak' },
];

export const LedVuMeter: React.FC<LedVuMeterProps> = ({
  isPlaying,
  className = '',
}) => {
  const [levels, setLevels] = useState({ left: 0, right: 0, peakL: 0, peakR: 0 });
  const rafRef = useRef<number | null>(null);

  // Peak hold decay state refs
  const smoothLeftRef = useRef(0);
  const smoothRightRef = useRef(0);
  const peakHoldLeftRef = useRef(0);
  const peakHoldRightRef = useRef(0);
  const peakHoldDecayTimerLRef = useRef(0);
  const peakHoldDecayTimerRRef = useRef(0);

  useEffect(() => {
    let active = true;

    const updateMeter = () => {
      if (!active) return;

      if (isPlaying) {
        const raw = audioEngine.getRealtimeAudioLevels();

        // Fast attack, smooth decay filter
        const attack = 0.55;
        const decay = 0.18;
        smoothLeftRef.current = raw.left > smoothLeftRef.current
          ? smoothLeftRef.current + (raw.left - smoothLeftRef.current) * attack
          : smoothLeftRef.current + (raw.left - smoothLeftRef.current) * decay;

        smoothRightRef.current = raw.right > smoothRightRef.current
          ? smoothRightRef.current + (raw.right - smoothRightRef.current) * attack
          : smoothRightRef.current + (raw.right - smoothRightRef.current) * decay;

        // Peak Hold logic Left
        if (smoothLeftRef.current >= peakHoldLeftRef.current) {
          peakHoldLeftRef.current = smoothLeftRef.current;
          peakHoldDecayTimerLRef.current = 18; // frames before drop
        } else {
          if (peakHoldDecayTimerLRef.current > 0) {
            peakHoldDecayTimerLRef.current -= 1;
          } else {
            peakHoldLeftRef.current = Math.max(0, peakHoldLeftRef.current - 0.025);
          }
        }

        // Peak Hold logic Right
        if (smoothRightRef.current >= peakHoldRightRef.current) {
          peakHoldRightRef.current = smoothRightRef.current;
          peakHoldDecayTimerRRef.current = 18;
        } else {
          if (peakHoldDecayTimerRRef.current > 0) {
            peakHoldDecayTimerRRef.current -= 1;
          } else {
            peakHoldRightRef.current = Math.max(0, peakHoldRightRef.current - 0.025);
          }
        }

        setLevels({
          left: smoothLeftRef.current,
          right: smoothRightRef.current,
          peakL: peakHoldLeftRef.current,
          peakR: peakHoldRightRef.current,
        });
      } else {
        // Smoothly decay to zero when stopped
        smoothLeftRef.current = Math.max(0, smoothLeftRef.current * 0.85);
        smoothRightRef.current = Math.max(0, smoothRightRef.current * 0.85);
        peakHoldLeftRef.current = Math.max(0, peakHoldLeftRef.current * 0.85);
        peakHoldRightRef.current = Math.max(0, peakHoldRightRef.current * 0.85);

        setLevels({
          left: smoothLeftRef.current,
          right: smoothRightRef.current,
          peakL: peakHoldLeftRef.current,
          peakR: peakHoldRightRef.current,
        });
      }

      rafRef.current = requestAnimationFrame(updateMeter);
    };

    rafRef.current = requestAnimationFrame(updateMeter);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const numSegments = SEGMENTS.length;
  const activeCountL = Math.round(levels.left * numSegments);
  const activeCountR = Math.round(levels.right * numSegments);
  const peakIndexL = Math.min(numSegments - 1, Math.floor(levels.peakL * numSegments));
  const peakIndexR = Math.min(numSegments - 1, Math.floor(levels.peakR * numSegments));

  return (
    <div
      id="technics-stereo-vu-meter"
      className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-950/95 border border-amber-500/40 shadow-inner select-none ${className}`}
      style={{
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9), 0 2px 5px rgba(0,0,0,0.6), 0 0 0 1px rgba(217, 119, 6, 0.25)',
      }}
      title="Technics Dual Master Output Peak LED VU Meters"
    >
      {/* Precision Metallic Bezel Corner Rivets */}
      <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-amber-600/70 border border-amber-300/40 pointer-events-none" />

      {/* Meter Header / Scale Label */}
      <div className="flex flex-col items-center justify-center pr-1 border-r border-amber-500/30">
        <span className="text-[7.5px] font-mono font-bold tracking-widest text-amber-400/90 leading-tight">
          VU
        </span>
        <span className="text-[6px] font-mono text-neutral-400 leading-tight">
          dB
        </span>
      </div>

      {/* Dual Channel Ladder Container */}
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Left Channel Bar */}
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] font-mono font-bold text-amber-300/90 w-2.5 text-center">
            L
          </span>
          <div className="flex items-center gap-[2.5px] flex-1">
            {SEGMENTS.map((seg, idx) => {
              const isActive = idx < activeCountL;
              const isPeak = idx === peakIndexL && levels.peakL > 0.08;
              const isLit = isActive || isPeak;

              return (
                <div
                  key={`L-${idx}`}
                  className="relative flex-1 h-2 sm:h-2.5 rounded-[1.5px] transition-all duration-75"
                  style={{
                    backgroundColor: isLit
                      ? undefined
                      : 'rgba(30, 30, 35, 0.95)',
                    boxShadow: isLit ? seg.activeGlow : 'none',
                    opacity: isLit ? 1 : 0.28,
                  }}
                >
                  <div
                    className={`w-full h-full rounded-[1.5px] ${
                      isLit ? seg.color : 'bg-neutral-800'
                    }`}
                  />
                  {/* Glass segment gloss reflection */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-[1.5px] pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Channel Bar */}
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] font-mono font-bold text-amber-300/90 w-2.5 text-center">
            R
          </span>
          <div className="flex items-center gap-[2.5px] flex-1">
            {SEGMENTS.map((seg, idx) => {
              const isActive = idx < activeCountR;
              const isPeak = idx === peakIndexR && levels.peakR > 0.08;
              const isLit = isActive || isPeak;

              return (
                <div
                  key={`R-${idx}`}
                  className="relative flex-1 h-2 sm:h-2.5 rounded-[1.5px] transition-all duration-75"
                  style={{
                    backgroundColor: isLit
                      ? undefined
                      : 'rgba(30, 30, 35, 0.95)',
                    boxShadow: isLit ? seg.activeGlow : 'none',
                    opacity: isLit ? 1 : 0.28,
                  }}
                >
                  <div
                    className={`w-full h-full rounded-[1.5px] ${
                      isLit ? seg.color : 'bg-neutral-800'
                    }`}
                  />
                  {/* Glass segment gloss reflection */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-[1.5px] pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Peak Indicator LED / Clip Warning */}
      <div className="flex flex-col items-center justify-center pl-1 border-l border-amber-500/30">
        <div
          className={`w-2 h-2 rounded-full transition-all duration-100 ${
            levels.peakL >= 0.92 || levels.peakR >= 0.92
              ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              : 'bg-red-950/70 border border-red-800/40'
          }`}
          title="Peak Limit / Clip Indicator"
        />
        <span className="text-[6px] font-mono text-red-400 font-bold mt-0.5">
          PEAK
        </span>
      </div>
    </div>
  );
};
