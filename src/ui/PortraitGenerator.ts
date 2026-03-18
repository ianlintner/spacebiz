import type Phaser from "phaser";
import { SeededRNG } from "../utils/SeededRNG.ts";
import type { PlanetType } from "../data/types.ts";
import type { ShipClass } from "../data/types.ts";
import type { EventCategory } from "../data/types.ts";
import { getTheme, lerpColor } from "./Theme.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PortraitType = "planet" | "ship" | "system" | "event";

export interface PortraitData {
  planetType?: PlanetType;
  shipClass?: ShipClass;
  starColor?: number;
  planetCount?: number;
  eventCategory?: EventCategory;
}

// ---------------------------------------------------------------------------
// Gradient helpers
// ---------------------------------------------------------------------------

/** Fill a vertical gradient (top to bottom) using horizontal strips. */
export function fillGradientV(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  colorTop: number,
  colorBottom: number,
  steps = 8,
): void {
  const stripH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    g.fillStyle(lerpColor(colorTop, colorBottom, t), 1);
    g.fillRect(x, y + stripH * i, w, Math.ceil(stripH));
  }
}

/** Fill a horizontal gradient (left to right) using vertical strips. */
export function fillGradientH(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  colorLeft: number,
  colorRight: number,
  steps = 8,
): void {
  const stripW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    g.fillStyle(lerpColor(colorLeft, colorRight, t), 1);
    g.fillRect(x + stripW * i, y, Math.ceil(stripW), h);
  }
}

// ---------------------------------------------------------------------------
// Planet portraits
// ---------------------------------------------------------------------------

export function drawTerranPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Dark blue to lighter blue gradient sky
  fillGradientV(g, 0, 0, w, h, 0x000033, 0x3366aa, 16);

  // Clouds — white semi-transparent dots in upper 40%
  const cloudCount = rng.nextInt(3, 5);
  for (let i = 0; i < cloudCount; i++) {
    const cx = rng.nextFloat(0, w);
    const cy = rng.nextFloat(h * 0.05, h * 0.4);
    const cw = rng.nextFloat(20, 50);
    const ch = rng.nextFloat(4, 10);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(cx, cy, cw, ch);
  }

  // 2-3 horizontal terrain bands using sine waves (green/teal)
  const bandCount = rng.nextInt(2, 3);
  const terrainColors = [0x226633, 0x338844, 0x2a7755];
  for (let b = 0; b < bandCount; b++) {
    const baseY = h * (0.55 + b * 0.15);
    const freq = 0.02 + rng.nextFloat(0, 0.02);
    const amp = 8 + rng.nextFloat(0, 8);
    const color = terrainColors[b % terrainColors.length];
    g.fillStyle(color, 1);
    // Draw as strips following sine wave
    for (let x = 0; x < w; x += 2) {
      const yOff = Math.sin((x + rng.nextFloat(0, 100)) * freq) * amp;
      g.fillRect(x, baseY + yOff, 3, h - baseY - yOff);
    }
  }

  // City silhouettes at bottom (3-6 buildings)
  const buildingCount = rng.nextInt(3, 6);
  for (let i = 0; i < buildingCount; i++) {
    const bx = rng.nextFloat(10, w - 20);
    const bw = rng.nextFloat(8, 18);
    const bh = rng.nextFloat(20, 60);
    g.fillStyle(0x112233, 1);
    g.fillRect(bx, h - bh, bw, bh);
    // Antenna on some buildings
    if (rng.chance(0.3)) {
      const ax = bx + bw / 2;
      const aSize = rng.nextFloat(3, 7);
      g.fillTriangle(
        ax - aSize,
        h - bh,
        ax + aSize,
        h - bh,
        ax,
        h - bh - aSize * 2,
      );
    }
  }
}

