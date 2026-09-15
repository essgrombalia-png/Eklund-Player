import { MediaItem, Playlist, PlaybackHistoryEntry, ThemeMode, EQSettings, AudioEnhancements } from '../types';

const DB_NAME = 'aether_media_db';
const DB_VERSION = 2;

export class StorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('type', 'type', { unique: false });
          mediaStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          mediaStore.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('coverFiles')) {
          db.createObjectStore('coverFiles', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Audio File Binary Storage ---
  async saveAudioBlob(id: string, file: Blob): Promise<void> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction('audioFiles', 'readwrite');
        const store = tx.objectStore('audioFiles');
        const req = store.put({ id, data: file });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }

  async getAudioBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('audioFiles', 'readonly');
        const store = tx.objectStore('audioFiles');
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data as Blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- Cover Art Image Binary Storage ---
  async saveCoverBlob(id: string, file: Blob): Promise<void> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction('coverFiles', 'readwrite');
        const store = tx.objectStore('coverFiles');
        const req = store.put({ id, data: file });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }

  async getCoverBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('coverFiles', 'readonly');
        const store = tx.objectStore('coverFiles');
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data as Blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- Media Items ---
  async getAllMedia(): Promise<MediaItem[]> {
    const db = await this.dbPromise;
    const items: MediaItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Restore blob URLs for local media items and artwork from binary store
    const restored: MediaItem[] = [];
    for (const item of items) {
      let updated = { ...item };

      // Restore audio blob
      if (item.isLocal || (item.url && item.url.startsWith('blob:'))) {
        const blob = await this.getAudioBlob(item.id);
        if (blob) {
          updated.url = URL.createObjectURL(blob);
        } else if (item.url && item.url.startsWith('blob:')) {
          continue; // Skip dead unrecoverable blob
        }
      }

      // Restore artwork blob if stored
      const coverBlob = await this.getCoverBlob(item.id);
      if (coverBlob) {
        updated.artwork = URL.createObjectURL(coverBlob);
      } else if (item.artwork && item.artwork.startsWith('blob:')) {
        // Fallback placeholder if blob was revoked without binary
        updated.artwork = 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80';
      }

      restored.push(updated);
    }
    return restored;
  }

  async saveMediaItem(item: MediaItem): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveMediaBatch(items: MediaItem[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteMediaItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMediaBatch(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateResumePosition(id: string, position: number): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as MediaItem;
        if (item) {
          item.resumePosition = position;
          item.lastPlayedAt = Date.now();
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as MediaItem;
        if (item) {
          item.isFavorite = isFavorite;
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async addItemToPlaylist(playlistId: string, mediaId: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const getReq = store.get(playlistId);
      getReq.onsuccess = () => {
        const pl = getReq.result as Playlist;
        if (pl && !pl.items.includes(mediaId)) {
          pl.items.push(mediaId);
          pl.updatedAt = Date.now();
          store.put(pl);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // --- Playlists ---
  async getAllPlaylists(): Promise<Playlist[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readonly');
      const store = tx.objectStore('playlists');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async savePlaylist(playlist: Playlist): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const request = store.put(playlist);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Playback History ---
  async addHistory(entry: PlaybackHistoryEntry): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getHistory(): Promise<PlaybackHistoryEntry[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result || []) as PlaybackHistoryEntry[];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Playback Queue State Persistence ---
  async savePlaybackQueue(queue: MediaItem[], currentIndex: number): Promise<void> {
    try {
      const db = await this.dbPromise;
      const cleanQueue = queue.map((item) => ({
        ...item,
        // If it's a blob url from local import, mark it appropriately
      }));
      const payload = {
        key: 'playback_queue_state',
        queue: cleanQueue,
        currentIndex,
        updatedAt: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put(payload);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Also fallback to localStorage
      try {
        localStorage.setItem(
          'aether_playback_queue_state',
          JSON.stringify({ queue, currentIndex, updatedAt: Date.now() })
        );
      } catch {
        // ignore
      }
    }
  }

  async getPlaybackQueue(): Promise<{ queue: MediaItem[]; currentIndex: number } | null> {
    try {
      const db = await this.dbPromise;
      const stateFromDB = await new Promise<{ queue: MediaItem[]; currentIndex: number } | null>((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('playback_queue_state');
        req.onsuccess = () => {
          if (req.result && Array.isArray(req.result.queue) && req.result.queue.length > 0) {
            resolve({
              queue: req.result.queue,
              currentIndex: typeof req.result.currentIndex === 'number' ? req.result.currentIndex : 0,
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });

      if (stateFromDB) return stateFromDB;

      // Check fallback localStorage
      const local = localStorage.getItem('aether_playback_queue_state');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.queue) && parsed.queue.length > 0) {
          return {
            queue: parsed.queue,
            currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
          };
        }
      }
    } catch {
      // fallback
    }
    return null;
  }

  // --- Settings / Preferences ---
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const val = localStorage.getItem(`aether_${key}`);
      if (val !== null) return JSON.parse(val) as T;
    } catch {
      // fallback
    }
    return defaultValue;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`aether_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
}

export const dbService = new StorageService();
