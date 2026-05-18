import type { AICompany, GameState } from "../data/types.ts";
export type StandingsMetric = "cash" | "routes" | "fleet";

export interface StandingsSnapshot {
  turn: number;
  value: number;
}

export interface CompanyTimeSeries {
  /** Stable identifier — "player" for the player, AICompany.id for rivals. */
  id: string;
  snapshots: StandingsSnapshot[];
  /**
   * Legacy field. Ships no longer exist; kept as a string for compatibility
   * with renderers that still key on a sprite name. Always `"capacity"`.
   */
  shipClass: string;
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
    // Fleet metric: ships no longer exist; use active route count as the
    // closest proxy for fleet size in the capacity-pool model.
    snapshots.push({ turn: state.turn, value: state.activeRoutes.length });
  }

  const last = snapshots[snapshots.length - 1];
  return {
    id: "player",
    snapshots,
    shipClass: "capacity",
    isBankrupt: false,
    currentValue: last?.value ?? 0,
  };
}

function buildRivalSeries(
  state: GameState,
  rival: AICompany,
  metric: StandingsMetric,
): CompanyTimeSeries {
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
      break;
    }
  }

  if (!bankruptSeen && !rival.bankrupt) {
    let curr: number;
    if (metric === "cash") curr = rival.cash;
    else if (metric === "routes") curr = rival.activeRoutes.length;
    else curr = rival.activeRoutes.length;
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
    shipClass: "capacity",
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
  if (yMax === yMin) yMax = yMin + 1;

  return { metric, playerSeries, rivalSeries, maxTurns, yMin, yMax };
}

export function computeRanks(data: StandingsData): Map<string, number> {
  const all = [data.playerSeries, ...data.rivalSeries];
  const sorted = [...all].sort((a, b) => b.currentValue - a.currentValue);
  const ranks = new Map<string, number>();
  sorted.forEach((s, i) => ranks.set(s.id, i + 1));
  return ranks;
}

/**
 * @deprecated Kept as a no-op stub; ships no longer exist. Callers should
 * remove their usage.
 */
export function selectFlagshipClass(_fleet: readonly unknown[]): string {
  return "capacity";
}
