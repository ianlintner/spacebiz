import type Phaser from "phaser";
import type { AdviserMood } from "../data/types.ts";
import { getTheme } from "./Theme.ts";

// ── Pixel grid helpers (same pattern as PortraitGenerator) ─

const LOGICAL_COLS = 32;
const LOGICAL_ROWS = 32;

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
};

// ── Background ─────────────────────────────────────────────

function drawBackground(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  // Gradient background
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
    px(g, grid, 0, y, color, grid.cols, 1);
  }

  // Mood-specific ambient glow
  let glowColor = PALETTE.headsetGlow;
  if (mood === "alert") glowColor = PALETTE.alertGlow;
  else if (mood === "success") glowColor = PALETTE.successGold;
  else if (mood === "analyzing") glowColor = PALETTE.analyzingAmber;

  // Subtle glow in upper-right
  for (let dy = 0; dy < 6; dy++) {
    for (let dx = 0; dx < 6; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        px(g, grid, 26 + dx, 2 + dy, glowColor, 1, 1, 0.08 * (1 - dist / 5));
      }
    }
  }
}

// ── Frame border ───────────────────────────────────────────

function drawFrame(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  const theme = getTheme();
  const outer = 0x070b14;
  const middle = theme.colors.panelBorder;

  // Outer border
  px(g, grid, 0, 0, outer, grid.cols, 1);
  px(g, grid, 0, grid.rows - 1, outer, grid.cols, 1);
  px(g, grid, 0, 0, outer, 1, grid.rows);
  px(g, grid, grid.cols - 1, 0, outer, 1, grid.rows);

  // Middle border
  px(g, grid, 1, 1, middle, grid.cols - 2, 1);
  px(g, grid, 1, grid.rows - 2, middle, grid.cols - 2, 1);
  px(g, grid, 1, 1, middle, 1, grid.rows - 2);
  px(g, grid, grid.cols - 2, 1, middle, 1, grid.rows - 2);

  // Accent line top
  let accentColor = theme.colors.accent;
  if (mood === "alert") accentColor = PALETTE.alertGlow;
  else if (mood === "success") accentColor = PALETTE.successGold;
  else if (mood === "analyzing") accentColor = PALETTE.analyzingAmber;

  px(g, grid, 2, 2, accentColor, grid.cols - 4, 1, 0.4);
  px(g, grid, 2, grid.rows - 3, accentColor, grid.cols - 4, 1, 0.2);
}

// ── Husky head & body ──────────────────────────────────────

