#!/usr/bin/env node
/**
 * optimize-videos.mjs
 *
 * Re-encodes source MP4s in assets-source/video/ into web-optimized MP4s in
 * public/video/. Run with:
 *
 *   npm run optimize-videos
 *
 * Encoding choices (per file):
 *   -an                            strip audio — Phaser plays them muted
 *   -c:v libx264 -preset slow      good compression at moderate CPU cost
 *   -crf 26 -profile:v main        ~1.5-2 Mbps for 1080p ambient backdrop
 *   -pix_fmt yuv420p               max compatibility (Safari/iOS)
 *   -movflags +faststart           moov atom at front → playback starts on
 *                                  the first bytes downloaded (critical for
 *                                  boot backdrop)
 *   -vf scale=-2:'min(1080,ih)'    cap height at 1080, keep aspect, even dims
 *
 * Requires ffmpeg on PATH. Idempotent: skips files whose output is newer
 * than the source.
 */

import { spawn } from "node:child_process";
import { readdir, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const SRC_DIR = "assets-source/video";
const OUT_DIR = "public/video";
const EXTS = [".mp4", ".mov", ".m4v"];

const FFMPEG_ARGS = [
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  "26",
  "-profile:v",
  "main",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-vf",
  "scale=-2:'min(1080,ih)'",
];

function checkFfmpeg() {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const args = ["-y", "-i", input, ...FFMPEG_ARGS, output];
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderrTail = "";
    child.stderr.on("data", (buf) => {
      stderrTail = (stderrTail + buf.toString()).slice(-2000);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderrTail}`));
    });
  });
}

async function isUpToDate(src, out) {
  if (!existsSync(out)) return false;
  const [s, o] = await Promise.all([stat(src), stat(out)]);
  return o.mtimeMs >= s.mtimeMs;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  if (!(await checkFfmpeg())) {
    console.error(
      "ffmpeg not found on PATH. Install with `brew install ffmpeg` (mac) or your package manager.",
    );
    process.exit(1);
  }

  if (!existsSync(SRC_DIR)) {
    console.error(
      `Source directory ${SRC_DIR} does not exist. Drop original MP4s there and rerun.`,
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const entries = await readdir(SRC_DIR);
  const videos = entries.filter((f) => EXTS.includes(extname(f).toLowerCase()));

  if (videos.length === 0) {
    console.log(`No source videos in ${SRC_DIR}.`);
    return;
  }

  let processed = 0;
  let skipped = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const file of videos) {
    const src = join(SRC_DIR, file);
    const out = join(OUT_DIR, `${basename(file, extname(file))}.mp4`);

    if (await isUpToDate(src, out)) {
      skipped++;
      console.log(`  ⤿ skip   ${file} (output up to date)`);
      continue;
    }

    const srcSize = (await stat(src)).size;
    process.stdout.write(`  → encode ${file} (${fmtSize(srcSize)}) … `);
    const t0 = Date.now();
    try {
      await runFfmpeg(src, out);
      const outSize = (await stat(out)).size;
      const ratio = ((1 - outSize / srcSize) * 100).toFixed(0);
      const seconds = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`${fmtSize(outSize)} (-${ratio}%, ${seconds}s)`);
      processed++;
      totalIn += srcSize;
      totalOut += outSize;
    } catch (err) {
      console.log("FAILED");
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log(
    `\nDone. processed=${processed} skipped=${skipped} ` +
      `input=${fmtSize(totalIn)} output=${fmtSize(totalOut)}`,
  );
}

await main();
