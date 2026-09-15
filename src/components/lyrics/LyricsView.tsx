import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, X, Music2, RefreshCw } from 'lucide-react';
import { LyricsLine, MediaItem } from '../../types';
import { fetchLyricsForTrack, parseLrcLyrics, getActiveLyricIndex } from '../../services/lyricsService';

interface LyricsViewProps {
  lyricsRaw?: string;
  currentTrack?: MediaItem | null;
  currentTime: number;
  onSeek: (time: number) => void;
  isCompact?: boolean;
  accentColor?: string;
  onClose?: () => void;
}

export const LyricsView = ({
  lyricsRaw,
  currentTrack,
  currentTime,
  onSeek,
  isCompact = false,
  accentColor = '#06b6d4',
  onClose,
}: LyricsViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userScrolled, setUserScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedLyrics, setFetchedLyrics] = useState<{
    lines: LyricsLine[];
    isSynced: boolean;
  }>({ lines: [], isSynced: false });
  const scrollTimeoutRef = useRef<number | null>(null);

  // Fetch or parse lyrics when lyricsRaw or currentTrack changes
  useEffect(() => {
    if (lyricsRaw && lyricsRaw.trim()) {
      setFetchedLyrics(parseLrcLyrics(lyricsRaw));
      return;
    }

    if (currentTrack) {
      let isMounted = true;
      setIsLoading(true);
      fetchLyricsForTrack(currentTrack)
        .then((res) => {
          if (isMounted) {
            setFetchedLyrics({ lines: res.lines, isSynced: res.isSynced });
          }
        })
        .catch(() => {
          if (isMounted) {
            setFetchedLyrics({ lines: [], isSynced: false });
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setFetchedLyrics({ lines: [], isSynced: false });
    }
  }, [lyricsRaw, currentTrack]);

  const { lines, isSynced } = fetchedLyrics;

  // Find active line index based on current playback time
  const activeIndex = useMemo(() => {
    if (!isSynced || lines.length === 0) return -1;
    return getActiveLyricIndex(lines, currentTime);
  }, [lines, isSynced, currentTime]);

  // Auto-scroll active lyric into view
  useEffect(() => {
    if (userScrolled || activeIndex === -1) return;
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, userScrolled]);

  // Handle user manual scroll: temporarily pause auto-scroll, then resume after 4s
  const handleScroll = () => {
    setUserScrolled(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolled(false);
    }, 4000);
  };

  // Filter lines if user searches within lyrics
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines;
    const q = searchQuery.toLowerCase();
    return lines.filter((l) => l.text.toLowerCase().includes(q));
  }, [lines, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-neutral-400">
        <RefreshCw className="w-8 h-8 mb-3 text-amber-400 animate-spin" />
        <p className="text-sm font-mono text-neutral-300">Searching synchronized lyrics...</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-neutral-400">
        <Music2 className="w-12 h-12 mb-3 text-neutral-600 animate-pulse" />
        <p className="text-lg font-medium text-neutral-300">No lyrics available</p>
        <p className="text-xs text-neutral-500 mt-1">Enjoy the instrumental performance or load custom LRC</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full select-none ${
        isCompact ? 'p-4' : 'p-6 max-w-3xl mx-auto'
      }`}
    >
      {/* Header bar with Search & Mode controls */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-neutral-400">
            {isSynced ? 'Synchronized Lyrics' : 'Standard Lyrics'}
          </span>
          {isSynced && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live sync" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lyrics..."
              className="pl-8 pr-3 py-1 text-xs rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500 w-32 focus:w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lyrics Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 py-8 px-2 scroll-smooth"
      >
        {filteredLines.map((line, idx) => {
          const originalIndex = lines.indexOf(line);
          const isActive = isSynced && originalIndex === activeIndex;
          const isPassed = isSynced && activeIndex !== -1 && originalIndex < activeIndex;
          const isUpcoming = isSynced && activeIndex !== -1 && originalIndex > activeIndex;
          const upcomingDistance = isUpcoming ? originalIndex - activeIndex : 0;

          let containerClass = 'text-lg sm:text-xl font-medium text-neutral-300 opacity-70 hover:opacity-100 hover:text-neutral-100';

          if (isActive) {
            containerClass = 'text-2xl sm:text-3xl font-extrabold scale-[1.02] origin-left opacity-100 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-2xl';
          } else if (isPassed) {
            containerClass = 'text-lg sm:text-xl font-medium text-neutral-400 opacity-35 hover:opacity-85 hover:text-neutral-200';
          } else if (isUpcoming) {
            if (upcomingDistance === 1) {
              containerClass = 'text-xl sm:text-2xl font-semibold text-neutral-100 opacity-90 hover:opacity-100 transition-all duration-500 ease-out';
            } else if (upcomingDistance === 2) {
              containerClass = 'text-lg sm:text-xl font-medium text-neutral-200 opacity-65 hover:opacity-90 transition-all duration-700 ease-out';
            } else if (upcomingDistance === 3) {
              containerClass = 'text-lg sm:text-xl font-medium text-neutral-300 opacity-45 hover:opacity-80 transition-all duration-700 ease-out';
            } else {
              containerClass = 'text-lg sm:text-xl font-medium text-neutral-400 opacity-30 hover:opacity-70 transition-all duration-700 ease-out';
            }
          }

          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              onClick={() => {
                if (line.time >= 0) {
                  onSeek(line.time);
                }
              }}
              className={`transition-all duration-500 ease-out cursor-pointer p-3 rounded-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${containerClass}`}
              style={{
                color: isActive ? accentColor : undefined,
                backgroundColor: isActive ? `${accentColor}20` : undefined,
                borderColor: isActive ? `${accentColor}50` : 'transparent',
                textShadow: isActive
                  ? `0 0 24px ${accentColor}aa, 0 2px 6px rgba(0,0,0,0.95)`
                  : '0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Auto-scroll resume hint if user scrolled */}
      {userScrolled && isSynced && (
        <div className="pt-2 text-center">
          <button
            onClick={() => {
              setUserScrolled(false);
              if (activeLineRef.current) {
                activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3 py-1 rounded-full text-[11px] bg-neutral-800/90 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 transition"
          >
            Jump to current line
          </button>
        </div>
      )}
    </div>
  );
};
