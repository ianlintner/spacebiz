#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GENERATOR = `${process.env.HOME}/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py`;
const OUT_DIR = join(ROOT, "assets-source/ui-icons");
const PROMPTS_FILE = join(__dirname, "map-icon-prompts.json");

mkdirSync(OUT_DIR, { recursive: true });

const prompts = JSON.parse(readFileSync(PROMPTS_FILE, "utf8"));

for (let i = 0; i < prompts.length; i++) {
  const { id, prompt } = prompts[i];
  const outPath = join(OUT_DIR, `${id}.png`);
  console.log(`Generating ${i + 1} of ${prompts.length}: ${id}…`);
  const provider = process.env.PIXEL_ART_PROVIDER ?? "fal";
  execSync(
    `python3 "${GENERATOR}" --prompt "${prompt}" --size 32 --transparent-bg --palette db16 --provider ${provider} --output "${outPath}"`,
    { stdio: "inherit" },
  );
}

console.log(
  `Done — ${prompts.length} icons written to assets-source/ui-icons/`,
);
