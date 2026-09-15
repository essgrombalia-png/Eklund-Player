import * as mm from 'music-metadata-browser';
import { MediaItem } from '../types';
import { bpmDetector } from './bpmDetector';

export interface ParsedAudioResult {
  track: Partial<MediaItem>;
  coverBlob?: Blob;
}

/**
 * Convert any Blob or File to a permanent base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Clean filename into smart Artist and Title parts
 * e.g. "01. Queen - Bohemian Rhapsody (Remastered 2011).mp3"
 *   -> Artist: "Queen", Title: "Bohemian Rhapsody"
 */
export function parseFilenameToArtistTitle(filename: string): { artist: string; title: string } {
  // Remove file extension
  let base = filename.replace(/\.[^/.]+$/, '').trim();

  // Remove leading track numbers like "01. ", "01 - ", "1-01 ", "[01] "
  base = base.replace(/^(?:\[?\d{1,3}\]?[\s._-]+|\d{1,3}\.\s*)/, '').trim();

  // Try split by " - " or " _ " or " ~ "
  const splitMatch = base.match(/^(.+?)\s*[-_~–—]\s*(.+)$/);
  if (splitMatch) {
    const artist = cleanString(splitMatch[1]);
    const title = cleanString(splitMatch[2]);
    return { artist, title };
  }

  return { artist: '', title: cleanString(base) };
}

function cleanString(str: string): string {
  return str
    .replace(/\s*\([^)]*(?:official|audio|video|lyrics|remaster|hd|4k|hq|remix)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:official|audio|video|lyrics|remaster|hd|4k|hq|remix)[^\]]*\]/gi, '')
    .trim();
}

/**
 * Generate a vibrant palette color from track title
 */
export function generateAccentColor(str: string): string {
  const colors = [
    '#f59e0b', // gold / amber
    '#06b6d4', // cyan
    '#ec4899', // pink / magenta
    '#10b981', // emerald
    '#8b5cf6', // purple
    '#f97316', // orange
    '#3b82f6', // blue
    '#14b8a6', // teal
    '#e11d48', // rose
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Fetch official high-res album artwork online via iTunes Search API
 */
export async function fetchAlbumCoverOnline(artist: string, title: string): Promise<string | null> {
  const cleanTitle = cleanString(title);
  const cleanArtist = cleanString(artist);
  const query = cleanArtist && cleanArtist !== 'Vinyl Import' ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
  if (!query) return null;

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        if (item.artworkUrl100) {
          // Upgrade 100x100 to full high-res 800x800 or 1000x1000
          return item.artworkUrl100.replace(/100x100bb(\.[a-z]+)?$/i, '1000x1000bb.jpg');
        }
      }
    }
  } catch (err) {
    console.warn('iTunes album art fetch notice:', err);
  }
  return null;
}

export interface OnlineCoverResult {
  artworkUrl: string;
  trackName: string;
  artistName: string;
  albumName: string;
}

/**
 * Search online for high-res album covers matching query
 */
