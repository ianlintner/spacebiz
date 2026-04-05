// ─── Library components (source lives in packages/spacebiz-ui) ───────────────
export * from "@spacebiz/ui";

// ─── Game-specific components ─────────────────────────────────────────────────
export {
  drawPortrait,
  drawTerranPortrait,
  drawMiningPortrait,
  drawAgriculturalPortrait,
  drawIndustrialPortrait,
  drawHubStationPortrait,
  drawResortPortrait,
  drawResearchPortrait,
  drawShipPortrait,
  drawSystemPortrait,
  drawEventPortrait,
  drawAlienPortrait,
  fillGradientV,
  fillGradientH,
  type PortraitType,
  type AlienRole,
  type PortraitData,
} from "./PortraitGenerator.ts";
export { PortraitPanel, type PortraitPanelConfig } from "./PortraitPanel.ts";

