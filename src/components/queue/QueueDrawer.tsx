import React, { useRef, useState } from 'react';
import { X, Play, Trash2, BookmarkPlus, Disc, MoveUp, MoveDown, Music, Upload, FolderPlus, ListMusic, Sparkles } from 'lucide-react';
import { MediaItem, Playlist } from '../../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: MediaItem[];
  currentIndex: number;
  playlists?: Playlist[];
  onSelectIndex: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onClearQueue: () => void;
  onDeleteDefaultMusic?: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onSaveAsPlaylist: () => void;
  onLoadPlaylistToQueue?: (playlistId: string) => void;
  onImportFiles?: (files: FileList | File[]) => void;
  accentColor?: string;
}

export const QueueDrawer = ({
  isOpen,
  onClose,
  queue,
  currentIndex,
  playlists = [],
  onSelectIndex,
  onRemoveItem,
  onClearQueue,
  onDeleteDefaultMusic,
  onMoveItem,
  onSaveAsPlaylist,
  onLoadPlaylistToQueue,
  onImportFiles,
  accentColor = '#06b6d4',
}: QueueDrawerProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentItem = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const upNext = queue.slice(currentIndex + 1);

  // Count default sample tracks in current queue (e.g. starting with track- or isSample)
  const defaultTrackCount = queue.filter(
    (item) => item.id.startsWith('track-') || item.id.includes('sample')
  ).length;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onImportFiles) {
      onImportFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportFiles) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handleLoadPlaylist = (playlistId: string) => {
    if (playlistId && onLoadPlaylistToQueue) {
      onLoadPlaylistToQueue(playlistId);
      setSelectedPlaylistId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in select-none">
      {/* Hidden File Input for local files & playlist import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="audio/*,.m3u,.m3u8,.pls,.json"
        multiple
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col transition-all ${
          isDragOver ? 'ring-2 ring-amber-500 bg-neutral-900/90' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/40">
          <div>
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Disc className="w-4 h-4 text-amber-400" />
              Vinyl Crate & Queue
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">{queue.length} records ready to spin</p>
          </div>

          <div className="flex items-center gap-1.5">
            {queue.length > 0 && (
              <>
                <button
                  onClick={onSaveAsPlaylist}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                  title="Save Current Queue as Saved Playlist"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearQueue}
                  className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition"
                  title="Clear Queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
          {/* Add / Import Music & Playlist Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm min-h-[36px]"
            title="Import audio files (.mp3, .flac, .wav, .m4a) or playlist files (.m3u, .pls, .json) from your computer or device"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Add File</span>
          </button>

          {/* Delete Default Music Button */}
          {defaultTrackCount > 0 && onDeleteDefaultMusic && (
            <button
              onClick={onDeleteDefaultMusic}
              className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Delete default sample tracks from crate and library"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Default ({defaultTrackCount})</span>
            </button>
          )}
        </div>

        {/* Load Library Playlist dropdown if saved playlists exist */}
        {playlists.length > 0 && onLoadPlaylistToQueue && (
          <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-800/60 flex items-center gap-2">
            <ListMusic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedPlaylistId}
              onChange={(e) => {
                setSelectedPlaylistId(e.target.value);
                if (e.target.value) handleLoadPlaylist(e.target.value);
              }}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              <option value="">Load Saved Playlist into Crate...</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.items.length} tracks)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Currently Playing Card */}
          {currentItem && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-semibold">
                  Now Playing
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  Track {currentIndex + 1} of {queue.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3">
                <img
                  src={currentItem.artwork}
                  alt={currentItem.title}
                  className="w-12 h-12 rounded-lg object-cover shadow shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{currentItem.title}</span>
                    {currentItem.id.startsWith('track-') && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800 text-amber-400 border border-amber-500/30 shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 truncate">
                    {currentItem.artist || currentItem.genre || 'Media'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="p-1.5 rounded-full bg-cyan-500 text-neutral-950">
                    <Disc className="w-4 h-4 animate-spin" />
                  </div>
                  <button
                    onClick={() => onRemoveItem(currentIndex)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Remove currently playing track from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-semibold">
                Up Next ({upNext.length})
              </span>
            </div>

            {upNext.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-amber-500/50 transition cursor-pointer group space-y-2"
              >
                <Upload className="w-6 h-6 text-neutral-500 group-hover:text-amber-400 mx-auto transition" />
                <div>
                  <p className="font-semibold text-neutral-300 group-hover:text-amber-300 transition">
                    Crate is empty
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Click or drop .mp3, .flac, .m3u, .pls or .json playlist files from your computer or device
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upNext.map((item, relIndex) => {
                  const absoluteIndex = currentIndex + 1 + relIndex;
                  const isDefaultTrack = item.id.startsWith('track-') || item.id.includes('sample');

                  return (
                    <div
                      key={`${item.id}-${absoluteIndex}`}
                      className="group p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/50 flex items-center gap-3 transition"
                    >
                      <img
                        src={item.artwork}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <div
                        onClick={() => onSelectIndex(absoluteIndex)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-neutral-200 group-hover:text-cyan-400 truncate transition flex items-center gap-1.5">
                          <span className="truncate">{item.title}</span>
                          {isDefaultTrack && (
                            <span className="px-1 py-0.2 text-[8px] font-mono rounded bg-neutral-800 text-amber-400/80 border border-amber-500/20 shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {item.artist || item.genre || 'Media'}
                        </div>
                      </div>

                      {/* Reorder and Delete controls */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {relIndex > 0 && (
                          <button
                            onClick={() => onMoveItem(absoluteIndex, absoluteIndex - 1)}
                            className="p-1 text-neutral-400 hover:text-white"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {relIndex < upNext.length - 1 && (
                          <button
                            onClick={() => onMoveItem(absoluteIndex, absoluteIndex + 1)}
                            className="p-1 text-neutral-400 hover:text-white"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onRemoveItem(absoluteIndex)}
                          className="p-1 text-neutral-400 hover:text-rose-400"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
