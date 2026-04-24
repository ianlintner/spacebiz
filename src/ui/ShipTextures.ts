/**
 * ShipTextures — texture key helper for AI-generated ship portrait images.
 *
 * Portrait art: public/ships/portraits/<classId>.png (128×128, 3/4 view)
 * Preloaded at boot; falls back to procedural PortraitGenerator when absent.
 *
 * Galaxy-map key: use getShipMapKey() from ShipMapSprites.ts (already exported).
 */

/** Phaser texture key for a ship's portrait/detail image. */
export function getShipPortraitKey(shipClass: string): string {
  return `ship-portrait-${shipClass}`;
}
