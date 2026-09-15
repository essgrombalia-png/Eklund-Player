import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../services/audioEngine';

export type HeatmapPalette = 'thermal' | 'plasma' | 'viridis' | 'cyberpunk';

interface VinylHeatmapOverlayProps {
  isPlaying: boolean;
  progress?: number; // 0.0 to 1.0 (needle position across vinyl grooves)
  palette?: HeatmapPalette;
  intensity?: number; // 0.2 to 1.0
  blendMode?: 'screen' | 'color-dodge' | 'lighter';
  className?: string;
  enableStylusBloom?: boolean;
}

// Color lookup table helpers for 60fps canvas performance
interface ColorStop {
  stop: number;
  r: number;
  g: number;
  b: number;
}

const PALETTES: Record<HeatmapPalette, ColorStop[]> = {
  thermal: [
    { stop: 0.0, r: 10, g: 8, b: 24 },       // Deep dark violet-black (silence)
    { stop: 0.2, r: 88, g: 15, b: 120 },     // Deep purple
    { stop: 0.4, r: 185, g: 28, b: 28 },     // Crimson red
    { stop: 0.65, r: 234, g: 88, b: 12 },    // Fiery orange
    { stop: 0.85, r: 250, g: 204, b: 21 },   // Solar yellow
    { stop: 1.0, r: 255, g: 255, b: 255 },   // White-hot peak
  ],
  plasma: [
    { stop: 0.0, r: 13, g: 8, b: 38 },       // Obsidian
    { stop: 0.25, r: 107, g: 33, b: 168 },   // Deep violet
    { stop: 0.5, r: 219, g: 39, b: 119 },    // Neon magenta
    { stop: 0.75, r: 6, g: 182, b: 212 },    // Cyan
    { stop: 0.92, r: 165, g: 243, b: 252 },  // Electric pale cyan
    { stop: 1.0, r: 255, g: 255, b: 255 },   // White
  ],
  viridis: [
    { stop: 0.0, r: 68, g: 1, b: 84 },       // Deep violet
    { stop: 0.25, r: 59, g: 82, b: 139 },    // Indigo blue
    { stop: 0.5, r: 33, g: 145, b: 140 },    // Teal
    { stop: 0.75, r: 94, g: 201, b: 98 },    // Green emerald
    { stop: 0.9, r: 253, g: 231, b: 37 },    // Vivid yellow
    { stop: 1.0, r: 255, g: 255, b: 255 },   // Highlight
  ],
  cyberpunk: [
    { stop: 0.0, r: 8, g: 10, b: 26 },       // Cyber black
    { stop: 0.25, r: 244, g: 63, b: 94 },    // Hot neon pink
    { stop: 0.55, r: 168, g: 85, b: 247 },   // Cyber purple
    { stop: 0.78, r: 34, g: 211, b: 238 },   // Acid cyan
    { stop: 0.92, r: 250, g: 204, b: 21 },   // Neon yellow
    { stop: 1.0, r: 255, g: 255, b: 255 },   // Laser white
  ],
};

// Pre-computed 256-entry RGB lookup table for lightning-fast per-pixel and per-ring coloring
function createColorLut(palette: HeatmapPalette): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  const stops = PALETTES[palette];

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // Find surrounding stops
    let low = stops[0];
    let high = stops[stops.length - 1];

    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].stop && t <= stops[s + 1].stop) {
        low = stops[s];
        high = stops[s + 1];
        break;
      }
    }

    const range = high.stop - low.stop || 1;
    const factor = Math.max(0, Math.min(1, (t - low.stop) / range));

    lut[i * 3 + 0] = Math.round(low.r + (high.r - low.r) * factor);
    lut[i * 3 + 1] = Math.round(low.g + (high.g - low.g) * factor);
    lut[i * 3 + 2] = Math.round(low.b + (high.b - low.b) * factor);
  }

  return lut;
}

