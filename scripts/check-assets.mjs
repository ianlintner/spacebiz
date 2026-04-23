#!/usr/bin/env node
/**
 * check-assets.mjs
 *
 * CI guard: verifies that every PNG in public/portraits/ and
 * public/concepts/hero/ has a sibling .webp file. Fails with a non-zero
 * exit code if any WebP is missing, reminding developers to run
 * `npm run optimize-assets` and commit the output.
 *
 * Usage: node scripts/check-assets.mjs
 */

import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { existsSync } from "node:fs";

const CHECK_DIRS = ["public/portraits", "public/concepts/hero"];

async function collectPngs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectPngs(full)));
    } else if (extname(entry.name).toLowerCase() === ".png") {
      files.push(full);
    }
  }
  return files;
}

async function run() {
  let missing = 0;

  for (const dir of CHECK_DIRS) {
    const pngs = await collectPngs(dir);
    for (const pngPath of pngs) {
      const webpPath = pngPath.replace(/\.png$/i, ".webp");
      if (!existsSync(webpPath)) {
        console.error(`  ✗ Missing WebP: ${webpPath}`);
        missing++;
      }
    }
  }

  if (missing > 0) {
    console.error(
      `\ncheck-assets: ${missing} WebP file(s) missing.\n` +
        `Run \`npm run optimize-assets\` and commit the generated files.\n`,
    );
    process.exit(1);
  } else {
    console.log(`check-assets: all portrait WebP files present. ✓`);
  }
}

run().catch((err) => {
  console.error("check-assets failed:", err);
  process.exit(1);
});
