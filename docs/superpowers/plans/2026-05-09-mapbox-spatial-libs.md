# Mapbox Spatial Libs Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate four spatial/geometry libraries (delaunator, kdbush, tinyqueue, earcut) to improve galaxy generation quality, pathfinding performance, and territory rendering.

**Architecture:** `delaunator` replaces the O(n²) brute-force edge generation in `generateHyperlanes` with a proper Delaunay triangulation (note: `HYPERLANE_DENSITY_CONFIGS` comments already say "fraction of Delaunay edges" — the design intent was always Delaunay). `kdbush` replaces linear planet/star scans with O(log n) spatial queries. `tinyqueue` gives Dijkstra a proper min-heap (graph grew from ~80 to 300 nodes). `earcut` pre-triangulates Voronoi territory polygons for filled empire territory rendering. A chokepoint pruning pass is added after hyperlane generation to create strategic empire borders.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, Phaser 4. Libraries: `delaunator`, `kdbush`, `tinyqueue`, `earcut` (all Mapbox/mourner ecosystem, ESM-native, zero deps each, ship own TS types).

---

## File Structure

**Modified files:**

- `package.json` — add 4 new dependencies
- `src/generation/GalaxyGenerator.ts` — replace O(n²) edge loop with delaunator; add `pruneEmpireBorderChokepoints`; remove `cross2d`, `segmentsCross`, `wouldCrossKeptEdges` (no longer needed — Delaunay is planar by construction)
- `src/data/constants.ts` — add `CHOKEPOINT_MAX_PER_PAIR` per density config
- `src/ui/RoutePickerMap.ts` — replace linear `findNearestPlanet` / `findNearestBarrenStar` scans with kdbush spatial index
- `src/game/routes/HyperlaneRouter.ts` — replace O(n²) sorted-array priority queue with tinyqueue min-heap
- `src/scenes/galaxy2d/GalaxyView2D.ts` — add `fillTerritoryGfx` + earcut-triangulated filled territory rendering

**Test files modified:**

- `src/generation/__tests__/GalaxyGenerator.test.ts` — add chokepoint and connectivity tests

---

### Task 1: Install packages and verify types

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install the four libraries**

```bash
npm install delaunator kdbush tinyqueue earcut
```

- [ ] **Step 2: Verify TypeScript resolves types for all four**

```bash
npx tsc --noEmit 2>&1 | grep -E "delaunator|kdbush|tinyqueue|earcut" || echo "Types OK — all four have bundled .d.ts files"
```

Expected: no errors for these packages. All four ship their own `index.d.ts`. If any shows "no type declarations", add `@types/<name>` for that package only.

- [ ] **Step 3: Verify they can be imported (quick smoke test)**

Create a temporary file `src/generation/_smoketest.ts`:

```ts
import Delaunator from "delaunator";
import KDBush from "kdbush";
import TinyQueue from "tinyqueue";
import earcut from "earcut";

// Prevent tree-shaking
console.log(Delaunator, KDBush, TinyQueue, earcut);
```

Run:

```bash
npx tsc --noEmit src/generation/_smoketest.ts 2>&1 || true
```

