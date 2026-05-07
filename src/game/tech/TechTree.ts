import type { GameState, TechState, Technology } from "../../data/types.ts";
import {
  TECH_GRAPH,
  BASE_RP_PER_TURN,
  RP_DIVERSITY_THRESHOLD,
  RP_RESEARCH_PLANET_BONUS,
} from "../../data/constants.ts";

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

  // Diversity bonus
  const distinctCargos = new Set(
    state.activeRoutes
      .filter((r) => r.cargoType && r.assignedShipIds.length > 0)
      .map((r) => r.cargoType),
  );
  if (distinctCargos.size >= RP_DIVERSITY_THRESHOLD) {
    rp += 1;
  }

  // TechWorld bonus
  const researchPlanets = new Set(
    state.galaxy.planets.filter((p) => p.type === "techWorld").map((p) => p.id),
  );
  let researchRouteCount = 0;
  for (const route of state.activeRoutes) {
    if (route.assignedShipIds.length === 0) continue;
    if (
      researchPlanets.has(route.originPlanetId) ||
      researchPlanets.has(route.destinationPlanetId)
    ) {
      researchRouteCount++;
    }
  }
  rp += Math.floor(researchRouteCount * RP_RESEARCH_PLANET_BONUS);

  // RP node bonus (addRPPerTurn effects), capped at +4
  let rpNodeBonus = 0;
  for (const [techId, count] of Object.entries(state.tech.purchaseCount)) {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") {
        rpNodeBonus += effect.value * count;
      }
    }
  }
  rp += Math.min(Math.floor(rpNodeBonus), 4);

  return rp;
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
