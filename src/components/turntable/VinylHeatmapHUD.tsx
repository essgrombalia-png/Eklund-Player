import React, { useEffect, useState, useRef } from 'react';
import { Flame, Sparkles, Sliders, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { HeatmapPalette } from './VinylHeatmapOverlay';

interface VinylHeatmapHUDProps {
  isOpen: boolean;
  onClose: () => void;
  palette: HeatmapPalette;
  onPaletteChange: (palette: HeatmapPalette) => void;
  intensity: number;
  onIntensityChange: (val: number) => void;
  isPlaying: boolean;
}

export const VinylHeatmapHUD: React.FC<VinylHeatmapHUDProps> = ({
  isOpen,
  onClose,
  palette,
  onPaletteChange,
  intensity,
  onIntensityChange,
  isPlaying,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [freqLevels, setFreqLevels] = useState({
    sub: 0,
    bass: 0,
    mids: 0,
    highs: 0,
    peak: 0,
  });

  const bufferRef = useRef(new Uint8Array(256));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let lastUpdate = 0;
    const updateLevels = (time: number) => {
      if (time - lastUpdate > 50) { // 20 FPS UI update is smooth and lightweight
        lastUpdate = time;
        if (isPlaying) {
          audioEngine.getFrequencyData(bufferRef.current);
          const buf = bufferRef.current;

          // Sub-bass: bins 1-6 (20-60Hz)
          let subSum = 0;
          for (let i = 1; i <= 6; i++) subSum += buf[i];
          const sub = Math.min(100, Math.round((subSum / (6 * 255)) * 100));

          // Bass: bins 7-25 (60-250Hz)
          let bassSum = 0;
          for (let i = 7; i <= 25; i++) bassSum += buf[i];
          const bass = Math.min(100, Math.round((bassSum / (19 * 255)) * 100));

          // Mids: bins 26-110 (250-4000Hz)
          let midSum = 0;
          for (let i = 26; i <= 110; i++) midSum += buf[i];
          const mids = Math.min(100, Math.round((midSum / (85 * 255)) * 100));

          // Highs: bins 111-200 (4-16kHz)
          let highSum = 0;
          for (let i = 111; i <= 200; i++) highSum += buf[i];
          const highs = Math.min(100, Math.round((highSum / (90 * 255)) * 100));

          const peak = Math.max(sub, bass, mids, highs);

          setFreqLevels({ sub, bass, mids, highs, peak });
        } else {
          setFreqLevels((prev) => ({
            sub: Math.max(0, Math.round(prev.sub * 0.8)),
            bass: Math.max(0, Math.round(prev.bass * 0.8)),
            mids: Math.max(0, Math.round(prev.mids * 0.8)),
            highs: Math.max(0, Math.round(prev.highs * 0.8)),
            peak: Math.max(0, Math.round(prev.peak * 0.8)),
          }));
        }
      }
      rafRef.current = requestAnimationFrame(updateLevels);
    };

    rafRef.current = requestAnimationFrame(updateLevels);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const palettesList: { id: HeatmapPalette; label: string; gradient: string }[] = [
    {
      id: 'thermal',
      label: 'Thermal FLIR',
      gradient: 'from-purple-950 via-red-600 via-amber-500 to-yellow-200',
    },
    {
      id: 'plasma',
      label: 'Neon Plasma',
      gradient: 'from-indigo-950 via-purple-600 via-pink-500 to-cyan-300',
    },
    {
      id: 'viridis',
      label: 'Acoustic Viridis',
      gradient: 'from-purple-950 via-emerald-600 to-yellow-300',
    },
    {
      id: 'cyberpunk',
      label: 'Cyberpunk Glow',
      gradient: 'from-neutral-950 via-pink-600 via-cyan-400 to-yellow-300',
    },
  ];

  return (
    <div
      id="vinyl-heatmap-hud"
      className="absolute top-12 left-3 sm:left-4 z-40 bg-neutral-950/92 backdrop-blur-xl border border-amber-500/50 rounded-2xl shadow-2xl p-3 sm:p-3.5 max-w-[270px] sm:max-w-[310px] w-full text-white select-none transition-all duration-300"
      style={{
        boxShadow: '0 12px 36px rgba(0,0,0,0.9), 0 0 16px rgba(245,158,11,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-600 to-red-500 flex items-center justify-center shadow-sm">
            <Flame className="w-3 h-3 text-white animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              Vinyl Heatmap
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>
            <div className="text-[8.5px] font-mono text-neutral-400">
              Rotational Energy Distribution
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 active:scale-95 transition-all cursor-pointer border border-white/5"
            title={isMinimized ? 'Expand HUD' : 'Minimize HUD'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 active:scale-95 transition-all cursor-pointer border border-white/5"
            title="Close Heatmap HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="mt-2.5 space-y-2.5">
          {/* Live Frequency Energy Distribution Bars */}
          <div className="bg-neutral-900/90 rounded-xl p-2.5 border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              <span>Band Energy Spectrum</span>
              <span className="text-amber-400 font-bold">PEAK {freqLevels.peak}%</span>
            </div>

            {/* Sub Bass */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-mono text-neutral-300">
                <span className="text-purple-400">SUB (20-60Hz)</span>
                <span>{freqLevels.sub}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-75"
                  style={{ width: `${freqLevels.sub}%` }}
                />
              </div>
            </div>

            {/* Bass */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-mono text-neutral-300">
                <span className="text-red-400">BASS (60-250Hz)</span>
                <span>{freqLevels.bass}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-75"
                  style={{ width: `${freqLevels.bass}%` }}
                />
              </div>
            </div>

            {/* Mids */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-mono text-neutral-300">
                <span className="text-amber-400">MIDS (250-4kHz)</span>
                <span>{freqLevels.mids}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-75"
                  style={{ width: `${freqLevels.mids}%` }}
                />
              </div>
            </div>

            {/* Highs */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-mono text-neutral-300">
                <span className="text-cyan-400">HIGHS (4-16kHz)</span>
                <span>{freqLevels.highs}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-white rounded-full transition-all duration-75"
                  style={{ width: `${freqLevels.highs}%` }}
                />
              </div>
            </div>
          </div>

          {/* Palette Selector */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              Thermal Colormap Palette
            </div>
            <div className="grid grid-cols-2 gap-2">
              {palettesList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPaletteChange(item.id)}
                  className={`p-2 rounded-xl border text-left flex flex-col gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm ${
                    palette === item.id
                      ? 'border-amber-400 bg-neutral-900 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'border-white/5 bg-neutral-900/60 hover:bg-neutral-850 hover:border-white/10 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-white tracking-wide">
                      {item.label}
                    </span>
                    {palette === item.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-300 shadow-[0_0_6px_#fbbf24]" />
                    )}
                  </div>
                  <div className={`w-full h-2 rounded-full bg-gradient-to-r ${item.gradient} ring-1 ring-black/30`} />
                </button>
              ))}
            </div>
          </div>

          {/* Thermal Intensity Slider */}
          <div className="space-y-1 bg-neutral-900/80 rounded-xl p-2 border border-neutral-800">
            <div className="flex items-center justify-between text-[9px] font-mono text-neutral-300">
              <span className="flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5 text-amber-400" /> Glow Intensity
              </span>
              <span className="font-bold text-amber-400">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={intensity}
              onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