function drawHuskyBase(g: Phaser.GameObjects.Graphics, grid: PixelGrid): void {
  // -- Ears --
  // Left ear
  px(g, grid, 8, 4, PALETTE.furDark, 3, 1);
  px(g, grid, 7, 5, PALETTE.furDark, 4, 1);
  px(g, grid, 7, 6, PALETTE.furMid, 4, 1);
  px(g, grid, 8, 7, PALETTE.furMid, 2, 1);
  // Right ear
  px(g, grid, 21, 4, PALETTE.furDark, 3, 1);
  px(g, grid, 21, 5, PALETTE.furDark, 4, 1);
  px(g, grid, 21, 6, PALETTE.furMid, 4, 1);
  px(g, grid, 22, 7, PALETTE.furMid, 2, 1);
  // Ear inner pink
  px(g, grid, 9, 5, 0xf7b7c5, 1, 2);
  px(g, grid, 22, 5, 0xf7b7c5, 1, 2);

  // -- Head shape --
  px(g, grid, 9, 7, PALETTE.furDark, 14, 1); // top
  px(g, grid, 8, 8, PALETTE.furDark, 16, 1);
  px(g, grid, 8, 9, PALETTE.furMid, 16, 1);
  px(g, grid, 7, 10, PALETTE.furMid, 18, 1);
  px(g, grid, 7, 11, PALETTE.furMid, 18, 1);
  px(g, grid, 8, 12, PALETTE.furMid, 16, 1);
  px(g, grid, 9, 13, PALETTE.furLight, 14, 1);
  px(g, grid, 10, 14, PALETTE.furWhite, 12, 1);
  px(g, grid, 10, 15, PALETTE.furWhite, 12, 1);
  px(g, grid, 11, 16, PALETTE.furWhite, 10, 1);
  px(g, grid, 12, 17, PALETTE.furWhite, 8, 1);

  // White face mask (chevron)
  px(g, grid, 13, 8, PALETTE.furWhite, 6, 1);
  px(g, grid, 12, 9, PALETTE.furWhite, 8, 1);
  px(g, grid, 11, 10, PALETTE.furWhite, 10, 1);
  px(g, grid, 11, 11, PALETTE.furWhite, 10, 1);
  px(g, grid, 10, 12, PALETTE.furWhite, 12, 1);

  // -- Nose --
  px(g, grid, 15, 14, PALETTE.nose, 2, 1);
  px(g, grid, 15, 15, PALETTE.nose, 2, 1);

  // -- Muzzle line --
  px(g, grid, 15, 16, PALETTE.furLight, 2, 1, 0.5);

  // -- Suit / body --
  px(g, grid, 9, 18, PALETTE.suitDark, 14, 1);
  px(g, grid, 8, 19, PALETTE.suitDark, 16, 1);
  px(g, grid, 7, 20, PALETTE.suitDark, 18, 1);
  px(g, grid, 6, 21, PALETTE.suitDark, 20, 1);
  px(g, grid, 5, 22, PALETTE.suitDark, 22, 1);
  px(g, grid, 5, 23, PALETTE.suitDark, 22, 1);
  px(g, grid, 4, 24, PALETTE.suitDark, 24, 1);
  px(g, grid, 4, 25, PALETTE.suitDark, 24, 1);
  px(g, grid, 3, 26, PALETTE.suitDark, 26, 1);
  px(g, grid, 3, 27, PALETTE.suitDark, 26, 1);
  px(g, grid, 3, 28, PALETTE.suitDark, 26, 1);
  px(g, grid, 3, 29, PALETTE.suitDark, 26, 1);

  // Lapel accent (gold piping)
  px(g, grid, 13, 19, PALETTE.suitAccent, 1, 5);
  px(g, grid, 18, 19, PALETTE.suitAccent, 1, 5);

  // Shirt collar
  px(g, grid, 14, 18, PALETTE.shirt, 4, 1);
  px(g, grid, 14, 19, PALETTE.shirt, 4, 1);

  // Tie
  px(g, grid, 15, 20, PALETTE.tie, 2, 1);
  px(g, grid, 15, 21, PALETTE.tie, 2, 1);
  px(g, grid, 15, 22, PALETTE.tie, 2, 1);
  px(g, grid, 16, 23, PALETTE.tie, 1, 1);
}

// ── Eyes per mood ──────────────────────────────────────────

