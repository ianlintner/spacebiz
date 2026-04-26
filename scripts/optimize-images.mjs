#!/usr/bin/env node
/**
 * optimize-images.mjs
 *
 * Converts source images in assets-source/ to optimized WebP + compressed PNG
 * in public/ at 512x512 max (no upscaling). Run with:
 *
 *   npm run optimize-assets
 *
 * Source layout:   assets-source/portraits/**\/*.png
 *                  assets-source/concepts/hero/*.{jpg,png}
 * Output layout:   public/portraits/**\/*.webp   (primary, ~80 KB each)
 *                  public/portraits/**\/*.png    (fallback, palette-compressed)
 *                  public/concepts/hero/*.webp
 *                  public/concepts/hero/*.jpg    (kept as-is for JPEG hero fallback)
 *
 * Idempotent: skips files where output is newer than source.
 */

import sharp from "sharp";
import { readdir, stat, mkdir } from "node:fs/promises";
import { join, dirname, extname, basename } from "node:path";
import { existsSync } from "node:fs";

const MAX_DIM = 512;
const WEBP_QUALITY = 82;
const PNG_COMPRESSION = 9;
const PNG_PALETTE_COLORS = 256;

// Source → output directory mappings
const TASKS = [
  {
    src: "assets-source/portraits",
    out: "public/portraits",
    exts: [".png"],
  },
  {
    src: "assets-source/concepts/hero",
    out: "public/concepts/hero",
    exts: [".jpg", ".jpeg", ".png"],
  },
  // Ship map sprites: pixel art — preserve exact pixels, no resize, lossless PNG only
  {
    src: "assets-source/ships/map",
    out: "public/ships/map",
    exts: [".png"],
    pixelArt: true,
  },
  // Ship portraits: larger pixel art — resize with nearest-neighbor, WebP + PNG
  {
    src: "assets-source/ships/portraits",
    out: "public/ships/portraits",
    exts: [".png"],
    pixelArt: true,
  },
];

/** Recursively collect files with given extensions. */
async function collectFiles(dir, exts) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, exts)));
    } else if (exts.includes(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

/** Return true if outPath doesn't exist or srcPath is newer. */
async function needsUpdate(srcPath, outPath) {
  if (!existsSync(outPath)) return true;
  const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)]);
  return srcStat.mtimeMs > outStat.mtimeMs;
}

/** Format bytes as human-readable string. */
function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

async function processFile(srcPath, srcBase, outBase, pixelArt = false) {
  // Compute output path (mirror directory structure)
  const relative = srcPath.slice(srcBase.length + 1);
  const ext = extname(relative).toLowerCase();
  const stem = relative.slice(0, -ext.length);

  const webpOut = join(outBase, stem + ".webp");
  const pngOut = join(outBase, stem + ".png");

  // Pixel-art assets: lossless PNG only (no WebP — lossy destroys hard edges)
  const [needsWebp, needsPng] = await Promise.all([
    pixelArt ? Promise.resolve(false) : needsUpdate(srcPath, webpOut),
    needsUpdate(srcPath, pngOut),
  ]);

  if (!needsWebp && !needsPng) {
    return { skipped: true, srcPath };
  }

  // Ensure output directory exists
  await mkdir(dirname(pngOut), { recursive: true });

  const srcStatObj = await stat(srcPath);
  const srcSize = srcStatObj.size;

  // Pixel-art pipeline: nearest-neighbor resize (no smoothing), lossless PNG
  let pipeline;
  if (pixelArt) {
    pipeline = sharp(srcPath).resize(MAX_DIM, MAX_DIM, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "nearest",
    });
  } else {
    pipeline = sharp(srcPath).resize(MAX_DIM, MAX_DIM, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const results = [];

  if (needsWebp) {
    const webpBuf = await pipeline
      .clone()
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(webpOut);
    results.push({ format: "webp", size: webpBuf.size, path: webpOut });
  }

  if (needsPng) {
    const pngBuf = await pipeline
      .clone()
      .png({
        compressionLevel: PNG_COMPRESSION,
        // Pixel-art: no palette quantization — keep exact color indices
        palette: !pixelArt,
        colors: pixelArt ? undefined : PNG_PALETTE_COLORS,
        dither: pixelArt ? undefined : 1.0,
      })
      .toFile(pngOut);
    results.push({ format: "png", size: pngBuf.size, path: pngOut });
  }

  return { skipped: false, srcPath, srcSize, results };
}

async function run() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Star Freight Tycoon — Asset Optimizer      ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  let totalSrcBytes = 0;
  let totalOutBytes = 0;
  let totalFiles = 0;
  let skippedFiles = 0;

  for (const task of TASKS) {
    if (!existsSync(task.src)) {
      console.warn(`⚠  Source dir not found, skipping: ${task.src}`);
      continue;
    }

    const files = await collectFiles(task.src, task.exts);
    console.log(`📁 ${task.src}  (${files.length} files → ${task.out})`);

    for (const srcPath of files) {
      const result = await processFile(
        srcPath,
        task.src,
        task.out,
        task.pixelArt ?? false,
      );

      if (result.skipped) {
        skippedFiles++;
        process.stdout.write("·");
        continue;
      }

      totalFiles++;
      totalSrcBytes += result.srcSize;

      for (const r of result.results) {
        totalOutBytes += r.size;
        const pct = Math.round((1 - r.size / result.srcSize) * 100);
        const srcName = basename(srcPath);
        const outName = basename(r.path);
        console.log(
          `  ✓ ${srcName} → ${outName}  ${fmtBytes(result.srcSize)} → ${fmtBytes(r.size)}  (-${pct}%)`,
        );
      }
    }
    console.log();
  }

  console.log("──────────────────────────────────────────────");
  if (totalFiles > 0) {
    const totalPct = Math.round((1 - totalOutBytes / totalSrcBytes) * 100);
    console.log(`  Processed : ${totalFiles} files`);
    console.log(`  Source    : ${fmtBytes(totalSrcBytes)}`);
    console.log(`  Output    : ${fmtBytes(totalOutBytes)}`);
    console.log(`  Savings   : -${totalPct}%`);
  }
  if (skippedFiles > 0) {
    console.log(`  Skipped   : ${skippedFiles} (already up-to-date)`);
  }
  console.log("──────────────────────────────────────────────");
  console.log(
    "\nDone. Commit public/portraits/**/*.webp and public/portraits/**/*.png",
  );
}

run().catch((err) => {
  console.error("optimize-images failed:", err);
  process.exit(1);
});
