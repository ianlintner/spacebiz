import type {
  DiplomaticRelation,
  DiplomaticStatus,
  DiplomaticIncident,
  Empire,
  StarSystem,
  BorderPort,
  Hyperlane,
} from "../../data/types.ts";
import {
  WAR_MIN_DURATION,
  WAR_MAX_DURATION,
  TRADE_PACT_PEACE_REQUIREMENT,
  ALLIANCE_PACT_REQUIREMENT,
  DIPLOMACY_DRIFT_CHANCE,
  COLD_WAR_ESCALATION_CHANCE,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import {
  generateBorderPorts,
  updateBorderPorts,
  applyPortRestrictions,
} from "./EmpireBorderManager.ts";

// ---------------------------------------------------------------------------
// Diplomacy Manager
//
// Manages diplomatic relations between empires.
// Relations progress through states: war ↔ coldWar ↔ peace ↔ tradePact ↔ alliance
// ---------------------------------------------------------------------------

const STATUS_LADDER: DiplomaticStatus[] = [
  "war",
  "coldWar",
  "peace",
  "tradePact",
  "alliance",
];

function statusIndex(s: DiplomaticStatus): number {
  return STATUS_LADDER.indexOf(s);
}

/**
 * Initialize diplomatic relations between all empire pairs.
 * Adjacent empires start at peace; distant empires start at coldWar.
 */
export function initializeDiplomacy(
  empires: Empire[],
  systems: StarSystem[],
  hyperlanes: Hyperlane[],
): DiplomaticRelation[] {
  const relations: DiplomaticRelation[] = [];
  const sysMap = new Map(systems.map((s) => [s.id, s]));

  // Build empire adjacency via hyperlanes
  const empireAdjacency = new Set<string>();
  for (const hl of hyperlanes) {
    const sA = sysMap.get(hl.systemA);
    const sB = sysMap.get(hl.systemB);
    if (sA && sB && sA.empireId !== sB.empireId) {
      const key = [sA.empireId, sB.empireId].sort().join("-");
      empireAdjacency.add(key);
    }
  }

  for (let i = 0; i < empires.length; i++) {
    for (let j = i + 1; j < empires.length; j++) {
      const eA = empires[i];
      const eB = empires[j];
      const key = [eA.id, eB.id].sort().join("-");
      const isAdjacent = empireAdjacency.has(key);

      relations.push({
        empireA: eA.id,
        empireB: eB.id,
        status: isAdjacent ? "peace" : "coldWar",
        turnsInCurrentStatus: 0,
      });
    }
  }

  return relations;
}

/**
 * Process one turn of diplomatic changes.
 * Returns updated relations, any incidents, and updated border ports.
 */
export function processDiplomacyTurn(
  relations: DiplomaticRelation[],
  _empires: Empire[],
  systems: StarSystem[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
  turn: number,
  rng: SeededRNG,
): {
  relations: DiplomaticRelation[];
  incidents: DiplomaticIncident[];
  borderPorts: BorderPort[];
} {
  const incidents: DiplomaticIncident[] = [];

  for (const rel of relations) {
    rel.turnsInCurrentStatus++;

    // Forced war end
    if (rel.status === "war" && rel.turnsInCurrentStatus >= WAR_MAX_DURATION) {
      rel.status = "coldWar";
      rel.turnsInCurrentStatus = 0;
      incidents.push({
        turn,
        description: `War between empires ended after ${WAR_MAX_DURATION} turns — forced ceasefire`,
        empireA: rel.empireA,
        empireB: rel.empireB,
      });
      continue;
    }

    // Cold war escalation
    if (rel.status === "coldWar" && rng.next() < COLD_WAR_ESCALATION_CHANCE) {
      rel.status = "war";
      rel.turnsInCurrentStatus = 0;
      incidents.push({
        turn,
        description: "Cold war escalated into open warfare",
        empireA: rel.empireA,
        empireB: rel.empireB,
      });
      continue;
    }

    // Random drift
    if (rng.next() < DIPLOMACY_DRIFT_CHANCE) {
      const result = applyDrift(rel, rng);
      if (result) {
        incidents.push({
          turn,
          description: result,
          empireA: rel.empireA,
          empireB: rel.empireB,
        });
      }
    }
  }

  // Update border ports based on new relations
  const updatedPorts = updateBorderPorts(borderPorts, systems, relations);
  const finalPorts = applyPortRestrictions(
    updatedPorts,
    hyperlanes,
    systems,
    relations,
    rng,
  );

  return { relations, incidents, borderPorts: finalPorts };
}

/**
 * Apply random diplomatic drift. Relations can improve or degrade by one step.
 */
function applyDrift(rel: DiplomaticRelation, rng: SeededRNG): string | null {
  const idx = statusIndex(rel.status);
  const improveChance = 0.6; // Slight bias toward improvement

  if (rng.next() < improveChance) {
    // Try to improve
    const canImprove = canTransitionUp(rel);
    if (canImprove) {
      const newStatus = STATUS_LADDER[idx + 1];
      rel.status = newStatus;
      rel.turnsInCurrentStatus = 0;
      return `Relations improved to ${newStatus}`;
    }
  } else {
    // Try to degrade
    if (idx > 0) {
      const newStatus = STATUS_LADDER[idx - 1];
      rel.status = newStatus;
      rel.turnsInCurrentStatus = 0;
      return `Relations degraded to ${newStatus}`;
    }
  }

  return null;
}

/**
 * Check whether a relation can transition up one step based on requirements.
 */
function canTransitionUp(rel: DiplomaticRelation): boolean {
  const idx = statusIndex(rel.status);
  if (idx >= STATUS_LADDER.length - 1) return false;

  switch (rel.status) {
    case "war":
      return rel.turnsInCurrentStatus >= WAR_MIN_DURATION;
    case "coldWar":
      return true;
    case "peace":
      return rel.turnsInCurrentStatus >= TRADE_PACT_PEACE_REQUIREMENT;
    case "tradePact":
      return rel.turnsInCurrentStatus >= ALLIANCE_PACT_REQUIREMENT;
    default:
      return false;
  }
}

/**
 * Forcibly set the diplomatic status between two empires.
 * Used by event effects.
 */
export function setDiplomaticStatus(
  empireA: string,
  empireB: string,
  newStatus: DiplomaticStatus,
  relations: DiplomaticRelation[],
): DiplomaticRelation[] {
  const rel = relations.find(
    (r) =>
      (r.empireA === empireA && r.empireB === empireB) ||
      (r.empireA === empireB && r.empireB === empireA),
  );

  if (rel) {
    rel.status = newStatus;
    rel.turnsInCurrentStatus = 0;
  } else {
    relations.push({
      empireA,
      empireB,
      status: newStatus,
      turnsInCurrentStatus: 0,
    });
  }

  return relations;
}

/**
 * Get the diplomatic relation between two empires, or null if not found.
 */
export function getRelation(
  empireA: string,
  empireB: string,
  relations: DiplomaticRelation[],
): DiplomaticRelation | null {
  return (
    relations.find(
      (r) =>
        (r.empireA === empireA && r.empireB === empireB) ||
        (r.empireA === empireB && r.empireB === empireA),
    ) ?? null
  );
}

/**
 * Generate initial border ports and apply restrictions.
 */
export function initializeBorderPorts(
  hyperlanes: Hyperlane[],
  systems: StarSystem[],
  relations: DiplomaticRelation[],
  rng: SeededRNG,
): BorderPort[] {
  const ports = generateBorderPorts(hyperlanes, systems, relations);
  return applyPortRestrictions(ports, hyperlanes, systems, relations, rng);
}
