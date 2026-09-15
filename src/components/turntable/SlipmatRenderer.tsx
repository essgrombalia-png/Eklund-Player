import React from 'react';
import { SlipmatDesign, SlipmatConfig } from '../../types';

interface SlipmatRendererProps {
  design: SlipmatDesign;
  config?: SlipmatConfig;
  className?: string;
  showSpindle?: boolean;
}

export const SlipmatRenderer: React.FC<SlipmatRendererProps> = ({
  design,
  config,
  className = '',
  showSpindle = true,
}) => {
  const customImageUrl = config?.customImageUrl || design.customImageUrl;
  const customColor = config?.customColor || design.customColor || '#1c1b22';
  const customAccent = config?.customAccentColor || design.customAccentColor || '#dfbc60';
  const customScale = config?.customScale || 1.0;

  return (
    <div
      className={`relative w-full h-full rounded-full overflow-hidden select-none ${className}`}
      style={{
        boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.85)',
      }}
    >
      {/* 1. TECHNICS GOLD CLASSIC FELT */}
      {design.patternType === 'technics-felt-classic' && (
        <div className="absolute inset-0 rounded-full bg-[#121217] flex items-center justify-center overflow-hidden">
          {/* Felt Fiber Micro-texture layer */}
          <div
            className="absolute inset-0 rounded-full opacity-40 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `radial-gradient(#2d2d38 1px, transparent 1px), radial-gradient(#1f1f28 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
              backgroundPosition: '0 0, 2px 2px',
            }}
          />
          {/* Subtle Outer Felt Bevel Ring */}
          <div className="absolute inset-1.5 rounded-full border border-amber-500/20" />
          <div className="absolute inset-3 rounded-full border border-neutral-700/40" />
          <div className="absolute inset-[15%] rounded-full border border-neutral-800/60" />
          <div className="absolute inset-[26%] rounded-full border border-neutral-800/80" />

          {/* Strobe Calibration Dots */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="185" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3 7" />
            <circle cx="200" cy="200" r="172" fill="none" stroke="#e6c86e" strokeWidth="1" strokeDasharray="2 6" />
          </svg>

          {/* Center Technics Gold Foil Brandmark & Reverse Shadow */}
          <div className="flex flex-col items-center justify-center select-none pointer-events-none z-10 scale-90 sm:scale-100">
            {/* Top Technics Gold Wordmark */}
            <div
              className="font-serif font-black tracking-tight text-[#dfbc60] uppercase select-none text-2xl sm:text-3xl lg:text-4xl"
              style={{
                letterSpacing: '0.04em',
                textShadow: '0 0 14px rgba(223, 188, 96, 0.45), 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              Technics
            </div>
            {/* SL-1200 Gold Edition Sub-script */}
            <div className="text-[7.5px] sm:text-[9px] font-mono tracking-widest text-amber-200/70 uppercase -mt-0.5">
              SL-1200GLD • DIRECT DRIVE
            </div>
            {/* Technics Inverted Shadow Reflection */}
            <div
              className="font-serif font-black tracking-tight text-neutral-800 uppercase select-none text-2xl sm:text-3xl lg:text-4xl -scale-y-100 opacity-60 mt-1"
              style={{ letterSpacing: '0.04em' }}
            >
              Technics
            </div>
          </div>
        </div>
      )}

      {/* 2. TECHNICS 500g HEAVYWEIGHT DAMPED STUDIO RUBBER */}
      {design.patternType === 'technics-rubber-ribbed' && (
        <div className="absolute inset-0 rounded-full bg-[#151518] flex items-center justify-center overflow-hidden">
          {/* Heavy matte rubber surface lighting */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 40%, #202026 0%, #151519 50%, #0d0d10 100%)',
            }}
          />

          {/* Concentric Tactile Sound-Damping Ribs (Authentic Technics Rubber Mat) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
            {/* Outer Ribbed Tier */}
            <circle cx="200" cy="200" r="192" fill="none" stroke="#08080a" strokeWidth="3" />
            <circle cx="200" cy="200" r="184" fill="none" stroke="#2c2c34" strokeWidth="2.5" />
            <circle cx="200" cy="200" r="176" fill="none" stroke="#0b0b0e" strokeWidth="2.5" />
            <circle cx="200" cy="200" r="166" fill="none" stroke="#25252e" strokeWidth="3" />
            <circle cx="200" cy="200" r="154" fill="none" stroke="#0c0c0f" strokeWidth="3" />

            {/* Mid-Platter Isolation Grooves */}
            <circle cx="200" cy="200" r="140" fill="none" stroke="#24242d" strokeWidth="4" />
            <circle cx="200" cy="200" r="126" fill="none" stroke="#0a0a0c" strokeWidth="2.5" />
            <circle cx="200" cy="200" r="112" fill="none" stroke="#25252f" strokeWidth="3.5" />
            <circle cx="200" cy="200" r="98" fill="none" stroke="#0c0c10" strokeWidth="3" />
            <circle cx="200" cy="200" r="82" fill="none" stroke="#23232c" strokeWidth="4" />

            {/* Radial Air Discharge / Traction Channels at 30-degree angles */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="200"
                y1="200"
                x2={200 + 185 * Math.cos((deg * Math.PI) / 180)}
                y2={200 + 185 * Math.sin((deg * Math.PI) / 180)}
                stroke="#09090b"
                strokeWidth="2"
                strokeDasharray="8 8"
                opacity="0.85"
              />
            ))}

            {/* Recessed Center Label Cup (for record label clearance) */}
            <circle cx="200" cy="200" r="54" fill="#0c0c0f" stroke="#2a2a34" strokeWidth="2" />
            <circle cx="200" cy="200" r="52" fill="none" stroke="#050507" strokeWidth="1.5" />
          </svg>

          {/* Embossed Matte Technics Branding */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase"
              style={{
                textShadow: '0 1px 1px #000, 0 -1px 1px rgba(255,255,255,0.1)',
              }}
            >
              TECHNICS
            </div>
            <div className="text-[7px] sm:text-[8px] font-mono tracking-widest text-neutral-500 mt-0.5">
              500G VIBRATION ABSORBER
            </div>
          </div>
        </div>
      )}

      {/* 3. PORTUGUESE ORGANIC CORK */}
      {design.patternType === 'organic-cork' && (
        <div className="absolute inset-0 rounded-full bg-[#af7b47] flex items-center justify-center overflow-hidden">
          {/* Natural Cork Grain Texture */}
          <div
            className="absolute inset-0 rounded-full opacity-90 pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 50% 50%, #ba8651 0%, #9e6b3b 60%, #7d5028 100%),
                radial-gradient(#5a391d 1px, transparent 1px),
                radial-gradient(#cda06a 1.2px, transparent 1.2px)
              `,
              backgroundSize: '100% 100%, 8px 8px, 12px 12px',
              backgroundPosition: '0 0, 4px 4px, 2px 2px',
            }}
          />

          {/* Laser-Etched Strobe & Alignment Crosshairs */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" viewBox="0 0 400 400">
            {/* Outer Strobe Rings */}
            <circle cx="200" cy="200" r="186" fill="none" stroke="#482b13" strokeWidth="2" strokeDasharray="3 5" />
            <circle cx="200" cy="200" r="174" fill="none" stroke="#5a381a" strokeWidth="1.5" strokeDasharray="4 6" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="#482b13" strokeWidth="1" strokeDasharray="2 4" />

            {/* Geometric Cartridge Alignment Grid Lines */}
            <circle cx="200" cy="200" r="130" fill="none" stroke="#4a2d15" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="95" fill="none" stroke="#4a2d15" strokeWidth="1" />
            <circle cx="200" cy="200" r="60" fill="none" stroke="#4a2d15" strokeWidth="1.5" />

            {/* Precision Crosshair Lines */}
            <line x1="40" y1="200" x2="360" y2="200" stroke="#4a2d15" strokeWidth="0.75" strokeDasharray="4 4" />
            <line x1="200" y1="40" x2="200" y2="360" stroke="#4a2d15" strokeWidth="0.75" strokeDasharray="4 4" />

            {/* Calibration Degree Arcs */}
            {[45, 135, 225, 315].map((deg) => (
              <line
                key={deg}
                x1={200 + 40 * Math.cos((deg * Math.PI) / 180)}
                y1={200 + 40 * Math.sin((deg * Math.PI) / 180)}
                x2={200 + 175 * Math.cos((deg * Math.PI) / 180)}
                y2={200 + 175 * Math.sin((deg * Math.PI) / 180)}
                stroke="#543317"
                strokeWidth="0.75"
                strokeDasharray="2 6"
              />
            ))}
          </svg>

          {/* Laser-burned Cork Emblem */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="text-[10px] sm:text-xs font-serif font-black tracking-widest text-[#3d220e] uppercase"
              style={{
                textShadow: '0 1px 1px rgba(255, 255, 255, 0.25)',
              }}
            >
              PORTUGUESE CORK
            </div>
            <div className="text-[7px] sm:text-[8px] font-mono tracking-wider text-[#4d2d14] mt-0.5">
              AUDIOPHILE DECOUPLING • 33⅓ / 45
            </div>
          </div>
        </div>
      )}

      {/* 4. TOKYO NEON CYBER-GRID */}
      {design.patternType === 'tokyo-neon-grid' && (
        <div className="absolute inset-0 rounded-full bg-[#080812] flex items-center justify-center overflow-hidden">
          {/* Deep dark nebula underglow */}
          <div
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #ec489920 0%, #06b6d425 45%, #050510 85%)',
            }}
          />

          {/* Perspective Cyber Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
            <defs>
              <linearGradient id="neonCyanPink" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Glowing Concentric Radar Rings */}
            <circle cx="200" cy="200" r="185" fill="none" stroke="#ec4899" strokeWidth="1.5" opacity="0.6" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.65" />
            <circle cx="200" cy="200" r="130" fill="none" stroke="url(#neonCyanPink)" strokeWidth="2" opacity="0.8" />
            <circle cx="200" cy="200" r="90" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.7" />
            <circle cx="200" cy="200" r="55" fill="none" stroke="#ec4899" strokeWidth="2" opacity="0.9" />

            {/* Radial Perspective Laser Rays */}
            {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345].map((deg) => (
              <line
                key={deg}
                x1={200 + 40 * Math.cos((deg * Math.PI) / 180)}
                y1={200 + 40 * Math.sin((deg * Math.PI) / 180)}
                x2={200 + 190 * Math.cos((deg * Math.PI) / 180)}
                y2={200 + 190 * Math.sin((deg * Math.PI) / 180)}
                stroke={deg % 30 === 0 ? '#06b6d4' : '#ec4899'}
                strokeWidth={deg % 30 === 0 ? '1.5' : '0.8'}
                opacity={deg % 30 === 0 ? '0.75' : '0.4'}
              />
            ))}

            {/* Simulated Synthesizer Audio Waveform in ring */}
            <circle cx="200" cy="200" r="110" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="2 3 6 3 10 3" opacity="0.85" />
          </svg>

          {/* Glowing Center Logo Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="text-[12px] sm:text-sm font-mono font-black tracking-[0.2em] text-cyan-300 uppercase"
              style={{
                textShadow: '0 0 10px #06b6d4, 0 0 20px #ec4899',
              }}
            >
              TOKYO • NEON
            </div>
            <div className="text-[7px] sm:text-[8px] font-mono tracking-widest text-fuchsia-300 mt-0.5">
              CYBER DECK SYNTH-MAT
            </div>
          </div>
        </div>
      )}

      {/* 5. HYPNOTIC FIBONACCI SPIRAL (OPTICAL ILLUSION) */}
      {design.patternType === 'hypnotic-spiral' && (
        <div className="absolute inset-0 rounded-full bg-black flex items-center justify-center overflow-hidden">
          {/* Op-Art Fibonacci Archimedean Spiral in High Contrast SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
            <defs>
              <mask id="spiralMask">
                <circle cx="200" cy="200" r="198" fill="white" />
              </mask>
            </defs>
            <g mask="url(#spiralMask)">
              {/* Multiturn Spiral Blades */}
              {[...Array(16)].map((_, i) => {
                const angle = (i * 360) / 16;
                return (
                  <path
                    key={i}
                    d={`M 200 200 Q ${200 + 120 * Math.cos(((angle + 30) * Math.PI) / 180)} ${
                      200 + 120 * Math.sin(((angle + 30) * Math.PI) / 180)
                    } ${200 + 200 * Math.cos((angle * Math.PI) / 180)} ${
                      200 + 200 * Math.sin((angle * Math.PI) / 180)
                    } A 200 200 0 0 1 ${200 + 200 * Math.cos(((angle + 11.25) * Math.PI) / 180)} ${
                      200 + 200 * Math.sin(((angle + 11.25) * Math.PI) / 180)
                    } Q ${200 + 120 * Math.cos(((angle + 41.25) * Math.PI) / 180)} ${
                      200 + 120 * Math.sin(((angle + 41.25) * Math.PI) / 180)
                    } 200 200 Z`}
                    fill={i % 2 === 0 ? '#ffffff' : '#0a0a0d'}
                  />
                );
              })}
              {/* Concentric rings to accentuate optical depth */}
              <circle cx="200" cy="200" r="160" fill="none" stroke="#222" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="110" fill="none" stroke="#111" strokeWidth="2" />
              <circle cx="200" cy="200" r="60" fill="none" stroke="#222" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Minimal Center Core Ring */}
          <div className="absolute w-20 h-20 rounded-full border border-black bg-white/90 shadow-md flex items-center justify-center pointer-events-none z-10">
            <div className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-widest text-black uppercase">
              VORTEX
            </div>
          </div>
        </div>
      )}

      {/* 6. LUXURY ITALIAN STITCHED WHITE LEATHER */}
      {design.patternType === 'luxury-white-leather' && (
        <div className="absolute inset-0 rounded-full bg-[#f2eee6] flex items-center justify-center overflow-hidden">
          {/* Subtle pebbled leather texture */}
          <div
            className="absolute inset-0 rounded-full opacity-60 pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 50% 50%, #ffffff 0%, #ede8de 70%, #ded7ca 100%),
                radial-gradient(#b8ae9c 0.8px, transparent 0.8px)
              `,
              backgroundSize: '100% 100%, 6px 6px',
            }}
          />

          {/* Precision Perimeter Stitched Seam (Gold / Saddle Brown) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
            {/* Outer stitch line */}
            <circle cx="200" cy="200" r="184" fill="none" stroke="#8b6e4e" strokeWidth="2" strokeDasharray="6 4" opacity="0.9" />
            <circle cx="200" cy="200" r="182" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeDasharray="6 4" opacity="0.7" />

            {/* Inner concentric stitch ring */}
            <circle cx="200" cy="200" r="150" fill="none" stroke="#c0a688" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
            <circle cx="200" cy="200" r="75" fill="none" stroke="#8b6e4e" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
          </svg>

          {/* Gold Foil Debossed Artisan Studio Seal */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#caa455] flex flex-col items-center justify-center p-2 bg-gradient-to-tr from-[#fbf8f0] via-[#f7f3e8] to-[#eee8da] shadow-inner"
            >
              <div className="text-[7px] sm:text-[7.5px] font-mono tracking-widest text-[#a6802e] uppercase font-bold">
                MILANO • 1972
              </div>
              <div
                className="text-[11px] sm:text-xs font-serif font-black tracking-widest text-[#947024] uppercase mt-0.5"
                style={{ textShadow: '0 1px 1px rgba(255,255,255,0.8)' }}
              >
                STUDIO PELLE
              </div>
              <div className="text-[6.5px] sm:text-[7px] font-sans tracking-wide text-[#b08c3e] mt-0.5">
                GENUINE LEATHER
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. PRISMATIC AURORA HOLOGRAPHIC */}
      {design.patternType === 'prismatic-hologram' && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden">
          {/* Conic rainbow iridescent gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                conic-gradient(from 45deg, 
                  #ef4444 0deg, 
                  #f59e0b 45deg, 
                  #10b981 100deg, 
                  #06b6d4 160deg, 
                  #3b82f6 220deg, 
                  #8b5cf6 280deg, 
                  #ec4899 330deg, 
                  #ef4444 360deg
                )
              `,
              filter: 'saturate(1.2) contrast(1.1)',
            }}
          />

          {/* Shimmering Metallic Diffraction Rings */}
          <div
            className="absolute inset-0 rounded-full mix-blend-overlay opacity-80"
            style={{
              background: 'repeating-radial-gradient(circle, rgba(255,255,255,0.4) 0px, transparent 2px, rgba(0,0,0,0.3) 4px, transparent 6px)',
            }}
          />

          {/* Prismatic Specular Glint */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, transparent 40%, rgba(255,255,255,0.6) 70%, transparent 100%)',
            }}
          />

          {/* Centered Hologram Emblem */}
          <div className="absolute w-28 h-28 rounded-full border border-white/60 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-2 z-10 shadow-xl">
            <div className="text-[10px] sm:text-xs font-mono font-black tracking-widest text-white uppercase drop-shadow-md">
              AURORA
            </div>
            <div className="text-[7px] font-mono tracking-wider text-cyan-200 mt-0.5">
              PRISMATIC FILM
            </div>
          </div>
        </div>
      )}

      {/* 8. OBSIDIAN & GOLD MARBLE */}
      {design.patternType === 'cosmic-marble' && (
        <div className="absolute inset-0 rounded-full bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
          {/* Fluid Swirling Marble Texture */}
          <div
            className="absolute inset-0 rounded-full opacity-90 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, #1e1e2d 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, #14141e 0%, transparent 50%),
                conic-gradient(from 180deg at 50% 50%, #0d0d12 0deg, #1c1c28 90deg, #09090c 180deg, #252535 270deg, #0d0d12 360deg)
              `,
            }}
          />

          {/* Gold Vein Fractures SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-85" viewBox="0 0 400 400">
            <path
              d="M 50 120 Q 140 80 190 160 T 320 220 T 380 340"
              fill="none"
              stroke="#dfbc60"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="drop-shadow(0 0 3px rgba(223, 188, 96, 0.6))"
            />
            <path
              d="M 120 350 Q 180 270 240 260 T 340 140"
              fill="none"
              stroke="#fae6a6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 190 160 Q 230 140 260 90"
              fill="none"
              stroke="#b58622"
              strokeWidth="1.2"
            />
            <circle cx="210" cy="180" r="1.5" fill="#ffd700" />
            <circle cx="280" cy="140" r="2" fill="#ffd700" />
            <circle cx="150" cy="280" r="1.8" fill="#ffd700" />
          </svg>

          {/* Center Minimal Gold Ring */}
          <div className="absolute w-24 h-24 rounded-full border border-amber-400/40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-2 z-10 shadow-lg">
            <div className="text-[9px] sm:text-[10px] font-serif font-black tracking-widest text-amber-300 uppercase">
              OBSIDIAN
            </div>
            <div className="text-[6.5px] font-mono tracking-wider text-amber-100/70 mt-0.5">
              GOLD VEIN
            </div>
          </div>
        </div>
      )}

      {/* 9. 70s RETRO SUNSET GROOVES */}
      {design.patternType === 'retro-sunset-grooves' && (
        <div className="absolute inset-0 rounded-full bg-[#1b120c] flex items-center justify-center overflow-hidden">
          {/* Concentric Warm Sunset Stripes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="195" fill="#8c2514" />
            <circle cx="200" cy="200" r="172" fill="#bc3e1b" />
            <circle cx="200" cy="200" r="150" fill="#dc6221" />
            <circle cx="200" cy="200" r="128" fill="#eb8828" />
            <circle cx="200" cy="200" r="106" fill="#f4b23b" />
            <circle cx="200" cy="200" r="84" fill="#fae075" />
            <circle cx="200" cy="200" r="62" fill="#fdf4cf" />
            <circle cx="200" cy="200" r="42" fill="#1b120c" />

            {/* Subtle Grooves Layer */}
            {[180, 160, 140, 120, 100, 80, 60].map((r) => (
              <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            ))}
          </svg>

          {/* Retro 70s Font Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="text-[10px] sm:text-xs font-serif font-black tracking-widest text-amber-300 uppercase drop-shadow">
              SUNSET '74
            </div>
            <div className="text-[6.5px] sm:text-[7px] font-mono tracking-wider text-amber-200/80">
              ANALOG SOUND
            </div>
          </div>
        </div>
      )}

      {/* 10. CUSTOM ARTIST SLIPMAT / USER UPLOADED IMAGE */}
      {design.patternType === 'custom-image' && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: customColor }}
        >
          {customImageUrl ? (
            <img
              src={customImageUrl}
              alt="Custom Slipmat"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{
                transform: `scale(${customScale})`,
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center select-none pointer-events-none">
              <div
                className="font-serif font-black tracking-tight uppercase text-xl sm:text-2xl"
                style={{ color: customAccent }}
              >
                Custom Slipmat
              </div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 mt-1">
                Upload image or customize colors
              </div>
            </div>
          )}

          {/* Optional Strobe Alignment Rings on Custom Mat */}
          <div className="absolute inset-2 rounded-full border border-white/20 pointer-events-none" />
          <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
        </div>
      )}

      {/* Center Brass Spindle Bushing Ring (Authentic hardware detail) */}
      {showSpindle && (
        <div
          className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center pointer-events-none z-30"
          style={{
            background: 'radial-gradient(circle, #fae6a6 0%, #dfbf66 50%, #9a6f15 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.7)',
            border: '1.5px solid rgba(251, 191, 36, 0.9)',
          }}
        >
          {/* Spindle Center Hole */}
          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#0d0d11] border border-neutral-800 shadow-inner flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#050507]" />
          </div>
        </div>
      )}
    </div>
  );
};
