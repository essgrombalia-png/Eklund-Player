import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MediaItem,
  Playlist,
  AudioSettings,
  EQSettings,
  AudioEnhancements,
  RepeatMode,
  VisualizerMode,
} from './types';
import { sampleMedia, samplePlaylists } from './data/sampleMedia';
import { StorageService } from './services/db';
import { audioEngine } from './services/audioEngine';
import { parseAudioFile, parsePlaylistFile, blobToDataUrl } from './services/mediaParser';

// Vinyl Music Player Centerpiece
import { MusicPlayerView } from './components/player/MusicPlayerView';

// Modals & Drawers
import { EqualizerModal } from './components/player/EqualizerModal';
import { QueueDrawer } from './components/queue/QueueDrawer';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { ArtworkEditorModal } from './components/modals/ArtworkEditorModal';
import { DropZoneOverlay } from './components/common/DropZoneOverlay';
import { TechnicsWallpaperBackground } from './components/common/TechnicsWallpaperBackground';
import { OfflineIndicator } from './components/common/OfflineIndicator';

const storage = new StorageService();

export default function App() {
  // --- Data State ---
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // --- Active Playback State ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBraking, setIsBraking] = useState<boolean>(false);
  const [isSpinningUp, setIsSpinningUp] = useState<boolean>(false);
  const brakeRafRef = useRef<number | null>(null);
  const spinUpRafRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [pitchPercent, setPitchPercent] = useState<number>(0);
  const [pitchRange, setPitchRange] = useState<8 | 16>(8);
  const [isKeyLock, setIsKeyLock] = useState<boolean>(false);
  const [baseSpeed, setBaseSpeed] = useState<number>(1.0);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('circular');

  // --- Analog Vinyl Crackle Effect State ---
  const [isVinylCrackleEnabled, setIsVinylCrackleEnabled] = useState<boolean>(true);
  const [vinylCrackleVolume, setVinylCrackleVolume] = useState<number>(0.18);

  // --- Modals State ---
  const [isEQOpen, setIsEQOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isArtworkEditorOpen, setIsArtworkEditorOpen] = useState<boolean>(false);
  const [mediaForPlaylistModal, setMediaForPlaylistModal] = useState<MediaItem | null>(null);

  // --- Audio Settings & EQ ---
  const [eqSettings, setEqSettings] = useState<EQSettings>({
    preset: 'Flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preamp: 0,
    bass: 0,
    treble: 0,
    balance: 0,
    loudness: false,
  });

  const [audioEnhancements, setAudioEnhancements] = useState<AudioEnhancements>({
    bassBoost: false,
    loudnessNorm: false,
    crossfade: 3,
    gapless: true,
    mono: false,
    spatialPlaceholder: false,
    compressor: false,
  });

  // --- Drag & Drop ---
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  // Element Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentMedia: MediaItem | null =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : queue[0] || null;

  // --- Initialize Storage on Mount ---
  useEffect(() => {
    async function loadData() {
      try {
        let storedMedia = await storage.getAllMedia();
        if (storedMedia.length === 0) {
          await storage.saveMediaBatch(sampleMedia);
          storedMedia = sampleMedia;
        }

        let storedPlaylists = await storage.getAllPlaylists();
        if (storedPlaylists.length === 0) {
          for (const pl of samplePlaylists) {
            await storage.savePlaylist(pl);
          }
          storedPlaylists = samplePlaylists;
        }

        setMediaList(storedMedia);
        setPlaylists(storedPlaylists);

        // Check for saved queue state in IndexedDB / localStorage for session recovery
        const savedQueueState = await storage.getPlaybackQueue();
        if (savedQueueState && savedQueueState.queue.length > 0) {
          // Re-validate and refresh queue items against freshly loaded storedMedia
          const sanitizedQueue = savedQueueState.queue
            .map((item) => {
              if (item.url && item.url.startsWith('blob:')) {
                const refreshed = storedMedia.find((m) => m.id === item.id);
                return refreshed || null;
              }
              return item;
            })
            .filter(Boolean) as MediaItem[];

          const finalQueue = sanitizedQueue.length > 0 ? sanitizedQueue : storedMedia.length > 0 ? storedMedia : sampleMedia;
          setQueue(finalQueue);
          const validIndex = Math.max(0, Math.min(savedQueueState.currentIndex, finalQueue.length - 1));
          setCurrentIndex(validIndex);
        } else if (storedMedia.length > 0) {
          setQueue(storedMedia);
          setCurrentIndex(0);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Error initializing media storage: ${msg}`);
        setMediaList(sampleMedia);
        setPlaylists(samplePlaylists);
        setQueue(sampleMedia);
        setCurrentIndex(0);
      }
    }
    loadData();
  }, []);

  const handlePlayAppleTrack = (track: MediaItem) => {
    // Save to media list and storage
    storage.saveMediaItem(track);
    setMediaList((prev) => [track, ...prev.filter((m) => m.id !== track.id)]);
    
    // Play immediately on Technics deck
    setQueue((prevQueue) => {
      const existingIdx = prevQueue.findIndex((item) => item.id === track.id);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
        return prevQueue;
      } else {
        const updated = [...prevQueue, track];
        setCurrentIndex(updated.length - 1);
        return updated;
      }
    });
    setIsPlaying(true);
  };

  const handleAddAppleTrackToQueue = (track: MediaItem) => {
    storage.saveMediaItem(track);
    setMediaList((prev) => [track, ...prev.filter((m) => m.id !== track.id)]);
    setQueue((prevQueue) => {
      if (prevQueue.some((item) => item.id === track.id)) return prevQueue;
      return [...prevQueue, track];
    });
  };
  useEffect(() => {
    if (queue.length > 0) {
      storage.savePlaybackQueue(queue, currentIndex);
    }
  }, [queue, currentIndex]);

  // --- Audio Engine Binding ---
  useEffect(() => {
    if (!audioRef.current) return;

    try {
      if (!audioEngine.isInitialized) {
        audioEngine.init(audioRef.current);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`AudioEngine init notice: ${msg}`);
    }
  }, []);

  // Synchronize volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Synchronize analog vinyl crackle noise with audio engine
  useEffect(() => {
    audioEngine.setVinylCrackle(isVinylCrackleEnabled, vinylCrackleVolume);
    audioEngine.updateVinylCrackleState(isPlaying);
  }, [isVinylCrackleEnabled, vinylCrackleVolume, isPlaying]);

  // Calculate effective real-time playback speed based on base speed + Technics pitch fader offset
  const effectiveSpeed = useMemo(() => {
    const raw = baseSpeed * (1 + pitchPercent / 100);
    return Math.max(0.1, Math.min(4.0, raw));
  }, [baseSpeed, pitchPercent]);

  // Synchronize playback rate and Master Key Lock (preservesPitch)
  useEffect(() => {
    if (audioRef.current && !isBraking && !isSpinningUp) {
      if ('preservesPitch' in audioRef.current) {
        audioRef.current.preservesPitch = isKeyLock;
      } else if ('mozPreservesPitch' in audioRef.current) {
        (audioRef.current as any).mozPreservesPitch = isKeyLock;
      } else if ('webkitPreservesPitch' in audioRef.current) {
        (audioRef.current as any).webkitPreservesPitch = isKeyLock;
      }
      try {
        audioRef.current.playbackRate = effectiveSpeed;
      } catch {
        // Safe fallback
      }
    }
  }, [effectiveSpeed, isKeyLock, isBraking, isSpinningUp]);

  // Synchronize play / pause state
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying && !isSpinningUp && !isBraking) {
      // Ensure AudioContext is running
      if (audioEngine.isInitialized) {
        audioEngine.resume();
      }
      el.play().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Playback prevented or waiting for user interaction: ${msg}`);
        setIsPlaying(false);
        setIsBraking(false);
        setIsSpinningUp(false);
      });
    } else if (!isPlaying && !isBraking && !isSpinningUp) {
      el.pause();
    }
  }, [isPlaying, isBraking, isSpinningUp, currentMedia?.id]);

  // Track progress and resume position
  useEffect(() => {
    if (!currentMedia || !isPlaying || currentTime <= 5) return;
    const interval = setInterval(() => {
      storage.updateResumePosition(currentMedia.id, currentTime);
      setMediaList((prev) =>
        prev.map((m) =>
          m.id === currentMedia.id
            ? { ...m, resumePosition: currentTime, lastPlayedAt: Date.now() }
            : m
        )
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [currentMedia?.id, isPlaying, currentTime]);

  const cancelPhysicsTransitions = () => {
    if (brakeRafRef.current !== null) {
      cancelAnimationFrame(brakeRafRef.current);
      brakeRafRef.current = null;
    }
    if (spinUpRafRef.current !== null) {
      cancelAnimationFrame(spinUpRafRef.current);
      spinUpRafRef.current = null;
    }
    setIsBraking(false);
    setIsSpinningUp(false);
  };

  // --- Playback Controls with Physical Slow-Start & Spin-Down ---
  const handlePlayPause = () => {
    const el = audioRef.current;
    if (el && !audioEngine.isInitialized) {
      audioEngine.init(el);
    }

    if (isBraking) {
      // If currently braking and user clicks play again, smoothly accelerate back up from current speed!
      const currentRate = el ? el.playbackRate || 0.2 : 0.2;
      cancelPhysicsTransitions();
      setIsSpinningUp(true);
      setIsPlaying(true);

      if (el) {
        if ('preservesPitch' in el) el.preservesPitch = false;
        if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = false;
        if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = false;
        el.play().catch(() => {});

        const startTime = performance.now();
        const startRate = Math.max(0.12, currentRate);
        const SPIN_UP_DURATION = 400; // ms

        const runSpinUpStep = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / SPIN_UP_DURATION);
          const curve = 1 - Math.pow(1 - t, 1.8);
          const nextRate = Math.max(0.1, startRate + (effectiveSpeed - startRate) * curve);

          if (el && !el.paused) {
            try {
              el.playbackRate = nextRate;
            } catch {}
          }

          if (t < 1) {
            spinUpRafRef.current = requestAnimationFrame(runSpinUpStep);
          } else {
            if (el) {
              try {
                el.playbackRate = effectiveSpeed;
              } catch {}
              if ('preservesPitch' in el) el.preservesPitch = isKeyLock;
              if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = isKeyLock;
              if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = isKeyLock;
            }
            setIsSpinningUp(false);
            spinUpRafRef.current = null;
          }
        };

        spinUpRafRef.current = requestAnimationFrame(runSpinUpStep);
      }
      return;
    }

    if (isPlaying) {
      // Initiate Technics Electronic Motor Brake effect (~750ms slowdown with vinyl pitch drop)
      if (!el || el.paused) {
        setIsPlaying(false);
        return;
      }

      cancelPhysicsTransitions();
      setIsBraking(true);
      const startTime = performance.now();
      const initialSpeed = el.playbackRate || effectiveSpeed;
      const BRAKE_DURATION = 750; // milliseconds

      // Temporarily disable preservesPitch to allow realistic vinyl tape-stop pitch wind-down
      if ('preservesPitch' in el) el.preservesPitch = false;
      if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = false;
      if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = false;

      const runBrakeStep = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / BRAKE_DURATION);
        // Technics SL-1200 electromagnetic reverse-torque deceleration curve
        const speedFactor = Math.pow(1 - t, 2.2);
        const currentRate = Math.max(0.08, initialSpeed * speedFactor);

        if (el && !el.paused) {
          try {
            el.playbackRate = currentRate;
          } catch {}
        }

        if (t < 1) {
          brakeRafRef.current = requestAnimationFrame(runBrakeStep);
        } else {
          // Brake complete: pause audio and restore initial states
          if (el) {
            el.pause();
            try {
              el.playbackRate = effectiveSpeed;
            } catch {}
            if ('preservesPitch' in el) el.preservesPitch = isKeyLock;
            if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = isKeyLock;
            if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = isKeyLock;
          }
          setIsBraking(false);
          setIsPlaying(false);
          brakeRafRef.current = null;
        }
      };

      brakeRafRef.current = requestAnimationFrame(runBrakeStep);
    } else {
      // Starting playback with authentic slow-start motor acceleration physics
      cancelPhysicsTransitions();
      setIsSpinningUp(true);
      setIsPlaying(true);

      if (el) {
        if ('preservesPitch' in el) el.preservesPitch = false;
        if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = false;
        if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = false;

        const initialRate = 0.15;
        try {
          el.playbackRate = initialRate;
        } catch {}

        el.play().catch((err) => {
          console.warn('Playback prevented or waiting for interaction:', err);
          setIsPlaying(false);
          setIsSpinningUp(false);
        });

        const startTime = performance.now();
        const SPIN_UP_DURATION = 450; // ms

        const runSpinUpStep = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / SPIN_UP_DURATION);
          // Direct-Drive brushless DC starting torque curve
          const curve = 1 - Math.pow(1 - t, 1.8);
          const currentRate = Math.max(0.1, initialRate + (effectiveSpeed - initialRate) * curve);

          if (el && !el.paused) {
            try {
              el.playbackRate = currentRate;
            } catch {}
          }

          if (t < 1) {
            spinUpRafRef.current = requestAnimationFrame(runSpinUpStep);
          } else {
            // Reached quartz speed: lock to target and re-engage user's key lock preference
            if (el) {
              try {
                el.playbackRate = effectiveSpeed;
              } catch {}
              if ('preservesPitch' in el) el.preservesPitch = isKeyLock;
              if ('mozPreservesPitch' in el) (el as any).mozPreservesPitch = isKeyLock;
              if ('webkitPreservesPitch' in el) (el as any).webkitPreservesPitch = isKeyLock;
            }
            setIsSpinningUp(false);
            spinUpRafRef.current = null;
          }
        };

        spinUpRafRef.current = requestAnimationFrame(runSpinUpStep);
      }
    }
  };

  const handleSeek = (time: number) => {
    const el = audioRef.current;
    if (el) {
      el.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleNext = () => {
    cancelPhysicsTransitions();
    if (queue.length === 0) return;
    let nextIdx: number;
    if (isShuffle && queue.length > 1) {
      let rand = Math.floor(Math.random() * queue.length);
      while (rand === currentIndex) {
        rand = Math.floor(Math.random() * queue.length);
      }
      nextIdx = rand;
    } else {
      nextIdx = (currentIndex + 1) % queue.length;
    }
    setCurrentIndex(nextIdx);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    cancelPhysicsTransitions();
    if (queue.length === 0) return;
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // --- Windows 11 System Media Transport Controls (SMTC) & Media Session API ---
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentMedia) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentMedia.title || 'Eklund SL-1200',
        artist: currentMedia.artist || 'Technics Direct Drive Deck',
        album: currentMedia.album || 'Audiophile Vinyl Collection',
        artwork: [
          { src: currentMedia.artwork || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: currentMedia.artwork || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => handlePlayPause()],
      ['pause', () => handlePlayPause()],
      ['previoustrack', () => handlePrevious()],
      ['nexttrack', () => handleNext()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          handleSeek(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        handleSeek(Math.max(0, currentTime - offset));
      }],
      ['seekforward', (details) => {
        const offset = details.seekOffset || 10;
        handleSeek(Math.min(duration, currentTime + offset));
      }],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Guard against unsupported actions in specific platforms
      }
    }

    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore
        }
      }
    };
  }, [currentMedia, isPlaying, currentTime, duration]);

  // Synchronize Windows 11 Media Session Position State (timeline in Volume flyout)
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: effectiveSpeed,
          position: Math.max(0, Math.min(duration, currentTime)),
        });
      } catch {
        // Safe fallback
      }
    }
  }, [currentTime, duration, effectiveSpeed]);

  const handleToggleFavorite = async (id: string) => {
    const item = mediaList.find((m) => m.id === id);
    if (!item) return;
    const updatedFav = !item.isFavorite;

    await storage.toggleFavorite(id, updatedFav);

    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: updatedFav } : m))
    );
    setQueue((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: updatedFav } : m))
    );
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setBaseSpeed(speed);
  };

  const handlePitchChange = (pitch: number) => {
    setPitchPercent(pitch);
  };

  const handlePitchRangeToggle = () => {
    setPitchRange((prev) => (prev === 8 ? 16 : 8));
  };

  const handleKeyLockToggle = () => {
    setIsKeyLock((prev) => !prev);
  };

  const handleResetPitch = () => {
    setPitchPercent(0);
  };

  const handleBaseSpeedChange = (speed: number) => {
    setBaseSpeed(speed);
  };

  const handleToggleVinylCrackle = () => {
    setIsVinylCrackleEnabled((prev) => !prev);
  };

  const handleVinylCrackleVolumeChange = (vol: number) => {
    setVinylCrackleVolume(vol);
  };

  // --- Audio Tag Event Handlers ---
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Replay notice: ${msg}`);
        });
      }
      return;
    }
    if (repeatMode === 'off' && currentIndex === queue.length - 1 && !isShuffle) {
      setIsPlaying(false);
      return;
    }
    handleNext();
  };

  // --- Queue Management ---
  const handleSelectQueueItem = (idx: number) => {
    if (idx >= 0 && idx < queue.length) {
      setCurrentIndex(idx);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleRemoveQueueItem = (idx: number) => {
    if (idx < 0 || idx >= queue.length) return;

    const newQueue = [...queue];
    newQueue.splice(idx, 1);

    if (newQueue.length === 0) {
      setQueue([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    setQueue(newQueue);

    if (idx === currentIndex) {
      const nextIdx = Math.min(currentIndex, newQueue.length - 1);
      setCurrentIndex(nextIdx);
      setCurrentTime(0);
    } else if (idx < currentIndex) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleClearQueue = () => {
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleDeleteDefaultMusic = async () => {
    // Identify default sample IDs from sampleMedia
    const defaultIds = new Set(sampleMedia.map((m) => m.id));

    // Delete default media items from IndexedDB
    await storage.deleteMediaBatch(Array.from(defaultIds));

    // Remove from mediaList and queue
    const updatedMedia = mediaList.filter((m) => !defaultIds.has(m.id));
    const updatedQueue = queue.filter((m) => !defaultIds.has(m.id));

    setMediaList(updatedMedia);
    setQueue(updatedQueue);

    if (updatedQueue.length === 0) {
      setCurrentIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
    } else {
      const currentId = currentMedia?.id;
      if (currentId && defaultIds.has(currentId)) {
        setCurrentIndex(0);
        setCurrentTime(0);
      } else if (currentId) {
        const newIdx = updatedQueue.findIndex((m) => m.id === currentId);
        setCurrentIndex(newIdx >= 0 ? newIdx : 0);
      }
    }

    // Clean default tracks from playlists
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        items: pl.items.filter((id) => !defaultIds.has(id)),
      }))
    );
  };

  const handleLoadPlaylistToQueue = (playlistId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl || pl.items.length === 0) return;

    const playlistMedia = pl.items
      .map((id) => mediaList.find((m) => m.id === id))
      .filter((m): m is MediaItem => Boolean(m));

    if (playlistMedia.length > 0) {
      setQueue(playlistMedia);
      setCurrentIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleMoveQueueItem = (from: number, to: number) => {
    if (to < 0 || to >= queue.length || from < 0 || from >= queue.length) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);
    setQueue(newQueue);

    if (currentIndex === from) {
      setCurrentIndex(to);
    } else if (currentIndex > from && currentIndex <= to) {
      setCurrentIndex((prev) => prev - 1);
    } else if (currentIndex < from && currentIndex >= to) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSaveQueueAsPlaylist = async () => {
    if (queue.length === 0) return;
    const name = `Vinyl Crate Session ${new Date().toLocaleDateString()}`;
    const newPl: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      description: 'Preserved audiophile vinyl crate queue',
      coverUrl: currentMedia?.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      items: queue.map((q) => q.id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.savePlaylist(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setIsQueueOpen(false);
  };

  // --- Artwork Update & Custom Cover Persistence ---
  const handleSaveArtwork = async (artworkUrl: string, coverBlob?: Blob) => {
    if (!currentMedia) return;

    if (coverBlob) {
      await storage.saveCoverBlob(currentMedia.id, coverBlob);
    }

    const updatedTrack: MediaItem = {
      ...currentMedia,
      artwork: artworkUrl,
    };

    await storage.saveMediaItem(updatedTrack);

    setMediaList((prev) => prev.map((m) => (m.id === currentMedia.id ? updatedTrack : m)));
    setQueue((prev) => prev.map((m) => (m.id === currentMedia.id ? updatedTrack : m)));
  };

  // --- Local File / Playlist Import & Drag and Drop ---
  const handleImportLocalFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);

    const playlistFiles = fileArr.filter((f) =>
      /\.(m3u|m3u8|pls|json)$/i.test(f.name)
    );

    const audioFiles = fileArr.filter((f) =>
      f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)
    );

    const imageFiles = fileArr.filter((f) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name)
    );

    // 1. Process Playlist Files (.m3u, .pls, .json)
    if (playlistFiles.length > 0) {
      const allImportedTracks: MediaItem[] = [];

      for (const plFile of playlistFiles) {
        try {
          const parsedPl = await parsePlaylistFile(plFile);
          if (parsedPl.tracks && parsedPl.tracks.length > 0) {
            const trackItems: MediaItem[] = [];

            for (let i = 0; i < parsedPl.tracks.length; i++) {
              const pt = parsedPl.tracks[i];
              const trackId = `pl-track-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
              const trackItem: MediaItem = {
                id: trackId,
                title: pt.title || 'Playlist Track',
                type: 'music',
                artist: pt.artist || 'Vinyl Import',
                album: pt.album || parsedPl.name,
                duration: pt.duration || 180,
                url: pt.url || 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3',
                artwork: pt.artwork || 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
                audioFormat: pt.audioFormat || 'FLAC 24-bit',
                bitrate: '1411 kbps',
                sampleRate: '48.0 kHz',
                colorAccent: pt.colorAccent || '#06b6d4',
                isFavorite: false,
                isLocal: pt.isLocal || false,
                addedAt: Date.now(),
                playCount: 1,
              };
              trackItems.push(trackItem);
            }

            // Save to database
            await storage.saveMediaBatch(trackItems);
            allImportedTracks.push(...trackItems);

            // Save as a named Playlist object
            const newPl: Playlist = {
              id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: parsedPl.name,
              description: `Imported from ${plFile.name}`,
              coverUrl: trackItems[0]?.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
              items: trackItems.map((t) => t.id),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await storage.savePlaylist(newPl);
            setPlaylists((prev) => [...prev, newPl]);
          }
        } catch (err) {
          console.warn('Error parsing playlist file:', err);
        }
      }

      if (allImportedTracks.length > 0) {
        setMediaList((prev) => [...allImportedTracks, ...prev]);
        setQueue((prev) => [...allImportedTracks, ...prev]);
        setCurrentIndex(0);
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }
    }

    // 2. If ONLY image files were dropped and a track is currently playing/loaded, set as track artwork
    if (audioFiles.length === 0 && imageFiles.length > 0 && currentMedia) {
      const img = imageFiles[0];
      const coverUrl = await blobToDataUrl(img);
      await storage.saveCoverBlob(currentMedia.id, img);

      const updatedTrack = { ...currentMedia, artwork: coverUrl };
      await storage.saveMediaItem(updatedTrack);

      setMediaList((prev) => prev.map((m) => (m.id === currentMedia.id ? updatedTrack : m)));
      setQueue((prev) => prev.map((m) => (m.id === currentMedia.id ? updatedTrack : m)));
      return;
    }

    if (audioFiles.length === 0) return;

    // 3. Process Audio Files
    const newTracks: MediaItem[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const trackId = `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      const audioBlobUrl = URL.createObjectURL(audioFile);

      // Save audio binary in IndexedDB
      await storage.saveAudioBlob(trackId, audioFile);

      // Look for a paired image file
      let pairedImage = imageFiles.find((img) => {
        const audioBase = audioFile.name.replace(/\.[^/.]+$/, '').toLowerCase();
        const imgBase = img.name.replace(/\.[^/.]+$/, '').toLowerCase();
        return imgBase.includes(audioBase) || audioBase.includes(imgBase) || imgBase === 'cover' || imgBase === 'folder';
      }) || imageFiles[0];

      // Parse ID3/FLAC/MP4 tags and embedded cover art
      const parsed = await parseAudioFile(audioFile, pairedImage);

      if (parsed.coverBlob) {
        await storage.saveCoverBlob(trackId, parsed.coverBlob);
      }

      const fullTrack: MediaItem = {
        id: trackId,
        title: parsed.track.title || audioFile.name.replace(/\.[^/.]+$/, ''),
        type: 'music',
        url: audioBlobUrl,
        artist: parsed.track.artist || 'Vinyl Import',
        album: parsed.track.album || 'Local Vinyl Master',
        duration: parsed.track.duration || 200,
        bpm: parsed.track.bpm || 120,
        artwork: parsed.track.artwork || 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
        audioFormat: parsed.track.audioFormat || 'Direct PCM Master / Local',
        bitrate: parsed.track.bitrate || '1411 kbps',
        sampleRate: parsed.track.sampleRate || '48.0 kHz',
        lyrics: parsed.track.lyrics || undefined,
        colorAccent: parsed.track.colorAccent || '#eab308',
        isFavorite: false,
        isLocal: true,
        addedAt: Date.now(),
        playCount: 1,
      };

      newTracks.push(fullTrack);
    }

    if (newTracks.length > 0) {
      await storage.saveMediaBatch(newTracks);
      setMediaList((prev) => [...newTracks, ...prev]);
      setQueue((prev) => [...newTracks, ...prev]);

      // If multiple audio files were imported, auto create a playlist entry
      if (newTracks.length > 1) {
        const importedPl: Playlist = {
          id: `playlist-import-${Date.now()}`,
          name: `Device Crate (${newTracks.length} tracks)`,
          description: 'Imported audio files from local computer',
          coverUrl: newTracks[0].artwork,
          items: newTracks.map((t) => t.id),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await storage.savePlaylist(importedPl);
        setPlaylists((prev) => [...prev, importedPl]);
      }

      setCurrentIndex(0);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  // --- Windows 11 File Handling API (LaunchQueue - "Open With" integration) ---
  useEffect(() => {
    if ('launchQueue' in window && typeof (window as any).launchQueue?.setConsumer === 'function') {
      try {
        (window as any).launchQueue.setConsumer(async (launchParams: any) => {
          if (!launchParams?.files || launchParams.files.length === 0) return;
          const files: File[] = [];
          for (const handle of launchParams.files) {
            try {
              const f = await handle.getFile();
              if (f) files.push(f);
            } catch (err) {
              console.warn('Failed to access launched file handle:', err);
            }
          }
          if (files.length > 0) {
            handleImportLocalFiles(files);
          }
        });
      } catch (err) {
        console.warn('LaunchQueue setup notice:', err);
      }
    }
  }, []);

  // Global Drag and Drop Handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;
      if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDraggingFiles(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        setIsDraggingFiles(false);
        dragCounterRef.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFiles(false);
      dragCounterRef.current = 0;
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleImportLocalFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [queue]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case 'KeyM':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'KeyE':
          e.preventDefault();
          setIsEQOpen((prev) => !prev);
          break;
        case 'KeyQ':
          e.preventDefault();
          setIsQueueOpen((prev) => !prev);
          break;
        case 'KeyN':
          e.preventDefault();
          handleNext();
          break;
        case 'KeyP':
          e.preventDefault();
          handlePrevious();
          break;
        case 'KeyS':
          e.preventDefault();
          handleToggleShuffle();
          break;
        case 'KeyR':
          e.preventDefault();
          handleToggleRepeat();
          break;
        case 'KeyC':
          e.preventDefault();
          handleToggleVinylCrackle();
          break;
        case 'BracketLeft':
          e.preventDefault();
          setPitchPercent((p) => Math.max(-pitchRange, Math.round((p - 0.2) * 100) / 100));
          break;
        case 'BracketRight':
          e.preventDefault();
          setPitchPercent((p) => Math.min(pitchRange, Math.round((p + 0.2) * 100) / 100));
          break;
        case 'Digit0':
          e.preventDefault();
          setPitchPercent(0);
          break;
        case 'KeyK':
          e.preventDefault();
          setIsKeyLock((prev) => !prev);
          break;
        case 'KeyX':
          e.preventDefault();
          setPitchRange((prev) => (prev === 8 ? 16 : 8));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, volume, isPlaying, queue.length, currentIndex, isShuffle, repeatMode, pitchRange]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent text-white font-sans select-none">
      {/* High-Fidelity Responsive Technics Wallpaper Background */}
      <TechnicsWallpaperBackground isPlaying={isPlaying} />

      {/* Visual Drag and Drop Overlay */}
      <DropZoneOverlay isDragging={isDraggingFiles} />

      {/* Hidden Native Audio Element */}
      {currentMedia && (
        <audio
          ref={audioRef}
          src={currentMedia.url}
          crossOrigin={currentMedia.url.startsWith('blob:') || currentMedia.url.startsWith('data:') ? undefined : 'anonymous'}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => {
            const errorObj = audioRef.current?.error;
            const errorMsg = errorObj?.message || (errorObj?.code === 4 ? 'Format error or unsupported codec' : 'Media source error');
            console.warn(`Audio playback error on source [${currentMedia.url}]: MEDIA_ELEMENT_ERROR: ${errorMsg}`);

            // Gracefully stop playing if source is invalid or dead
            setIsPlaying(false);

            // Auto-recovery: if current media fails due to format/revoked blob, fallback to next playable track or sample
            if (currentMedia.url.startsWith('blob:') || errorObj?.code === 4) {
              if (queue.length > 1) {
                const nextIdx = (currentIndex + 1) % queue.length;
                if (nextIdx !== currentIndex) {
                  setCurrentIndex(nextIdx);
                  setCurrentTime(0);
                }
              } else if (sampleMedia.length > 0 && currentMedia.id !== sampleMedia[0].id) {
                setQueue(sampleMedia);
                setCurrentIndex(0);
                setCurrentTime(0);
              }
            }
          }}
        />
      )}

      {/* Hidden File Input for Vinyl, Playlist & Artwork Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportLocalFiles(e.target.files);
          }
        }}
        multiple
        accept="audio/*,image/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.jpg,.jpeg,.png,.webp,.m3u,.m3u8,.pls,.json"
        className="hidden"
      />

      {/* THE VINYL HI-FI DECK - Primary Application Screen */}
      {currentMedia ? (
        <MusicPlayerView
          currentTrack={currentMedia}
          isPlaying={isPlaying}
          isBraking={isBraking}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          playbackSpeed={effectiveSpeed}
          pitchPercent={pitchPercent}
          pitchRange={pitchRange}
          isKeyLock={isKeyLock}
          baseSpeed={baseSpeed}
          visualizerMode={visualizerMode}
          accentColor={currentMedia.colorAccent || '#06b6d4'}
          queueCount={queue.length}
          isVinylCrackleEnabled={isVinylCrackleEnabled}
          vinylCrackleVolume={vinylCrackleVolume}
          onToggleVinylCrackle={handleToggleVinylCrackle}
          onVinylCrackleVolumeChange={handleVinylCrackleVolumeChange}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onSpeedChange={handleSpeedChange}
          onPitchChange={handlePitchChange}
          onPitchRangeToggle={handlePitchRangeToggle}
          onKeyLockToggle={handleKeyLockToggle}
          onResetPitch={handleResetPitch}
          onBaseSpeedChange={handleBaseSpeedChange}
          onToggleFavorite={handleToggleFavorite}
          onOpenEQ={() => setIsEQOpen(true)}
          onOpenQueue={() => setIsQueueOpen(true)}
          onAddToPlaylist={(track) => setMediaForPlaylistModal(track)}
          onOpenFilePicker={() => fileInputRef.current?.click()}
          onVisualizerModeChange={setVisualizerMode}
          onOpenArtworkEditor={() => setIsArtworkEditorOpen(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="text-xl font-bold text-neutral-300">No Vinyl Loaded</div>
          <p className="text-sm text-neutral-500 mt-2">Drop an audio file onto the turntable or import a track.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl shadow-lg"
          >
            Import Audio Track
          </button>
        </div>
      )}

      {/* 10-Band Audiophile Equalizer Modal */}
      <EqualizerModal
        isOpen={isEQOpen}
        onClose={() => setIsEQOpen(false)}
        eqSettings={eqSettings}
        onUpdateEQ={setEqSettings}
        enhancements={audioEnhancements}
        onUpdateEnhancements={setAudioEnhancements}
        accentColor={currentMedia?.colorAccent || '#06b6d4'}
      />

      {/* Vinyl Crate & Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentIndex={currentIndex}
        playlists={playlists}
        onSelectIndex={handleSelectQueueItem}
        onRemoveItem={handleRemoveQueueItem}
        onClearQueue={handleClearQueue}
        onDeleteDefaultMusic={handleDeleteDefaultMusic}
        onMoveItem={handleMoveQueueItem}
        onSaveAsPlaylist={handleSaveQueueAsPlaylist}
        onLoadPlaylistToQueue={handleLoadPlaylistToQueue}
        onImportFiles={handleImportLocalFiles}
        accentColor={currentMedia?.colorAccent || '#06b6d4'}
      />

      {/* Add To Playlist / Crate Modal */}
      {mediaForPlaylistModal && (
        <AddToPlaylistModal
          isOpen={Boolean(mediaForPlaylistModal)}
          onClose={() => setMediaForPlaylistModal(null)}
          mediaItem={mediaForPlaylistModal}
          playlists={playlists}
          onToggleItemInPlaylist={async (playlistId, mediaId) => {
            await storage.addItemToPlaylist(playlistId, mediaId);
            setPlaylists((prev) =>
              prev.map((pl) =>
                pl.id === playlistId ? { ...pl, items: [...pl.items, mediaId] } : pl
              )
            );
            setMediaForPlaylistModal(null);
          }}
          onCreatePlaylist={async (name, desc) => {
            const newPl: Playlist = {
              id: `playlist-${Date.now()}`,
              name,
              description: desc || 'Custom vinyl crate',
              coverUrl: mediaForPlaylistModal.artwork,
              items: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await storage.savePlaylist(newPl);
            setPlaylists((prev) => [...prev, newPl]);
            return newPl;
          }}
        />
      )}

      {/* Album Artwork Search & Custom Upload Modal */}
      <ArtworkEditorModal
        isOpen={isArtworkEditorOpen}
        onClose={() => setIsArtworkEditorOpen(false)}
        currentTrack={currentMedia}
        onSaveArtwork={handleSaveArtwork}
      />

      {/* Windows 11 Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
