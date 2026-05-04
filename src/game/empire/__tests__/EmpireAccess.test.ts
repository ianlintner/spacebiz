import { describe, it, expect } from "vitest";
import {
  findAdjacentEmpires,
  isEmpireAccessible,
  getEmpireForPlanet,
  checkTradePolicyViolation,
  checkCargoLockViolation,
  validateRouteCreation,
} from "../EmpireAccessManager.ts";
import type {
  GameState,
  Empire,
  StarSystem,
  EmpireTradePolicyEntry,
  InterEmpireCargoLock,
} from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { createNewGame } from "../../NewGameSetup.ts";

function makeEmpire(id: string, homeSystemId: string): Empire {
  return {
    id,
    name: `Empire ${id}`,
    homeSystemId,
    color: 0xffffff,
    tariffRate: 0.1,
    disposition: "neutral",
    leaderName: `Leader ${id}`,
    leaderPortrait: { portraitId: "leader-01", category: "human" },
  };
}

function makeSystem(
  id: string,
  empireId: string,
  x: number,
  y: number,
): StarSystem {
  return {
    id,
    name: `System ${id}`,
    sectorId: "sector-1",
    empireId,
    x,
    y,
    starColor: 0xffffff,
  };
}

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
    playerEmpireId: "empire-1",
    galaxy: {
      sectors: [],
      empires: [
        makeEmpire("empire-1", "system-1"),
        makeEmpire("empire-2", "system-2"),
        makeEmpire("empire-3", "system-3"),
      ],
      systems: [
        makeSystem("system-1", "empire-1", 0, 0),
        makeSystem("system-2", "empire-2", 10, 0),
        makeSystem("system-3", "empire-3", 0, 20),
      ],
      planets: [
        {
          id: "planet-1",
          name: "P1",
          systemId: "system-1",
          type: "frontier",
          x: 0,
          y: 0,
          population: 1000,
        },
        {
          id: "planet-2",
          name: "P2",
          systemId: "system-2",
          type: "techWorld",
          x: 10,
          y: 0,
          population: 1000,
        },
        {
          id: "planet-3",
          name: "P3",
          systemId: "system-3",
          type: "mining",
          x: 0,
          y: 20,
          population: 1000,
        },
      ],
    },
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
    unlockedEmpireIds: ["empire-1", "empire-2"],
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

