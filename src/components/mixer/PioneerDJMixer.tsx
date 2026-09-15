import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Disc,
  Heart,
  Plus,
  Headphones,
  Mic,
  Activity,
  BarChart3,
  Waves,
} from 'lucide-react';
import { MediaItem } from '../../types';
import { audioEngine } from '../../services/audioEngine';

export interface PioneerDJMixerProps {
  currentTrack: MediaItem;
  isPlaying: boolean;
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackSpeed: number;
  pitchPercent: number;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFavorite?: (id: string) => void;
  onAddToPlaylist?: (track: MediaItem) => void;
  onOpenArtworkEditor?: () => void;
  onOpenSlipmatStudio?: () => void;
  accentColor?: string;
}

// Beat FX Types available on Pioneer DJ Mixers
const BEAT_FX_LIST = [
  'DELAY',
  'ECHO',
  'PING PONG',
  'SPIRAL',
  'REVERB',
  'TRANS',
  'FLANGER',
  'PITCH',
  'ROLL',
  'VINYL BRAKE',
  'HELIX',
] as const;

type BeatFxType = (typeof BEAT_FX_LIST)[number];
type ColorFxType = 'DUB ECHO' | 'SWEEP' | 'NOISE' | 'FILTER';
type OledDisplayMode = 'BPM_FX' | 'SPECTRUM' | 'OSCILLOSCOPE';
type CrossfaderCurveType = 'SMOOTH' | 'CUT' | 'THRU';

interface ChannelState {
  trim: number; // -12 to +9 dB (0 is 12 o'clock)
  high: number; // -26 to +6 dB (0 is 12 o'clock)
  mid: number; // -26 to +6 dB
  low: number; // -26 to +6 dB
  color: number; // -1 to +1 (0 is center)
  cue: boolean;
  fader: number; // 0 to 1.0
  cfAssign: 'A' | 'THRU' | 'B';
  source: 'LINE' | 'PHONO' | 'AUX';
}

