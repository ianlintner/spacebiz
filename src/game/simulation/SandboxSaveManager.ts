import type { GameState } from "../../data/types.ts";
import type {
  SimulationConfig,
  SimulationResult,
  TurnLog,
} from "./SimulationLogger.ts";

// ── Save format version ────────────────────────────────────────
// Increment when the save schema changes.  Migration functions
// below handle upgrading older versions.
const SAVE_VERSION = 1;

// ── Storage keys ───────────────────────────────────────────────
const INDEX_KEY = "sft_sandbox_index";
const ACTIVE_KEY = "sft_sandbox_active";
const DATA_PREFIX = "sft_sandbox_data_";
const MAX_SAVE_SLOTS = 10;

// ── Auto-save frequency (in turns) ────────────────────────────
export const AUTOSAVE_INTERVAL = 5;

// ── Types ──────────────────────────────────────────────────────

export type SandboxStatus = "running" | "paused" | "complete";

export interface SaveSlotMeta {
  id: string;
  label: string;
  timestamp: number;
  turn: number;
  maxTurns: number;
  configSummary: string; // e.g. "Medium Spiral 6 AI"
  status: SandboxStatus;
  version: number;
}

export interface SandboxSaveData {
  version: number;
  meta: SaveSlotMeta;
  config: SimulationConfig;
  gameState: GameState;
  rngState: number; // SeededRNG internal state for deterministic resume
  turnLogs: TurnLog[];
  speed: string;
  result: SimulationResult | null; // present when status === "complete"
}

// ── Helpers ────────────────────────────────────────────────────

function dataKey(id: string): string {
  return DATA_PREFIX + id;
}

function configSummaryText(config: SimulationConfig): string {
  const size =
    config.gameSize.charAt(0).toUpperCase() + config.gameSize.slice(1);
  const shape =
    config.galaxyShape.charAt(0).toUpperCase() + config.galaxyShape.slice(1);
  return `${size} ${shape} ${config.companyCount} AI`;
}

export function generateSaveId(): string {
  return `sb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Migrate older save formats to current version. Returns null if unrecoverable. */
function migrateSaveData(raw: unknown): SandboxSaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  // Version 1 is the current (and first) version — just validate.
  if (data.version === SAVE_VERSION) {
    const d = data as unknown as SandboxSaveData;
    if (d.meta && d.config && d.gameState && typeof d.rngState === "number") {
      return d;
    }
    return null;
  }

  // Future: add migration from version N to N+1 here.
  // If we can't migrate, return null so the caller can warn the user.
  return null;
}

// ── Index (metadata list) ──────────────────────────────────────

function readIndex(): SaveSlotMeta[] {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SaveSlotMeta[];
    return [];
  } catch {
    return [];
  }
}

function writeIndex(index: SaveSlotMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

// ── Public API ─────────────────────────────────────────────────

/** List all saved sandbox games (newest first). */
export function listSandboxSaves(): SaveSlotMeta[] {
  return readIndex().sort((a, b) => b.timestamp - a.timestamp);
}

/** Save (or overwrite) a sandbox slot. */
export function saveSandbox(data: SandboxSaveData): void {
  // Update meta timestamp
  data.meta.timestamp = Date.now();
  data.meta.version = SAVE_VERSION;

  // Write save data
  localStorage.setItem(dataKey(data.meta.id), JSON.stringify(data));

  // Update index
  const index = readIndex();
  const existing = index.findIndex((s) => s.id === data.meta.id);
  if (existing >= 0) {
    index[existing] = data.meta;
  } else {
    index.push(data.meta);
  }

  // Enforce max slots — remove oldest saves beyond limit
  if (index.length > MAX_SAVE_SLOTS) {
    const sorted = [...index].sort((a, b) => b.timestamp - a.timestamp);
    const toRemove = sorted.slice(MAX_SAVE_SLOTS);
    for (const slot of toRemove) {
      localStorage.removeItem(dataKey(slot.id));
    }
    writeIndex(sorted.slice(0, MAX_SAVE_SLOTS));
  } else {
    writeIndex(index);
  }
}

/** Load full save data by id. Returns null if missing or corrupted. */
export function loadSandbox(id: string): SandboxSaveData | null {
  const raw = localStorage.getItem(dataKey(id));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return migrateSaveData(parsed);
  } catch {
    return null;
  }
}

/** Delete a specific sandbox save. */
export function deleteSandboxSave(id: string): void {
  localStorage.removeItem(dataKey(id));
  const index = readIndex().filter((s) => s.id !== id);
  writeIndex(index);

  // Clear active marker if it pointed to this save
  if (getActiveSandboxId() === id) {
    clearActiveSandbox();
  }
}

/** Delete all sandbox saves. */
export function deleteAllSandboxSaves(): void {
  const index = readIndex();
  for (const slot of index) {
    localStorage.removeItem(dataKey(slot.id));
  }
  localStorage.removeItem(INDEX_KEY);
  clearActiveSandbox();
}

// ── Active session tracking ────────────────────────────────────

/** Mark a sandbox as the currently-active session (for refresh recovery). */
export function setActiveSandbox(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

/** Clear the active session marker (call on clean exit). */
export function clearActiveSandbox(): void {
  localStorage.removeItem(ACTIVE_KEY);
}

/** Get the active sandbox ID, or null if none. */
export function getActiveSandboxId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

/** Load the active sandbox data (convenience). Returns null if no active session. */
export function getActiveSandboxData(): SandboxSaveData | null {
  const id = getActiveSandboxId();
  if (!id) return null;
  return loadSandbox(id);
}

/** Check if there is a resumable sandbox session. */
export function hasResumableSandbox(): boolean {
  const data = getActiveSandboxData();
  return data !== null && data.meta.status !== "complete";
}

// ── Build helpers ──────────────────────────────────────────────

/** Create initial SandboxSaveData from a fresh simulation start. */
export function createSandboxSaveData(
  saveId: string,
  label: string,
  config: SimulationConfig,
  gameState: GameState,
  rngState: number,
  speed: string,
): SandboxSaveData {
  return {
    version: SAVE_VERSION,
    meta: {
      id: saveId,
      label,
      timestamp: Date.now(),
      turn: gameState.turn,
      maxTurns: gameState.maxTurns,
      configSummary: configSummaryText(config),
      status: "running",
      version: SAVE_VERSION,
    },
    config,
    gameState,
    rngState,
    turnLogs: [],
    speed,
    result: null,
  };
}

/** Update save data with latest state from a running simulation. */
export function updateSandboxSaveData(
  existing: SandboxSaveData,
  gameState: GameState,
  rngState: number,
  turnLogs: TurnLog[],
  speed: string,
  status: SandboxStatus,
  result: SimulationResult | null = null,
): SandboxSaveData {
  return {
    ...existing,
    meta: {
      ...existing.meta,
      turn: gameState.turn,
      status,
      timestamp: Date.now(),
    },
    gameState,
    rngState,
    turnLogs,
    speed,
    result,
  };
}

/** Get save version for display and compatibility checks. */
export function getSaveVersion(): number {
  return SAVE_VERSION;
}
