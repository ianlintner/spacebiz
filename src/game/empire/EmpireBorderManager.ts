import type {
  BorderPort,
  DiplomaticRelation,
  Hyperlane,
  StarSystem,
  DiplomaticStatus,
} from "../../data/types.ts";
import { BORDER_PORTS_BY_STATUS } from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Empire Border Manager
//
// Determines border port states based on diplomatic relations.
// Cross-empire hyperlanes get border ports on each side; same-empire lanes
// have no ports. Port openness depends on the diplomatic status between
// the two empires.
// ---------------------------------------------------------------------------

/**
 * Identify all cross-empire hyperlanes and create border ports.
 * Called once during galaxy setup and whenever empires change.
 */
export function generateBorderPorts(
  hyperlanes: Hyperlane[],
  systems: StarSystem[],
  diplomaticRelations: DiplomaticRelation[],
): BorderPort[] {
  const sysMap = new Map(systems.map((s) => [s.id, s]));
  const ports: BorderPort[] = [];

  for (const hl of hyperlanes) {
    const sA = sysMap.get(hl.systemA);
    const sB = sysMap.get(hl.systemB);
    if (!sA || !sB) continue;

    // Same empire — no border ports needed
    if (sA.empireId === sB.empireId) continue;

    const status = getRelationStatus(
      sA.empireId,
      sB.empireId,
      diplomaticRelations,
    );
    const portStatus = getPortStatusForDiplomacy(status);

    // Each empire controls a port on their side
    ports.push({
      id: `bp-${sA.empireId}-${hl.id}`,
      empireId: sA.empireId,
      hyperlaneId: hl.id,
      systemId: hl.systemA,
      status: portStatus,
    });
    ports.push({
      id: `bp-${sB.empireId}-${hl.id}`,
      empireId: sB.empireId,
      hyperlaneId: hl.id,
      systemId: hl.systemB,
      status: portStatus,
    });
  }

  return ports;
}

/**
 * Update existing border ports based on current diplomatic relations.
 * Mutates and returns the ports array.
 */
export function updateBorderPorts(
  ports: BorderPort[],
  systems: StarSystem[],
  diplomaticRelations: DiplomaticRelation[],
): BorderPort[] {
  const sysMap = new Map(systems.map((s) => [s.id, s]));

  for (const port of ports) {
    const portSystem = sysMap.get(port.systemId);
    if (!portSystem) continue;

    // Find the other empire on this hyperlane
    const otherEmpirePort = ports.find(
      (p) => p.hyperlaneId === port.hyperlaneId && p.id !== port.id,
    );
    if (!otherEmpirePort) continue;

    const status = getRelationStatus(
      port.empireId,
      otherEmpirePort.empireId,
      diplomaticRelations,
    );
    port.status = getPortStatusForDiplomacy(status);
  }

  return ports;
}

/**
 * Select which border connections to keep open based on diplomatic status
 * and BORDER_PORTS_BY_STATUS configuration.
 *
 * For restricted status (peace): only the closest N ports per empire pair
 * remain open. RNG is used to break ties when distances are equal.
 */
export function applyPortRestrictions(
  ports: BorderPort[],
  hyperlanes: Hyperlane[],
  _systems: StarSystem[],
  diplomaticRelations: DiplomaticRelation[],
  rng: SeededRNG,
): BorderPort[] {
  const hlMap = new Map(hyperlanes.map((h) => [h.id, h]));

  // Group ports by empire pair
  const pairGroups = new Map<string, BorderPort[]>();
  for (const port of ports) {
    const otherPort = ports.find(
      (p) => p.hyperlaneId === port.hyperlaneId && p.id !== port.id,
    );
    if (!otherPort) continue;

    const pairKey = [port.empireId, otherPort.empireId].sort().join("-");
    if (!pairGroups.has(pairKey)) pairGroups.set(pairKey, []);
    pairGroups.get(pairKey)!.push(port);
  }

  for (const [, groupPorts] of pairGroups) {
    if (groupPorts.length === 0) continue;

    // All ports in a pair group share the same status
    const firstPort = groupPorts[0];
    const otherPort = ports.find(
      (p) => p.hyperlaneId === firstPort.hyperlaneId && p.id !== firstPort.id,
    );
    if (!otherPort) continue;

    const status = getRelationStatus(
      firstPort.empireId,
      otherPort.empireId,
      diplomaticRelations,
    );
    const allowedCount = BORDER_PORTS_BY_STATUS[status];

    // -1 means all open, 0 means all closed
    if (allowedCount === -1) {
      for (const p of groupPorts) p.status = "open";
      continue;
    }
    if (allowedCount === 0) {
      for (const p of groupPorts) p.status = "closed";
      continue;
    }

    // Sort by distance (shortest hyperlane = primary port), break ties with RNG
    const sortedPorts = [...groupPorts].sort((a, b) => {
      const hlA = hlMap.get(a.hyperlaneId);
      const hlB = hlMap.get(b.hyperlaneId);
      const distA = hlA?.distance ?? Infinity;
      const distB = hlB?.distance ?? Infinity;
      if (distA !== distB) return distA - distB;
      return rng.next() - 0.5;
    });

    // Open the closest N, restrict the rest
    for (let i = 0; i < sortedPorts.length; i++) {
      sortedPorts[i].status = i < allowedCount ? "open" : "restricted";
    }
  }

  return ports;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the diplomatic status between two empires.
 * Defaults to "peace" if no relation exists.
 */
export function getRelationStatus(
  empireA: string,
  empireB: string,
  relations: DiplomaticRelation[],
): DiplomaticStatus {
  const rel = relations.find(
    (r) =>
      (r.empireA === empireA && r.empireB === empireB) ||
      (r.empireA === empireB && r.empireB === empireA),
  );
  return rel?.status ?? "peace";
}

/**
 * Derive base port status from diplomatic status.
 */
function getPortStatusForDiplomacy(
  status: DiplomaticStatus,
): "open" | "closed" | "restricted" {
  const allowed = BORDER_PORTS_BY_STATUS[status];
  if (allowed === 0) return "closed";
  if (allowed === -1) return "open";
  return "restricted";
}
