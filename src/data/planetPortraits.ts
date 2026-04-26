import type { PlanetType } from "./types.ts";

/**
 * All planet types that have generated portrait images.
 * Images live at public/portraits/planets/planet-{type}.png.
 */
export const PLANET_PORTRAIT_TYPES: readonly PlanetType[] = [
  "terran",
  "industrial",
  "mining",
  "agricultural",
  "hubStation",
  "resort",
  "research",
] as const;

/** Get the Phaser texture key for a planet portrait. */
export function getPlanetPortraitTextureKey(planetType: PlanetType): string {
  return `planet-portrait-${planetType}`;
}

/** Get the asset path (relative to public/) for a planet portrait. */
export function getPlanetPortraitAssetPath(planetType: PlanetType): string {
  return `portraits/planets/planet-${planetType}.png`;
}

/**
 * Get [webp, png] URL pair for Phaser's load.image(key, urls) array form.
 * Phaser tries the first URL (WebP) and falls back to the second (PNG).
 */
export function getPlanetPortraitAssetUrls(
  planetType: PlanetType,
): [string, string] {
  return [
    `portraits/planets/planet-${planetType}.webp`,
    `portraits/planets/planet-${planetType}.png`,
  ];
}
