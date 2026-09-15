import { MediaItem, Playlist } from '../types';

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  // --- MUSIC TRACKS ---
  {
    id: 'track-1',
    title: 'Midnight Resonance (80s Vibe)',
    type: 'music',
    artist: 'Aetheria Soundworks',
    album: 'Neon Horizon',
    albumArtist: 'Aetheria Soundworks',
    year: 2024,
    genre: 'Synthwave / Retrowave',
    duration: 180,
    bpm: 120,
    trackNumber: 1,
    discNumber: 1,
    url: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3',
    artwork: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'FLAC 24-bit / 96kHz',
    bitrate: '1411 kbps',
    sampleRate: '96.0 kHz',
    colorAccent: '#06b6d4',
    isFavorite: true,
    addedAt: Date.now() - 86400000 * 3,
    lastPlayedAt: Date.now() - 3600000 * 2,
    playCount: 14,
    resumePosition: 24,
    lyrics: `[00:00.00] (Synth Arpeggio intro - gentle electronic pulse)
[00:08.50] Neon bleeding through the midnight mist
[00:15.20] Reflections on asphalt where dreams persist
[00:22.00] Echoes of frequencies traveling light
[00:29.80] We spin into orbit across the night
[00:36.50] (Analog Synthesizer Lead solo)
[00:48.20] Analog warmth in a digital wire
[00:54.00] Grooves of the vinyl igniting the fire
[01:02.10] Can you feel the bassline underneath your feet?
[01:08.90] Timeless harmonics in every beat
[01:16.40] (Deep sub-bass drop & rhythmic percussion)
[01:28.00] Floating through dimensions unknown
[01:34.50] A universe of sound carved in stone
[01:42.10] Neon horizon slowly fades to dawn
[01:50.00] But the music still plays on and on
[02:00.00] (Atmospheric vinyl outtro with tape delay)`,
  },
  {
    id: 'track-2',
    title: 'To Be Free (Acoustic Master)',
    type: 'music',
    artist: 'Aether Chamber Orchestra',
    album: 'Impressionist Nocturnes',
    albumArtist: 'Aether Chamber Orchestra',
    year: 2023,
    genre: 'Classical / Ambient Piano',
    duration: 215,
    bpm: 88,
    trackNumber: 2,
    discNumber: 1,
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/5071-tobefree.mp3',
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'DSD 5.6MHz / Master',
    bitrate: '5644 kbps',
    sampleRate: '192.0 kHz',
    colorAccent: '#818cf8',
    isFavorite: true,
    addedAt: Date.now() - 86400000 * 7,
    lastPlayedAt: Date.now() - 86400000,
    playCount: 28,
    resumePosition: 45,
    lyrics: `[00:00.00] (Adagio sostenuto - Delicate acoustic phrasing)
[00:18.00] In the quiet space between the notes
[00:32.50] Where the gentle river floats
[00:46.00] Playing melodies of the free
[01:02.00] Underneath the ancient tree
[01:20.00] (Cascading arpeggios of piano & strings)
[01:45.00] Every harmony in tune
[02:02.00] Basking under summer moon
[02:22.00] Finding peace within the sound
[02:40.00] Lifting spirits off the ground
[02:55.00] (Subtle harmonic sustain & pedal decay)`,
  },
  {
    id: 'track-3',
    title: 'Rave Digger (Cyberpunk Anthem)',
    type: 'music',
    artist: 'Kroma Flux',
    album: 'Sector 09',
    albumArtist: 'Kroma Flux',
    year: 2024,
    genre: 'Cyberpunk / Darksynth',
    duration: 198,
    bpm: 132,
    trackNumber: 3,
    discNumber: 1,
    url: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/rave_digger.mp3',
    artwork: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'Dolby Atmos / 24-bit',
    bitrate: '768 kbps',
    sampleRate: '48.0 kHz',
    colorAccent: '#ec4899',
    isFavorite: false,
    addedAt: Date.now() - 86400000 * 2,
    playCount: 8,
    lyrics: `[00:00.00] (Industrial beat sequence initiated)
[00:12.00] Grid online. Scanning telemetry data.
[00:20.00] Beneath the towering monoliths of chrome
[00:26.50] Concrete corridors where shadows roam
[00:34.00] Cybernetic pulses deep within the core
[00:41.50] Electric dreams waking on the lower floor
[00:50.00] (Heavy distorted synth bassline drop)
[01:04.00] Overclock the system, push beyond the threshold
[01:12.50] Stories that the mainframe never told
[01:22.00] We are the signals lost in the wire
[01:30.00] Dancing in the virtual fire
[01:44.00] (Breakdown & modular filter sweep)`,
  },
  {
    id: 'track-4',
    title: 'Running Out (Vintage Soul)',
    type: 'music',
    artist: 'The Blue Avenue Trio',
    album: 'Rain on Brick Lane',
    albumArtist: 'The Blue Avenue Trio',
    year: 2022,
    genre: 'Cool Jazz / Lounge',
    duration: 215,
    bpm: 104,
    trackNumber: 4,
    discNumber: 1,
    url: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/running_out.mp3',
    artwork: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'Lossless Hi-Res / 24-bit',
    bitrate: '9216 kbps',
    sampleRate: '192.0 kHz',
    colorAccent: '#f59e0b',
    isFavorite: true,
    addedAt: Date.now() - 86400000 * 5,
    playCount: 19,
    lyrics: `[00:00.00] (Brush snare & upright acoustic bass intro)
[00:15.00] Steaming cup on a rainy glass table
[00:24.00] Soft blue sax telling stories old and fable
[00:35.00] Streetlamps flickering in amber glow
[00:46.00] Take it easy, let the evening flow
[00:58.00] (Tenor saxophone solo - smoky vintage tone)
[01:25.00] Chords like honey pouring slow and sweet
[01:38.00] Footsteps gentle on the quiet street
[01:52.00] Close your eyes and let the trumpet sigh
[02:05.00] Underneath the velvet London sky`,
  },
  {
    id: 'track-5',
    title: 'Viper (Analog Audio Spectrum)',
    type: 'music',
    artist: 'Nordic Soundscapes',
    album: 'Fjords & Stars',
    albumArtist: 'Nordic Soundscapes',
    year: 2023,
    genre: 'Ambient / Cinematic Drone',
    duration: 240,
    bpm: 118,
    trackNumber: 5,
    discNumber: 1,
    url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3',
    artwork: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'FLAC 24-bit / 96kHz',
    bitrate: '1240 kbps',
    sampleRate: '96.0 kHz',
    colorAccent: '#10b981',
    isFavorite: false,
    addedAt: Date.now() - 86400000 * 6,
    playCount: 5,
    lyrics: `[00:00.00] (Crystalline pads and distant wind chimes)
[00:25.00] Ribbons of emerald green across the polar night
[00:50.00] Cosmic particles dancing in solar light
[01:20.00] Frozen horizons stretching into eternity
[01:50.00] Breathing the stillness of polar serenity
[02:15.00] (Ethereal overtone singing & sub harmonic fade)`,
  },
  {
    id: 'track-6',
    title: 'Aetherian Glow (Synth Arp)',
    type: 'music',
    artist: 'The Starlight Rhythm Band',
    album: 'Soul Odyssey 1977',
    albumArtist: 'The Starlight Rhythm Band',
    year: 1977,
    genre: 'Classic Soul / Funk Vinyl',
    duration: 185,
    trackNumber: 6,
    discNumber: 1,
    url: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    audioFormat: 'Analog Master 1/2" Tape / 192kHz',
    bitrate: '4608 kbps',
    sampleRate: '192.0 kHz',
    colorAccent: '#f97316',
    isFavorite: true,
    addedAt: Date.now() - 86400000 * 9,
    playCount: 22,
    lyrics: `[00:00.00] (Warm vinyl crackle & Fender Rhodes groove)
[00:14.00] Golden sun sinking slow in the western sky
[00:27.00] Feel the bassline rolling by
[00:40.00] Horns singing stories of yesterday
[00:54.00] Wash all the heavy troubles away
[01:10.00] (Analog wah-wah guitar & brass fanfare)
[01:32.00] Keep that record spinning round
[01:45.00] That authentic analog sound`,
  },
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Midnight Vinyl Sessions',
    description: 'Analog warmth, retrowave synths, and late-night contemplation on 33 RPM.',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    items: ['track-1', 'track-3', 'track-5', 'track-6'],
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'playlist-2',
    name: 'Audiophile Gold Master Crate',
    description: 'Pristine high-dynamic-range acoustic and jazz pressings on virgin vinyl.',
    coverUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
    items: ['track-2', 'track-4', 'track-6'],
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'playlist-3',
    name: 'Late Night Coffee & Lo-Fi',
    description: 'Warm tape saturation, crackle, and soothing Rhodes melodies.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    items: ['track-4', 'track-1', 'track-2'],
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 6,
  },
];

export const sampleMedia = INITIAL_MEDIA_ITEMS;
export const samplePlaylists = INITIAL_PLAYLISTS;

