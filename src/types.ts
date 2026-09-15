export type MediaType = 'music';

export interface AudioSettings {
  volume: number;
  isMuted: boolean;
  crossfadeDuration: number;
  vinylSpeed: 33 | 45 | 78;
  tonearmSmoothness: number;
  equalizerEnabled: boolean;
  reverbEnabled: boolean;
  vinylCrackleEnabled?: boolean;
  vinylCrackleVolume?: number;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  artwork: string;
  backdrop?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  duration: number; // in seconds
  bpm?: number; // Beats Per Minute (automated detection or ID3 tag)
  trackNumber?: number;
  discNumber?: number;
  description?: string;
  audioFormat?: string;
  bitrate?: string;
  sampleRate?: string;
  lyrics?: string; // LRC formatted or plain text
  isFavorite?: boolean;
  isLocal?: boolean;
  addedAt: number;
  lastPlayedAt?: number;
  playCount?: number;
  resumePosition?: number;
  season?: number;
  episode?: number;
  colorAccent?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  items: string[]; // array of MediaItem ids
  createdAt: number;
  updatedAt: number;
}

export interface LyricsLine {
  time: number; // in seconds
  text: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type VisualizerMode = 
  | 'bars'
  | 'circular'
  | 'waveform'
  | 'oscilloscope'
  | 'minimal'
  | 'vinyl-reactive'
  | 'vinyl-heatmap';

export type ThemeMode = 'dark' | 'oled' | 'midnight' | 'purple-neon' | 'cinema' | 'light';

export interface EQBandConfig {
  frequency: number;
  label: string;
}

export const EQ_FREQUENCIES: EQBandConfig[] = [
  { frequency: 32, label: '32Hz' },
  { frequency: 64, label: '64Hz' },
  { frequency: 125, label: '125Hz' },
  { frequency: 250, label: '250Hz' },
  { frequency: 500, label: '500Hz' },
  { frequency: 1000, label: '1kHz' },
  { frequency: 2000, label: '2kHz' },
  { frequency: 4000, label: '4kHz' },
  { frequency: 8000, label: '8kHz' },
  { frequency: 16000, label: '16kHz' },
];

export interface EQSettings {
  bands: number[]; // 10 gain values in dB (-12 to +12)
  preamp: number; // dB (-12 to +12)
  bass: number; // dB
  treble: number; // dB
  balance: number; // -1 (left) to +1 (right)
  loudness: boolean;
  preset: string;
}

export interface AudioEnhancements {
  bassBoost: boolean;
  loudnessNorm: boolean;
  crossfade: number; // in seconds
  gapless: boolean;
  mono: boolean;
  spatialPlaceholder: boolean;
  compressor: boolean;
}

export interface PlaybackHistoryEntry {
  id: string;
  mediaId: string;
  timestamp: number;
  completed: boolean;
  stoppedAt: number;
  duration: number;
}

export type SlipmatMaterial = 'felt' | 'rubber' | 'cork' | 'leather' | 'holographic' | 'custom';

export type SlipmatPatternType =
  | 'technics-felt-classic'
  | 'technics-rubber-ribbed'
  | 'organic-cork'
  | 'tokyo-neon-grid'
  | 'hypnotic-spiral'
  | 'luxury-white-leather'
  | 'prismatic-hologram'
  | 'cosmic-marble'
  | 'retro-sunset-grooves'
  | 'custom-image';

export type VinylDisplayMode =
  | 'picture-disc'
  | 'clear-crystal'
  | 'smoke-translucent'
  | 'classic-black'
  | 'bare-platter';

export interface SlipmatDesign {
  id: string;
  name: string;
  material: SlipmatMaterial;
  patternType: SlipmatPatternType;
  description: string;
  acousticProfile: string;
  thickness: string;
  badgeLabel?: string;
  customImageUrl?: string;
  customColor?: string;
  customAccentColor?: string;
  logoStyle?: 'technics-gold' | 'technics-silver' | 'none' | 'monogram';
  strobeRings?: boolean;
}

export interface SlipmatConfig {
  activeDesignId: string;
  vinylDisplayMode: VinylDisplayMode;
  slipmatOpacity: number; // 0.5 to 1.0
  customImageUrl?: string;
  customColor?: string;
  customAccentColor?: string;
  customScale?: number;
}
