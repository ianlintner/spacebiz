#!/usr/bin/env node
/**
 * generate-dialogue-sfx-synth — baseline synthesized SFX so the dialogue
 * system works out-of-the-box without depending on the Gemini API.
 *
 * Writes 12 short mono WAVs under `public/audio/dialogue/<key>.ogg` (yes,
 * with .ogg extension — browsers happily decode WAV from any extension via
 * AudioContext.decodeAudioData). These are intentionally simple parametric
 * synth tones; they're meant as a placeholder until somebody runs the
 * higher-quality Gemini-backed `npm run generate-dialogue-sfx`.
 *
 * Idempotent: skips files that already exist unless --all is passed.
 */

import { writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "audio", "dialogue");

const SR = 22050; // sample rate
const FORCE_ALL = process.argv.includes("--all");

// ---------------------------------------------------------------------------
// Tiny DSP primitives — all return Float32Array PCM in [-1, 1]
// ---------------------------------------------------------------------------

function silence(durMs) {
  return new Float32Array(Math.floor((durMs / 1000) * SR));
}

function mix(...buffers) {
  const maxLen = Math.max(...buffers.map((b) => b.length));
  const out = new Float32Array(maxLen);
  for (const b of buffers) {
    for (let i = 0; i < b.length; i++) out[i] += b[i];
  }
  // Normalize peak to 0.9 to avoid clipping
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  if (peak > 0.9) {
    const k = 0.9 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= k;
  }
  return out;
}

function tone({
  freq,
  durMs,
  type = "sine",
  attackMs = 8,
  releaseMs = 80,
  gain = 0.5,
  freqEnd,
}) {
  const n = Math.floor((durMs / 1000) * SR);
  const out = new Float32Array(n);
  const aSamp = Math.floor((attackMs / 1000) * SR);
  const rSamp = Math.floor((releaseMs / 1000) * SR);
  let phase = 0;
  const fStart = freq;
  const fEnd = freqEnd ?? freq;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = fStart * Math.pow(fEnd / fStart, t);
    phase += (2 * Math.PI * f) / SR;
    let s;
    switch (type) {
      case "square":
        s = Math.sign(Math.sin(phase));
        break;
      case "saw":
        s = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        break;
      case "triangle":
        s = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
        break;
      case "sine":
      default:
        s = Math.sin(phase);
    }
    // Envelope
    let env = 1;
    if (i < aSamp) env = i / aSamp;
    else if (i > n - rSamp) env = Math.max(0, (n - i) / rSamp);
    out[i] = s * env * gain;
  }
  return out;
}

function noise({
  durMs,
  color = "white",
  gain = 0.3,
  attackMs = 4,
  releaseMs = 120,
}) {
  const n = Math.floor((durMs / 1000) * SR);
  const out = new Float32Array(n);
  const aSamp = Math.floor((attackMs / 1000) * SR);
  const rSamp = Math.floor((releaseMs / 1000) * SR);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let s = Math.random() * 2 - 1;
    if (color === "pink") {
      s = (prev + s * 0.3) / 1.3;
      prev = s;
    } else if (color === "brown") {
      s = (prev + s * 0.05) / 1.05;
      prev = s;
    }
    let env = 1;
    if (i < aSamp) env = i / aSamp;
    else if (i > n - rSamp) env = Math.max(0, (n - i) / rSamp);
    out[i] = s * env * gain;
  }
  return out;
}

function delayed(buf, delayMs) {
  const offset = Math.floor((delayMs / 1000) * SR);
  const out = new Float32Array(buf.length + offset);
  for (let i = 0; i < buf.length; i++) out[i + offset] = buf[i];
  return out;
}