function drawEyes(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "analyzing") {
    // Narrowed/focused eyes
    px(g, grid, 10, 11, PALETTE.eyeWhite, 3, 1);
    px(g, grid, 19, 11, PALETTE.eyeWhite, 3, 1);
    px(g, grid, 11, 11, PALETTE.eyeBlue, 1, 1);
    px(g, grid, 20, 11, PALETTE.eyeBlue, 1, 1);
    // Slight squint line above
    px(g, grid, 10, 10, PALETTE.furMid, 3, 1, 0.6);
    px(g, grid, 19, 10, PALETTE.furMid, 3, 1, 0.6);
  } else if (mood === "alert") {
    // Wide eyes with red tint
    px(g, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    px(g, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    px(g, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    px(g, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    px(g, grid, 11, 11, PALETTE.pupil, 1, 1);
    px(g, grid, 20, 11, PALETTE.pupil, 1, 1);
    // Red outline glow
    px(g, grid, 9, 9, PALETTE.alertGlow, 5, 1, 0.3);
    px(g, grid, 18, 9, PALETTE.alertGlow, 5, 1, 0.3);
    px(g, grid, 9, 12, PALETTE.alertGlow, 5, 1, 0.2);
    px(g, grid, 18, 12, PALETTE.alertGlow, 5, 1, 0.2);
  } else {
    // Normal/standby/success eyes
    px(g, grid, 10, 10, PALETTE.eyeWhite, 3, 2);
    px(g, grid, 19, 10, PALETTE.eyeWhite, 3, 2);
    px(g, grid, 11, 10, PALETTE.eyeBlue, 1, 2);
    px(g, grid, 20, 10, PALETTE.eyeBlue, 1, 2);
    px(g, grid, 11, 11, PALETTE.pupil, 1, 1);
    px(g, grid, 20, 11, PALETTE.pupil, 1, 1);
    // Eyebrow ridge
    px(g, grid, 10, 9, PALETTE.furDark, 3, 1, 0.5);
    px(g, grid, 19, 9, PALETTE.furDark, 3, 1, 0.5);
  }
}

// ── Mouth per mood ─────────────────────────────────────────

function drawMouth(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "success") {
    // Wide grin (open mouth)
    px(g, grid, 13, 16, PALETTE.furWhite, 6, 1);
    px(g, grid, 14, 17, PALETTE.nose, 4, 1); // open mouth dark
    px(g, grid, 14, 17, 0xcc4444, 4, 1, 0.3); // tongue hint
  } else if (mood === "alert") {
    // Tense/slightly open
    px(g, grid, 14, 16, PALETTE.furLight, 4, 1);
    px(g, grid, 15, 17, PALETTE.nose, 2, 1);
  } else {
    // Neutral/slight smile
    px(g, grid, 13, 16, PALETTE.furLight, 6, 1);
    px(g, grid, 14, 17, PALETTE.furLight, 4, 1, 0.5);
  }
}

// ── Headset ────────────────────────────────────────────────

function drawHeadset(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  // Headset band over right ear
  px(g, grid, 23, 7, PALETTE.headsetFrame, 2, 1);
  px(g, grid, 24, 8, PALETTE.headsetFrame, 2, 1);
  px(g, grid, 25, 9, PALETTE.headsetFrame, 1, 3);
  px(g, grid, 25, 12, PALETTE.headsetFrame, 1, 3);
  px(g, grid, 24, 15, PALETTE.headsetFrame, 2, 2);

  // Mic arm
  px(g, grid, 23, 16, PALETTE.headsetFrame, 1, 1);
  px(g, grid, 22, 17, PALETTE.headsetFrame, 1, 1);

  // Headset glow (mood-colored)
  let glow = PALETTE.headsetGlow;
  if (mood === "alert") glow = PALETTE.alertGlow;
  else if (mood === "success") glow = PALETTE.successGold;
  else if (mood === "analyzing") glow = PALETTE.analyzingAmber;

  px(g, grid, 24, 15, glow, 1, 1, 0.7);
  px(g, grid, 22, 17, glow, 1, 1, 0.5);
}

// ── Mood-specific accents ──────────────────────────────────

function drawMoodAccents(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  mood: AdviserMood,
): void {
  if (mood === "analyzing") {
    // Hologram tablet glow in lower-left
    px(g, grid, 4, 22, PALETTE.analyzingAmber, 4, 3, 0.15);
    px(g, grid, 5, 23, PALETTE.analyzingAmber, 2, 1, 0.5);
    // Data lines
    px(g, grid, 4, 24, 0x00ffcc, 3, 1, 0.2);
    px(g, grid, 5, 25, 0x00ffcc, 2, 1, 0.15);
  } else if (mood === "alert") {
    // Warning triangle hint upper-left
    px(g, grid, 4, 4, PALETTE.alertGlow, 1, 1, 0.6);
    px(g, grid, 3, 5, PALETTE.alertGlow, 3, 1, 0.4);
    px(g, grid, 3, 6, PALETTE.alertGlow, 3, 1, 0.2);
  } else if (mood === "success") {
    // Sparkle pixels
    px(g, grid, 27, 4, PALETTE.successGold, 1, 1, 0.9);
    px(g, grid, 28, 3, PALETTE.successGold, 1, 1, 0.5);
    px(g, grid, 26, 5, PALETTE.successGold, 1, 1, 0.4);
    // Badge highlight
    px(g, grid, 16, 22, PALETTE.successGold, 1, 1, 0.8);
  }
}

// ── Public API ─────────────────────────────────────────────

export function drawRexPortrait(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  mood: AdviserMood,
): void {
  graphics.clear();
  const grid = createPixelGrid(width, height);
  drawBackground(graphics, grid, mood);
  drawFrame(graphics, grid, mood);
  drawHuskyBase(graphics, grid);
  drawEyes(graphics, grid, mood);
  drawMouth(graphics, grid, mood);
  drawHeadset(graphics, grid, mood);
  drawMoodAccents(graphics, grid, mood);
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
