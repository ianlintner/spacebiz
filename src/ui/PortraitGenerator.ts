import type Phaser from "phaser";
import { SeededRNG } from "../utils/SeededRNG.ts";
import type { EventCategory, PlanetType, ShipClass } from "../data/types.ts";
import { getTheme, lerpColor } from "./Theme.ts";

export type PortraitType =
  | "planet"
  | "ship"
  | "system"
  | "event"
  | "alien"
  | "empire"
  | "company";
export type AlienRole =
  | "broker"
  | "miner"
  | "researcher"
  | "concierge"
  | "enforcer";

export interface PortraitData {
  planetType?: PlanetType;
  shipClass?: ShipClass;
  starColor?: number;
  planetCount?: number;
  eventCategory?: EventCategory;
  alienRole?: AlienRole;
}

interface PixelGrid {
  cols: number;
  rows: number;
  pixelSize: number;
  originX: number;
  originY: number;
}

const LOGICAL_COLS = 32;
const LOGICAL_ROWS = 32;

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

function circleFill(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  alpha = 1,
): void {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius) {
        px(g, grid, cx + x, cy + y, color, 1, 1, alpha);
      }
    }
  }
}

function ring(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  alpha = 1,
): void {
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 18) {
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    px(g, grid, x, y, color, 1, 1, alpha);
  }
}

function fillGradientV(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  colorTop: number,
  colorBottom: number,
): void {
  for (let y = 0; y < grid.rows; y++) {
    const t = y / Math.max(grid.rows - 1, 1);
    px(g, grid, 0, y, lerpColor(colorTop, colorBottom, t), grid.cols, 1);
  }
}

function fillGradientH(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  colorLeft: number,
  colorRight: number,
): void {
  for (let x = 0; x < grid.cols; x++) {
    const t = x / Math.max(grid.cols - 1, 1);
    px(g, grid, x, 0, lerpColor(colorLeft, colorRight, t), 1, grid.rows);
  }
}

function horizontalBand(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  baseY: number,
  amplitude: number,
  frequency: number,
  phase: number,
  color: number,
): void {
  for (let x = 0; x < grid.cols; x++) {
    const yOffset = Math.round(Math.sin((x + phase) * frequency) * amplitude);
    const y = Math.max(0, Math.min(grid.rows - 1, baseY + yOffset));
    px(g, grid, x, y, color, 1, grid.rows - y);
  }
}

function starfield(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  rng: SeededRNG,
  count: number,
  palette: readonly number[],
): void {
  for (let i = 0; i < count; i++) {
    px(
      g,
      grid,
      rng.nextInt(0, grid.cols - 1),
      rng.nextInt(0, grid.rows - 1),
      palette[i % palette.length],
      1,
      1,
      rng.nextFloat(0.25, 0.85),
    );
  }
}

function drawFrame(g: Phaser.GameObjects.Graphics, grid: PixelGrid): void {
  const theme = getTheme();
  const outer = 0x070b14;
  const middle = theme.colors.panelBorder;
  const inner = 0x0c1327;

  px(g, grid, 0, 0, outer, grid.cols, grid.rows);
  px(g, grid, 1, 1, middle, grid.cols - 2, grid.rows - 2);
  px(g, grid, 2, 2, inner, grid.cols - 4, grid.rows - 4);
  px(g, grid, 2, 2, theme.colors.accent, grid.cols - 4, 1, 0.18);
  px(g, grid, 2, grid.rows - 3, theme.colors.accent, grid.cols - 4, 1, 0.18);
}

function renderTerranPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x13356a, 0x4aa3d9);

  horizontalBand(g, grid, 18, 1, 0.35, rng.nextFloat(0, 10), 0x3db46a);
  horizontalBand(g, grid, 22, 1, 0.28, rng.nextFloat(0, 10), 0x246c48);

  for (let i = 0; i < 5; i++) {
    const bx = rng.nextInt(4, 26);
    const bh = rng.nextInt(3, 8);
    px(g, grid, bx, 31 - bh, 0x12213c, 2, bh);
    if (rng.chance(0.5)) {
      px(g, grid, bx + 1, 31 - bh - 1, 0xeaf6ff);
    }
  }

  for (let i = 0; i < 6; i++) {
    px(
      g,
      grid,
      rng.nextInt(4, 27),
      rng.nextInt(6, 13),
      0xf7fcff,
      rng.nextInt(2, 4),
      1,
      0.18,
    );
  }
}

function renderMiningPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x26120b, 0x6a3421);
  horizontalBand(g, grid, 19, 2, 0.45, rng.nextFloat(0, 5), 0x4b2c1f);
  horizontalBand(g, grid, 23, 2, 0.34, rng.nextFloat(0, 5), 0x322017);

  for (let i = 0; i < 3; i++) {
    const x = 5 + i * 8 + rng.nextInt(-1, 1);
    px(g, grid, x, 18, 0x171113, 1, 9);
    px(g, grid, x - 1, 18, 0x171113, 3, 1);
    px(g, grid, x + 1, 16, 0xff7a39);
  }

  for (let i = 0; i < 3; i++) {
    px(
      g,
      grid,
      rng.nextInt(4, 27),
      rng.nextInt(21, 28),
      0xff6b2e,
      rng.nextInt(2, 4),
      1,
      0.7,
    );
  }
}

function renderAgriculturalPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x6f4f19, 0xa6cf53);
  horizontalBand(g, grid, 17, 1, 0.25, rng.nextFloat(0, 8), 0x87ba43);
  horizontalBand(g, grid, 21, 2, 0.2, rng.nextFloat(0, 8), 0x5d9534);

  for (let i = 0; i < 2; i++) {
    const x = 8 + i * 10;
    px(g, grid, x, 24, 0x4d2b17, 3, 5);
    px(g, grid, x - 1, 23, 0x7c5024, 5, 1);
  }

  for (let i = 0; i < 12; i++) {
    px(g, grid, rng.nextInt(3, 28), rng.nextInt(19, 29), 0xe8d86a, 1, 1, 0.8);
  }
}

function renderIndustrialPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x1a1f30, 0x4e5568);
  px(g, grid, 0, 22, 0x202430, grid.cols, 10);

  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 6 + rng.nextInt(-1, 1);
    const h = rng.nextInt(5, 9);
    px(g, grid, x, 31 - h, 0x121722, 4, h);
  }

  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 9 + rng.nextInt(-1, 1);
    px(g, grid, x, 16, 0x10141e, 1, 10);
    px(g, grid, x - 1, 14, 0x79839a, 3, 1, 0.35);
    px(g, grid, x, 13, 0xff8c4b, 1, 1, 0.8);
  }
}

function renderHubStationPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x03050a, 0x0a1433);
  starfield(g, grid, rng, 22, [0xf5f9ff, 0x8ce8ff]);
  ring(g, grid, 16, 16, 5, 0xb6d0e8, 0.85);
  ring(g, grid, 16, 16, 8, 0x5ee9da, 0.5);
  px(g, grid, 12, 15, 0x9fb7ca, 8, 2);
  px(g, grid, 15, 12, 0x9fb7ca, 2, 8);
  px(g, grid, 15, 15, 0xffffff, 2, 2);
}

function renderResortPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x1f5c89, 0x6fe0f2);
  px(g, grid, 0, 21, 0x12a2c2, grid.cols, 11);
  px(g, grid, 0, 24, 0x0b84a4, grid.cols, 8, 0.7);

  for (let i = 0; i < 3; i++) {
    const x = 7 + i * 7;
    circleFill(g, grid, x, 20, 2, 0xffb6e8, 0.9);
    px(g, grid, x - 2, 20, 0x5e2557, 5, 2, 0.8);
  }

  for (let i = 0; i < 10; i++) {
    px(
      g,
      grid,
      rng.nextInt(3, 28),
      rng.nextInt(18, 29),
      rng.chance(0.5) ? 0xffd66d : 0xff8ed0,
      1,
      1,
      0.8,
    );
  }
}

function renderResearchPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x150d33, 0x12304b);

  for (let i = 0; i < 4; i++) {
    px(g, grid, 0, 10 + i * 3, 0x67e8f9, grid.cols, 1, 0.15);
  }

  for (let i = 0; i < 3; i++) {
    const x = 8 + i * 8;
    px(g, grid, x, 21, 0x211634, 1, 8);
    px(g, grid, x - 2, 21, 0x211634, 5, 1);
    px(g, grid, x, 18, 0x67e8f9);
    px(g, grid, x - 1, 19, 0x67e8f9, 3, 1, 0.5);
  }

  for (let i = 0; i < 6; i++) {
    px(g, grid, rng.nextInt(5, 26), rng.nextInt(8, 16), 0xc18cff, 1, 1, 0.28);
  }
}

function renderShipPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  shipClass: ShipClass,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x03050a, 0x11182a);
  starfield(g, grid, rng, 14, [0xeef5ff, 0x7fdfff]);

  const accentMap: Record<ShipClass, number> = {
    cargoShuttle: 0x2de5d4,
    passengerShuttle: 0xf0ca68,
    mixedHauler: 0x7ed2ff,
    fastCourier: 0xff69c9,
    bulkFreighter: 0xff9b54,
    starLiner: 0x76f7ce,
    megaHauler: 0xe19a6b,
    luxuryLiner: 0xd9a7ff,
  };

  const accent = accentMap[shipClass];
  const body = 0x6f7d94;
  const dark = 0x475367;
  const light = 0xbcd2ec;
  const y = 16;

  switch (shipClass) {
    case "cargoShuttle":
      px(g, grid, 8, y - 2, body, 10, 4);
      px(g, grid, 18, y - 1, dark, 4, 2);
      px(g, grid, 6, y - 1, accent, 2, 2);
      break;
    case "passengerShuttle":
      px(g, grid, 7, y - 1, body, 13, 3);
      px(g, grid, 20, y, dark, 3, 1);
      px(g, grid, 11, y - 2, light, 5, 1, 0.7);
      px(g, grid, 5, y, accent, 2, 1);
      break;
    case "mixedHauler":
      px(g, grid, 8, y - 2, body, 12, 4);
      px(g, grid, 20, y - 1, dark, 3, 2);
      px(g, grid, 10, y - 4, dark, 3, 2);
      px(g, grid, 10, y + 2, dark, 3, 2);
      px(g, grid, 6, y, accent, 2, 1);
      break;
    case "fastCourier":
      px(g, grid, 10, y - 1, body, 10, 2);
      px(g, grid, 20, y - 2, dark, 3, 4);
      px(g, grid, 7, y - 3, dark, 3, 2);
      px(g, grid, 7, y + 1, dark, 3, 2);
      px(g, grid, 5, y, accent, 2, 1);
      break;
    case "bulkFreighter":
      px(g, grid, 6, y - 3, body, 16, 6);
      px(g, grid, 22, y - 2, dark, 3, 4);
      px(g, grid, 15, y - 5, dark, 4, 2);
      px(g, grid, 4, y - 1, accent, 2, 2);
      break;
    case "starLiner":
      px(g, grid, 6, y - 2, body, 16, 4);
      px(g, grid, 22, y - 1, dark, 3, 2);
      px(g, grid, 9, y - 4, dark, 4, 2);
      px(g, grid, 9, y + 2, dark, 4, 2);
      for (let x = 11; x <= 18; x += 2) {
        px(g, grid, x, y - 1, light);
      }
      px(g, grid, 4, y, accent, 2, 1);
      break;
    case "megaHauler":
      px(g, grid, 4, y - 4, body, 19, 8);
      px(g, grid, 23, y - 2, dark, 3, 4);
      px(g, grid, 7, y - 6, dark, 5, 2);
      px(g, grid, 7, y + 4, dark, 5, 2);
      px(g, grid, 2, y - 1, accent, 2, 2);
      break;
    case "luxuryLiner":
      px(g, grid, 5, y - 2, body, 17, 4);
      px(g, grid, 22, y - 1, dark, 3, 2);
      px(g, grid, 8, y - 5, dark, 4, 3);
      px(g, grid, 8, y + 2, dark, 4, 3);
      for (let x = 10; x <= 19; x += 2) {
        px(g, grid, x, y - 1, light, 1, 1, 0.8);
      }
      px(g, grid, 3, y, accent, 2, 1);
      break;
  }

  px(g, grid, 2, y, accent, 2, 1, 0.4);
  px(g, grid, 1, y, accent, 1, 1, 0.2);
}

function renderSystemPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  starColor: number,
  planetCount: number,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  drawFrame(g, grid);
  fillGradientV(g, grid, 0x020307, 0x071328);
  starfield(g, grid, rng, 20, [0xffffff, 0x8bdfff, 0xffd5a0]);
  circleFill(g, grid, 16, 16, 3, starColor, 1);
  circleFill(g, grid, 16, 16, 5, starColor, 0.22);

  for (let i = 0; i < planetCount; i++) {
    const radius = 6 + i * 3;
    ring(g, grid, 16, 16, radius, 0x6a7692, 0.35);
    const angle = rng.nextFloat(0, Math.PI * 2);
    px(
      g,
      grid,
      16 + Math.round(Math.cos(angle) * radius),
      16 + Math.round(Math.sin(angle) * radius),
      lerpColor(0x4d8de6, 0xf2c46b, rng.next()),
    );
  }
}

function renderEventPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  category: EventCategory,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  const palettes: Record<EventCategory, [number, number, number]> = {
    market: [0x0d2b1e, 0x143f28, 0x2de58c],
    hazard: [0x300d10, 0x48161a, 0xff6b3d],
    opportunity: [0x2c2408, 0x4b3d10, 0xffd36c],
    flavor: [0x1b1038, 0x2a1751, 0xb37dff],
    empire: [0x0d1b30, 0x162d4b, 0x3d9eff],
  };
  const [top, bottom, accent] = palettes[category];

  drawFrame(g, grid);
  fillGradientV(g, grid, top, bottom);

  if (category === "market") {
    for (let i = 0; i < 3; i++) {
      let x = 5;
      let y = 22 - i * 4;
      while (x < 27) {
        px(g, grid, x, y, accent, 1, 1, 0.7);
        px(g, grid, x + 1, y, accent, 1, 1, 0.45);
        x += 4;
        y += rng.nextInt(-2, 2);
      }
    }
  } else if (category === "hazard") {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const x = 16 + Math.round(Math.cos(angle) * rng.nextInt(4, 9));
      const y = 16 + Math.round(Math.sin(angle) * rng.nextInt(4, 9));
      px(g, grid, x, y, i % 2 === 0 ? 0xffb069 : accent, 2, 2, 0.85);
    }
    circleFill(g, grid, 16, 16, 3, 0xffd3a0, 0.8);
  } else if (category === "opportunity") {
    const points = [
      [16, 7],
      [18, 13],
      [24, 13],
      [19, 17],
      [21, 24],
      [16, 20],
      [11, 24],
      [13, 17],
      [8, 13],
      [14, 13],
    ];
    for (const [x, y] of points) {
      px(g, grid, x, y, accent, 2, 2, 0.9);
    }
  } else {
    for (let i = 0; i < 18; i++) {
      px(
        g,
        grid,
        8 + Math.floor(i / 2),
        10 + Math.round(Math.sin(i / 2) * 4),
        accent,
        1,
        1,
        0.7,
      );
      px(
        g,
        grid,
        16 + Math.round(Math.cos(i / 3) * 6),
        16 + Math.round(Math.sin(i / 3) * 6),
        0x6be7ff,
        1,
        1,
        0.4,
      );
    }
  }
}

