/**
 * Ship class icon mappings — texture keys, tint colors, and display labels
 * for the eight ship classes in Star Freight Tycoon.
 *
 * Icons are generated as 24×24 CanvasTextures at boot time (see BootScene).
 * Each icon is white-on-transparent, designed to be tinted at runtime.
 */

/** Texture key prefix for ship icons. Full key = `ship-<shipClass>`. */
export const SHIP_ICON_PREFIX = "ship-";

/** Ordered list of all ship class values (matches ShipClass const object). */
export const SHIP_CLASS_LIST = [
  "cargoShuttle",
  "passengerShuttle",
  "mixedHauler",
  "fastCourier",
  "bulkFreighter",
  "starLiner",
  "megaHauler",
  "luxuryLiner",
] as const;

export type ShipClassValue = (typeof SHIP_CLASS_LIST)[number];

/** Map each ship class to its tint color (applied to the white icon texture). */
export const SHIP_COLORS: Record<ShipClassValue, number> = {
  cargoShuttle: 0xff9b54, // warm orange — basic cargo
  passengerShuttle: 0x00ffcc, // cyan — passenger
  mixedHauler: 0x88cc44, // green — versatile
  fastCourier: 0xffee55, // bright yellow — speed
  bulkFreighter: 0xcc8844, // bronze — heavy
  starLiner: 0x4488ff, // blue — passenger premium
  megaHauler: 0xff6644, // red-orange — massive cargo
  luxuryLiner: 0xd9a7ff, // purple — luxury
};

/** Map each ship class to a short human-readable label. */
export const SHIP_LABELS: Record<ShipClassValue, string> = {
  cargoShuttle: "Cargo Shuttle",
  passengerShuttle: "Pax Shuttle",
  mixedHauler: "Mixed Hauler",
  fastCourier: "Fast Courier",
  bulkFreighter: "Bulk Freighter",
  starLiner: "Star Liner",
  megaHauler: "Mega Hauler",
  luxuryLiner: "Luxury Liner",
};

/** Get the Phaser texture key for a ship class icon. */
export function getShipIconKey(shipClass: string): string {
  return `${SHIP_ICON_PREFIX}${shipClass}`;
}

/** Get the tint color for a ship class. Returns accent cyan for unknown classes. */
export function getShipColor(shipClass: string): number {
  return SHIP_COLORS[shipClass as ShipClassValue] ?? 0x00ffcc;
}

/** Get the display label for a ship class. Capitalizes unknown classes. */
export function getShipLabel(shipClass: string): string {
  return (
    SHIP_LABELS[shipClass as ShipClassValue] ??
    shipClass.charAt(0).toUpperCase() + shipClass.slice(1)
  );
}

/**
 * Generate all 8 ship class icon CanvasTextures on a Phaser scene's texture manager.
 * Call once during boot. Each icon is a 24×24 white-on-transparent pixel-art
 * sprite, designed to be tinted with `setTint(SHIP_COLORS[class])`.
 */