export function drawMiningPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Dark brown to dark orange gradient
  fillGradientV(g, 0, 0, w, h, 0x1a0a05, 0x3a2010, 16);

  // Rocky terrain base
  const terrainTop = Math.floor(h * 0.5);
  g.fillStyle(0x443322, 1);
  g.fillRect(0, terrainTop, w, h - terrainTop);

  // Jagged rocky terrain peaks (triangles with varying heights)
  const jagged = rng.nextInt(6, 10);
  for (let i = 0; i < jagged; i++) {
    const tx = rng.nextFloat(0, w);
    const tw = rng.nextFloat(15, 40);
    const th = rng.nextFloat(20, 50);
    g.fillStyle(0x332211, 1);
    g.fillTriangle(tx, h - th * 0.2, tx + tw, h - th * 0.2, tx + tw / 2, h - th);
  }

  // Mining rig silhouettes (2-3 tall thin rectangles with small triangle tops)
  const rigCount = rng.nextInt(2, 3);
  for (let i = 0; i < rigCount; i++) {
    const rx = rng.nextFloat(10, w - 20);
    const rw = rng.nextFloat(6, 12);
    const rh = rng.nextFloat(40, 70);
    g.fillStyle(0x221111, 1);
    g.fillRect(rx, h - rh, rw, rh);
    g.fillTriangle(
      rx - 2,
      h - rh,
      rx + rw + 2,
      h - rh,
      rx + rw / 2,
      h - rh - 10,
    );
  }

  // Bright orange/red thin horizontal lines for "ore veins" (2-4)
  const veinCount = rng.nextInt(2, 4);
  g.lineStyle(1, 0xff6622, 0.6);
  for (let i = 0; i < veinCount; i++) {
    const vy = rng.nextFloat(terrainTop + 10, h - 10);
    g.lineBetween(0, vy, w, vy);
  }
}

export function drawAgriculturalPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Warm amber to light green gradient
  fillGradientV(g, 0, 0, w, h, 0x332200, 0x336622, 16);

  // Gentle rolling sine-wave hills in green (2 layers, different frequencies)
  const hillColors = [0x336622, 0x448833];
  for (let layer = 0; layer < 2; layer++) {
    const baseY = h * (0.5 + layer * 0.15);
    const freq = 0.015 + rng.nextFloat(0, 0.015);
    const amp = 10 + rng.nextFloat(0, 10);
    const phaseOff = rng.nextFloat(0, 100);
    g.fillStyle(hillColors[layer], 1);
    for (let x = 0; x < w; x += 2) {
      const yOff = Math.sin((x + phaseOff) * freq) * amp;
      g.fillRect(x, baseY + yOff, 3, h - baseY - yOff);
    }
  }

  // Small rectangle silhouettes at bottom for silos/barns (2-4)
  const buildCount = rng.nextInt(2, 4);
  for (let i = 0; i < buildCount; i++) {
    const bx = rng.nextFloat(10, w - 25);
    const bw = rng.nextFloat(12, 22);
    const bh = rng.nextFloat(18, 40);
    g.fillStyle(0x221100, 1);
    g.fillRect(bx, h - bh, bw, bh);
    // Triangle roof
    g.fillTriangle(
      bx - 3,
      h - bh,
      bx + bw + 3,
      h - bh,
      bx + bw / 2,
      h - bh - 10,
    );
  }

  // Yellow dots scattered in the field area for grain
  const grainCount = rng.nextInt(15, 30);
  for (let i = 0; i < grainCount; i++) {
    const gx = rng.nextFloat(5, w - 5);
    const gy = rng.nextFloat(h * 0.55, h - 10);
    g.fillStyle(0xddcc44, 0.6);
    g.fillCircle(gx, gy, 1);
  }
}

export function drawIndustrialPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Dark gray to steel blue gradient
  fillGradientV(g, 0, 0, w, h, 0x0a0a10, 0x2a2a3a, 16);

  // Factory rectangle silhouettes along bottom (3-5 rectangles)
  const factoryCount = rng.nextInt(3, 5);
  for (let i = 0; i < factoryCount; i++) {
    const fx = rng.nextFloat(5, w - 30);
    const fw = rng.nextFloat(20, 45);
    const fh = rng.nextFloat(30, 60);
    g.fillStyle(0x1a1a22, 1);
    g.fillRect(fx, h - fh, fw, fh);
  }

  // Tall thin rectangles for smokestacks (2-3)
  const stackCount = rng.nextInt(2, 3);
  for (let i = 0; i < stackCount; i++) {
    const sx = rng.nextFloat(15, w - 15);
    const sw = rng.nextFloat(4, 7);
    const sh = rng.nextFloat(40, 80);
    g.fillStyle(0x1a1a22, 1);
    g.fillRect(sx, h - sh, sw, sh);

    // Small orange dots above smokestacks for sparks
    const sparkCount = rng.nextInt(2, 4);
    for (let s = 0; s < sparkCount; s++) {
      const spX = sx + rng.nextFloat(-3, sw + 3);
      const spY = h - sh - rng.nextFloat(4, 15);
      g.fillStyle(0xff6622, 0.7);
      g.fillCircle(spX, spY, 1.5);
    }
  }

  // Thin gray horizontal lines for smoke/haze
  const hazeCount = rng.nextInt(3, 5);
  for (let i = 0; i < hazeCount; i++) {
    const hy = rng.nextFloat(h * 0.15, h * 0.5);
    g.lineStyle(1, 0x666688, 0.2);
    g.lineBetween(0, hy, w, hy);
  }
}