Expected: no type errors on the imports. Delete `_smoketest.ts` after.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add delaunator, kdbush, tinyqueue, earcut"
```

---

### Task 2: Replace O(n²) edge generation with delaunator

**Files:**

- Modify: `src/generation/GalaxyGenerator.ts` (lines ~570–660 — the `cross2d`, `segmentsCross`, `wouldCrossKeptEdges` functions and the nested `for i / for j` edge loop inside `generateHyperlanes`)

**Context:** `generateHyperlanes` currently does two nested `for` loops (lines ~650–659) that produce every possible pair of systems as candidate edges — O(n²). For 300 systems that's 44,850 edges. The comment on `HYPERLANE_DENSITY_CONFIGS` already says "fraction of Delaunay edges to keep", confirming the intended design. Delaunay triangulation gives us ~900 natural-neighbor edges for 300 systems, is O(n log n), and is planar by construction — so `wouldCrossKeptEdges` becomes unnecessary.

**delaunator half-edge API recap:**

- `d.triangles[e]` = index of point at origin of half-edge `e`
- next half-edge in the triangle = `e % 3 === 2 ? e - 2 : e + 1`
- each undirected edge appears twice; keep when `d.halfedges[e] === -1` (hull) OR `e < d.halfedges[e]`

- [ ] **Step 1: Write the failing tests first**

Add to `src/generation/__tests__/GalaxyGenerator.test.ts`:

```ts
it("hyperlane edges are planar (no crossing hyperlanes)", () => {
  const galaxy = generateGalaxy(
    42,
    "standard",
    GalaxyShape.Spiral,
    HyperlaneDensity.Medium,
  );
  const sysById = new Map(galaxy.systems.map((s) => [s.id, s]));
  const segs = galaxy.hyperlanes.map((hl) => ({
    x1: sysById.get(hl.systemA)!.x,
    y1: sysById.get(hl.systemA)!.y,
    x2: sysById.get(hl.systemB)!.x,
    y2: sysById.get(hl.systemB)!.y,
  }));
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i];
      const b = segs[j];
      // Skip adjacent segments (share an endpoint)
      if (
        (a.x1 === b.x1 && a.y1 === b.y1) ||
        (a.x1 === b.x2 && a.y1 === b.y2) ||
        (a.x2 === b.x1 && a.y2 === b.y1) ||
        (a.x2 === b.x2 && a.y2 === b.y2)
      )
        continue;
      function cross(ax: number, ay: number, bx: number, by: number) {
        return ax * by - ay * bx;
      }
      const d1 = cross(b.x2 - b.x1, b.y2 - b.y1, a.x1 - b.x1, a.y1 - b.y1);
      const d2 = cross(b.x2 - b.x1, b.y2 - b.y1, a.x2 - b.x1, a.y2 - b.y1);
      const d3 = cross(a.x2 - a.x1, a.y2 - a.y1, b.x1 - a.x1, b.y1 - a.y1);
      const d4 = cross(a.x2 - a.x1, a.y2 - a.y1, b.x2 - a.x1, b.y2 - a.y1);
      const crosses =
        ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
      expect(crosses).toBe(false);
    }
  }
});
```

- [ ] **Step 2: Run the test to confirm it currently fails**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.test.ts --reporter=verbose 2>&1 | grep -E "planar|FAIL|PASS"
```