export function generateShipIcons(
  textures: Phaser.Textures.TextureManager,
): void {
  const s = 24;

  function makeCanvas(key: string): {
    tex: Phaser.Textures.CanvasTexture;
    ctx: CanvasRenderingContext2D;
  } {
    const tex = textures.createCanvas(key, s, s);
    if (!tex) throw new Error(`Failed to create canvas texture "${key}"`);
    return { tex, ctx: tex.getContext() };
  }

  const col = "#ffffff";

  // ── Cargo Shuttle: small boxy ship with stubby wings ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("cargoShuttle"));
    ctx.fillStyle = col;
    // Main hull (pointing right →)
    ctx.beginPath();
    ctx.moveTo(20, 12); // nose
    ctx.lineTo(4, 6); // top-back
    ctx.lineTo(4, 18); // bottom-back
    ctx.closePath();
    ctx.fill();
    // Cargo bay (boxy rear)
    ctx.fillRect(2, 8, 6, 8);
    // Stubby wings
    ctx.fillRect(6, 4, 4, 3);
    ctx.fillRect(6, 17, 4, 3);
    // Engine glow
    ctx.fillRect(2, 10, 2, 4);
    tex.refresh();
  }

  // ── Passenger Shuttle: sleek ship with window row ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("passengerShuttle"));
    ctx.fillStyle = col;
    // Sleek hull
    ctx.beginPath();
    ctx.moveTo(21, 12); // nose
    ctx.lineTo(5, 5); // top-back
    ctx.lineTo(3, 8);
    ctx.lineTo(3, 16);
    ctx.lineTo(5, 19); // bottom-back
    ctx.closePath();
    ctx.fill();
    // Window row (darkened)
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(7 + i * 3, 11, 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";
    // Tail fin
    ctx.beginPath();
    ctx.moveTo(3, 5);
    ctx.lineTo(5, 5);
    ctx.lineTo(3, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 19);
    ctx.lineTo(5, 19);
    ctx.lineTo(3, 22);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  // ── Mixed Hauler: medium ship with split cargo/pax area ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("mixedHauler"));
    ctx.fillStyle = col;
    // Main hull — wedge shape
    ctx.beginPath();
    ctx.moveTo(20, 12); // nose
    ctx.lineTo(6, 5); // top
    ctx.lineTo(3, 7);
    ctx.lineTo(3, 17);
    ctx.lineTo(6, 19); // bottom
    ctx.closePath();
    ctx.fill();
    // Cargo section (boxy addition underneath)
    ctx.fillRect(5, 15, 8, 4);
    // Passenger windows
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(8 + i * 3, 8, 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";
    // Engines
    ctx.fillRect(2, 9, 2, 6);
    tex.refresh();
  }

  // ── Fast Courier: slim, long, dart-like ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("fastCourier"));
    ctx.fillStyle = col;
    // Slim dart hull
    ctx.beginPath();
    ctx.moveTo(22, 12); // sharp nose
    ctx.lineTo(3, 8); // top
    ctx.lineTo(2, 12);
    ctx.lineTo(3, 16); // bottom
    ctx.closePath();
    ctx.fill();
    // Swept-back wings
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(10, 3);
    ctx.lineTo(12, 5);
    ctx.lineTo(8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(10, 21);
    ctx.lineTo(12, 19);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fill();
    // Twin engines
    ctx.fillRect(1, 9, 2, 2);
    ctx.fillRect(1, 13, 2, 2);
    tex.refresh();
  }

  // ── Bulk Freighter: wide, chunky, container ship ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("bulkFreighter"));
    ctx.fillStyle = col;
    // Wide hull
    ctx.beginPath();
    ctx.moveTo(19, 12); // blunt nose
    ctx.lineTo(17, 5);
    ctx.lineTo(4, 5);
    ctx.lineTo(2, 8);
    ctx.lineTo(2, 16);
    ctx.lineTo(4, 19);
    ctx.lineTo(17, 19);
    ctx.closePath();
    ctx.fill();
    // Container lines
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(8, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13, 5);
    ctx.lineTo(13, 19);
    ctx.stroke();
    // Engines
    ctx.fillStyle = col;
    ctx.fillRect(1, 8, 2, 8);
    tex.refresh();
  }

  // ── Star Liner: elegant, long cruise ship with multiple decks ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("starLiner"));
    ctx.fillStyle = col;
    // Elegant hull
    ctx.beginPath();
    ctx.moveTo(22, 12); // pointed bow
    ctx.lineTo(14, 5);
    ctx.lineTo(4, 5);
    ctx.lineTo(2, 8);
    ctx.lineTo(2, 16);
    ctx.lineTo(4, 19);
    ctx.lineTo(14, 19);
    ctx.closePath();
    ctx.fill();
    // Deck windows (two rows)
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(5 + i * 3, 8, 2, 1.5);
      ctx.fillRect(5 + i * 3, 14, 2, 1.5);
    }
    ctx.globalCompositeOperation = "source-over";
    // Observation dome
    ctx.beginPath();
    ctx.arc(18, 12, 2, 0, Math.PI * 2);
    ctx.fill();
    // Tall tail fin
    ctx.beginPath();
    ctx.moveTo(3, 5);
    ctx.lineTo(5, 5);
    ctx.lineTo(3, 1);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  // ── Mega Hauler: massive, boxy, industrial ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("megaHauler"));
    ctx.fillStyle = col;
    // Huge box hull
    ctx.fillRect(3, 3, 16, 18);
    // Blunt nose cone
    ctx.beginPath();
    ctx.moveTo(19, 3);
    ctx.lineTo(22, 12);
    ctx.lineTo(19, 21);
    ctx.lineTo(19, 3);
    ctx.closePath();
    ctx.fill();
    // Container grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(3 + i * 4, 3);
      ctx.lineTo(3 + i * 4, 21);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(3, 12);
    ctx.lineTo(19, 12);
    ctx.stroke();
    // Triple engines
    ctx.fillStyle = col;
    ctx.fillRect(1, 5, 3, 3);
    ctx.fillRect(1, 10, 3, 4);
    ctx.fillRect(1, 16, 3, 3);
    tex.refresh();
  }

  // ── Luxury Liner: sleek, curved, premium — with decorative detail ──
  {
    const { tex, ctx } = makeCanvas(getShipIconKey("luxuryLiner"));
    ctx.fillStyle = col;
    // Sweeping curved hull
    ctx.beginPath();
    ctx.moveTo(22, 12); // sharp bow
    ctx.quadraticCurveTo(14, 3, 4, 5);
    ctx.lineTo(2, 8);
    ctx.lineTo(2, 16);
    ctx.lineTo(4, 19);
    ctx.quadraticCurveTo(14, 21, 22, 12);
    ctx.closePath();
    ctx.fill();
    // Panoramic window strip
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.quadraticCurveTo(14, 8, 19, 11);
    ctx.lineTo(19, 13);
    ctx.quadraticCurveTo(14, 16, 6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // Ring detail on hull
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(12, 12, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Elegant tail fins
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(3, 5);
    ctx.lineTo(6, 5);
    ctx.lineTo(2, 1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 19);
    ctx.lineTo(6, 19);
    ctx.lineTo(2, 23);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }
}
