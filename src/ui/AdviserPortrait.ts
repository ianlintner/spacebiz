import Phaser from "phaser";
import type { AdviserMood } from "../data/types.ts";
import { getTheme } from "./Theme.ts";
import type { PortraitExpression } from "./PortraitExpression.ts";

// ── Pixel grid helpers (same pattern as PortraitGenerator) ─

const LOGICAL_COLS = 32;
const LOGICAL_ROWS = 32;

/** Number of animation frames per mood state */
export const ADVISER_FRAME_COUNT = 4;

/** All mood keys for portrait generation */
export const ADVISER_MOODS: AdviserMood[] = [
  "standby",
  "analyzing",
  "alert",
  "success",
];

interface PixelGrid {
  cols: number;
  rows: number;
  pixelSize: number;
  originX: number;
  originY: number;
}

function createPixelGrid(width: number, height: number): PixelGrid {
  const pixelSize = Math.max(
    2,
    Math.floor(Math.min(width / LOGICAL_COLS, height / LOGICAL_ROWS)),
  );
  const contentWidth = pixelSize * LOGICAL_COLS;
  const contentHeight = pixelSize * LOGICAL_ROWS;
  return {
    cols: LOGICAL_COLS,
    rows: LOGICAL_ROWS,
    pixelSize,
    originX: Math.floor((width - contentWidth) / 2),
    originY: Math.floor((height - contentHeight) / 2),
  };
}

function px(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  x: number,
  y: number,
  color: number,
  w = 1,
  h = 1,
  alpha = 1,
): void {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fillRect(
    grid.originX + Math.round(x) * grid.pixelSize,
    grid.originY + Math.round(y) * grid.pixelSize,
    Math.max(1, Math.round(w)) * grid.pixelSize,
    Math.max(1, Math.round(h)) * grid.pixelSize,
  );
}

// Legacy Graphics-based px for backward compat with drawRexPortrait
function pxG(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  x: number,
  y: number,
  color: number,
  w = 1,
  h = 1,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillRect(
    grid.originX + Math.round(x) * grid.pixelSize,
    grid.originY + Math.round(y) * grid.pixelSize,
    Math.max(1, Math.round(w)) * grid.pixelSize,
    Math.max(1, Math.round(h)) * grid.pixelSize,
  );
}

// ── Color palette ──────────────────────────────────────────

const PALETTE = {
  // Husky fur
  furDark: 0x4a5568,
  furMid: 0x718096,
  furLight: 0xedf2f7,
  furWhite: 0xf7fafc,
  nose: 0x2d3748,
  // Suit
  suitDark: 0x1a202c,
  suitMid: 0x2d3748,
  suitAccent: 0xd69e2e, // gold piping
  tie: 0xd69e2e,
  shirt: 0xe2e8f0,
  // Eyes
  eyeBlue: 0x63b3ed,
  eyeWhite: 0xedf2f7,
  pupil: 0x1a202c,
  // Headset
  headsetFrame: 0x4a5568,
  headsetGlow: 0x00ffcc, // teal
  // Mood accents
  alertGlow: 0xff6b35,
  successGold: 0xffd700,
  analyzingAmber: 0xffb347,
  // Background
  bgTop: 0x1a1033,
  bgBottom: 0x2d1b69,
  // Cyber accents
  cyberTeal: 0x00ffcc,
  cyberBlue: 0x4fc3f7,
};

// ── Canvas drawing functions (used for spritesheet generation) ─

function drawBackgroundCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
  frame: number,
): void {
  for (let y = 0; y < grid.rows; y++) {
    const t = y / (grid.rows - 1);
    const r1 = (PALETTE.bgTop >> 16) & 0xff;
    const g1 = (PALETTE.bgTop >> 8) & 0xff;
    const b1 = PALETTE.bgTop & 0xff;
    const r2 = (PALETTE.bgBottom >> 16) & 0xff;
    const g2 = (PALETTE.bgBottom >> 8) & 0xff;
    const b2 = PALETTE.bgBottom & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const gg = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const color = (r << 16) | (gg << 8) | b;
    px(ctx, grid, 0, y, color, grid.cols, 1);
  }

  let glowColor = PALETTE.headsetGlow;
  if (mood === "alert") glowColor = PALETTE.alertGlow;
  else if (mood === "success") glowColor = PALETTE.successGold;
  else if (mood === "analyzing") glowColor = PALETTE.analyzingAmber;

  // Animated glow pulse based on frame
  const glowIntensity = 0.06 + 0.04 * Math.sin((frame / ADVISER_FRAME_COUNT) * Math.PI * 2);
  for (let dy = 0; dy < 6; dy++) {
    for (let dx = 0; dx < 6; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        px(ctx, grid, 26 + dx, 2 + dy, glowColor, 1, 1, glowIntensity * (1 - dist / 5));
      }
    }
  }
}

function drawFrameCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  const theme = getTheme();
  const outer = 0x070b14;
  const middle = theme.colors.panelBorder;

  px(ctx, grid, 0, 0, outer, grid.cols, 1);
  px(ctx, grid, 0, grid.rows - 1, outer, grid.cols, 1);
  px(ctx, grid, 0, 0, outer, 1, grid.rows);
  px(ctx, grid, grid.cols - 1, 0, outer, 1, grid.rows);

  px(ctx, grid, 1, 1, middle, grid.cols - 2, 1);
  px(ctx, grid, 1, grid.rows - 2, middle, grid.cols - 2, 1);
  px(ctx, grid, 1, 1, middle, 1, grid.rows - 2);
  px(ctx, grid, grid.cols - 2, 1, middle, 1, grid.rows - 2);

  let accentColor = theme.colors.accent;
  if (mood === "alert") accentColor = PALETTE.alertGlow;
  else if (mood === "success") accentColor = PALETTE.successGold;
  else if (mood === "analyzing") accentColor = PALETTE.analyzingAmber;

  px(ctx, grid, 2, 2, accentColor, grid.cols - 4, 1, 0.4);
  px(ctx, grid, 2, grid.rows - 3, accentColor, grid.cols - 4, 1, 0.2);
}

function drawHuskyBaseCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  frame: number,
): void {
  // Ear animation: subtle twitch on frame 2
  const earOffset = frame === 2 ? -1 : 0;

  // Left ear
  px(ctx, grid, 8, 4 + earOffset, PALETTE.furDark, 3, 1);
  px(ctx, grid, 7, 5 + earOffset, PALETTE.furDark, 4, 1);
  px(ctx, grid, 7, 6, PALETTE.furMid, 4, 1);
  px(ctx, grid, 8, 7, PALETTE.furMid, 2, 1);
  // Right ear
  px(ctx, grid, 21, 4 + earOffset, PALETTE.furDark, 3, 1);
  px(ctx, grid, 21, 5 + earOffset, PALETTE.furDark, 4, 1);
  px(ctx, grid, 21, 6, PALETTE.furMid, 4, 1);
  px(ctx, grid, 22, 7, PALETTE.furMid, 2, 1);
  // Ear inner pink
  px(ctx, grid, 9, 5 + earOffset, 0xf7b7c5, 1, 2);
  px(ctx, grid, 22, 5 + earOffset, 0xf7b7c5, 1, 2);

  // Head shape
  px(ctx, grid, 9, 7, PALETTE.furDark, 14, 1);
  px(ctx, grid, 8, 8, PALETTE.furDark, 16, 1);
  px(ctx, grid, 8, 9, PALETTE.furMid, 16, 1);
  px(ctx, grid, 7, 10, PALETTE.furMid, 18, 1);
  px(ctx, grid, 7, 11, PALETTE.furMid, 18, 1);
  px(ctx, grid, 8, 12, PALETTE.furMid, 16, 1);
  px(ctx, grid, 9, 13, PALETTE.furLight, 14, 1);
  px(ctx, grid, 10, 14, PALETTE.furWhite, 12, 1);
  px(ctx, grid, 10, 15, PALETTE.furWhite, 12, 1);
  px(ctx, grid, 11, 16, PALETTE.furWhite, 10, 1);
  px(ctx, grid, 12, 17, PALETTE.furWhite, 8, 1);

  // White face mask (chevron)
  px(ctx, grid, 13, 8, PALETTE.furWhite, 6, 1);
  px(ctx, grid, 12, 9, PALETTE.furWhite, 8, 1);
  px(ctx, grid, 11, 10, PALETTE.furWhite, 10, 1);
  px(ctx, grid, 11, 11, PALETTE.furWhite, 10, 1);
  px(ctx, grid, 10, 12, PALETTE.furWhite, 12, 1);

  // Nose
  px(ctx, grid, 15, 14, PALETTE.nose, 2, 1);
  px(ctx, grid, 15, 15, PALETTE.nose, 2, 1);

  // Muzzle line
  px(ctx, grid, 15, 16, PALETTE.furLight, 2, 1, 0.5);

  // Suit / body
  px(ctx, grid, 9, 18, PALETTE.suitDark, 14, 1);
  px(ctx, grid, 8, 19, PALETTE.suitDark, 16, 1);
  px(ctx, grid, 7, 20, PALETTE.suitDark, 18, 1);
  px(ctx, grid, 6, 21, PALETTE.suitDark, 20, 1);
  px(ctx, grid, 5, 22, PALETTE.suitDark, 22, 1);
  px(ctx, grid, 5, 23, PALETTE.suitDark, 22, 1);
  px(ctx, grid, 4, 24, PALETTE.suitDark, 24, 1);
  px(ctx, grid, 4, 25, PALETTE.suitDark, 24, 1);
  px(ctx, grid, 3, 26, PALETTE.suitDark, 26, 1);
  px(ctx, grid, 3, 27, PALETTE.suitDark, 26, 1);
  px(ctx, grid, 3, 28, PALETTE.suitDark, 26, 1);
  px(ctx, grid, 3, 29, PALETTE.suitDark, 26, 1);

  // Lapel accent (gold piping)
  px(ctx, grid, 13, 19, PALETTE.suitAccent, 1, 5);
  px(ctx, grid, 18, 19, PALETTE.suitAccent, 1, 5);

  // Shirt collar
  px(ctx, grid, 14, 18, PALETTE.shirt, 4, 1);
  px(ctx, grid, 14, 19, PALETTE.shirt, 4, 1);

  // Tie
  px(ctx, grid, 15, 20, PALETTE.tie, 2, 1);
  px(ctx, grid, 15, 21, PALETTE.tie, 2, 1);
  px(ctx, grid, 15, 22, PALETTE.tie, 2, 1);
  px(ctx, grid, 16, 23, PALETTE.tie, 1, 1);

  // Cyber implant accents on suit (subtle teal lines)
  px(ctx, grid, 6, 23, PALETTE.cyberTeal, 1, 1, 0.3);
  px(ctx, grid, 6, 25, PALETTE.cyberTeal, 1, 1, 0.2);
  px(ctx, grid, 25, 23, PALETTE.cyberTeal, 1, 1, 0.3);
  px(ctx, grid, 25, 25, PALETTE.cyberTeal, 1, 1, 0.2);
}

function drawEyesCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
  frame: number,
): void {
  // Blink animation: frame 3 = blink (half-closed eyes)
  const isBlink = frame === 3;

  if (isBlink && mood !== "alert") {
    // Half-closed blink
    px(ctx, grid, 10, 11, PALETTE.eyeWhite, 3, 1);
    px(ctx, grid, 19, 11, PALETTE.eyeWhite, 3, 1);
    px(ctx, grid, 11, 11, PALETTE.eyeBlue, 1, 1);
    px(ctx, grid, 20, 11, PALETTE.eyeBlue, 1, 1);
    // Squint line
    px(ctx, grid, 10, 10, PALETTE.furMid, 3, 1, 0.7);
    px(ctx, grid, 19, 10, PALETTE.furMid, 3, 1, 0.7);
    return;
  }

  if (mood === "analyzing") {
    // Narrowed/focused eyes
    px(ctx, grid, 10, 11, PALETTE.eyeWhite, 3, 1);
    px(ctx, grid, 19, 11, PALETTE.eyeWhite, 3, 1);
    // Pupil shifts slightly based on frame (scanning effect)
    const pupilShift = frame === 1 ? 1 : 0;
    px(ctx, grid, 11 + pupilShift, 11, PALETTE.eyeBlue, 1, 1);
    px(ctx, grid, 20 + pupilShift, 11, PALETTE.eyeBlue, 1, 1);
    px(ctx, grid, 10, 10, PALETTE.furMid, 3, 1, 0.6);
    px(ctx, grid, 19, 10, PALETTE.furMid, 3, 1, 0.6);
    // Cyber scan line
    if (frame === 1 || frame === 2) {
      px(ctx, grid, 10, 10, PALETTE.cyberTeal, 3, 1, 0.3);
      px(ctx, grid, 19, 10, PALETTE.cyberTeal, 3, 1, 0.3);
    }
  } else if (mood === "alert") {
    // Wide eyes with red tint
    px(ctx, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    px(ctx, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    px(ctx, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    px(ctx, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    px(ctx, grid, 11, 11, PALETTE.pupil, 1, 1);
    px(ctx, grid, 20, 11, PALETTE.pupil, 1, 1);
    // Red glow (pulses with frame)
    const alertAlpha = 0.2 + 0.15 * Math.sin((frame / ADVISER_FRAME_COUNT) * Math.PI * 2);
    px(ctx, grid, 9, 9, PALETTE.alertGlow, 5, 1, alertAlpha + 0.1);
    px(ctx, grid, 18, 9, PALETTE.alertGlow, 5, 1, alertAlpha + 0.1);
    px(ctx, grid, 9, 12, PALETTE.alertGlow, 5, 1, alertAlpha);
    px(ctx, grid, 18, 12, PALETTE.alertGlow, 5, 1, alertAlpha);
  } else {
    // Normal/standby/success eyes
    px(ctx, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    px(ctx, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    px(ctx, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    px(ctx, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    px(ctx, grid, 11, 11, PALETTE.pupil, 1, 1);
    px(ctx, grid, 20, 11, PALETTE.pupil, 1, 1);
    px(ctx, grid, 10, 9, PALETTE.furDark, 3, 1, 0.5);
    px(ctx, grid, 19, 9, PALETTE.furDark, 3, 1, 0.5);
  }
}

function drawMouthCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
  frame: number,
): void {
  if (mood === "success") {
    // Animated grin - frame 1 has wider grin
    const grinWidth = frame === 1 ? 7 : 6;
    const grinX = frame === 1 ? 12 : 13;
    px(ctx, grid, grinX, 16, PALETTE.furWhite, grinWidth, 1);
    px(ctx, grid, 14, 17, PALETTE.nose, 4, 1);
    px(ctx, grid, 14, 17, 0xcc4444, 4, 1, 0.3);
  } else if (mood === "alert") {
    // Tense mouth, slight animation
    px(ctx, grid, 14, 16, PALETTE.furLight, 4, 1);
    if (frame % 2 === 0) {
      px(ctx, grid, 15, 17, PALETTE.nose, 2, 1);
    } else {
      px(ctx, grid, 14, 17, PALETTE.nose, 3, 1);
    }
  } else if (mood === "analyzing") {
    // Slight frown / concentration
    px(ctx, grid, 13, 16, PALETTE.furLight, 6, 1);
    px(ctx, grid, 14, 17, PALETTE.furMid, 4, 1, 0.4);
  } else {
    // Neutral/slight smile
    px(ctx, grid, 13, 16, PALETTE.furLight, 6, 1);
    px(ctx, grid, 14, 17, PALETTE.furLight, 4, 1, 0.5);
  }
}

function drawHeadsetCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
  frame: number,
): void {
  // Headset band over right ear
  px(ctx, grid, 23, 7, PALETTE.headsetFrame, 2, 1);
  px(ctx, grid, 24, 8, PALETTE.headsetFrame, 2, 1);
  px(ctx, grid, 25, 9, PALETTE.headsetFrame, 1, 3);
  px(ctx, grid, 25, 12, PALETTE.headsetFrame, 1, 3);
  px(ctx, grid, 24, 15, PALETTE.headsetFrame, 2, 2);

  // Mic arm
  px(ctx, grid, 23, 16, PALETTE.headsetFrame, 1, 1);
  px(ctx, grid, 22, 17, PALETTE.headsetFrame, 1, 1);

  // Headset glow (mood-colored, animated pulse)
  let glow = PALETTE.headsetGlow;
  if (mood === "alert") glow = PALETTE.alertGlow;
  else if (mood === "success") glow = PALETTE.successGold;
  else if (mood === "analyzing") glow = PALETTE.analyzingAmber;

  const glowAlpha = 0.5 + 0.3 * Math.sin((frame / ADVISER_FRAME_COUNT) * Math.PI * 2);
  px(ctx, grid, 24, 15, glow, 1, 1, glowAlpha + 0.2);
  px(ctx, grid, 22, 17, glow, 1, 1, glowAlpha);

  // Cyber ear implant (small teal dots near ear)
  px(ctx, grid, 24, 10, PALETTE.cyberTeal, 1, 1, 0.4 + 0.2 * ((frame + 1) % 2));
  px(ctx, grid, 24, 12, PALETTE.cyberTeal, 1, 1, 0.3 + 0.2 * (frame % 2));
}

function drawMoodAccentsCanvas(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  mood: AdviserMood,
  frame: number,
): void {
  if (mood === "analyzing") {
    // Hologram data lines - animated scan
    const scanY = 22 + (frame % 3);
    px(ctx, grid, 4, scanY, PALETTE.analyzingAmber, 4, 1, 0.15);
    px(ctx, grid, 5, scanY + 1, PALETTE.analyzingAmber, 2, 1, 0.4);
    px(ctx, grid, 4, scanY + 2, 0x00ffcc, 3, 1, 0.2);
    px(ctx, grid, 5, scanY + 3, 0x00ffcc, 2, 1, 0.15);
  } else if (mood === "alert") {
    // Warning triangle hint - blinks
    const warnAlpha = frame % 2 === 0 ? 0.6 : 0.3;
    px(ctx, grid, 4, 4, PALETTE.alertGlow, 1, 1, warnAlpha);
    px(ctx, grid, 3, 5, PALETTE.alertGlow, 3, 1, warnAlpha * 0.7);
    px(ctx, grid, 3, 6, PALETTE.alertGlow, 3, 1, warnAlpha * 0.3);
  } else if (mood === "success") {
    // Sparkle pixels - animated twinkle
    const sparkles = [
      { x: 27, y: 4, baseAlpha: 0.9 },
      { x: 28, y: 3, baseAlpha: 0.5 },
      { x: 26, y: 5, baseAlpha: 0.4 },
      { x: 4, y: 3, baseAlpha: 0.3 },
      { x: 5, y: 5, baseAlpha: 0.5 },
    ];
    for (let i = 0; i < sparkles.length; i++) {
      const s = sparkles[i];
      const phase = ((frame + i) % ADVISER_FRAME_COUNT) / ADVISER_FRAME_COUNT;
      const alpha = s.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(phase * Math.PI)));
      px(ctx, grid, s.x, s.y, PALETTE.successGold, 1, 1, alpha);
    }
    // Badge highlight
    px(ctx, grid, 16, 22, PALETTE.successGold, 1, 1, 0.8);
  }

  // Cyber HUD overlay elements (all moods, subtle)
  if (frame === 0 || frame === 2) {
    // Tiny corner bracket marks (HUD framing)
    px(ctx, grid, 3, 3, PALETTE.cyberTeal, 2, 1, 0.15);
    px(ctx, grid, 3, 3, PALETTE.cyberTeal, 1, 2, 0.15);
    px(ctx, grid, 27, 28, PALETTE.cyberTeal, 2, 1, 0.15);
    px(ctx, grid, 28, 27, PALETTE.cyberTeal, 1, 2, 0.15);
  }
}

// ── Spritesheet generation ─────────────────────────────────

/** Texture key for the adviser spritesheet */
export const ADVISER_SHEET_KEY = "rex-adviser-sheet";

/** Frame size in pixels for the spritesheet */
export const ADVISER_FRAME_SIZE = 128;

/**
 * Generate the Rex adviser portrait spritesheet as a CanvasTexture.
 * Layout: 4 columns (frames) × 4 rows (moods: standby, analyzing, alert, success)
 * Each cell is ADVISER_FRAME_SIZE × ADVISER_FRAME_SIZE pixels.
 *
 * If a preloaded PNG portrait exists for a mood (key: "rex-portrait-{mood}"),
 * it is used as the base image. The animated frame border and mood accent
 * overlays are drawn on top. If no PNG is available, falls back to the full
 * procedural pixel-art rendering.
 */
export function generateAdviserSpritesheet(
  textures: Phaser.Textures.TextureManager,
): void {
  if (textures.exists(ADVISER_SHEET_KEY)) return;

  const fs = ADVISER_FRAME_SIZE;
  const cols = ADVISER_FRAME_COUNT;
  const rows = ADVISER_MOODS.length;
  const sheetW = cols * fs;
  const sheetH = rows * fs;

  const canvasTex = textures.createCanvas(ADVISER_SHEET_KEY, sheetW, sheetH);
  if (!canvasTex) return;

  const ctx = canvasTex.getContext();

  for (let row = 0; row < rows; row++) {
    const mood = ADVISER_MOODS[row];
    const pngKey = `rex-portrait-${mood}`;
    const hasPng = textures.exists(pngKey);

    for (let col = 0; col < cols; col++) {
      // Offset context to draw in the correct cell
      ctx.save();
      ctx.translate(col * fs, row * fs);

      // Create a clipping region for this cell
      ctx.beginPath();
      ctx.rect(0, 0, fs, fs);
      ctx.clip();

      const grid = createPixelGrid(fs, fs);

      if (hasPng) {
        // ── PNG portrait path ──────────────────────────────────
        // Draw the AI-generated portrait scaled to the frame size,
        // then overlay the animated frame border and mood accents.
        const srcTex = textures.get(pngKey);
        const srcImg = srcTex.getSourceImage() as
          | HTMLImageElement
          | HTMLCanvasElement;
        ctx.drawImage(srcImg, 0, 0, fs, fs);
        drawFrameCanvas(ctx, grid, mood);
        drawMoodAccentsCanvas(ctx, grid, mood, col);
      } else {
        // ── Procedural fallback ────────────────────────────────
        drawBackgroundCanvas(ctx, grid, mood, col);
        drawFrameCanvas(ctx, grid, mood);
        drawHuskyBaseCanvas(ctx, grid, col);
        drawEyesCanvas(ctx, grid, mood, col);
        drawMouthCanvas(ctx, grid, mood, col);
        drawHeadsetCanvas(ctx, grid, mood, col);
        drawMoodAccentsCanvas(ctx, grid, mood, col);
      }

      ctx.restore();
    }
  }

  canvasTex.refresh();

  // Add frames to the texture for Phaser spritesheet usage
  const tex = textures.get(ADVISER_SHEET_KEY);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frameName = `${ADVISER_MOODS[row]}_${col}`;
      tex.add(
        frameName as unknown as number,
        0,
        col * fs,
        row * fs,
        fs,
        fs,
      );
    }
  }
}

/**
 * Get the frame name for a given mood and animation frame index.
 */
export function getAdviserFrameName(mood: AdviserMood, frame: number): string {
  return `${mood}_${frame % ADVISER_FRAME_COUNT}`;
}

// ── Legacy Graphics-based API (backward compat) ────────────

function drawBackgroundLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  for (let y = 0; y < grid.rows; y++) {
    const t = y / (grid.rows - 1);
    const r1 = (PALETTE.bgTop >> 16) & 0xff;
    const g1 = (PALETTE.bgTop >> 8) & 0xff;
    const b1 = PALETTE.bgTop & 0xff;
    const r2 = (PALETTE.bgBottom >> 16) & 0xff;
    const g2 = (PALETTE.bgBottom >> 8) & 0xff;
    const b2 = PALETTE.bgBottom & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const gg = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const color = (r << 16) | (gg << 8) | b;
    pxG(g, grid, 0, y, color, grid.cols, 1);
  }

  let glowColor = PALETTE.headsetGlow;
  if (mood === "alert") glowColor = PALETTE.alertGlow;
  else if (mood === "success") glowColor = PALETTE.successGold;
  else if (mood === "analyzing") glowColor = PALETTE.analyzingAmber;

  for (let dy = 0; dy < 6; dy++) {
    for (let dx = 0; dx < 6; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        pxG(g, grid, 26 + dx, 2 + dy, glowColor, 1, 1, 0.08 * (1 - dist / 5));
      }
    }
  }
}

function drawFrameLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  const theme = getTheme();
  const outer = 0x070b14;
  const middle = theme.colors.panelBorder;

  pxG(g, grid, 0, 0, outer, grid.cols, 1);
  pxG(g, grid, 0, grid.rows - 1, outer, grid.cols, 1);
  pxG(g, grid, 0, 0, outer, 1, grid.rows);
  pxG(g, grid, grid.cols - 1, 0, outer, 1, grid.rows);

  pxG(g, grid, 1, 1, middle, grid.cols - 2, 1);
  pxG(g, grid, 1, grid.rows - 2, middle, grid.cols - 2, 1);
  pxG(g, grid, 1, 1, middle, 1, grid.rows - 2);
  pxG(g, grid, grid.cols - 2, 1, middle, 1, grid.rows - 2);

  let accentColor = theme.colors.accent;
  if (mood === "alert") accentColor = PALETTE.alertGlow;
  else if (mood === "success") accentColor = PALETTE.successGold;
  else if (mood === "analyzing") accentColor = PALETTE.analyzingAmber;

  pxG(g, grid, 2, 2, accentColor, grid.cols - 4, 1, 0.4);
  pxG(g, grid, 2, grid.rows - 3, accentColor, grid.cols - 4, 1, 0.2);
}

function drawHuskyBaseLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
): void {
  pxG(g, grid, 8, 4, PALETTE.furDark, 3, 1);
  pxG(g, grid, 7, 5, PALETTE.furDark, 4, 1);
  pxG(g, grid, 7, 6, PALETTE.furMid, 4, 1);
  pxG(g, grid, 8, 7, PALETTE.furMid, 2, 1);
  pxG(g, grid, 21, 4, PALETTE.furDark, 3, 1);
  pxG(g, grid, 21, 5, PALETTE.furDark, 4, 1);
  pxG(g, grid, 21, 6, PALETTE.furMid, 4, 1);
  pxG(g, grid, 22, 7, PALETTE.furMid, 2, 1);
  pxG(g, grid, 9, 5, 0xf7b7c5, 1, 2);
  pxG(g, grid, 22, 5, 0xf7b7c5, 1, 2);
  pxG(g, grid, 9, 7, PALETTE.furDark, 14, 1);
  pxG(g, grid, 8, 8, PALETTE.furDark, 16, 1);
  pxG(g, grid, 8, 9, PALETTE.furMid, 16, 1);
  pxG(g, grid, 7, 10, PALETTE.furMid, 18, 1);
  pxG(g, grid, 7, 11, PALETTE.furMid, 18, 1);
  pxG(g, grid, 8, 12, PALETTE.furMid, 16, 1);
  pxG(g, grid, 9, 13, PALETTE.furLight, 14, 1);
  pxG(g, grid, 10, 14, PALETTE.furWhite, 12, 1);
  pxG(g, grid, 10, 15, PALETTE.furWhite, 12, 1);
  pxG(g, grid, 11, 16, PALETTE.furWhite, 10, 1);
  pxG(g, grid, 12, 17, PALETTE.furWhite, 8, 1);
  pxG(g, grid, 13, 8, PALETTE.furWhite, 6, 1);
  pxG(g, grid, 12, 9, PALETTE.furWhite, 8, 1);
  pxG(g, grid, 11, 10, PALETTE.furWhite, 10, 1);
  pxG(g, grid, 11, 11, PALETTE.furWhite, 10, 1);
  pxG(g, grid, 10, 12, PALETTE.furWhite, 12, 1);
  pxG(g, grid, 15, 14, PALETTE.nose, 2, 1);
  pxG(g, grid, 15, 15, PALETTE.nose, 2, 1);
  pxG(g, grid, 15, 16, PALETTE.furLight, 2, 1, 0.5);
  pxG(g, grid, 9, 18, PALETTE.suitDark, 14, 1);
  pxG(g, grid, 8, 19, PALETTE.suitDark, 16, 1);
  pxG(g, grid, 7, 20, PALETTE.suitDark, 18, 1);
  pxG(g, grid, 6, 21, PALETTE.suitDark, 20, 1);
  pxG(g, grid, 5, 22, PALETTE.suitDark, 22, 1);
  pxG(g, grid, 5, 23, PALETTE.suitDark, 22, 1);
  pxG(g, grid, 4, 24, PALETTE.suitDark, 24, 1);
  pxG(g, grid, 4, 25, PALETTE.suitDark, 24, 1);
  pxG(g, grid, 3, 26, PALETTE.suitDark, 26, 1);
  pxG(g, grid, 3, 27, PALETTE.suitDark, 26, 1);
  pxG(g, grid, 3, 28, PALETTE.suitDark, 26, 1);
  pxG(g, grid, 3, 29, PALETTE.suitDark, 26, 1);
  pxG(g, grid, 13, 19, PALETTE.suitAccent, 1, 5);
  pxG(g, grid, 18, 19, PALETTE.suitAccent, 1, 5);
  pxG(g, grid, 14, 18, PALETTE.shirt, 4, 1);
  pxG(g, grid, 14, 19, PALETTE.shirt, 4, 1);
  pxG(g, grid, 15, 20, PALETTE.tie, 2, 1);
  pxG(g, grid, 15, 21, PALETTE.tie, 2, 1);
  pxG(g, grid, 15, 22, PALETTE.tie, 2, 1);
  pxG(g, grid, 16, 23, PALETTE.tie, 1, 1);
}

function drawEyesLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "analyzing") {
    pxG(g, grid, 10, 11, PALETTE.eyeWhite, 3, 1);
    pxG(g, grid, 19, 11, PALETTE.eyeWhite, 3, 1);
    pxG(g, grid, 11, 11, PALETTE.eyeBlue, 1, 1);
    pxG(g, grid, 20, 11, PALETTE.eyeBlue, 1, 1);
    pxG(g, grid, 10, 10, PALETTE.furMid, 3, 1, 0.6);
    pxG(g, grid, 19, 10, PALETTE.furMid, 3, 1, 0.6);
  } else if (mood === "alert") {
    pxG(g, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    pxG(g, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    pxG(g, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    pxG(g, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    pxG(g, grid, 11, 11, PALETTE.pupil, 1, 1);
    pxG(g, grid, 20, 11, PALETTE.pupil, 1, 1);
    pxG(g, grid, 9, 9, PALETTE.alertGlow, 5, 1, 0.3);
    pxG(g, grid, 18, 9, PALETTE.alertGlow, 5, 1, 0.3);
    pxG(g, grid, 9, 12, PALETTE.alertGlow, 5, 1, 0.2);
    pxG(g, grid, 18, 12, PALETTE.alertGlow, 5, 1, 0.2);
  } else {
    pxG(g, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    pxG(g, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    pxG(g, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    pxG(g, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    pxG(g, grid, 11, 11, PALETTE.pupil, 1, 1);
    pxG(g, grid, 20, 11, PALETTE.pupil, 1, 1);
    pxG(g, grid, 10, 9, PALETTE.furDark, 3, 1, 0.5);
    pxG(g, grid, 19, 9, PALETTE.furDark, 3, 1, 0.5);
  }
}

function drawMouthLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "success") {
    pxG(g, grid, 13, 16, PALETTE.furWhite, 6, 1);
    pxG(g, grid, 14, 17, PALETTE.nose, 4, 1);
    pxG(g, grid, 14, 17, 0xcc4444, 4, 1, 0.3);
  } else if (mood === "alert") {
    pxG(g, grid, 14, 16, PALETTE.furLight, 4, 1);
    pxG(g, grid, 15, 17, PALETTE.nose, 2, 1);
  } else {
    pxG(g, grid, 13, 16, PALETTE.furLight, 6, 1);
    pxG(g, grid, 14, 17, PALETTE.furLight, 4, 1, 0.5);
  }
}

function drawHeadsetLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  pxG(g, grid, 23, 7, PALETTE.headsetFrame, 2, 1);
  pxG(g, grid, 24, 8, PALETTE.headsetFrame, 2, 1);
  pxG(g, grid, 25, 9, PALETTE.headsetFrame, 1, 3);
  pxG(g, grid, 25, 12, PALETTE.headsetFrame, 1, 3);
  pxG(g, grid, 24, 15, PALETTE.headsetFrame, 2, 2);
  pxG(g, grid, 23, 16, PALETTE.headsetFrame, 1, 1);
  pxG(g, grid, 22, 17, PALETTE.headsetFrame, 1, 1);

  let glow = PALETTE.headsetGlow;
  if (mood === "alert") glow = PALETTE.alertGlow;
  else if (mood === "success") glow = PALETTE.successGold;
  else if (mood === "analyzing") glow = PALETTE.analyzingAmber;

  pxG(g, grid, 24, 15, glow, 1, 1, 0.7);
  pxG(g, grid, 22, 17, glow, 1, 1, 0.5);
}

function drawMoodAccentsLegacy(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "analyzing") {
    pxG(g, grid, 4, 22, PALETTE.analyzingAmber, 4, 3, 0.15);
    pxG(g, grid, 5, 23, PALETTE.analyzingAmber, 2, 1, 0.5);
    pxG(g, grid, 4, 24, 0x00ffcc, 3, 1, 0.2);
    pxG(g, grid, 5, 25, 0x00ffcc, 2, 1, 0.15);
  } else if (mood === "alert") {
    pxG(g, grid, 4, 4, PALETTE.alertGlow, 1, 1, 0.6);
    pxG(g, grid, 3, 5, PALETTE.alertGlow, 3, 1, 0.4);
    pxG(g, grid, 3, 6, PALETTE.alertGlow, 3, 1, 0.2);
  } else if (mood === "success") {
    pxG(g, grid, 27, 4, PALETTE.successGold, 1, 1, 0.9);
    pxG(g, grid, 28, 3, PALETTE.successGold, 1, 1, 0.5);
    pxG(g, grid, 26, 5, PALETTE.successGold, 1, 1, 0.4);
    pxG(g, grid, 16, 22, PALETTE.successGold, 1, 1, 0.8);
  }
}

// ── Public API ─────────────────────────────────────────────

/** Legacy: Draw Rex portrait directly to a Graphics object (no animation). */
export function drawRexPortrait(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  mood: AdviserMood,
): void {
  graphics.clear();
  const grid = createPixelGrid(width, height);
  drawBackgroundLegacy(graphics, grid, mood);
  drawFrameLegacy(graphics, grid, mood);
  drawHuskyBaseLegacy(graphics, grid);
  drawEyesLegacy(graphics, grid, mood);
  drawMouthLegacy(graphics, grid, mood);
  drawHeadsetLegacy(graphics, grid, mood);
  drawMoodAccentsLegacy(graphics, grid, mood);
}

/** Mood-specific accent color for use in borders, labels, etc. */
export function getMoodAccentColor(mood: AdviserMood): number {
  switch (mood) {
    case "alert":
      return PALETTE.alertGlow;
    case "success":
      return PALETTE.successGold;
    case "analyzing":
      return PALETTE.analyzingAmber;
    case "standby":
    default:
      return PALETTE.headsetGlow;
  }
}

/**
 * Apply a portrait expression tint/animation to a Phaser GameObject.
 * This can be called on the adviser sprite or CEO portrait image.
 *
 *   happy   → warm tint (0xffdd88) + brief upward scale tween
 *   neutral → clear tint
 *   worried → cool tint (0x88aaff) + brief downward scale tween
 *   angry   → red tint (0xff8888)
 */
export function setExpression(
  scene: Phaser.Scene,
  gameObject: Phaser.GameObjects.Components.Tint & Phaser.GameObjects.Components.Transform & { scene: Phaser.Scene },
  expression: PortraitExpression,
): void {
  // Clear any existing tint first
  (gameObject as unknown as Phaser.GameObjects.Image).clearTint();

  switch (expression) {
    case 'happy':
      (gameObject as unknown as Phaser.GameObjects.Image).setTint(0xffdd88);
      scene.tweens.add({
        targets: gameObject,
        scaleY: { from: gameObject.scaleY, to: gameObject.scaleY * 1.03 },
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'worried':
      (gameObject as unknown as Phaser.GameObjects.Image).setTint(0x88aaff);
      scene.tweens.add({
        targets: gameObject,
        scaleY: { from: gameObject.scaleY, to: gameObject.scaleY * 0.97 },
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'angry':
      (gameObject as unknown as Phaser.GameObjects.Image).setTint(0xff8888);
      break;
    case 'neutral':
    default:
      // No tint applied — already cleared above
      break;
  }
}
