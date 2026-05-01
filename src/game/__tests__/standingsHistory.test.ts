import { describe, it, expect } from "vitest";
import {
  buildStandingsData,
  computeRanks,
  rivalBandBounds,
  selectFlagshipClass,
} from "../standingsHistory.ts";
import type {
  AICompany,
  AITurnSummary,
  GameState,
  Ship,
  TurnResult,
} from "../../data/types.ts";
import { ShipClass } from "../../data/types.ts";
import { initAdviserState } from "../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeShip(cls: ShipClass, id = "s"): Ship {
  return {
    id,
    name: id,
    class: cls,
    cargoCapacity: 100,
    passengerCapacity: 0,
    speed: 1,
    fuelEfficiency: 1,
    reliability: 1,
    age: 0,
    condition: 1,
    purchaseCost: 0,
    maintenanceCost: 0,
    assignedRouteId: null,
  };
}

function makeAICompany(
  id: string,
  overrides: Partial<AICompany> = {},
): AICompany {
  return {
    id,
    name: id.toUpperCase(),
    empireId: "e1",
    cash: 100000,
    fleet: [],
    activeRoutes: [],
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "Test CEO",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    ...overrides,
  };
}

function makeAISummary(
  companyId: string,
  overrides: Partial<AITurnSummary> = {},
): AITurnSummary {
  return {
    companyId,
    companyName: companyId.toUpperCase(),
    revenue: 0,
    netProfit: 0,
    cashAtEnd: 100000,
    routeCount: 1,
    fleetSize: 1,
    bankrupt: false,
    ...overrides,
  };
}

