/**
 * Cargo type icon mappings — texture keys, tint colors, and display labels
 * for the seven commodity types in Star Freight Tycoon.
 *
 * Icons are generated as 24×24 CanvasTextures at boot time (see BootScene).
 */

/** Texture key prefix for cargo icons. Full key = `cargo-<cargoType>`. */
export const CARGO_ICON_PREFIX = "cargo-";

/** Ordered list of all cargo type values (matches CargoType const object). */
export const CARGO_TYPE_LIST = [
  "passengers",
  "rawMaterials",
  "food",
  "technology",
  "luxury",
  "hazmat",
  "medical",
] as const;

export type CargoTypeValue = (typeof CARGO_TYPE_LIST)[number];

/** Map each cargo type to its tint color (applied to the white icon texture). */
export const CARGO_COLORS: Record<CargoTypeValue, number> = {
  passengers: 0x00ffcc,
  rawMaterials: 0xff9b54,
  food: 0x88cc44,
  technology: 0x4488ff,
  luxury: 0xd9a7ff,
  hazmat: 0xffaa00,
  medical: 0xff6688,
};

/** Map each cargo type to a short human-readable label. */
export const CARGO_LABELS: Record<CargoTypeValue, string> = {
  passengers: "Passengers",
  rawMaterials: "Raw Materials",
  food: "Food",
  technology: "Technology",
  luxury: "Luxury",
  hazmat: "Hazmat",
  medical: "Medical",
};

/**
 * Compact 3–4 letter cargo labels for tight tabular contexts (route
 * tables, market grids, filter chips) where the full label would clip.
 * Also reused for fixed-width column headers in the Market scene, where
 * "Technology" / "Raw Materials" otherwise render as "Technolo" / "Raw Mate".
 */
export const CARGO_SHORT_LABELS: Record<CargoTypeValue, string> = {
  passengers: "PAX",
  rawMaterials: "RAW",
  food: "FOOD",
  technology: "TECH",
  luxury: "LUX",
  hazmat: "HAZ",
  medical: "MED",
};

/** Get the Phaser texture key for a cargo type icon. */
export function getCargoIconKey(cargoType: string): string {
  return `${CARGO_ICON_PREFIX}${cargoType}`;
}

/** Get the tint color for a cargo type. Returns accent cyan for unknown types. */
export function getCargoColor(cargoType: string): number {
  return CARGO_COLORS[cargoType as CargoTypeValue] ?? 0x00ffcc;
}

/** Get the display label for a cargo type. Capitalizes unknown types. */
export function getCargoLabel(cargoType: string): string {
  return (
    CARGO_LABELS[cargoType as CargoTypeValue] ??
    cargoType.charAt(0).toUpperCase() + cargoType.slice(1)
  );
}

/** Get the short-form label (e.g. "PAX", "RAW") for a cargo type. */
export function getCargoShortLabel(cargoType: string): string {
  return (
    CARGO_SHORT_LABELS[cargoType as CargoTypeValue] ??
    cargoType.slice(0, 4).toUpperCase()
  );
}

/**
 * Generate all 7 cargo icon CanvasTextures on a Phaser scene's texture manager.
 * Call once during boot. Each icon is a 24×24 white-on-transparent pixel-art
 * sprite, designed to be tinted with `setTint(CARGO_COLORS[type])`.
 */
