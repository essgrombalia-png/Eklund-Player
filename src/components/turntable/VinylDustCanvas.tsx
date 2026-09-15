import React, { useEffect, useRef } from 'react';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  flickerPhase: number;
  flickerSpeed: number;
  type: 'mote' | 'fiber' | 'glint';
  length: number;
  angle: number;
  angularSpeed: number;
  curve: number;
  depth: number; // 0 (settled close to grooves) to 1 (floating higher in air)
}

interface VinylDustCanvasProps {
  isPlaying: boolean;
  bassEnergy?: number;
  playbackSpeed?: number;
  targetLightOn?: boolean;
  ambientRgb?: [number, number, number];
  className?: string;
  density?: number;
}

export const VinylDustCanvas: React.FC<VinylDustCanvasProps> = ({
  isPlaying,
  bassEnergy = 0,
  playbackSpeed = 1,
  targetLightOn = true,
  ambientRgb,
  className = '',
  density = 48,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to keep animation loop stable without re-binding useEffect
  const isPlayingRef = useRef(isPlaying);
  const bassEnergyRef = useRef(bassEnergy);
  const playbackSpeedRef = useRef(playbackSpeed);
  const targetLightOnRef = useRef(targetLightOn);
  const ambientRgbRef = useRef(ambientRgb);

  isPlayingRef.current = isPlaying;
  bassEnergyRef.current = bassEnergy;
  playbackSpeedRef.current = playbackSpeed;
  targetLightOnRef.current = targetLightOn;
  ambientRgbRef.current = ambientRgb;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Generate dust particles
    const initParticles = (w: number, h: number): DustParticle[] => {
      const particles: DustParticle[] = [];
      const count = density;

      for (let i = 0; i < count; i++) {
        // Distribute within circular platter domain with random radial spread
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * (Math.min(w, h) * 0.48);
        const px = w / 2 + Math.cos(angle) * radius;
        const py = h / 2 + Math.sin(angle) * radius;

        const typeRand = Math.random();
        const type: 'mote' | 'fiber' | 'glint' =
          typeRand < 0.68 ? 'mote' : typeRand < 0.88 ? 'fiber' : 'glint';

        particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.15 - 0.05, // subtle natural upward/random air draft
          size: type === 'fiber' ? 0.8 + Math.random() * 0.8 : 0.6 + Math.random() * 1.4,
          baseAlpha: 0.18 + Math.random() * 0.45,
          alpha: 0.25,
          flickerPhase: Math.random() * Math.PI * 2,
          flickerSpeed: 0.8 + Math.random() * 2.2,
          type,
          length: 3.0 + Math.random() * 4.5,
          angle: Math.random() * Math.PI * 2,
          angularSpeed: (Math.random() - 0.5) * 0.04,
          curve: (Math.random() - 0.5) * 1.5,
          depth: Math.random(),
        });
      }
      return particles;
    };

    let particles: DustParticle[] = [];

    // Resize handling with high-DPI sharpness
    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      particles = initParticles(width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);
    resize();

    let lastTime = performance.now();

    // Animation loop
    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08); // delta in seconds
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      if (width > 0 && height > 0) {
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.485;
        const playing = isPlayingRef.current;
        const bass = bassEnergyRef.current;
        const speed = playbackSpeedRef.current;
        const targetLight = targetLightOnRef.current;

        // Air vortex angular velocity from the spinning turntable
        const vortexBaseSpeed = playing ? 1.4 * speed : 0.08;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Vector from platter center
          const dx = p.x - cx;
          const dy = p.y - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          const theta = Math.atan2(dy, dx);

          // Physical air drag & tangential vortex created by the spinning vinyl:
          // Particles near the vinyl surface (low depth) catch strong tangential velocity
          if (playing && r > 5 && r < maxRadius * 1.05) {
            const spinStrength = (1 - p.depth * 0.45) * vortexBaseSpeed;
            // Tangential velocity vector (perpendicular to radius vector in clockwise direction)
            const tanX = -Math.sin(theta) * spinStrength * 22;
            const tanY = Math.cos(theta) * spinStrength * 22;

            // Centrifugal slight outward drift + gentle atmospheric spiral
            const outward = 1.2 * (r / maxRadius);
            const driftX = Math.cos(theta) * outward;
            const driftY = Math.sin(theta) * outward;

            p.x += (tanX + driftX) * dt;
            p.y += (tanY + driftY) * dt;
          }

          // Gentle ambient Brownian air current
          p.x += (p.vx + Math.sin(now * 0.0015 + p.flickerPhase) * 0.2) * (1 + bass * 0.8) * 60 * dt;
          p.y += (p.vy + Math.cos(now * 0.0012 + p.flickerPhase) * 0.15) * (1 + bass * 0.8) * 60 * dt;

          // Bass vibration response: gentle micro-jostle on heavy bass beats
          if (bass > 0.25) {
            const bassKick = bass * 1.8;
            p.x += (Math.random() - 0.5) * bassKick * dt * 40;
            p.y += (Math.random() - 0.5) * bassKick * dt * 40;
          }

          // Particle rotation for fibers and non-symmetrical motes
          p.angle += p.angularSpeed * (playing ? 2.5 : 1) * 60 * dt;
          p.flickerPhase += p.flickerSpeed * dt;

          // Realistic twinkling / light shimmer as the particle drifts through illumination zones
          const shimmer = (Math.sin(p.flickerPhase) + 1) * 0.5;
          let currentAlpha = p.baseAlpha * (0.65 + shimmer * 0.45);

          // Boundary containment: wrap smoothly within platter circle
          const newDx = p.x - cx;
          const newDy = p.y - cy;
          const newR = Math.sqrt(newDx * newDx + newDy * newDy);

          if (newR > maxRadius) {
            // Re-spawn towards inner-middle zone with smooth fade-in
            const reAngle = Math.random() * Math.PI * 2;
            const reRadius = Math.random() * (maxRadius * 0.75);
            p.x = cx + Math.cos(reAngle) * reRadius;
            p.y = cy + Math.sin(reAngle) * reRadius;
            p.vx = (Math.random() - 0.5) * 0.18;
            p.vy = (Math.random() - 0.5) * 0.15 - 0.05;
          }

          // Distance from light sources to calculate realistic illumination tint:
          // 1. Bottom-Left Strobe Light Tower (~x: 12%, y: 88%)
          const strobeDistX = p.x - width * 0.14;
          const strobeDistY = p.y - height * 0.84;
          const strobeDist = Math.sqrt(strobeDistX * strobeDistX + strobeDistY * strobeDistY);
          const strobeGlow = Math.max(0, 1 - strobeDist / (width * 0.45));

          // 2. Stylus Target Lamp & Stylus Contact Point (~x: 75%, y: 65%)
          const targetDistX = p.x - width * 0.68;
          const targetDistY = p.y - height * 0.62;
          const targetDist = Math.sqrt(targetDistX * targetDistX + targetDistY * targetDistY);
          const targetGlow = targetLight ? Math.max(0, 1 - targetDist / (width * 0.4)) : 0;

          // Boost visibility when dust motes pass through light beams
          if (strobeGlow > 0 || targetGlow > 0) {
            currentAlpha = Math.min(0.95, currentAlpha + strobeGlow * 0.35 + targetGlow * 0.4);
          }

          // Color calculation: base ivory white + warm gold / strobe crimson tints + song ambient specular reflection
          let rCol = 245;
          let gCol = 240;
          let bCol = 225;

          const ambientRgb = ambientRgbRef.current;
          if (ambientRgb) {
            // Subtle specular ambient bounce across the floating particles
            rCol = Math.round(rCol * 0.75 + ambientRgb[0] * 0.25);
            gCol = Math.round(gCol * 0.75 + ambientRgb[1] * 0.25);
            bCol = Math.round(bCol * 0.75 + ambientRgb[2] * 0.25);
          }

          if (strobeGlow > 0.2) {
            // Strobe red tinting
            rCol = Math.min(255, 245 + Math.round(strobeGlow * 15));
            gCol = Math.max(130, Math.round(240 - strobeGlow * 90));
            bCol = Math.max(120, Math.round(225 - strobeGlow * 95));
          } else if (targetGlow > 0.15) {
            // Incandescent warm amber target light tinting
            rCol = 255;
            gCol = Math.round(210 + targetGlow * 35);
            bCol = Math.round(140 + targetGlow * 40);
          }

          ctx.save();
          ctx.translate(p.x, p.y);

          if (p.type === 'fiber') {
            // Render microscopic dust lint / thread typical on vintage vinyl
            ctx.rotate(p.angle);
            ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${currentAlpha * 0.75})`;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-p.length / 2, 0);
            ctx.quadraticCurveTo(0, p.curve * 2, p.length / 2, 0);
            ctx.stroke();
          } else if (p.type === 'glint') {
            // Specular microscopic dust particle that catches the specular sheen
            const rad = p.size * (1 + shimmer * 0.3);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 2.4);
            grad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${currentAlpha})`);
            grad.addColorStop(0.4, `rgba(${rCol}, ${gCol}, ${bCol}, ${currentAlpha * 0.6})`);
            grad.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, rad * 2.4, 0, Math.PI * 2);
            ctx.fill();

            // Tiny center core
            ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.95})`;
            ctx.beginPath();
            ctx.arc(0, 0, rad * 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Subtle circular dust mote
            const rad = p.size;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 1.8);
            grad.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${currentAlpha * 0.9})`);
            grad.addColorStop(0.5, `rgba(${rCol}, ${gCol}, ${bCol}, ${currentAlpha * 0.4})`);
            grad.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, rad * 1.8, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [density]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none rounded-full overflow-hidden z-20 ${className}`}
      style={{
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
    </div>
  );
};
