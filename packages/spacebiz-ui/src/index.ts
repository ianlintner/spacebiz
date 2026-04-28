// ─── @spacebiz/ui ─────────────────────────────────────────────────────────────
// Reusable Phaser 3 UI component library.
// Game-specific components (portraits, adviser, route builder) live in src/ui/
// of the consuming game and are not part of this package.
// ─────────────────────────────────────────────────────────────────────────────

// Foundation
export {
  getTheme,
  setTheme,
  colorToString,
  lerpColor,
  DEFAULT_THEME,
} from "./Theme.ts";
export type { ThemeConfig } from "./Theme.ts";

export * from "./Layout.ts";
export * from "./DepthLayers.ts";
export * from "./TextMetrics.ts";

// Sound registration (call once at game boot)
export { registerUiSoundHandler } from "./UiSound.ts";
export type { UiSoundHandler } from "./UiSound.ts";

// Core components
export { Panel } from "./Panel.ts";
export type { PanelConfig } from "./Panel.ts";

export { Button } from "./Button.ts";
export type { ButtonConfig } from "./Button.ts";

export { Dropdown } from "./Dropdown.ts";
export type { DropdownConfig, DropdownOption } from "./Dropdown.ts";

export { Label } from "./Label.ts";
export type { LabelConfig, LabelStyle } from "./Label.ts";

export { Modal } from "./Modal.ts";
export type { ModalConfig } from "./Modal.ts";

export { Tooltip } from "./Tooltip.ts";
export type { TooltipConfig } from "./Tooltip.ts";

export { ProgressBar } from "./ProgressBar.ts";
export type { ProgressBarConfig } from "./ProgressBar.ts";

export { ScrollableList } from "./ScrollableList.ts";
export type { ScrollableListConfig } from "./ScrollableList.ts";

export { TabGroup } from "./TabGroup.ts";
export type { TabGroupConfig, TabConfig } from "./TabGroup.ts";

export { DataTable } from "./DataTable.ts";
export type { DataTableConfig, ColumnDef } from "./DataTable.ts";

export { ScrollFrame } from "./ScrollFrame.ts";
export type { ScrollFrameConfig } from "./ScrollFrame.ts";

export { applyClippingMask } from "./MaskUtils.ts";

// Ambient / visual effects
export { createStarfield } from "./Starfield.ts";
export type { StarfieldConfig } from "./Starfield.ts";

export {
  addPulseTween,
  addTwinkleTween,
  addFloatTween,
  addRotateTween,
  registerAmbientCleanup,
  flashScreen,
} from "./AmbientFX.ts";
export type { PulseConfig, TwinkleConfig, FloatConfig } from "./AmbientFX.ts";

export { FloatingText } from "./FloatingText.ts";
export type { FloatingTextConfig } from "./FloatingText.ts";

export { MilestoneOverlay } from "./MilestoneOverlay.ts";
export type { MilestoneType } from "./MilestoneOverlay.ts";

// Scene utilities
export { SceneUiDirector, SceneUiLayer } from "./SceneUiDirector.ts";

// Composite widgets
export { StatRow } from "./StatRow.ts";
export type { StatRowConfig } from "./StatRow.ts";

export { InfoCard } from "./InfoCard.ts";
export type { InfoCardConfig } from "./InfoCard.ts";

export { IconButton } from "./IconButton.ts";
export type { IconButtonConfig } from "./IconButton.ts";

export { StatusBadge } from "./StatusBadge.ts";
export type { StatusBadgeConfig, BadgeVariant } from "./StatusBadge.ts";

// Form controls (Slider, Checkbox, Toggle, RadioGroup)
export * from "./input/index.ts";

// Cargo icon utilities
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

// Ship icon utilities
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
