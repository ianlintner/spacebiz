import type {
  Hyperlane,
  HyperlanePath,
  BorderPort,
  StarSystem,
  Planet,
} from "../../data/types.ts";

/**
 * Build adjacency list from hyperlanes, excluding edges blocked by closed border ports.
 */
function buildAdjacency(
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Map<string, Array<{ systemId: string; hyperlane: Hyperlane }>> {
  const closedHyperlaneIds = new Set<string>();
  for (const bp of borderPorts) {
    if (bp.status === "closed") closedHyperlaneIds.add(bp.hyperlaneId);
  }

  const adj = new Map<
    string,
    Array<{ systemId: string; hyperlane: Hyperlane }>
  >();

  for (const hl of hyperlanes) {
    if (closedHyperlaneIds.has(hl.id)) continue;

    if (!adj.has(hl.systemA)) adj.set(hl.systemA, []);
    if (!adj.has(hl.systemB)) adj.set(hl.systemB, []);
    adj.get(hl.systemA)!.push({ systemId: hl.systemB, hyperlane: hl });
    adj.get(hl.systemB)!.push({ systemId: hl.systemA, hyperlane: hl });
  }

  return adj;
}

/**
 * Find the shortest path between two systems using Dijkstra's algorithm.
 * Respects closed border ports by excluding those hyperlane edges.
 * Returns null if no path exists.
 */
export function findPath(
  fromSystemId: string,
  toSystemId: string,
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): HyperlanePath | null {
  if (fromSystemId === toSystemId) {
    return { segments: [], totalDistance: 0, systems: [fromSystemId] };
  }

  const adj = buildAdjacency(hyperlanes, borderPorts);

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<
    string,
    { systemId: string; hyperlane: Hyperlane } | null
  >();
  const visited = new Set<string>();

  dist.set(fromSystemId, 0);
  prev.set(fromSystemId, null);

  // Simple priority queue via sorted array (graph is small, ~80-120 nodes)
  const queue: Array<{ id: string; d: number }> = [{ id: fromSystemId, d: 0 }];

  while (queue.length > 0) {
    // Find min
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].d < queue[minIdx].d) minIdx = i;
    }
    const current = queue[minIdx];
    queue.splice(minIdx, 1);

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === toSystemId) break;

    const neighbors = adj.get(current.id);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.systemId)) continue;
      const newDist = current.d + neighbor.hyperlane.distance;
      const oldDist = dist.get(neighbor.systemId);
      if (oldDist === undefined || newDist < oldDist) {
        dist.set(neighbor.systemId, newDist);
        prev.set(neighbor.systemId, {
          systemId: current.id,
          hyperlane: neighbor.hyperlane,
        });
        queue.push({ id: neighbor.systemId, d: newDist });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(toSystemId)) return null;

  const segments: Hyperlane[] = [];
  const systems: string[] = [toSystemId];
  let cursor = toSystemId;

  while (cursor !== fromSystemId) {
    const entry = prev.get(cursor);
    if (!entry) return null;
    segments.unshift(entry.hyperlane);
    systems.unshift(entry.systemId);
    cursor = entry.systemId;
  }

  return {
    segments,
    totalDistance: dist.get(toSystemId)!,
    systems,
  };
}

/**
 * Get all systems reachable from a given system via open hyperlanes.
 * BFS flood-fill.
 */
export function getReachableSystems(
  fromSystemId: string,
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Set<string> {
  const adj = buildAdjacency(hyperlanes, borderPorts);
  const visited = new Set<string>();
  const queue = [fromSystemId];
  visited.add(fromSystemId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (!visited.has(n.systemId)) {
        visited.add(n.systemId);
        queue.push(n.systemId);
      }
    }
  }

  return visited;
}

/**
 * Calculate the path-based distance between two planets.
 * Same-system: use planet positions directly (short hops).
 * Different-system: use hyperlane path distance.
 * Returns -1 if no path exists.
 */
export function calculateHyperlaneDistance(
  planet1: Planet,
  planet2: Planet,
  _systems: StarSystem[],
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): number {
  if (planet1.systemId === planet2.systemId) {
    const dx = planet1.x - planet2.x;
    const dy = planet1.y - planet2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const path = findPath(
    planet1.systemId,
    planet2.systemId,
    hyperlanes,
    borderPorts,
  );
  if (!path) return -1;

  return path.totalDistance;
}

/**
 * Get the number of border crossings on a path between two systems.
 * A border crossing is a hyperlane connecting systems of different empires.
 */
export function countBorderCrossings(
  path: HyperlanePath,
  systems: StarSystem[],
): number {
  const sysMap = new Map(systems.map((s) => [s.id, s]));
  let crossings = 0;

  for (const seg of path.segments) {
    const sA = sysMap.get(seg.systemA);
    const sB = sysMap.get(seg.systemB);
    if (sA && sB && sA.empireId !== sB.empireId) {
      crossings++;
    }
  }

  return crossings;
}

/**
 * Get all hyperlanes connected to a given system.
 */
export function getSystemHyperlanes(
  systemId: string,
  hyperlanes: Hyperlane[],
): Hyperlane[] {
  return hyperlanes.filter(
    (hl) => hl.systemA === systemId || hl.systemB === systemId,
  );
}

/**
 * Get hyperlane neighbors of a system (all systems directly connected).
 */
export function getHyperlaneNeighbors(
  systemId: string,
  hyperlanes: Hyperlane[],
): string[] {
  const neighbors: string[] = [];
  for (const hl of hyperlanes) {
    if (hl.systemA === systemId) neighbors.push(hl.systemB);
    else if (hl.systemB === systemId) neighbors.push(hl.systemA);
  }
  return neighbors;
}
