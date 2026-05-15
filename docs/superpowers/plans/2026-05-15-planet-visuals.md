# Planet Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat gradient planet discs with authored pixel-art sprites (one per biome), per-planet procedural tint variation, cosine rotation pulse, and depth-split rings for gas giants.

**Architecture:** Pure functions in a new `PlanetVariation.ts` derive deterministic per-planet appearance from `planet.id` (FNV-1a hash → SeededRNG). `Planets2D.ts` gains up to three sprites per planet (base + optional ring back/front) and applies the tint cycle each frame. No data model changes.

**Tech Stack:** TypeScript (strict), Phaser 4, sharp (ring PNG generation), AI pixel art generator at `~/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py`, Vitest 4.

---

### Task 1: Generate ring overlay PNG

**Files:**

- Create: `scripts/generate-planet-ring.mjs`
- Create: `public/planets/ring.png` (generated output)

- [ ] **Step 1: Create the ring generation script**

Create `scripts/generate-planet-ring.mjs`:

```js
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
```

- [ ] **Step 2: Run the script from the project root**

```bash
node scripts/generate-planet-ring.mjs
```

Expected output:

```
✓ public/planets/ring.png
```

Verify it exists:

```bash
ls -lh public/planets/ring.png
```

Expected: a file ~2–6 KB.

---

### Task 2: Generate 21 biome planet sprites

**Files:**

- Create: `scripts/generate-planet-sprites.mjs`
- Create: `public/planets/<biome>.png` × 21 (generated output)

- [ ] **Step 1: Create the sprite generation script**

Create `scripts/generate-planet-sprites.mjs`:

```js
#!/usr/bin/env node
/**
 * Generates one 64×64 pixel-art planet PNG per PlanetBiome.
 * Outputs to public/planets/<biome>.png.
 *
 *   node scripts/generate-planet-sprites.mjs
 *
 * Requires: ~/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py
 * Auth: OPENAI_API_KEY or Azure via AZURE_OPENAI_ENDPOINT + az login
 */
import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";

const GENERATOR = `${homedir()}/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py`;
const OUT_DIR = "public/planets";

mkdirSync(OUT_DIR, { recursive: true });

const BIOMES = [
  {
    key: "breadbasket",
    prompt:
      "round planet disc, lush green continents, wispy white cloud bands, warm blue ocean, viewed from space, pixel art planet sprite",
  },
  {
    key: "subsistence",
    prompt:
      "round planet disc, patchy brown and pale green terrain, dry scrubland world, sparse vegetation, viewed from space, pixel art planet sprite",
  },
  {
    key: "aquaculture",
    prompt:
      "round planet disc, deep ocean blue, small grey island clusters, aquatic world, viewed from space, pixel art planet sprite",
  },
  {
    key: "coreExtraction",
    prompt:
      "round planet disc, cratered orange-grey surface, ochre dust patches, barren mining world, no atmosphere, viewed from space, pixel art planet sprite",
  },
  {
    key: "gasGiantSkim",
    prompt:
      "round planet disc, banded gas giant, amber and cream horizontal stripes, large storm eye spot, no solid surface, viewed from space, pixel art planet sprite",
  },
  {
    key: "asteroidBelt",
    prompt:
      "round planet disc, heavily cratered grey rocky surface, sharp crater shadows, barren airless world, viewed from space, pixel art planet sprite",
  },
  {
    key: "researchCluster",
    prompt:
      "round planet disc, dark surface covered in glowing city-light grid, night-side illuminated tech world, viewed from space, pixel art planet sprite",
  },
  {
    key: "dataHaven",
    prompt:
      "round planet disc, cool blue-grey surface, geometric circuit-light lattice patterns, data world, viewed from space, pixel art planet sprite",
  },
  {
    key: "forgeAcademy",
    prompt:
      "round planet disc, industrial purple-brown surface, glowing orange magma veins, volcanic forge world, viewed from space, pixel art planet sprite",
  },
  {
    key: "heavyIndustry",
    prompt:
      "round planet disc, smog-brown surface, haze-covered industrial world, pollution haze atmosphere, viewed from space, pixel art planet sprite",
  },
  {
    key: "precisionFab",
    prompt:
      "round planet disc, steel grey metallic surface, specular highlights, orbital structure silhouette hints, precision world, viewed from space, pixel art planet sprite",
  },
  {
    key: "shipyards",
    prompt:
      "round planet disc, teal-grey surface, orbital scaffolding ring pattern painted on surface, shipyard world, viewed from space, pixel art planet sprite",
  },
  {
    key: "resort",
    prompt:
      "round planet disc, azure ocean world, white-sand equatorial belt, tropical paradise, viewed from space, pixel art planet sprite",
  },
  {
    key: "artisanGuild",
    prompt:
      "round planet disc, rich amber and scarlet surface, ornate cultural patterns, luxury world, viewed from space, pixel art planet sprite",
  },
  {
    key: "spiceJungle",
    prompt:
      "round planet disc, dense yellow-green jungle canopy, exotic amber atmospheric haze, jungle world, viewed from space, pixel art planet sprite",
  },
  {
    key: "capital",
    prompt:
      "round planet disc, Earth-like blue ocean and green continents, visible night-side city lights at terminator, capital world, viewed from space, pixel art planet sprite",
  },
  {
    key: "metropolitan",
    prompt:
      "round planet disc, blue-grey surface, dense continent outlines, city-light bleed at terminator edge, metropolitan world, viewed from space, pixel art planet sprite",
  },
  {
    key: "adminHub",
    prompt:
      "round planet disc, clean banded blue-white surface, minimalist geometric bands, administrative world, viewed from space, pixel art planet sprite",
  },
  {
    key: "colony",
    prompt:
      "round planet disc, rugged tan terrain, sparse settlement footprint lights, frontier colony world, viewed from space, pixel art planet sprite",
  },
  {
    key: "outpost",
    prompt:
      "round planet disc, dusty pale grey surface, crater-pocked barren world, sparse outpost, viewed from space, pixel art planet sprite",
  },
  {
    key: "refuge",
    prompt:
      "round planet disc, icy white-blue surface, heavy polar ice cap coverage, frozen refuge world, viewed from space, pixel art planet sprite",
  },
];

let generated = 0;
let skipped = 0;

for (const { key, prompt } of BIOMES) {
  const outPath = `${OUT_DIR}/${key}.png`;
  if (existsSync(outPath)) {
    console.log(`  skip ${key} (already exists)`);
    skipped++;
    continue;
  }
  console.log(`  gen  ${key}…`);
  execSync(
    `python3 "${GENERATOR}" --prompt "${prompt}" --size 64 --transparent-bg --palette aap64 --style modern-indie --output "${outPath}"`,
    { stdio: "inherit" },
  );
  generated++;
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped.`);
```

- [ ] **Step 2: Run the generation script**

```bash
node scripts/generate-planet-sprites.mjs
```

Expected: Python outputs per-sprite progress. Each biome file lands in `public/planets/`. The script skips any already-existing files.

- [ ] **Step 3: Verify all 21 files were created**

```bash
ls public/planets/*.png | wc -l
```

Expected output: `22` (21 biomes + ring.png from Task 1).

---

### Task 3: Commit generated assets

**Files:**

- Modify: `public/planets/` (22 new PNG files)

- [ ] **Step 1: Stage and commit**

```bash
git add public/planets/
git commit -m "assets: 21 biome planet sprites + ring overlay PNG"
```

---

### Task 4: Write failing unit tests for PlanetVariation

**Files:**

- Create: `src/scenes/galaxy2d/__tests__/PlanetVariation.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/scenes/galaxy2d/__tests__/PlanetVariation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  derivePlanetVariation,
  isRinged,
  multiplyBrightness,
} from "../PlanetVariation.ts";
import type { Planet } from "../../../data/types.ts";
import { PlanetBiome, PlanetType } from "../../../data/types.ts";

function makePlanet(id: string, biome: PlanetBiome): Planet {
  return {
    id,
    name: "Test",
    systemId: "sys1",
    type: PlanetType.Mining,
    x: 0,
    y: 0,
    population: 1000,
    biome,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 5000,
  };
}

describe("derivePlanetVariation", () => {
  it("is deterministic — same id yields same variation", () => {
    const p = makePlanet("planet-abc", PlanetBiome.Colony);
    expect(derivePlanetVariation(p)).toEqual(derivePlanetVariation(p));
  });

  it("different ids produce different rotationPhase", () => {
    const v1 = derivePlanetVariation(
      makePlanet("planet-aaa", PlanetBiome.Colony),
    );
    const v2 = derivePlanetVariation(
      makePlanet("planet-bbb", PlanetBiome.Colony),
    );
    expect(v1.rotationPhase).not.toBeCloseTo(v2.rotationPhase, 2);
  });

  it("rotationPhase is in [0, 2π]", () => {
    for (const id of ["a", "planet-1", "x9q3z", "long-planet-id-with-dashes"]) {
      const v = derivePlanetVariation(makePlanet(id, PlanetBiome.Colony));
      expect(v.rotationPhase).toBeGreaterThanOrEqual(0);
      expect(v.rotationPhase).toBeLessThanOrEqual(Math.PI * 2);
    }
  });

  it("ringTiltDeg is in [-25, 25] for GasGiantSkim", () => {
    for (const id of ["gas-a", "gas-b", "gas-c", "gas-d", "gas-e"]) {
      const v = derivePlanetVariation(makePlanet(id, PlanetBiome.GasGiantSkim));
      expect(v.ringTiltDeg).toBeGreaterThanOrEqual(-25);
      expect(v.ringTiltDeg).toBeLessThanOrEqual(25);
    }
  });

  it("baseTint channels are in [235, 255]", () => {
    const v = derivePlanetVariation(
      makePlanet("test-planet", PlanetBiome.Colony),
    );
    const r = (v.baseTint >> 16) & 0xff;
    const g = (v.baseTint >> 8) & 0xff;
    const b = v.baseTint & 0xff;
    expect(r).toBeGreaterThanOrEqual(235);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(235);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(235);
    expect(b).toBeLessThanOrEqual(255);
  });
});

describe("isRinged", () => {
  it("returns true only for GasGiantSkim", () => {
    expect(isRinged(PlanetBiome.GasGiantSkim)).toBe(true);
    expect(isRinged(PlanetBiome.Colony)).toBe(false);
    expect(isRinged(PlanetBiome.Capital)).toBe(false);
    expect(isRinged(PlanetBiome.Resort)).toBe(false);
    expect(isRinged(PlanetBiome.Breadbasket)).toBe(false);
  });
});

describe("multiplyBrightness", () => {
  it("factor 1.0 leaves tint unchanged", () => {
    expect(multiplyBrightness(0x80c040, 1.0)).toBe(0x80c040);
  });

  it("factor 2.0 clamps all channels at 255", () => {
    expect(multiplyBrightness(0xffffff, 2.0)).toBe(0xffffff);
    // 0x80 = 128; 128 * 2 = 256 → clamps to 255 = 0xff
    expect(multiplyBrightness(0x808080, 2.0)).toBe(0xffffff);
  });

  it("factor 0.0 produces black", () => {
    expect(multiplyBrightness(0xffffff, 0.0)).toBe(0x000000);
  });

  it("scales each channel independently", () => {
    // 0xff = 255; 255 * 0.5 = 127.5 → rounds to 128 = 0x80
    expect(multiplyBrightness(0xff0000, 0.5)).toBe(0x800000);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail (module not found)**

```bash
npm run test -- PlanetVariation
```

Expected: FAIL with `Cannot find module '../PlanetVariation.ts'`

---

### Task 5: Create PlanetVariation.ts and pass tests

**Files:**

- Create: `src/scenes/galaxy2d/PlanetVariation.ts`

- [ ] **Step 1: Create the module**

Create `src/scenes/galaxy2d/PlanetVariation.ts`:

```ts
import type { Planet } from "../../data/types.ts";
import { PlanetBiome } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

export interface PlanetVariation {
  baseTint: number;
  ringTint: number;
  ringTiltDeg: number;
  rotationPhase: number;
}

export function isRinged(biome: string): boolean {
  return biome === PlanetBiome.GasGiantSkim;
}

function hashPlanetId(id: string): number {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const RING_TINTS = [0xd4a87a, 0xc8b898, 0xe8d0a0, 0xb8a088, 0xd0c8b0];

export function derivePlanetVariation(planet: Planet): PlanetVariation {
  const rng = new SeededRNG(hashPlanetId(planet.id));
  // Light per-planet hue tint: each channel 235–255
  const r = 235 + Math.floor(rng.next() * 21);
  const g = 235 + Math.floor(rng.next() * 21);
  const b = 235 + Math.floor(rng.next() * 21);
  const baseTint = (r << 16) | (g << 8) | b;
  const ringed = isRinged(planet.biome);
  const ringTint = ringed
    ? RING_TINTS[Math.floor(rng.next() * RING_TINTS.length)]!
    : 0xffffff;
  const ringTiltDeg = ringed ? rng.nextFloat(-25, 25) : 0;
  const rotationPhase = rng.nextFloat(0, Math.PI * 2);
  return { baseTint, ringTint, ringTiltDeg, rotationPhase };
}

export function multiplyBrightness(tint: number, factor: number): number {
  const r = Math.min(255, Math.round(((tint >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((tint >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((tint & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npm run test -- PlanetVariation
```

Expected: All 9 tests PASS.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/galaxy2d/PlanetVariation.ts src/scenes/galaxy2d/__tests__/PlanetVariation.test.ts
git commit -m "feat: PlanetVariation — deterministic per-planet tint and ring variation"
```

---

### Task 6: Add planet preloads to BootScene

**Files:**

- Modify: `src/scenes/BootScene.ts`

- [ ] **Step 1: Add the import for PlanetBiome**

In `src/scenes/BootScene.ts`, add to the existing imports block (near the top, after existing imports):

```ts
import { PlanetBiome } from "../data/types.ts";
```

- [ ] **Step 2: Add preload calls inside `preload()`**

In the `preload()` method of `BootScene.ts`, after the ship-map sprite loads (around line 108), add:

```ts
// Planet biome sprites (21 PNGs) + ring overlay — authored pixel art, ~110KB total
for (const biome of Object.values(PlanetBiome)) {
  this.load.image(`planet:${biome}`, `planets/${biome}.png`);
}
this.load.image("planet:ring", "planets/ring.png");
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BootScene.ts
git commit -m "feat: preload planet biome sprites and ring overlay at boot"
```

---

### Task 7: Update PlanetEntry interface and imports in Planets2D.ts

**Files:**

- Modify: `src/scenes/galaxy2d/Planets2D.ts`

- [ ] **Step 1: Add import for PlanetVariation helpers**

At the top of `src/scenes/galaxy2d/Planets2D.ts`, add after the existing imports:

```ts
import {
  type PlanetVariation,
  derivePlanetVariation,
  isRinged,
  multiplyBrightness,
} from "./PlanetVariation.ts";
```

- [ ] **Step 2: Update the `PlanetEntry` interface**

Replace the existing `PlanetEntry` interface (lines 28–32):

```ts
interface PlanetEntry {
  planet: Planet;
  sprite: Phaser.GameObjects.Image;
  hitbox: Phaser.GameObjects.Zone;
}
```

with:

```ts
interface PlanetEntry {
  planet: Planet;
  baseSprite: Phaser.GameObjects.Image;
  ringBackSprite: Phaser.GameObjects.Image | null;
  ringFrontSprite: Phaser.GameObjects.Image | null;
  hitbox: Phaser.GameObjects.Zone;
  variation: PlanetVariation;
}
```

- [ ] **Step 3: Run typecheck — expect errors (callers still reference `e.sprite`)**

```bash
npm run typecheck
```

Expected: TypeScript errors on `e.sprite` references — confirms the old interface is gone. Proceed to fix in next tasks.

---

### Task 8: Rewrite setPlanets() in Planets2D.ts

**Files:**

- Modify: `src/scenes/galaxy2d/Planets2D.ts`

- [ ] **Step 1: Replace the body of `setPlanets()`**

In `src/scenes/galaxy2d/Planets2D.ts`, replace the entire `setPlanets()` method body (lines 70–97) with:

```ts
setPlanets(planets: Planet[], systemPositions: Map<string, Vec3>): void {
  // Tear down old entries.
  for (const e of this.entries.values()) {
    e.baseSprite.destroy();
    e.ringBackSprite?.destroy();
    e.ringFrontSprite?.destroy();
    e.hitbox.destroy();
  }
  this.entries.clear();
  this.systemPositions = systemPositions;

  for (const planet of planets) {
    const variation = derivePlanetVariation(planet);

    const baseSprite = this.scene.add.image(0, 0, `planet:${planet.biome}`);
    baseSprite.setDepth(PLANET_DEPTH);
    baseSprite.setVisible(false);
    baseSprite.setTint(variation.baseTint);
    this.container.add(baseSprite);

    let ringBackSprite: Phaser.GameObjects.Image | null = null;
    let ringFrontSprite: Phaser.GameObjects.Image | null = null;
    if (isRinged(planet.biome)) {
      ringBackSprite = this.scene.add.image(0, 0, "planet:ring");
      ringBackSprite.setDepth(PLANET_DEPTH - 5);
      ringBackSprite.setVisible(false);
      ringBackSprite.setCrop(0, 32, 128, 32); // bottom half of ring texture
      ringBackSprite.setOrigin(0.5, 0.0);     // top edge anchors at position
      ringBackSprite.setTint(variation.ringTint);
      this.container.add(ringBackSprite);

      ringFrontSprite = this.scene.add.image(0, 0, "planet:ring");
      ringFrontSprite.setDepth(PLANET_DEPTH + 5);
      ringFrontSprite.setVisible(false);
      ringFrontSprite.setCrop(0, 0, 128, 32); // top half of ring texture
      ringFrontSprite.setOrigin(0.5, 1.0);    // bottom edge anchors at position
      ringFrontSprite.setTint(variation.ringTint);
      this.container.add(ringFrontSprite);
    }

    const hitbox = this.scene.add.zone(0, 0, 24, 24);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.setDepth(HITBOX_DEPTH);
    hitbox.setVisible(false);
    hitbox.on("pointerover", () => this.hoverHandler?.(planet.id));
    hitbox.on("pointerout", () => this.hoverHandler?.(null));
    hitbox.on("pointerup", () => this.clickHandler?.(planet.id));

    this.entries.set(planet.id, {
      planet,
      baseSprite,
      ringBackSprite,
      ringFrontSprite,
      hitbox,
      variation,
    });
  }
}
```

**Why `setOrigin` on rings:** the ring PNG is 128×64 with the ellipse center at y=32. After `setCrop`, each half is 128×32. Setting `setOrigin(0.5, 0.0)` on the back half anchors its top edge (= the ring's equatorial plane) at the planet position, and `setOrigin(0.5, 1.0)` on the front half anchors its bottom edge — so both halves radiate out from the planet center and share the same rotation pivot when `setAngle` is applied.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: errors only on remaining `e.sprite` references in `setFocusedSystem()`, `update()`, and `destroy()`. Continue.

---

### Task 9: Update update() and setFocusedSystem() in Planets2D.ts

**Files:**

- Modify: `src/scenes/galaxy2d/Planets2D.ts`

- [ ] **Step 1: Update `setFocusedSystem()` to hide ring sprites**

Replace the hide-all loop inside the `if (!systemId)` block in `setFocusedSystem()` (currently lines 103–108):

```ts
// Leaving system view — hide everything and clear orbit rings.
for (const e of this.entries.values()) {
  e.sprite.setVisible(false);
  e.hitbox.setVisible(false);
}
```

with:

```ts
// Leaving system view — hide everything and clear orbit rings.
for (const e of this.entries.values()) {
  e.baseSprite.setVisible(false);
  e.ringBackSprite?.setVisible(false);
  e.ringFrontSprite?.setVisible(false);
  e.hitbox.setVisible(false);
}
```

- [ ] **Step 2: Replace the per-planet hide block in `update()`**

The `update()` method has two `setVisible(false)` + `continue` blocks for non-focused / off-screen planets. Replace every occurrence of:

```ts
e.sprite.setVisible(false);
e.hitbox.setVisible(false);
continue;
```

with:

```ts
e.baseSprite.setVisible(false);
e.ringBackSprite?.setVisible(false);
e.ringFrontSprite?.setVisible(false);
e.hitbox.setVisible(false);
continue;
```

There are **three** such blocks:

1. When `e.planet.systemId !== this.focusedSystemId`
2. When `!proj.visible`
3. When `scale <= 0`

Replace all three.

- [ ] **Step 3: Replace the planet position/size update block in `update()`**

First, add this constant near the top of `Planets2D.ts` alongside the existing depth constants (after `ORBIT_LINE_ALPHA`):

```ts
const ROTATION_SPEED = 0.35; // radians/sec — ~18s per cycle
```

Then replace the final per-planet update block (currently `e.sprite.setPosition...` through `e.hitbox.setVisible(true)`) with:

```ts
const cycle = Math.cos(
  realtimeSeconds * ROTATION_SPEED + e.variation.rotationPhase,
);
const brightness = 0.86 + cycle * 0.14; // oscillates [0.72, 1.0]

e.baseSprite.setPosition(proj.x, proj.y);
e.baseSprite.setDisplaySize(size, size);
e.baseSprite.setTint(multiplyBrightness(e.variation.baseTint, brightness));
e.baseSprite.setVisible(true);

if (e.ringBackSprite && e.ringFrontSprite) {
  const ringW = size * 1.7;
  const ringHalf = size * 0.425;
  e.ringBackSprite.setPosition(proj.x, proj.y);
  e.ringBackSprite.setDisplaySize(ringW, ringHalf);
  e.ringBackSprite.setAngle(e.variation.ringTiltDeg);
  e.ringBackSprite.setVisible(true);
  e.ringFrontSprite.setPosition(proj.x, proj.y);
  e.ringFrontSprite.setDisplaySize(ringW, ringHalf);
  e.ringFrontSprite.setAngle(e.variation.ringTiltDeg);
  e.ringFrontSprite.setVisible(true);
}

e.hitbox.setPosition(proj.x, proj.y);
e.hitbox.setSize(size + 16, size + 16);
e.hitbox.setVisible(true);
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: errors only in `destroy()` (still references `e.sprite`). Continue.

---

### Task 10: Update destroy(), remove old helpers, run full check

**Files:**

- Modify: `src/scenes/galaxy2d/Planets2D.ts`

- [ ] **Step 1: Update `destroy()`**

Replace the loop inside `destroy()`:

```ts
for (const e of this.entries.values()) {
  e.sprite.destroy();
  e.hitbox.destroy();
}
```

with:

```ts
for (const e of this.entries.values()) {
  e.baseSprite.destroy();
  e.ringBackSprite?.destroy();
  e.ringFrontSprite?.destroy();
  e.hitbox.destroy();
}
```

- [ ] **Step 2: Delete the old helper functions**

Remove the two functions at the bottom of `Planets2D.ts` (approximately lines 264–326):

```ts
function colorForPlanet(planet: Planet): number {
  // ... entire function ...
}

function getOrCreatePlanetTexture(scene: Phaser.Scene, color: number): string {
  // ... entire function ...
}
```

Delete both completely.

- [ ] **Step 3: Run typecheck — should be clean**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass (new PlanetVariation tests + existing tests).

- [ ] **Step 5: Run the full CI check**

```bash
npm run check
```

Expected: typecheck ✓, tests ✓, build ✓.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/galaxy2d/Planets2D.ts scripts/generate-planet-sprites.mjs scripts/generate-planet-ring.mjs
git commit -m "feat: authored pixel-art planets with biome sprites, ring overlays, and rotation tint"
```

---

## Visual Verification Checklist

After the implementation commits, verify in-browser:

- [ ] Start dev server: `npm run dev`, open `http://localhost:5173`
- [ ] Navigate to a system with a `GasGiantSkim` planet (Mining type, gas giant biome in galaxy setup): confirm ring arcs visible, lower arc behind planet disc, upper arc in front
- [ ] Zoom in (scroll wheel): confirm ring tilt visible, distinct per gas giant
- [ ] Watch a gas giant for ~20s: confirm tint pulse is subtle (not distracting)
- [ ] Visit two systems with agricultural planets: confirm they look different (hue variation)
- [ ] Confirm no visual regressions in non-planet UI (orbit rings, ship trails, etc.)