function concat(...buffers) {
  const len = buffers.reduce((a, b) => a + b.length, 0);
  const out = new Float32Array(len);
  let p = 0;
  for (const b of buffers) {
    out.set(b, p);
    p += b.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 12 recipes
// ---------------------------------------------------------------------------

const RECIPES = {
  dialogue_open_standard: () =>
    mix(
      tone({
        freq: 660,
        durMs: 500,
        type: "sine",
        attackMs: 8,
        releaseMs: 350,
        gain: 0.45,
      }),
      tone({
        freq: 1320,
        durMs: 500,
        type: "sine",
        attackMs: 20,
        releaseMs: 300,
        gain: 0.18,
      }),
    ),

  dialogue_open_news: () =>
    concat(
      tone({
        freq: 660,
        durMs: 180,
        type: "triangle",
        attackMs: 4,
        releaseMs: 100,
        gain: 0.5,
      }),
      tone({
        freq: 523,
        durMs: 180,
        type: "triangle",
        attackMs: 4,
        releaseMs: 100,
        gain: 0.5,
      }),
      tone({
        freq: 440,
        durMs: 320,
        type: "triangle",
        attackMs: 4,
        releaseMs: 200,
        gain: 0.5,
      }),
    ),

  dialogue_open_alert: () =>
    mix(
      tone({
        freq: 440,
        freqEnd: 520,
        durMs: 220,
        type: "square",
        attackMs: 4,
        releaseMs: 60,
        gain: 0.4,
      }),
      delayed(
        tone({
          freq: 440,
          freqEnd: 520,
          durMs: 220,
          type: "square",
          attackMs: 4,
          releaseMs: 60,
          gain: 0.4,
        }),
        260,
      ),
    ),

  dialogue_open_memo: () =>
    concat(
      noise({
        durMs: 220,
        color: "brown",
        gain: 0.18,
        attackMs: 6,
        releaseMs: 140,
      }),
      tone({
        freq: 220,
        durMs: 480,
        type: "sine",
        attackMs: 12,
        releaseMs: 280,
        gain: 0.42,
      }),
    ),

  result_positive_operational: () =>
    concat(
      noise({
        durMs: 60,
        color: "white",
        gain: 0.18,
        attackMs: 2,
        releaseMs: 30,
      }),
      mix(
        tone({
          freq: 523,
          durMs: 250,
          type: "sine",
          attackMs: 4,
          releaseMs: 180,
          gain: 0.5,
        }),
        delayed(
          tone({
            freq: 784,
            durMs: 350,
            type: "sine",
            attackMs: 4,
            releaseMs: 220,
            gain: 0.45,
          }),
          120,
        ),
      ),
    ),

  result_positive_diplomatic: () =>
    mix(
      tone({
        freq: 523,
        durMs: 800,
        type: "sine",
        attackMs: 20,
        releaseMs: 500,
        gain: 0.4,
      }),
      tone({
        freq: 659,
        durMs: 800,
        type: "sine",
        attackMs: 20,
        releaseMs: 500,
        gain: 0.35,
      }),
      tone({
        freq: 784,
        durMs: 800,
        type: "sine",
        attackMs: 20,
        releaseMs: 500,
        gain: 0.3,
      }),
    ),

  result_positive_financial: () =>
    concat(
      tone({
        freq: 880,
        durMs: 120,
        type: "triangle",
        attackMs: 2,
        releaseMs: 80,
        gain: 0.55,
      }),
      tone({
        freq: 1175,
        durMs: 120,
        type: "triangle",
        attackMs: 2,
        releaseMs: 80,
        gain: 0.55,
      }),
      tone({
        freq: 1760,
        durMs: 250,
        type: "triangle",
        attackMs: 2,
        releaseMs: 200,
        gain: 0.5,
      }),
    ),

  result_positive_narrative: () =>
    mix(
      tone({
        freq: 880,
        durMs: 900,
        type: "sine",
        attackMs: 30,
        releaseMs: 600,
        gain: 0.45,
      }),
      tone({
        freq: 1320,
        durMs: 900,
        type: "sine",
        attackMs: 50,
        releaseMs: 600,
        gain: 0.18,
      }),
    ),

  result_negative_operational: () =>
    concat(
      noise({
        durMs: 250,
        color: "pink",
        gain: 0.35,
        attackMs: 4,
        releaseMs: 100,
      }),
      tone({
        freq: 60,
        durMs: 350,
        type: "sine",
        attackMs: 4,
        releaseMs: 280,
        gain: 0.55,
      }),
    ),

  result_negative_diplomatic: () =>
    mix(
      tone({
        freq: 523,
        durMs: 650,
        type: "saw",
        attackMs: 10,
        releaseMs: 400,
        gain: 0.3,
      }),
      tone({
        freq: 554,
        durMs: 650,
        type: "saw",
        attackMs: 10,
        releaseMs: 400,
        gain: 0.3,
      }),
    ),

  result_negative_financial: () =>
    tone({
      freq: 523,
      freqEnd: 220,
      durMs: 600,
      type: "square",
      attackMs: 2,
      releaseMs: 380,
      gain: 0.35,
    }),

  result_negative_narrative: () =>
    concat(
      tone({
        freq: 349,
        durMs: 500,
        type: "sine",
        attackMs: 30,
        releaseMs: 350,
        gain: 0.4,
      }),
      tone({
        freq: 294,
        durMs: 600,
        type: "sine",
        attackMs: 30,
        releaseMs: 450,
        gain: 0.4,
      }),
    ),
};

// ---------------------------------------------------------------------------
// WAV writer (16-bit PCM mono)
// ---------------------------------------------------------------------------

function writeWav(samples) {
  const len = samples.length;
  const buf = Buffer.alloc(44 + len * 2);
  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + len * 2, 4);
  buf.write("WAVE", 8);
  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24); // sample rate
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(len * 2, 40);
  let offset = 44;
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), offset);
    offset += 2;
  }
  return buf;
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let generated = 0;
  let skipped = 0;
  for (const [key, recipe] of Object.entries(RECIPES)) {
    const outPath = join(OUTPUT_DIR, `${key}.ogg`);
    if (!FORCE_ALL && (await fileExists(outPath))) {
      skipped++;
      continue;
    }
    const samples = recipe();
    const bytes = writeWav(samples);
    await writeFile(outPath, bytes);
    console.log(
      `✓ ${key}.ogg  (${bytes.length} bytes, ${samples.length} samples)`,
    );
    generated++;
  }
  console.log(`\nDone. generated=${generated} skipped=${skipped}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