Expected: `FAIL — hyperlane edges are planar` (current O(n²) approach doesn't prevent crossings reliably).

- [ ] **Step 3: Add the delaunator import to GalaxyGenerator.ts**

At the top of `src/generation/GalaxyGenerator.ts`, after the existing imports:

```ts
import Delaunator from "delaunator";
```

- [ ] **Step 4: Add the nextHalfedge helper above generateHyperlanes**

Insert before the `generateHyperlanes` function (around line 632):

```ts
function nextHalfedge(e: number): number {
  return e % 3 === 2 ? e - 2 : e + 1;
}
```

- [ ] **Step 5: Replace the O(n²) edge loop inside generateHyperlanes**

Find this block inside `generateHyperlanes` (lines ~646–660):

```ts
const allEdges: Edge[] = [];
const nearestNeighborDist = new Float64Array(systems.length);
for (let i = 0; i < systems.length; i++)
  nearestNeighborDist[i] = Number.POSITIVE_INFINITY;
for (let i = 0; i < systems.length; i++) {
  for (let j = i + 1; j < systems.length; j++) {
    const dx = systems[i].x - systems[j].x;
    const dy = systems[i].y - systems[j].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    allEdges.push({ a: i, b: j, dist });
    if (dist < nearestNeighborDist[i]) nearestNeighborDist[i] = dist;
    if (dist < nearestNeighborDist[j]) nearestNeighborDist[j] = dist;
  }
}
allEdges.sort((a, b) => a.dist - b.dist);
```

Replace it with:

```ts
// Build Delaunay triangulation — O(n log n) and planar by construction.
// HYPERLANE_DENSITY_CONFIGS comment already says "fraction of Delaunay edges";
// this makes that literally true instead of a superset approximation.
const coords = new Float64Array(systems.length * 2);
for (let i = 0; i < systems.length; i++) {
  coords[i * 2] = systems[i].x;
  coords[i * 2 + 1] = systems[i].y;
}
const delaunay = new Delaunator(coords);

const allEdges: Edge[] = [];
const nearestNeighborDist = new Float64Array(systems.length).fill(Infinity);
for (let e = 0; e < delaunay.triangles.length; e++) {
  // Skip the reverse half-edge so each undirected edge is processed once.
  // Hull edges (halfedges[e] === -1) have no reverse — always include them.
  if (delaunay.halfedges[e] !== -1 && e > delaunay.halfedges[e]) continue;
  const a = delaunay.triangles[e];
  const b = delaunay.triangles[nextHalfedge(e)];
  const dx = systems[a].x - systems[b].x;
  const dy = systems[a].y - systems[b].y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  allEdges.push({ a, b, dist });
  if (dist < nearestNeighborDist[a]) nearestNeighborDist[a] = dist;
  if (dist < nearestNeighborDist[b]) nearestNeighborDist[b] = dist;
}
allEdges.sort((a, b) => a.dist - b.dist);
```

- [ ] **Step 6: Remove the wouldCrossKeptEdges call from the density pass**

Find in `generateHyperlanes` (around line 748):

```ts
if (wouldCrossKeptEdges(e.a, e.b, systems, keptEdgeList)) continue;
```

Delete that line. (Delaunay edges are planar by construction — the cross-check is now redundant.)

Also remove the `keptEdgeList` array that was only used by `wouldCrossKeptEdges`. Find and remove:

```ts
const keptEdgeList: Array<[number, number]> = [];
```

And the two lines that push to it inside `addEdge` and `addMSTEdge`:

```ts
keptEdgeList.push([Math.min(a, b), Math.max(a, b)]);
```

(There are two of these — one in `addEdge` and one in `addMSTEdge`.)

- [ ] **Step 7: Delete the now-unused helper functions**

Delete the three functions `cross2d`, `segmentsCross`, and `wouldCrossKeptEdges` entirely (lines ~569–630). TypeScript strict mode will error on unused code so they must go.

- [ ] **Step 8: Run all tests**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass including the new planarity test.

- [ ] **Step 9: Run full check**

```bash
npm run check 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add src/generation/GalaxyGenerator.ts src/generation/__tests__/GalaxyGenerator.test.ts
git commit -m "feat(galaxy): replace O(n²) edge generation with delaunator triangulation

Delaunay triangulation is O(n log n) and planar by construction.
- 300-system standard galaxy: 44,850 candidate edges → ~900 Delaunay edges
- wouldCrossKeptEdges check removed (planarity guaranteed by Delaunay)
- keptEdgeList tracking removed (no longer needed)
- Density keepRatio now literally applies to Delaunay edges as the config comment always said"
```

---

### Task 3: Add empire border chokepoint pruning

**Files:**

- Modify: `src/data/constants.ts` — add `chokepoints` field to `HYPERLANE_DENSITY_CONFIGS`
- Modify: `src/generation/GalaxyGenerator.ts` — add `pruneEmpireBorderChokepoints` function; call it from `generateGalaxy`
- Modify: `src/generation/__tests__/GalaxyGenerator.test.ts` — add chokepoint count + connectivity tests

**Context:** After hyperlane generation, empire-adjacent pairs can have many cross-border connections. Strategic gameplay needs chokepoints — 1–2 hyperlanes per empire border. The pruning function removes excess cross-empire edges while guaranteeing the graph stays fully connected (union-find repair pass restores any disconnected component).

- [ ] **Step 1: Add chokepoints config to HYPERLANE_DENSITY_CONFIGS in constants.ts**

Find in `src/data/constants.ts`:

```ts
export const HYPERLANE_DENSITY_CONFIGS: Record<
  HyperlaneDensity,
  { keepRatio: number; maxConn: number }
> = {
  [HyperlaneDensity.Low]: { keepRatio: 0.45, maxConn: 3 },
  [HyperlaneDensity.Medium]: { keepRatio: 0.6, maxConn: 4 },
  [HyperlaneDensity.High]: { keepRatio: 0.75, maxConn: 5 },
};
```

Replace with:

```ts
export const HYPERLANE_DENSITY_CONFIGS: Record<
  HyperlaneDensity,
  { keepRatio: number; maxConn: number; chokepoints: number }
> = {
  [HyperlaneDensity.Low]: { keepRatio: 0.45, maxConn: 3, chokepoints: 1 },
  [HyperlaneDensity.Medium]: { keepRatio: 0.6, maxConn: 4, chokepoints: 2 },
  [HyperlaneDensity.High]: { keepRatio: 0.75, maxConn: 5, chokepoints: 3 },
};
```

- [ ] **Step 2: Write the failing tests**

Add to `src/generation/__tests__/GalaxyGenerator.test.ts`:

```ts
it("galaxy remains fully connected after chokepoint pruning", () => {
  for (const seed of [1, 42, 100]) {
    const galaxy = generateGalaxy(seed);
    const adj = new Map<string, string[]>();
    for (const hl of galaxy.hyperlanes) {
      if (!adj.has(hl.systemA)) adj.set(hl.systemA, []);
      if (!adj.has(hl.systemB)) adj.set(hl.systemB, []);
      adj.get(hl.systemA)!.push(hl.systemB);
      adj.get(hl.systemB)!.push(hl.systemA);
    }
    const start = galaxy.systems[0].id;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    expect(visited.size).toBe(galaxy.systems.length);
  }
});

it("empire border hyperlanes are limited to chokepoint max (Medium = 2)", () => {
  for (const seed of [1, 42, 100]) {
    const galaxy = generateGalaxy(
      seed,
      "standard",
      GalaxyShape.Spiral,
      HyperlaneDensity.Medium,
    );
    const sysById = new Map(galaxy.systems.map((s) => [s.id, s]));
    const crossCount = new Map<string, number>();
    for (const hl of galaxy.hyperlanes) {
      const empA = sysById.get(hl.systemA)!.empireId;
      const empB = sysById.get(hl.systemB)!.empireId;
      if (empA === empB) continue;
      const key = empA < empB ? `${empA}|${empB}` : `${empB}|${empA}`;
      crossCount.set(key, (crossCount.get(key) ?? 0) + 1);
    }
    for (const [, count] of crossCount) {
      expect(count).toBeLessThanOrEqual(2);
    }
  }
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.test.ts -t "chokepoint|connected" 2>&1 | grep -E "FAIL|PASS|×|✓"
```

Expected: both tests FAIL (no pruning implemented yet; connectivity test passes since current graph is connected, but chokepoint count test fails).

- [ ] **Step 4: Add pruneEmpireBorderChokepoints to GalaxyGenerator.ts**

Add this function after `generateHyperlanes` (around line 806, before `scoreEdgeForShape`):

```ts
/**
 * Limit cross-empire hyperlanes to maxPerPair per adjacent empire pair.
 * Creates strategic chokepoints at empire borders. If pruning would disconnect
 * the graph, the shortest removed edge(s) are added back to restore connectivity.
 */
function pruneEmpireBorderChokepoints(
  hyperlanes: Hyperlane[],
  systems: StarSystem[],
  maxPerPair: number,
): Hyperlane[] {
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const sysIdx = new Map(systems.map((s, i) => [s.id, i]));
  const intraEmpire: Hyperlane[] = [];
  const crossByPair = new Map<string, Hyperlane[]>();

  for (const hl of hyperlanes) {
    const empA = sysById.get(hl.systemA)?.empireId;
    const empB = sysById.get(hl.systemB)?.empireId;
    if (!empA || !empB || empA === empB) {
      intraEmpire.push(hl);
    } else {
      const key = empA < empB ? `${empA}|${empB}` : `${empB}|${empA}`;
      const arr = crossByPair.get(key) ?? [];
      arr.push(hl);
      crossByPair.set(key, arr);
    }
  }

  const kept: Hyperlane[] = [];
  const pruned: Hyperlane[] = [];
  for (const [, lanes] of crossByPair) {
    lanes.sort((a, b) => a.distance - b.distance);
    kept.push(...lanes.slice(0, maxPerPair));
    pruned.push(...lanes.slice(maxPerPair));
  }

  // Union-find to verify connectivity of pruned graph
  const parent = new Int32Array(systems.length);
  for (let i = 0; i < systems.length; i++) parent[i] = i;
  function ufFind(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function ufUnion(a: number, b: number): boolean {
    const ra = ufFind(a);
    const rb = ufFind(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  }
  for (const hl of [...intraEmpire, ...kept]) {
    ufUnion(sysIdx.get(hl.systemA)!, sysIdx.get(hl.systemB)!);
  }

  // Add back pruned edges (shortest first) only when needed to restore connectivity
  pruned.sort((a, b) => a.distance - b.distance);
  for (const hl of pruned) {
    const a = sysIdx.get(hl.systemA)!;
    const b = sysIdx.get(hl.systemB)!;
    if (ufFind(a) !== ufFind(b)) {
      kept.push(hl);
      ufUnion(a, b);
    }
  }

  return [...intraEmpire, ...kept];
}
```

- [ ] **Step 5: Call pruneEmpireBorderChokepoints from generateGalaxy**

In `generateGalaxy`, find where `generateHyperlanes` is called and its result is returned (around line 489–498):

```ts
const hyperlanes = generateHyperlanes(
  rng,
  systems,
  shape,
  hyperlaneDensity,
  mapBounds,
);
return { sectors, empires, systems, planets, hyperlanes };
```

Replace with:

```ts
const rawHyperlanes = generateHyperlanes(
  rng,
  systems,
  shape,
  hyperlaneDensity,
  mapBounds,
);
const hyperlanes = pruneEmpireBorderChokepoints(
  rawHyperlanes,
  systems,
  HYPERLANE_DENSITY_CONFIGS[hyperlaneDensity].chokepoints,
);
return { sectors, empires, systems, planets, hyperlanes };
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass including both new ones.

- [ ] **Step 7: Run full check**

```bash
npm run check 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/generation/GalaxyGenerator.ts src/data/constants.ts src/generation/__tests__/GalaxyGenerator.test.ts
git commit -m "feat(galaxy): add empire border chokepoint pruning

Limits cross-empire hyperlanes to 1/2/3 per adjacent empire pair (Low/Medium/High
density). Union-find repair pass ensures the graph stays fully connected even when
pruning is aggressive. Creates strategic bottlenecks at empire borders."
```

---

### Task 4: kdbush spatial index in RoutePickerMap

**Files:**

- Modify: `src/ui/RoutePickerMap.ts`

**Context:** `findNearestPlanet` and `findNearestBarrenStar` currently do O(n) linear scans over `planetHits` and `barrenStarHits` arrays on every `pointermove` event. With 500 planets these are ~3µs each (fine), but kdbush makes the intent explicit and scales cleanly to larger galaxies. The index is rebuilt in `draw()` after the hits arrays are populated.

kdbush API:

```ts
const index = new KDBush(numPoints); // nodeSize optional, default 64
index.add(x, y); // call once per point
index.finish(); // must call before querying
index.within(x, y, r); // returns number[] of point indices
```

- [ ] **Step 1: Add kdbush import to RoutePickerMap.ts**

At the top of `src/ui/RoutePickerMap.ts`, after the existing imports:

```ts
import KDBush from "kdbush";
```

- [ ] **Step 2: Add index fields to the class**

In the class body after `private barrenStarHits: StarHit[] = [];`:

```ts
  private planetIndex: KDBush | null = null;
  private barrenIndex: KDBush | null = null;
```

- [ ] **Step 3: Build both indexes at the end of draw()**

In `draw()`, after `this.planetHits = hits;`, add:

```ts
// Build spatial indexes for O(log n) nearest-point queries.
const pi = new KDBush(this.planetHits.length);
for (const h of this.planetHits) pi.add(h.mx, h.my);
pi.finish();
this.planetIndex = pi;

const bi = new KDBush(this.barrenStarHits.length);
for (const h of this.barrenStarHits) bi.add(h.mx, h.my);
bi.finish();
this.barrenIndex = bi;
```

- [ ] **Step 4: Replace findNearestPlanet to use the index**

Find the current `findNearestPlanet` method and replace it entirely:

```ts
  findNearestPlanet(worldX: number, worldY: number): string | null {
    if (this.planetHits.length === 0 || !this.planetIndex) return null;
    // Adaptive radius search: start at 20px, double until a planet is found.
    let r = 20;
    let ids: number[] = [];
    while (ids.length === 0 && r < 2000) {
      ids = this.planetIndex.within(worldX, worldY, r);
      r *= 2;
    }
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const i of ids) {
      const h = this.planetHits[i];
      const dx = h.mx - worldX;
      const dy = h.my - worldY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; bestId = h.id; }
    }
    return bestId;
  }
