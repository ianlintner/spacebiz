import { describe, it, expect } from "vitest";
import { buildTurnBrief } from "../TurnBriefBuilder.ts";
import type {
  GameState,
  Ship,
  ActiveRoute,
  Contract,
  RouteMarketEntry,
  NavTabId,
  ReputationTier,
} from "../../../data/types.ts";
import { ShipClass, CargoType, ContractStatus, ContractType } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { MAX_TURNS } from "../../../data/constants.ts";

// ── Minimal state fixture ─────────────────────────────────────────────────

function makeShip(overrides: Partial<Ship> = {}): Ship {
  return {
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
    ...overrides,
  };
}

function makeRoute(overrides: Partial<ActiveRoute> = {}): ActiveRoute {
  return {
    id: "route-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    distance: 50,
    assignedShipIds: ["ship-1"],
    cargoType: CargoType.Food,
    ...overrides,
  };
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    type: ContractType.EmergencySupply,
    targetEmpireId: null,
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    cargoType: CargoType.Food,
    durationTurns: 5,
    turnsRemaining: 3,
    rewardCash: 10000,
    rewardReputation: 5,
    rewardResearchPoints: 0,
    rewardTariffReduction: null,
    depositPaid: 0,
    status: ContractStatus.Active,
    linkedRouteId: null,
    turnsWithoutShip: 0,
    ...overrides,
  };
}

function makeRouteMarketEntry(overrides: Partial<RouteMarketEntry> = {}): RouteMarketEntry {
  return {
    id: "rme-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    cargoType: CargoType.Food,
    estimatedProfitMin: 1000,
    estimatedProfitMax: 2000,
    exactProfitPerTurn: null,
    riskTags: [],
    scouted: false,
    expiresOnTurn: 10,
    claimedByAiId: null,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: 200000,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard" as const,
    galaxyShape: "spiral" as const,
    playerEmpireId: "",
    galaxy: {
      sectors: [],
      empires: [],
      systems: [],
      planets: [],
    },
    fleet: [makeShip()],
    activeRoutes: [makeRoute()],
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
      currentResearchId: "logistics-1", // queued so no "no research" card by default
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
    unlockedNavTabs: ["map", "routes", "fleet", "finance"] as NavTabId[],
    reputationTier: "unknown" as ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("buildTurnBrief", () => {
  it("returns empty array when there are no issues", () => {
    // Healthy state: has routes, ships are on routes, research queued
    const state = makeGameState();
    const cards = buildTurnBrief(state);
    expect(cards).toHaveLength(0);
  });

  it("produces a critical warning card when a ship condition is below 30", () => {
    const state = makeGameState({
      fleet: [makeShip({ condition: 20, name: "Broken Freighter" })],
    });
    const cards = buildTurnBrief(state);
    const shipCard = cards.find((c) => c.title === "Ship Critical");
    expect(shipCard).toBeDefined();
    expect(shipCard?.urgency).toBe("critical");
    expect(shipCard?.category).toBe("warning");
    expect(shipCard?.summary).toContain("Broken Freighter");
    expect(shipCard?.linkedId).toBe("ship-1");
  });

  it("produces a medium info card for idle (unassigned) ships", () => {
    const state = makeGameState({
      fleet: [makeShip({ assignedRouteId: null })],
    });
    const cards = buildTurnBrief(state);
    const idleCard = cards.find((c) => c.title === "Idle Ships");
    expect(idleCard).toBeDefined();
    expect(idleCard?.urgency).toBe("medium");
    expect(idleCard?.summary).toContain("1 ship(s)");
  });

  it("caps results at 4 cards even when many issues exist", () => {
    // Create multiple issues that would generate many cards
    const ships = [
      makeShip({ id: "s1", condition: 10, name: "Ship 1", assignedRouteId: null }),
      makeShip({ id: "s2", condition: 5, name: "Ship 2", assignedRouteId: null }),
      makeShip({ id: "s3", condition: 15, name: "Ship 3", assignedRouteId: null }),
    ];
    const contracts = [
      makeContract({ id: "c1", turnsRemaining: 1 }),
      makeContract({ id: "c2", turnsRemaining: 1 }),
    ];
    const state = makeGameState({
      fleet: ships,
      activeRoutes: [],
      contracts,
      tech: { researchPoints: 0, completedTechIds: [], currentResearchId: null, researchProgress: 0 },
    });
    const cards = buildTurnBrief(state);
    expect(cards.length).toBeLessThanOrEqual(4);
  });

  it("sorts cards by urgency: critical before high before medium before low", () => {
    // Build a state where we get critical (ship), high (contract in 2 turns),
    // medium (idle ship), and low (no research).
    const state = makeGameState({
      fleet: [
        makeShip({ id: "s1", condition: 20, name: "Dying Ship", assignedRouteId: null }),
      ],
      activeRoutes: [makeRoute()],
      contracts: [makeContract({ id: "c1", turnsRemaining: 2 })],
      tech: {
        researchPoints: 0,
        completedTechIds: [],
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    const cards = buildTurnBrief(state);

    // Check relative ordering: no card should appear before a card of higher urgency
    const urgencyRank: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    for (let i = 1; i < cards.length; i++) {
      expect(urgencyRank[cards[i].urgency]).toBeGreaterThanOrEqual(
        urgencyRank[cards[i - 1].urgency],
      );
    }
    // The first card must be the ship critical warning
    expect(cards[0].urgency).toBe("critical");
  });

  it("produces a critical card for contracts expiring next turn", () => {
    const state = makeGameState({
      contracts: [makeContract({ turnsRemaining: 1 })],
    });
    const cards = buildTurnBrief(state);
    const contractCard = cards.find((c) => c.category === "contract");
    expect(contractCard).toBeDefined();
    expect(contractCard?.urgency).toBe("critical");
  });

  it("produces a high urgency card for contracts expiring in 2 turns", () => {
    const state = makeGameState({
      contracts: [makeContract({ turnsRemaining: 2 })],
    });
    const cards = buildTurnBrief(state);
    const contractCard = cards.find((c) => c.category === "contract");
    expect(contractCard).toBeDefined();
    expect(contractCard?.urgency).toBe("high");
  });

  it("produces a critical warning when no active routes exist", () => {
    const state = makeGameState({ activeRoutes: [], fleet: [] });
    const cards = buildTurnBrief(state);
    const routeCard = cards.find((c) => c.title === "No Active Routes");
    expect(routeCard).toBeDefined();
    expect(routeCard?.urgency).toBe("critical");
  });

  it("produces a research card when no research is queued", () => {
    const state = makeGameState({
      tech: {
        researchPoints: 0,
        completedTechIds: [],
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    const cards = buildTurnBrief(state);
    const researchCard = cards.find((c) => c.category === "research");
    expect(researchCard).toBeDefined();
    expect(researchCard?.urgency).toBe("low");
  });

  it("produces an opportunity card when a route market entry expires soon", () => {
    const state = makeGameState({
      turn: 5,
      routeMarket: [makeRouteMarketEntry({ expiresOnTurn: 6 })], // expires at turn+1
    });
    const cards = buildTurnBrief(state);
    const oppCard = cards.find((c) => c.category === "opportunity");
    expect(oppCard).toBeDefined();
    expect(oppCard?.urgency).toBe("high");
  });
});
