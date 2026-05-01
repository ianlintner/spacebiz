import type { AICompany, GameState, Ship, ShipClass } from "../data/types.ts";
import { ShipClass as ShipClassValues } from "../data/types.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";

export type StandingsMetric = "cash" | "routes" | "fleet";

export interface StandingsSnapshot {
  turn: number;
  value: number;
}

export interface CompanyTimeSeries {
  /** Stable identifier — "player" for the player, AICompany.id for rivals. */
  id: string;
  snapshots: StandingsSnapshot[];
  /** Used to pick the sprite at the line tip. */
  shipClass: ShipClass;
  isBankrupt: boolean;
  /** Final/current metric value, used for rank ordering. */
  currentValue: number;
}

export interface StandingsData {
  metric: StandingsMetric;
  playerSeries: CompanyTimeSeries;
  rivalSeries: CompanyTimeSeries[];
  /** Highest turn index represented across any series. */
  maxTurns: number;
  /** Convenience: 0..maxValue across all series & rival upper bands. */
  yMin: number;
  yMax: number;
}

const RIVAL_BAND_FUZZ = 0.15;

/**
 * Pick the ShipClass with the highest purchaseCost in the fleet.
 * Returns CargoShuttle for empty fleets. Tie-break: first in array order.
 */
export function selectFlagshipClass(fleet: readonly Ship[]): ShipClass {
  if (fleet.length === 0) return ShipClassValues.CargoShuttle;
  let best = fleet[0];
  let bestCost = SHIP_TEMPLATES[best.class]?.purchaseCost ?? 0;
  for (let i = 1; i < fleet.length; i++) {
    const cost = SHIP_TEMPLATES[fleet[i].class]?.purchaseCost ?? 0;
    if (cost > bestCost) {
      best = fleet[i];
      bestCost = cost;
    }
  }
  return best.class;
}

/** ±15% range around `value`. */
export function rivalBandBounds(value: number): {
  lower: number;
  upper: number;
} {
  return {
    lower: value * (1 - RIVAL_BAND_FUZZ),
    upper: value * (1 + RIVAL_BAND_FUZZ),
  };
}

function buildPlayerSeries(
  state: GameState,
  metric: StandingsMetric,
): CompanyTimeSeries {
  const flagship = selectFlagshipClass(state.fleet);
  const snapshots: StandingsSnapshot[] = [];

  if (metric === "cash") {
    for (const h of state.history) {
      snapshots.push({ turn: h.turn, value: h.cashAtEnd });
    }
    snapshots.push({ turn: state.turn, value: state.cash });
  } else if (metric === "routes") {
    for (const h of state.history) {
      snapshots.push({ turn: h.turn, value: h.routePerformance.length });
    }
    snapshots.push({ turn: state.turn, value: state.activeRoutes.length });
  } else {
    // Fleet metric: TurnResult does not record playerFleetSize, so we only
    // know the current turn. Future work could add it to TurnResult.
    snapshots.push({ turn: state.turn, value: state.fleet.length });
  }

  const last = snapshots[snapshots.length - 1];
  return {
    id: "player",
    snapshots,
    shipClass: flagship,
    isBankrupt: false,
    currentValue: last?.value ?? 0,
  };
}

function buildRivalSeries(
  state: GameState,
  rival: AICompany,
  metric: StandingsMetric,
): CompanyTimeSeries {
  const flagship = selectFlagshipClass(rival.fleet);
  const snapshots: StandingsSnapshot[] = [];
  let bankruptSeen = false;

  for (const h of state.history) {
    const summary = h.aiSummaries.find((s) => s.companyId === rival.id);
    if (!summary) continue;

    let value: number;
    if (metric === "cash") value = summary.cashAtEnd;
    else if (metric === "routes") value = summary.routeCount;
    else value = summary.fleetSize;

    snapshots.push({ turn: h.turn, value });

    if (summary.bankrupt) {
      bankruptSeen = true;
      break; // Trim subsequent zero-value snapshots after bankruptcy.
    }
  }

  // Append a current-turn snapshot for active rivals so the tip lands at "now".
  if (!bankruptSeen && !rival.bankrupt) {
    let curr: number;
    if (metric === "cash") curr = rival.cash;
    else if (metric === "routes") curr = rival.activeRoutes.length;
    else curr = rival.fleet.length;
    if (
      snapshots.length === 0 ||
      snapshots[snapshots.length - 1].turn !== state.turn
    ) {
      snapshots.push({ turn: state.turn, value: curr });
    }
  }

  const last = snapshots[snapshots.length - 1];
  return {
    id: rival.id,
    snapshots,
    shipClass: flagship,
    isBankrupt: bankruptSeen || rival.bankrupt,
    currentValue: last?.value ?? 0,
  };
}

export function buildStandingsData(
  state: GameState,
  metric: StandingsMetric,
): StandingsData {
  const playerSeries = buildPlayerSeries(state, metric);
  const rivalSeries = state.aiCompanies.map((c) =>
    buildRivalSeries(state, c, metric),
  );

  let maxTurns = state.turn;
  for (const s of [playerSeries, ...rivalSeries]) {
    for (const snap of s.snapshots) {
      if (snap.turn > maxTurns) maxTurns = snap.turn;
    }
  }

  // Y-axis range: include the *upper band* of every rival snapshot, since
  // bands float against this shared scale and must not clip.
  let yMin = 0;
  let yMax = 0;
  for (const snap of playerSeries.snapshots) {
    if (snap.value > yMax) yMax = snap.value;
    if (snap.value < yMin) yMin = snap.value;
  }
  for (const r of rivalSeries) {
    for (const snap of r.snapshots) {
      const upper = rivalBandBounds(snap.value).upper;
      const lower = rivalBandBounds(snap.value).lower;
      if (upper > yMax) yMax = upper;
      if (lower < yMin) yMin = lower;
    }
  }
  if (yMax === yMin) yMax = yMin + 1; // avoid a degenerate zero-height range.

  return { metric, playerSeries, rivalSeries, maxTurns, yMin, yMax };
}

/**
 * Compute current ranks (1-indexed) across all companies in the data,
 * sorted by `currentValue` descending. Bankrupt companies are still
 * ranked but their badge will be rendered as "✕" by the UI layer.
 */
export function computeRanks(data: StandingsData): Map<string, number> {
  const all = [data.playerSeries, ...data.rivalSeries];
  const sorted = [...all].sort((a, b) => b.currentValue - a.currentValue);
  const ranks = new Map<string, number>();
  sorted.forEach((s, i) => ranks.set(s.id, i + 1));
  return ranks;
}