function renderAlienPortrait(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  role: AlienRole,
  seed: number,
): void {
  const rng = new SeededRNG(seed);
  const schemes: Record<
    AlienRole,
    {
      bgTop: number;
      bgBottom: number;
      skin: number;
      dark: number;
      accent: number;
      eye: number;
    }
  > = {
    broker: {
      bgTop: 0x132143,
      bgBottom: 0x08111e,
      skin: 0x6be7ff,
      dark: 0x17475f,
      accent: 0xffd98a,
      eye: 0xdffcff,
    },
    miner: {
      bgTop: 0x2a1711,
      bgBottom: 0x0f0907,
      skin: 0x8b7d76,
      dark: 0x332722,
      accent: 0xff9656,
      eye: 0xffe0bf,
    },
    researcher: {
      bgTop: 0x201644,
      bgBottom: 0x09101f,
      skin: 0x9ad6ff,
      dark: 0x26316f,
      accent: 0xb57cff,
      eye: 0xffffff,
    },
    concierge: {
      bgTop: 0x173350,
      bgBottom: 0x09111b,
      skin: 0x74dccd,
      dark: 0x205564,
      accent: 0xff80d3,
      eye: 0xfff7ff,
    },
    enforcer: {
      bgTop: 0x14261a,
      bgBottom: 0x08100b,
      skin: 0x70b75c,
      dark: 0x274123,
      accent: 0xff6666,
      eye: 0xf1ffae,
    },
  };

  const scheme = schemes[role];
  drawFrame(g, grid);
  fillGradientV(g, grid, scheme.bgTop, scheme.bgBottom);
  ring(g, grid, 16, 14, 11, scheme.accent, 0.2);
  ring(g, grid, 16, 14, 8, 0x2de5d4, 0.2);

  px(g, grid, 8, 23, scheme.dark, 16, 7);
  px(g, grid, 11, 19, scheme.dark, 10, 5);
  px(g, grid, 12, 8, scheme.skin, 8, 10);
  px(g, grid, 11, 10, scheme.skin, 10, 6);
  px(g, grid, 10, 12, scheme.skin, 12, 4);
  px(g, grid, 12, 7, scheme.skin, 2, 1);
  px(g, grid, 18, 7, scheme.skin, 2, 1);

  if (role === "broker") {
    px(g, grid, 11, 6, scheme.accent, 3, 1);
    px(g, grid, 18, 6, scheme.accent, 3, 1);
    px(g, grid, 14, 4, scheme.accent, 4, 1);
  } else if (role === "miner") {
    px(g, grid, 10, 6, scheme.dark, 3, 2);
    px(g, grid, 19, 6, scheme.dark, 3, 2);
    px(g, grid, 13, 4, scheme.dark, 2, 2);
    px(g, grid, 17, 4, scheme.dark, 2, 2);
  } else if (role === "researcher") {
    px(g, grid, 13, 5, scheme.accent, 1, 2);
    px(g, grid, 18, 5, scheme.accent, 1, 2);
    ring(g, grid, 16, 21, 4, scheme.accent, 0.4);
  } else if (role === "concierge") {
    px(g, grid, 9, 8, scheme.accent, 2, 1);
    px(g, grid, 21, 8, scheme.accent, 2, 1);
    px(g, grid, 8, 9, scheme.accent, 1, 2);
    px(g, grid, 23, 9, scheme.accent, 1, 2);
  } else if (role === "enforcer") {
    px(g, grid, 10, 7, scheme.dark, 3, 2);
    px(g, grid, 19, 7, scheme.dark, 3, 2);
    px(g, grid, 12, 5, scheme.dark, 8, 1);
  }

  px(g, grid, 13, 11, 0x091018, 2, 2);
  px(g, grid, 18, 11, 0x091018, 2, 2);
  px(g, grid, 13, 11, scheme.eye, 1, 1, 0.9);
  px(g, grid, 19, 11, scheme.eye, 1, 1, 0.9);
  px(g, grid, 14, 14, scheme.dark, 4, 1);
  px(g, grid, 14, 16, scheme.dark, 4, 1, 0.7);
  px(g, grid, 14, 23, scheme.accent, 4, 1, 0.55);
  px(g, grid, 11 + rng.nextInt(0, 2), 18, scheme.accent, 1, 1, 0.35);
  px(g, grid, 19 - rng.nextInt(0, 2), 18, scheme.accent, 1, 1, 0.35);

  if (role === "broker") {
    px(g, grid, 12, 20, 0x0f1d2c, 8, 2);
  } else if (role === "miner") {
    px(g, grid, 11, 20, 0x1a1412, 10, 3);
  } else if (role === "researcher") {
    px(g, grid, 12, 20, 0x10173d, 8, 2);
  } else if (role === "concierge") {
    px(g, grid, 12, 20, 0x143544, 8, 2);
  } else {
    px(g, grid, 11, 20, 0x101b11, 10, 3);
  }
}

