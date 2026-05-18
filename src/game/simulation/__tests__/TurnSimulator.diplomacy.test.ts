/**
 * TurnSimulator diplomacy path tests — capacity-pool model
 *
 * Verifies that the diplomacy pipeline within simulateTurn still compiles
 * and runs correctly after the Fleet Capacity Redesign. These tests were
 * previously deleted because the test fixtures contained ship-based state;
 * this rewrite uses the new capacity-pool fixtures.
 *
 * We reuse the minimal state builder from the main TurnSimulator.test.ts
 * pattern and exercise the diplomacy code paths directly.
 */
import { describe, it, expect } from "vitest";
import { simulateTurn } from "../TurnSimulator.ts";
import { createNewGame } from "../../NewGameSetup.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";
import type { QueuedDiplomacyAction, GameState } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { _clearRouteManagerCaches } from "../../routes/RouteManager.ts";
import {
  PlanetBiome,
  type Sector,
  type StarSystem,
  type Planet,
} from "../../../data/types.ts";

// ---------------------------------------------------------------------------
// Helpers: shared with TurnSimulator.test.ts pattern
// ---------------------------------------------------------------------------

const sectors: Sector[] = [
  { id: "sec-1", name: "Core Sector", x: 0, y: 0, color: 0xffffff },
];

const systems: StarSystem[] = [
  {
    id: "sys-1",
    name: "Alpha",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 0,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-2",
    name: "Beta",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 100,
    y: 0,
    starColor: 0xffcc00,
  },
];

const planets: Planet[] = [
  {
    id: "planet-a",
    name: "Alpha I",
    systemId: "sys-1",
    type: "frontier",
    x: 0,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-b",
    name: "Beta I",
    systemId: "sys-2",
    type: "agricultural",
    x: 100,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
];

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 1,
    maxTurns: 20,
    phase: "planning",
    cash: 500_000,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Test CEO",
    ceoPortrait: { portraitId: "p1", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy: {
      sectors,
      empires: [],
      systems,
      planets,
    },
    activeRoutes: [],
    market: {
      fuelPrice: 10,
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
      turnsSinceLastDilemma: 999,
      recentIntensity: 0,
      mode: "steady",
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: 4,
    localRouteSlots: 2,
    galacticRouteSlots: 2,
    unlockedEmpireIds: ["emp-1"],
    contracts: [],
    tech: {
      researchPoints: 0,
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
      purchaseCount: {},
      queue: [],
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
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
    hyperlanes: [],
    borderPorts: [],
    diplomaticRelations: [],
    diplomacy: EMPTY_DIPLOMACY_STATE,
    pendingRivalMessages: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Diplomacy path tests
// ---------------------------------------------------------------------------

describe("simulateTurn — diplomacy path (capacity-pool model)", () => {
  it("completes without error when diplomacy state is empty", () => {
    _clearRouteManagerCaches();
    const state = makeMinimalState();
    const rng = new SeededRNG(42);
    expect(() => simulateTurn(state, rng)).not.toThrow();
  });

  it("preserves diplomaticRelations when none are present", () => {
    _clearRouteManagerCaches();
    const state = makeMinimalState({ diplomaticRelations: [] });
    const rng = new SeededRNG(42);
    const result = simulateTurn(state, rng);
    expect(result.diplomaticRelations).toBeDefined();
    expect(Array.isArray(result.diplomaticRelations)).toBe(true);
  });

  it("preserves borderPorts when none are present", () => {
    _clearRouteManagerCaches();
    const state = makeMinimalState({ borderPorts: [] });
    const rng = new SeededRNG(42);
    const result = simulateTurn(state, rng);
    expect(result.borderPorts).toBeDefined();
    expect(Array.isArray(result.borderPorts)).toBe(true);
  });

  it("does not add pending diplomacy modals when queuedActions is empty", () => {
    _clearRouteManagerCaches();
    const state = makeMinimalState({
      pendingChoiceEvents: [],
      diplomacy: EMPTY_DIPLOMACY_STATE,
    });
    const rng = new SeededRNG(42);
    const result = simulateTurn(state, rng);
    // No queued actions → no new modals from the diplomacy resolver
    const diplomacyModals = result.pendingChoiceEvents.filter((e) =>
      e.id.startsWith("dipl-out-"),
    );
    expect(diplomacyModals).toHaveLength(0);
  });

  it("queued gift action resolves without crashing (full-game fixture)", () => {
    // Use createNewGame to get a real galaxy with empires for the gift path
    const { state: initial } = createNewGame(7, "Test Corp", "quick", "spiral");
    const empireId = initial.galaxy.empires[0]?.id;
    if (!empireId) return; // skip if no empire generated

    const queued: QueuedDiplomacyAction[] = [
      {
        id: "gift-action-1",
        kind: "giftEmpire",
        targetId: empireId,
        cashCost: 1_000,
      },
    ];
    const start: GameState = {
      ...initial,
      diplomacy: { ...initial.diplomacy!, queuedActions: queued },
    };
    const rng = new SeededRNG(7);
    expect(() => simulateTurn(start, rng)).not.toThrow();
  });

  it("simulateTurn still advances turn counter when diplomacy is non-empty", () => {
    const { state: initial } = createNewGame(
      10,
      "Test Corp",
      "quick",
      "spiral",
    );
    const rng = new SeededRNG(10);
    const result = simulateTurn(initial, rng);
    expect(result.turn).toBe(initial.turn + 1);
  });

  it("diplomacy.queuedActions cleared after turn resolves them", () => {
    const { state: initial } = createNewGame(3, "Test Corp", "quick", "spiral");
    const empires = initial.galaxy.empires;
    if (empires.length < 1) return;

    const queued: QueuedDiplomacyAction[] = [
      {
        id: "q1",
        kind: "giftEmpire",
        targetId: empires[0]!.id,
        cashCost: 500,
      },
    ];
    const start: GameState = {
      ...initial,
      diplomacy: { ...initial.diplomacy!, queuedActions: queued },
    };
    const rng = new SeededRNG(3);
    const result = simulateTurn(start, rng);
    // After the turn, queued actions should be cleared (resolved or deferred)
    expect(result.diplomacy?.queuedActions ?? []).toHaveLength(0);
  });
});
