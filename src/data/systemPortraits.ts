import type { EventCategory } from "./types.ts";

/**
 * Maps a star color (hex number) to a system portrait texture key.
 * The six STAR_COLORS from GalaxyGenerator map to six portrait sprites.
 */
const STAR_COLOR_MAP: Record<number, string> = {
  0xffffee: "system-yellow", // near-white/warm-yellow
  0xffcc88: "system-yellow", // golden yellow
  0xff8866: "system-red", // orange-red
  0x88aaff: "system-blue", // blue giant
  0xffffff: "system-white", // white dwarf
  0xffaa44: "system-orange", // orange K-type
};

/**
 * System portrait texture keys used for preloading.
 * system-purple exists as an asset but is not included here because no
 * GalaxyGenerator star color maps to it; add an entry to STAR_COLOR_MAP first.
 */
export const SYSTEM_PORTRAIT_KEYS = [
  "system-yellow",
  "system-red",
  "system-blue",
  "system-white",
  "system-orange",
] as const;
export type SystemPortraitKey = (typeof SYSTEM_PORTRAIT_KEYS)[number];

/** Get the Phaser texture key for a system portrait by star color. */
export function getSystemPortraitTextureKey(starColor: number): string {
  return STAR_COLOR_MAP[starColor] ?? "system-yellow";
}

/** Get the asset URL pair [webp, png] for a system portrait. */
export function getSystemPortraitAssetUrls(
  key: SystemPortraitKey,
): [string, string] {
  return [`portraits/systems/${key}.webp`, `portraits/systems/${key}.png`];
}

/**
 * All event categories that have generated portrait images.
 * Images live at public/portraits/events/event-{category}.{webp,png}.
 */
export const EVENT_PORTRAIT_CATEGORIES: readonly EventCategory[] = [
  "market",
  "hazard",
  "opportunity",
  "flavor",
  "empire",
] as const;

/** Get the Phaser texture key for an event portrait. */
export function getEventPortraitTextureKey(category: EventCategory): string {
  return `event-portrait-${category}`;
}

/** Get the asset URL pair [webp, png] for an event portrait. */
export function getEventPortraitAssetUrls(
  category: EventCategory,
): [string, string] {
  return [
    `portraits/events/event-${category}.webp`,
    `portraits/events/event-${category}.png`,
  ];
}
