#!/usr/bin/env node
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROMPTS_FILE = join(__dirname, "map-icon-prompts.json");
const SRC_DIR = join(ROOT, "assets-source/ui-icons");
const OUT_FILE = join(ROOT, "public/ui-icons-24.png");

const CELL = 24;
const COLS = 4;

const prompts = JSON.parse(readFileSync(PROMPTS_FILE, "utf8"));
const ids = prompts.map((p) => p.id);
const ROWS = Math.ceil(ids.length / COLS);

const composites = [];

for (let i = 0; i < ids.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const srcPath = join(SRC_DIR, `${ids[i]}.png`);

  // Resize to 24×24, then normalize to white-on-transparent for Phaser setTint().
  const { data, info } = await sharp(srcPath)
    .resize(CELL, CELL, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert every non-transparent pixel to white.
  for (let px = 0; px < info.width * info.height; px++) {
    const off = px * 4;
    if (data[off + 3] > 0) {
      data[off] = 255;
      data[off + 1] = 255;
      data[off + 2] = 255;
    }
  }

  const pngBuf = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  composites.push({ input: pngBuf, top: row * CELL, left: col * CELL });
}

await sharp({
  create: {
    width: COLS * CELL,
    height: ROWS * CELL,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(OUT_FILE);

console.log(
  `Packed ${ids.length} icons → ${OUT_FILE} (${COLS * CELL}×${ROWS * CELL} px)`,
);