```

- [ ] **Step 5: Replace findNearestBarrenStar to use the index**

Find the current `private findNearestBarrenStar` method and replace it entirely:

```ts
  private findNearestBarrenStar(worldX: number, worldY: number): StarHit | null {
    if (this.barrenStarHits.length === 0 || !this.barrenIndex) return null;
    const ids = this.barrenIndex.within(worldX, worldY, 20);
    if (ids.length === 0) return null;
    let best: StarHit | null = null;
    let bestDist = Infinity;
    for (const i of ids) {
      const h = this.barrenStarHits[i];
      const dx = h.mx - worldX;
      const dy = h.my - worldY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = h; }
    }
    return best;
  }
```

- [ ] **Step 6: Clear indexes in destroy()**

In `destroy()`, add before `this.graphics.destroy()`:

```ts
this.planetIndex = null;
this.barrenIndex = null;
```

- [ ] **Step 7: Run typecheck and tests**

```bash
npm run typecheck 2>&1 | tail -5
npx vitest run 2>&1 | tail -10
```

Expected: clean typecheck, all tests pass (RoutePickerMap has no unit tests — visual behavior verified in browser).

- [ ] **Step 8: Commit**

```bash
git add src/ui/RoutePickerMap.ts
git commit -m "feat(route-picker): kdbush spatial index for nearest-planet queries

