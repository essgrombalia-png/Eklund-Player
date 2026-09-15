import { Disc, Sparkles, Music } from 'lucide-react';

interface DropZoneOverlayProps {
  isDragging?: boolean;
  isVisible?: boolean;
}

export const DropZoneOverlay = ({ isDragging, isVisible }: DropZoneOverlayProps) => {
  const active = Boolean(isDragging ?? isVisible);
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-8 bg-neutral-950/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-2xl aspect-[16/9] rounded-3xl border-2 border-dashed border-amber-400 bg-amber-950/20 p-8 flex flex-col items-center justify-center text-center shadow-[0_0_80px_rgba(245,158,11,0.25)]">
        {/* Animated pulsating ring */}
        <div className="absolute inset-4 rounded-2xl border border-amber-500/30 animate-pulse pointer-events-none" />

        <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/30">
          <Disc className="w-10 h-10 animate-spin" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
          Drop Vinyl Records Directly Onto Platter
        </h2>
        <p className="text-sm text-neutral-300 mt-2 max-w-md">
          Instantly drops audio files onto the Technics turntable with real-time waveform & groove tracking.
        </p>

        {/* Supported badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-neutral-900/80 border border-neutral-700 text-amber-300">
            <Music className="w-3.5 h-3.5" /> MP3, WAV, FLAC, OGG, M4A, AAC
          </span>
        </div>
      </div>
    </div>
  );
};
