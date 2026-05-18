import { describe, it, expect } from "vitest";
import { PlanetBiome } from "../../../data/types.ts";
import {
  getNegotiationOptions,
  applyNegotiation,
} from "../ContractNegotiation.ts";
import { acceptContractWithNegotiation } from "../ContractManager.ts";
import type { GameState, Contract } from "../../../data/types.ts";
import {
  ContractType,
  ContractStatus,
  CargoType,
} from "../../../data/types.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 3,
    maxTurns: 20,
    phase: "planning",
    cash: 150_000,
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
      empires: [],
      systems: [
        {
          id: "system-1",
          name: "S1",
          sectorId: "sector-1",
          empireId: "empire-1",
          x: 0,
          y: 0,
          starColor: 0xffffff,
        },
        {
          id: "system-2",
          name: "S2",
          sectorId: "sector-1",
          empireId: "empire-1",
          x: 10,
          y: 0,
          starColor: 0xffffff,
        },
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
          biome: PlanetBiome.Colony,
          productionTags: [],
          consumptionTags: [],
          productionScale: 1.0,
          populationCap: 10,
        },
        {
          id: "planet-2",
          name: "P2",
          systemId: "system-2",
          type: "techWorld",
          x: 10,
          y: 0,
          population: 1000,
          biome: PlanetBiome.Colony,
          productionTags: [],
          consumptionTags: [],
          productionScale: 1.0,
          populationCap: 10,
        },
      ],
    },
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
    unlockedEmpireIds: ["empire-1"],
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

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-t3-abc",
    type: ContractType.TradeAlliance,
    targetEmpireId: null,
    originPlanetId: "planet-1",
    destinationPlanetId: "planet-2",
    cargoType: CargoType.Food,
    durationTurns: 5,
    turnsRemaining: 5,
    rewardCash: 20_000,
    rewardReputation: 5,
    rewardResearchPoints: 2,
    rewardTariffReduction: null,
    depositPaid: 2_000,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getNegotiationOptions
// ---------------------------------------------------------------------------

describe("getNegotiationOptions", () => {
  it("always returns at least the standard option", () => {
    const contract = makeContract();
    const state = createTestState({ reputation: 0 });
    const options = getNegotiationOptions(contract, state);
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0].choice).toBe("standard");
  });

  it("returns 3 options when player reputation meets both gates", () => {
    const contract = makeContract();
    const state = createTestState({ reputation: 60 }); // ≥50 → all unlocked
    const options = getNegotiationOptions(contract, state);
    expect(options).toHaveLength(3);
    const choices = options.map((o) => o.choice);
    expect(choices).toContain("standard");
    expect(choices).toContain("haggle");
    expect(choices).toContain("early_completion");
  });

  it("hides haggle and early_completion when reputation is below 25", () => {
    const contract = makeContract();
    const state = createTestState({ reputation: 10 });
    const options = getNegotiationOptions(contract, state);
    expect(options).toHaveLength(1);
    expect(options[0].choice).toBe("standard");
  });

  it("shows haggle but not early_completion when reputation is 25–49", () => {
    const contract = makeContract();
    const state = createTestState({ reputation: 30 });
    const options = getNegotiationOptions(contract, state);
    expect(options).toHaveLength(2);
    const choices = options.map((o) => o.choice);
    expect(choices).toContain("haggle");
    expect(choices).not.toContain("early_completion");
  });
});

// ---------------------------------------------------------------------------
// applyNegotiation — standard
// ---------------------------------------------------------------------------

describe("applyNegotiation — standard", () => {
  it("standard choice always succeeds with multiplier 1.0", () => {
    const contract = makeContract();
    const state = createTestState({ reputation: 0 });
    const rng = new SeededRNG(42);
    const { negotiatedContract, result } = applyNegotiation(
      contract,
      "standard",
      state,
      rng,
    );
    expect(result.success).toBe(true);
    expect(negotiatedContract.rewardCash).toBe(contract.rewardCash);
    expect(negotiatedContract.depositPaid).toBe(contract.depositPaid);
    expect(negotiatedContract.turnsRemaining).toBe(contract.turnsRemaining);
    expect(negotiatedContract.durationTurns).toBe(contract.durationTurns);
  });
});

// ---------------------------------------------------------------------------
// applyNegotiation — haggle
// ---------------------------------------------------------------------------

