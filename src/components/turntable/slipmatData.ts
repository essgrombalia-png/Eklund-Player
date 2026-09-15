import { SlipmatDesign, SlipmatConfig } from '../../types';

export const SLIPMAT_DESIGNS: SlipmatDesign[] = [
  {
    id: 'technics-gold-felt',
    name: 'Technics Gold Edition Felt',
    material: 'felt',
    patternType: 'technics-felt-classic',
    description: 'Classic high-density carbon felt mat with gold foil Technics brandmark and reverse shadow reflection.',
    acousticProfile: 'Smooth DJ cue friction & low static charge',
    thickness: '2.8 mm',
    badgeLabel: 'Technics SL-1200GLD Special Edition',
    logoStyle: 'technics-gold',
    strobeRings: true,
  },
  {
    id: 'studio-rubber-500g',
    name: '500g Heavy Damped Studio Rubber',
    material: 'rubber',
    patternType: 'technics-rubber-ribbed',
    description: 'Authentic heavyweight studio rubber mat with concentric anti-vibration damping ribs and recessed center label cup.',
    acousticProfile: 'Maximum motor rumble absorption & bass tightness',
    thickness: '4.5 mm',
    badgeLabel: 'Technics Heavyweight Studio',
    strobeRings: false,
  },
  {
    id: 'portuguese-cork',
    name: 'Portuguese Organic Cork',
    material: 'cork',
    patternType: 'organic-cork',
    description: 'Natural organic cork composite with anti-static bark granules and laser-engraved 33/45 RPM strobe alignment rings.',
    acousticProfile: 'Organic resonance decoupling & open soundstage',
    thickness: '3.0 mm',
    badgeLabel: 'Audiophile Organic Cork',
    strobeRings: true,
  },
  {
    id: 'tokyo-neon-cyber',
    name: 'Tokyo Neon Cyber-Grid',
    material: 'felt',
    patternType: 'tokyo-neon-grid',
    description: 'Club DJ synthwave felt with glowing magenta & cyan neon perspective gridlines that react with underglow lighting.',
    acousticProfile: 'Ultra-slick slip friction for fast scratching',
    thickness: '2.0 mm',
    badgeLabel: 'Tokyo DJ Club Series',
    strobeRings: true,
  },
  {
    id: 'hypnotic-fibonacci',
    name: 'Hypnotic Spiral Vortex',
    material: 'felt',
    patternType: 'hypnotic-spiral',
    description: 'Op-art optical illusion Fibonacci spiral that creates a mesmerizing stroboscopic depth when spinning at 33 or 45 RPM.',
    acousticProfile: 'High-density spun polyester anti-dust mat',
    thickness: '2.5 mm',
    badgeLabel: 'Optical Illusion Series',
    strobeRings: false,
  },
  {
    id: 'luxury-white-leather',
    name: 'Italian Stitched Leather',
    material: 'leather',
    patternType: 'luxury-white-leather',
    description: 'Premium off-white calfskin studio leather with circular perimeter contrast stitching and gold foil debossed monogram.',
    acousticProfile: 'Silky mid-range clarity & zero static cling',
    thickness: '2.2 mm',
    badgeLabel: 'Artisan Studio Leather',
    strobeRings: false,
  },
  {
    id: 'prismatic-hologram',
    name: 'Prismatic Aurora Hologram',
    material: 'holographic',
    patternType: 'prismatic-hologram',
    description: 'Micro-prismatic diffraction film that casts shimmering chromatic rainbow glints across the platter as it spins.',
    acousticProfile: 'Damped composite with mirror sheen',
    thickness: '2.0 mm',
    badgeLabel: 'Iridescent Aurora Series',
    strobeRings: true,
  },
  {
    id: 'cosmic-marble',
    name: 'Obsidian & Gold Marble',
    material: 'felt',
    patternType: 'cosmic-marble',
    description: 'Deep cosmic obsidian marble with swirling fluid acrylic veins and gold leaf metallic flakes.',
    acousticProfile: 'Silky glide surface with vibration isolation',
    thickness: '2.6 mm',
    badgeLabel: 'Galactic Marble Edition',
    strobeRings: false,
  },
  {
    id: 'retro-sunset',
    name: '70s Sunset Horizon Arc',
    material: 'felt',
    patternType: 'retro-sunset-grooves',
    description: 'Vintage warm sunset color bands from deep burnt orange to sun-drenched amber with retro audio grooves.',
    acousticProfile: 'Classic analog warmth & soft platter contact',
    thickness: '2.5 mm',
    badgeLabel: 'Vintage Hi-Fi Heritage',
    strobeRings: false,
  },
  {
    id: 'custom-artist-mat',
    name: 'Custom Artist Slipmat',
    material: 'custom',
    patternType: 'custom-image',
    description: 'Personalized custom slipmat with your own uploaded artwork, custom base tones, and optional brass spindle ring.',
    acousticProfile: 'Custom crafted slipmat',
    thickness: '2.5 mm',
    badgeLabel: 'Personalized Studio Deck',
    strobeRings: true,
  },
];

export const DEFAULT_SLIPMAT_CONFIG: SlipmatConfig = {
  activeDesignId: 'technics-gold-felt',
  vinylDisplayMode: 'picture-disc',
  slipmatOpacity: 1.0,
  customImageUrl: '',
  customColor: '#1a1a24',
  customAccentColor: '#dfbc60',
  customScale: 1.0,
};

const STORAGE_KEY = 'aether_slipmat_config';

export function loadSlipmatConfig(): SlipmatConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SLIPMAT_CONFIG, ...parsed };
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_SLIPMAT_CONFIG;
}

export function saveSlipmatConfig(config: SlipmatConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}