export const PioneerDJMixer: React.FC<PioneerDJMixerProps> = ({
  currentTrack,
  isPlaying,
  volume,
  isMuted,
  playbackSpeed,
  pitchPercent,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onAddToPlaylist,
  onOpenSlipmatStudio,
}) => {
  // --- 2-Channel Mixer State (CH 1: Aux/Line Deck, CH 2: Turntable Deck) ---
  const [channels, setChannels] = useState<[ChannelState, ChannelState]>([
    {
      trim: 0,
      high: 0,
      mid: 0,
      low: 0,
      color: 0,
      cue: false,
      fader: 0.75,
      cfAssign: 'A',
      source: 'LINE',
    },
    {
      trim: 0,
      high: 0,
      mid: 0,
      low: 0,
      color: 0,
      cue: true,
      fader: volume,
      cfAssign: 'B',
      source: 'PHONO',
    },
  ]);

  // Keep Channel 2 fader synchronized with incoming volume prop
  useEffect(() => {
    setChannels((prev) => {
      if (Math.abs(prev[1].fader - volume) > 0.01) {
        const next: [ChannelState, ChannelState] = [{ ...prev[0] }, { ...prev[1], fader: volume }];
        return next;
      }
      return prev;
    });
  }, [volume]);

  // --- Master & Headphone State ---
  const [masterLevel, setMasterLevel] = useState<number>(0.85); // 0 to 1.0
  const [boothLevel, setBoothLevel] = useState<number>(0.65);
  const [phonesLevel, setPhonesLevel] = useState<number>(0.7);
  const [phonesMix, setPhonesMix] = useState<number>(0.5); // 0 = Cue, 1 = Master
  const [eqMode, setEqMode] = useState<'ISOLATOR' | 'EQ'>('ISOLATOR');
  const [crossfader, setCrossfader] = useState<number>(0.5); // 0 = A, 0.5 = Center, 1 = B
  const [cfCurve, setCfCurve] = useState<CrossfaderCurveType>('SMOOTH');

  // --- Sound Color FX State ---
  const [activeColorFx, setActiveColorFx] = useState<ColorFxType>('FILTER');
  const [colorFxParam, setColorFxParam] = useState<number>(0.5); // 0 to 1

  // --- Beat FX State ---
  const [activeBeatFx, setActiveBeatFx] = useState<BeatFxType>('ECHO');
  const [isBeatFxOn, setIsBeatFxOn] = useState<boolean>(false);
  const [beatFraction, setBeatFraction] = useState<string>('1/2');
  const [fxTimeMs, setFxTimeMs] = useState<number>(375);
  const [fxDepth, setFxDepth] = useState<number>(0.55); // 0 to 1

  // OLED Screen Mode: BPM/FX, Spectrum, Oscilloscope
  const [oledMode, setOledMode] = useState<OledDisplayMode>('SPECTRUM');

  // Tap tempo state
  const lastTapRef = useRef<number>(0);
  const [customBpm, setCustomBpm] = useState<number | null>(null);

  // Track base BPM calculation
  const trackBpm = currentTrack.detectedBpm || currentTrack.bpm || 120;
  const currentBpm = customBpm || Math.round(trackBpm * (1 + pitchPercent / 100) * playbackSpeed);

  // Peak Meters & Frequency Bands State
  const [meterLevels, setMeterLevels] = useState<{
    ch1Left: number;
    ch2Left: number;
    masterLeft: number;
    masterRight: number;
    isClip: boolean;
    low: number;
    mid: number;
    hi: number;
  }>({
    ch1Left: 0,
    ch2Left: 0,
    masterLeft: 0,
    masterRight: 0,
    isClip: false,
    low: 0,
    mid: 0,
    hi: 0,
  });

  // Raw frequency bins for OLED visualizer
  const [spectrumBins, setSpectrumBins] = useState<number[]>(new Array(16).fill(0));

  // Canvas ref for high-framerate OLED display
  const oledCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate Crossfader Multipliers
  const getCrossfaderGain = (assign: 'A' | 'THRU' | 'B'): number => {
    if (assign === 'THRU' || cfCurve === 'THRU') return 1.0;

    if (assign === 'A') {
      if (cfCurve === 'CUT') {
        return crossfader < 0.9 ? 1.0 : (1 - crossfader) / 0.1;
      }
      // Equal-power Smooth curve
      const angle = (1 - crossfader) * (Math.PI / 2);
      return Math.min(1.0, Math.cos((1 - Math.cos(angle)) * (Math.PI / 4)) * 1.25);
    } else {
      // assign === 'B'
      if (cfCurve === 'CUT') {
        return crossfader > 0.1 ? 1.0 : crossfader / 0.1;
      }
      const angle = crossfader * (Math.PI / 2);
      return Math.min(1.0, Math.cos((1 - Math.cos(angle)) * (Math.PI / 4)) * 1.25);
    }
  };

  // Real-time Audio Engine Synchronization
  useEffect(() => {
    // Channel 2 is assigned to Turntable Deck
    const ch2 = channels[1];
    const cfMultiplier = getCrossfaderGain(ch2.cfAssign);
    const effectiveFader = (isMuted ? 0 : ch2.fader) * cfMultiplier;

    audioEngine.setDJ3BandEQ(ch2.low, ch2.mid, ch2.high, eqMode === 'ISOLATOR');
    audioEngine.setDJColorFilter(activeColorFx, ch2.color, colorFxParam);
    audioEngine.setDJChannelFader(effectiveFader);
    audioEngine.setDJMasterLevel(masterLevel);
  }, [channels, eqMode, activeColorFx, colorFxParam, isMuted, masterLevel, crossfader, cfCurve]);

  // Synchronize Beat FX with Audio Engine
  useEffect(() => {
    audioEngine.setDJBeatFX(activeBeatFx, isBeatFxOn && isPlaying, fxTimeMs, fxDepth);
  }, [activeBeatFx, isBeatFxOn, isPlaying, fxTimeMs, fxDepth]);

  // Continuous Meter & Frequency Visualizer Animation Loop
  useEffect(() => {
    let animFrame: number;
    const updateMetersAndVisualizer = () => {
      if (isPlaying) {
        const peak = audioEngine.getAudioPeakMeters();
        const ch2 = channels[1];
        const ch1 = channels[0];
        const cfMultiplier2 = getCrossfaderGain(ch2.cfAssign);
        const cfMultiplier1 = getCrossfaderGain(ch1.cfAssign);
        const ch2Fader = isMuted ? 0 : ch2.fader * cfMultiplier2;
        const mLevel = masterLevel;

        setMeterLevels({
          ch1Left: ch1.fader * 0.28 * cfMultiplier1,
          ch2Left: peak.chLeft * ch2Fader,
          masterLeft: peak.masterLeft * ch2Fader * mLevel,
          masterRight: peak.masterRight * ch2Fader * mLevel,
          isClip: peak.isClip && ch2Fader > 0.8 && mLevel > 0.8,
          low: peak.low * ch2Fader,
          mid: peak.mid * ch2Fader,
          hi: peak.hi * ch2Fader,
        });

        // Fetch frequency spectrum bins
        const bins = audioEngine.getRawFrequencyData(16);
        setSpectrumBins(bins.map((b) => b * ch2Fader));

        // Draw on OLED canvas if available
        if (oledCanvasRef.current) {
          const canvas = oledCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            if (oledMode === 'SPECTRUM') {
              // Draw cyan LCD frequency spectrum bars with peak caps
              const barCount = 16;
              const barWidth = Math.floor((width - (barCount - 1) * 2) / barCount);
              for (let i = 0; i < barCount; i++) {
                const val = bins[i] * ch2Fader;
                const barHeight = Math.max(2, Math.floor(val * (height - 4)));
                const x = i * (barWidth + 2);
                const y = height - barHeight;

                // Gradient from deep cyan to bright neon cyan
                const grad = ctx.createLinearGradient(0, height, 0, 0);
                grad.addColorStop(0, '#0284c7');
                grad.addColorStop(0.7, '#06b6d4');
                grad.addColorStop(1.0, '#38bdf8');

                ctx.fillStyle = grad;
                ctx.fillRect(x, y, barWidth, barHeight);

                // Peak cap dot
                ctx.fillStyle = val > 0.85 ? '#f59e0b' : '#67e8f9';
                ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
              }
            } else if (oledMode === 'OSCILLOSCOPE') {
              // Draw glowing cyan oscilloscope waveform
              ctx.beginPath();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = '#06b6d4';
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 4;

              const sliceWidth = width / 32;
              let x = 0;
              for (let i = 0; i < 32; i++) {
                const sample = (bins[i % 16] - 0.5) * 1.8 * ch2Fader;
                const y = height / 2 + sample * (height / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
        }
      } else {
        setMeterLevels({
          ch1Left: 0,
          ch2Left: 0,
          masterLeft: 0,
          masterRight: 0,
          isClip: false,
          low: 0,
          mid: 0,
          hi: 0,
        });
        setSpectrumBins(new Array(16).fill(0));

        if (oledCanvasRef.current) {
          const canvas = oledCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
      animFrame = requestAnimationFrame(updateMetersAndVisualizer);
    };

    animFrame = requestAnimationFrame(updateMetersAndVisualizer);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isMuted, channels, masterLevel, oledMode, crossfader, cfCurve]);

  // Update Beat Time whenever BPM or Beat Fraction changes
  useEffect(() => {
    const beatMs = (60 / currentBpm) * 1000;
    let multiplier = 0.5;
    if (beatFraction === '1/4') multiplier = 0.25;
    else if (beatFraction === '1/2') multiplier = 0.5;
    else if (beatFraction === '3/4') multiplier = 0.75;
    else if (beatFraction === '1') multiplier = 1.0;
    else if (beatFraction === '2') multiplier = 2.0;
    else if (beatFraction === '4') multiplier = 4.0;

    setFxTimeMs(Math.round(beatMs * multiplier));
  }, [currentBpm, beatFraction]);

  // Channel update handler
  const updateChannel = (idx: 0 | 1, updates: Partial<ChannelState>) => {
    setChannels((prev) => {
      const next: [ChannelState, ChannelState] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });

    if (idx === 1 && updates.fader !== undefined) {
      onVolumeChange(updates.fader);
    }
  };

  // Tap Tempo Handler
  const handleTap = () => {
    const now = Date.now();
    if (lastTapRef.current > 0) {
      const diff = now - lastTapRef.current;
      if (diff > 250 && diff < 2500) {
        const tapBpm = Math.round(60000 / diff);
        setCustomBpm(tapBpm);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <div className="w-full select-none font-sans max-w-full">
      {/* Outer Pioneer DJM-450 2-Channel Professional DJ Mixer Chassis */}
      <div className="relative rounded-2xl bg-[#0f1013] border-2 border-[#24262d] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.12)] p-2.5 sm:p-3 md:p-3.5 text-neutral-300 overflow-hidden">
        
        {/* Heavy Isolation Damped Feet (Peeking out at four corners - matches Technics turntable feet) */}
        <div className="absolute -bottom-2 -left-1 w-9 h-3 rounded-b-xl bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-950 border-t border-neutral-600/40 shadow-xl pointer-events-none" />
        <div className="absolute -bottom-2 -right-1 w-9 h-3 rounded-b-xl bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-950 border-t border-neutral-600/40 shadow-xl pointer-events-none" />
        <div className="absolute -top-2 -left-1 w-9 h-3 rounded-t-xl bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-950 border-b border-neutral-600/40 shadow-xl pointer-events-none" />
        <div className="absolute -top-2 -right-1 w-9 h-3 rounded-t-xl bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-950 border-b border-neutral-600/40 shadow-xl pointer-events-none" />

        {/* Subtle Brushed Metal Finish & Chassis Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-transparent to-black/80 pointer-events-none" />
        
        {/* Corner Industrial Hex Screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-1.2 h-[0.5px] bg-neutral-950 rotate-45" />
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-1.2 h-[0.5px] bg-neutral-950 -rotate-45" />
        </div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-1.2 h-[0.5px] bg-neutral-950 rotate-12" />
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-neutral-600 border border-neutral-800 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="w-1.2 h-[0.5px] bg-neutral-950 -rotate-30" />
        </div>

        {/* ======================================================== */}
        {/* 1. TOP HEADER PANEL: PIONEER DJ LOGO & OLED TRACK HUD    */}
        {/* ======================================================== */}
        <div className="relative pb-2 mb-2.5 border-b border-neutral-800/90 flex flex-row items-center justify-between gap-2">
          
          {/* Pioneer DJ Official Badge Branding */}
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <div className="flex items-center tracking-tight">
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-widest font-mono">
                Pioneer
              </span>
              <span className="ml-1 text-red-500 font-black text-[11px] sm:text-xs">DJ</span>
            </div>
            <div className="h-2.5 w-[1px] bg-neutral-700 mx-0.5" />
            <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-neutral-400 font-bold uppercase">
              DJM-450<span className="text-amber-400 ml-0.5">MK2</span>
            </span>
            <span className="text-[7px] sm:text-[7.5px] font-mono px-1 py-0.2 rounded bg-neutral-900 border border-neutral-700/80 text-cyan-300 font-bold ml-0.5">
              2-CH
            </span>
          </div>

          {/* Integrated DJ Track OLED Display & Quick Actions */}
          <div className="flex items-center gap-1.5 bg-neutral-950/95 border border-neutral-800/90 rounded-lg px-2 py-1 shadow-inner min-w-0 max-w-[62%] sm:max-w-[68%] overflow-hidden">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-neutral-600'} shrink-0`} />
            <div className="flex flex-col min-w-0 pr-1 leading-tight">
              <div className="flex items-center gap-1 truncate">
                <span className="text-[10px] sm:text-[11px] font-bold text-neutral-100 truncate">
                  {currentTrack.title}
                </span>
                <span className="text-[8.5px] text-neutral-400 truncate hidden md:inline">
                  — {currentTrack.artist}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-mono text-neutral-400 truncate">
                <span className="text-cyan-400 font-bold">{currentBpm} BPM</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">CH 2 (TURNTABLE)</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-neutral-500 hidden sm:inline">{currentTrack.bitrate || '320 kbps'}</span>
              </div>
            </div>

            {/* Quick Action Mini Buttons */}
            <div className="flex items-center gap-0.5 pl-1.5 border-l border-neutral-800 shrink-0">
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(currentTrack.id)}
                  className={`p-1 rounded-md hover:bg-neutral-800 transition cursor-pointer ${
                    currentTrack.isFavorite ? 'text-rose-400' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                  title="Favorite track"
                >
                  <Heart className="w-3 h-3 fill-current" />
                </button>
              )}

              {onOpenSlipmatStudio && (
                <button
                  onClick={onOpenSlipmatStudio}
                  className="p-1 rounded-md hover:bg-neutral-800 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  title="Slipmat Customizer Studio"
                >
                  <Disc className="w-3 h-3" />
                </button>
              )}

              {onAddToPlaylist && (
                <button
                  onClick={() => onAddToPlaylist(currentTrack)}
                  className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                  title="Add to crate"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. MAIN MIXER SURFACE: 3 BALANCED HARDWARE SECTIONS      */}
        {/* Left: MIC & Color FX | Center: 2 CHANNELS | Right: Master & Beat FX */}
        {/* ======================================================== */}
        <div className="grid grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
          
          {/* ------------------------------------------------------ */}
          {/* A. LEFT STRIP: MIC, SOUND COLOR FX, HEADPHONES        */}
          {/* ------------------------------------------------------ */}
          <div className="col-span-12 md:col-span-3 flex flex-col justify-between gap-2 bg-neutral-950/85 rounded-xl p-2 border border-neutral-800/80 shadow-inner">
            
            {/* 1. MIC Section */}
            <div className="flex flex-col items-center border-b border-neutral-800/80 pb-1.5">
              <div className="flex items-center justify-between w-full px-0.5 mb-1">
                <span className="flex items-center gap-1 text-[8.5px] font-mono tracking-wider text-neutral-300 font-bold uppercase">
                  <Mic className="w-2.5 h-2.5 text-neutral-400" /> MIC
                </span>
                <span className="text-[7px] font-mono px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 font-bold">
                  AUTO
                </span>
              </div>

              {/* Mic Controls */}
              <div className="grid grid-cols-2 gap-1.5 w-full mb-1">
                <RotaryKnob
                  label="LEVEL"
                  value={0.65}
                  min={0}
                  max={1}
                  step={0.02}
                  size="xs"
                  onChange={() => {}}
                />
                <RotaryKnob
                  label="HI EQ"
                  value={0}
                  min={-12}
                  max={12}
                  step={0.5}
                  size="xs"
                  accent="blue"
                  onChange={() => {}}
                />
              </div>

              {/* Mic Mode Selector */}
              <div className="w-full flex items-center justify-between bg-neutral-900/90 rounded p-0.5 border border-neutral-800 text-[7px] font-mono px-1">
                <span className="text-neutral-400">MODE:</span>
                <div className="flex gap-0.5">
                  <span className="px-1 py-0.2 rounded bg-neutral-950 text-neutral-400">OFF</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">ON</span>
                </div>
              </div>
            </div>

            {/* 2. SOUND COLOR FX Panel */}
            <div className="flex flex-col items-center py-1.5 border-b border-neutral-800/80">
              <div className="flex items-center justify-between w-full px-0.5 mb-1.5">
                <span className="flex items-center gap-1 text-[8.5px] font-mono tracking-widest text-cyan-400 font-bold uppercase">
                  <Sparkles className="w-2.5 h-2.5" /> COLOR FX
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${colorFxParam !== 0.5 ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-neutral-700'}`} />
              </div>

              {/* 4 Color FX Buttons in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-1 w-full mb-1.5">
                {(['DUB ECHO', 'SWEEP', 'NOISE', 'FILTER'] as ColorFxType[]).map((fx) => {
                  const isActive = activeColorFx === fx;
                  return (
                    <button
                      key={fx}
                      onClick={() => setActiveColorFx(fx)}
                      className={`py-1 px-0.5 rounded text-[7.5px] font-mono font-bold tracking-tight border transition-all flex items-center justify-center text-center cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.75)] font-extrabold scale-[1.02]'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {fx}
                    </button>
                  );
                })}
              </div>

              {/* PARAMETER Knob */}
              <RotaryKnob
                label="PARAM"
                value={colorFxParam}
                min={0}
                max={1}
                step={0.02}
                size="sm"
                accent="cyan"
                onChange={setColorFxParam}
              />
            </div>

            {/* 3. HEADPHONES Section */}
            <div className="flex flex-col items-center pt-1">
              <div className="flex items-center justify-between w-full px-0.5 mb-1">
                <span className="flex items-center gap-1 text-[8.5px] font-mono tracking-wider text-amber-400 font-bold uppercase">
                  <Headphones className="w-2.5 h-2.5" /> PHONES
                </span>
                <span className="text-[7px] font-mono text-neutral-400">STEREO</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 w-full mb-1.5">
                <RotaryKnob
                  label="MIX"
                  value={phonesMix}
                  min={0}
                  max={1}
                  step={0.02}
                  size="xs"
                  onChange={setPhonesMix}
                />
                <RotaryKnob
                  label="LEVEL"
                  value={phonesLevel}
                  min={0}
                  max={1}
                  step={0.02}
                  size="xs"
                  onChange={setPhonesLevel}
                />
              </div>

              {/* Dual Headphone Jack Graphics */}
              <div className="flex items-center justify-center gap-2 w-full py-1 px-1 rounded bg-black/50 border border-neutral-800/80 text-[7px] font-mono text-neutral-400">
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full border border-amber-500/70 bg-neutral-900 flex items-center justify-center shadow-inner">
                    <div className="w-0.5 h-0.5 rounded-full bg-black" />
                  </div>
                  <span>1/4"</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full border border-amber-500/70 bg-neutral-900 flex items-center justify-center shadow-inner">
                    <div className="w-0.5 h-0.5 rounded-full bg-black" />
                  </div>
                  <span>3.5mm</span>
                </div>
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------ */}
          {/* B. CENTER STRIP: 2 CHANNELS (CH 1 & CH 2)              */}
          {/* ------------------------------------------------------ */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-1.5 sm:gap-2 bg-neutral-950/80 rounded-xl p-1.5 sm:p-2 border border-neutral-800/90 shadow-inner">
            {([0, 1] as const).map((chIdx) => {
              const ch = channels[chIdx];
              const isDeckCh = chIdx === 1; // Channel 2 is connected to the Turntable Deck

              return (
                <div
                  key={chIdx}
                  className={`flex flex-col items-center justify-between rounded-lg p-1.5 sm:p-2 border transition-all ${
                    isDeckCh
                      ? 'bg-neutral-900/90 border-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.1)]'
                      : 'bg-neutral-900/50 border-neutral-800/80'
                  }`}
                >
                  {/* Channel Header: Source & Number */}
                  <div className="w-full flex items-center justify-between pb-1 mb-1 border-b border-neutral-800 text-[9px] font-mono">
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-black ${
                          isDeckCh ? 'text-cyan-400' : 'text-neutral-300'
                        }`}
                      >
                        CH {chIdx + 1}
                      </span>
                      {isDeckCh && (
                        <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_4px_#22d3ee] animate-pulse" />
                      )}
                    </div>

                    <span
                      className={`text-[7px] sm:text-[7.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-tight ${
                        isDeckCh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-neutral-400 bg-neutral-950 border border-neutral-800'
                      }`}
                    >
                      {isDeckCh ? 'PHONO / DECK' : 'LINE / AUX'}
                    </span>
                  </div>

                  {/* 1. TRIM Gain Knob */}
                  <div className="my-0.5">
                    <RotaryKnob
                      label="TRIM"
                      value={ch.trim}
                      min={-12}
                      max={9}
                      step={0.5}
                      size="xs"
                      onChange={(val) => updateChannel(chIdx, { trim: val })}
                    />
                  </div>

                  {/* 2. 3-BAND EQ SECTION (HI, MID, LOW) */}
                  <div className="w-full flex flex-col items-center my-0.5 py-1 border-y border-neutral-800/70 gap-0.5 bg-black/30 rounded">
                    <RotaryKnob
                      label="HI"
                      value={ch.high}
                      min={-26}
                      max={6}
                      step={0.5}
                      size="xs"
                      accent="blue"
                      onChange={(val) => updateChannel(chIdx, { high: val })}
                    />
                    <RotaryKnob
                      label="MID"
                      value={ch.mid}
                      min={-26}
                      max={6}
                      step={0.5}
                      size="xs"
                      accent="blue"
                      onChange={(val) => updateChannel(chIdx, { mid: val })}
                    />
                    <RotaryKnob
                      label="LOW"
                      value={ch.low}
                      min={-26}
                      max={6}
                      step={0.5}
                      size="xs"
                      accent="blue"
                      onChange={(val) => updateChannel(chIdx, { low: val })}
                    />
                  </div>

                  {/* 3. SOUND COLOR FX Knob */}
                  <div className="my-0.5">
                    <RotaryKnob
                      label="COLOR"
                      value={ch.color}
                      min={-1}
                      max={1}
                      step={0.02}
                      size="sm"
                      accent="cyan"
                      onChange={(val) => updateChannel(chIdx, { color: val })}
                    />
                  </div>

                  {/* 4. CUE Headphone Monitor Button */}
                  <button
                    onClick={() => updateChannel(chIdx, { cue: !ch.cue })}
                    className={`w-full py-1 rounded text-[8px] font-mono font-bold tracking-wider my-1 transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                      ch.cue
                        ? 'bg-amber-500 text-black border-amber-300 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.75)]'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <Headphones className="w-2.5 h-2.5" />
                    CUE
                  </button>

                  {/* 5. Channel VU Meter & Vertical Fader with Reaction Dots */}
                  <div className="w-full flex flex-col items-center my-0.5">
                    <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 h-24 sm:h-28 px-0.5">
                      {/* Vertical Segmented LED Level Meter with Dedicated Red CLIP Indicator */}
                      <div className="flex flex-col items-center h-full justify-between py-0.5">
                        {/* Red Clip LED Indicator above VU Meter */}
                        <div className="pb-0.5">
                          <StudioClipLed
                            isClipping={
                              isDeckCh
                                ? meterLevels.ch2Left >= 0.82 || meterLevels.isClip
                                : meterLevels.ch1Left >= 0.82
                            }
                            size="xs"
                            label="CLIP"
                          />
                        </div>

                        {/* Vertical Segmented LED Level Meter with Peak-Hold & Canvas Wave Overlay */}
                        <div className="flex-1 flex items-center justify-center">
                          <SegmentedLedMeter
                            level={isDeckCh ? meterLevels.ch2Left : meterLevels.ch1Left}
                            segments={10}
                            freqBands={
                              isDeckCh
                                ? { low: meterLevels.low, mid: meterLevels.mid, hi: meterLevels.hi }
                                : { low: meterLevels.ch1Left * 0.4, mid: meterLevels.ch1Left * 0.3, hi: meterLevels.ch1Left * 0.2 }
                            }
                            isPlaying={isPlaying}
                          />
                        </div>
                      </div>

                      {/* Smooth Vertical Channel Fader */}
                      <VerticalFader
                        value={ch.fader}
                        onChange={(val) => updateChannel(chIdx, { fader: val })}
                        isActive={isDeckCh}
                      />
                    </div>

                    {/* Low/Mid/Hi Frequency Energy Pulse Indicators */}
                    {isDeckCh && (
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[7px] font-mono text-neutral-400">
                        <div className="flex items-center gap-0.5">
                          <span className={`w-1 h-1 rounded-full ${meterLevels.low > 0.4 ? 'bg-cyan-400 shadow-[0_0_4px_#22d3ee]' : 'bg-neutral-800'}`} />
                          <span>LOW</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className={`w-1 h-1 rounded-full ${meterLevels.mid > 0.4 ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b]' : 'bg-neutral-800'}`} />
                          <span>MID</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className={`w-1 h-1 rounded-full ${meterLevels.hi > 0.3 ? 'bg-rose-400 shadow-[0_0_4px_#f43f5e]' : 'bg-neutral-800'}`} />
                          <span>HI</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Crossfader Assignment Switch [A | THRU | B] */}
                  <div className="w-full mt-1 pt-1 border-t border-neutral-800 flex items-center justify-between text-[7.5px] font-mono px-0.5">
                    <span className="text-neutral-400 font-semibold">CF:</span>
                    <div className="flex bg-neutral-950 rounded p-0.2 border border-neutral-800 gap-0.5">
                      {(['A', 'THRU', 'B'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => updateChannel(chIdx, { cfAssign: pos })}
                          className={`px-1 py-0.2 rounded text-[7px] font-bold cursor-pointer transition ${
                            ch.cfAssign === pos
                              ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                              : 'text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------ */}
          {/* C. RIGHT STRIP: MASTER SECTION & BEAT FX               */}
          {/* ------------------------------------------------------ */}
          <div className="col-span-12 md:col-span-4 flex flex-col justify-between gap-2 bg-neutral-950/85 rounded-xl p-2 border border-neutral-800/90 shadow-inner">
            
            {/* 1. MASTER LEVEL & STEREO VU METERS */}
            <div className="flex flex-col items-center border-b border-neutral-800/80 pb-1.5">
              <div className="flex items-center justify-between w-full px-0.5 mb-1">
                <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-200 uppercase">
                  MASTER OUTPUT
                </span>
                <button
                  onClick={onToggleMute}
                  className={`p-0.5 rounded text-xs transition cursor-pointer ${
                    isMuted ? 'text-red-400 bg-red-500/20 border border-red-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                  title={isMuted ? 'Unmute Master' : 'Mute Master'}
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between w-full gap-1.5 px-0.5">
                {/* Master Volume Knob */}
                <RotaryKnob
                  label="MASTER"
                  value={masterLevel}
                  min={0}
                  max={1}
                  step={0.02}
                  size="sm"
                  accent="amber"
                  onChange={setMasterLevel}
                />

                {/* Master Stereo Peak LED Ladders with Calibrated dB Scale & Red CLIP LEDs */}
                <div className="flex flex-col items-center bg-neutral-900/95 p-1 rounded border border-neutral-800">
                  {/* Master Top Header with Red CLIP LEDs above L & R */}
                  <div className="w-full flex items-center justify-between gap-1 pb-0.5 mb-0.5 border-b border-neutral-800/80">
                    <div className="flex items-center gap-0.5">
                      <StudioClipLed
                        isClipping={meterLevels.masterLeft >= 0.82 || meterLevels.isClip}
                        size="xs"
                        showLabel={false}
                      />
                      <span className="text-[6.5px] font-mono text-neutral-400 font-bold">L</span>
                    </div>

                    <span
                      className={`text-[6px] font-mono font-extrabold px-0.5 rounded transition-colors duration-75 uppercase ${
                        meterLevels.masterLeft >= 0.82 || meterLevels.masterRight >= 0.82 || meterLevels.isClip
                          ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_4px_#f43f5e]'
                          : 'text-neutral-500'
                      }`}
                    >
                      CLIP
                    </span>

                    <div className="flex items-center gap-0.5">
                      <span className="text-[6.5px] font-mono text-neutral-400 font-bold">R</span>
                      <StudioClipLed
                        isClipping={meterLevels.masterRight >= 0.82 || meterLevels.isClip}
                        size="xs"
                        showLabel={false}
                      />
                    </div>
                  </div>

                  {/* Dual 12-Segment Master Meters with Central dB Scale & Canvas Wave Overlay */}
                  <div className="flex items-center gap-0.5 h-16 sm:h-18">
                    <SegmentedLedMeter
                      level={meterLevels.masterLeft}
                      segments={12}
                      isMaster
                      freqBands={{
                        low: meterLevels.low * masterLevel,
                        mid: meterLevels.mid * masterLevel,
                        hi: meterLevels.hi * masterLevel,
                      }}
                      isPlaying={isPlaying}
                    />
                    <div className="flex flex-col justify-between h-full text-[5.5px] font-mono select-none px-0.5 leading-none">
                      <span className="text-rose-400 font-bold">&gt;0</span>
                      <span className="text-amber-300">+6</span>
                      <span className="text-neutral-300">0</span>
                      <span className="text-neutral-400">-6</span>
                      <span className="text-neutral-500">-15</span>
                    </div>
                    <SegmentedLedMeter
                      level={meterLevels.masterRight}
                      segments={12}
                      isMaster
                      freqBands={{
                        low: meterLevels.low * masterLevel,
                        mid: meterLevels.mid * masterLevel,
                        hi: meterLevels.hi * masterLevel,
                      }}
                      isPlaying={isPlaying}
                    />
                  </div>
                </div>

                {/* Booth Level Knob */}
                <RotaryKnob
                  label="BOOTH"
                  value={boothLevel}
                  min={0}
                  max={1}
                  step={0.02}
                  size="xs"
                  onChange={setBoothLevel}
                />
              </div>

              {/* EQ Curve Mode Toggle */}
              <div className="w-full flex items-center justify-between mt-1 pt-1 border-t border-neutral-800/70 text-[7.5px] font-mono px-0.5">
                <span className="text-neutral-400">EQ CURVE:</span>
                <button
                  onClick={() => setEqMode((prev) => (prev === 'ISOLATOR' ? 'EQ' : 'ISOLATOR'))}
                  className="px-2 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-cyan-300 font-bold hover:bg-neutral-800 transition cursor-pointer text-[7.5px]"
                >
                  {eqMode}
                </button>
              </div>
            </div>

            {/* 2. BEAT FX & DYNAMIC OLED VISUALIZER */}
            <div className="flex flex-col items-center">
              {/* Beat FX Title & Visualizer Mode Selector */}
              <div className="flex items-center justify-between w-full px-0.5 mb-1">
                <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> BEAT FX
                </span>
                
                {/* Visualizer Mode Switch Buttons */}
                <div className="flex items-center gap-0.5 bg-neutral-900 rounded p-0.2 border border-neutral-800">
                  <button
                    onClick={() => setOledMode('SPECTRUM')}
                    className={`p-0.5 rounded text-[7px] font-mono transition cursor-pointer ${
                      oledMode === 'SPECTRUM' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="FFT Spectrum Visualizer"
                  >
                    <BarChart3 className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setOledMode('OSCILLOSCOPE')}
                    className={`p-0.5 rounded text-[7px] font-mono transition cursor-pointer ${
                      oledMode === 'OSCILLOSCOPE' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Oscilloscope Waveform"
                  >
                    <Waves className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => setOledMode('BPM_FX')}
                    className={`px-1 py-0.2 rounded text-[7px] font-mono transition cursor-pointer ${
                      oledMode === 'BPM_FX' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Classic BPM HUD"
                  >
                    BPM
                  </button>
                </div>
              </div>

              {/* Blue LCD Digital Display with Embedded Real-time Visualizer */}
              <div className="w-full bg-[#030e18] border border-cyan-600/40 rounded-lg p-1.5 shadow-[inset_0_0_12px_rgba(6,182,212,0.25)] flex flex-col gap-0.5 text-cyan-400 font-mono mb-1.5 relative overflow-hidden">
                
                {/* Top status row */}
                <div className="flex items-center justify-between text-[8px] relative z-10 font-bold">
                  <span className="text-cyan-300">{activeBeatFx}</span>
                  <span className="text-cyan-400/90 text-[7px]">
                    {oledMode === 'SPECTRUM' ? 'FFT' : oledMode === 'OSCILLOSCOPE' ? 'OSC' : 'TAP'}
                  </span>
                </div>
                
                {/* Visualizer Canvas or Numeric BPM depending on mode */}
                {oledMode !== 'BPM_FX' ? (
                  <div className="relative w-full h-8 my-0.5 flex items-center justify-center bg-black/60 rounded border border-cyan-900/60 overflow-hidden">
                    <canvas
                      ref={oledCanvasRef}
                      width={180}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                    {/* BPM Badge Overlay */}
                    <div className="absolute right-1 bottom-0.5 text-[7.5px] font-mono text-cyan-300 font-bold bg-black/80 px-1 py-0.2 rounded border border-cyan-800/60">
                      {currentBpm} BPM
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between my-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold tracking-wider text-cyan-200">
                        {currentBpm}
                      </span>
                      <span className="text-[9px] text-cyan-400">BPM</span>
                    </div>

                    <div className="text-xs font-bold text-amber-400">
                      {beatFraction} BEAT
                    </div>
                  </div>
                )}

                {/* Bottom FX info row */}
                <div className="flex items-center justify-between text-[7.5px] pt-0.5 border-t border-cyan-800/40 text-cyan-400/90 relative z-10 leading-none">
                  <span>{fxTimeMs}ms</span>
                  <span>{Math.round(fxDepth * 100)}%</span>
                </div>
              </div>

              {/* Beat Fraction Buttons & TAP */}
              <div className="flex items-center justify-between w-full gap-0.5 mb-1.5">
                {(['1/4', '1/2', '3/4', '1', '2'] as const).map((bf) => (
                  <button
                    key={bf}
                    onClick={() => setBeatFraction(bf)}
                    className={`flex-1 py-0.5 rounded text-[7px] font-mono font-bold border transition cursor-pointer ${
                      beatFraction === bf
                        ? 'bg-cyan-500 text-black border-cyan-400 font-extrabold shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {bf}
                  </button>
                ))}
                <button
                  onClick={handleTap}
                  className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/40 transition cursor-pointer"
                  title="Tap Tempo"
                >
                  TAP
                </button>
              </div>

              {/* FX Selection Dial & Depth Knob */}
              <div className="w-full flex items-center justify-between gap-1 mb-1.5 px-0.5">
                {/* FX Dial Selector */}
                <div className="flex flex-col items-start min-w-0 flex-1 mr-1">
                  <span className="text-[7px] font-mono text-neutral-400 mb-0.5 uppercase font-semibold">FX</span>
                  <select
                    value={activeBeatFx}
                    onChange={(e) => setActiveBeatFx(e.target.value as BeatFxType)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 rounded px-1.5 py-1 text-[8px] font-mono font-bold cursor-pointer focus:outline-none focus:border-cyan-400 truncate"
                  >
                    {BEAT_FX_LIST.map((fx) => (
                      <option key={fx} value={fx}>
                        {fx}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level / Depth Knob */}
                <RotaryKnob
                  label="DEPTH"
                  value={fxDepth}
                  min={0}
                  max={1}
                  step={0.02}
                  size="xs"
                  accent="cyan"
                  onChange={setFxDepth}
                />
              </div>

              {/* Glowing Beat FX ON / OFF Pulsing Actuator */}
              <button
                onClick={() => setIsBeatFxOn((prev) => !prev)}
                className={`w-full py-1.5 rounded-lg text-[10px] font-mono font-extrabold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 border cursor-pointer shadow-md ${
                  isBeatFxOn
                    ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.85)] animate-pulse'
                    : 'bg-neutral-900/90 text-neutral-400 border-neutral-700 hover:text-neutral-200 hover:border-neutral-500'
                }`}
              >
                <Zap className={`w-3 h-3 ${isBeatFxOn ? 'text-black fill-current' : 'text-cyan-400'}`} />
                BEAT FX {isBeatFxOn ? 'ON' : 'OFF'}
              </button>
            </div>

          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. BOTTOM SECTION: MAGVEL CROSSFADER & CURVE CONTROLS     */}
        {/* ======================================================== */}
        <div className="mt-2.5 pt-2 border-t border-neutral-800/90 flex flex-row items-center justify-between gap-2 bg-neutral-950/70 rounded-lg p-2 sm:px-3">
          
          {/* Crossfader Curve Switcher */}
          <div className="flex items-center gap-1 text-[8px] font-mono text-neutral-400 shrink-0">
            <span className="font-bold text-neutral-200 hidden sm:inline">MAGVEL</span>
            <div className="flex items-center gap-0.5 bg-neutral-900 rounded p-0.2 border border-neutral-800 text-[7px]">
              {(['SMOOTH', 'CUT', 'THRU'] as const).map((curve) => (
                <button
                  key={curve}
                  onClick={() => setCfCurve(curve)}
                  className={`px-1 py-0.2 rounded font-bold cursor-pointer transition ${
                    cfCurve === curve ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {curve}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Magvel Crossfader Track */}
          <div className="flex-1 max-w-xs flex items-center gap-1.5 min-w-0">
            <span className="text-[8px] sm:text-[8.5px] font-mono font-bold text-cyan-400 tracking-wider shrink-0">
              CH 1
            </span>
            <div className="relative flex-1 h-6 flex items-center min-w-[80px]">
              {/* Metal Track */}
              <div className="w-full h-1.5 bg-black rounded-full border border-neutral-700 shadow-inner relative">
                {/* Center Detent Marker */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-amber-400/90" />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={crossfader}
                onChange={(e) => setCrossfader(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-10"
              />
              {/* Custom Pioneer Crossfader Cap */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-5 bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-600 rounded border border-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none transition-transform"
                style={{
                  left: `calc(${crossfader * 100}% - 12px)`,
                }}
              >
                <div className="w-0.5 h-3 bg-white shadow-sm" />
              </div>
            </div>
            <span className="text-[8px] sm:text-[8.5px] font-mono font-bold text-amber-400 tracking-wider shrink-0">
              CH 2
            </span>
          </div>

          {/* Model Specification Badge */}
          <div className="flex items-center gap-1.5 text-[8px] font-mono text-neutral-400 shrink-0">
            <span className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold text-[7px]">
              PRO DJ LINK
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};

// =========================================================================
// HIGH-PERFORMANCE SUB-COMPONENTS
// =========================================================================

/**
 * Photorealistic Pioneer DJ Rotary Knob
 * Supports dragging up/down, mouse wheel, double-click reset to center
 */
interface RotaryKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  accent?: 'blue' | 'cyan' | 'amber';
  onChange: (value: number) => void;
}

const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  size = 'md',
  accent = 'cyan',
  onChange,
}) => {
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);

  // Normalization: map value to -135deg to +135deg (270 degrees total)
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dy = startYRef.current - e.clientY; // drag up = increase
    const range = max - min;
    const delta = (dy / 100) * range;
    let nextVal = startValRef.current + delta;
    if (step) nextVal = Math.round(nextVal / step) * step;
    nextVal = Math.max(min, Math.min(max, nextVal));
    onChange(nextVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDoubleClick = () => {
    // Reset to center detent (0 for EQ/Color, or midpoint)
    if (min < 0 && max > 0) onChange(0);
    else onChange((min + max) / 2);
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const markerColor =
    accent === 'amber'
      ? 'bg-amber-400 shadow-[0_0_5px_#f59e0b]'
      : accent === 'cyan'
      ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]'
      : 'bg-white shadow-[0_0_4px_#ffffff]';

  return (
    <div className="flex flex-col items-center select-none group touch-none">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`relative ${sizeClasses} rounded-full bg-gradient-to-b from-[#33353a] via-[#202124] to-[#141517] border border-neutral-700/80 shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] cursor-ns-resize flex items-center justify-center transition-transform hover:scale-105 active:scale-95`}
        title={`${label}: ${value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)} (Double-click to reset)`}
      >
        {/* Knurled Grip Texture */}
        <div className="absolute inset-0.5 rounded-full bg-[radial-gradient(circle,_#2a2c30_40%,_#1a1b1d_100%)] pointer-events-none" />

        {/* Rotary Notch Indicator */}
        <div
          className="absolute inset-0 flex items-start justify-center pointer-events-none transition-transform duration-75"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className={`w-0.5 h-2 ${markerColor} rounded-full mt-0.5`} />
        </div>
      </div>

      <span className="text-[8.5px] font-mono tracking-wider text-neutral-400 mt-1 uppercase font-semibold">
        {label}
      </span>
    </div>
  );
};

/**
 * Pioneer DJ Vertical Channel Fader
 */
interface VerticalFaderProps {
  value: number;
  onChange: (value: number) => void;
  isActive?: boolean;
}

const VerticalFader: React.FC<VerticalFaderProps> = ({ value, onChange, isActive }) => {
  return (
    <div className="relative flex-1 h-full flex items-center justify-center">
      {/* Calibrated dB / Scale Tick Marks */}
      <div className="absolute -left-1 sm:-left-2 top-0 bottom-0 flex flex-col justify-between text-[7.5px] font-mono text-neutral-400 pointer-events-none select-none">
        <span>10</span>
        <span>7</span>
        <span>5</span>
        <span>3</span>
        <span>0</span>
      </div>

      {/* Fader Track */}
      <div className="w-2.5 sm:w-3 h-full bg-black rounded-full border border-neutral-800 shadow-inner relative flex justify-center">
        <div className="w-[1px] h-full bg-neutral-700" />
      </div>

      {/* Invisible High-Precision HTML Range Slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
        }}
      />

      {/* Pioneer Fader Cap with White Center Stripe */}
      <div
        className={`absolute w-8 sm:w-9 h-8 rounded bg-gradient-to-b from-[#40434a] via-[#2a2c31] to-[#18191c] border border-neutral-700 shadow-[0_3px_6px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-none transition-all ${
          isActive ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : ''
        }`}
        style={{
          bottom: `calc(${value * 100}% - 16px)`,
        }}
      >
        {/* White Center Guide Stripe */}
        <div className="w-full h-0.5 bg-white shadow-sm" />
      </div>
    </div>
  );
};

/**
 * Canvas-Based Flowing Wave Animation Overlay for VU Meters
 * Generates continuous organic fluid/spectral wave harmonics synchronized with audio low/mid/hi frequency bands
 */
interface VuMeterWaveOverlayProps {
  level: number;
  freqBands?: { low: number; mid: number; hi: number };
  isPlaying?: boolean;
  isMaster?: boolean;
  segments?: number;
}

const VuMeterWaveOverlay: React.FC<VuMeterWaveOverlayProps> = ({
  level,
  freqBands = { low: 0, mid: 0, hi: 0 },
  isPlaying = false,
  isMaster = false,
  segments = 12,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const sparklesRef = useRef<Array<{ x: number; y: number; vy: number; size: number; alpha: number; life: number }>>([]);
  const smoothedRef = useRef({ level: 0, low: 0, mid: 0, hi: 0 });

  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 2;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(10, rect.width || 12);
      const h = Math.max(30, rect.height || 100);

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Smoothly interpolate audio features
      const targetLevel = isPlaying ? Math.min(1.0, Math.max(0, level)) : 0;
      const targetLow = isPlaying ? Math.min(1.0, Math.max(0, freqBands.low || 0)) : 0;
      const targetMid = isPlaying ? Math.min(1.0, Math.max(0, freqBands.mid || 0)) : 0;
      const targetHi = isPlaying ? Math.min(1.0, Math.max(0, freqBands.hi || 0)) : 0;

      smoothedRef.current.level += (targetLevel - smoothedRef.current.level) * 0.28;
      smoothedRef.current.low += (targetLow - smoothedRef.current.low) * 0.22;
      smoothedRef.current.mid += (targetMid - smoothedRef.current.mid) * 0.22;
      smoothedRef.current.hi += (targetHi - smoothedRef.current.hi) * 0.25;

      const curLevel = smoothedRef.current.level;
      const curLow = smoothedRef.current.low;
      const curMid = smoothedRef.current.mid;
      const curHi = smoothedRef.current.hi;

      if (curLevel > 0.015 || isPlaying) {
        // Increment phase based on mid/low frequency speed
        const speed = 0.045 + curMid * 0.07 + curLow * 0.04;
        phaseRef.current += speed;
        const phase = phaseRef.current;

        const meterFillHeight = Math.max(2, Math.min(h, h * curLevel));
        const meterTopY = h - meterFillHeight;

        // 1. Draw glowing fluid wave aura along the active height
        const waveAmp = (1.2 + curLow * 3.2) * (w / 5);
        const waveFreq = 0.08 + curMid * 0.06;

        // Vertical harmonic color gradient based on signal intensity & frequency bands
        const grad = ctx.createLinearGradient(0, h, 0, meterTopY);
        // Base / Low register: Cyan / Emerald
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
        grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.32)');
        if (curLevel > 0.62) {
          grad.addColorStop(0.8, 'rgba(245, 158, 11, 0.5)');
        }
        if (curLevel > 0.8) {
          grad.addColorStop(1.0, 'rgba(244, 63, 94, 0.75)');
        } else {
          grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.6)');
        }

        // Left flowing wave ribbon
        ctx.beginPath();
        ctx.moveTo(w / 2, h);
        const yStep = 3;
        for (let y = h; y >= meterTopY; y -= yStep) {
          const progress = (h - y) / Math.max(1, meterFillHeight);
          const localAmp = waveAmp * Math.sin(progress * Math.PI * 0.95);
          const xOffset =
            Math.sin(y * waveFreq + phase) * localAmp +
            Math.cos(y * waveFreq * 1.7 - phase * 0.8) * (localAmp * 0.35);
          ctx.lineTo(w / 2 - w * 0.4 + xOffset, y);
        }

        // Crest wave across the top of active level
        const crestSteps = 10;
        for (let i = 0; i <= crestSteps; i++) {
          const crestX = w * 0.1 + w * 0.8 * (i / crestSteps);
          const crestWave = Math.sin(i * 0.85 + phase * 2.1) * (1.2 + curHi * 2.2);
          ctx.lineTo(crestX, meterTopY + crestWave);
        }

        // Right flowing wave ribbon returning down
        for (let y = meterTopY; y <= h; y += yStep) {
          const progress = (h - y) / Math.max(1, meterFillHeight);
          const localAmp = waveAmp * Math.sin(progress * Math.PI * 0.95);
          const xOffset =
            Math.sin(y * waveFreq + phase + Math.PI) * localAmp +
            Math.cos(y * waveFreq * 1.7 - phase * 0.8) * (localAmp * 0.35);
          ctx.lineTo(w / 2 + w * 0.4 + xOffset, y);
        }

        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. High-Frequency Crest Shimmer Line (illuminated fluid surface)
        ctx.beginPath();
        ctx.lineWidth = 1.2 + curHi * 1.2;
        ctx.strokeStyle =
          curLevel > 0.8 ? '#ff4d6d' : curLevel > 0.62 ? '#fbbf24' : '#38bdf8';
        ctx.shadowColor =
          curLevel > 0.8 ? '#f43f5e' : curLevel > 0.62 ? '#f59e0b' : '#06b6d4';
        ctx.shadowBlur = 4 + curHi * 4;

        for (let i = 0; i <= 10; i++) {
          const x = w * 0.08 + w * 0.84 * (i / 10);
          const waveY = meterTopY + Math.sin(i * 0.9 + phase * 2.2) * (1.0 + curHi * 2.0);
          if (i === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Subtle Particle Glints / Energy Quanta on high peaks
        if (curHi > 0.28 || curLevel > 0.65) {
          if (Math.random() < 0.22 + curHi * 0.35) {
            sparklesRef.current.push({
              x: w * 0.2 + Math.random() * (w * 0.6),
              y: meterTopY + (Math.random() * 4 - 2),
              vy: -(0.35 + Math.random() * 0.7 + curHi * 0.5),
              size: 0.8 + Math.random() * 1.0 + curHi * 0.6,
              alpha: 0.85,
              life: 1.0,
            });
          }
        }

        // Render and update sparkles
        for (let i = sparklesRef.current.length - 1; i >= 0; i--) {
          const p = sparklesRef.current[i];
          p.y += p.vy;
          p.life -= 0.045;
          if (p.life <= 0 || p.y < meterTopY - 14) {
            sparklesRef.current.splice(i, 1);
            continue;
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * p.life})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, level, freqBands, isMaster, segments]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded opacity-90 mix-blend-screen z-10"
    />
  );
};

/**
 * Realistic Segmented Multi-Color LED VU Meter with Frequency Awareness, Peak-Hold & Canvas Wave Overlay
 */
interface SegmentedLedMeterProps {
  level: number; // 0 to 1.0
  segments?: number;
  isMaster?: boolean;
  freqBands?: { low: number; mid: number; hi: number };
  isPlaying?: boolean;
}

const SegmentedLedMeter: React.FC<SegmentedLedMeterProps> = ({
  level,
  segments = 12,
  isMaster = false,
  freqBands,
  isPlaying = false,
}) => {
  const peakHoldRef = useRef<{ val: number; lastTime: number }>({ val: 0, lastTime: 0 });
  const [peakSegment, setPeakSegment] = useState<number>(0);

  const activeCount = Math.round(level * segments);

  useEffect(() => {
    const now = Date.now();
    if (activeCount >= peakHoldRef.current.val) {
      peakHoldRef.current = { val: activeCount, lastTime: now };
      setPeakSegment(activeCount);
    } else {
      if (now - peakHoldRef.current.lastTime > 450) {
        // Drop peak hold slowly
        peakHoldRef.current.val = Math.max(0, peakHoldRef.current.val - 1);
        peakHoldRef.current.lastTime = now - 350;
        setPeakSegment(peakHoldRef.current.val);
      }
    }
  }, [activeCount]);

  return (
    <div className="relative flex flex-col-reverse justify-between gap-[2px] h-full py-1 px-0.5">
      {/* Canvas-Based Flowing Wave Animation Overlay */}
      <VuMeterWaveOverlay
        level={level}
        freqBands={freqBands}
        isPlaying={isPlaying}
        isMaster={isMaster}
        segments={segments}
      />

      {/* Discrete Physical LED Segments */}
      {Array.from({ length: segments }).map((_, idx) => {
        const isActive = idx < activeCount;
        const isPeak = idx === peakSegment - 1 && peakSegment > activeCount;
        
        // Color mapping: Top 2 are Red (Clip), next 3 are Amber (+dB), rest Green
        const isRed = idx >= segments - 2;
        const isAmber = idx >= segments - 5 && !isRed;

        let activeColor = 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
        let inactiveColor = 'bg-emerald-950/60';

        if (isRed) {
          activeColor = 'bg-rose-500 shadow-[0_0_6px_#f43f5e]';
          inactiveColor = 'bg-rose-950/60';
        } else if (isAmber) {
          activeColor = 'bg-amber-400 shadow-[0_0_6px_#f59e0b]';
          inactiveColor = 'bg-amber-950/60';
        }

        return (
          <div
            key={idx}
            className={`w-1.5 sm:w-2 h-1 rounded-[1px] transition-colors duration-75 relative z-0 ${
              isActive || isPeak ? activeColor : inactiveColor
            }`}
          />
        );
      })}
    </div>
  );
};

/**
 * Studio-Grade High-Visibility Red CLIP / Overdrive LED Indicator
 * Featuring realistic fast-attack, peak-hold decay, and optical chassis ring bezel
 */
interface StudioClipLedProps {
  isClipping: boolean;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  orientation?: 'horizontal' | 'vertical';
  showLabel?: boolean;
}

const StudioClipLed: React.FC<StudioClipLedProps> = ({
  isClipping,
  label = 'CLIP',
  size = 'sm',
  orientation = 'vertical',
  showLabel = true,
}) => {
  const [isLit, setIsLit] = useState<boolean>(false);
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isClipping) {
      setIsLit(true);
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
      }
      decayTimerRef.current = setTimeout(() => {
        setIsLit(false);
      }, 260); // 260ms authentic hardware peak-hold decay
    }
  }, [isClipping]);

  const sizeClasses = {
    xs: {
      led: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
      core: 'w-0.5 h-0.5',
      text: 'text-[6px] sm:text-[6.5px]',
    },
    sm: {
      led: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
      core: 'w-1 h-1',
      text: 'text-[7px] sm:text-[7.5px]',
    },
    md: {
      led: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      core: 'w-1.5 h-1.5',
      text: 'text-[8px] sm:text-[8.5px]',
    },
  }[size];

  return (
    <div
      className={`flex items-center select-none pointer-events-none transition-all ${
        orientation === 'vertical' ? 'flex-col justify-center gap-0.5' : 'flex-row justify-center gap-1'
      }`}
    >
      {/* Studio LED Jewel with Metallic Recessed Bezel */}
      <div
        className={`relative ${sizeClasses.led} rounded-full border flex items-center justify-center transition-all duration-75 ${
          isLit
            ? 'bg-[#ff1e38] border-rose-200 shadow-[0_0_10px_#ff1e38,0_0_20px_rgba(255,30,56,0.85),inset_0_0_3px_#ffffff] scale-110 ring-1 ring-rose-500/80'
            : 'bg-[#22070a] border-[#380e13] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]'
        }`}
      >
        {/* Core filament specular reflection */}
        <div
          className={`${sizeClasses.core} rounded-full transition-opacity ${
            isLit ? 'bg-white opacity-95 shadow-[0_0_2px_#ffffff]' : 'bg-rose-950/40 opacity-20'
          }`}
        />
      </div>

      {showLabel && (
        <span
          className={`font-mono font-black tracking-widest uppercase leading-none transition-colors duration-75 ${sizeClasses.text} ${
            isLit
              ? 'text-rose-400 font-extrabold drop-shadow-[0_0_6px_rgba(244,63,94,0.95)]'
              : 'text-neutral-500'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

