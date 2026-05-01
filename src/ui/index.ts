// ─── Library components (source lives in packages/spacebiz-ui) ───────────────
export * from "@spacebiz/ui";

// ─── Shared IP-bearing components (lives in packages/rogue-universe-shared) ──
export * from "@rogue-universe/shared";

// ─── Game-specific components ─────────────────────────────────────────────────
export { attachReflowHandler } from "./sceneReflow.ts";

export {
  openRouteBuilder,
  type RouteBuilderResult,
  type RouteBuilderOptions,
} from "./RouteBuilderPanel.ts";

export { StandingsGraph } from "./StandingsGraph.ts";
export type { StandingsGraphConfig } from "./StandingsGraph.ts";

export { TechTreeGrid } from "./TechTreeGrid.ts";
export type {
  TechTreeGridConfig,
  TechTreeGridState,
  TechNodeState,
} from "./TechTreeGrid.ts";

export { StationBuilderGrid, ROOM_COLORS } from "./StationBuilderGrid.ts";
export type {
  StationBuilderGridConfig,
  StationBuilderGridData,
  CellEventPayload,
} from "./StationBuilderGrid.ts";