describe("Empire Access", () => {
  describe("findAdjacentEmpires", () => {
    it("returns closest empires by distance", () => {
      const empires = [
        makeEmpire("empire-1", "system-1"),
        makeEmpire("empire-2", "system-2"),
        makeEmpire("empire-3", "system-3"),
      ];
      const systems = [
        makeSystem("system-1", "empire-1", 0, 0),
        makeSystem("system-2", "empire-2", 10, 0), // dist 10
        makeSystem("system-3", "empire-3", 0, 20), // dist 20
      ];

      const adj = findAdjacentEmpires("empire-1", empires, systems, 1);
      expect(adj).toEqual(["empire-2"]);
    });

    it("returns multiple adjacent empires up to count", () => {
      const empires = [
        makeEmpire("empire-1", "system-1"),
        makeEmpire("empire-2", "system-2"),
        makeEmpire("empire-3", "system-3"),
      ];
      const systems = [
        makeSystem("system-1", "empire-1", 0, 0),
        makeSystem("system-2", "empire-2", 10, 0),
        makeSystem("system-3", "empire-3", 0, 20),
      ];

      const adj = findAdjacentEmpires("empire-1", empires, systems, 2);
      expect(adj).toHaveLength(2);
      expect(adj).toContain("empire-2");
      expect(adj).toContain("empire-3");
    });

    it("returns empty array for unknown empire", () => {
      const adj = findAdjacentEmpires("unknown", [], [], 2);
      expect(adj).toEqual([]);
    });
  });

  describe("isEmpireAccessible", () => {
    it("returns true for unlocked empires", () => {
      const state = createTestState({ unlockedEmpireIds: ["empire-1"] });
      expect(isEmpireAccessible("empire-1", state)).toBe(true);
    });

    it("returns false for locked empires", () => {
      const state = createTestState({ unlockedEmpireIds: ["empire-1"] });
      expect(isEmpireAccessible("empire-3", state)).toBe(false);
    });
  });

  describe("getEmpireForPlanet", () => {
    it("returns the empire ID for a planet", () => {
      const systems = [makeSystem("system-1", "empire-1", 0, 0)];
      const planets = [{ id: "planet-1", systemId: "system-1" }];
      expect(getEmpireForPlanet("planet-1", systems, planets)).toBe("empire-1");
    });

    it("returns null for unknown planet", () => {
      expect(getEmpireForPlanet("unknown", [], [])).toBeNull();
    });
  });

  describe("checkTradePolicyViolation", () => {
    it("returns null when no policies exist", () => {
      expect(
        checkTradePolicyViolation("empire-1", "empire-2", "food", {}),
      ).toBeNull();
    });

    it("detects export ban", () => {
      const policies: Record<string, EmpireTradePolicyEntry> = {
        "empire-1": {
          policy: "exportBan",
          bannedImports: [],
          bannedExports: ["food"],
          tariffSurcharge: 0,
        },
      };
      const result = checkTradePolicyViolation(
        "empire-1",
        "empire-2",
        "food",
        policies,
      );
      expect(result).toContain("banned");
    });

    it("detects import ban", () => {
      const policies: Record<string, EmpireTradePolicyEntry> = {
        "empire-2": {
          policy: "importBan",
          bannedImports: ["technology"],
          bannedExports: [],
          tariffSurcharge: 0,
        },
      };
      const result = checkTradePolicyViolation(
        "empire-1",
        "empire-2",
        "technology",
        policies,
      );
      expect(result).toContain("banned");
    });

    it("allows non-banned cargo", () => {
      const policies: Record<string, EmpireTradePolicyEntry> = {
        "empire-1": {
          policy: "exportBan",
          bannedImports: [],
          bannedExports: ["food"],
          tariffSurcharge: 0,
        },
      };
      expect(
        checkTradePolicyViolation(
          "empire-1",
          "empire-2",
          "technology",
          policies,
        ),
      ).toBeNull();
    });
  });

  describe("checkCargoLockViolation", () => {
    it("returns null for same-empire routes", () => {
      const state = createTestState();
      expect(
        checkCargoLockViolation("empire-1", "empire-1", "food", [], state),
      ).toBeNull();
    });

    it("allows first cargo type on new empire pair", () => {
      const state = createTestState();
      expect(
        checkCargoLockViolation("empire-1", "empire-2", "food", [], state),
      ).toBeNull();
    });

    it("allows same cargo type already locked", () => {
      const state = createTestState();
      const locks: InterEmpireCargoLock[] = [
        {
          originEmpireId: "empire-1",
          destinationEmpireId: "empire-2",
          cargoType: "food",
          routeId: "r1",
        },
      ];
      expect(
        checkCargoLockViolation("empire-1", "empire-2", "food", locks, state),
      ).toBeNull();
    });

    it("blocks exceeding cargo-per-pair limit", () => {
      const state = createTestState();
      const locks: InterEmpireCargoLock[] = [
        {
          originEmpireId: "empire-1",
          destinationEmpireId: "empire-2",
          cargoType: "food",
          routeId: "r1",
        },
      ];
      // BASE_CARGO_TYPES_PER_PAIR = 1, so adding a second type should fail
      const result = checkCargoLockViolation(
        "empire-1",
        "empire-2",
        "technology",
        locks,
        state,
      );
      expect(result).toContain("Maximum");
    });
  });

  describe("validateRouteCreation", () => {
    it("allows route within accessible empires", () => {
      const state = createTestState({
        unlockedEmpireIds: ["empire-1", "empire-2"],
      });
      const result = validateRouteCreation(
        "planet-1",
        "planet-2",
        "food",
        state,
      );
      expect(result).toBeNull();
    });

    it("blocks route to locked empire", () => {
      const state = createTestState({
        unlockedEmpireIds: ["empire-1"],
      });
      const result = validateRouteCreation(
        "planet-1",
        "planet-2",
        "food",
        state,
      );
      expect(result).toContain("not yet accessible");
    });

    it("blocks route when no slots available", () => {
      // planet-1 → planet-2 is cross-empire (empire-1 → empire-2), so the
      // galactic-tier slot pool is the one that needs to be exhausted.
      const state = createTestState({
        routeSlots: 0,
        galacticRouteSlots: 0,
        unlockedEmpireIds: ["empire-1", "empire-2"],
      });
      const result = validateRouteCreation(
        "planet-1",
        "planet-2",
        "food",
        state,
      );
      expect(result).toMatch(/No available .*route slots/);
    });

    it("requires different planets even for same-system routes", () => {
      const state = createTestState({
        unlockedEmpireIds: ["empire-1", "empire-2"],
      });

      const result = validateRouteCreation(
        "planet-1",
        "planet-1",
        "food",
        state,
      );

      expect(result).toContain("different planets");
    });

    it("blocks cross-system routes when no hyperlane path exists", () => {
      const state = createTestState({
        unlockedEmpireIds: ["empire-1", "empire-2"],
        hyperlanes: [
          {
            id: "hyperlane-23",
            systemA: "system-2",
            systemB: "system-3",
            distance: 8,
          },
        ],
        borderPorts: [],
      });

      const result = validateRouteCreation(
        "planet-1",
        "planet-2",
        "food",
        state,
      );

      expect(result).toContain("No hyperlane path exists");
    });

    it("blocks banned cargo on inter-empire routes", () => {
      const state = createTestState({
        unlockedEmpireIds: ["empire-1", "empire-2"],
        empireTradePolicies: {
          "empire-2": {
            policy: "importBan",
            bannedImports: ["food"],
            bannedExports: [],
            tariffSurcharge: 0,
          },
        },
      });
      const result = validateRouteCreation(
        "planet-1",
        "planet-2",
        "food",
        state,
      );
      expect(result).toContain("banned");
    });
  });

  describe("validateRouteCreation — system-pair cargo uniqueness", () => {
    function makeMinimalState(
      routes: import("../../../data/types.ts").ActiveRoute[],
    ): import("../../../data/types.ts").GameState {
      const { state } = createNewGame(1, "Test Corp", "quick");
      const sys1: import("../../../data/types.ts").StarSystem = {
        id: "test-sys-1",
        name: "System Alpha",
        sectorId: "s1",
        empireId: state.galaxy.empires[0]?.id ?? "emp1",
        x: 0,
        y: 0,
        starColor: 0xffffff,
      };
      const sys2: import("../../../data/types.ts").StarSystem = {
        id: "test-sys-2",
        name: "System Beta",
        sectorId: "s1",
        empireId: state.galaxy.empires[0]?.id ?? "emp1",
        x: 100,
        y: 0,
        starColor: 0xffffff,
      };
      const planet1: import("../../../data/types.ts").Planet = {
        id: "tp-1",
        name: "Alpha Prime",
        systemId: "test-sys-1",
        type: "agricultural" as import("../../../data/types.ts").PlanetType,
        x: 0,
        y: 0,
        population: 100000,
      };
      const planet2: import("../../../data/types.ts").Planet = {
        id: "tp-2",
        name: "Beta Prime",
        systemId: "test-sys-2",
        type: "coreWorld" as import("../../../data/types.ts").PlanetType,
        x: 100,
        y: 0,
        population: 500000,
      };
      return {
        ...state,
        activeRoutes: routes,
        galaxy: {
          ...state.galaxy,
          systems: [...state.galaxy.systems, sys1, sys2],
          planets: [...state.galaxy.planets, planet1, planet2],
        },
      };
    }

    it("blocks a second Food route between the same system pair", () => {
      const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
        id: "existing-1",
        originPlanetId: "tp-1",
        destinationPlanetId: "tp-2",
        distance: 100,
        assignedShipIds: [],
        cargoType: "food" as import("../../../data/types.ts").CargoType,
      };
      const state = makeMinimalState([existingFoodRoute]);

      const error = validateRouteCreation(
        "tp-1",
        "tp-2",
        "food" as import("../../../data/types.ts").CargoType,
        state,
      );
      expect(error).toMatch(/system pair.*food/i);
    });

    it("allows a second route between the same system pair with different cargo", () => {
      const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
        id: "existing-1",
        originPlanetId: "tp-1",
        destinationPlanetId: "tp-2",
        distance: 100,
        assignedShipIds: [],
        cargoType: "food" as import("../../../data/types.ts").CargoType,
      };
      const state = makeMinimalState([existingFoodRoute]);

      const error = validateRouteCreation(
        "tp-1",
        "tp-2",
        "technology" as import("../../../data/types.ts").CargoType,
        state,
      );
      if (error) {
        expect(error).not.toMatch(/system pair/i);
      }
    });

    it("blocks a Food route even when origin and destination are swapped (bidirectional)", () => {
      const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
        id: "existing-1",
        originPlanetId: "tp-2",
        destinationPlanetId: "tp-1",
        distance: 100,
        assignedShipIds: [],
        cargoType: "food" as import("../../../data/types.ts").CargoType,
      };
      const state = makeMinimalState([existingFoodRoute]);

      const error = validateRouteCreation(
        "tp-1",
        "tp-2",
        "food" as import("../../../data/types.ts").CargoType,
        state,
      );
      expect(error).toMatch(/system pair.*food/i);
    });
  });
});
