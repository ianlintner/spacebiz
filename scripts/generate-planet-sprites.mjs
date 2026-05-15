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
