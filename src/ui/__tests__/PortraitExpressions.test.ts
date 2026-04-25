import { describe, it, expect } from 'vitest';
import { getExpressionFromGameState } from '../PortraitExpression.ts';
import type { GameState } from '../../data/types.ts';
import { initAdviserState } from '../../game/adviser/AdviserEngine.ts';

// ── Test helpers ─────────────────────────────────────────────────────────────

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 5,
    maxTurns: 25,
    phase: 'planning',
    cash: 200000,
    loans: [],
    reputation: 50,
    companyName: 'Test Corp',
    ceoName: 'Commander',
    ceoPortrait: { portraitId: 'ceo-01', category: 'human' },
    gameSize: 'standard',
    galaxyShape: 'spiral',
    playerEmpireId: 'empire-1',
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    fleet: [],
    activeRoutes: [],
    market: { fuelPrice: 10, fuelTrend: 'stable', planetMarkets: {} },
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
    localRouteSlots: 2,
    unlockedEmpireIds: ['empire-1'],
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
    unlockedNavTabs: ['map', 'routes', 'fleet', 'finance'] as import('../../data/types.ts').NavTabId[],
    reputationTier: 'unknown' as import('../../data/types.ts').ReputationTier,
    ...overrides,
  };
}

// Helper to make a minimal TurnResult for history
function makeTurnResult(netProfit: number) {
  return {
    turn: 1,
    revenue: Math.max(0, netProfit),
    fuelCosts: 0,
    maintenanceCosts: 0,
    loanPayments: 0,
    tariffCosts: 0,
    otherCosts: 0,
    netProfit,
    cashAtEnd: 200000 + netProfit,
    cargoDelivered: {
      passengers: 0, rawMaterials: 0, food: 0, technology: 0, luxury: 0, hazmat: 0, medical: 0,
    } as import('../../data/types.ts').TurnResult['cargoDelivered'],
    passengersTransported: 0,
    eventsOccurred: [],
    routePerformance: [],
    aiSummaries: [],
  };
}

// ── getExpressionFromGameState ───────────────────────────────────────────────

describe('getExpressionFromGameState', () => {
  it('returns "worried" when playerHealthScore is low (< 30)', () => {
    const state = createTestState({
      reputation: 60,
      storyteller: {
        playerHealthScore: 20,
        headwindBias: 0,
        turnsInDebt: 0,
        consecutiveProfitTurns: 0,
        turnsSinceLastDecision: 0,
      },
    });
    expect(getExpressionFromGameState(state)).toBe('worried');
  });

  it('returns "happy" when last turn grade is A (profit >= 20000)', () => {
    const state = createTestState({
      reputation: 60,
      storyteller: {
        playerHealthScore: 50,
        headwindBias: 0,
        turnsInDebt: 0,
        consecutiveProfitTurns: 3,
        turnsSinceLastDecision: 0,
      },
      history: [makeTurnResult(25000)],
    });
    expect(getExpressionFromGameState(state)).toBe('happy');
  });

  it('returns "happy" when last turn grade is S (profit >= 50000)', () => {
    const state = createTestState({
      reputation: 60,
      history: [makeTurnResult(60000)],
    });
    expect(getExpressionFromGameState(state)).toBe('happy');
  });

  it('returns "worried" when last turn grade is D (loss between 0 and -10000)', () => {
    const state = createTestState({
      reputation: 60,
      history: [makeTurnResult(-5000)],
    });
    expect(getExpressionFromGameState(state)).toBe('worried');
  });

  it('returns "worried" when last turn grade is F (loss < -10000)', () => {
    const state = createTestState({
      reputation: 60,
      history: [makeTurnResult(-15000)],
    });
    expect(getExpressionFromGameState(state)).toBe('worried');
  });

  it('returns "angry" when reputation is below 25', () => {
    const state = createTestState({
      reputation: 10,
      storyteller: {
        playerHealthScore: 50,
        headwindBias: 0,
        turnsInDebt: 0,
        consecutiveProfitTurns: 0,
        turnsSinceLastDecision: 0,
      },
      history: [makeTurnResult(30000)], // good profit but bad reputation
    });
    expect(getExpressionFromGameState(state)).toBe('angry');
  });

  it('returns "neutral" when everything is average (no history)', () => {
    const state = createTestState({ reputation: 50 });
    expect(getExpressionFromGameState(state)).toBe('neutral');
  });

  it('returns "neutral" when last turn profit is moderate (grade C)', () => {
    const state = createTestState({
      reputation: 50,
      history: [makeTurnResult(2000)], // C grade: 0..4999
    });
    expect(getExpressionFromGameState(state)).toBe('neutral');
  });

  it('boundary: reputation exactly 25 is NOT angry (returns based on other criteria)', () => {
    const state = createTestState({
      reputation: 25,
      storyteller: {
        playerHealthScore: 50,
        headwindBias: 0,
        turnsInDebt: 0,
        consecutiveProfitTurns: 0,
        turnsSinceLastDecision: 0,
      },
    });
    // reputation >= 25 → not angry; no history → neutral
    expect(getExpressionFromGameState(state)).toBe('neutral');
  });

  it('boundary: reputation 24 IS angry', () => {
    const state = createTestState({
      reputation: 24,
      history: [makeTurnResult(60000)], // great profit but notorious
    });
    expect(getExpressionFromGameState(state)).toBe('angry');
  });

  it('health score priority: health < 30 wins over good grade', () => {
    const state = createTestState({
      reputation: 60,
      storyteller: {
        playerHealthScore: 15,
        headwindBias: 0,
        turnsInDebt: 0,
        consecutiveProfitTurns: 0,
        turnsSinceLastDecision: 0,
      },
      history: [makeTurnResult(60000)], // S grade
    });
    // Health check comes after reputation but before grade check
    expect(getExpressionFromGameState(state)).toBe('worried');
  });
});
