import { useEffect, useRef } from 'react';
import { VisualizerMode } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface AudioVisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  accentColor?: string;
  height?: number;
  className?: string;
  onBassEnergy?: (energy: number) => void;
}

export const AudioVisualizer = ({
  mode,
  isPlaying,
  accentColor = '#06b6d4',
  height = 140,
  className = '',
  onBassEnergy,
}: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const peakHoldRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer arrays for audio data
    const freqData = new Uint8Array(256);
    const timeData = new Uint8Array(256);

    let lastBassReport = 0;

    const render = (time: number) => {
      // Handle canvas resolution
      const width = canvas.clientWidth;
      const h = canvas.clientHeight || height;
      if (canvas.width !== width || canvas.height !== h) {
        canvas.width = width;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, width, h);

      if (isPlaying) {
        audioEngine.getFrequencyData(freqData);
        audioEngine.getTimeDomainData(timeData);
      } else {
        freqData.fill(0);
        timeData.fill(128);
      }

      // Calculate bass energy for reactive effects (lowest 8 frequency bins)
      let bassSum = 0;
      for (let i = 0; i < 8; i++) {
        bassSum += freqData[i];
      }
      const bassEnergy = isPlaying ? (bassSum / (8 * 255)) : 0;
      if (onBassEnergy && time - lastBassReport > 60) {
        onBassEnergy(bassEnergy);
        lastBassReport = time;
      }

      // Render according to selected mode
      switch (mode) {
        case 'bars': {
          const numBars = 48;
          const barSpacing = 4;
          const totalSpacing = (numBars - 1) * barSpacing;
          const barWidth = Math.max(2, (width - totalSpacing) / numBars);

          if (peaksRef.current.length !== numBars) {
            peaksRef.current = new Array(numBars).fill(0);
            peakHoldRef.current = new Array(numBars).fill(0);
          }

          for (let i = 0; i < numBars; i++) {
            // Logarithmic mapping across frequency spectrum
            const freqIndex = Math.floor(Math.pow(i / numBars, 1.4) * (freqData.length - 1));
            const val = freqData[freqIndex] || 0;
            const barHeight = isPlaying ? Math.max(3, (val / 255) * (h - 10)) : 2;

            const x = i * (barWidth + barSpacing);
            const y = h - barHeight;

            // Bar Gradient
            const gradient = ctx.createLinearGradient(0, h, 0, y);
            gradient.addColorStop(0, `${accentColor}33`);
            gradient.addColorStop(0.6, accentColor);
            gradient.addColorStop(1, '#ffffff');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();

            // Peak tracking with gravity drop
            if (barHeight > peaksRef.current[i]) {
              peaksRef.current[i] = barHeight;
              peakHoldRef.current[i] = 12; // hold frames
            } else {
              if (peakHoldRef.current[i] > 0) {
                peakHoldRef.current[i]--;
              } else {
                peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.5);
              }
            }

            // Draw floating peak caps
            if (peaksRef.current[i] > 4) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = accentColor;
              ctx.shadowBlur = 6;
              ctx.fillRect(x, h - peaksRef.current[i] - 2, barWidth, 2);
              ctx.shadowBlur = 0;
            }
          }
          break;
        }

        case 'circular': {
          const centerX = width / 2;
          const centerY = h / 2;
          const radius = Math.min(centerX, centerY) * 0.45;
          const numRays = 64;

          ctx.save();
          ctx.translate(centerX, centerY);

          for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const freqIndex = Math.floor((i / numRays) * (freqData.length / 2));
            const val = freqData[freqIndex] || 0;
            const rayLen = isPlaying ? (val / 255) * (radius * 0.9) : 2;

            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle) * (radius + rayLen);
            const y2 = Math.sin(angle) * (radius + rayLen);

            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 4;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }

          // Inner ring
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          break;
        }

        case 'waveform': {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = accentColor;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();

          const sliceWidth = width / timeData.length;
          let x = 0;

          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0; // 0 to 2
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        }

        case 'oscilloscope': {
          // Lissajous / XY Laser aesthetic
          const centerX = width / 2;
          const centerY = h / 2;
          const maxRadius = Math.min(centerX, centerY) * 0.8;

          ctx.lineWidth = 1.8;
          ctx.strokeStyle = '#22d3ee';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
          ctx.beginPath();

          const points = Math.min(128, timeData.length);
          for (let i = 0; i < points; i++) {
            const val1 = (timeData[i] - 128) / 128;
            const val2 = (timeData[(i + 32) % points] - 128) / 128;

            const px = centerX + val1 * maxRadius;
            const py = centerY + val2 * maxRadius;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        }

        case 'minimal': {
          // Ambient breathing line
          ctx.beginPath();
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          const centerY = h / 2;
          const step = width / 32;

          ctx.moveTo(0, centerY);
          for (let i = 0; i < 32; i++) {
            const val = isPlaying ? (freqData[i * 4] / 255) * (h * 0.35) : 0;
            const waveY = centerY + (i % 2 === 0 ? val : -val);
            ctx.lineTo(i * step, waveY);
          }
          ctx.lineTo(width, centerY);
          ctx.stroke();
          break;
        }

        case 'vinyl-reactive': {
          // Concentric radiating ripples
          const cx = width / 2;
          const cy = h / 2;
          const maxR = Math.min(cx, cy) * 0.9;
          const bands = [0, 4, 12, 24, 48];

          bands.forEach((bandIndex, idx) => {
            const val = isPlaying ? (freqData[bandIndex] / 255) : 0;
            const r = (maxR * (idx + 1)) / (bands.length + 0.5) + val * 15;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(2, r), 0, Math.PI * 2);
            ctx.strokeStyle = `${accentColor}${Math.floor((0.2 + val * 0.7) * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1.5 + val * 3;
            ctx.stroke();
          });
          break;
        }

        case 'vinyl-heatmap': {
          // Full-featured spinning vinyl record with radial & angular frequency heatmap
          const cx = width / 2;
          const cy = h / 2;
          const maxR = Math.min(cx, cy) * 0.92;
          const rInner = maxR * 0.35;
          const grooveSpan = maxR - rInner;

          // Background vinyl platter body
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
          ctx.fillStyle = '#0a0a0f';
          ctx.fill();
          ctx.strokeStyle = '#262626';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Subtle physical microgrooves
          for (let g = 0; g < 12; g++) {
            const gr = rInner + (g / 11) * grooveSpan;
            ctx.beginPath();
            ctx.arc(cx, cy, gr, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Concentric Frequency Heatmap Rings (32 bands)
          const NUM_RINGS = 32;
          for (let r = 0; r < NUM_RINGS; r++) {
            const fraction = r / (NUM_RINGS - 1);
            const bin = Math.min(255, Math.floor(Math.pow(fraction, 1.6) * 190));
            const energy = isPlaying ? Math.min(1, (freqData[bin] || 0) / 255) : 0;

            if (energy <= 0.03) continue;

            const radius = rInner + fraction * grooveSpan;

            // Thermal color stops: purple (low) -> crimson -> solar orange -> electric yellow -> white
            let rC = 120, gC = 20, bC = 140;
            if (energy < 0.3) {
              const t = energy / 0.3;
              rC = Math.round(70 + 80 * t);
              gC = Math.round(10 + 20 * t);
              bC = Math.round(120 + 30 * t);
            } else if (energy < 0.6) {
              const t = (energy - 0.3) / 0.3;
              rC = Math.round(150 + 85 * t);
              gC = Math.round(30 + 60 * t);
              bC = Math.round(150 * (1 - t));
            } else if (energy < 0.85) {
              const t = (energy - 0.6) / 0.25;
              rC = Math.round(235 + 20 * t);
              gC = Math.round(90 + 115 * t);
              bC = Math.round(20 * t);
            } else {
              const t = (energy - 0.85) / 0.15;
              rC = 255;
              gC = Math.round(205 + 50 * t);
              bC = Math.round(20 + 235 * t);
            }

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rC}, ${gC}, ${bC}, ${(0.25 + energy * 0.7).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.5, 1.2 + energy * 4.5);
            ctx.stroke();
          }

          // Rotating angular spectral flare (spins continuously)
          const rot = (time * 0.0018) % (Math.PI * 2);
          const NUM_SLICES = 48;
          for (let s = 0; s < NUM_SLICES; s++) {
            const angle = rot + (s * Math.PI * 2) / NUM_SLICES;
            const bin = (s * 4) % 180;
            const energy = isPlaying ? (freqData[bin] || 0) / 255 : 0;
            if (energy > 0.15) {
              const len = rInner + energy * grooveSpan;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
              ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
              ctx.strokeStyle = `rgba(245, 158, 11, ${(energy * 0.5).toFixed(3)})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }

          // Center spindle label disc
          const labelGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rInner);
          labelGrad.addColorStop(0, '#1c1917');
          labelGrad.addColorStop(0.7, '#292524');
          labelGrad.addColorStop(1, '#0c0a09');
          ctx.beginPath();
          ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
          ctx.fillStyle = labelGrad;
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Spindle brass hub
          ctx.beginPath();
          ctx.arc(cx, cy, rInner * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, rInner * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = '#171717';
          ctx.fill();

          ctx.restore();
          break;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, isPlaying, accentColor, height, onBassEnergy]);

  return (
    <div className={`relative w-full overflow-hidden flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