export async function searchAlbumCoversOnline(query: string): Promise<OnlineCoverResult[]> {
  const clean = cleanString(query);
  if (!clean) return [];

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&media=music&entity=album,song&limit=8`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results
          .filter((r: { artworkUrl100?: string }) => Boolean(r.artworkUrl100))
          .map((r: { artworkUrl100: string; trackName?: string; collectionName?: string; artistName?: string }) => ({
            artworkUrl: r.artworkUrl100.replace(/100x100bb(\.[a-z]+)?$/i, '1000x1000bb.jpg'),
            trackName: r.trackName || r.collectionName || '',
            artistName: r.artistName || '',
            albumName: r.collectionName || r.trackName || '',
          }));
      }
    }
  } catch (err) {
    console.warn('Online album cover search error:', err);
  }
  return [];
}

/**
 * Extract full ID3 / FLAC / MP4 metadata including album artwork and lyrics from audio file
 */
export async function parseAudioFile(
  file: File,
  pairedCoverBlob?: Blob
): Promise<ParsedAudioResult> {
  const fromFilename = parseFilenameToArtistTitle(file.name);
  let title = fromFilename.title || file.name.replace(/\.[^/.]+$/, '');
  let artist = fromFilename.artist || '';
  let album = 'Vinyl Master';
  let duration = 180;
  let audioFormat = file.type || 'audio/mp3';
  let bitrate = '320 kbps';
  let sampleRate = '44.1 kHz';
  let lyrics = '';
  let coverBlob: Blob | undefined = pairedCoverBlob;
  let coverUrl = '';
  let detectedBpm: number | undefined = undefined;

  try {
    const metadata = await mm.parseBlob(file, { duration: true, skipCovers: false });

    if (metadata.common) {
      if (metadata.common.bpm) {
        detectedBpm = Math.round(metadata.common.bpm);
      }
      if (metadata.common.title && metadata.common.title.trim()) {
        title = metadata.common.title.trim();
      }
      if (metadata.common.artist && metadata.common.artist.trim()) {
        artist = metadata.common.artist.trim();
      } else if (metadata.common.albumartist && metadata.common.albumartist.trim()) {
        artist = metadata.common.albumartist.trim();
      }
      if (metadata.common.album && metadata.common.album.trim()) {
        album = metadata.common.album.trim();
      }

      // Check embedded lyrics
      if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
        lyrics = metadata.common.lyrics[0] || '';
      }

      // Check embedded picture / album artwork
      if (!coverBlob && metadata.common.picture && metadata.common.picture.length > 0) {
        const pic = metadata.common.picture[0];
        if (pic.data && pic.data.length > 0) {
          const uint8 = new Uint8Array(pic.data);
          coverBlob = new Blob([uint8], { type: pic.format || 'image/jpeg' });
        }
      }
    }

    if (metadata.format) {
      if (metadata.format.duration && metadata.format.duration > 0) {
        duration = Math.round(metadata.format.duration);
      }
      if (metadata.format.bitrate) {
        bitrate = `${Math.round(metadata.format.bitrate / 1000)} kbps`;
      }
      if (metadata.format.sampleRate) {
        sampleRate = `${(metadata.format.sampleRate / 1000).toFixed(1)} kHz`;
      }
      if (metadata.format.container) {
        audioFormat = metadata.format.container.toUpperCase();
      }
    }
  } catch (err) {
    console.warn('Metadata parsing notice (fallback to filename heuristics):', err);
  }

  // 1. If blob exists, convert to persistent base64 data URL
  if (coverBlob) {
    try {
      coverUrl = await blobToDataUrl(coverBlob);
    } catch {
      coverUrl = URL.createObjectURL(coverBlob);
    }
  }

  // 2. If no embedded cover and title exists, attempt quick online cover fetch
  if (!coverUrl && title) {
    try {
      const onlineArt = await fetchAlbumCoverOnline(artist, title);
      if (onlineArt) {
        coverUrl = onlineArt;
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback high quality vinyl record sleeve art
  if (!coverUrl) {
    coverUrl = 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80';
  }

  // 4. Automated BPM Detection if not found in ID3 tag
  if (!detectedBpm) {
    try {
      detectedBpm = await bpmDetector.detectFromFile(file);
    } catch {
      detectedBpm = 120;
    }
  }

  const colorAccent = generateAccentColor(`${title} ${artist}`);

  return {
    track: {
      title,
      artist: artist || 'Vinyl Import',
      album,
      duration,
      bpm: detectedBpm,
      artwork: coverUrl,
      audioFormat,
      bitrate,
      sampleRate,
      lyrics: lyrics || undefined,
      colorAccent,
      isFavorite: false,
      isLocal: true,
      addedAt: Date.now(),
      playCount: 1,
    },
    coverBlob,
  };
}

export interface ParsedPlaylistResult {
  name: string;
  tracks: Partial<MediaItem>[];
}

/**
 * Parse .m3u, .m3u8, .pls, or .json playlist files
 */
export async function parsePlaylistFile(file: File): Promise<ParsedPlaylistResult> {
  const fileName = file.name;
  const name = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Playlist';
  const text = await file.text();
  const tracks: Partial<MediaItem>[] = [];

  if (fileName.toLowerCase().endsWith('.json')) {
    try {
      const data = JSON.parse(text);
      const rawTracks = Array.isArray(data) ? data : (data.items || data.tracks || []);
      for (const item of rawTracks) {
        if (typeof item === 'object' && item !== null) {
          const itemTitle = item.title || item.name || 'Untitled Track';
          const itemArtist = item.artist || item.author || 'Vinyl Import';
          tracks.push({
            title: itemTitle,
            artist: itemArtist,
            album: item.album || 'Imported Playlist',
            url: item.url || item.src || item.link || 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3',
            artwork: item.artwork || item.coverUrl || item.image || 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
            duration: typeof item.duration === 'number' ? item.duration : 180,
            audioFormat: item.audioFormat || 'FLAC 24-bit',
            colorAccent: generateAccentColor(itemTitle),
            isFavorite: false,
            isLocal: false,
            addedAt: Date.now(),
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse JSON playlist:', e);
    }
  } else if (fileName.toLowerCase().endsWith('.pls')) {
    const lines = text.split(/\r?\n/);
    let currentTitle = '';
    let currentUrl = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('file')) {
        currentUrl = trimmed.split('=')[1]?.trim() || '';
      } else if (trimmed.toLowerCase().startsWith('title')) {
        currentTitle = trimmed.split('=')[1]?.trim() || '';
      }
      if (currentUrl) {
        const parsedName = parseFilenameToArtistTitle(currentTitle || currentUrl);
        const trackTitle = parsedName.title || currentTitle || 'Stream Track';
        tracks.push({
          title: trackTitle,
          artist: parsedName.artist || 'Web Stream',
          album: name,
          url: currentUrl,
          artwork: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
          duration: 180,
          audioFormat: 'Audio Stream',
          colorAccent: generateAccentColor(trackTitle),
          isFavorite: false,
          isLocal: false,
          addedAt: Date.now(),
        });
        currentUrl = '';
        currentTitle = '';
      }
    }
  } else {
    // Standard M3U / M3U8 format
    const lines = text.split(/\r?\n/);
    let pendingTitle = '';
    let pendingArtist = '';
    let pendingDuration = 180;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#EXTM3U')) continue;

      if (trimmed.startsWith('#EXTINF:')) {
        const info = trimmed.substring(8);
        const commaIdx = info.indexOf(',');
        if (commaIdx !== -1) {
          const durStr = info.substring(0, commaIdx);
          const dur = parseInt(durStr, 10);
          if (!isNaN(dur) && dur > 0) pendingDuration = dur;

          const titlePart = info.substring(commaIdx + 1).trim();
          const parsed = parseFilenameToArtistTitle(titlePart);
          pendingTitle = parsed.title;
          pendingArtist = parsed.artist;
        }
      } else if (!trimmed.startsWith('#')) {
        const url = trimmed;
        const parsedUrl = parseFilenameToArtistTitle(url.split('/').pop() || url);
        const title = pendingTitle || parsedUrl.title || 'Playlist Track';
        const artist = pendingArtist || parsedUrl.artist || 'Vinyl Import';

        tracks.push({
          title,
          artist,
          album: name,
          url,
          artwork: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
          duration: pendingDuration,
          audioFormat: url.startsWith('http') ? 'Online Stream' : 'Local File',
          colorAccent: generateAccentColor(title),
          isFavorite: false,
          isLocal: !url.startsWith('http'),
          addedAt: Date.now(),
        });

        pendingTitle = '';
        pendingArtist = '';
        pendingDuration = 180;
      }
    }
  }

  return { name, tracks };
}
