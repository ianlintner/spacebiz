import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveGame,
  loadGame,
  hasSaveGame,
  deleteSave,
  autoSave,
  loadAutoSave,
  deleteAutoSave,
  loadGameIntoStore,
} from "../SaveManager.ts";
import { gameStore } from "../../data/GameStore.ts";
import type { GameState } from "../../data/types.ts";
import { initAdviserState } from "../adviser/AdviserEngine.ts";

/** Minimal but complete GameState for testing purposes. */
function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 3,
    maxTurns: 20,
    phase: "planning",
    cash: 150000,
    loans: [],
    reputation: 55,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "",
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    fleet: [],
    activeRoutes: [],
    market: { fuelPrice: 12, fuelTrend: "stable", planetMarkets: {} },
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
    stationHub: null,
    saveVersion: 6,
    actionPoints: { current: 2, max: 2 },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: ["map", "routes", "fleet", "finance"] as import("../../data/types.ts").NavTabId[],
    reputationTier: "unknown" as import("../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
let storage: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    storage = {};
  }),
  get length() {
    return Object.keys(storage).length;
  },
  key: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
};

// Install mock before each test
beforeEach(() => {
  storage = {};
  vi.stubGlobal("localStorage", localStorageMock);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SaveManager", () => {
  // -------------------------------------------------------------------------
  // saveGame / loadGame round-trip
  // -------------------------------------------------------------------------
  describe("saveGame / loadGame", () => {
    it("round-trips all GameState data", () => {
      const state = createTestState({
        cash: 77777,
        turn: 7,
        companyName: "Round-Trip Inc.",
        reputation: 80,
      });

      saveGame(state);
      const loaded = loadGame();

      expect(loaded).not.toBeNull();
      expect(loaded!.cash).toBe(77777);
      expect(loaded!.turn).toBe(7);
      expect(loaded!.companyName).toBe("Round-Trip Inc.");
      expect(loaded!.reputation).toBe(80);
      expect(loaded!.seed).toBe(42);
      expect(loaded!.maxTurns).toBe(20);
      expect(loaded!.phase).toBe("planning");
      expect(loaded!.gameOver).toBe(false);
    });

    it("preserves nested galaxy data", () => {
      const state = createTestState({
        galaxy: {
          sectors: [
            { id: "s1", name: "Alpha", x: 100, y: 200, color: 0xff0000 },
          ],
          empires: [],
          systems: [
            {
              id: "sys1",
              name: "Sol",
              sectorId: "s1",
              empireId: "emp-1",
              x: 120,
              y: 220,
              starColor: 0xffff00,
            },
          ],
          planets: [
            {
              id: "p1",
              name: "Terra",
              systemId: "sys1",
              type: "terran",
              x: 130,
              y: 230,
              population: 1000000,
            },
          ],
        },
      });

      saveGame(state);
      const loaded = loadGame();

      expect(loaded!.galaxy.sectors).toHaveLength(1);
      expect(loaded!.galaxy.sectors[0].name).toBe("Alpha");
      expect(loaded!.galaxy.systems).toHaveLength(1);
      expect(loaded!.galaxy.systems[0].name).toBe("Sol");
      expect(loaded!.galaxy.planets).toHaveLength(1);
      expect(loaded!.galaxy.planets[0].name).toBe("Terra");
    });

    it("stores turn number and timestamp in the envelope", () => {
      const state = createTestState({ turn: 5 });
      saveGame(state);

      const raw = storage["sft_save"];
      const envelope = JSON.parse(raw);

      expect(envelope.version).toBe(1);
      expect(envelope.turn).toBe(5);
      expect(typeof envelope.timestamp).toBe("number");
      expect(envelope.timestamp).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // hasSaveGame
  // -------------------------------------------------------------------------
  describe("hasSaveGame", () => {
    it("returns false when no save exists", () => {
      expect(hasSaveGame()).toBe(false);
    });

    it("returns true after saving", () => {
      saveGame(createTestState());
      expect(hasSaveGame()).toBe(true);
    });

    it("returns false after deleteSave", () => {
      saveGame(createTestState());
      expect(hasSaveGame()).toBe(true);
      deleteSave();
      expect(hasSaveGame()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // loadGame with corrupted data
  // -------------------------------------------------------------------------
  describe("loadGame with corrupted data", () => {
    it("returns null for invalid JSON", () => {
      storage["sft_save"] = "not-json{{{";
      expect(loadGame()).toBeNull();
    });

    it("returns null for valid JSON but wrong structure", () => {
      storage["sft_save"] = JSON.stringify({ foo: "bar" });
      expect(loadGame()).toBeNull();
    });

    it("returns null for missing version field", () => {
      storage["sft_save"] = JSON.stringify({
        timestamp: Date.now(),
        turn: 1,
        state: createTestState(),
      });
      expect(loadGame()).toBeNull();
    });

    it("returns null for missing state field", () => {
      storage["sft_save"] = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        turn: 1,
      });
      expect(loadGame()).toBeNull();
    });

    it("returns null when localStorage has no entry", () => {
      expect(loadGame()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // deleteSave
  // -------------------------------------------------------------------------
  describe("deleteSave", () => {
    it("removes the save data from localStorage", () => {
      saveGame(createTestState());
      expect(storage["sft_save"]).toBeDefined();

      deleteSave();
      expect(storage["sft_save"]).toBeUndefined();
    });

    it("is safe to call when no save exists", () => {
      expect(() => deleteSave()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // autoSave / loadAutoSave
  // -------------------------------------------------------------------------
  describe("autoSave / loadAutoSave", () => {
    it("saves and loads under the autosave key", () => {
      const state = createTestState({ turn: 10, cash: 5000 });
      autoSave(state);

      const loaded = loadAutoSave();
      expect(loaded).not.toBeNull();
      expect(loaded!.turn).toBe(10);
      expect(loaded!.cash).toBe(5000);
    });

    it("autosave is independent of manual save", () => {
      const manualState = createTestState({ turn: 3, companyName: "Manual" });
      const autoState = createTestState({ turn: 8, companyName: "Auto" });

      saveGame(manualState);
      autoSave(autoState);

      expect(loadGame()!.companyName).toBe("Manual");
      expect(loadAutoSave()!.companyName).toBe("Auto");
    });

    it("deleteAutoSave removes only the auto-save", () => {
      saveGame(createTestState({ companyName: "Manual" }));
      autoSave(createTestState({ companyName: "Auto" }));

      deleteAutoSave();

      expect(loadAutoSave()).toBeNull();
      expect(loadGame()!.companyName).toBe("Manual");
    });
  });

  // -------------------------------------------------------------------------
  // loadGameIntoStore
  // -------------------------------------------------------------------------
  describe("loadGameIntoStore", () => {
    it("restores saved state into gameStore and returns true", () => {
      const state = createTestState({
        cash: 333333,
        companyName: "Stored Corp",
      });
      saveGame(state);

      const result = loadGameIntoStore();

      expect(result).toBe(true);
      expect(gameStore.getState().cash).toBe(333333);
      expect(gameStore.getState().companyName).toBe("Stored Corp");
    });

    it("returns false when no save exists", () => {
      const result = loadGameIntoStore();
      expect(result).toBe(false);
    });
  });
});
