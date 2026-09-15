import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPng(width, height, getPixel) {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw uncompressed scanlines: each row starts with filter byte 0 (None), followed by width * 4 bytes RGBA
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawScanlines[offset++] = Math.min(255, Math.max(0, Math.round(r)));
      rawScanlines[offset++] = Math.min(255, Math.max(0, Math.round(g)));
      rawScanlines[offset++] = Math.min(255, Math.max(0, Math.round(b)));
      rawScanlines[offset++] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate the Eklund SL-1200 vinyl turntable icon
function renderTurntablePixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const normDist = dist / (w / 2); // 0 at center, 1 at edge

  // Background
  if (isMaskable) {
    // Solid dark metallic background for maskable safe-zone
    if (normDist > 0.95) return [13, 13, 16, 255];
  }

  // Base plinth boundary (rounded rectangle)
  const pad = isMaskable ? w * 0.15 : w * 0.04;
  const inPlinth = x >= pad && x <= w - pad && y >= pad && y <= h - pad;

  // Turntable Platter (circular)
  const platterR = (w / 2) - (isMaskable ? w * 0.18 : w * 0.08);
  if (dist <= platterR) {
    // Platter edge bevel
    if (dist >= platterR - 4) {
      return [220, 185, 90, 255]; // Gold rim
    }
    if (dist >= platterR - 8) {
      return [35, 33, 30, 255]; // Strobe dots track
    }

    // Vinyl Record surface (dark obsidian with concentric grooves)
    const vinylR = platterR - 10;
    if (dist <= vinylR) {
      // Center label (amber gold)
      const labelR = vinylR * 0.35;
      if (dist <= labelR) {
        // Spindle brass hub
        if (dist <= 6) {
          return [250, 230, 160, 255];
        }
        // Label surface with gold gradient
        const angle = Math.atan2(dy, dx);
        const sheen = Math.sin(angle * 3) * 20;
        return [190 + sheen, 140 + sheen, 40 + sheen, 255];
      }

      // Grooves reflection
      const grooveFreq = Math.sin(dist * 0.8) * 15;
      const angle = Math.atan2(dy, dx);
      const lightBeam = Math.abs(Math.sin(angle * 2)) * 30;
      const val = Math.max(12, Math.min(65, 18 + grooveFreq + lightBeam));
      return [val * 1.1, val, val * 0.9, 255];
    }

    return [40, 40, 45, 255];
  }

  // Plinth surface
  if (inPlinth) {
    // Dark brushed aluminum chassis with golden bevel
    const isEdge = x <= pad + 2 || x >= w - pad - 2 || y <= pad + 2 || y >= h - pad - 2;
    if (isEdge) {
      return [210, 175, 75, 255];
    }
    // Brushed metallic texture
    const noise = (x % 3 === 0 ? 4 : 0);
    return [24 + noise, 24 + noise, 28 + noise, 255];
  }

  // Outer corner transparency (for standard icons) or dark fill (for maskable)
  if (isMaskable) {
    return [15, 15, 18, 255];
  }
  return [0, 0, 0, 0];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNG icons
console.log('Generating 192x192 PNG...');
const png192 = createPng(192, 192, (x, y, w, h) => renderTurntablePixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

console.log('Generating 512x512 PNG...');
const png512 = createPng(512, 512, (x, y, w, h) => renderTurntablePixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

console.log('Generating maskable 512x512 PNG...');
const pngMaskable = createPng(512, 512, (x, y, w, h) => renderTurntablePixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

console.log('Generating apple-touch-icon 180x180 PNG...');
const pngApple = createPng(180, 180, (x, y, w, h) => renderTurntablePixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

// 2. Generate vector SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#121214"/>
      <stop offset="40%" stop-color="#18181c"/>
      <stop offset="70%" stop-color="#0f0f11"/>
      <stop offset="95%" stop-color="#242428"/>
      <stop offset="100%" stop-color="#3d3d44"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcedc0"/>
      <stop offset="35%" stop-color="#dfbf66"/>
      <stop offset="70%" stop-color="#be942f"/>
      <stop offset="100%" stop-color="#8c6418"/>
    </linearGradient>
    <radialGradient id="labelGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="65%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
  </defs>

  <!-- Turntable Plinth -->
  <rect x="24" y="24" width="464" height="464" rx="42" fill="#141416" stroke="url(#goldGrad)" stroke-width="4"/>
  
  <!-- Outer Platter Ring with Strobe Dots -->
  <circle cx="230" cy="256" r="186" fill="#202024" stroke="url(#goldGrad)" stroke-width="3"/>
  <circle cx="230" cy="256" r="180" fill="none" stroke="#2c2c34" stroke-width="6" stroke-dasharray="3 6"/>
  
  <!-- Vinyl Record -->
  <circle cx="230" cy="256" r="170" fill="url(#vinylGrad)" stroke="#09090b" stroke-width="2"/>
  
  <!-- Grooves -->
  <circle cx="230" cy="256" r="150" fill="none" stroke="#26262b" stroke-width="1" opacity="0.6"/>
  <circle cx="230" cy="256" r="130" fill="none" stroke="#26262b" stroke-width="1" opacity="0.6"/>
  <circle cx="230" cy="256" r="110" fill="none" stroke="#26262b" stroke-width="1" opacity="0.6"/>
  <circle cx="230" cy="256" r="90" fill="none" stroke="#26262b" stroke-width="1" opacity="0.6"/>
  
  <!-- Center Label Disc -->
  <circle cx="230" cy="256" r="62" fill="url(#labelGrad)" stroke="url(#goldGrad)" stroke-width="2"/>
  <text x="230" y="248" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#fef3c7" text-anchor="middle" letter-spacing="2">EKLUND</text>
  <text x="230" y="266" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#fde68a" text-anchor="middle" letter-spacing="3">SL-1200</text>
  <circle cx="230" cy="256" r="8" fill="#fef08a" stroke="#78350f" stroke-width="1.5"/>

  <!-- Tonearm Assembly -->
  <g transform="translate(415, 110)">
    <!-- Base Gimbal -->
    <circle cx="0" cy="0" r="34" fill="#1c1c20" stroke="url(#goldGrad)" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="22" fill="#0c0c0e" stroke="url(#goldGrad)" stroke-width="1.5"/>
    <!-- Counterweight -->
    <rect x="-14" y="-40" width="28" height="24" rx="4" fill="url(#goldGrad)" stroke="#5e420b" stroke-width="1.5"/>
    <!-- S-Shaped Arm Wand -->
    <path d="M 0 10 Q -20 90 -45 150 Q -70 210 -115 240" fill="none" stroke="url(#goldGrad)" stroke-width="7" stroke-linecap="round"/>
    <!-- Headshell -->
    <g transform="translate(-115, 240) rotate(22)">
      <path d="M -8 0 L 8 0 L 6 28 L -6 28 Z" fill="#18181b" stroke="url(#goldGrad)" stroke-width="2"/>
      <circle cx="0" cy="30" r="2.5" fill="#38bdf8"/>
    </g>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Generated icon.svg successfully.');
