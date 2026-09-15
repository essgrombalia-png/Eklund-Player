import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react';
import {
  Mic2,
  X,
  Search,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Music,
  FileEdit,
  Check,
  Globe,
  Plus,
} from 'lucide-react';
import { LyricsLine, MediaItem } from '../../types';
import {
  fetchLyricsForTrack,
  getActiveLyricIndex,
  searchLyricsOnline,
  bindCustomLyricsToTrack,
  LrcLibTrackItem,
} from '../../services/lyricsService';

interface VinylLyricsOverlayProps {
  currentTrack: MediaItem | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  accentColor?: string;
  onSeek: (seconds: number) => void;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'full' | 'hud';
  onToggleMode?: () => void;
}

export const VinylLyricsOverlay = ({
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  accentColor = '#f59e0b',
  onSeek,
  isOpen,
  onClose,
  mode = 'full',
  onToggleMode,
}: VinylLyricsOverlayProps) => {
  const [lyricsData, setLyricsData] = useState<{
    lines: LyricsLine[];
    isSynced: boolean;
    source: 'embedded' | 'network' | 'custom' | 'none';
  }>({
    lines: [],
    isSynced: false,
    source: 'none',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncOffset, setSyncOffset] = useState<number>(0); // in seconds
  const [userScrolled, setUserScrolled] = useState(false);
  const [showOffsetControls, setShowOffsetControls] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'search' | 'paste'>('lyrics');

  // Online search state
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LrcLibTrackItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Custom paste lyrics state
  const [pastedLyricsText, setPastedLyricsText] = useState('');
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Fetch or load lyrics when currentTrack changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData({ lines: [], isSynced: false, source: 'none' });
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadLyrics() {
      setIsLoading(true);
      try {
        const result = await fetchLyricsForTrack(currentTrack!, controller.signal);
        if (isMounted) {
          setLyricsData({
            lines: result.lines,
            isSynced: result.isSynced,
            source: result.source,
          });
        }
      } catch {
        if (isMounted) {
          setLyricsData({ lines: [], isSynced: false, source: 'none' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLyrics();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentTrack]);

  // Pre-fill search query when opening search tab
  useEffect(() => {
    if (currentTrack && !onlineSearchQuery) {
      const initial = currentTrack.artist && currentTrack.artist !== 'Vinyl Import'
        ? `${currentTrack.artist} ${currentTrack.title}`
        : currentTrack.title;
      setOnlineSearchQuery(initial);
    }
  }, [currentTrack]);

  // Compute active lyric line index based on current playback time + offset
  const activeIndex = useMemo(() => {
    return getActiveLyricIndex(lyricsData.lines, currentTime, syncOffset);
  }, [lyricsData.lines, currentTime, syncOffset]);

  const activeLine = activeIndex >= 0 ? lyricsData.lines[activeIndex] : null;
  const nextLine =
    activeIndex >= 0 && activeIndex + 1 < lyricsData.lines.length
      ? lyricsData.lines[activeIndex + 1]
      : null;
  const upcomingLine2 =
    activeIndex >= 0 && activeIndex + 2 < lyricsData.lines.length
      ? lyricsData.lines[activeIndex + 2]
      : null;

  // Auto-scroll active lyric into view
  useEffect(() => {
    if (userScrolled || activeIndex === -1 || mode !== 'full' || activeTab !== 'lyrics') return;
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, userScrolled, mode, activeTab]);

  const handleScroll = () => {
    setUserScrolled(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolled(false);
    }, 4500);
  };

  // Filter lines if user searches within lyrics
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lyricsData.lines;
    const q = searchQuery.toLowerCase();
    return lyricsData.lines.filter((l) => l.text.toLowerCase().includes(q));
  }, [lyricsData.lines, searchQuery]);

  const handleManualRefresh = async () => {
    if (!currentTrack) return;
    setIsLoading(true);
    try {
      const result = await fetchLyricsForTrack(currentTrack);
      setLyricsData({
        lines: result.lines,
        isSynced: result.isSynced,
        source: result.source,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteOnlineSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!onlineSearchQuery.trim()) return;
    setIsSearchingOnline(true);
    try {
      const results = await searchLyricsOnline(onlineSearchQuery);
      setSearchResults(results);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleSelectSearchResult = (item: LrcLibTrackItem) => {
    if (!currentTrack) return;
    const raw = item.syncedLyrics || item.plainLyrics || '';
    if (!raw) return;

    const parsed = bindCustomLyricsToTrack(currentTrack.id, raw);
    setLyricsData({
      lines: parsed.lines,
      isSynced: parsed.isSynced,
      source: 'custom',
    });
    setActiveTab('lyrics');
  };

  const handleSavePastedLyrics = () => {
    if (!currentTrack || !pastedLyricsText.trim()) return;
    const parsed = bindCustomLyricsToTrack(currentTrack.id, pastedLyricsText.trim());
    setLyricsData({
      lines: parsed.lines,
      isSynced: parsed.isSynced,
      source: 'custom',
    });
    setPasteSuccess(true);
    setTimeout(() => {
      setPasteSuccess(false);
      setActiveTab('lyrics');
    }, 600);
  };

  if (!isOpen) return null;

  // --- 1. COMPACT FLOATING KARAOKE HUD MODE ---
  if (mode === 'hud') {
    return (
      <div
        id="turntable-lyrics-hud"
        className="absolute bottom-4 left-4 right-4 z-40 bg-neutral-950/90 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto"
        style={{
          boxShadow: `0 12px 36px rgba(0,0,0,0.8), 0 0 20px ${accentColor}33`,
        }}
      >
        <div className="flex flex-col gap-1.5">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[10px] font-mono text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-amber-300">LIVE LYRICS</span>
              {lyricsData.isSynced && (
                <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  SYNCED
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onToggleMode && (
                <button
                  onClick={onToggleMode}
                  className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-[9px]"
                  title="Expand to Full Lyrics Stage"
                >
                  <ChevronUp className="w-3 h-3 text-amber-400" /> Expand
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active Sing-Along & Upcoming Lines */}
          <div className="py-1 text-center min-h-[56px] flex flex-col items-center justify-center space-y-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-amber-300 font-mono animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching synchronized lyrics...
              </div>
            ) : activeLine ? (
              <div className="w-full flex flex-col items-center space-y-1">
                {/* Active Line - Highlighted with Accent Color & Background Backdrop */}
                <p
                  onClick={() => activeLine.time >= 0 && onSeek(activeLine.time)}
                  className="text-base sm:text-lg font-extrabold tracking-wide transition-all duration-300 cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] hover:scale-105 px-3 py-1 rounded-xl"
                  style={{
                    color: accentColor || '#fef08a',
                    backgroundColor: `${accentColor || '#f59e0b'}1f`,
                    borderColor: `${accentColor || '#f59e0b'}50`,
                    borderWidth: '1px',
                    textShadow: `0 0 16px ${accentColor || '#f59e0b'}88, 0 2px 4px rgba(0,0,0,0.95)`,
                  }}
                >
                  {activeLine.text}
                </p>

                {/* Upcoming Line 1 - Subtle Fade-In */}
                {nextLine && (
                  <p
                    onClick={() => nextLine.time >= 0 && onSeek(nextLine.time)}
                    className="text-xs sm:text-sm font-semibold text-neutral-200/90 truncate max-w-full cursor-pointer transition-all duration-500 ease-out animate-fade-in drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:text-white"
                  >
                    <span className="text-[9px] font-mono text-amber-400/80 uppercase mr-1">UPCOMING:</span>
                    {nextLine.text}
                  </p>
                )}

                {/* Upcoming Line 2 - Softer Subtle Fade-In */}
                {upcomingLine2 && (
                  <p
                    onClick={() => upcomingLine2.time >= 0 && onSeek(upcomingLine2.time)}
                    className="text-[11px] font-medium text-neutral-400/70 truncate max-w-full cursor-pointer transition-all duration-700 ease-out animate-fade-in drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] hover:text-neutral-200 hidden sm:block"
                  >
                    {upcomingLine2.text}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-neutral-400 italic">
                  {lyricsData.lines.length > 0 ? '♪ (Instrumental passage)' : 'No synchronized lyrics loaded'}
                </p>
                {onToggleMode && lyricsData.lines.length === 0 && (
                  <button
                    onClick={onToggleMode}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                  >
                    <Search className="w-2.5 h-2.5" /> Search / Add Lyrics
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 2. FULL IMMERSIVE TURNTABLE LYRICS STAGE OVERLAY ---
  return (
    <div
      id="turntable-lyrics-stage"
      className="absolute inset-0 rounded-2xl z-40 overflow-hidden bg-neutral-950/92 backdrop-blur-md border-2 border-amber-400/60 p-4 sm:p-5 flex flex-col justify-between select-none shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      style={{
        boxShadow: `0 25px 60px rgba(0,0,0,0.95), inset 0 0 40px rgba(0,0,0,0.8), 0 0 35px ${accentColor}40`,
      }}
    >
      {/* Top Controls & Metadata Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-lg flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-neutral-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-black uppercase tracking-wider text-amber-300">
                Technics Live Lyrics
              </span>
              {lyricsData.isSynced && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> SYNCED
                </span>
              )}
              {lyricsData.source && lyricsData.source !== 'none' && (
                <span className="text-[9px] font-mono text-neutral-400 hidden sm:inline">
                  {lyricsData.source === 'custom' ? 'Custom LRC' : lyricsData.source === 'embedded' ? 'ID3 Tag' : 'LRCLIB Online'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-300 font-medium truncate max-w-[180px] sm:max-w-xs">
              {currentTrack ? `${currentTrack.title} — ${currentTrack.artist || 'Unknown'}` : 'No track playing'}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Navigation Tabs */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`px-2 py-1 rounded-md transition ${
                activeTab === 'lyrics' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Lyrics
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                activeTab === 'search' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" /> Search
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                activeTab === 'paste' ? 'bg-amber-400 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileEdit className="w-3 h-3" /> Paste LRC
            </button>
          </div>

          {/* Sync timing offset toggle */}
          <button
            onClick={() => setShowOffsetControls(!showOffsetControls)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
              showOffsetControls || syncOffset !== 0
                ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title="Adjust Lyric Sync Timing Offset"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Manual Refetch */}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition disabled:opacity-50"
            title="Auto-fetch latest lyrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Mode switch to Compact HUD */}
          {onToggleMode && (
            <button
              onClick={onToggleMode}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition"
              title="Minimize to Floating HUD"
            >
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}

          {/* Close Overlay */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900/90 hover:bg-red-500/20 border border-neutral-700 hover:border-red-500/50 text-neutral-300 hover:text-white transition"
            title="Close Lyrics Overlay"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Offset Calibration Drawer */}
      {showOffsetControls && (
        <div className="flex items-center justify-between gap-3 bg-neutral-900/95 border border-amber-500/40 rounded-xl p-2.5 my-2 z-20">
          <div className="text-[11px] font-mono text-amber-300">
            Timing Offset:{' '}
            <span className="font-bold">{syncOffset > 0 ? `+${syncOffset.toFixed(2)}s` : `${syncOffset.toFixed(2)}s`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSyncOffset((prev) => Math.round((prev - 0.5) * 10) / 10)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-mono text-neutral-200"
            >
              -0.5s Earlier
            </button>
            <button
              onClick={() => setSyncOffset(0)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-mono text-neutral-300"
            >
              Reset 0s
            </button>
            <button
              onClick={() => setSyncOffset((prev) => Math.round((prev + 0.5) * 10) / 10)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-mono text-neutral-200"
            >
              +0.5s Later
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: MAIN REAL-TIME SYNCHRONIZED LYRICS DISPLAY         */}
      {/* ========================================================= */}
      {activeTab === 'lyrics' && (
        <>
          {/* Quick Filter Bar */}
          <div className="relative my-2 z-10">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter current lyrics..."
              className="w-full pl-9 pr-8 py-1 text-xs rounded-xl bg-neutral-900/90 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lyrics Scrollable Body */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto space-y-4 py-4 px-3 scroll-smooth z-10 min-h-0"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3 text-neutral-400">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-sm font-mono text-amber-200">Searching synchronized database...</p>
              </div>
            ) : filteredLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3 text-neutral-400">
                <Music className="w-10 h-10 text-neutral-600 animate-pulse" />
                <p className="text-base font-medium text-neutral-300">No synchronized lyrics loaded</p>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Search online by artist/title or paste custom LRC timestamped lyrics.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <Globe className="w-3.5 h-3.5" /> Search Online
                  </button>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-300 text-xs font-mono font-bold flex items-center gap-1.5"
                  >
                    <FileEdit className="w-3.5 h-3.5" /> Paste LRC
                  </button>
                </div>
              </div>
            ) : (
              filteredLines.map((line, idx) => {
                const originalIndex = lyricsData.lines.indexOf(line);
                const isActive = lyricsData.isSynced && originalIndex === activeIndex;
                const isPassed = lyricsData.isSynced && activeIndex !== -1 && originalIndex < activeIndex;
                const isUpcoming = lyricsData.isSynced && activeIndex !== -1 && originalIndex > activeIndex;
                const upcomingDistance = isUpcoming ? originalIndex - activeIndex : 0;

                const formatLineTime = (t: number) => {
                  if (t < 0) return '';
                  const m = Math.floor(t / 60);
                  const s = Math.floor(t % 60);
                  return `${m}:${s.toString().padStart(2, '0')}`;
                };

                let opacityStyle = {};
                let containerClass = 'hover:bg-white/5 border-transparent opacity-70 hover:opacity-100';

                if (isActive) {
                  containerClass = 'scale-[1.02] shadow-xl border-l-4 my-2 opacity-100 backdrop-blur-md';
                } else if (isPassed) {
                  containerClass = 'opacity-35 hover:opacity-85 hover:bg-white/5 border-transparent';
                } else if (isUpcoming) {
                  if (upcomingDistance === 1) {
                    containerClass = 'opacity-90 hover:opacity-100 hover:bg-white/10 border-transparent transition-all duration-500 ease-out';
                  } else if (upcomingDistance === 2) {
                    containerClass = 'opacity-65 hover:opacity-90 hover:bg-white/5 border-transparent transition-all duration-700 ease-out';
                  } else if (upcomingDistance === 3) {
                    containerClass = 'opacity-45 hover:opacity-80 hover:bg-white/5 border-transparent transition-all duration-700 ease-out';
                  } else {
                    containerClass = 'opacity-30 hover:opacity-70 hover:bg-white/5 border-transparent transition-all duration-700 ease-out';
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
                    className={`group flex items-start gap-3.5 transition-all duration-500 ease-out cursor-pointer rounded-xl p-3 border ${containerClass}`}
                    style={{
                      backgroundColor: isActive ? `${accentColor}22` : undefined,
                      borderColor: isActive ? accentColor : undefined,
                      boxShadow: isActive ? `0 4px 20px ${accentColor}35, 0 2px 8px rgba(0,0,0,0.9)` : undefined,
                    }}
                  >
                    {line.time >= 0 && (
                      <span
                        className={`text-[11px] font-mono pt-1 transition-colors select-none shrink-0 ${
                          isActive ? 'font-bold' : 'text-neutral-500 group-hover:text-neutral-300'
                        }`}
                        style={{ color: isActive ? accentColor : undefined }}
                      >
                        {formatLineTime(line.time)}
                      </span>
                    )}

                    <p
                      className={`flex-1 transition-all duration-300 leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${
                        isActive
                          ? 'text-xl sm:text-2xl font-extrabold tracking-tight'
                          : isUpcoming && upcomingDistance === 1
                          ? 'text-lg sm:text-xl font-semibold'
                          : 'text-base sm:text-lg font-medium'
                      }`}
                      style={{
                        color: isActive ? accentColor : isPassed ? '#9ca3af' : '#e5e7eb',
                        textShadow: isActive
                          ? `0 0 20px ${accentColor}aa, 0 2px 6px rgba(0,0,0,0.95)`
                          : '0 1px 3px rgba(0,0,0,0.9)',
                      }}
                    >
                      {line.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ONLINE LRCLIB SEARCH                               */}
      {/* ========================================================= */}
      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col py-3 space-y-3 min-h-0 z-10">
          <form onSubmit={handleExecuteOnlineSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={onlineSearchQuery}
                onChange={(e) => setOnlineSearchQuery(e.target.value)}
                placeholder="Search song title and artist (e.g. Adele Hello, Queen Bohemian Rhapsody)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingOnline}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isSearchingOnline ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
          </form>

          {/* Search Results List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {isSearchingOnline ? (
              <div className="text-center py-8 text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> Searching open lyrics database...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                Enter a track title and artist name above and press Search to find synchronized LRC lyrics.
              </div>
            ) : (
              searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item)}
                  className="p-3 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/60 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-amber-300 truncate">
                        {item.trackName || item.name}
                      </span>
                      {item.syncedLyrics && (
                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                          SYNCED LRC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {item.artistName} {item.albumName ? `• ${item.albumName}` : ''}
                    </p>
                  </div>
                  <button className="px-3 py-1 rounded-lg bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-neutral-950 font-mono font-bold text-xs transition shrink-0">
                    Apply
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CUSTOM PASTE / EDIT LRC LYRICS                     */}
      {/* ========================================================= */}
      {activeTab === 'paste' && (
        <div className="flex-1 flex flex-col py-3 space-y-3 min-h-0 z-10">
          <p className="text-xs text-neutral-400">
            Paste timestamped LRC lyrics (e.g.{' '}
            <code className="text-amber-300 bg-neutral-900 px-1 py-0.5 rounded">[00:12.34] Verse text</code>) or plain
            lyrics:
          </p>
          <textarea
            value={pastedLyricsText}
            onChange={(e) => setPastedLyricsText(e.target.value)}
            placeholder="[00:14.20] First line of the song...&#10;[00:18.50] Second line of the song..."
            className="flex-1 w-full p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-400 resize-none min-h-[140px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 font-mono">
              Lyrics are saved and synchronized to this track ID.
            </span>
            <button
              onClick={handleSavePastedLyrics}
              disabled={!pastedLyricsText.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition ${
                pasteSuccess
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-40'
              }`}
            >
              {pasteSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {pasteSuccess ? 'Saved & Synced!' : 'Save & Sync Lyrics'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Status & Resume Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-neutral-400 font-mono z-10">
        <div>
          {userScrolled && lyricsData.isSynced && activeTab === 'lyrics' && (
            <button
              onClick={() => {
                setUserScrolled(false);
                if (activeLineRef.current) {
                  activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Resume Auto-Scroll
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Click any line to jump turntable needle</span>
        </div>
      </div>
    </div>
  );
};
