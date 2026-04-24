import { describe, it, expect } from "vitest";
import { evaluateNavUnlocks, getNewlyUnlockedTabs } from "../NavUnlocks.ts";
import type { GameState, NavTabId } from "../../../data/types.ts";

// ---------------------------------------------------------------------------
// Minimal GameState factory — only the fields NavUnlocks.ts touches
// ---------------------------------------------------------------------------
function makeState(
  overrides: Partial<
    Pick<
      GameState,
      | "turn"
      | "unlockedNavTabs"
      | "contracts"
      | "unlockedEmpireIds"
      | "stationHub"
    >
  > = {},
): GameState {
  return {
    // Required fields with safe defaults
    seed: 1,
    turn: 1,
    maxTurns: 45,
    phase: "planning",
    gameSize: "standard",
    galaxyShape: "spiral",
    cash: 100000,
    loans: [],
    reputation: 50,
    companyName: "Test Co",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    playerEmpireId: "empire-1",
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
    adviser: {
      tutorialStepIndex: 0,
      tutorialComplete: false,
      tutorialSkipped: false,
      pendingMessages: [],
      shownMessageIds: [],
      secretRevealed: false,
      statsAdviserSaved: 0,
      statsAdviserHindered: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    routeSlots: 3,
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
    localRouteSlots: 2,
    // Apply overrides
    ...overrides,
  } as GameState;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateNavUnlocks", () => {
  it("turn=1 only shows always-visible tabs", () => {
    const result = evaluateNavUnlocks(makeState({ turn: 1 }));
    const expected: NavTabId[] = ["map", "routes", "fleet", "finance"];
    // All always-visible are present
    for (const tab of expected) {
      expect(result).toContain(tab);
    }
    // Locked tabs are absent
    const locked: NavTabId[] = [
      "contracts",
      "market",
      "research",
      "empires",
      "rivals",
      "hub",
    ];
    for (const tab of locked) {
      expect(result).not.toContain(tab);
    }
  });

  it("turn=3 adds research tab", () => {
    const result = evaluateNavUnlocks(makeState({ turn: 3 }));
    expect(result).toContain("research");
    // But rivals/hub/market still locked
    expect(result).not.toContain("rivals");
    expect(result).not.toContain("hub");
    expect(result).not.toContain("market");
  });

  it("turn=5 adds rivals, hub, and market tabs", () => {
    const result = evaluateNavUnlocks(makeState({ turn: 5 }));
    expect(result).toContain("research");
    expect(result).toContain("rivals");
    expect(result).toContain("hub");
    expect(result).toContain("market");
  });

  it("turn=10 still has all turn-gated tabs", () => {
    const result = evaluateNavUnlocks(makeState({ turn: 10 }));
    expect(result).toContain("research");
    expect(result).toContain("rivals");
    expect(result).toContain("hub");
    expect(result).toContain("market");
  });

  it("adds empires tab when 2+ empires are unlocked", () => {
    const result = evaluateNavUnlocks(
      makeState({ unlockedEmpireIds: ["empire-a", "empire-b"] }),
    );
    expect(result).toContain("empires");
  });

  it("does NOT add empires tab when fewer than 2 empires unlocked", () => {
    const resultZero = evaluateNavUnlocks(makeState({ unlockedEmpireIds: [] }));
    expect(resultZero).not.toContain("empires");

    const resultOne = evaluateNavUnlocks(
      makeState({ unlockedEmpireIds: ["empire-a"] }),
    );
    expect(resultOne).not.toContain("empires");
  });

  it("adds contracts tab when at least one contract exists", () => {
    const contract = {
      id: "c1",
      type: "passengerFerry" as const,
      targetEmpireId: null,
      originPlanetId: "p1",
      destinationPlanetId: "p2",
      cargoType: "passengers" as const,
      durationTurns: 5,
      turnsRemaining: 5,
      rewardCash: 10000,
      rewardReputation: 5,
      rewardResearchPoints: 0,
      rewardTariffReduction: null,
      depositPaid: 0,
      status: "available" as const,
      linkedRouteId: null,
      turnsWithoutShip: 0,
    };
    const result = evaluateNavUnlocks(makeState({ contracts: [contract] }));
    expect(result).toContain("contracts");
  });

  it("does NOT add contracts tab when contracts array is empty", () => {
    const result = evaluateNavUnlocks(makeState({ contracts: [] }));
    expect(result).not.toContain("contracts");
  });

  it("always-visible tabs are included even if unlockedNavTabs starts empty", () => {
    const result = evaluateNavUnlocks(
      makeState({ unlockedNavTabs: [] as NavTabId[] }),
    );
    expect(result).toContain("map");
    expect(result).toContain("routes");
    expect(result).toContain("fleet");
    expect(result).toContain("finance");
  });

  it("preserves already-unlocked tabs from state", () => {
    // Suppose state has contracts unlocked (e.g. from a save)
    const result = evaluateNavUnlocks(
      makeState({
        unlockedNavTabs: ["map", "routes", "fleet", "finance", "contracts"],
      }),
    );
    expect(result).toContain("contracts");
  });
});

describe("getNewlyUnlockedTabs", () => {
  it("returns tabs present in newTabs but not oldTabs", () => {
    const oldTabs: NavTabId[] = ["map", "routes", "fleet", "finance"];
    const newTabs: NavTabId[] = [
      "map",
      "routes",
      "fleet",
      "finance",
      "research",
    ];
    const result = getNewlyUnlockedTabs(oldTabs, newTabs);
    expect(result).toEqual(["research"]);
  });

  it("returns empty array when nothing new", () => {
    const tabs: NavTabId[] = ["map", "routes", "fleet", "finance"];
    const result = getNewlyUnlockedTabs(tabs, tabs);
    expect(result).toHaveLength(0);
  });

  it("returns multiple newly unlocked tabs", () => {
    const oldTabs: NavTabId[] = ["map", "routes", "fleet", "finance"];
    const newTabs: NavTabId[] = [
      "map",
      "routes",
      "fleet",
      "finance",
      "research",
      "rivals",
      "market",
    ];
    const result = getNewlyUnlockedTabs(oldTabs, newTabs);
    expect(result).toContain("research");
    expect(result).toContain("rivals");
    expect(result).toContain("market");
    expect(result).toHaveLength(3);
  });

  it("does not return tabs that were already in oldTabs", () => {
    const oldTabs: NavTabId[] = ["map", "routes", "fleet", "finance"];
    const newTabs: NavTabId[] = ["map", "routes", "fleet", "finance"];
    const result = getNewlyUnlockedTabs(oldTabs, newTabs);
    expect(result).toHaveLength(0);
  });
});
