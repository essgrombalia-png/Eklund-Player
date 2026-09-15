import React, { useEffect, useRef, useState, memo } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Activity, Radio, Volume2 } from 'lucide-react';

interface TurntableWaveformBarProps {
  isPlaying: boolean;
  accentColor?: string;
  className?: string;
  onExpandVisualizer?: () => void;
}

export const TurntableWaveformBar: React.FC<TurntableWaveformBarProps> = memo(
  ({ isPlaying, accentColor = '#f59e0b', className = '', onExpandVisualizer }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [peakDb, setPeakDb] = useState<string>('-24 dB');
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      // Audio buffers
      const timeData = new Uint8Array(256);
      const freqData = new Uint8Array(128);

      let lastDbUpdate = 0;

      const renderWaveform = (timestamp: number) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (width <= 0 || height <= 0) {
          rafRef.current = requestAnimationFrame(renderWaveform);
          return;
        }

        // Adjust canvas resolution for high-DPI displays (iPad Pro Liquid Retina, etc.)
        const targetWidth = Math.round(width * dpr);
        const targetHeight = Math.round(height * dpr);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        if (isPlaying) {
          audioEngine.getTimeDomainData(timeData);
          audioEngine.getFrequencyData(freqData);
        } else {
          timeData.fill(128);
          freqData.fill(0);
        }

        // Compute peak dB and bass energy for beat reactivity
        let sumSquares = 0;
        let bassSum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSquares += norm * norm;
          if (i < 8) bassSum += freqData[i];
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        const bassRatio = bassSum / (8 * 255);

        if (timestamp - lastDbUpdate > 120) {
          if (isPlaying && rms > 0.005) {
            const calculatedDb = Math.max(-48, Math.min(0, Math.round(20 * Math.log10(rms))));
            setPeakDb(`${calculatedDb > -1 ? '0 dB' : `${calculatedDb} dB`}`);
          } else {
            setPeakDb('IDLE');
          }
          lastDbUpdate = timestamp;
        }

        const centerY = height / 2;

        // 1. Draw subtle horizontal audio center datum line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // 2. Draw Reactive Minimalist Oscilloscope Wave
        const sliceWidth = width / (timeData.length - 1);

        // Ambient glow beneath the wave
        if (isPlaying && bassRatio > 0.05) {
          const glowGrad = ctx.createRadialGradient(
            width / 2,
            centerY,
            2,
            width / 2,
            centerY,
            Math.max(20, width * 0.4)
          );
          glowGrad.addColorStop(0, `rgba(245, 158, 11, ${Math.min(0.25, bassRatio * 0.35)})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // Main high-precision wave stroke
        ctx.beginPath();
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
          // Normalize from [0, 255] to [-1, 1]
          const sample = (timeData[i] - 128) / 128.0;
          // React smoothly to audio level and beat pulse
          const dynamicAmplitude = isPlaying
            ? (height * 0.44) * (1 + bassRatio * 0.3)
            : 0;
          const y = centerY + sample * dynamicAmplitude;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth bezier or direct segment
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        // Gradient styling
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        lineGrad.addColorStop(0.25, 'rgba(251, 191, 36, 0.85)');
        lineGrad.addColorStop(0.5, '#ffffff');
        lineGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.85)');
        lineGrad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = isPlaying ? 2.0 : 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (isPlaying) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8 + bassRatio * 10;
        }

        ctx.stroke();

        // 3. Draw second subtle harmonic line for studio depth
        if (isPlaying) {
          ctx.beginPath();
          x = 0;
          for (let i = 0; i < timeData.length; i++) {
            const freqSample = (freqData[i % freqData.length] / 255) * 0.5;
            const sample = ((timeData[i] - 128) / 128.0) * (1 - freqSample);
            const y = centerY - sample * (height * 0.28);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }

        ctx.restore();

        rafRef.current = requestAnimationFrame(renderWaveform);
      };

      rafRef.current = requestAnimationFrame(renderWaveform);

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, [isPlaying, accentColor]);

    return (
      <div
        id="turntable-waveform-visualizer-bar"
        className={`w-full max-w-[720px] rounded-xl bg-neutral-950/90 border border-amber-500/40 p-2 sm:p-2.5 shadow-xl select-none transition-all duration-200 ${className}`}
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 1px 2px rgba(251,191,36,0.25), 0 0 0 1px rgba(217, 119, 6, 0.2)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Hi-Res Audio Stream Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-neutral-900 border border-amber-500/60 shadow-inner">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-amber-300 uppercase leading-none">
                  Waveform Monitor
                </span>
                <span className="hidden sm:inline-block text-[7.5px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold leading-none">
                  DIRECT DRIVE
                </span>
              </div>
              <span className="text-[7.5px] sm:text-[8px] font-mono text-neutral-400 leading-tight mt-0.5">
                {isPlaying ? '96kHz • 24-bit PCM Stream' : 'Standby Mode'}
              </span>
            </div>
          </div>

          {/* Center: Reactive Oscilloscope Canvas */}
          <div
            ref={containerRef}
            className="flex-1 relative h-7 sm:h-8 rounded-md bg-neutral-950/80 border border-amber-500/20 overflow-hidden shadow-inner cursor-pointer"
            onClick={onExpandVisualizer}
            title="Real-time Reactive Waveform - Click to expand full visualizer"
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
            {isHovered && (
              <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] flex items-center justify-center transition-opacity pointer-events-none">
                <span className="text-[8px] font-mono font-bold text-amber-200 tracking-wider uppercase px-1.5 py-0.5 rounded bg-black/60 border border-amber-400/40">
                  Expand Visualizer
                </span>
              </div>
            )}
          </div>

          {/* Right: Peak Decibel Output & Waveform Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-400 leading-none">
                {peakDb}
              </span>
              <span className="text-[7.5px] font-mono text-neutral-400 leading-tight mt-0.5 uppercase">
                Peak Output
              </span>
            </div>

            <button
              onClick={onExpandVisualizer}
              className="p-1 sm:p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-all cursor-pointer focus:outline-none"
              title="Switch to Full Spectrum Visualizer"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

TurntableWaveformBar.displayName = 'TurntableWaveformBar';
