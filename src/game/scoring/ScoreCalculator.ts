import { CargoType } from "../../data/types.ts";
import type {
  GameState,
  CargoType as CargoTypeT,
  AICompany,
} from "../../data/types.ts";
import { calculateShipValue } from "../fleet/FleetManager.ts";
import { CARGO_DIVERSITY_BONUS } from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// High score types
// ---------------------------------------------------------------------------

export interface HighScore {
  name: string;
  score: number;
  seed: number;
  date: string;
}

const HIGH_SCORES_KEY = "sft_high_scores";
const MAX_HIGH_SCORES = 10;

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the final score for a game state.
 *
 * Formula:
 *   netWorth (cash + ship values - loan balances)
 *   + reputation * 100
 *   + totalCargoDelivered * 0.5
 *   + routeCount * 500
 *   + empiresTraded * 1000
 */
export function calculateScore(state: GameState): number {
  // Net worth: cash + fleet value - loan balances
  const fleetValue = state.fleet.reduce(
    (sum, ship) => sum + calculateShipValue(ship),
    0,
  );
  const loanBalance = state.loans.reduce(
    (sum, loan) => sum + loan.remainingBalance,
    0,
  );
  const netWorth = state.cash + fleetValue - loanBalance;

  // Reputation bonus
  const reputationBonus = state.reputation * 100;

  // Total cargo delivered across all turns
  const allCargoTypes: CargoTypeT[] = Object.values(CargoType);
  let totalCargoDelivered = 0;
  for (const turnResult of state.history) {
    for (const ct of allCargoTypes) {
      totalCargoDelivered += turnResult.cargoDelivered[ct] ?? 0;
    }
  }
  const cargoBonus = totalCargoDelivered * 0.5;

  // Route count bonus
  const routeBonus = state.activeRoutes.length * 500;

  // Empire trading bonus: count distinct empires the player has routes into
  const empiresTraded = countEmpiresTraded(state);
  const empireBonus = empiresTraded * 1000;

  const score =
    netWorth + reputationBonus + cargoBonus + routeBonus + empireBonus;
  return Math.round(score);
}

/**
 * Count distinct empires the player has active routes going to/from.
 */
function countEmpiresTraded(state: GameState): number {
  const empireIds = new Set<string>();
  for (const route of state.activeRoutes) {
    // Find system for origin and destination planets
    for (const sys of state.galaxy.systems) {
      const originMatch = route.originPlanetId.startsWith(
        `planet-${sys.id.replace("system-", "")}-`,
      );
      const destMatch = route.destinationPlanetId.startsWith(
        `planet-${sys.id.replace("system-", "")}-`,
      );
      if (originMatch) empireIds.add(sys.empireId);
      if (destMatch) empireIds.add(sys.empireId);
    }
  }
  return empireIds.size;
}

/**
 * Compute the net worth of an AI company for ranking.
 */
function computeAINetWorth(company: AICompany): number {
  const fleetValue = company.fleet.reduce(
    (sum, ship) => sum + calculateShipValue(ship),
    0,
  );
  return company.cash + fleetValue;
}

export interface CompanyRanking {
  name: string;
  isPlayer: boolean;
  netWorth: number;
  fleetSize: number;
  routeCount: number;
  score: number;
}

/**
 * Rank the player against all AI companies.
 * Returns array sorted by score descending.
 */
export function rankCompanies(state: GameState): CompanyRanking[] {
  const playerScore = calculateScore(state);
  const playerFleetValue = state.fleet.reduce(
    (sum, ship) => sum + calculateShipValue(ship),
    0,
  );
  const playerNetWorth =
    state.cash +
    playerFleetValue -
    state.loans.reduce((sum, l) => sum + l.remainingBalance, 0);

  const rankings: CompanyRanking[] = [
    {
      name: state.companyName,
      isPlayer: true,
      netWorth: Math.round(playerNetWorth),
      fleetSize: state.fleet.length,
      routeCount: state.activeRoutes.length,
      score: playerScore,
    },
  ];

  for (const ai of state.aiCompanies) {
    const aiNetWorth = computeAINetWorth(ai);
    // AI score: simplified — net worth + cargo bonus + route bonus
    const aiScore = Math.round(
      aiNetWorth +
        ai.reputation * 100 +
        ai.totalCargoDelivered * 0.5 +
        ai.activeRoutes.length * 500,
    );
    rankings.push({
      name: ai.name,
      isPlayer: false,
      netWorth: Math.round(aiNetWorth),
      fleetSize: ai.fleet.length,
      routeCount: ai.activeRoutes.length,
      score: aiScore,
    });
  }

  rankings.sort((a, b) => b.score - a.score);
  return rankings;
}

// ---------------------------------------------------------------------------
// High score persistence (localStorage)
// ---------------------------------------------------------------------------

/**
 * Retrieve the current high scores from localStorage.
 */
export function getHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HighScore[];
  } catch {
    return [];
  }
}

/**
 * Save a new high score to localStorage. Keeps only the top 10 scores.
 */
export function saveHighScore(name: string, score: number, seed: number): void {
  const existing = getHighScores();

  const entry: HighScore = {
    name,
    score,
    seed,
    date: new Date().toISOString(),
  };

  const updated = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);

  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(updated));
}
