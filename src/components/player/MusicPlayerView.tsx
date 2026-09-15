import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Sliders,
  Maximize2,
  Minimize2,
  Music,
  Disc3,
  Activity,
  FileText,
  Plus,
  Sparkles,
  Cast,
  Upload,
  Keyboard,
  Info,
  Disc,
  Gauge,
  Lock,
  Unlock,
  RotateCcw,
  Radio,
  Headphones,
  Layers,
} from 'lucide-react';
import { MediaItem, RepeatMode, VisualizerMode, SlipmatConfig } from '../../types';
import { VinylTurntable } from '../turntable/VinylTurntable';
import { TurntableWaveformBar } from '../turntable/TurntableWaveformBar';
import { AudioVisualizer } from '../visualizer/AudioVisualizer';
import { LyricsView } from '../lyrics/LyricsView';
import { TechnicsPitchControl } from './TechnicsPitchControl';
import { SLIPMAT_DESIGNS, loadSlipmatConfig, saveSlipmatConfig } from '../turntable/slipmatData';
import { SlipmatCustomizerModal } from '../turntable/SlipmatCustomizerModal';

interface MusicPlayerViewProps {
  currentTrack: MediaItem;
  isPlaying: boolean;
  isBraking?: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playbackSpeed: number;
  pitchPercent?: number;
  pitchRange?: 8 | 16;
  isKeyLock?: boolean;
  baseSpeed?: number;
  visualizerMode: VisualizerMode;
  accentColor?: string;
  queueCount?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange?: (pitch: number) => void;
  onPitchRangeToggle?: () => void;
  onKeyLockToggle?: () => void;
  onResetPitch?: () => void;
  onBaseSpeedChange?: (speed: number) => void;
  onToggleFavorite: (id: string) => void;
  onOpenEQ: () => void;
  onOpenQueue: () => void;
  onAddToPlaylist: (track: MediaItem) => void;
  onOpenFilePicker?: () => void;
  onVisualizerModeChange?: (mode: VisualizerMode) => void;
  onCloseFullscreen?: () => void;
  onOpenArtworkEditor?: () => void;
  isFullscreen?: boolean;
  isVinylCrackleEnabled?: boolean;
  vinylCrackleVolume?: number;
  onToggleVinylCrackle?: () => void;
  onVinylCrackleVolumeChange?: (vol: number) => void;
}