export function drawHubStationPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Deep space gradient (near-black to dark blue)
  fillGradientV(g, 0, 0, w, h, 0x000005, 0x0a0a2a, 16);

  const cx = w / 2;
  const cy = h / 2;

  // Central station structure: concentric circles (2-3 rings)
  const ringCount = rng.nextInt(2, 3);
  for (let i = 0; i < ringCount; i++) {
    const radius = 20 + i * 18 + rng.nextFloat(-3, 3);
    g.lineStyle(2, 0xccddee, 0.6);
    g.strokeCircle(cx, cy, radius);
  }

  // Radial spokes (4-8 thin lines from center)
  const spokeCount = rng.nextInt(4, 8);
  g.lineStyle(1, 0x8899aa, 0.4);
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const outerR = 20 + (ringCount - 1) * 18 + 10;
    g.lineBetween(
      cx + Math.cos(angle) * 5,
      cy + Math.sin(angle) * 5,
      cx + Math.cos(angle) * outerR,
      cy + Math.sin(angle) * outerR,
    );
  }

  // Station core
  g.fillStyle(0x334455, 1);
  g.fillCircle(cx, cy, 8);

  // Small white accent dots at intersections for lights
  const lightCount = rng.nextInt(6, 12);
  for (let i = 0; i < lightCount; i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(15, 55);
    const lx = cx + Math.cos(angle) * dist;
    const ly = cy + Math.sin(angle) * dist;
    g.fillStyle(0x00ffcc, 0.7);
    g.fillCircle(lx, ly, 1.5);
  }
}

export function drawResortPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Turquoise to bright blue gradient
  fillGradientV(g, 0, 0, w, h, 0x004455, 0x2288bb, 16);

  // Horizontal bands of slightly different blue for water
  const waterTop = Math.floor(h * 0.6);
  const waterBands = 3;
  const waterColors = [0x006688, 0x007799, 0x0088aa];
  const bandH = Math.floor((h - waterTop) / waterBands);
  for (let i = 0; i < waterBands; i++) {
    g.fillStyle(waterColors[i], 1);
    g.fillRect(0, waterTop + bandH * i, w, bandH + 1);
  }

  // Dome silhouettes along bottom (semicircles, 3-5)
  const domeCount = rng.nextInt(3, 5);
  for (let i = 0; i < domeCount; i++) {
    const dx = rng.nextFloat(10, w - 20);
    const dr = rng.nextFloat(10, 22);
    g.fillStyle(0x442244, 1);
    // Base rectangle
    g.fillRect(dx - dr, waterTop - dr * 0.3, dr * 2, dr * 0.6);
    // Dome top arc approximation via triangle
    g.fillTriangle(
      dx - dr,
      waterTop - dr * 0.3,
      dx + dr,
      waterTop - dr * 0.3,
      dx,
      waterTop - dr * 1.1,
    );
  }

  // Pink and golden small dots scattered for decorative lights
  const lightCount = rng.nextInt(10, 20);
  for (let i = 0; i < lightCount; i++) {
    const lx = rng.nextFloat(5, w - 5);
    const ly = rng.nextFloat(waterTop - 30, h - 5);
    const isPink = rng.chance(0.5);
    g.fillStyle(isPink ? 0xff88aa : 0xffcc44, 0.6);
    g.fillCircle(lx, ly, 1);
  }
}