Replaces O(n) linear scan with O(log n) kdbush within() query.
Index is rebuilt in draw() after planetHits and barrenStarHits are populated.
Adaptive radius search (20px, doubles) ensures correctness for sparse areas."
```

---

### Task 5: tinyqueue min-heap in HyperlaneRouter

**Files:**

- Modify: `src/game/routes/HyperlaneRouter.ts`

**Context:** `findPath` uses a sorted-array priority queue (O(n) find-min + O(n) splice per iteration = O(n²) total). The comment at line 67 says "graph is small, ~80–120 nodes" — but after expanding galaxy size, the graph is now 240–320 nodes. tinyqueue is a binary min-heap: O(log n) push and pop.

tinyqueue API:

```ts
const q = new TinyQueue<T>(initialItems, comparator);
q.push(item);
const item = q.pop();
q.length;
```

- [ ] **Step 1: Add tinyqueue import to HyperlaneRouter.ts**

At the top of `src/game/routes/HyperlaneRouter.ts`:

```ts
import TinyQueue from "tinyqueue";
```

- [ ] **Step 2: Replace the priority queue in findPath**

Find in `findPath` (lines ~66–98) — the sorted array priority queue:

```ts
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
```

Replace with:

```ts
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
```

- [ ] **Step 3: Run existing HyperlaneRouter tests**

```bash
npx vitest run src/game/routes/__tests__/HyperlaneRouter.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass (correctness unchanged — only the data structure implementation changed).

