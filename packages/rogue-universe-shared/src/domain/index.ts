// ─── Domain: cargo icons, ship icons, milestone overlay ──────────────────────

export {
  generateCargoIcons,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
  getCargoShortLabel,
  CARGO_COLORS,
  CARGO_LABELS,
  CARGO_SHORT_LABELS,
  CARGO_ICON_PREFIX,
  CARGO_TYPE_LIST,
} from "./CargoIcons.ts";
export type { CargoTypeValue } from "./CargoIcons.ts";

export {
  generateShipIcons,
  getShipIconKey,
  getShipColor,
  getShipLabel,
  SHIP_COLORS,
  SHIP_LABELS,
  SHIP_ICON_PREFIX,
  SHIP_CLASS_LIST,
} from "./ShipIcons.ts";
export type { ShipClassValue } from "./ShipIcons.ts";

export { MilestoneOverlay } from "./MilestoneOverlay.ts";
export type { MilestoneType } from "./MilestoneOverlay.ts";
