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
