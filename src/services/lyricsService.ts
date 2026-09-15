import { LyricsLine, MediaItem } from '../types';

export interface LrcLibTrackItem {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

// In-memory cache for fetched lyrics
const lyricsCache = new Map<string, { raw: string; lines: LyricsLine[]; isSynced: boolean }>();

/**
 * Parse standard LRC format string into timestamped lyric lines
 */
export function parseLrcLyrics(lrcString: string): { lines: LyricsLine[]; isSynced: boolean } {
  if (!lrcString || typeof lrcString !== 'string') {
    return { lines: [], isSynced: false };
  }

  const rawLines = lrcString.split(/\r?\n/);
  const lines: LyricsLine[] = [];
  let isSynced = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Standard LRC timestamp regex: [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
    const match = trimmed.match(/^\[(\d{1,3}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (match) {
      isSynced = true;
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      // Skip empty timestamp markers without text or metadata tags
      if (text || lines.length > 0) {
        lines.push({ time, text: text || '♪' });
      }
    } else {
      // Non-timestamped fallback line or metadata line
      if (
        !trimmed.startsWith('[ar:') &&
        !trimmed.startsWith('[ti:') &&
        !trimmed.startsWith('[al:') &&
        !trimmed.startsWith('[by:') &&
        !trimmed.startsWith('[offset:')
      ) {
        lines.push({ time: -1, text: trimmed });
      }
    }
  }

  // Sort by timestamp if synced
  if (isSynced) {
    lines.sort((a, b) => (a.time >= 0 && b.time >= 0 ? a.time - b.time : 0));
  }

  return { lines, isSynced };
}

/**
 * Clean strings for lyrics API queries
 */
function cleanSearchQuery(str: string): string {
  return (str || '')
    .replace(/\.[a-zA-Z0-9]{2,4}$/, '') // remove .mp3 .flac etc
    .replace(/^(?:\[?\d{1,3}\]?[\s._-]+|\d{1,3}\.\s*)/, '') // remove track numbers "01. "
    .replace(/\s*\([^)]*(?:official|audio|video|lyrics|remaster|hd|4k|hq|remix|feat|ft)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:official|audio|video|lyrics|remaster|hd|4k|hq|remix|feat|ft)[^\]]*\]/gi, '')
    .trim();
}

const GENERIC_ARTISTS = new Set([
  'vinyl import',
  'unknown',
  'unknown artist',
  'various artists',
  'various',
  'track',
  'audio',
  'local',
  'local vinyl master',
]);

/**
 * Fetch synchronized lyrics from LRCLIB with robust multi-stage search fallbacks
 */
export async function fetchLyricsForTrack(
  track: MediaItem,
  signal?: AbortSignal
): Promise<{ raw: string; lines: LyricsLine[]; isSynced: boolean; source: 'embedded' | 'network' | 'custom' | 'none' }> {
  // 1. Check existing embedded lyrics on track object
  if (track.lyrics && track.lyrics.trim().length > 0) {
    const parsed = parseLrcLyrics(track.lyrics);
    lyricsCache.set(track.id, { raw: track.lyrics, ...parsed });
    return { raw: track.lyrics, ...parsed, source: 'embedded' };
  }

  // 2. Check in-memory cache
  if (lyricsCache.has(track.id)) {
    const cached = lyricsCache.get(track.id)!;
    return { ...cached, source: 'network' };
  }

  // 3. Check persistent localStorage cache
  try {
    const localKey = `synced_lyrics_${track.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      const parsedStored = JSON.parse(stored);
      if (parsedStored && parsedStored.raw) {
        const parsed = parseLrcLyrics(parsedStored.raw);
        lyricsCache.set(track.id, { raw: parsedStored.raw, ...parsed });
        return { raw: parsedStored.raw, ...parsed, source: 'custom' };
      }
    }
  } catch {
    // ignore storage errors
  }

  // Determine clean artist and title
  let cleanTitle = cleanSearchQuery(track.title);
  let cleanArtist = cleanSearchQuery(track.artist || track.albumArtist || '');

  // Check if title has "Artist - Title" format
  if (cleanTitle.includes(' - ') || cleanTitle.includes(' – ') || cleanTitle.includes(' — ')) {
    const parts = cleanTitle.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      const guessedArtist = parts[0].trim();
      const guessedTitle = parts.slice(1).join(' - ').trim();
      if (guessedArtist && guessedTitle) {
        if (!cleanArtist || GENERIC_ARTISTS.has(cleanArtist.toLowerCase())) {
          cleanArtist = guessedArtist;
        }
        cleanTitle = guessedTitle;
      }
    }
  }

  const isArtistGeneric = !cleanArtist || GENERIC_ARTISTS.has(cleanArtist.toLowerCase());

  // Search Strategy 1: Exact search via LRCLIB get endpoint (when real artist is present)
  if (!isArtistGeneric && cleanTitle && cleanArtist) {
    try {
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist,
      });
      if (track.duration > 0) {
        params.set('duration', Math.round(track.duration).toString());
      }

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
        signal,
        headers: { 'User-Agent': 'TechnicsVinylPlayer/1.0' },
      });

      if (res.ok) {
        const data: LrcLibTrackItem = await res.json();
        const lyricText = data.syncedLyrics || data.plainLyrics || '';
        if (lyricText) {
          const parsed = parseLrcLyrics(lyricText);
          lyricsCache.set(track.id, { raw: lyricText, ...parsed });
          cacheToLocalStorage(track.id, lyricText);
          return { raw: lyricText, ...parsed, source: 'network' };
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  // Search Strategy 2: Broad query search with Artist + Title or Title alone
  const searchQueries = [
    !isArtistGeneric ? `${cleanArtist} ${cleanTitle}` : '',
    cleanTitle,
    track.title,
  ].filter(Boolean);

  for (const query of searchQueries) {
    try {
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
        signal,
        headers: { 'User-Agent': 'TechnicsVinylPlayer/1.0' },
      });

      if (searchRes.ok) {
        const items: LrcLibTrackItem[] = await searchRes.json();
        if (Array.isArray(items) && items.length > 0) {
          // Prefer item with syncedLyrics
          const bestMatch = items.find((item) => item.syncedLyrics) || items[0];
          const lyricText = bestMatch?.syncedLyrics || bestMatch?.plainLyrics || '';
          if (lyricText) {
            const parsed = parseLrcLyrics(lyricText);
            lyricsCache.set(track.id, { raw: lyricText, ...parsed });
            cacheToLocalStorage(track.id, lyricText);
            return { raw: lyricText, ...parsed, source: 'network' };
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  // Search Strategy 3: Fallback plain lyrics from Lyrics.ovh
  if (!isArtistGeneric && cleanTitle && cleanArtist) {
    try {
      const ovhRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
        { signal }
      );
      if (ovhRes.ok) {
        const ovhData = await ovhRes.json();
        if (ovhData && ovhData.lyrics) {
          const parsed = parseLrcLyrics(ovhData.lyrics);
          lyricsCache.set(track.id, { raw: ovhData.lyrics, ...parsed });
          cacheToLocalStorage(track.id, ovhData.lyrics);
          return { raw: ovhData.lyrics, ...parsed, source: 'network' };
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }

  return { raw: '', lines: [], isSynced: false, source: 'none' };
}

/**
 * Direct search on LRCLIB to allow users to search and pick any lyrics
 */
export async function searchLyricsOnline(query: string, signal?: AbortSignal): Promise<LrcLibTrackItem[]> {
  const clean = cleanSearchQuery(query);
  if (!clean) return [];

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(clean)}`, {
      signal,
      headers: { 'User-Agent': 'TechnicsVinylPlayer/1.0' },
    });
    if (res.ok) {
      const data: LrcLibTrackItem[] = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('LRCLIB live search error:', err);
  }
  return [];
}

/**
 * Save custom or selected lyrics for a track ID
 */
export function bindCustomLyricsToTrack(trackId: string, lyricText: string): { lines: LyricsLine[]; isSynced: boolean } {
  const parsed = parseLrcLyrics(lyricText);
  lyricsCache.set(trackId, { raw: lyricText, ...parsed });
  cacheToLocalStorage(trackId, lyricText);
  return parsed;
}

function cacheToLocalStorage(trackId: string, raw: string) {
  try {
    localStorage.setItem(`synced_lyrics_${trackId}`, JSON.stringify({ raw }));
  } catch {
    // ignore
  }
}

/**
 * Locate active lyric line index given current playback time in seconds
 */
export function getActiveLyricIndex(lines: LyricsLine[], currentTime: number, offsetSec = 0): number {
  if (!lines || lines.length === 0) return -1;
  const timeWithOffset = Math.max(0, currentTime + offsetSec);

  let activeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time >= 0 && lines[i].time <= timeWithOffset) {
      activeIdx = i;
    } else if (lines[i].time > timeWithOffset) {
      break;
    }
  }

  return activeIdx;
}