- [ ] **Step 4: Run full check**

```bash
npm run check 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/game/routes/HyperlaneRouter.ts
git commit -m "perf(router): replace O(n²) sorted-array queue with tinyqueue min-heap

Dijkstra now runs in O(n log n) instead of O(n²).
Graph grew from ~80-120 to 240-320 nodes after galaxy scale expansion —
heap speedup is now meaningful. Existing correctness tests unchanged."
```

---

### Task 6: earcut filled territory rendering in GalaxyView2D

**Files:**

- Modify: `src/scenes/galaxy2d/GalaxyView2D.ts`

**Context:** Empire territory borders are drawn as strokes only (no fill). Adding semi-transparent filled territory backgrounds makes empires immediately readable. `earcut` triangulates each Voronoi polygon at `rebuildTerritoryPolygons` time (one-shot, not per-frame). Each frame, the stored triangle indices are used to fill projected triangles using `Graphics.fillTriangle`. A separate `fillTerritoryGfx` at `TERRITORY_DEPTH - 1` ensures fills render under the stroke borders.

Voronoi cells in this codebase are convex by construction (all clipping in `SpiralPlacer.ts` uses half-planes which preserve convexity). earcut is used here for correctness with any future polygon shape — if a cell clips to 3 vertices it's already a triangle; earcut handles it cleanly for all cases.

