import type { GameState } from "../data/types.ts";
import type { WidgetKind } from "../../packages/spacebiz-ui/src/WidgetHooks.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";
export const LOG_LEVELS: readonly LogLevel[] = [
  "debug",
  "info",
  "warn",
  "error",
] as const;

export interface LogEntry {
  ts: number;
  channel: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

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
  state: GameState;
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

export class SftTestError extends Error {
  readonly code: SftErrorCode;
  readonly testId?: string;
  readonly hint?: string;
  constructor(
    code: SftErrorCode,
    message: string,
    opts?: { testId?: string; hint?: string },
  ) {
    super(message);
    this.name = "SftTestError";
    this.code = code;
    this.testId = opts?.testId;
    this.hint = opts?.hint;
  }
}

export interface InvariantViolation {
  name: string;
  message: string;
  ts: number;
  turn: number;
}
