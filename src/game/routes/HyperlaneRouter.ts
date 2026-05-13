import TinyQueue from "tinyqueue";
import type {
  Hyperlane,
  HyperlanePath,
  BorderPort,
  StarSystem,
  Planet,
} from "../../data/types.ts";

type Adjacency = Map<string, Array<{ systemId: string; hyperlane: Hyperlane }>>;

// Identity cache: GameStore is immutable (spread-replaced + frozen in dev),
// so reference equality on the input arrays is a safe invalidator. This
// matters because findPath / getReachableSystems are called in tight loops
// (scanAllRouteOpportunities, route builder previews, traffic visuals) and
// rebuilding the adjacency from scratch every call was the dominant cost.
let cachedAdj: Adjacency | null = null;
let cachedHyperlanesRef: Hyperlane[] | null = null;
let cachedBorderPortsRef: BorderPort[] | null = null;

let cachedComponents: Map<string, Set<string>> | null = null;
let cachedComponentsAdj: Adjacency | null = null;

function buildAdjacency(
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Adjacency {
  const closedHyperlaneIds = new Set<string>();
  for (const bp of borderPorts) {
    if (bp.status === "closed") closedHyperlaneIds.add(bp.hyperlaneId);
  }

  const adj: Adjacency = new Map();

  for (const hl of hyperlanes) {
    if (closedHyperlaneIds.has(hl.id)) continue;

    let a = adj.get(hl.systemA);
    if (!a) {
      a = [];
      adj.set(hl.systemA, a);
    }
    let b = adj.get(hl.systemB);
    if (!b) {
      b = [];
      adj.set(hl.systemB, b);
    }
    a.push({ systemId: hl.systemB, hyperlane: hl });
    b.push({ systemId: hl.systemA, hyperlane: hl });
  }

  return adj;
}

function getAdjacency(
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Adjacency {
  if (
    cachedAdj !== null &&
    cachedHyperlanesRef === hyperlanes &&
    cachedBorderPortsRef === borderPorts
  ) {
    return cachedAdj;
  }
  cachedAdj = buildAdjacency(hyperlanes, borderPorts);
  cachedHyperlanesRef = hyperlanes;
  cachedBorderPortsRef = borderPorts;
  // Components are derived from this adjacency, so invalidate them too.
  cachedComponents = null;
  cachedComponentsAdj = null;
  return cachedAdj;
}

// Single-source distance cache, keyed by adjacency identity then by source
// system. Built lazily on first request. The route-finder pair scan is the
// motivating case: for each origin system it asks the distance to every
// other system, so doing one Dijkstra per origin instead of P×P pathfinds
// turns 57k findPath calls into 240.
let cachedDistFromAdj: Adjacency | null = null;
let cachedDistFrom: Map<string, Map<string, number>> | null = null;

function getSingleSourceDistances(
  fromSystemId: string,
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Map<string, number> {
  const adj = getAdjacency(hyperlanes, borderPorts);
  if (cachedDistFromAdj !== adj) {
    cachedDistFromAdj = adj;
    cachedDistFrom = new Map();
  }
  const store = cachedDistFrom!;
  const hit = store.get(fromSystemId);
  if (hit) return hit;

  const dist = new Map<string, number>();
  dist.set(fromSystemId, 0);
  const queue = new TinyQueue<{ id: string; d: number }>(
    [{ id: fromSystemId, d: 0 }],
    (a, b) => a.d - b.d,
  );
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    const neighbors = adj.get(current.id);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (visited.has(n.systemId)) continue;
      const newDist = current.d + n.hyperlane.distance;
      const oldDist = dist.get(n.systemId);
      if (oldDist === undefined || newDist < oldDist) {
        dist.set(n.systemId, newDist);
        queue.push({ id: n.systemId, d: newDist });
      }
    }
  }
  store.set(fromSystemId, dist);
  return dist;
}

/**
 * Distance-only fast path. When the caller doesn't need the segment list
 * (just the number), this avoids the per-pair Dijkstra by computing
 * single-source distances once per origin and reusing them across all
 * destinations. Returns -1 when unreachable.
 */
export function getHyperlaneDistance(
  fromSystemId: string,
  toSystemId: string,
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): number {
  if (fromSystemId === toSystemId) return 0;
  const distances = getSingleSourceDistances(
    fromSystemId,
    hyperlanes,
    borderPorts,
  );
  return distances.get(toSystemId) ?? -1;
}

/**
 * Test-only hook to drop all module-level caches. Production state is
 * immutable so the identity check handles invalidation, but tests that
 * reuse array references across cases need a manual reset.
 */
export function _clearHyperlaneRouterCaches(): void {
  cachedAdj = null;
  cachedHyperlanesRef = null;
  cachedBorderPortsRef = null;
  cachedComponents = null;
  cachedComponentsAdj = null;
  cachedDistFromAdj = null;
  cachedDistFrom = null;
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

  const adj = getAdjacency(hyperlanes, borderPorts);

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<
    string,
    { systemId: string; hyperlane: Hyperlane } | null
  >();
  const visited = new Set<string>();

  dist.set(fromSystemId, 0);
  prev.set(fromSystemId, null);

  // Min-heap priority queue for O(n log n) Dijkstra (graph now 240-320 nodes)
  const queue = new TinyQueue<{ id: string; d: number }>(
    [{ id: fromSystemId, d: 0 }],
    (a, b) => a.d - b.d,
  );

  while (queue.length > 0) {
    const current = queue.pop()!;

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
  // Reachability is symmetric, so every system in the same connected
  // component shares the same reachable set. Compute components once per
  // (hyperlanes, borderPorts) tuple and look up the membership instead of
  // running a fresh BFS for each caller — the scanner pays this for every
  // origin planet, which dwarfed the rest of the route finder.
  const components = getReachabilityComponents(hyperlanes, borderPorts);
  const found = components.get(fromSystemId);
  if (found) return found;

  // System has no hyperlane edges — it's its own singleton component.
  const singleton = new Set<string>([fromSystemId]);
  components.set(fromSystemId, singleton);
  return singleton;
}

function getReachabilityComponents(
  hyperlanes: Hyperlane[],
  borderPorts: BorderPort[],
): Map<string, Set<string>> {
  const adj = getAdjacency(hyperlanes, borderPorts);
  if (cachedComponents !== null && cachedComponentsAdj === adj) {
    return cachedComponents;
  }

  const components = new Map<string, Set<string>>();
  for (const startId of adj.keys()) {
    if (components.has(startId)) continue;
    const component = new Set<string>();
    const stack = [startId];
    component.add(startId);
    while (stack.length > 0) {
      const current = stack.pop()!;
      const neighbors = adj.get(current);
      if (!neighbors) continue;
      for (const n of neighbors) {
        if (!component.has(n.systemId)) {
          component.add(n.systemId);
          stack.push(n.systemId);
        }
      }
    }
    // Share the same Set instance for every member of the component so the
    // caller's identity check (e.g. `reachable.has(x)`) is O(1) and we don't
    // duplicate memory per system.
    for (const sysId of component) components.set(sysId, component);
  }

  cachedComponents = components;
  cachedComponentsAdj = adj;
  return components;
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

  return getHyperlaneDistance(
    planet1.systemId,
    planet2.systemId,
    hyperlanes,
    borderPorts,
  );
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
