import * as Phaser from "phaser";
import { SeededRNG } from "../utils/SeededRNG.ts";

/**
 * Procedural flag patterns for empires.
 * Draws a small pixel-art flag onto a RenderTexture that can be reused as a sprite.
 */

const FLAG_W = 24;
const FLAG_H = 16;

type FlagPattern =
  | "horizontal"
  | "vertical"
  | "diagonal"
  | "chevron"
  | "circle"
  | "cross"
  | "triband"
  | "quartered";

const FLAG_PATTERNS: FlagPattern[] = [
  "horizontal",
  "vertical",
  "diagonal",
  "chevron",
  "circle",
  "cross",
  "triband",
  "quartered",
];

/** Darken a color by a factor (0-1). */
function darkenColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Lighten a color towards white by a factor (0-1). */
function lightenColor(color: number, factor: number): number {
  const r =
    ((color >> 16) & 0xff) +
    Math.floor((255 - ((color >> 16) & 0xff)) * factor);
  const g =
    ((color >> 8) & 0xff) + Math.floor((255 - ((color >> 8) & 0xff)) * factor);
  const b = (color & 0xff) + Math.floor((255 - (color & 0xff)) * factor);
  return (r << 16) | (g << 8) | b;
}

function drawFlagPattern(
  gfx: Phaser.GameObjects.Graphics,
  pattern: FlagPattern,
  primary: number,
  secondary: number,
  accent: number,
): void {
  // Fill base
  gfx.fillStyle(primary, 1);
  gfx.fillRect(0, 0, FLAG_W, FLAG_H);

  switch (pattern) {
    case "horizontal":
      // Top and bottom stripes
      gfx.fillStyle(secondary, 1);
      gfx.fillRect(0, 0, FLAG_W, 4);
      gfx.fillRect(0, FLAG_H - 4, FLAG_W, 4);
      gfx.fillStyle(accent, 1);
      gfx.fillRect(0, 7, FLAG_W, 2);
      break;

    case "vertical":
      // Left and right bands
      gfx.fillStyle(secondary, 1);
      gfx.fillRect(0, 0, 6, FLAG_H);
      gfx.fillRect(FLAG_W - 6, 0, 6, FLAG_H);
      gfx.fillStyle(accent, 1);
      gfx.fillRect(11, 0, 2, FLAG_H);
      break;

    case "diagonal":
      // Diagonal stripe from top-left to bottom-right
      gfx.fillStyle(secondary, 1);
      for (let i = 0; i < FLAG_W; i++) {
        const y = Math.floor((i / FLAG_W) * FLAG_H);
        gfx.fillRect(i, Math.max(0, y - 2), 1, 5);
      }
      // Small accent dot center
      gfx.fillStyle(accent, 1);
      gfx.fillRect(10, 6, 4, 4);
      break;

    case "chevron":
      // V-shape pointing right
      gfx.fillStyle(secondary, 1);
      for (let y = 0; y < FLAG_H; y++) {
        const halfH = FLAG_H / 2;
        const xOffset =
          y < halfH
            ? Math.floor((y / halfH) * 10)
            : Math.floor(((FLAG_H - 1 - y) / halfH) * 10);
        gfx.fillRect(xOffset, y, 3, 1);
      }
      // Accent tip
      gfx.fillStyle(accent, 1);
      gfx.fillRect(9, 6, 3, 4);
      break;

    case "circle":
      // Central circle emblem
      gfx.fillStyle(secondary, 1);
      const cx = Math.floor(FLAG_W / 2);
      const cy = Math.floor(FLAG_H / 2);
      for (let y = 0; y < FLAG_H; y++) {
        for (let x = 0; x < FLAG_W; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= 20) {
            gfx.fillRect(x, y, 1, 1);
          }
        }
      }
      // Inner accent dot
      gfx.fillStyle(accent, 1);
      gfx.fillRect(cx - 1, cy - 1, 2, 2);
      break;

    case "cross":
      // Cross pattern
      gfx.fillStyle(secondary, 1);
      gfx.fillRect(10, 0, 4, FLAG_H);
      gfx.fillRect(0, 6, FLAG_W, 4);
      gfx.fillStyle(accent, 1);
      gfx.fillRect(11, 7, 2, 2);
      break;

    case "triband":
      // Three equal vertical bands
      const bandW = Math.floor(FLAG_W / 3);
      gfx.fillStyle(secondary, 1);
      gfx.fillRect(0, 0, bandW, FLAG_H);
      // Middle stays primary
      gfx.fillStyle(accent, 1);
      gfx.fillRect(bandW * 2, 0, FLAG_W - bandW * 2, FLAG_H);
      break;

    case "quartered":
      // Four quadrants
      const halfW = Math.floor(FLAG_W / 2);
      const halfH2 = Math.floor(FLAG_H / 2);
      gfx.fillStyle(secondary, 1);
      gfx.fillRect(0, 0, halfW, halfH2);
      gfx.fillRect(halfW, halfH2, FLAG_W - halfW, FLAG_H - halfH2);
      gfx.fillStyle(accent, 1);
      gfx.fillRect(halfW - 1, halfH2 - 1, 2, 2);
      break;
  }

  // 1px border
  gfx.lineStyle(1, 0x000000, 0.5);
  gfx.strokeRect(0, 0, FLAG_W, FLAG_H);
}

/** Get the texture key for an empire flag. */
export function getEmpireFlagKey(empireId: string): string {
  return `empire-flag-${empireId}`;
}

/**
 * Generate flag textures for all empires at boot time.
 * Renders each flag to a RenderTexture registered with the Phaser texture manager.
 */
export function generateEmpireFlags(
  scene: Phaser.Scene,
  empires: Array<{ id: string; color: number }>,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  const gfx = scene.add.graphics();

  for (const empire of empires) {
    const texKey = getEmpireFlagKey(empire.id);
    // Skip if already generated (e.g. scene restart)
    if (scene.textures.exists(texKey)) continue;

    const pattern = rng.pick(FLAG_PATTERNS);
    const primary = empire.color;
    const secondary = darkenColor(primary, 0.5);
    const accent = lightenColor(primary, 0.6);

    gfx.clear();
    drawFlagPattern(gfx, pattern, primary, secondary, accent);

    // Render to a texture. Phaser 4 buffers draw commands; render() must run
    // before saveTexture() captures the result.
    const rt = scene.add.renderTexture(0, 0, FLAG_W, FLAG_H).setVisible(false);
    rt.draw(gfx);
    rt.render();
    rt.saveTexture(texKey);
    rt.destroy();
  }

  gfx.destroy();
}

/** Flag dimensions for positioning. */
export const FLAG_WIDTH = FLAG_W;
export const FLAG_HEIGHT = FLAG_H;
