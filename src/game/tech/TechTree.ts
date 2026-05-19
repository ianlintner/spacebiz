import type { GameState, TechState, Technology } from "../../data/types.ts";
import {
  TECH_GRAPH,
  BASE_RP_PER_TURN,
  HUB_ROOM_DEFINITIONS,
} from "../../data/constants.ts";
import { calculateRouteRP } from "./DeliveryRP.ts";
import { isBranchCommitted } from "./BranchCommitment.ts";

const CARGO_PACT_IDS = new Set([
  "diplomacy_food",
  "diplomacy_tech",
  "diplomacy_luxury",
]);

export function effectiveCost(techId: string, tech: TechState): number {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return Infinity;
  const count = tech.purchaseCount[techId] ?? 0;
  const scale = node.repeatCostScale ?? 1;
  return Math.round(node.rpCost * Math.pow(scale, count));
}

export function applyPurchase(techId: string, tech: TechState): TechState {
  const newCount = (tech.purchaseCount[techId] ?? 0) + 1;
  const newCompletedIds =
    newCount === 1 ? [...tech.completedTechIds, techId] : tech.completedTechIds;
  return {
    ...tech,
    purchaseCount: { ...tech.purchaseCount, [techId]: newCount },
    completedTechIds: newCompletedIds,
  };
}

export function isTechAvailable(techId: string, tech: TechState): boolean {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return false;

  // Not already queued
  if (tech.queue.includes(techId)) return false;

  // Non-repeatable already purchased
  if (!node.repeatable && (tech.purchaseCount[techId] ?? 0) >= 1) return false;

  // Cargo pact mutual exclusivity — block if another pact is owned OR already queued
  if (CARGO_PACT_IDS.has(techId)) {
    const conflict = [...CARGO_PACT_IDS].some(
      (id) =>
        id !== techId &&
        (tech.completedTechIds.includes(id) || tech.queue.includes(id)),
    );
    if (conflict) return false;
  }

  // Tier wall — T3 and T4 require the branch to be committed.
  // T1/T2 are accessible to any player.
  if (node.tier >= 3 && !isBranchCommitted(node.branch, tech)) {
    return false;
  }

  // Center node is always available
  if (techId === "fuel_efficiency_1") return true;

  // Adjacency: at least one neighbor must be completed
  return node.edges.some((neighborId) =>
    tech.completedTechIds.includes(neighborId),
  );
}

export function getAvailableTechs(tech: TechState): Technology[] {
  return TECH_GRAPH.filter((t) => isTechAvailable(t.id, tech));
}

export function instantUnlockOrQueue(
  techId: string,
  tech: TechState,
): TechState | null {
  if (!isTechAvailable(techId, tech)) return null;
  const cost = effectiveCost(techId, tech);
  if (tech.researchPoints >= cost) {
    const afterPurchase = applyPurchase(techId, tech);
    return {
      ...afterPurchase,
      researchPoints: afterPurchase.researchPoints - cost,
      currentResearchId: afterPurchase.queue[0] ?? null,
    };
  }
  const newQueue = [...tech.queue, techId];
  return {
    ...tech,
    queue: newQueue,
    currentResearchId: newQueue[0],
  };
}

export function setResearchTarget(
  techId: string,
  tech: TechState,
): TechState | null {
  return instantUnlockOrQueue(techId, tech);
}

export function reorderQueue(
  tech: TechState,
  fromIdx: number,
  toIdx: number,
): TechState {
  const queue = [...tech.queue];
  const [item] = queue.splice(fromIdx, 1);
  queue.splice(toIdx, 0, item);
  return { ...tech, queue, currentResearchId: queue[0] ?? null };
}

export function removeFromQueue(tech: TechState, index: number): TechState {
  const queue = [...tech.queue];
  queue.splice(index, 1);
  return { ...tech, queue, currentResearchId: queue[0] ?? null };
}

/**
 * Check whether a tech already in the queue can still be purchased given the
 * current state (handles cases like cargo-pact exclusivity being violated after
 * the item was enqueued).  Unlike isTechAvailable, this skips the "not already
 * queued" guard — the item is, by definition, in the queue.
 */
function canPurchaseQueuedTech(techId: string, tech: TechState): boolean {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return false;
  if (!node.repeatable && (tech.purchaseCount[techId] ?? 0) >= 1) return false;
  if (CARGO_PACT_IDS.has(techId)) {
    const conflict = [...CARGO_PACT_IDS].some(
      (id) => id !== techId && tech.completedTechIds.includes(id),
    );
    if (conflict) return false;
  }
  if (techId === "fuel_efficiency_1") return true;
  return node.edges.some((neighborId) =>
    tech.completedTechIds.includes(neighborId),
  );
}