export function drawResearchPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);

  // Deep purple to dark cyan gradient
  fillGradientV(g, 0, 0, w, h, 0x0a0015, 0x0a1a2a, 16);

  // Satellite dish silhouettes (triangles pointing up with small circles on top, 2-3)
  const dishCount = rng.nextInt(2, 3);
  for (let i = 0; i < dishCount; i++) {
    const dx = rng.nextFloat(20, w - 30);
    const dy = h - rng.nextFloat(20, 50);
    const dr = rng.nextFloat(12, 22);

    // Support rod
    g.fillStyle(0x221133, 1);
    g.fillRect(dx - 1, dy, 3, h - dy);

    // Dish (triangle pointing up)
    g.fillTriangle(dx - dr, dy, dx + dr, dy, dx, dy - dr * 0.8);

    // Small circle on top
    g.fillStyle(0x44ffff, 0.6);
    g.fillCircle(dx, dy - dr * 0.8 - 3, 3);
  }

  // Horizontal dashed cyan lines across the middle area for "data streams"
  const streamCount = rng.nextInt(4, 6);
  g.lineStyle(1, 0x44ffff, 0.4);
  for (let i = 0; i < streamCount; i++) {
    const sy = rng.nextFloat(h * 0.2, h * 0.5);
    // Draw dashed line as segments
    const segLen = 8;
    const gap = 6;
    for (let x = 0; x < w; x += segLen + gap) {
      g.lineBetween(x, sy, Math.min(x + segLen, w), sy);
    }
  }
}

// ---------------------------------------------------------------------------
// Ship portrait
// ---------------------------------------------------------------------------

export function drawShipPortrait(
  g: Phaser.GameObjects.Graphics,
  shipClass: ShipClass,
  w: number,
  h: number,
): void {
  const theme = getTheme();

  // Dark space gradient background
  fillGradientV(g, 0, 0, w, h, 0x000000, 0x050510, 8);

  const cx = w / 2;
  const cy = h / 2;
  const shipColor = 0x445566;

  // Ship body varies by class
  switch (shipClass) {
    case "cargoShuttle": {
      // Small box with small triangular nose
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 15, cy - 8, 30, 16);
      g.fillTriangle(cx + 15, cy - 6, cx + 15, cy + 6, cx + 24, cy);
      break;
    }
    case "passengerShuttle": {
      // Rounded tube shape (rectangle with semicircle front)
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 22, cy - 5, 44, 10);
      g.fillTriangle(cx + 22, cy - 4, cx + 22, cy + 4, cx + 32, cy);
      break;
    }
    case "mixedHauler": {
      // Wider rectangle with angular wings
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 18, cy - 10, 36, 20);
      g.fillTriangle(cx + 18, cy - 8, cx + 18, cy + 8, cx + 28, cy);
      break;
    }
    case "fastCourier": {
      // Elongated thin triangle (dart shape)
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 10, cy - 4, 28, 8);
      g.fillTriangle(cx + 18, cy - 3, cx + 18, cy + 3, cx + 28, cy);
      // Wide tail
      g.fillTriangle(cx - 10, cy - 14, cx - 10, cy + 14, cx - 22, cy);
      break;
    }
    case "bulkFreighter": {
      // Very wide, long rectangle with small bridge on top
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 30, cy - 12, 60, 24);
      g.fillTriangle(cx + 30, cy - 10, cx + 30, cy + 10, cx + 38, cy);
      // Bridge on top
      g.fillRect(cx + 10, cy - 18, 12, 6);
      break;
    }
    case "starLiner": {
      // Sleek rectangle with angled wings, row of small window dots
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 28, cy - 6, 56, 12);
      g.fillTriangle(cx + 28, cy - 5, cx + 28, cy + 5, cx + 38, cy);
      // Angled wings
      g.fillTriangle(cx - 20, cy - 6, cx - 10, cy - 6, cx - 15, cy - 16);
      g.fillTriangle(cx - 20, cy + 6, cx - 10, cy + 6, cx - 15, cy + 16);
      // Window dots
      g.fillStyle(0xaaddff, 0.7);
      for (let wx = cx - 20; wx <= cx + 20; wx += 6) {
        g.fillCircle(wx, cy, 1);
      }
      break;
    }
    case "megaHauler": {
      // Massive rectangle, almost fills width, stubby wings
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 35, cy - 16, 70, 32);
      g.fillTriangle(cx + 35, cy - 12, cx + 35, cy + 12, cx + 42, cy);
      // Stubby wings
      g.fillRect(cx - 25, cy - 22, 15, 6);
      g.fillRect(cx - 25, cy + 16, 15, 6);
      break;
    }
    case "luxuryLiner": {
      // Elegant elongated shape with curved fins
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 32, cy - 7, 64, 14);
      g.fillTriangle(cx + 32, cy - 5, cx + 32, cy + 5, cx + 42, cy);
      // Curved fins
      g.fillTriangle(cx - 24, cy - 7, cx - 14, cy - 7, cx - 19, cy - 18);
      g.fillTriangle(cx - 24, cy + 7, cx - 14, cy + 7, cx - 19, cy + 18);
      // Decorative accent lines
      g.lineStyle(1, theme.colors.accent, 0.5);
      g.lineBetween(cx - 30, cy - 3, cx + 30, cy - 3);
      g.lineBetween(cx - 30, cy + 3, cx + 30, cy + 3);
      break;
    }
    default: {
      // Fallback: basic shape
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 15, cy - 8, 30, 16);
      g.fillTriangle(cx + 15, cy - 6, cx + 15, cy + 6, cx + 24, cy);
      break;
    }
  }

  // Accent-colored circle at rear for engine glow
  g.fillStyle(theme.colors.accent, 0.7);
  g.fillCircle(cx - 30, cy, 4);
  g.lineStyle(1, theme.colors.accent, 0.2);
  g.strokeCircle(cx - 30, cy, 8);

  // Lighter tint at front for cockpit area
  g.fillStyle(0xaaddff, 0.4);
  g.fillCircle(cx + 20, cy, 3);
}

