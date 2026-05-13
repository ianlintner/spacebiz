#!/usr/bin/env node
/**
 * generate-dialogue-sfx — author-side, one-time (per prompt change).
 *
 * Reads `public/audio/dialogue/manifest.json` and uses the Google Gemini API
 * to synthesize a short SFX for each entry. Writes the result as
 * `public/audio/dialogue/<key>.ogg` (or .wav fallback).
 *
 * Usage:
 *   export GEMINI_API_KEY=...
 *   node scripts/generate-dialogue-sfx.mjs        # generate missing only
 *   node scripts/generate-dialogue-sfx.mjs --all  # regenerate all
 *
 * Idempotent: skips entries whose output file already exists unless --all
 * is passed. The generated audio is small (<60KB each) and is committed to
 * the repo so players don't depend on the API at runtime.
 *
 * NOTE: Gemini's audio output API surface evolves. This script targets the
 * `gemini-2.5-flash-preview-tts` model via the @google/genai SDK. If the
 * SDK / model changes, update `synthesize()` below. The AudioDirector
 * gracefully falls back to a synthesized chime when files are missing, so
 * a stale script doesn't break the game.
 */

import { readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(
  REPO_ROOT,
  "public",
  "audio",
  "dialogue",
  "manifest.json",
);
const OUTPUT_DIR = join(REPO_ROOT, "public", "audio", "dialogue");

const FORCE_ALL = process.argv.includes("--all");

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest() {
  const raw = await readFile(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * Call the Gemini API to generate audio for a single prompt. Returns the
 * raw audio bytes (OGG/Opus by default).
 *
 * The Gemini native-audio surface is documented at:
 *   https://ai.google.dev/gemini-api/docs/audio
 *
 * For pure SFX generation (no speech), the most reliable path right now is
 * to ask the model for a "sound effect description" via a creative TTS
 * prompt, then post-process. If your environment has access to a more
 * direct audio-out endpoint, replace this implementation.
 */
async function synthesize(prompt, style) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Export it before running this script.",
    );
  }

  // Dynamic import so the script can be invoked without the dep installed
  // (it will just throw a clearer error).
  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import("@google/genai"));
  } catch {
    throw new Error(
      "The @google/genai SDK is not installed. Run: npm i -D @google/genai",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Combine style + prompt — keeps every clip in the same sonic palette.
  const fullPrompt = `Generate a short audio sound effect.\n\nGlobal style: ${style}\n\nSpecific cue: ${prompt}`;

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
    },
  });

  const audioPart = resp.candidates?.[0]?.content?.parts?.find((p) =>
    p.inlineData?.mimeType?.startsWith("audio/"),
  );
  if (!audioPart) {
    throw new Error("Gemini response contained no audio part.");
  }

  // inlineData.data is base64-encoded audio bytes.
  return Buffer.from(audioPart.inlineData.data, "base64");
}

async function main() {
  const manifest = await loadManifest();
  const { style, sfx } = manifest;

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of sfx) {
    const outPath = join(OUTPUT_DIR, `${entry.key}.ogg`);
    if (!FORCE_ALL && (await fileExists(outPath))) {
      skipped++;
      continue;
    }

    process.stdout.write(`→ ${entry.key}… `);
    try {
      const bytes = await synthesize(entry.prompt, style);
      await writeFile(outPath, bytes);
      console.log(`ok (${bytes.length} bytes)`);
      generated++;
    } catch (err) {
      console.log(`failed: ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\nDone. generated=${generated} skipped=${skipped} failed=${failed}`,
  );

  if (failed > 0) {
    console.log(
      "\nFailed clips will fall back to a synthesized confirm at runtime.\n" +
        "Re-run with GEMINI_API_KEY set, or hand-author the missing files.",
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