export function drawPortrait(
  graphics: Phaser.GameObjects.Graphics,
  type: PortraitType,
  width: number,
  height: number,
  seed: number,
  data?: PortraitData,
): void {
  graphics.clear();
  const grid = createPixelGrid(width, height);

  switch (type) {
    case "planet": {
      const planetType = data?.planetType ?? "terran";
      switch (planetType) {
        case "terran":
          renderTerranPortrait(graphics, grid, seed);
          break;
        case "mining":
          renderMiningPortrait(graphics, grid, seed);
          break;
        case "agricultural":
          renderAgriculturalPortrait(graphics, grid, seed);
          break;
        case "industrial":
          renderIndustrialPortrait(graphics, grid, seed);
          break;
        case "hubStation":
          renderHubStationPortrait(graphics, grid, seed);
          break;
        case "resort":
          renderResortPortrait(graphics, grid, seed);
          break;
        case "research":
          renderResearchPortrait(graphics, grid, seed);
          break;
      }
      break;
    }
    case "ship": {
      renderShipPortrait(
        graphics,
        grid,
        data?.shipClass ?? "cargoShuttle",
        seed,
      );
      break;
    }
    case "system": {
      renderSystemPortrait(
        graphics,
        grid,
        data?.starColor ?? 0xffcc44,
        data?.planetCount ?? 4,
        seed,
      );
      break;
    }
    case "event": {
      renderEventPortrait(
        graphics,
        grid,
        data?.eventCategory ?? "flavor",
        seed,
      );
      break;
    }
    case "alien": {
      renderAlienPortrait(graphics, grid, data?.alienRole ?? "broker", seed);
      break;
    }
  }
}

export function drawTerranPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderTerranPortrait(g, createPixelGrid(w, h), seed);
}

export function drawMiningPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderMiningPortrait(g, createPixelGrid(w, h), seed);
}

export function drawAgriculturalPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderAgriculturalPortrait(g, createPixelGrid(w, h), seed);
}

export function drawIndustrialPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderIndustrialPortrait(g, createPixelGrid(w, h), seed);
}

export function drawHubStationPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderHubStationPortrait(g, createPixelGrid(w, h), seed);
}

export function drawResortPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderResortPortrait(g, createPixelGrid(w, h), seed);
}

export function drawResearchPortrait(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  seed: number,
): void {
  renderResearchPortrait(g, createPixelGrid(w, h), seed);
}

export function drawShipPortrait(
  g: Phaser.GameObjects.Graphics,
  shipClass: ShipClass,
  w: number,
  h: number,
  seed: number,
): void {
  renderShipPortrait(g, createPixelGrid(w, h), shipClass, seed);
}

export function drawSystemPortrait(
  g: Phaser.GameObjects.Graphics,
  starColor: number,
  planetCount: number,
  w: number,
  h: number,
  seed: number,
): void {
  renderSystemPortrait(g, createPixelGrid(w, h), starColor, planetCount, seed);
}

export function drawEventPortrait(
  g: Phaser.GameObjects.Graphics,
  category: EventCategory,
  w: number,
  h: number,
  seed: number,
): void {
  renderEventPortrait(g, createPixelGrid(w, h), category, seed);
}

export function drawAlienPortrait(
  g: Phaser.GameObjects.Graphics,
  role: AlienRole,
  w: number,
  h: number,
  seed: number,
): void {
  renderAlienPortrait(g, createPixelGrid(w, h), role, seed);
}

export { fillGradientV, fillGradientH };