// ---------------------------------------------------------------------------
// Star system portrait
// ---------------------------------------------------------------------------

export function drawSystemPortrait(
  g: Phaser.GameObjects.Graphics,
  starColor: number,
  planetCount: number,
  w: number,
  h: number,
): void {
  const rng = new SeededRNG(starColor);

  // Black background
  g.fillStyle(0x000000, 1);
  g.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const starRadius = Math.floor(Math.min(w, h) * 0.12);

  // Central circle filled with starColor
  g.fillStyle(starColor, 1);
  g.fillCircle(cx, cy, starRadius);

  // Radial gradient glow around star (2-3 concentric circles with decreasing alpha)
  const glowLayers = 3;
  for (let i = 1; i <= glowLayers; i++) {
    const alpha = 0.25 / i;
    g.lineStyle(2, starColor, alpha);
    g.strokeCircle(cx, cy, starRadius + i * 5);
  }

  // Orbit circles for each planet, evenly spaced
  const orbitStart = starRadius + 18;
  const orbitGap = Math.floor(
    (Math.min(w, h) / 2 - orbitStart - 10) / Math.max(planetCount, 1),
  );
  for (let i = 0; i < planetCount; i++) {
    const orbitR = orbitStart + i * orbitGap;
    // Orbit line
    g.lineStyle(1, 0xffffff, 0.1);
    g.strokeCircle(cx, cy, orbitR);
    // Small colored dot at random position on orbit
    const angle = rng.nextFloat(0, Math.PI * 2);
    const px = cx + Math.cos(angle) * orbitR;
    const py = cy + Math.sin(angle) * orbitR;
    g.fillStyle(lerpColor(0x4488cc, 0xccaa44, rng.next()), 1);
    g.fillCircle(px, py, 2.5);
  }
}

// ---------------------------------------------------------------------------
// Event portrait
// ---------------------------------------------------------------------------

