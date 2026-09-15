import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Search,
  Link,
  Image as ImageIcon,
  Check,
  Disc,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { MediaItem } from '../../types';
import {
  blobToDataUrl,
  searchAlbumCoversOnline,
  OnlineCoverResult,
} from '../../services/mediaParser';

interface ArtworkEditorModalProps {
  isOpen: boolean;
  track: MediaItem | null;
  onClose: () => void;
  onSaveArtwork: (trackId: string, artworkUrl: string) => void;
}

export const ArtworkEditorModal: React.FC<ArtworkEditorModalProps> = ({
  isOpen,
  track,
  onClose,
  onSaveArtwork,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'url'>('search');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<OnlineCoverResult[]>([]);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (track) {
      setPreviewUrl(track.artwork || '');
      const query = track.artist && track.artist !== 'Vinyl Import'
        ? `${track.artist} ${track.title}`
        : track.title;
      setSearchQuery(query);
      if (query.trim()) {
        performSearch(query);
      }
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchAlbumCoversOnline(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await blobToDataUrl(file);
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error('File read failed:', err);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await blobToDataUrl(file);
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error('Drop read failed:', err);
    }
  };

  const handleApply = () => {
    if (previewUrl && track) {
      onSaveArtwork(track.id, previewUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Album Cover & Vinyl Art</h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {track.title} • {track.artist}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Live 80% Picture Disc Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            {/* Round 80% Picture Disc Mockup */}
            <div className="relative w-36 h-36 rounded-full bg-neutral-950 border-2 border-amber-500/40 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
              {/* Outer Grooves */}
              <div className="absolute inset-0 rounded-full vinyl-grooves opacity-30 pointer-events-none" />
              {/* 80% artwork disc */}
              <div className="absolute inset-[10%] rounded-full overflow-hidden border border-amber-400/40 shadow-inner flex items-center justify-center bg-neutral-900">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl('https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-[10px] text-amber-300 font-bold uppercase">
                    No Cover
                  </div>
                )}
                {/* Clear vinyl resin glaze */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />
                <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
                {/* Center spindle */}
                <div className="absolute w-8 h-8 rounded-full bg-neutral-950 border border-amber-400/80 shadow-md flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                </div>
              </div>
            </div>

            {/* Info details */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold uppercase">
                80% Picture Disc Active
              </span>
              <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
              <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
              <p className="text-[11px] text-neutral-500">
                The album artwork is rendered over 80% of the rotating vinyl platter with concentric acoustic grooves and resin luster.
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'search'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Online Search
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'upload'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                activeTab === 'url'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Link className="w-3.5 h-3.5" /> Image URL
            </button>
          </div>

          {/* TAB 1: Online Search */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  performSearch(searchQuery);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search song title, artist, or album..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Search Art
                </button>
              </form>

              {/* Grid of Results */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewUrl(result.artworkUrl)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      previewUrl === result.artworkUrl
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[1.02]'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="aspect-square bg-neutral-900 relative">
                      <img
                        src={result.artworkUrl}
                        alt={result.albumName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {previewUrl === result.artworkUrl && (
                        <div className="absolute inset-0 bg-amber-500/30 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-neutral-950/90 text-left">
                      <p className="text-[11px] font-bold text-white truncate">{result.albumName || result.trackName}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{result.artistName}</p>
                    </div>
                  </div>
                ))}
              </div>

              {searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No online album artwork found for "{searchQuery}". Try searching by artist name or uploading a file.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group bg-neutral-900/40"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Click or drag & drop image here</h4>
                <p className="text-xs text-neutral-400 mt-1">Supports JPG, PNG, WEBP, GIF, SVG</p>
              </div>
            </div>
          )}

          {/* TAB 3: Custom URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-neutral-300 font-medium">Direct Image URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="flex-1 px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setPreviewUrl(customUrlInput.trim());
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold text-xs shadow-lg transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Apply Album Art
          </button>
        </div>
      </div>
    </div>
  );
};
