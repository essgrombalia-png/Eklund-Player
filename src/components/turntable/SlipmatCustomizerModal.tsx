import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Disc,
  Upload,
  Layers,
  RotateCw,
  Check,
  Info,
  Sliders,
  Palette,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { SlipmatDesign, SlipmatConfig, SlipmatMaterial, VinylDisplayMode } from '../../types';
import { SLIPMAT_DESIGNS, DEFAULT_SLIPMAT_CONFIG } from './slipmatData';
import { SlipmatRenderer } from './SlipmatRenderer';

interface SlipmatCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SlipmatConfig;
  onUpdateConfig: (newConfig: SlipmatConfig) => void;
  albumArtwork?: string;
  albumTitle?: string;
}

export const SlipmatCustomizerModal: React.FC<SlipmatCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  albumArtwork,
  albumTitle = 'Current Track',
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState<SlipmatMaterial | 'all'>('all');
  const [previewSpinning, setPreviewSpinning] = useState<boolean>(true);
  const [previewSpeed, setPreviewSpeed] = useState<33 | 45>(33);
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>(config.customImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const activeDesign =
    SLIPMAT_DESIGNS.find((d) => d.id === config.activeDesignId) || SLIPMAT_DESIGNS[0];

  const filteredDesigns =
    selectedMaterial === 'all'
      ? SLIPMAT_DESIGNS
      : SLIPMAT_DESIGNS.filter((d) => d.material === selectedMaterial);

  const handleSelectDesign = (design: SlipmatDesign) => {
    onUpdateConfig({
      ...config,
      activeDesignId: design.id,
    });
  };

  const handleVinylModeChange = (mode: VinylDisplayMode) => {
    onUpdateConfig({
      ...config,
      vinylDisplayMode: mode,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdateConfig({
          ...config,
          activeDesignId: 'custom-artist-mat',
          customImageUrl: dataUrl,
        });
        setCustomImageUrlInput(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (customImageUrlInput.trim()) {
      onUpdateConfig({
        ...config,
        activeDesignId: 'custom-artist-mat',
        customImageUrl: customImageUrlInput.trim(),
      });
    }
  };

  const handleResetDefaults = () => {
    onUpdateConfig(DEFAULT_SLIPMAT_CONFIG);
    setCustomImageUrlInput('');
  };

  const materials: { id: SlipmatMaterial | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All Styles', count: SLIPMAT_DESIGNS.length },
    { id: 'felt', label: 'Felt', count: SLIPMAT_DESIGNS.filter((d) => d.material === 'felt').length },
    { id: 'rubber', label: 'Heavy Rubber', count: SLIPMAT_DESIGNS.filter((d) => d.material === 'rubber').length },
    { id: 'cork', label: 'Organic Cork', count: SLIPMAT_DESIGNS.filter((d) => d.material === 'cork').length },
    { id: 'leather', label: 'Artisan Leather', count: SLIPMAT_DESIGNS.filter((d) => d.material === 'leather').length },
    { id: 'holographic', label: 'Holographic', count: SLIPMAT_DESIGNS.filter((d) => d.material === 'holographic').length },
    { id: 'custom', label: 'Custom', count: 1 },
  ];

  const vinylDisplayModes: { id: VinylDisplayMode; label: string; desc: string }[] = [
    {
      id: 'picture-disc',
      label: 'Picture Disc (80% Art)',
      desc: 'Full album artwork centered across the vinyl face',
    },
    {
      id: 'clear-crystal',
      label: 'Clear Crystal Vinyl',
      desc: 'Transparent audiophile vinyl showcasing your slipmat through clear grooves',
    },
    {
      id: 'smoke-translucent',
      label: 'Smoke Translucent',
      desc: 'Dark smoked acrylic record revealing the glowing slipmat beneath',
    },
    {
      id: 'classic-black',
      label: 'Classic 12" Black LP',
      desc: 'Deep black vinyl lacquer with compact 4" center label disc',
    },
    {
      id: 'bare-platter',
      label: 'Showcase Platter (No Vinyl)',
      desc: 'Record cued off the deck so your slipmat spins unobstructed',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Studio Modal Container */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-neutral-950 border border-amber-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden z-10"
        style={{
          boxShadow: '0 0 50px -10px rgba(223, 188, 96, 0.2), 0 25px 80px rgba(0,0,0,0.95)',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Slipmat & Deck Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  SL-1200GLD
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Swap turntable slipmat materials, textures, and custom patterns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-neutral-900 text-xs text-neutral-400 hover:text-white hover:border-white/20 transition cursor-pointer"
              title="Reset to factory Technics Gold Felt"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 bg-neutral-900 text-neutral-400 hover:text-white hover:border-white/20 transition cursor-pointer"
              title="Close Customizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: 2 Columns on Desktop */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto min-h-0">
          {/* ======================================================== */}
          {/* LEFT: LIVE 360° TURNTABLE PLATTER PREVIEW (5 cols)       */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-white/10 bg-neutral-950/60 flex flex-col items-center justify-between gap-5">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live Deck Platter
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewSpeed(33)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                    previewSpeed === 33
                      ? 'bg-amber-400 text-neutral-950 border-amber-300'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  33⅓
                </button>
                <button
                  onClick={() => setPreviewSpeed(45)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                    previewSpeed === 45
                      ? 'bg-amber-400 text-neutral-950 border-amber-300'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  45
                </button>
                <button
                  onClick={() => setPreviewSpinning(!previewSpinning)}
                  className={`p-1 rounded text-xs border transition ${
                    previewSpinning
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                  title={previewSpinning ? 'Pause rotation' : 'Spin platter'}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${previewSpinning ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Simulated Gold Technics Platter Well */}
            <div
              className="relative w-60 h-60 sm:w-72 sm:h-72 rounded-full p-2.5 flex items-center justify-center shadow-2xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #dfbc60 0%, #fae8af 25%, #be942f 50%, #f6deb4 75%, #b0811e 100%)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(223, 188, 96, 0.25)',
              }}
            >
              {/* Platter Inner Recess */}
              <div className="relative w-full h-full rounded-full bg-[#0a0a0e] border-2 border-amber-400/40 flex items-center justify-center overflow-hidden">
                {/* Rotating Slipmat Container */}
                <div
                  className={`relative w-[96%] aspect-square rounded-full transition-transform ${
                    previewSpinning
                      ? previewSpeed === 33
                        ? 'technics-vinyl-spinning'
                        : 'technics-vinyl-spinning-45'
                      : ''
                  }`}
                  style={{
                    animationDuration: `${previewSpeed === 33 ? '1.8s' : '1.33s'}`,
                  }}
                >
                  {/* The Slipmat Texture */}
                  <SlipmatRenderer design={activeDesign} config={config} showSpindle={false} />

                  {/* Optional Vinyl Overlay based on vinylDisplayMode */}
                  {config.vinylDisplayMode === 'picture-disc' && (
                    <div className="absolute inset-[10%] rounded-full overflow-hidden border border-amber-400/40 shadow-xl flex items-center justify-center pointer-events-none">
                      {albumArtwork ? (
                        <img
                          src={albumArtwork}
                          alt={albumTitle}
                          className="w-full h-full object-cover filter brightness-90 saturate-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-neutral-900 to-neutral-950 flex items-center justify-center text-[10px] text-amber-200">
                          {albumTitle}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full vinyl-grooves opacity-30" />
                    </div>
                  )}

                  {config.vinylDisplayMode === 'clear-crystal' && (
                    <div className="absolute inset-0 rounded-full pointer-events-none border border-cyan-400/40 shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]">
                      {/* Transparent glass-like grooves */}
                      <div className="absolute inset-0 rounded-full vinyl-grooves opacity-40 mix-blend-screen" />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/10 via-transparent to-white/20" />
                      <div className="absolute inset-[10%] rounded-full border border-cyan-300/30" />
                      <div className="absolute inset-[25%] rounded-full border border-cyan-300/20" />
                    </div>
                  )}

                  {config.vinylDisplayMode === 'smoke-translucent' && (
                    <div className="absolute inset-0 rounded-full pointer-events-none bg-neutral-950/70 backdrop-blur-[1px] border border-white/10">
                      <div className="absolute inset-0 rounded-full vinyl-grooves opacity-35" />
                    </div>
                  )}

                  {config.vinylDisplayMode === 'classic-black' && (
                    <div className="absolute inset-0 rounded-full pointer-events-none bg-[#0d0d12] shadow-inner">
                      <div className="absolute inset-0 rounded-full vinyl-grooves opacity-60" />
                      {/* 4" Center Label */}
                      <div className="absolute inset-[30%] rounded-full border-2 border-amber-400/80 bg-neutral-900 flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-[7px] font-serif font-black text-amber-400">EKLUND</span>
                        <span className="text-[6px] font-mono text-amber-200 truncate max-w-[60px]">{albumTitle}</span>
                      </div>
                    </div>
                  )}

                  {/* Center Spindle Bushing */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-30"
                    style={{
                      background: 'radial-gradient(circle, #fae6a6 0%, #dfbf66 50%, #9a6f15 100%)',
                      border: '1.5px solid rgba(251, 191, 36, 0.9)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.8)',
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0d0d11] border border-neutral-800" />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Design Telemetry Card */}
            <div className="w-full p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {activeDesign.name}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-mono font-medium">
                    {activeDesign.badgeLabel}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {activeDesign.material} • {activeDesign.thickness}
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {activeDesign.description}
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Acoustics: {activeDesign.acousticProfile}</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT: DESIGN PICKER, MATERIAL TABS & VINYL MODES (7 col)*/}
          {/* ======================================================== */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-5 overflow-y-auto">
            {/* 1. Material Filter Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                  Material & Style Category
                </span>
                <span className="text-xs text-neutral-500">
                  {filteredDesigns.length} designs available
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMaterial(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer border ${
                      selectedMaterial === m.id
                        ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                        : 'bg-neutral-900/80 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {m.label} ({m.count})
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Slipmat Designs Grid */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                Choose Slipmat
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDesigns.map((d) => {
                  const isSelected = config.activeDesignId === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDesign(d)}
                      className={`relative p-3 rounded-2xl border transition-all cursor-pointer group flex items-center gap-3.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/40'
                          : 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800/90 hover:border-neutral-700'
                      }`}
                    >
                      {/* Mini Platter Disc Preview */}
                      <div className="relative w-14 h-14 shrink-0 rounded-full border border-amber-500/40 p-0.5 bg-neutral-950 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                        <SlipmatRenderer design={d} config={config} showSpindle={true} />
                      </div>

                      {/* Text Specs */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate tracking-tight">
                            {d.name}
                          </h4>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-300/90 font-mono font-medium mt-0.5">
                          {d.thickness} • {d.material.toUpperCase()}
                        </div>
                        <p className="text-[10.5px] text-neutral-400 line-clamp-1 mt-0.5">
                          {d.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Custom Image & Pattern Studio */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                    Custom Artwork & Image Upload
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  PNG, JPG, SVG, WebP
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-400 text-xs font-semibold text-amber-300 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Image File</span>
                </button>

                {/* Paste URL */}
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    type="url"
                    placeholder="https://... image URL"
                    value={customImageUrlInput}
                    onChange={(e) => setCustomImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleApplyUrl}
                    className="px-3 py-2 rounded-xl bg-amber-400 text-neutral-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {config.customImageUrl && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-400">
                  <span className="truncate max-w-[280px]">Active custom image loaded</span>
                  <button
                    onClick={() => {
                      onUpdateConfig({ ...config, customImageUrl: '' });
                      setCustomImageUrlInput('');
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            {/* 4. Vinyl Display Mode (Appreciate Your Slipmat) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                    Vinyl Record & Platter Display Mode
                  </span>
                </div>
                <span className="text-[11px] text-amber-300/80 font-mono">
                  Showcase your slipmat
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vinylDisplayModes.map((mode) => {
                  const isSelected = config.vinylDisplayMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleVinylModeChange(mode.id)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                          : 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{mode.label}</span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 leading-snug">
                        {mode.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done CTA */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-neutral-950 font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                Apply & Enjoy Deck
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