export function drawEventPortrait(
  g: Phaser.GameObjects.Graphics,
  category: EventCategory,
  w: number,
  h: number,
): void {
  const rng = new SeededRNG(
    category === "market"
      ? 1001
      : category === "hazard"
        ? 2002
        : category === "opportunity"
          ? 3003
          : 4004,
  );
  const cx = w / 2;
  const cy = h / 2;

  switch (category) {
    case "market": {
      fillGradientV(g, 0, 0, w, h, 0x001a0a, 0x0a2a1a, 12);
      // 2-3 chart lines of different colors going up/down
      const lineColors = [0x00ff88, 0x44aaff, 0xffcc44];
      const lineCount = rng.nextInt(2, 3);
      for (let l = 0; l < lineCount; l++) {
        g.lineStyle(2, lineColors[l], 0.7);
        const segments = rng.nextInt(5, 9);
        let px = 10;
        let py = cy + rng.nextFloat(-20, 20);
        for (let i = 0; i < segments; i++) {
          const nx = px + (w - 20) / segments;
          const ny = cy + rng.nextFloat(-30, 30);
          g.lineBetween(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      }
      break;
    }
    case "hazard": {
      fillGradientV(g, 0, 0, w, h, 0x1a0505, 0x330a0a, 12);
      // Red/orange explosion burst (triangles radiating from center)
      const burstCount = rng.nextInt(8, 14);
      for (let i = 0; i < burstCount; i++) {
        const angle =
          (i / burstCount) * Math.PI * 2 + rng.nextFloat(-0.15, 0.15);
        const innerR = rng.nextFloat(6, 12);
        const outerR = rng.nextFloat(25, 45);
        const spread = rng.nextFloat(0.08, 0.18);
        g.fillStyle(lerpColor(0xff2222, 0xff8800, rng.next()), 0.7);
        g.fillTriangle(
          cx + Math.cos(angle - spread) * innerR,
          cy + Math.sin(angle - spread) * innerR,
          cx + Math.cos(angle + spread) * innerR,
          cy + Math.sin(angle + spread) * innerR,
          cx + Math.cos(angle) * outerR,
          cy + Math.sin(angle) * outerR,
        );
      }
      break;
    }
    case "opportunity": {
      fillGradientV(g, 0, 0, w, h, 0x0a1a0a, 0x1a2a0a, 12);
      // Golden star shape (overlapping triangles making a 6-pointed star)
      g.fillStyle(0xffcc44, 0.8);
      const r = Math.min(w, h) * 0.2;
      // Up-pointing triangle
      g.fillTriangle(
        cx,
        cy - r,
        cx - r * 0.87,
        cy + r * 0.5,
        cx + r * 0.87,
        cy + r * 0.5,
      );
      // Down-pointing triangle
      g.fillTriangle(
        cx,
        cy + r,
        cx - r * 0.87,
        cy - r * 0.5,
        cx + r * 0.87,
        cy - r * 0.5,
      );
      break;
    }
    default: {
      // Flavor: decorative spiral/swirl (arc segments in accent color)
      fillGradientV(g, 0, 0, w, h, 0x0a051a, 0x1a0a2a, 12);
      const curveCount = rng.nextInt(4, 8);
      g.lineStyle(1, 0xaa88ff, 0.5);
      for (let i = 0; i < curveCount; i++) {
        const startAngle = rng.nextFloat(0, Math.PI * 2);
        const radius = rng.nextFloat(10, 40);
        const steps = 12;
        let prevX = cx + Math.cos(startAngle) * radius;
        let prevY = cy + Math.sin(startAngle) * radius;
        for (let s = 1; s <= steps; s++) {
          const a = startAngle + (s / steps) * Math.PI;
          const r = radius + s * 2;
          const curX = cx + Math.cos(a) * r;
          const curY = cy + Math.sin(a) * r;
          g.lineBetween(prevX, prevY, curX, curY);
          prevX = curX;
          prevY = curY;
        }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function drawPortrait(
  graphics: Phaser.GameObjects.Graphics,
  type: PortraitType,
  width: number,
  height: number,
  seed: number,
  data?: PortraitData,
): void {
  graphics.clear();

  switch (type) {
    case "planet": {
      const planetType = data?.planetType ?? "terran";
      switch (planetType) {
        case "terran":
          drawTerranPortrait(graphics, width, height, seed);
          break;
        case "mining":
          drawMiningPortrait(graphics, width, height, seed);
          break;
        case "agricultural":
          drawAgriculturalPortrait(graphics, width, height, seed);
          break;
        case "industrial":
          drawIndustrialPortrait(graphics, width, height, seed);
          break;
        case "hubStation":
          drawHubStationPortrait(graphics, width, height, seed);
          break;
        case "resort":
          drawResortPortrait(graphics, width, height, seed);
          break;
        case "research":
          drawResearchPortrait(graphics, width, height, seed);
          break;
      }
      break;
    }
    case "ship": {
      const shipClass = data?.shipClass ?? "cargoShuttle";
      drawShipPortrait(graphics, shipClass, width, height);
      break;
    }
    case "system": {
      const starColor = data?.starColor ?? 0xffcc44;
      const planetCount = data?.planetCount ?? 4;
      drawSystemPortrait(graphics, starColor, planetCount, width, height);
      break;
    }
    case "event": {
      const eventCategory = data?.eventCategory ?? "flavor";
      drawEventPortrait(graphics, eventCategory, width, height);
      break;
    }
  }
}
