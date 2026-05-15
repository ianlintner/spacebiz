#!/usr/bin/env node
/**
 * Generates public/planets/ring.png — a 128×64 transparent PNG containing
 * a full ring ellipse. The top 32 rows hold the front arc (rendered over
 * the planet); the bottom 32 rows hold the back arc (rendered behind).
 *
 *   node scripts/generate-planet-ring.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "fs";

const W = 128,
  H = 64;
const cx = W / 2,
  cy = H / 2; // ring ellipse center

// Outer and inner ellipse radii for the ring band
const outerRx = 58,
  outerRy = 16;
const innerRx = 40,
  innerRy = 10;
// Cassini-division gap (dark band inside the ring)
const cassRx = 51,
  cassRy = 14;
const cassInnerRx = 48,
  cassInnerRy = 12;

const pixels = Buffer.alloc(W * H * 4, 0); // RGBA all-transparent

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const outerD = (dx / outerRx) ** 2 + (dy / outerRy) ** 2;
    const innerD = (dx / innerRx) ** 2 + (dy / innerRy) ** 2;

    if (outerD > 1.0 || innerD < 1.0) continue; // outside ring band

    const cassOuter = (dx / cassRx) ** 2 + (dy / cassRy) ** 2;
    const cassInner = (dx / cassInnerRx) ** 2 + (dy / cassInnerRy) ** 2;
    const inCassini = cassOuter <= 1.0 && cassInner >= 1.0;

    // Fade alpha at outer and inner edges for soft appearance
    const outerFade = Math.max(0, Math.min(1, (1.0 - outerD) / 0.12));
    const innerFade = Math.max(0, Math.min(1, (innerD - 1.0) / 0.12));
    const edgeFade = Math.min(outerFade, innerFade);

    const baseAlpha = inCassini ? 25 : 185;
    const alpha = Math.round(baseAlpha * edgeFade);
    if (alpha === 0) continue;

    const i = (y * W + x) * 4;
    pixels[i] = 212; // R — dusty amber
    pixels[i + 1] = 168; // G
    pixels[i + 2] = 122; // B
    pixels[i + 3] = alpha;
  }
}

mkdirSync("public/planets", { recursive: true });
await sharp(pixels, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile("public/planets/ring.png");

console.log("✓ public/planets/ring.png");