export const MusicPlayerView = ({
  currentTrack,
  isPlaying,
  isBraking = false,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  playbackSpeed,
  pitchPercent = 0,
  pitchRange = 8,
  isKeyLock = false,
  baseSpeed = 1.0,
  visualizerMode,
  accentColor = '#06b6d4',
  queueCount = 0,
  isVinylCrackleEnabled = true,
  vinylCrackleVolume = 0.18,
  onToggleVinylCrackle,
  onVinylCrackleVolumeChange,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onSpeedChange,
  onPitchChange,
  onPitchRangeToggle,
  onKeyLockToggle,
  onResetPitch,
  onBaseSpeedChange,
  onToggleFavorite,
  onOpenEQ,
  onOpenQueue,
  onAddToPlaylist,
  onOpenFilePicker,
  onVisualizerModeChange,
  onCloseFullscreen,
  onOpenArtworkEditor,
  isFullscreen = false,
}: MusicPlayerViewProps) => {
  // Centerpiece view mode: 'vinyl' | 'pitch' | 'visualizer' | 'lyrics'
  const [centerMode, setCenterMode] = useState<'vinyl' | 'pitch' | 'visualizer' | 'lyrics'>('vinyl');
  const [bassEnergy, setBassEnergy] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(true);

  // Slipmat customization state
  const [slipmatConfig, setSlipmatConfig] = useState<SlipmatConfig>(() => loadSlipmatConfig());
  const [isSlipmatModalOpen, setIsSlipmatModalOpen] = useState<boolean>(false);

  const handleUpdateSlipmatConfig = (newConfig: SlipmatConfig) => {
    saveSlipmatConfig(newConfig);
    setSlipmatConfig(newConfig);
  };

  const activeSlipmatDesign = useMemo(() => {
    return SLIPMAT_DESIGNS.find((d) => d.id === slipmatConfig.activeDesignId) || SLIPMAT_DESIGNS[0];
  }, [slipmatConfig.activeDesignId]);

  // Hover & pointer scrub preview timestamp
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [isScrubbingProgress, setIsScrubbingProgress] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const remainingTime = Math.max(0, duration - currentTime);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const effectiveVolume = isMuted ? 0 : volume;

  const seekFromClientX = (clientX: number) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverPos(clientX - rect.left);
    onSeek(ratio * duration);
  };

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
    setIsScrubbingProgress(true);
    seekFromClientX(e.clientX);
  };

  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverPos(e.clientX - rect.left);
    if (isScrubbingProgress) {
      onSeek(ratio * duration);
    }
  };

  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbingProgress(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleProgressMouseLeave = () => {
    if (!isScrubbingProgress) {
      setHoverTime(null);
    }
  };

  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  // Dynamic Volume Icon
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />;
    }
    if (volume < 0.3) {
      return <Volume className="w-4 h-4 text-neutral-300 group-hover:text-amber-300 transition" />;
    }
    if (volume < 0.7) {
      return <Volume1 className="w-4 h-4 text-neutral-300 group-hover:text-amber-300 transition" />;
    }
    return <Volume2 className="w-4 h-4 text-amber-300 group-hover:scale-110 transition" />;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-transparent text-white select-none">
      {/* Dynamic Ambient Track Color Tint - subtle so Technics wallpaper is clearly visible */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 opacity-10 blur-3xl transition-all duration-1000"
        style={{
          backgroundImage: `url(${currentTrack.artwork})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) saturate(160%)',
        }}
      />
      <div className="absolute inset-0 bg-black/20 pointer-events-none -z-10" />

      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR                                        */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 sm:py-3 pt-[max(0.65rem,env(safe-area-inset-top))] border-b border-white/10 backdrop-blur-xl bg-neutral-950/75 z-20 shrink-0 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Eklund SL-1200 Gold Branding */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 shadow-sm shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" title="Direct Drive Quartz Lock Synchronized" />
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider font-mono bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent uppercase whitespace-nowrap">
                EKLUND SL-1200 GOLD
              </span>
              <span className="text-[8.5px] sm:text-[9px] text-amber-300/70 font-mono tracking-tight -mt-0.5 hidden sm:inline">
                Hi-Fi Direct Drive Master Deck
              </span>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-neutral-800 shrink-0" />

          {/* Active Audio Format & Track Info (Shown on wider desktop views) */}
          <div className="hidden lg:flex flex-col min-w-0 max-w-[160px] xl:max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-medium shrink-0">
                {currentTrack.audioFormat ? currentTrack.audioFormat.split(' ')[0] : 'FLAC 24-bit'}
              </span>
              <span className="text-xs text-neutral-200 font-semibold truncate" title={currentTrack.title}>
                {currentTrack.title}
              </span>
            </div>
            <div className="text-[10.5px] text-neutral-400 truncate mt-0.5">
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs: Turntable | Pitch Fader | Visualizer | Lyrics */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-900/90 border border-neutral-800/80 shadow-inner shrink-0">
          <button
            onClick={() => setCenterMode('vinyl')}
            className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              centerMode === 'vinyl'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Turntable</span>
            <span className="xl:hidden hidden sm:inline">Deck</span>
          </button>
          <button
            onClick={() => setCenterMode('pitch')}
            className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              centerMode === 'pitch'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold shadow-md'
                : Math.abs(pitchPercent) > 0.05
                ? 'text-amber-300 bg-amber-500/15 font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xl:inline">Pitch Fader</span>
            <span className="xl:hidden hidden sm:inline">Pitch</span>
            {Math.abs(pitchPercent) > 0.05 && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-950/80 text-amber-300 font-bold">
                {pitchPercent > 0 ? `+${pitchPercent.toFixed(1)}%` : `${pitchPercent.toFixed(1)}%`}
              </span>
            )}
          </button>
          <button
            onClick={() => setCenterMode('visualizer')}
            className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              centerMode === 'visualizer'
                ? 'bg-cyan-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Visualizer</span>
            <span className="xl:hidden hidden sm:inline">Wave</span>
          </button>
          <button
            onClick={() => setCenterMode('lyrics')}
            className={`px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              centerMode === 'lyrics'
                ? 'bg-amber-400 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Lyrics</span>
          </button>
        </div>

        {/* Quick actions right */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {onOpenFilePicker && (
            <button
              onClick={onOpenFilePicker}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[36px]"
              title="Import local audio file (MP3, WAV, FLAC, M4A)"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden 2xl:inline">Import</span>
            </button>
          )}

          {onToggleVinylCrackle && (
            <button
              onClick={onToggleVinylCrackle}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 border min-h-[36px] ${
                isVinylCrackleEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)] font-semibold'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-white'
              }`}
              title="Toggle subtle looping analog vinyl crackle noise effect (Shortcut: C)"
            >
              <Radio className={`w-3.5 h-3.5 ${isVinylCrackleEnabled ? 'text-amber-400 animate-pulse' : 'text-neutral-400'}`} />
              <span className="text-[10px] font-mono hidden xl:inline">
                CRACKLE {isVinylCrackleEnabled ? 'ON' : 'OFF'}
              </span>
              <span className="text-[9.5px] font-mono hidden md:inline xl:hidden">
                CRACKLE
              </span>
            </button>
          )}

          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center hidden xl:flex"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Slipmat Customizer Studio Quick Trigger */}
          <button
            onClick={() => setIsSlipmatModalOpen(true)}
            className="p-2 rounded-xl text-amber-400 hover:text-amber-200 hover:bg-amber-500/15 border border-amber-500/30 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center group shadow-sm"
            title={`Slipmat Studio: ${activeSlipmatDesign.name} (${activeSlipmatDesign.material.toUpperCase()})`}
          >
            <Layers className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </button>

          <button
            onClick={onOpenEQ}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Open 10-Band Equalizer (E)"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={onOpenQueue}
            className="relative p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center gap-1 cursor-pointer min-w-[36px] min-h-[36px]"
            title="Vinyl Crate & Queue (Q)"
          >
            <ListMusic className="w-4 h-4 text-amber-400" />
            {queueCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                {queueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN CENTERPIECE STAGE - Turntable / Pitch / Visualizer */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6 overflow-y-auto min-h-0 -webkit-overflow-scrolling-touch">
        {/* CENTER VISUAL: Vinyl Turntable / Pitch Deck / Visualizer / Lyrics */}
        <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-[740px] flex flex-col items-center justify-center my-auto gap-2.5 sm:gap-3">
          {centerMode === 'vinyl' && (
            <>
              <VinylTurntable
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                isBraking={isBraking}
                progress={duration > 0 ? currentTime / duration : 0}
                currentTime={currentTime}
                duration={duration}
                accentColor={currentTrack.colorAccent || accentColor}
                isCrackleEnabled={isVinylCrackleEnabled}
                onToggleCrackle={onToggleVinylCrackle}
                bassEnergy={bassEnergy}
                onSeekToRatio={(r) => onSeek(r * duration)}
                onSeek={onSeek}
                onPlayPause={onPlayPause}
                playbackSpeed={playbackSpeed}
                pitchPercent={pitchPercent}
                pitchRange={pitchRange}
                isKeyLock={isKeyLock}
                onPitchChange={onPitchChange}
                onPitchRangeToggle={onPitchRangeToggle}
                onKeyLockToggle={onKeyLockToggle}
                onResetPitch={onResetPitch}
                onSpeedChange={onSpeedChange}
                onOpenArtworkEditor={onOpenArtworkEditor}
                visualizerMode={visualizerMode}
                onVisualizerModeChange={onVisualizerModeChange}
                slipmatConfig={slipmatConfig}
                onUpdateSlipmatConfig={handleUpdateSlipmatConfig}
                onOpenSlipmatStudio={() => setIsSlipmatModalOpen(true)}
              />
              {/* Reactive Minimalist Audio Waveform Visualizer Beneath Turntable */}
              <TurntableWaveformBar
                isPlaying={isPlaying}
                accentColor={currentTrack.colorAccent || accentColor}
                onExpandVisualizer={() => setCenterMode('visualizer')}
              />
            </>
          )}

          {centerMode === 'pitch' && (
            <div className="w-full max-w-xl">
              <TechnicsPitchControl
                pitchPercent={pitchPercent}
                pitchRange={pitchRange}
                isKeyLock={isKeyLock}
                baseSpeed={baseSpeed}
                trackBpm={currentTrack.bpm || 120}
                accentColor={currentTrack.colorAccent || accentColor}
                onPitchChange={onPitchChange || (() => {})}
                onPitchRangeToggle={onPitchRangeToggle || (() => {})}
                onKeyLockToggle={onKeyLockToggle || (() => {})}
                onResetPitch={onResetPitch || (() => {})}
                onBaseSpeedChange={onBaseSpeedChange || (() => {})}
              />
            </div>
          )}

          {centerMode === 'visualizer' && (
            <div className="w-full flex flex-col items-center justify-center p-5 sm:p-6 bg-neutral-900/80 rounded-3xl border border-neutral-800 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="w-full flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Real-time Audio Spectrum
                </div>

                {onVisualizerModeChange && (
                  <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
                    {(['vinyl-heatmap', 'circular', 'bars', 'wave', 'stereo-field'] as VisualizerMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onVisualizerModeChange(mode)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded capitalize transition cursor-pointer min-h-[32px] ${
                          visualizerMode === mode
                            ? 'bg-cyan-500 text-neutral-950 font-bold shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mode.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <AudioVisualizer
                mode={visualizerMode}
                isPlaying={isPlaying}
                accentColor={currentTrack.colorAccent || accentColor}
                height={280}
                className="w-full"
                onBassEnergy={setBassEnergy}
              />
            </div>
          )}

          {centerMode === 'lyrics' && (
            <div className="w-full h-[420px] sm:h-[460px] bg-neutral-900/80 rounded-3xl border border-neutral-800 backdrop-blur-xl shadow-2xl overflow-hidden">
              <LyricsView
                lyricsRaw={currentTrack.lyrics}
                currentTrack={currentTrack}
                currentTime={currentTime}
                onSeek={onSeek}
                accentColor={currentTrack.colorAccent || accentColor}
              />
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. AUDIOPHILE MASTER TRANSPORT & VOLUME CONSOLE (BOTTOM) */}
      {/* ======================================================== */}
      <div className="w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-neutral-950/85 backdrop-blur-xl shadow-[0_-10px_35px_rgba(0,0,0,0.8)] z-30 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 md:gap-4 lg:gap-6">
          
          {/* LEFT: Mini Track Info & Artwork Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto md:max-w-[220px] lg:max-w-[270px] shrink-0 min-w-0">
            {/* Spinning Mini Vinyl Thumbnail */}
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-neutral-900 border border-amber-500/50 shadow-md p-1 flex items-center justify-center overflow-hidden group">
              <div
                className={`w-full h-full rounded-full bg-cover bg-center transition-transform ${
                  isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                }`}
                style={{
                  backgroundImage: `url(${currentTrack.artwork})`,
                }}
              />
              <div className="absolute inset-0 rounded-full border border-amber-400/30 pointer-events-none" />
              <div className="absolute w-2 h-2 rounded-full bg-neutral-950 border border-amber-400/80" />
            </div>

            {/* Title & Artist */}
            <div className="flex flex-col min-w-0 overflow-hidden pr-1">
              <span className="text-sm font-bold text-white truncate font-display" title={currentTrack.title}>
                {currentTrack.title}
              </span>
              <span className="text-xs text-neutral-400 truncate">
                {currentTrack.artist}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {currentTrack.audioFormat ? currentTrack.audioFormat.split(' ')[0] : 'Hi-Res'}
                </span>
                {currentTrack.bitrate && (
                  <span className="text-[9px] font-mono text-neutral-400">
                    {currentTrack.bitrate}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Fav Heart */}
            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              className="p-2 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer shrink-0 ml-auto md:ml-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={currentTrack.isFavorite ? 'Favorited' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          {/* CENTER: Transport Controls + High-Precision Scrubber */}
          <div className="flex flex-col items-center gap-1.5 w-full md:flex-1 md:max-w-xl shrink min-w-0 px-1 md:px-2">
            {/* Playback Buttons */}
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              {/* Shuffle */}
              <button
                onClick={onToggleShuffle}
                className={`p-2.5 rounded-xl transition cursor-pointer relative min-w-[42px] min-h-[42px] flex items-center justify-center ${
                  isShuffle ? 'text-amber-300 bg-amber-500/15' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
                title="Shuffle Tracks (S)"
              >
                <Shuffle className="w-4 h-4" />
                {isShuffle && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
              </button>

              {/* Previous */}
              <button
                onClick={onPrevious}
                className="p-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Previous Track (P)"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Master Play / Pause Tactile Button */}
              <button
                onClick={onPlayPause}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #fae6a6 0%, #dfbf66 50%, #b58622 100%)',
                  boxShadow: isBraking
                    ? '0 0 24px rgba(245, 158, 11, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
                    : isPlaying
                    ? '0 0 20px rgba(223, 191, 102, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
                    : '0 4px 15px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                  color: '#171510',
                }}
                title={isBraking ? 'Turntable Platter Braking...' : isPlaying ? 'Pause / Brake (Space)' : 'Play Track (Space)'}
              >
                {isBraking ? (
                  <Disc3 className="w-6 h-6 animate-spin text-neutral-950" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6 fill-current text-neutral-950" />
                ) : (
                  <Play className="w-6 h-6 fill-current text-neutral-950 translate-x-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={onNext}
                className="p-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Next Track (N)"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Repeat */}
              <button
                onClick={onToggleRepeat}
                className={`p-2.5 rounded-xl transition cursor-pointer relative min-w-[42px] min-h-[42px] flex items-center justify-center ${
                  repeatMode !== 'off' ? 'text-amber-300 bg-amber-500/15' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
                title="Repeat Mode (R)"
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
                {repeatMode !== 'off' && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                )}
              </button>
            </div>

            {/* High-Precision Scrubber Bar */}
            <div className="flex items-center gap-2.5 w-full py-1">
              {/* Elapsed Time */}
              <span className="text-[11px] font-mono text-neutral-400 w-10 text-right tabular-nums select-none shrink-0">
                {formatTime(currentTime)}
              </span>

              {/* Interactive Progress Track */}
              <div
                ref={progressBarRef}
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerUp}
                onPointerCancel={handleProgressPointerUp}
                onMouseLeave={handleProgressMouseLeave}
                className="relative flex-1 h-2.5 sm:h-3 bg-neutral-800/90 rounded-full cursor-pointer transition-all duration-150 group flex items-center touch-none select-none"
              >
                {/* Active Progress Fill */}
                <div
                  className="h-full rounded-full transition-all duration-75 relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"
                  style={{
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)',
                  }}
                >
                  {/* Glowing Thumb Handle */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border border-amber-300 opacity-90 group-hover:opacity-100 group-hover:scale-125 transition" />
                </div>

                {/* Hover Preview Tooltip */}
                {hoverTime !== null && (
                  <div
                    className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-neutral-900 border border-amber-500/40 text-[10px] font-mono text-amber-300 pointer-events-none shadow-xl z-50 whitespace-nowrap"
                    style={{ left: `${hoverPos}px` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>

              {/* Remaining / Total Time */}
              <button
                onClick={() => setShowRemainingTime((prev) => !prev)}
                className="text-[11px] font-mono text-neutral-400 hover:text-amber-300 w-12 text-left tabular-nums select-none transition cursor-pointer"
                title="Click to toggle elapsed/remaining time"
              >
                {showRemainingTime ? `-${formatTime(remainingTime)}` : formatTime(duration)}
              </button>
            </div>
          </div>

          {/* RIGHT: Master Luxury Volume Console & Tools */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 md:gap-3 w-full md:w-auto shrink-0">
            {/* Interactive Volume Hub */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner group">
              <button
                onClick={onToggleMute}
                className="p-1 text-neutral-400 hover:text-white transition cursor-pointer flex items-center justify-center focus:outline-none min-w-[32px] min-h-[32px]"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {renderVolumeIcon()}
              </button>

              {/* Smooth Custom Volume Track */}
              <div className="relative w-18 sm:w-22 md:w-20 lg:w-24 h-1.5 hover:h-2 rounded-full bg-neutral-800 cursor-pointer flex items-center transition-all">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effectiveVolume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 pointer-events-none transition-all"
                  style={{
                    width: `${effectiveVolume * 100}%`,
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                  }}
                />
              </div>

              {/* Volume Percentage Badge */}
              <span className="text-[10px] font-mono text-amber-300/90 font-bold w-7 text-right select-none">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* 10-Band EQ Quick Toggle */}
            <button
              onClick={onOpenEQ}
              className="p-2 rounded-xl text-neutral-400 hover:text-cyan-300 hover:bg-neutral-900 transition cursor-pointer"
              title="Open 10-Band Equalizer (E)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Vinyl Crate Queue Drawer */}
            <button
              onClick={onOpenQueue}
              className="relative p-2 rounded-xl text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition cursor-pointer"
              title="Vinyl Crate & Queue (Q)"
            >
              <ListMusic className="w-4 h-4" />
              {queueCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[9px] font-mono px-1 rounded-full bg-amber-500 text-neutral-950 font-bold">
                  {queueCount}
                </span>
              )}
            </button>

            {/* Fullscreen Button */}
            {onCloseFullscreen && (
              <button
                onClick={onCloseFullscreen}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display">Hi-Fi Deck Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Play / Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Seek 5s</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-cyan-300 font-bold">← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Volume</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-cyan-300 font-bold">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Mute Toggle</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Vinyl Crate</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">Q</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">10-Band EQ</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-cyan-300 font-bold">E</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Next Track</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Prev Track</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold">P</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Shuffle</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold">S</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Repeat Mode</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold">R</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-200">Vinyl Crackle Noise</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">C</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-200">Pitch Bend Nudge</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">[ / ]</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-200">Quartz Lock Reset</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">0</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <span className="text-cyan-200">Master Key Lock</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-cyan-300 font-bold">K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">Pitch Range ±8/16%</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold">X</kbd>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center pt-2">
              Tip: You can drag any MP3 or WAV audio file directly onto the turntable platter!
            </p>
          </div>
        </div>
      )}

      {/* High-Fidelity Slipmat Customization Studio Modal */}
      <SlipmatCustomizerModal
        isOpen={isSlipmatModalOpen}
        onClose={() => setIsSlipmatModalOpen(false)}
        config={slipmatConfig}
        onUpdateConfig={handleUpdateSlipmatConfig}
        albumArtwork={currentTrack.artwork}
        albumTitle={currentTrack.title}
      />
    </div>
  );
};