export function generateCargoIcons(
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

  // ── Passengers: person silhouette ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("passengers"));
    ctx.fillStyle = col;
    // Head
    ctx.beginPath();
    ctx.arc(12, 7, 4, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.moveTo(6, 22);
    ctx.lineTo(8, 13);
    ctx.lineTo(16, 13);
    ctx.lineTo(18, 22);
    ctx.closePath();
    ctx.fill();
    // Shoulders
    ctx.beginPath();
    ctx.arc(12, 14, 5, Math.PI, 0);
    ctx.fill();
    tex.refresh();
  }

  // ── RawMaterials: crystal cluster ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("rawMaterials"));
    ctx.fillStyle = col;
    // Center crystal
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(16, 10);
    ctx.lineTo(14, 22);
    ctx.lineTo(10, 22);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();
    // Left crystal (smaller)
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(9, 14);
    ctx.lineTo(7, 22);
    ctx.lineTo(3, 22);
    ctx.lineTo(3, 14);
    ctx.closePath();
    ctx.fill();
    // Right crystal (smaller)
    ctx.beginPath();
    ctx.moveTo(18, 6);
    ctx.lineTo(21, 14);
    ctx.lineTo(21, 22);
    ctx.lineTo(17, 22);
    ctx.lineTo(15, 14);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  // ── Food: wheat/grain stalk ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("food"));
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    // Main stem
    ctx.beginPath();
    ctx.moveTo(12, 22);
    ctx.lineTo(12, 6);
    ctx.stroke();
    // Grain kernels (alternating sides)
    const kernels = [
      [9, 5, 12, 3],
      [15, 5, 12, 3],
      [8, 9, 12, 7],
      [16, 9, 12, 7],
      [9, 13, 12, 11],
      [15, 13, 12, 11],
    ];
    for (const [kx, ky, sx, sy] of kernels) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
    tex.refresh();
  }

  // ── Technology: microchip / circuit ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("technology"));
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    // Chip body (rounded rect)
    ctx.fillRect(7, 7, 10, 10);
    // Inner circuit pattern
    ctx.clearRect(9, 9, 6, 6);
    ctx.fillRect(10, 10, 4, 4);
    // Pins (top, bottom, left, right — 3 each)
    for (let i = 0; i < 3; i++) {
      const offset = 9 + i * 3;
      // Top
      ctx.fillRect(offset, 3, 1.5, 4);
      // Bottom
      ctx.fillRect(offset, 17, 1.5, 4);
      // Left
      ctx.fillRect(3, offset, 4, 1.5);
      // Right
      ctx.fillRect(17, offset, 4, 1.5);
    }
    tex.refresh();
  }

  // ── Luxury: diamond gem ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("luxury"));
    ctx.fillStyle = col;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(12, 2); // top point
    ctx.lineTo(21, 9); // right shoulder
    ctx.lineTo(12, 22); // bottom point
    ctx.lineTo(3, 9); // left shoulder
    ctx.closePath();
    ctx.fill();
    // Facet line (darker inner)
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(21, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 9);
    ctx.lineTo(12, 2);
    ctx.lineTo(16, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 9);
    ctx.lineTo(12, 22);
    ctx.lineTo(16, 9);
    ctx.stroke();
    tex.refresh();
  }

  // ── Hazmat: radiation trefoil ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("hazmat"));
    ctx.fillStyle = col;
    const cx = 12,
      cy = 12,
      outerR = 9,
      innerR = 3.5;
    // Three fan blades
    for (let i = 0; i < 3; i++) {
      const startAngle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2) / 4.5;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
    }
    // Center circle (empty)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }

  // ── Medical: cross ──
  {
    const { tex, ctx } = makeCanvas(getCargoIconKey("medical"));
    ctx.fillStyle = col;
    // Vertical bar
    ctx.fillRect(9, 3, 6, 18);
    // Horizontal bar
    ctx.fillRect(3, 8, 18, 7);
    // Rounded corners (small arcs at the 12 terminal corners)
    ctx.beginPath();
    ctx.arc(10, 4, 1, 0, Math.PI * 2);
    ctx.arc(14, 4, 1, 0, Math.PI * 2);
    ctx.arc(10, 20, 1, 0, Math.PI * 2);
    ctx.arc(14, 20, 1, 0, Math.PI * 2);
    ctx.arc(4, 9, 1, 0, Math.PI * 2);
    ctx.arc(4, 14, 1, 0, Math.PI * 2);
    ctx.arc(20, 9, 1, 0, Math.PI * 2);
    ctx.arc(20, 14, 1, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
}
