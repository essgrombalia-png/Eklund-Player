import React, { useState } from 'react';
import { X, Plus, Check, ListMusic } from 'lucide-react';
import { MediaItem, Playlist } from '../../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: MediaItem | null;
  playlists: Playlist[];
  onCreatePlaylist: (name: string, description?: string) => Promise<Playlist>;
  onToggleItemInPlaylist: (playlistId: string, mediaId: string) => void;
}

export const AddToPlaylistModal = ({
  isOpen,
  onClose,
  mediaItem,
  playlists,
  onCreatePlaylist,
  onToggleItemInPlaylist,
}: AddToPlaylistModalProps) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen || !mediaItem) return null;

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = await onCreatePlaylist(newPlaylistName.trim());
    onToggleItemInPlaylist(pl.id, mediaItem.id);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-display">Add to Playlist</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 flex items-center gap-3 border-b border-neutral-900">
          <img
            src={mediaItem.artwork}
            alt={mediaItem.title}
            className="w-12 h-12 rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{mediaItem.title}</div>
            <div className="text-xs text-neutral-400 truncate">
              {mediaItem.artist || mediaItem.genre || 'Media'}
            </div>
          </div>
        </div>

        {/* Existing Playlists list */}
        <div className="py-3 max-h-60 overflow-y-auto space-y-1.5">
          {playlists.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-4">No playlists yet. Create one below!</p>
          ) : (
            playlists.map((pl) => {
              const containsItem = pl.items.includes(mediaItem.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => onToggleItemInPlaylist(pl.id, mediaItem.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-left transition"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{pl.name}</div>
                    <div className="text-xs text-neutral-500">{pl.items.length} items</div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      containsItem
                        ? 'bg-cyan-500 border-cyan-400 text-neutral-950'
                        : 'border-neutral-700 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create new playlist toggle/form */}
        <div className="pt-3 border-t border-neutral-800">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-cyan-500 text-neutral-950 font-bold rounded-xl text-xs hover:bg-cyan-400 transition"
                >
                  Create & Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-neutral-900 text-neutral-400 rounded-xl text-xs hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> New Playlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