export function processResearch(
  state: GameState,
  rpThisTurn: number,
): TechState {
  let tech: TechState = {
    ...state.tech,
    researchPoints: state.tech.researchPoints + rpThisTurn,
  };

  // Chain completions while top of queue is affordable and still valid
  while (tech.queue.length > 0) {
    const headId = tech.queue[0];
    // Re-validate: a queued cargo pact may have become invalid if another was
    // completed earlier in this same chain. Skip (remove) invalid entries.
    if (!canPurchaseQueuedTech(headId, tech)) {
      tech = { ...tech, queue: tech.queue.slice(1) };
      continue;
    }
    const cost = effectiveCost(headId, tech);
    if (tech.researchPoints < cost) break;
    tech = applyPurchase(headId, {
      ...tech,
      researchPoints: tech.researchPoints - cost,
    });
    tech = { ...tech, queue: tech.queue.slice(1) };
  }

  tech = {
    ...tech,
    currentResearchId: tech.queue[0] ?? null,
    researchProgress: tech.queue[0]
      ? Math.min(tech.researchPoints, effectiveCost(tech.queue[0], tech))
      : 0,
  };

  return tech;
}

export function calculateRPPerTurn(state: GameState): number {
  let rp = BASE_RP_PER_TURN;

  // Delivery RP: sum across active routes for the current turn.
  // Look up the most recent turn's trip count from history; if no history
  // yet (first turn) or the route isn't in the last turn's report, assume
  // 1 trip as a UI forecast estimate.
  const lastResult =
    state.history.length > 0 ? state.history[state.history.length - 1] : null;
  const tripsByRoute = new Map<string, number>();
  if (lastResult) {
    for (const perf of lastResult.routePerformance) {
      tripsByRoute.set(perf.routeId, perf.trips);
    }
  }

  for (const route of state.activeRoutes) {
    if (route.paused) continue;
    const trips = tripsByRoute.get(route.id) ?? 1;
    rp += calculateRouteRP(route, trips, state);
  }

  // Tech-effect RP: completed techs with addRPPerTurn effects.
  // No cap — the new economy uses room build costs and commitment scarcity
  // as the throttle, not a hard RP ceiling.
  for (const [techId, count] of Object.entries(state.tech.purchaseCount)) {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") {
        rp += effect.value * count;
      }
    }
  }

  // Hub-room RP: hub rooms with addRPPerTurn effects (Research Lab, R&D
  // Center, Theoretical Institute). state.stationHub is singular and may
  // be null.
  if (state.stationHub) {
    for (const room of state.stationHub.rooms) {
      const def = HUB_ROOM_DEFINITIONS[room.type];
      if (!def) continue;
      for (const effect of def.bonusEffects) {
        if (effect.type === "addRPPerTurn") {
          rp += effect.value;
        }
      }
    }
  }

  // Round to 2 decimals (delivery RP is fractional)
  return Math.round(rp * 100) / 100;
}

export interface RPBreakdown {
  base: number;
  delivery: number;
  infrastructure: number;
  total: number;
}

export function getRPBreakdown(state: GameState): RPBreakdown {
  const base = BASE_RP_PER_TURN;

  const lastResult =
    state.history.length > 0 ? state.history[state.history.length - 1] : null;
  const tripsByRoute = new Map<string, number>();
  if (lastResult) {
    for (const perf of lastResult.routePerformance) {
      tripsByRoute.set(perf.routeId, perf.trips);
    }
  }

  let delivery = 0;
  for (const route of state.activeRoutes) {
    if (route.paused) continue;
    const trips = tripsByRoute.get(route.id) ?? 1;
    delivery += calculateRouteRP(route, trips, state);
  }

  let infrastructure = 0;
  for (const [techId, count] of Object.entries(state.tech.purchaseCount)) {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") {
        infrastructure += effect.value * count;
      }
    }
  }
  if (state.stationHub) {
    for (const room of state.stationHub.rooms) {
      const def = HUB_ROOM_DEFINITIONS[room.type];
      if (!def) continue;
      for (const effect of def.bonusEffects) {
        if (effect.type === "addRPPerTurn") {
          infrastructure += effect.value;
        }
      }
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const total = base + delivery + infrastructure;
  return {
    base: round2(base),
    delivery: round2(delivery),
    infrastructure: round2(infrastructure),
    total: round2(total),
  };
}

export function getCurrentResearch(tech: TechState): Technology | null {
  if (!tech.queue[0]) return null;
  return TECH_GRAPH.find((t) => t.id === tech.queue[0]) ?? null;
}

export function getResearchProgress(tech: TechState): number {
  if (!tech.queue[0]) return 0;
  const node = TECH_GRAPH.find((t) => t.id === tech.queue[0]);
  if (!node) return 0;
  const cost = effectiveCost(tech.queue[0], tech);
  return Math.min(1, tech.researchPoints / cost);
}

export function getCompletedTechIds(tech: TechState): string[] {
  return tech.completedTechIds;
}