earcut API:

```ts
// Flat array of [x0, y0, x1, y1, ...] coords
const indices = earcut(flatCoords); // returns [i0, i1, i2, i3, ...] triangle index triples
```

- [ ] **Step 1: Add earcut import to GalaxyView2D.ts**

At the top of `src/scenes/galaxy2d/GalaxyView2D.ts`, after existing imports:

```ts
import earcut from "earcut";
```

- [ ] **Step 2: Update the territoryPolygons type to include triangleIndices**

Find the field declaration:

```ts
  private territoryPolygons: Array<{
    color: number;
    worldVerts: Array<{ x: number; y: number; z: number }>;
  }> = [];
```

Replace with:

```ts
  private territoryPolygons: Array<{
    color: number;
    worldVerts: Array<{ x: number; y: number; z: number }>;
    triangleIndices: number[];
  }> = [];
```

- [ ] **Step 3: Add fillTerritoryGfx field**

After `private territoryGfx: Phaser.GameObjects.Graphics | null = null;`:

```ts
  private fillTerritoryGfx: Phaser.GameObjects.Graphics | null = null;
```

- [ ] **Step 4: Update rebuildTerritoryPolygons to pre-triangulate and create fillTerritoryGfx**

Find `rebuildTerritoryPolygons` and replace it entirely:

```ts
  private rebuildTerritoryPolygons(empires: Empire[]): void {
    this.territoryPolygons = [];

    if (!this.fillTerritoryGfx) {
      this.fillTerritoryGfx = this.scene.add.graphics();
      this.fillTerritoryGfx.setDepth(TERRITORY_DEPTH - 1);
      this.galaxyContainer.add(this.fillTerritoryGfx);
    } else {
      this.fillTerritoryGfx.clear();
    }
    if (!this.territoryGfx) {
      this.territoryGfx = this.scene.add.graphics();
      this.territoryGfx.setDepth(TERRITORY_DEPTH);
      this.galaxyContainer.add(this.territoryGfx);
    } else {
      this.territoryGfx.clear();
    }

    for (const emp of empires) {
      const poly = emp.territoryPolygon;
      if (!poly || poly.vertices.length < 3) continue;
      const worldVerts = poly.vertices.map((v) => ({
        x: v.x * COORD_SCALE - this.centroidX,
        y: -0.6,
        z: v.y * COORD_SCALE - this.centroidZ,
      }));

      // Pre-triangulate in 3D disc space (x,z are the disc plane).
      // Voronoi cells are convex so earcut always produces n-2 correct triangles.
      const flatCoords: number[] = [];
      for (const wv of worldVerts) { flatCoords.push(wv.x, wv.z); }
      const triangleIndices = earcut(flatCoords);

      this.territoryPolygons.push({ color: emp.color, worldVerts, triangleIndices });
    }
  }
```

- [ ] **Step 5: Add filled triangle rendering in the update() draw pass**

In the `update()` method, find the territory border drawing block that starts with:

```ts
    if (this.territoryGfx) {
      this.territoryGfx.clear();
      for (const poly of this.territoryPolygons) {
```

Insert the fill pass immediately BEFORE that block:

```ts
// Empire territory fill — semi-transparent colored triangles under the border.
if (this.fillTerritoryGfx) {
  this.fillTerritoryGfx.clear();
  for (const poly of this.territoryPolygons) {
    if (poly.worldVerts.length < 3 || poly.triangleIndices.length < 3) continue;
    // Project all vertices to screen once.
    const screenPts: Array<{ x: number; y: number }> = [];
    for (const wv of poly.worldVerts) {
      this.scratchNdcA.x = wv.x;
      this.scratchNdcA.y = wv.y;
      this.scratchNdcA.z = wv.z;
      const proj = projectToScreenDesignInto(
        this.scratchNdcB,
        this.scratchNdcA,
        viewProj,
        this.viewport,
      );
      screenPts.push({ x: proj.x, y: proj.y });
    }
    // Draw each earcut triangle as a filled shape.
    this.fillTerritoryGfx.fillStyle(poly.color, 0.07);
    for (let t = 0; t < poly.triangleIndices.length; t += 3) {
      const p0 = screenPts[poly.triangleIndices[t]];
      const p1 = screenPts[poly.triangleIndices[t + 1]];
      const p2 = screenPts[poly.triangleIndices[t + 2]];
      this.fillTerritoryGfx.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    }
  }
}
```

- [ ] **Step 6: Clean up fillTerritoryGfx in the destroy path**

Find the destroy block that cleans up `territoryGfx`:

```ts
if (this.territoryGfx) {
  this.territoryGfx.destroy();
  this.territoryGfx = null;
}
this.territoryPolygons = [];
```

Add fill cleanup before it:

```ts
if (this.fillTerritoryGfx) {
  this.fillTerritoryGfx.destroy();
  this.fillTerritoryGfx = null;
}
if (this.territoryGfx) {
  this.territoryGfx.destroy();
  this.territoryGfx = null;
}
this.territoryPolygons = [];
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```

Expected: clean. If `fillTriangle` is missing from Phaser 4 types, the error will say `Property 'fillTriangle' does not exist`. In that case, replace:

```ts
this.fillTerritoryGfx.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
```

with:

```ts
this.fillTerritoryGfx.fillPoints([p0, p1, p2], true);
```

(`fillPoints` is the Phaser 4 fallback — it fills an arbitrary polygon.)

- [ ] **Step 8: Run full check**

```bash
npm run check 2>&1 | tail -10
```

Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/galaxy2d/GalaxyView2D.ts
git commit -m "feat(galaxy2d): earcut filled empire territory rendering

Pre-triangulates Voronoi territory polygons at rebuildTerritoryPolygons time
using earcut. Each frame projects stored vertices to screen and fills each
triangle at 0.07 alpha. fillTerritoryGfx renders at TERRITORY_DEPTH-1 so
fills appear under the existing colored stroke borders."
```

---

### Task 7: Final integration verification

**Files:** none new

- [ ] **Step 1: Run full test suite**

```bash
npm run check 2>&1 | tail -20
```

Expected: exit 0, all CI gates pass.

- [ ] **Step 2: Verify generation performance hasn't regressed**

```bash
npx vitest run src/generation/__tests__/GenerationPerf.test.ts --reporter=verbose 2>&1
```

Expected: "generates a quick galaxy in under 500ms" still passes. If it's close to the limit, the Delaunay switch should have made it faster.

- [ ] **Step 3: Push to PR branch**

```bash
git push origin HEAD
```

---

## Self-Review

**Spec coverage:**

- ✅ delaunator replaces O(n²) in `generateHyperlanes` (Task 2)
- ✅ Chokepoint pruning with connectivity repair (Task 3)
- ✅ kdbush in `RoutePickerMap` nearest-planet/barren-star queries (Task 4)
- ✅ tinyqueue in `HyperlaneRouter.findPath` (Task 5)
- ✅ earcut filled territory rendering in `GalaxyView2D` (Task 6)

**Placeholder scan:** No TBD/TODO. All code blocks are complete.

**Type consistency:**

- `HYPERLANE_DENSITY_CONFIGS` gains `chokepoints: number` — used in Task 3 as `HYPERLANE_DENSITY_CONFIGS[hyperlaneDensity].chokepoints` ✅
- `territoryPolygons` array type gains `triangleIndices: number[]` — used in Task 6 as `poly.triangleIndices` ✅
- `KDBush` type from `"kdbush"` — used as `KDBush | null` field, constructed in `draw()` ✅
- `TinyQueue` from `"tinyqueue"` — used in `findPath`, generic type `{ id: string; d: number }` ✅
