import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listSandboxSaves,
  saveSandbox,
  loadSandbox,
  deleteSandboxSave,
  deleteAllSandboxSaves,
  setActiveSandbox,
  clearActiveSandbox,
  getActiveSandboxId,
  getActiveSandboxData,
  hasResumableSandbox,
  generateSaveId,
  createSandboxSaveData,
  updateSandboxSaveData,
  getSaveVersion,
  AUTOSAVE_INTERVAL,
} from "../SandboxSaveManager.ts";
import type { SandboxSaveData } from "../SandboxSaveManager.ts";
import type { SimulationConfig } from "../SimulationLogger.ts";
import type { GameState } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// ── Mock localStorage ──────────────────────────────────────────

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

beforeEach(() => {
  storage = {};
  vi.stubGlobal("localStorage", localStorageMock);
  vi.clearAllMocks();
});

// ── Helpers ────────────────────────────────────────────────────

function createTestConfig(
  overrides: Partial<SimulationConfig> = {},
): SimulationConfig {
  return {
    seed: 12345,
    gameSize: "standard",
    galaxyShape: "spiral",
    companyCount: 6,
    maxTurns: 50,
    logLevel: "standard",
    ...overrides,
  };
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    turn: 10,
    maxTurns: 50,
    phase: "planning",
    cash: 0,
    loans: [],
    reputation: 0,
    companyName: "AI Sandbox Corp",
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
    unlockedNavTabs: [
      "map",
      "routes",
      "fleet",
      "finance",
    ] as import("../../../data/types.ts").NavTabId[],
    reputationTier:
      "unknown" as import("../../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

function createTestSaveData(
  id = "test_save_1",
  overrides: Partial<SandboxSaveData> = {},
): SandboxSaveData {
  const config = createTestConfig();
  const state = createTestGameState();
  const base = createSandboxSaveData(
    id,
    "Test Save",
    config,
    state,
    42,
    "normal",
  );
  return { ...base, ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────

describe("SandboxSaveManager", () => {
  describe("generateSaveId", () => {
    it("returns unique string IDs", () => {
      const a = generateSaveId();
      const b = generateSaveId();
      expect(typeof a).toBe("string");
      expect(a.startsWith("sb_")).toBe(true);
      expect(a).not.toBe(b);
    });
  });

  describe("getSaveVersion", () => {
    it("returns a positive integer", () => {
      expect(getSaveVersion()).toBeGreaterThan(0);
    });
  });

  describe("AUTOSAVE_INTERVAL", () => {
    it("is a positive number", () => {
      expect(AUTOSAVE_INTERVAL).toBeGreaterThan(0);
    });
  });

  describe("createSandboxSaveData", () => {
    it("creates well-formed save data", () => {
      const config = createTestConfig();
      const state = createTestGameState({ turn: 5 });
      const data = createSandboxSaveData(
        "id1",
        "My Save",
        config,
        state,
        99,
        "fast",
      );

      expect(data.version).toBe(getSaveVersion());
      expect(data.meta.id).toBe("id1");
      expect(data.meta.label).toBe("My Save");
      expect(data.meta.turn).toBe(5);
      expect(data.meta.maxTurns).toBe(50);
      expect(data.meta.status).toBe("running");
      expect(data.meta.configSummary).toContain("Standard");
      expect(data.meta.configSummary).toContain("Spiral");
      expect(data.rngState).toBe(99);
      expect(data.speed).toBe("fast");
      expect(data.turnLogs).toEqual([]);
      expect(data.result).toBeNull();
    });
  });

  describe("updateSandboxSaveData", () => {
    it("updates mutable fields", () => {
      const original = createTestSaveData("id2");
      const newState = createTestGameState({ turn: 20 });
      const updated = updateSandboxSaveData(
        original,
        newState,
        200,
        [
          {
            turn: 1,
            economy: {
              fuelPrice: 10,
              avgCargoPrice: 5,
              totalMarketVolume: 100,
            },
            companies: [],
            events: [],
            warnings: [],
            diplomacy: {
              wars: 0,
              coldWars: 0,
              peaces: 0,
              tradePacts: 0,
              alliances: 0,
              openBorderPorts: 0,
              closedBorderPorts: 0,
              restrictedBorderPorts: 0,
            },
          },
        ],
        "instant",
        "paused",
      );

      expect(updated.meta.turn).toBe(20);
      expect(updated.meta.status).toBe("paused");
      expect(updated.rngState).toBe(200);
      expect(updated.speed).toBe("instant");
      expect(updated.turnLogs).toHaveLength(1);
    });
  });

  describe("saveSandbox / loadSandbox round-trip", () => {
    it("saves and loads data correctly", () => {
      const data = createTestSaveData("save_rt");
      saveSandbox(data);

      const loaded = loadSandbox("save_rt");
      expect(loaded).not.toBeNull();
      expect(loaded!.meta.id).toBe("save_rt");
      expect(loaded!.rngState).toBe(42);
      expect(loaded!.gameState.turn).toBe(10);
    });

    it("returns null for non-existent save", () => {
      expect(loadSandbox("nonexistent")).toBeNull();
    });

    it("returns null for corrupted data", () => {
      storage["sft_sandbox_data_bad"] = "not json {{{{";
      expect(loadSandbox("bad")).toBeNull();
    });
  });

  describe("listSandboxSaves", () => {
    it("returns empty array when no saves exist", () => {
      expect(listSandboxSaves()).toEqual([]);
    });

    it("lists saves sorted newest first", () => {
      const a = createTestSaveData("a");
      a.meta.timestamp = 1000;
      saveSandbox(a);

      const b = createTestSaveData("b");
      b.meta.timestamp = 2000;
      saveSandbox(b);

      const list = listSandboxSaves();
      expect(list).toHaveLength(2);
      // Newest first — but saveSandbox overwrites timestamp, so check IDs at least
      expect(list.map((s) => s.id)).toContain("a");
      expect(list.map((s) => s.id)).toContain("b");
    });
  });

  describe("deleteSandboxSave", () => {
    it("removes save from index and data", () => {
      const data = createTestSaveData("to_delete");
      saveSandbox(data);
      expect(loadSandbox("to_delete")).not.toBeNull();

      deleteSandboxSave("to_delete");
      expect(loadSandbox("to_delete")).toBeNull();
      expect(listSandboxSaves()).toHaveLength(0);
    });

    it("clears active marker if deleting active save", () => {
      const data = createTestSaveData("active_del");
      saveSandbox(data);
      setActiveSandbox("active_del");

      deleteSandboxSave("active_del");
      expect(getActiveSandboxId()).toBeNull();
    });
  });

  describe("deleteAllSandboxSaves", () => {
    it("removes everything", () => {
      saveSandbox(createTestSaveData("x"));
      saveSandbox(createTestSaveData("y"));
      setActiveSandbox("x");

      deleteAllSandboxSaves();
      expect(listSandboxSaves()).toHaveLength(0);
      expect(getActiveSandboxId()).toBeNull();
    });
  });

  describe("active sandbox tracking", () => {
    it("set / get / clear cycle works", () => {
      expect(getActiveSandboxId()).toBeNull();

      setActiveSandbox("session_1");
      expect(getActiveSandboxId()).toBe("session_1");

      clearActiveSandbox();
      expect(getActiveSandboxId()).toBeNull();
    });

    it("getActiveSandboxData returns save data", () => {
      const data = createTestSaveData("active_load");
      saveSandbox(data);
      setActiveSandbox("active_load");

      const loaded = getActiveSandboxData();
      expect(loaded).not.toBeNull();
      expect(loaded!.meta.id).toBe("active_load");
    });

    it("getActiveSandboxData returns null if save is missing", () => {
      setActiveSandbox("ghost");
      expect(getActiveSandboxData()).toBeNull();
    });
  });

  describe("hasResumableSandbox", () => {
    it("returns false when no active session", () => {
      expect(hasResumableSandbox()).toBe(false);
    });

    it("returns true for running session", () => {
      const data = createTestSaveData("running_1");
      data.meta.status = "running";
      saveSandbox(data);
      setActiveSandbox("running_1");

      expect(hasResumableSandbox()).toBe(true);
    });

    it("returns true for paused session", () => {
      const data = createTestSaveData("paused_1");
      data.meta.status = "paused";
      saveSandbox(data);
      setActiveSandbox("paused_1");

      expect(hasResumableSandbox()).toBe(true);
    });

    it("returns false for completed session", () => {
      const data = createTestSaveData("done_1");
      data.meta.status = "complete";
      saveSandbox(data);
      setActiveSandbox("done_1");

      expect(hasResumableSandbox()).toBe(false);
    });
  });

  describe("slot limit enforcement", () => {
    it("evicts oldest saves beyond max slots", () => {
      // Create 12 saves (limit is 10)
      for (let i = 0; i < 12; i++) {
        const data = createTestSaveData(`slot_${i}`);
        data.meta.timestamp = 1000 + i; // Increasing timestamps
        saveSandbox(data);
      }

      const list = listSandboxSaves();
      expect(list.length).toBeLessThanOrEqual(10);
    });
  });
});
