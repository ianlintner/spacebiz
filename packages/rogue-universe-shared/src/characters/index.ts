// ─── Characters: portraits, advisers ─────────────────────────────────────────

export type { PortraitExpression } from "./PortraitExpression.ts";
export { getExpressionFromGameState } from "./PortraitExpression.ts";

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
} from "./PortraitGenerator.ts";
export type {
  PortraitType,
  AlienRole,
  PortraitData,
} from "./PortraitGenerator.ts";

export { PortraitPanel } from "./PortraitPanel.ts";
export type { PortraitPanelConfig } from "./PortraitPanel.ts";

export {
  ADVISER_FRAME_COUNT,
  ADVISER_MOODS,
  ADVISER_SHEET_KEY,
  getAdviserFrameName,
  getMoodAccentColor,
  generateAdviserSpritesheet,
  drawRexPortrait,
} from "./AdviserPortrait.ts";

export { AdviserPanel } from "./AdviserPanel.ts";
export type { AdviserPanelConfig } from "./AdviserPanel.ts";