describe("applyNegotiation — haggle", () => {
  it("success path gives ~1.3× reward and ~0.9× deadline", () => {
    const contract = makeContract({
      rewardCash: 10_000,
      turnsRemaining: 10,
      durationTurns: 10,
    });
    const state = createTestState({ reputation: 30 });

    // For robustness: try multiple seeds and find one that produces success
    let successResult: ReturnType<typeof applyNegotiation> | null = null;
    for (let seed = 0; seed < 1000; seed++) {
      const r = new SeededRNG(seed);
      const res = applyNegotiation(contract, "haggle", state, r);
      if (res.result.success) {
        successResult = res;
        break;
      }
    }
    expect(successResult).not.toBeNull();
    expect(successResult!.negotiatedContract.rewardCash).toBe(
      Math.round(10_000 * 1.3),
    );
    expect(successResult!.negotiatedContract.turnsRemaining).toBe(
      Math.max(1, Math.round(10 * 0.9)),
    );
  });

  it("failure path gives ~0.9× reward (empire annoyed)", () => {
    const contract = makeContract({
      rewardCash: 10_000,
      turnsRemaining: 10,
      durationTurns: 10,
    });
    const state = createTestState({ reputation: 30 });

    // Find a seed that produces a failed haggle
    let failResult: ReturnType<typeof applyNegotiation> | null = null;
    for (let seed = 0; seed < 1000; seed++) {
      const r = new SeededRNG(seed);
      const res = applyNegotiation(contract, "haggle", state, r);
      if (!res.result.success) {
        failResult = res;
        break;
      }
    }
    expect(failResult).not.toBeNull();
    expect(failResult!.negotiatedContract.rewardCash).toBe(
      Math.round(10_000 * 0.9),
    );
    // Deadline should be unchanged on fail
    expect(failResult!.negotiatedContract.turnsRemaining).toBe(10);
  });

  it("falls back to standard when reputation < 25 (gate check)", () => {
    const contract = makeContract({
      rewardCash: 10_000,
      turnsRemaining: 5,
      durationTurns: 5,
    });
    const state = createTestState({ reputation: 10 }); // below gate
    const rng = new SeededRNG(42);
    const { negotiatedContract, result } = applyNegotiation(
      contract,
      "haggle",
      state,
      rng,
    );
    // Falls back: standard terms applied
    expect(negotiatedContract.rewardCash).toBe(contract.rewardCash);
    expect(result.message).toMatch(/too low/i);
  });
});

// ---------------------------------------------------------------------------
// applyNegotiation — early_completion
// ---------------------------------------------------------------------------

describe("applyNegotiation — early_completion", () => {
  it("always applies 1.5× reward and 1.5× deposit with 0.7× deadline", () => {
    const contract = makeContract({
      rewardCash: 20_000,
      depositPaid: 2_000,
      turnsRemaining: 10,
      durationTurns: 10,
    });
    const state = createTestState({ reputation: 60 });
    const rng = new SeededRNG(42);
    const { negotiatedContract, result } = applyNegotiation(
      contract,
      "early_completion",
      state,
      rng,
    );
    expect(result.success).toBe(true);
    expect(negotiatedContract.rewardCash).toBe(Math.round(20_000 * 1.5));
    expect(negotiatedContract.depositPaid).toBe(Math.round(2_000 * 1.5));
    expect(negotiatedContract.turnsRemaining).toBe(
      Math.max(1, Math.round(10 * 0.7)),
    );
  });

  it("falls back to standard when reputation < 50", () => {
    const contract = makeContract({
      rewardCash: 20_000,
      turnsRemaining: 5,
      durationTurns: 5,
    });
    const state = createTestState({ reputation: 30 }); // below 50 gate
    const rng = new SeededRNG(42);
    const { negotiatedContract } = applyNegotiation(
      contract,
      "early_completion",
      state,
      rng,
    );
    expect(negotiatedContract.rewardCash).toBe(contract.rewardCash);
    expect(negotiatedContract.depositPaid).toBe(contract.depositPaid);
  });
});

// ---------------------------------------------------------------------------
// acceptContractWithNegotiation — full flow
// ---------------------------------------------------------------------------

describe("acceptContractWithNegotiation", () => {
  it("standard choice: accepts contract and deducts deposit", () => {
    const contract = makeContract({ rewardCash: 20_000, depositPaid: 2_000 });
    const state = createTestState({
      contracts: [contract],
      cash: 100_000,
    });
    const rng = new SeededRNG(42);

    const updated = acceptContractWithNegotiation(
      contract.id,
      "standard",
      state,
      rng,
    );
    expect(updated.cash).toBe(100_000 - 2_000);
    const updatedContract = updated.contracts.find((c) => c.id === contract.id);
    expect(updatedContract?.status).toBe(ContractStatus.Active);
    expect(updatedContract?.linkedRouteId).toBeTruthy();
  });

  it("returns original state when contract not found", () => {
    const state = createTestState({ contracts: [] });
    const rng = new SeededRNG(42);
    const updated = acceptContractWithNegotiation(
      "nonexistent",
      "standard",
      state,
      rng,
    );
    expect(updated).toBe(state);
  });

  it("early_completion applies 1.5x reward to accepted contract", () => {
    const contract = makeContract({ rewardCash: 20_000, depositPaid: 2_000 });
    const state = createTestState({
      contracts: [contract],
      cash: 100_000,
      reputation: 60,
    });
    const rng = new SeededRNG(42);

    const updated = acceptContractWithNegotiation(
      contract.id,
      "early_completion",
      state,
      rng,
    );
    const updatedContract = updated.contracts.find((c) => c.id === contract.id);
    // Reward should be 1.5×
    expect(updatedContract?.rewardCash).toBe(Math.round(20_000 * 1.5));
    // Deposit should be 1.5× (and was deducted from cash)
    const expectedDeposit = Math.round(2_000 * 1.5);
    expect(updated.cash).toBe(100_000 - expectedDeposit);
  });
});
