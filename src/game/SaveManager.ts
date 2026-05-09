import { gameStore } from "../data/GameStore.ts";
import type { GameState, TechState } from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { SAVE_VERSION } from "../data/constants.ts";
import { initAdviserState } from "./adviser/AdviserEngine.ts";

const SAVE_KEY = "sft_save";
const AUTOSAVE_KEY = "sft_autosave";
const DRAFT_KEY = "sft_draft";

/** Age threshold in ms — drafts older than this are not offered as resume candidates. */
const DRAFT_MAX_AGE_MS = 60_000;

interface SaveEnvelope {
  version: number;
  timestamp: number;
  turn: number;
  state: GameState;
}

function writeSave(key: string, state: GameState): void {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    turn: state.turn,
    state,
  };
  localStorage.setItem(key, JSON.stringify(envelope));
}

function readSave(key: string): GameState | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (!envelope || typeof envelope !== "object") return null;
    if (envelope.version !== SAVE_VERSION) {
      throw new Error(
        `Incompatible save (v${envelope.version}). This alpha build requires save v${SAVE_VERSION}. Please start a new game.`,
      );
    }
    if (envelope.state && typeof envelope.state.turn === "number") {
      return envelope.state;
    }
    return null;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Incompatible save")) {
      throw err;
    }
    return null;
  }
}

/** Migrate old TechState shapes that predate purchaseCount / queue fields. */
function migrateTechState(tech: TechState): TechState {
  // Always ensure both fields exist — old saves may lack either.
  const hasPurchaseCount =
    tech.purchaseCount != null && typeof tech.purchaseCount === "object";

  const purchaseCount: Record<string, number> = hasPurchaseCount
    ? { ...tech.purchaseCount }
    : {};

  // Synthesize purchaseCount from completedTechIds when missing (old save format).
  if (!hasPurchaseCount && tech.completedTechIds?.length > 0) {
    for (const id of tech.completedTechIds) {
      purchaseCount[id] = 1;
    }
  }

  return {
    ...tech,
    purchaseCount,
    queue: Array.isArray(tech.queue) ? tech.queue : [],
  };
}

/** Migrate older saves that lack newer fields. */
export function migrateSave(state: GameState): GameState {
  let migrated = state;
  if (!migrated.adviser) {
    migrated = { ...migrated, adviser: initAdviserState() };
  }
  if (migrated.stationHub === undefined) {
    migrated = { ...migrated, stationHub: null };
  }
  if (!migrated.diplomacy) {
    migrated = { ...migrated, diplomacy: { ...EMPTY_DIPLOMACY_STATE } };
  }
  if (migrated.tech) {
    migrated = { ...migrated, tech: migrateTechState(migrated.tech) };
  }
  return migrated;
}

/** Serialize the current game state to localStorage under the manual-save key. */
export function saveGame(state: GameState): void {
  writeSave(SAVE_KEY, state);
}

/** Read a previously saved game from localStorage. Returns null if no save exists or data is corrupted. */
export function loadGame(): GameState | null {
  const state = readSave(SAVE_KEY);
  return state ? migrateSave(state) : null;
}

/** Returns true when a valid manual save exists in localStorage. */
export function hasSaveGame(): boolean {
  return readSaveMeta(SAVE_KEY) !== null;
}

/** Remove the manual save from localStorage. */
export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** Serialize state to localStorage under the auto-save key (called after each turn). */
export function autoSave(state: GameState): void {
  writeSave(AUTOSAVE_KEY, state);
}

/** Load auto-save data. Returns null if none exists or data is corrupted. */
export function loadAutoSave(): GameState | null {
  const state = readSave(AUTOSAVE_KEY);
  return state ? migrateSave(state) : null;
}

/** Remove the auto-save from localStorage. */
export function deleteAutoSave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

/** Returns true when an auto-save envelope exists (and is parseable). */
export function hasAutoSave(): boolean {
  return readSaveMeta(AUTOSAVE_KEY) !== null;
}

/** Lightweight metadata pulled from a save envelope without rehydrating the full state. */
export interface SaveMeta {
  /** Epoch ms when the save was written. */
  timestamp: number;
  /** Quarter (turn number) the save was captured on. */
  turn: number;
}

function readSaveMeta(key: string): SaveMeta | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (
      envelope &&
      typeof envelope === "object" &&
      envelope.version === SAVE_VERSION &&
      typeof envelope.timestamp === "number" &&
      typeof envelope.turn === "number"
    ) {
      return { timestamp: envelope.timestamp, turn: envelope.turn };
    }
    return null;
  } catch {
    return null;
  }
}

/** Read manual-save metadata (timestamp + turn). Returns null if no save exists. */
export function getSaveMeta(): SaveMeta | null {
  return readSaveMeta(SAVE_KEY);
}

/** Read auto-save metadata (timestamp + turn). Returns null if no auto-save exists. */
export function getAutoSaveMeta(): SaveMeta | null {
  return readSaveMeta(AUTOSAVE_KEY);
}

/** Convenience: load auto-save into the global game store. */
export function loadAutoSaveIntoStore(): boolean {
  const state = loadAutoSave();
  if (!state) return false;
  gameStore.setState(state);
  return true;
}

/**
 * Convenience: save + restore into gameStore in one call.
 * Returns true if a save was found and loaded, false otherwise.
 */
export function loadGameIntoStore(): boolean {
  const state = loadGame();
  if (!state) return false;
  gameStore.setState(state);
  return true;
}

// ---------------------------------------------------------------------------
// Draft save — mid-session snapshot for refresh-recovery
// ---------------------------------------------------------------------------

/** Write current state to the draft slot. Called on visibilitychange and debounced stateChanged. */
export function writeDraft(state: GameState): void {
  writeSave(DRAFT_KEY, state);
}

/** Load the draft state. Returns null if none exists or data is corrupted. */
export function loadDraft(): GameState | null {
  const state = readSave(DRAFT_KEY);
  return state ? migrateSave(state) : null;
}

/** Load draft into the global game store. Returns true on success. */
export function loadDraftIntoStore(): boolean {
  const state = loadDraft();
  if (!state) return false;
  gameStore.setState(state);
  return true;
}

/** Remove the draft slot (call after successful resume or new game). */
export function deleteDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

/** Returns metadata for the draft, or null if none exists. */
export function getDraftMeta(): SaveMeta | null {
  return readSaveMeta(DRAFT_KEY);
}

/**
 * Returns true when a draft exists AND was written within DRAFT_MAX_AGE_MS.
 * Used by MainMenuScene to decide whether to offer "Resume session?".
 */
export function hasFreshDraft(): boolean {
  const meta = getDraftMeta();
  if (!meta) return false;
  return Date.now() - meta.timestamp <= DRAFT_MAX_AGE_MS;
}
