/**
 * Types mirrored from `src/testing/types.ts`. This package cannot import from
 * `src/testing/` directly because that module is DEV-only app code that pulls in
 * Phaser and browser globals. The shapes below are a structural copy; keep in
 * sync with the app-side definitions or re-export from `e2e/fixtures/types.ts`
 * once that file exists in a published form.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: number;
  channel: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export type WidgetKind =
  | "button"
  | "icon-button"
  | "modal"
  | "dropdown"
  | "tab"
  | "list-item"
  | "toggle"
  | "input"
  | "other";

export interface TestIdEntry {
  testId: string;
  label: string;
  kind: WidgetKind;
  scene: string;
  enabled: boolean;
  visible: boolean;
}

export interface SceneInfo {
  active: string[];
  modalStack: string[];
}

export interface GameStateSnapshot {
  version: string;
  ts: number;
  scene: SceneInfo;
  seed: number;
  turn: number;
  state: unknown;
}

export interface ClickResult {
  ok: boolean;
  testId: string;
  label: string;
  scene: string;
}

export type SftErrorCode =
  | "unknown-test-id"
  | "widget-disabled"
  | "widget-not-visible"
  | "scene-not-found"
  | "no-game"
  | "invariant-violated"
  | "timeout";

export interface InvariantViolation {
  name: string;
  message: string;
  ts: number;
  turn: number;
}

/**
 * Structured shape thrown by the in-browser façade. We only see plain error
 * objects across `page.evaluate`, so we detect this by shape, not `instanceof`.
 */
export interface SftTestErrorShape {
  name: "SftTestError";
  code: SftErrorCode;
  message: string;
  testId?: string;
  hint?: string;
}

export function isSftTestErrorShape(err: unknown): err is SftTestErrorShape {
  if (err === null || typeof err !== "object") return false;
  const e = err as { name?: unknown; code?: unknown; message?: unknown };
  return (
    e.name === "SftTestError" &&
    typeof e.code === "string" &&
    typeof e.message === "string"
  );
}
