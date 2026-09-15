import React, { memo } from 'react';

interface TechnicsWallpaperBackgroundProps {
  isPlaying?: boolean;
  opacity?: number;
}

export const TechnicsWallpaperBackground: React.FC<TechnicsWallpaperBackgroundProps> = memo(
  ({ isPlaying = false, opacity = 1 }) => {
    return (
      <div
        className="technics-page-wallpaper fixed inset-0 w-screen h-screen pointer-events-none -z-50 select-none overflow-hidden"
        aria-hidden="true"
      >
        {/* High-Resolution Technics Wallpaper Image */}
        <img
          src="/technics-wallpaper.jpg"
          alt="Technics Wallpaper"
          className={`w-full h-full object-cover object-center lg:object-[60%_center] transition-all duration-1000 ${
            isPlaying ? 'scale-[1.02] brightness-90 contrast-[1.08]' : 'scale-100 brightness-[0.82] contrast-[1.05]'
          }`}
          style={{
            opacity: opacity,
            willChange: 'transform, filter',
          }}
          loading="eager"
          decoding="async"
        />

        {/* Ambient atmospheric tint & subtle purple/violet neon diffusion to harmonize with the wallpaper rays */}
        <div
          className={`absolute inset-0 bg-gradient-to-tr from-black/85 via-purple-950/20 to-black/70 mix-blend-multiply transition-opacity duration-1000 ${
            isPlaying ? 'opacity-40' : 'opacity-60'
          }`}
        />

        {/* Outer Edge Vignette to keep UI controls, top bar and bottom transport pristine */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5, 5, 8, 0.45) 75%, rgba(2, 2, 4, 0.85) 100%)',
          }}
        />

        {/* Top and Bottom soft shadows for flawless header and footer contrast */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>
    );
  }
);

TechnicsWallpaperBackground.displayName = 'TechnicsWallpaperBackground';