export const VinylHeatmapOverlay: React.FC<VinylHeatmapOverlayProps> = ({
  isPlaying,
  progress = 0,
  palette = 'thermal',
  intensity = 0.85,
  blendMode = 'screen',
  className = '',
  enableStylusBloom = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const activePalette: HeatmapPalette = (palette as HeatmapPalette) in PALETTES ? (palette as HeatmapPalette) : 'thermal';

  // Cached LUT table for current palette
  const lutRef = useRef<Uint8ClampedArray>(createColorLut(activePalette));
  useEffect(() => {
    lutRef.current = createColorLut(activePalette);
  }, [activePalette]);

  // Audio frequency data buffer (256 frequency bins)
  const freqDataRef = useRef(new Uint8Array(256));
  // Smoothed frequency energy bins to prevent harsh stepping
  const smoothedFreqRef = useRef(new Float32Array(256));

  // Angular history slices buffer: records thermal energy as vinyl spins past needle
  const SLICE_COUNT = 180; // 2-degree sectors around the 360-degree vinyl platter
  const historySlicesRef = useRef<Float32Array[]>(
    Array.from({ length: SLICE_COUNT }, () => new Float32Array(32))
  );
  const currentSliceIndexRef = useRef(0);
  const lastSliceTimeRef = useRef(0);

  // Stylus shockwave ripple phase
  const ripplePhaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const render = (timestamp: number) => {
      // Auto-adapt canvas dimensions to parent element size with DPR cap at 2 for performance
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.round(rect.width);
      const targetH = Math.round(rect.height);

      if (targetW > 0 && targetH > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scaledW = Math.round(targetW * dpr);
        const scaledH = Math.round(targetH * dpr);

        if (canvas.width !== scaledW || canvas.height !== scaledH) {
          canvas.width = scaledW;
          canvas.height = scaledH;
          width = scaledW;
          height = scaledH;
        }
      }

      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Acquire latest frequency domain data from Web Audio Analyser
      const rawFreq = freqDataRef.current;
      if (isPlaying) {
        audioEngine.getFrequencyData(rawFreq);
      } else {
        // Slowly decay when paused
        for (let i = 0; i < rawFreq.length; i++) {
          rawFreq[i] = Math.max(0, Math.floor(rawFreq[i] * 0.92));
        }
      }

      // Exponential smoothing for visual elegance
      const smoothed = smoothedFreqRef.current;
      const smoothFactor = isPlaying ? 0.28 : 0.08;
      for (let i = 0; i < rawFreq.length; i++) {
        smoothed[i] += (rawFreq[i] - smoothed[i]) * smoothFactor;
      }

      // Center and vinyl radial boundaries
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(cx, cy);

      // The vinyl music playback groove zone:
      // Outer lead-in radius is ~94% of platter
      // Inner run-out radius is ~36% of platter (just outside 80% label artwork edge or center hub)
      const rOuter = maxR * 0.94;
      const rInner = maxR * 0.36;
      const grooveSpan = rOuter - rInner;

      const lut = lutRef.current;

      // Update angular history sector buffer (~60 times per second or synced with rotation)
      if (isPlaying && timestamp - lastSliceTimeRef.current > 16) {
        lastSliceTimeRef.current = timestamp;
        const currentSlice = historySlicesRef.current[currentSliceIndexRef.current];

        // Compress 256 frequency bins into 32 perceptual radial bands (logarithmic grouping)
        for (let band = 0; band < 32; band++) {
          const startBin = Math.floor(Math.pow(band / 32, 1.6) * 180);
          const endBin = Math.max(startBin + 1, Math.floor(Math.pow((band + 1) / 32, 1.6) * 180));
          let sum = 0;
          let count = 0;
          for (let b = startBin; b < endBin && b < 256; b++) {
            sum += smoothed[b];
            count++;
          }
          currentSlice[band] = count > 0 ? sum / (count * 255) : 0;
        }

        currentSliceIndexRef.current = (currentSliceIndexRef.current + 1) % SLICE_COUNT;
      }

      ctx.save();
      ctx.globalCompositeOperation = blendMode;

      // =========================================================================
      // 1. CONCENTRIC THERMAL FREQUENCY GROOVE RINGS
      // Maps frequency energy from low bass (inner tracks) to crisp treble (outer tracks)
      // =========================================================================
      const NUM_RINGS = 36;
      for (let r = 0; r < NUM_RINGS; r++) {
        const ringFraction = r / (NUM_RINGS - 1);
        // Logarithmic frequency mapping: sub-bass at inner, air/treble at outer
        const binIndex = Math.min(255, Math.floor(Math.pow(ringFraction, 1.5) * 200));
        const energy = Math.min(1.0, (smoothed[binIndex] || 0) / 255);

        if (energy <= 0.02) continue;

        // Radius for this concentric frequency groove
        const radius = rInner + ringFraction * grooveSpan;
        const lutIdx = Math.min(255, Math.floor(energy * 255)) * 3;
        const red = lut[lutIdx];
        const green = lut[lutIdx + 1];
        const blue = lut[lutIdx + 2];

        const ringAlpha = (0.2 + energy * 0.75) * intensity;
        const ringThickness = Math.max(1.2, 1.0 + energy * 4.5);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${ringAlpha.toFixed(3)})`;
        ctx.lineWidth = ringThickness;
        ctx.stroke();

        // Extra specular glow for high-energy frequency spikes
        if (energy > 0.65) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(energy * 0.45 * intensity).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // =========================================================================
      // 2. ANGULAR THERMAL ENERGY SPECTROGRAM (Radial Sectors while spinning)
      // Visualizes frequency energy distribution as it sweeps across the vinyl surface
      // =========================================================================
      const sliceAngle = (Math.PI * 2) / SLICE_COUNT;
      const history = historySlicesRef.current;

      for (let s = 0; s < SLICE_COUNT; s++) {
        const sliceData = history[s];
        const startAngle = s * sliceAngle;
        const endAngle = startAngle + sliceAngle + 0.01;

        // Draw 8 radial gradient segments across this sector
        for (let seg = 0; seg < 16; seg++) {
          const bandIdx = seg * 2;
          const energy = sliceData[bandIdx] || 0;
          if (energy < 0.06) continue;

          const rStart = rInner + (seg / 16) * grooveSpan;
          const rEnd = rInner + ((seg + 1) / 16) * grooveSpan;

          const lutIdx = Math.min(255, Math.floor(energy * 255)) * 3;
          const red = lut[lutIdx];
          const green = lut[lutIdx + 1];
          const blue = lut[lutIdx + 2];

          const alpha = (energy * 0.42 * intensity).toFixed(3);

          ctx.beginPath();
          ctx.arc(cx, cy, rEnd, startAngle, endAngle);
          ctx.arc(cx, cy, rStart, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          ctx.fill();
        }
      }

      // =========================================================================
      // 3. STYLUS NEEDLE CONTACT BLOOM & PROPAGATING SHOCKWAVES
      // Realistic acoustic friction hotspot where the needle tracks the physical groove
      // =========================================================================
      if (enableStylusBloom) {
        // Calculate tracking radius based on playback progress
        // progress: 0 = outer lead-in (rOuter), 1 = inner run-out (rInner)
        const currentTrackingRadius = rOuter - Math.max(0, Math.min(1, progress)) * grooveSpan;

        // Needle excitation energy (weighted average of bass and mid presence)
        const bassLevel = smoothed[4] / 255;
        const midLevel = smoothed[32] / 255;
        const needleEnergy = Math.max(0.1, bassLevel * 0.7 + midLevel * 0.5);

        // Acoustic thermal bloom circle at tracking groove
        const lutIdx = Math.min(255, Math.floor(needleEnergy * 255)) * 3;
        const red = lut[lutIdx];
        const green = lut[lutIdx + 1];
        const blue = lut[lutIdx + 2];

        // Stylus contact ring highlight
        ctx.beginPath();
        ctx.arc(cx, cy, currentTrackingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${(0.4 + needleEnergy * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2.2 + needleEnergy * 3;
        ctx.stroke();

        // Radiating acoustic shockwave ripples expanding from current groove
        if (isPlaying) {
          ripplePhaseRef.current = (ripplePhaseRef.current + 0.05 + bassLevel * 0.08) % 1.0;
          const rippleRadius = currentTrackingRadius + (ripplePhaseRef.current - 0.5) * (grooveSpan * 0.22);

          if (rippleRadius >= rInner && rippleRadius <= rOuter) {
            const rippleAlpha = (1.0 - Math.abs(ripplePhaseRef.current - 0.5) * 2) * needleEnergy * 0.55 * intensity;
            ctx.beginPath();
            ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha.toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }
      }

      // =========================================================================
      // 4. SUB-BASS ACOUSTIC THERMAL CORE (Center Platter Ambient Radiance)
      // =========================================================================
      const subBassEnergy = (smoothed[1] + smoothed[2] + smoothed[3]) / (3 * 255);
      if (subBassEnergy > 0.25) {
        const coreGradient = ctx.createRadialGradient(
          cx,
          cy,
          rInner * 0.4,
          cx,
          cy,
          rOuter * 0.85
        );
        const lutIdx = Math.min(255, Math.floor(subBassEnergy * 255)) * 3;
        const rB = lut[lutIdx];
        const gB = lut[lutIdx + 1];
        const bB = lut[lutIdx + 2];

        coreGradient.addColorStop(0, `rgba(${rB}, ${gB}, ${bB}, 0.0)`);
        coreGradient.addColorStop(0.5, `rgba(${rB}, ${gB}, ${bB}, ${(subBassEnergy * 0.28 * intensity).toFixed(3)})`);
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, progress, palette, intensity, blendMode, enableStylusBloom]);

  return (
    <div className={`absolute inset-0 rounded-full overflow-hidden pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-full"
        style={{
          filter: 'contrast(1.15) brightness(1.1)',
        }}
      />
    </div>
  );
};
