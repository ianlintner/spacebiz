import type { GameState } from "./types";
import { GameEventEmitter } from "../utils/EventEmitter";
import {
  STARTING_CASH,
  MAX_TURNS,
  SAVE_VERSION,
  ACTION_POINTS_PER_TURN,
  LOCAL_ROUTE_SLOTS,
  BASE_GALACTIC_ROUTE_SLOTS,
} from "./constants";
import { initAdviserState } from "../game/adviser/AdviserEngine.ts";

function createDefaultState(): GameState {
  return {
    seed: Date.now(),
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "New Ventures Inc.",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "",
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    fleet: [],
    activeRoutes: [],
    market: { fuelPrice: 10, fuelTrend: "stable", planetMarkets: {} },
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: 4,
    localRouteSlots: LOCAL_ROUTE_SLOTS,
    galacticRouteSlots: BASE_GALACTIC_ROUTE_SLOTS,
    unlockedEmpireIds: [],
    contracts: [],
    tech: {
      researchPoints: 0,
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
    },
    empireTradePolicies: {},
    interEmpireCargoLocks: [],
    hyperlanes: [],
    borderPorts: [],
    diplomaticRelations: [],
    hyperlaneDensity: "medium",
    stationHub: null,
    // Phase 6: Interaction Overhaul
    saveVersion: SAVE_VERSION,
    actionPoints: {
      current: ACTION_POINTS_PER_TURN,
      max: ACTION_POINTS_PER_TURN,
    },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
    empireReputation: {},
  };
}

/**
 * Dev-only top-level freeze. Catches accidental `gameStore.getState().cash = 0`
 * mutations in tests and during development. Shallow only — nested objects
 * (`fleet`, `galaxy`, etc.) are not frozen, so `state.fleet.push(...)` still
 * silently bypasses the update pipeline. Stripped from production builds via
 * `import.meta.env.DEV`.
 */
function freezeInDev(state: GameState): GameState {
  if (import.meta.env?.DEV) Object.freeze(state);
  return state;
}

export class GameStore extends GameEventEmitter {
  private state: GameState;

  constructor() {
    super();
    this.state = freezeInDev(createDefaultState());
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Apply a partial update. Emits a single `stateChanged` event with
   * `(state, changedKeys)` so subscribers can short-circuit when the keys
   * they care about didn't change.
   */
  update(partial: Partial<GameState>): void {
    const changedKeys = new Set<keyof GameState>();
    const next = { ...this.state, ...partial } as GameState;
    for (const key of Object.keys(partial) as (keyof GameState)[]) {
      if (this.state[key] !== next[key]) changedKeys.add(key);
    }
    if (changedKeys.size === 0) return;
    this.state = freezeInDev(next);
    this.emit("stateChanged", this.state, changedKeys);
  }

  setState(state: GameState): void {
    this.state = freezeInDev(state);
    this.emit("stateChanged", this.state, allKeys(this.state));
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Deserialize a saved game. Throws if the save version is incompatible.
   * Callers should catch SaveVersionError and prompt the player to start a new game.
   */
  deserialize(json: string): void {
    const parsed = JSON.parse(json) as Partial<GameState>;
    const version = parsed.saveVersion ?? 0;
    if (version !== SAVE_VERSION) {
      throw new SaveVersionError(
        "Major update – new game required",
        version,
        SAVE_VERSION,
      );
    }
    this.state = freezeInDev(parsed as GameState);
    this.emit("stateChanged", this.state, allKeys(this.state));
  }

  reset(seed?: number): void {
    const next = createDefaultState();
    if (seed !== undefined) next.seed = seed;
    this.state = freezeInDev(next);
    this.emit("stateChanged", this.state, allKeys(this.state));
  }
}

function allKeys(state: GameState): Set<keyof GameState> {
  return new Set(Object.keys(state) as (keyof GameState)[]);
}

/** Thrown when a saved game cannot be loaded due to incompatible version */
export class SaveVersionError extends Error {
  readonly savedVersion: number;
  readonly currentVersion: number;

  constructor(message: string, savedVersion: number, currentVersion: number) {
    super(message);
    this.name = "SaveVersionError";
    this.savedVersion = savedVersion;
    this.currentVersion = currentVersion;
  }
}

export const gameStore = new GameStore();
