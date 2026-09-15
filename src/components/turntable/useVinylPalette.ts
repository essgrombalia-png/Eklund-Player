import { useState, useEffect, useMemo } from 'react';
import { MediaItem } from '../../types';

export interface VinylSongPalette {
  primary: string; // e.g. '#06b6d4'
  primaryRgb: [number, number, number];
  secondary: string; // e.g. '#3b82f6'
  secondaryRgb: [number, number, number];
  highlight: string; // specular highlight tone with high luminosity
  highlightRgb: [number, number, number];
  ambientRgba: (alpha?: number) => string;
  glowRgba: (alpha?: number) => string;
  secondaryRgba: (alpha?: number) => string;
  label: string;
}

// Convert hex to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? 6 : r, isNaN(g) ? 182 : g, isNaN(b) ? 212 : b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [isNaN(r) ? 6 : r, isNaN(g) ? 182 : g, isNaN(b) ? 212 : b];
  }
  return [6, 182, 212];
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (h >= 0 && h < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

// Generate palette structure from an RGB base
function buildPaletteFromRgb(
  r: number,
  g: number,
  b: number,
  labelName = 'Dynamic'
): VinylSongPalette {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Secondary tone shifted 35 degrees on color wheel with boosted vibrancy
  const secH = (h + 35) % 360;
  const secS = Math.min(100, Math.max(50, s));
  const secL = Math.min(65, Math.max(35, l));
  const [secR, secG, secB] = hslToRgb(secH, secS, secL);

  // Highlight specular tone: high lightness, high saturation
  const hlS = Math.max(30, s * 0.7);
  const hlL = Math.min(94, Math.max(82, l + 30));
  const [hlR, hlG, hlB] = hslToRgb(h, hlS, hlL);

  return {
    primary: rgbToHex(r, g, b),
    primaryRgb: [r, g, b],
    secondary: rgbToHex(secR, secG, secB),
    secondaryRgb: [secR, secG, secB],
    highlight: rgbToHex(hlR, hlG, hlB),
    highlightRgb: [hlR, hlG, hlB],
    ambientRgba: (alpha = 0.2) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
    glowRgba: (alpha = 0.5) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
    secondaryRgba: (alpha = 0.25) => `rgba(${secR}, ${secG}, ${secB}, ${alpha})`,
    label: labelName,
  };
}

// Known preset palettes based on genres or moods
const GENRE_PALETTES: Record<string, [number, number, number]> = {
  synth: [6, 182, 212], // Neon Cyan
  cyber: [236, 72, 153], // Neon Pink
  jazz: [245, 158, 11], // Warm Amber
  classic: [129, 140, 248], // Nocturne Indigo
  ambient: [52, 211, 153], // Mint Emerald
  rock: [239, 68, 68], // Crimson Red
};

export function useVinylPalette(
  track: MediaItem | null,
  overrideAccent?: string
): VinylSongPalette {
  const [extractedRgb, setExtractedRgb] = useState<[number, number, number] | null>(
    null
  );

  // Dynamic Image Color Extraction with CORS safety
  useEffect(() => {
    if (!track?.artwork) {
      setExtractedRgb(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downsample for rapid histogram analysis
        const sampleSize = 32;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        let totalWeight = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;

        // Extract vibrant, chromatic pixels (filter out dull blacks/whites)
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = max / 255;

          // Weight colorful, moderately bright pixels highest
          if (saturation > 0.18 && brightness > 0.15 && brightness < 0.92) {
            const weight = saturation * brightness * 1.5;
            rSum += r * weight;
            gSum += g * weight;
            bSum += b * weight;
            totalWeight += weight;
          }
        }

        if (totalWeight > 0) {
          const avgR = Math.round(rSum / totalWeight);
          const avgG = Math.round(gSum / totalWeight);
          const avgB = Math.round(bSum / totalWeight);
          setExtractedRgb([avgR, avgG, avgB]);
        } else {
          setExtractedRgb(null);
        }
      } catch (err) {
        // In case of CORS or canvas restrictions, fallback seamlessly
        setExtractedRgb(null);
      }
    };

    img.onerror = () => {
      if (isMounted) setExtractedRgb(null);
    };

    img.src = track.artwork;

    return () => {
      isMounted = false;
    };
  }, [track?.artwork]);

  // Compute final palette
  return useMemo(() => {
    // 1. If user passed an explicit override accent
    if (overrideAccent && overrideAccent.startsWith('#')) {
      const rgb = hexToRgb(overrideAccent);
      return buildPaletteFromRgb(rgb[0], rgb[1], rgb[2], 'Custom Accent');
    }

    // 2. If track has defined colorAccent in metadata
    if (track?.colorAccent && track.colorAccent.startsWith('#')) {
      const rgb = hexToRgb(track.colorAccent);
      return buildPaletteFromRgb(rgb[0], rgb[1], rgb[2], track.genre || 'Song Palette');
    }

    // 3. If image extraction succeeded
    if (extractedRgb) {
      return buildPaletteFromRgb(
        extractedRgb[0],
        extractedRgb[1],
        extractedRgb[2],
        'Extracted Palette'
      );
    }

    // 4. Genre matching fallback
    if (track?.genre) {
      const gLower = track.genre.toLowerCase();
      for (const [key, rgb] of Object.entries(GENRE_PALETTES)) {
        if (gLower.includes(key)) {
          return buildPaletteFromRgb(rgb[0], rgb[1], rgb[2], track.genre);
        }
      }
    }

    // 5. Default high-fidelity cyan
    return buildPaletteFromRgb(6, 182, 212, 'Hi-Fi Cyan');
  }, [track, overrideAccent, extractedRgb]);
}
