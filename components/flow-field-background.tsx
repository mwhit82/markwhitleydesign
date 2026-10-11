"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type SimplexLike = {
  noise3D: (x: number, y: number, z: number) => number;
};

type Particle = {
  x: number;
  y: number;
  speed: number;
  alpha: number;
  size: number;
};

const F3 = 1 / 3;
const G3 = 1 / 6;

const grad3 = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
] as const;

function createSimplexNoise(seedValue = 42): SimplexLike {
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  const p = new Uint8Array(256);
  let seed = seedValue;

  for (let index = 0; index < 256; index += 1) {
    p[index] = index;
  }

  for (let index = 255; index > 0; index -= 1) {
    seed = (seed * 16807) % 2147483647;
    const next = seed % (index + 1);
    const temp = p[index];
    p[index] = p[next];
    p[next] = temp;
  }

  for (let index = 0; index < 512; index += 1) {
    perm[index] = p[index & 255];
    permMod12[index] = perm[index] % 12;
  }

  return {
    noise3D(xin: number, yin: number, zin: number) {
      let n0 = 0;
      let n1 = 0;
      let n2 = 0;
      let n3 = 0;

      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const X0 = i - t;
      const Y0 = j - t;
      const Z0 = k - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      const z0 = zin - Z0;

      let i1 = 0;
      let j1 = 0;
      let k1 = 0;
      let i2 = 0;
      let j2 = 0;
      let k2 = 0;

      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1;
          i2 = 1;
          j2 = 1;
        } else if (x0 >= z0) {
          i1 = 1;
          i2 = 1;
          k2 = 1;
        } else {
          k1 = 1;
          i2 = 1;
          k2 = 1;
        }
      } else if (y0 < z0) {
        k1 = 1;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        j1 = 1;
        j2 = 1;
        k2 = 1;
      } else {
        j1 = 1;
        i2 = 1;
        j2 = 1;
      }

      const x1 = x0 - i1 + G3;
      const y1 = y0 - j1 + G3;
      const z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3;
      const y2 = y0 - j2 + 2 * G3;
      const z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3;
      const y3 = y0 - 1 + 3 * G3;
      const z3 = z0 - 1 + 3 * G3;

      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;

      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 >= 0) {
        t0 *= t0;
        const gi = permMod12[ii + perm[jj + perm[kk]]];
        n0 = t0 * t0 * (grad3[gi][0] * x0 + grad3[gi][1] * y0 + grad3[gi][2] * z0);
      }

      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 >= 0) {
        t1 *= t1;
        const gi = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
        n1 = t1 * t1 * (grad3[gi][0] * x1 + grad3[gi][1] * y1 + grad3[gi][2] * z1);
      }

      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 >= 0) {
        t2 *= t2;
        const gi = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
        n2 = t2 * t2 * (grad3[gi][0] * x2 + grad3[gi][1] * y2 + grad3[gi][2] * z2);
      }

      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 >= 0) {
        t3 *= t3;
        const gi = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
        n3 = t3 * t3 * (grad3[gi][0] * x3 + grad3[gi][1] * y3 + grad3[gi][2] * z3);
      }

      return 32 * (n0 + n1 + n2 + n3);
    },
  };
}

type Color = { r: number; g: number; b: number };

function lerpColor(a: Color, b: Color, amount: number): Color {
  return {
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  };
}

function getPalette(isDark: boolean): Color[] {
  if (isDark) {
    return [
      { r: 200, g: 149, b: 108 },
      { r: 212, g: 165, b: 116 },
      { r: 224, g: 120, b: 80 },
      { r: 190, g: 130, b: 90 },
      { r: 230, g: 180, b: 140 },
    ];
  }

  return [
    { r: 188, g: 146, b: 115 },
    { r: 203, g: 160, b: 126 },
    { r: 221, g: 130, b: 95 },
    { r: 176, g: 137, b: 108 },
    { r: 231, g: 195, b: 162 },
  ];
}

function getColor(noiseValue: number, palette: Color[]) {
  const amount = (noiseValue + 1) * 0.5;
  const index = amount * (palette.length - 1);
  const lower = Math.floor(index);
  const mix = index - lower;
  const start = palette[Math.min(lower, palette.length - 1)];
  const end = palette[Math.min(lower + 1, palette.length - 1)];

  return lerpColor(start, end, mix);
}

export function FlowFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isTrial = usePathname().startsWith("/playground/rally/clay-study");

  useEffect(() => {
    if (isTrial) return;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    const noise = createSimplexNoise(42);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999, active: false };
    const particles: Particle[] = [];

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;
    let noiseScale = 0.0022;
    let speed = reducedMotion ? 0.22 : 0.52;

    const particleCount = () => {
      if (reducedMotion) {
        return Math.min(500, Math.floor(width * 0.22));
      }

      if (width < 768) {
        return 900;
      }

      return 1400;
    };

    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.35 + Math.random() * 0.6,
      alpha: reducedMotion ? 0.1 + Math.random() * 0.12 : 0.12 + Math.random() * 0.22,
      size: 0.45 + Math.random() * 0.9,
    });

    const fillBase = () => {
      const dark = document.documentElement.classList.contains("dark");
      context.fillStyle = dark ? "#0f0f10" : "#f6f3ee";
      context.fillRect(0, 0, width, height);
      canvas.style.mixBlendMode = dark ? "screen" : "multiply";
      canvas.style.opacity = dark ? "0.8" : "0.55";
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      noiseScale = width < 768 ? 0.0028 : 0.0022;
      speed = reducedMotion ? 0.22 : width < 768 ? 0.42 : 0.52;

      particles.length = 0;
      for (let index = 0; index < particleCount(); index += 1) {
        particles.push(createParticle());
      }

      fillBase();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const draw = () => {
      const dark = document.documentElement.classList.contains("dark");
      const palette = getPalette(dark);
      context.fillStyle = dark ? "rgba(15, 15, 16, 0.035)" : "rgba(246, 243, 238, 0.05)";
      context.fillRect(0, 0, width, height);

      time += reducedMotion ? 0.00012 : 0.00035;

      for (const particle of particles) {
        const nx = particle.x * noiseScale;
        const ny = particle.y * noiseScale;
        const angle = noise.noise3D(nx, ny, time) * Math.PI * 2;
        const colorNoise = noise.noise3D(nx * 1.5 + 100, ny * 1.5 + 100, time * 0.5);

        let vx = Math.cos(angle) * particle.speed * speed;
        let vy = Math.sin(angle) * particle.speed * speed;

        if (mouse.active) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radius = 140;

          if (distance < radius && distance > 0) {
            const force = (1 - distance / radius) * 1.25;
            vx += (dx / distance) * force;
            vy += (dy / distance) * force;
          }
        }

        const previousX = particle.x;
        const previousY = particle.y;

        particle.x += vx;
        particle.y += vy;

        const color = getColor(colorNoise, palette);
        context.beginPath();
        context.moveTo(previousX, previousY);
        context.lineTo(particle.x, particle.y);
        context.strokeStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${particle.alpha})`;
        context.lineWidth = particle.size;
        context.stroke();

        if (
          particle.x < -20 ||
          particle.x > width + 20 ||
          particle.y < -20 ||
          particle.y > height + 20
        ) {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();

    if (reducedMotion) {
      draw();
      window.cancelAnimationFrame(animationFrame);
    } else {
      animationFrame = window.requestAnimationFrame(draw);
    }

    const mutationObserver = new MutationObserver(() => {
      fillBase();
    });

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      mutationObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isTrial]);

  if (isTrial) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