function makeTurnResult(
  turn: number,
  overrides: Partial<TurnResult> = {},
): TurnResult {
  return {
    turn,
    revenue: 0,
    fuelCosts: 0,
    maintenanceCosts: 0,
    loanPayments: 0,
    tariffCosts: 0,
    otherCosts: 0,
    netProfit: 0,
    cashAtEnd: 100000,
    cargoDelivered: {} as TurnResult["cargoDelivered"],
    passengersTransported: 0,
    eventsOccurred: [],
    routePerformance: [],
    aiSummaries: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    turn: 5,
    maxTurns: 20,
    phase: "planning",
    cash: 250000,
    loans: [],
    reputation: 50,
    companyName: "Player Co",
    ceoName: "P",
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
    unlockedNavTabs: [
      "map",
      "routes",
      "fleet",
      "finance",
    ] as import("../../data/types.ts").NavTabId[],
    reputationTier: "unknown" as import("../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// selectFlagshipClass
// ---------------------------------------------------------------------------

describe("selectFlagshipClass", () => {
  it("returns CargoShuttle for an empty fleet", () => {
    expect(selectFlagshipClass([])).toBe(ShipClass.CargoShuttle);
  });

  it("picks the highest purchaseCost class (MegaHauler > CargoShuttle)", () => {
    const fleet = [
      makeShip(ShipClass.CargoShuttle, "s1"),
      makeShip(ShipClass.MegaHauler, "s2"),
      makeShip(ShipClass.FastCourier, "s3"),
    ];
    expect(selectFlagshipClass(fleet)).toBe(ShipClass.MegaHauler);
  });

  it("breaks ties by first-encountered ship", () => {
    const fleet = [
      makeShip(ShipClass.CargoShuttle, "s1"),
      makeShip(ShipClass.CargoShuttle, "s2"),
    ];
    expect(selectFlagshipClass(fleet)).toBe(ShipClass.CargoShuttle);
  });
});

// ---------------------------------------------------------------------------
// rivalBandBounds
// ---------------------------------------------------------------------------

describe("rivalBandBounds", () => {
  it("computes ±15% bounds", () => {
    const { lower, upper } = rivalBandBounds(100);
    expect(upper).toBeCloseTo(115);
    expect(lower).toBeCloseTo(85);
  });

  it("handles zero cleanly", () => {
    const { lower, upper } = rivalBandBounds(0);
    expect(upper).toBe(0);
    expect(lower).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildStandingsData — cash metric
// ---------------------------------------------------------------------------

describe("buildStandingsData (cash)", () => {
  it("uses cashAtEnd from history for player and appends current cash", () => {
    const state = makeState({
      turn: 3,
      cash: 250000,
      history: [
        makeTurnResult(1, { cashAtEnd: 100000 }),
        makeTurnResult(2, { cashAtEnd: 200000 }),
      ],
    });

    const data = buildStandingsData(state, "cash");

    expect(data.playerSeries.snapshots).toEqual([
      { turn: 1, value: 100000 },
      { turn: 2, value: 200000 },
      { turn: 3, value: 250000 },
    ]);
  });

  it("uses cashAtEnd from aiSummaries for rivals", () => {
    const state = makeState({
      turn: 2,
      aiCompanies: [makeAICompany("rival1", { cash: 99999 })],
      history: [
        makeTurnResult(1, {
          aiSummaries: [makeAISummary("rival1", { cashAtEnd: 90000 })],
        }),
      ],
    });

    const data = buildStandingsData(state, "cash");
    const rival = data.rivalSeries[0];
    // history entry + current-turn appended snapshot
    expect(rival.snapshots[0]).toEqual({ turn: 1, value: 90000 });
    expect(rival.snapshots[rival.snapshots.length - 1]).toEqual({
      turn: 2,
      value: 99999,
    });
  });
});

// ---------------------------------------------------------------------------
// buildStandingsData — routes metric
// ---------------------------------------------------------------------------

describe("buildStandingsData (routes)", () => {
  it("uses routePerformance.length for player and routeCount for rivals", () => {
    const state = makeState({
      turn: 2,
      activeRoutes: [
        {} as unknown as GameState["activeRoutes"][number],
        {} as unknown as GameState["activeRoutes"][number],
      ],
      aiCompanies: [makeAICompany("rival1")],
      history: [
        makeTurnResult(1, {
          routePerformance: [
            {
              routeId: "r1",
            } as unknown as TurnResult["routePerformance"][number],
            {
              routeId: "r2",
            } as unknown as TurnResult["routePerformance"][number],
            {
              routeId: "r3",
            } as unknown as TurnResult["routePerformance"][number],
          ],
          aiSummaries: [makeAISummary("rival1", { routeCount: 4 })],
        }),
      ],
    });

    const data = buildStandingsData(state, "routes");
    expect(data.playerSeries.snapshots[0]).toEqual({ turn: 1, value: 3 });
    expect(data.rivalSeries[0].snapshots[0]).toEqual({ turn: 1, value: 4 });
  });
});

// ---------------------------------------------------------------------------
// buildStandingsData — fleet metric
// ---------------------------------------------------------------------------

describe("buildStandingsData (fleet)", () => {
  it("emits only the current-turn point for the player", () => {
    const state = makeState({
      turn: 4,
      fleet: [
        makeShip(ShipClass.CargoShuttle, "s1"),
        makeShip(ShipClass.CargoShuttle, "s2"),
      ],
      history: [makeTurnResult(1), makeTurnResult(2), makeTurnResult(3)],
    });

    const data = buildStandingsData(state, "fleet");
    expect(data.playerSeries.snapshots).toEqual([{ turn: 4, value: 2 }]);
  });

  it("uses fleetSize from aiSummaries for rivals' history", () => {
    const state = makeState({
      turn: 2,
      aiCompanies: [makeAICompany("rival1", { fleet: [] })],
      history: [
        makeTurnResult(1, {
          aiSummaries: [makeAISummary("rival1", { fleetSize: 5 })],
        }),
      ],
    });

    const data = buildStandingsData(state, "fleet");
    expect(data.rivalSeries[0].snapshots[0]).toEqual({ turn: 1, value: 5 });
  });
});

// ---------------------------------------------------------------------------
// Bankrupt rival handling
// ---------------------------------------------------------------------------

describe("buildStandingsData (bankrupt rivals)", () => {
  it("flags isBankrupt and trims the series at the bankruptcy turn", () => {
    const state = makeState({
      turn: 4,
      aiCompanies: [makeAICompany("rival1", { bankrupt: true })],
      history: [
        makeTurnResult(1, {
          aiSummaries: [makeAISummary("rival1", { cashAtEnd: 50000 })],
        }),
        makeTurnResult(2, {
          aiSummaries: [
            makeAISummary("rival1", { cashAtEnd: 10000, bankrupt: true }),
          ],
        }),
        makeTurnResult(3, {
          aiSummaries: [
            makeAISummary("rival1", { cashAtEnd: 0, bankrupt: true }),
          ],
        }),
      ],
    });

    const data = buildStandingsData(state, "cash");
    const rival = data.rivalSeries[0];
    expect(rival.isBankrupt).toBe(true);
    // Snapshots should stop at turn 2 — the bankruptcy turn — with its value.
    expect(rival.snapshots).toEqual([
      { turn: 1, value: 50000 },
      { turn: 2, value: 10000 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Rank computation
// ---------------------------------------------------------------------------

describe("computeRanks", () => {
  it("ranks all companies by current value descending", () => {
    const state = makeState({
      turn: 2,
      cash: 200000,
      aiCompanies: [
        makeAICompany("rival1", { cash: 500000 }),
        makeAICompany("rival2", { cash: 50000 }),
      ],
      history: [
        makeTurnResult(1, {
          cashAtEnd: 150000,
          aiSummaries: [
            makeAISummary("rival1", { cashAtEnd: 400000 }),
            makeAISummary("rival2", { cashAtEnd: 60000 }),
          ],
        }),
      ],
    });

    const data = buildStandingsData(state, "cash");
    const ranks = computeRanks(data);

    expect(ranks.get("rival1")).toBe(1);
    expect(ranks.get("player")).toBe(2);
    expect(ranks.get("rival2")).toBe(3);
  });
});
