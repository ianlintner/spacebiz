import { describe, it, expect } from "vitest";
import {
  initAdviserState,
  generateTurnMessages,
  checkTutorialAdvancement,
  consumeMessages,
  moodForEventCategory,
} from "../AdviserEngine.ts";
import {
  CargoType,
  ShipClass,
  PlanetType,
  ContractStatus,
} from "../../../data/types.ts";
import type {
  GameState,
  TurnResult,
  AdviserState,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
} from "../../../data/constants.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTurnResult(overrides: Partial<TurnResult> = {}): TurnResult {
  return {
    turn: 1,
    revenue: 5000,
    fuelCosts: 1000,
    maintenanceCosts: 2000,
    loanPayments: 0,
    tariffCosts: 0,
    otherCosts: 0,
    netProfit: 2000,
    cashAtEnd: 202000,
    cargoDelivered: {
      [CargoType.Passengers]: 0,
      [CargoType.RawMaterials]: 0,
      [CargoType.Food]: 100,
      [CargoType.Technology]: 0,
      [CargoType.Luxury]: 0,
      [CargoType.Hazmat]: 0,
      [CargoType.Medical]: 0,
    },
    passengersTransported: 0,
    eventsOccurred: [],
    routePerformance: [],
    aiSummaries: [],
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 5,
    maxTurns: MAX_TURNS,
    phase: "review",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "",
    galaxy: {
      sectors: [{ id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff }],
      empires: [],
      systems: [
        {
          id: "sys-1",
          name: "Alpha",
          sectorId: "sec-1",
          empireId: "emp-1",
          x: 100,
          y: 100,
          starColor: 0xffcc00,
        },
      ],
      planets: [
        {
          id: "planet-a",
          name: "Planet A",
          systemId: "sys-1",
          type: PlanetType.Terran,
          x: 110,
          y: 110,
          population: 1000000,
        },
      ],
    },
    fleet: [
      {
        id: "ship-1",
        name: "Test Ship",
        class: ShipClass.CargoShuttle,
        cargoCapacity: 80,
        passengerCapacity: 0,
        speed: 4,
        fuelEfficiency: 0.8,
        reliability: 92,
        age: 0,
        condition: 100,
        purchaseCost: 40000,
        maintenanceCost: 2000,
        assignedRouteId: "route-1",
      },
    ],
    activeRoutes: [
      {
        id: "route-1",
        originPlanetId: "planet-a",
        destinationPlanetId: "planet-b",
        distance: 50,
        assignedShipIds: ["ship-1"],
        cargoType: CargoType.Food,
      },
    ],
    market: {
      fuelPrice: BASE_FUEL_PRICE,
      fuelTrend: "stable",
      planetMarkets: {},
    },
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdviserEngine", () => {
  describe("initAdviserState", () => {
    it("returns a fresh adviser state", () => {
      const state = initAdviserState();
      expect(state.tutorialStepIndex).toBe(0);
      expect(state.tutorialComplete).toBe(false);
      expect(state.tutorialSkipped).toBe(false);
      expect(state.pendingMessages).toEqual([]);
      expect(state.shownMessageIds).toEqual([]);
    });
  });

  describe("generateTurnMessages — Phase 3 warnings", () => {
    it("warns when a contract is at risk", () => {
      const state = makeGameState({
        contracts: [
          {
            id: "c1",
            type: "empireUnlock" as never,
            cargoType: CargoType.Food,
            durationTurns: 10,
            turnsRemaining: 8,
            rewardCash: 5000,
            rewardReputation: 5,
            rewardResearchPoints: 0,
            rewardTariffReduction: null,
            depositPaid: 1000,
            turnsWithoutShip: 1,
            status: ContractStatus.Active,
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            targetEmpireId: "emp-1",
            linkedRouteId: "route-1",
          },
        ],
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const contractWarning = msgs.find(
        (m) => m.id === "warn_contract_at_risk",
      );
      expect(contractWarning).toBeDefined();
    });

    it("does not warn about contract risk when turnsWithoutShip is 0", () => {
      const state = makeGameState({
        contracts: [
          {
            id: "c1",
            type: "empireUnlock" as never,
            cargoType: CargoType.Food,
            durationTurns: 10,
            turnsRemaining: 8,
            rewardCash: 5000,
            rewardReputation: 5,
            rewardResearchPoints: 0,
            rewardTariffReduction: null,
            depositPaid: 1000,
            turnsWithoutShip: 0,
            status: ContractStatus.Active,
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            targetEmpireId: "emp-1",
            linkedRouteId: "route-1",
          },
        ],
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const contractWarning = msgs.find(
        (m) => m.id === "warn_contract_at_risk",
      );
      expect(contractWarning).toBeUndefined();
    });

    it("warns when route slots are full", () => {
      const state = makeGameState({
        routeSlots: 1,
        activeRoutes: [
          {
            id: "route-1",
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            distance: 50,
            assignedShipIds: ["ship-1"],
            cargoType: CargoType.Food,
          },
        ],
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const slotWarning = msgs.find((m) => m.id === "warn_route_slots_full");
      expect(slotWarning).toBeDefined();
    });

    it("warns when no active research and fewer than 20 techs", () => {
      const state = makeGameState({
        tech: {
          researchPoints: 0,
          completedTechIds: [],
          currentResearchId: null,
          researchProgress: 0,
        },
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const researchWarning = msgs.find((m) => m.id === "warn_no_research");
      expect(researchWarning).toBeDefined();
    });

    it("does not warn about research when 20+ techs completed", () => {
      const techIds = Array.from({ length: 20 }, (_, i) => `tech_${i}`);
      const state = makeGameState({
        tech: {
          researchPoints: 0,
          completedTechIds: techIds,
          currentResearchId: null,
          researchProgress: 0,
        },
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const researchWarning = msgs.find((m) => m.id === "warn_no_research");
      expect(researchWarning).toBeUndefined();
    });

    it("does not warn about research when currentResearchId is set", () => {
      const state = makeGameState({
        tech: {
          researchPoints: 0,
          completedTechIds: [],
          currentResearchId: "logistics_1",
          researchProgress: 0,
        },
      });
      const msgs = generateTurnMessages(state, makeTurnResult());
      const researchWarning = msgs.find((m) => m.id === "warn_no_research");
      expect(researchWarning).toBeUndefined();
    });
  });

  describe("checkTutorialAdvancement — Phase 3 triggers", () => {
    it("advances on firstContract trigger at step index 8", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        tutorialStepIndex: 8,
      };
      const result = checkTutorialAdvancement(adviser, "firstContract", 3);
      expect(result.tutorialStepIndex).toBe(9);
      expect(result.pendingMessages.length).toBe(1);
      expect(result.pendingMessages[0].id).toBe("tut_first_contract");
    });

    it("advances on firstResearch trigger at step index 9", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        tutorialStepIndex: 9,
      };
      const result = checkTutorialAdvancement(adviser, "firstResearch", 4);
      expect(result.tutorialStepIndex).toBe(10);
      expect(result.pendingMessages.length).toBe(1);
      expect(result.pendingMessages[0].id).toBe("tut_first_research");
    });

    it("advances on firstEmpireUnlock trigger at step index 10", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        tutorialStepIndex: 10,
      };
      const result = checkTutorialAdvancement(adviser, "firstEmpireUnlock", 5);
      expect(result.tutorialStepIndex).toBe(11);
      expect(result.pendingMessages.length).toBe(1);
      expect(result.pendingMessages[0].id).toBe("tut_first_empire_unlock");
    });

    it("does not advance if trigger does not match current step", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        tutorialStepIndex: 0, // expects newGame
      };
      const result = checkTutorialAdvancement(adviser, "firstContract", 1);
      expect(result.tutorialStepIndex).toBe(0);
      expect(result.pendingMessages).toEqual([]);
    });

    it("does not advance if tutorial already complete", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        tutorialComplete: true,
        tutorialStepIndex: 8,
      };
      const result = checkTutorialAdvancement(adviser, "firstContract", 1);
      expect(result.tutorialStepIndex).toBe(8);
    });
  });

  describe("consumeMessages", () => {
    it("removes consumed messages and tracks shown ids", () => {
      const adviser: AdviserState = {
        ...initAdviserState(),
        pendingMessages: [
          {
            id: "msg-1",
            text: "Hello",
            mood: "standby",
            priority: 1,
            context: "tip",
            turnGenerated: 1,
          },
          {
            id: "msg-2",
            text: "World",
            mood: "success",
            priority: 2,
            context: "tip",
            turnGenerated: 1,
          },
        ],
      };
      const { consumed, adviser: next } = consumeMessages(adviser, 1);
      expect(consumed.length).toBe(1);
      expect(consumed[0].id).toBe("msg-1");
      expect(next.pendingMessages.length).toBe(1);
      expect(next.shownMessageIds).toContain("msg-1");
    });
  });

  describe("moodForEventCategory", () => {
    it("maps hazard to alert", () => {
      expect(moodForEventCategory("hazard")).toBe("alert");
    });

    it("maps opportunity to success", () => {
      expect(moodForEventCategory("opportunity")).toBe("success");
    });

    it("maps market to analyzing", () => {
      expect(moodForEventCategory("market")).toBe("analyzing");
    });
  });
});
