import type { HubRoomType } from "./types.ts";

/**
 * All hub room types that have generated portrait images.
 * Images live at public/portraits/rooms/room-{type}.png.
 */
export const ROOM_PORTRAIT_TYPES: readonly HubRoomType[] = [
  "simpleTerminal",
  "improvedTerminal",
  "advancedTerminal",
  "tradeOffice",
  "passengerLounge",
  "oreProcessing",
  "foodTerminal",
  "techTerminal",
  "luxuryTerminal",
  "hazmatTerminal",
  "medicalTerminal",
  "fuelDepot",
  "marketExchange",
  "customsBureau",
  "repairBay",
  "researchLab",
  "cargoWarehouse",
  "securityOffice",
] as const;

/** Get the Phaser texture key for a room portrait. */
export function getRoomPortraitTextureKey(roomType: HubRoomType): string {
  return `room-portrait-${roomType}`;
}

/** Get the asset path (relative to public/) for a room portrait. */
export function getRoomPortraitAssetPath(roomType: HubRoomType): string {
  return `portraits/rooms/room-${roomType}.png`;
}

/**
 * Get [webp, png] URL pair for Phaser's load.image(key, urls) array form.
 * Phaser tries the first URL (WebP) and falls back to the second (PNG).
 */
export function getRoomPortraitAssetUrls(
  roomType: HubRoomType,
): [string, string] {
  return [
    `portraits/rooms/room-${roomType}.webp`,
    `portraits/rooms/room-${roomType}.png`,
  ];
}
