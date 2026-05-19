# Research Economy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the tech tree's RP economy: layered delivery RP formula + three-tier infrastructure rooms + branch commitment system (cash-spend, hard cap 3) gating T3/T4, with T3/T4 RP costs doubled.

**Architecture:** Pure-function game logic for the new RP formula and commitment management lives in `src/game/tech/`. UI changes layer additions onto the existing tech tree right rail (commit button on detail card, commitment badge, RP source breakdown on Bonuses tab). HUB_ROOM_DEFINITIONS gains two new tiers; the legacy ResearchLab is rewritten. No changes to the tech graph shape — only RP cost numbers move.

**Tech Stack:** Phaser 4 (`import * as Phaser from "phaser"`), TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Vitest 4, `@spacebiz/ui` component library.

**Reference spec:** [docs/superpowers/specs/2026-05-18-research-economy-redesign-design.md](../specs/2026-05-18-research-economy-redesign-design.md)

---

## File Map

**New files:**

- `src/game/tech/BranchCommitment.ts` — commitment cost table, accessors, mutators
- `src/game/tech/__tests__/BranchCommitment.test.ts` — tests
- `src/game/tech/DeliveryRP.ts` — per-route RP formula
- `src/game/tech/__tests__/DeliveryRP.test.ts` — tests
- `src/ui/tech/TechCommitmentBadge.ts` — "Commitments N / 3" indicator
- `src/ui/tech/__tests__/TechCommitmentBadge.test.ts` — tests

**Modified:**

- `src/data/types.ts` — add `committedBranches: string[]` to TechState
- `src/data/constants.ts` — bump SAVE_VERSION; T3/T4 RP cost doubling in TECH_GRAPH; rewrite ResearchLab + add R&D Center + Theoretical Institute in HUB_ROOM_DEFINITIONS; add commitment cost array
- `src/game/tech/TechTree.ts` — new `calculateRPPerTurn` (delivers + infra + base); update `isTechAvailable` to enforce commitment gate
- `src/ui/tech/TechDetailCard.ts` — show "Commit to <Branch> — §<cost>" button when applicable
- `src/ui/tech/TechBonusesPanel.ts` — add RP/turn source breakdown row above stat grid
- `src/ui/TechGraphCanvas.ts` — update node-locked logic to flag T3/T4 in uncommitted branches as locked
- `src/scenes/TechTreeScene.ts` — wire `TechCommitmentBadge` + commit-button handler
- `src/scenes/StationBuilderScene.ts` — enforce new room prereqs (R&D Center / Theoretical Institute require commitments held)

**Deleted:** none.

---

## Task 1: TechState Schema + Save Version Bump

**Files:**

- Modify: `src/data/types.ts:1148-1155`
- Modify: `src/data/constants.ts:15` (SAVE_VERSION)

This grounds everything else. Adds a single field to `TechState` and bumps the save version so the existing "alpha — clean save breaks OK" policy kicks in for old saves.

- [ ] **Step 1: Extend TechState**

Edit `src/data/types.ts` around line 1148. Replace:

```typescript
export interface TechState {
  researchPoints: number;
  completedTechIds: string[]; // kept for backwards compat; derived from purchaseCount
  purchaseCount: Record<string, number>; // techId → times purchased (source of truth)
  queue: string[]; // ordered pending unlock IDs
  currentResearchId: string | null; // = queue[0] ?? null
  researchProgress: number; // display value: Math.min(rp, effectiveCost(queue[0]))
}
```

With:

```typescript
export interface TechState {
  researchPoints: number;
  completedTechIds: string[]; // kept for backwards compat; derived from purchaseCount
  purchaseCount: Record<string, number>; // techId → times purchased (source of truth)
  queue: string[]; // ordered pending unlock IDs
  currentResearchId: string | null; // = queue[0] ?? null
  researchProgress: number; // display value: Math.min(rp, effectiveCost(queue[0]))
  /** Branch IDs the player has paid to commit to. Unlocks T3+ research in
   * those branches. Hard-capped at 3 commitments per game; cost scales per
   * commitment (see COMMITMENT_COSTS). Permanent — no swaps. */
  committedBranches: string[];
}
```

- [ ] **Step 2: Bump SAVE_VERSION**

Edit `src/data/constants.ts:15`:

```typescript
export const SAVE_VERSION = 12;
```

- [ ] **Step 3: Initialise committedBranches in fresh state**

Search for the `TechState` literal initialiser. Run:

```bash
grep -n "completedTechIds: \[\]" /Users/ianlintner/Projects/spacebiz/.claude/worktrees/research-economy-redesign/src/ -r
```

For each match where a fresh `TechState` is constructed (typically `NewGameSetup.ts` and any test fixture builders), add `committedBranches: []` to the literal. There should be 1-3 production matches plus a handful of test fixtures.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (0 errors). If any test fixture is missing the field, add `committedBranches: []` to it.

- [ ] **Step 5: Tests**

Run: `npm run test`
Expected: PASS. Tests that built TechState literals get the new field added in Step 3.

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/constants.ts src/game/ src/ui/ src/scenes/ src/testing/
git commit -m "feat(tech): add committedBranches to TechState, bump SAVE_VERSION to 12"
```

---

## Task 2: Commitment Cost Constants

**Files:**

- Modify: `src/data/constants.ts` (append at end of tech section)

Spec: 1st commit §50k, 2nd §150k, 3rd §400k, hard cap 3.

- [ ] **Step 1: Add the constant**

Append at the end of `src/data/constants.ts`:

```typescript
/**
 * Cash cost in §-credits to acquire the Nth branch commitment (1-indexed).
 * Hard-capped at 3 commitments per game. Permanent — no swaps or refunds.
 * See docs/superpowers/specs/2026-05-18-research-economy-redesign-design.md.
 */
export const COMMITMENT_COSTS = [50_000, 150_000, 400_000] as const;

export const MAX_COMMITMENTS = COMMITMENT_COSTS.length;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/constants.ts
git commit -m "feat(tech): add COMMITMENT_COSTS / MAX_COMMITMENTS constants"
```

---

## Task 3: BranchCommitment Module (TDD)

**Files:**

- Create: `src/game/tech/BranchCommitment.ts`
- Test: `src/game/tech/__tests__/BranchCommitment.test.ts`

Pure logic for accessing and mutating commitments. No side effects, no state mutation; returns new objects.

- [ ] **Step 1: Write failing tests**

Create `src/game/tech/__tests__/BranchCommitment.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  getCommitmentCount,
  getNextCommitmentCost,
  canCommitToBranch,
  commitToBranch,
  isBranchCommitted,
} from "../BranchCommitment.ts";
import type { TechState } from "../../../data/types.ts";

function emptyTechState(): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
    committedBranches: [],
  };
}

describe("BranchCommitment", () => {
  describe("getCommitmentCount", () => {
    it("returns 0 for fresh state", () => {
      expect(getCommitmentCount(emptyTechState())).toBe(0);
    });

    it("counts committed branches", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering"],
      };
      expect(getCommitmentCount(tech)).toBe(2);
    });
  });

  describe("getNextCommitmentCost", () => {
    it("returns 50000 for the 1st commitment", () => {
      expect(getNextCommitmentCost(emptyTechState())).toBe(50_000);
    });

    it("returns 150000 for the 2nd commitment", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics"],
      };
      expect(getNextCommitmentCost(tech)).toBe(150_000);
    });

    it("returns 400000 for the 3rd commitment", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering"],
      };
      expect(getNextCommitmentCost(tech)).toBe(400_000);
    });

    it("returns null when cap reached", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering", "fleet"],
      };
      expect(getNextCommitmentCost(tech)).toBeNull();
    });
  });

  describe("canCommitToBranch", () => {
    it("requires the branch's mastery node to be researched", () => {
      const tech = emptyTechState();
      const result = canCommitToBranch("logistics", tech, 1_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/mastery/i);
      }
    });

    it("requires sufficient cash", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = canCommitToBranch("logistics", tech, 10_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/insufficient|cash/i);
      }
    });

    it("rejects double-commit to same branch", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
        committedBranches: ["logistics"],
      };
      const result = canCommitToBranch("logistics", tech, 1_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/already/i);
      }
    });

    it("rejects when cap reached", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["fleet_cap"],
        purchaseCount: { fleet_cap: 1 },
        committedBranches: ["logistics", "engineering", "intelligence"],
      };
      const result = canCommitToBranch("fleet", tech, 10_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/cap|limit|3/i);
      }
    });

    it("accepts a valid commit", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = canCommitToBranch("logistics", tech, 100_000);
      expect(result.ok).toBe(true);
    });
  });

  describe("commitToBranch", () => {
    it("appends the branch and deducts cost", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = commitToBranch("logistics", tech, 200_000);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.tech.committedBranches).toContain("logistics");
        expect(result.newCash).toBe(150_000);
      }
    });

    it("returns null when commit is invalid", () => {
      const tech = emptyTechState();
      const result = commitToBranch("logistics", tech, 0);
      expect(result).toBeNull();
    });
  });

  describe("isBranchCommitted", () => {
    it("returns true when committed", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics"],
      };
      expect(isBranchCommitted("logistics", tech)).toBe(true);
    });

    it("returns false when not committed", () => {
      const tech = emptyTechState();
      expect(isBranchCommitted("logistics", tech)).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/game/tech/__tests__/BranchCommitment.test.ts`
Expected: FAIL — `Cannot find module '../BranchCommitment.ts'`

- [ ] **Step 3: Implement the module**

Create `src/game/tech/BranchCommitment.ts`:

```typescript
import type { TechState } from "../../data/types.ts";
import {
  COMMITMENT_COSTS,
  MAX_COMMITMENTS,
  TECH_GRAPH,
} from "../../data/constants.ts";

export interface CommitResult {
  tech: TechState;
  newCash: number;
}

export type CanCommitResult = { ok: true } | { ok: false; reason: string };

export function getCommitmentCount(tech: TechState): number {
  return tech.committedBranches.length;
}

export function isBranchCommitted(branchId: string, tech: TechState): boolean {
  return tech.committedBranches.includes(branchId);
}

/**
 * Returns the §-cash cost of the next commitment, or null if the player is
 * already at the cap.
 */
export function getNextCommitmentCost(tech: TechState): number | null {
  const count = getCommitmentCount(tech);
  if (count >= MAX_COMMITMENTS) return null;
  return COMMITMENT_COSTS[count];
}

/**
 * Returns the tech ID of the T2 "Mastery" cap node for the given branch.
 * Looks for a tech in TECH_GRAPH where branch matches AND id ends with
 * "_cap" or "_mastery".
 */
function getMasteryNodeId(branchId: string): string | null {
  const node = TECH_GRAPH.find(
    (n) =>
      n.branch === branchId &&
      (n.id.endsWith("_cap") || n.id.endsWith("_mastery")),
  );
  return node?.id ?? null;
}

export function canCommitToBranch(
  branchId: string,
  tech: TechState,
  cash: number,
): CanCommitResult {
  if (isBranchCommitted(branchId, tech)) {
    return { ok: false, reason: "Already committed to this branch" };
  }
  if (getCommitmentCount(tech) >= MAX_COMMITMENTS) {
    return {
      ok: false,
      reason: `Commitment cap reached (max ${MAX_COMMITMENTS})`,
    };
  }
  const masteryId = getMasteryNodeId(branchId);
  if (!masteryId || (tech.purchaseCount[masteryId] ?? 0) === 0) {
    return {
      ok: false,
      reason: "Research the branch's Mastery node first",
    };
  }
  const cost = getNextCommitmentCost(tech);
  if (cost === null) {
    return { ok: false, reason: "Commitment cap reached" };
  }
  if (cash < cost) {
    return {
      ok: false,
      reason: `Insufficient cash (need §${cost.toLocaleString("en-US")})`,
    };
  }
  return { ok: true };
}

/**
 * Apply a commitment. Returns the updated tech state + new cash balance, or
 * null if the commit is invalid. Caller is responsible for writing the
 * result back to gameStore.
 */
export function commitToBranch(
  branchId: string,
  tech: TechState,
  cash: number,
): CommitResult | null {
  const check = canCommitToBranch(branchId, tech, cash);
  if (!check.ok) return null;
  const cost = getNextCommitmentCost(tech);
  if (cost === null) return null;
  return {
    tech: {
      ...tech,
      committedBranches: [...tech.committedBranches, branchId],
    },
    newCash: cash - cost,
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/game/tech/__tests__/BranchCommitment.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Commit**

```bash
git add src/game/tech/BranchCommitment.ts src/game/tech/__tests__/BranchCommitment.test.ts
git commit -m "feat(tech): BranchCommitment module — costs, eligibility, mutators"
```

---

## Task 4: DeliveryRP Module (TDD)

**Files:**

- Create: `src/game/tech/DeliveryRP.ts`
- Test: `src/game/tech/__tests__/DeliveryRP.test.ts`

Pure function `calculateRouteRP(route, trips, state)` → number. Implements the layered formula from the spec.

- [ ] **Step 1: Write failing tests**

Create `src/game/tech/__tests__/DeliveryRP.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateRouteRP, getCargoMult } from "../DeliveryRP.ts";
import type {
  ActiveRoute,
  GameState,
  Planet,
  StarSystem,
} from "../../../data/types.ts";

function makePlanet(id: string, systemId: string, x = 0, y = 0): Planet {
  return {
    id,
    name: id,
    systemId,
    type: "agri",
    x,
    y,
    population: 1000,
    techLevel: 1,
    politicalAffiliation: "neutral",
    biome: "temperate",
    portraitKey: null,
  } as Planet;
}

function makeSystem(
  id: string,
  empireId: string | null,
  x = 0,
  y = 0,
): StarSystem {
  return {
    id,
    name: id,
    x,
    y,
    empireId,
    planetIds: [],
    starType: "G",
  } as StarSystem;
}

function makeState(planets: Planet[], systems: StarSystem[]): GameState {
  return {
    galaxy: { planets, systems, empires: [] },
    hyperlanes: [],
    borderPorts: [],
  } as unknown as GameState;
}

function makeRoute(
  originId: string,
  destinationId: string,
  cargo: string,
): ActiveRoute {
  return {
    id: `${originId}-${destinationId}`,
    originPlanetId: originId,
    destinationPlanetId: destinationId,
    cargoType: cargo as ActiveRoute["cargoType"],
    paused: false,
    licensedQuarter: 0,
    licensedYear: 1,
    charterId: null,
    establishedTurn: 0,
  } as ActiveRoute;
}

describe("getCargoMult", () => {
  it("returns 0.7 for rawMaterials and food", () => {
    expect(getCargoMult("rawMaterials")).toBe(0.7);
    expect(getCargoMult("food")).toBe(0.7);
  });

  it("returns 1.0 for manufactured cargo (medical, hazmat, passengers)", () => {
    expect(getCargoMult("medical")).toBe(1.0);
    expect(getCargoMult("hazmat")).toBe(1.0);
    expect(getCargoMult("passengers")).toBe(1.0);
  });

  it("returns 1.5 for luxury", () => {
    expect(getCargoMult("luxury")).toBe(1.5);
  });

  it("returns 2.0 for technology", () => {
    expect(getCargoMult("technology")).toBe(2.0);
  });
});

describe("calculateRouteRP", () => {
  it("returns 0 for paused routes", () => {
    const p1 = makePlanet("p1", "s1");
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route: ActiveRoute = {
      ...makeRoute("p1", "p2", "food"),
      paused: true,
    };

    expect(calculateRouteRP(route, 3, state)).toBe(0);
  });

  it("computes RP for a short domestic food route", () => {
    // distance 5 → distanceMult clamp(0.5, 2.0, 5/10) = 0.5
    // cargo food = 0.7, domestic (same empire) = 1.0, trips = 2
    // 0.15 * 0.7 * 0.5 * 1.0 * 2 = 0.105
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    expect(calculateRouteRP(route, 2, state)).toBeCloseTo(0.105, 3);
  });

  it("computes RP for a long inter-empire tech route", () => {
    // distance 50 (clamped to 2.0), cargo tech = 2.0, inter-empire = 1.5, trips = 3
    // 0.15 * 2.0 * 2.0 * 1.5 * 3 = 2.7
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s2", 50, 0);
    const s1 = makeSystem("s1", "e1", 0, 0);
    const s2 = makeSystem("s2", "e2", 50, 0);
    const state = makeState([p1, p2], [s1, s2]);
    const route = makeRoute("p1", "p2", "technology");

    expect(calculateRouteRP(route, 3, state)).toBeCloseTo(2.7, 3);
  });

  it("floors distanceMult at 0.5 for very-short routes", () => {
    // distance 1 → distanceMult would be 0.1 → clamped to 0.5
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s1", 1, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    // 0.15 * 0.7 * 0.5 * 1.0 * 1 = 0.0525
    expect(calculateRouteRP(route, 1, state)).toBeCloseTo(0.0525, 4);
  });

  it("caps distanceMult at 2.0 for very-long routes", () => {
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s2", 1000, 0);
    const s1 = makeSystem("s1", "e1", 0, 0);
    const s2 = makeSystem("s2", "e1", 1000, 0);
    const state = makeState([p1, p2], [s1, s2]);
    const route = makeRoute("p1", "p2", "food");

    // distanceMult capped at 2.0 (not 100)
    // 0.15 * 0.7 * 2.0 * 1.0 * 1 = 0.21
    expect(calculateRouteRP(route, 1, state)).toBeCloseTo(0.21, 3);
  });

  it("returns 0 for trips <= 0", () => {
    const p1 = makePlanet("p1", "s1");
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    expect(calculateRouteRP(route, 0, state)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/game/tech/__tests__/DeliveryRP.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/game/tech/DeliveryRP.ts`:

```typescript
import type { ActiveRoute, CargoType, GameState } from "../../data/types.ts";
import { calculateDistance } from "../routes/RouteManager.ts";
import { getEmpireForPlanet } from "../empire/EmpireAccessManager.ts";

const BASE_RP = 0.15;
const DISTANCE_DIVISOR = 10;
const DISTANCE_MIN = 0.5;
const DISTANCE_MAX = 2.0;
const EMPIRE_MULT_DOMESTIC = 1.0;
const EMPIRE_MULT_INTER = 1.5;

const CARGO_MULT_MAP: Record<CargoType, number> = {
  rawMaterials: 0.7,
  food: 0.7,
  medical: 1.0,
  hazmat: 1.0,
  passengers: 1.0,
  luxury: 1.5,
  technology: 2.0,
};

export function getCargoMult(cargoType: CargoType | null): number {
  if (cargoType === null) return 1.0;
  return CARGO_MULT_MAP[cargoType] ?? 1.0;
}

/**
 * Compute the research-point yield of a single active route for a single
 * turn, given the trips it actually performed. Returns 0 for paused or
 * non-delivering routes.
 *
 * Formula: `baseRP × cargoMult × distanceMult × empireMult × trips` where:
 *   - baseRP        = 0.15
 *   - cargoMult     ∈ [0.7, 2.0] per cargo tier
 *   - distanceMult  = clamp(0.5, 2.0, distance / 10)
 *   - empireMult    = 1.0 domestic, 1.5 inter-empire
 */
export function calculateRouteRP(
  route: ActiveRoute,
  trips: number,
  state: GameState,
): number {
  if (route.paused) return 0;
  if (trips <= 0) return 0;
  if (route.cargoType === null) return 0;

  const origin = state.galaxy.planets.find(
    (p) => p.id === route.originPlanetId,
  );
  const dest = state.galaxy.planets.find(
    (p) => p.id === route.destinationPlanetId,
  );
  if (!origin || !dest) return 0;

  const cargoMult = getCargoMult(route.cargoType);

  const distance = calculateDistance(
    origin,
    dest,
    state.galaxy.systems,
    state.hyperlanes,
    state.borderPorts,
  );
  const distanceMult = Math.min(
    DISTANCE_MAX,
    Math.max(DISTANCE_MIN, distance / DISTANCE_DIVISOR),
  );

  const originEmpire = getEmpireForPlanet(
    origin.id,
    state.galaxy.systems,
    state.galaxy.planets,
  );
  const destEmpire = getEmpireForPlanet(
    dest.id,
    state.galaxy.systems,
    state.galaxy.planets,
  );
  const empireMult =
    originEmpire !== null && destEmpire !== null && originEmpire !== destEmpire
      ? EMPIRE_MULT_INTER
      : EMPIRE_MULT_DOMESTIC;

  return BASE_RP * cargoMult * distanceMult * empireMult * trips;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/game/tech/__tests__/DeliveryRP.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/game/tech/DeliveryRP.ts src/game/tech/__tests__/DeliveryRP.test.ts
git commit -m "feat(tech): DeliveryRP — per-route RP formula (cargo × distance × empire)"
```

---

## Task 5: Rewrite calculateRPPerTurn

**Files:**

- Modify: `src/game/tech/TechTree.ts:173-216`
- Modify: `src/game/tech/__tests__/TechTree.test.ts` (update existing RP tests)

Replace the old "diversity bonus + techworld bonus + capped node bonus" logic with: `base + sum(deliveryRP for each active route) + sum(addRPPerTurn effects, uncapped)`.

The infrastructure RP still flows through `addRPPerTurn` effects on hub-room definitions (the existing pattern); the cap is removed because the new system uses room-build cost as the throttle.

- [ ] **Step 1: Update calculateRPPerTurn**

Edit `src/game/tech/TechTree.ts`. Replace the entire `calculateRPPerTurn` function (lines 173-216):

```typescript
export function calculateRPPerTurn(state: GameState): number {
  let rp = BASE_RP_PER_TURN;

  // Delivery RP: sum across active routes for the current turn.
  // Uses the current trip estimate per route from the route's last simulation
  // turn. If the route has not yet been simulated this turn (e.g. on load),
  // use a fallback of 1 trip — calculateRPPerTurn is also called from UI
  // forecasts, not just the simulator, and we want a reasonable estimate.
  for (const route of state.activeRoutes) {
    if (route.paused) continue;
    const trips = route.lastTurnTrips ?? 1;
    rp += calculateRouteRP(route, trips, state);
  }

  // Infrastructure RP: hub rooms with addRPPerTurn effects (Research Lab,
  // R&D Center, Theoretical Institute). The legacy "node bonus from tech
  // effects" path is preserved because some tech effects also grant
  // addRPPerTurn (intelligence_lab etc.) — both feed the same accumulator.
  for (const [techId, count] of Object.entries(state.tech.purchaseCount)) {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") {
        rp += effect.value * count;
      }
    }
  }

  // Hub-room RP (addRPPerTurn from buildings)
  for (const hub of state.hubs ?? []) {
    for (const room of hub.rooms ?? []) {
      const def = HUB_ROOM_DEFINITIONS[room.type];
      if (!def) continue;
      for (const effect of def.bonusEffects) {
        if (effect.type === "addRPPerTurn") {
          rp += effect.value;
        }
      }
    }
  }

  return Math.round(rp * 100) / 100;
}
```

Update the imports at the top of the file to include the new helpers:

```typescript
import { calculateRouteRP } from "./DeliveryRP.ts";
import { HUB_ROOM_DEFINITIONS } from "../../data/constants.ts";
```

> Note: the `lastTurnTrips` field referenced above does not exist yet on
> `ActiveRoute`. The simulator stores trips in `state.lastTurnResult.routePerformance`
> per route — read the existing structure first. If `lastTurnTrips` isn't a
> direct field on the route, swap to looking up the route's entry in
> `state.lastTurnResult?.routePerformance?.find(p => p.routeId === route.id)?.trips`,
> falling back to 1. Adjust the implementation accordingly during this step.

- [ ] **Step 2: Update existing tests in TechTree.test.ts**

Existing tests asserted the diversity bonus and techworld bonus. Open
`src/game/tech/__tests__/TechTree.test.ts` and replace the `describe("calculateRPPerTurn", ...)` block (around line 307) with tests that reflect the new behavior:

```typescript
describe("calculateRPPerTurn", () => {
  it("returns BASE_RP_PER_TURN for an empty state", () => {
    const state = createEmptyTestState();
    expect(calculateRPPerTurn(state)).toBe(BASE_RP_PER_TURN);
  });

  it("adds delivery RP from active routes", () => {
    const state = createEmptyTestState();
    // Inject an active route + matching planets/systems so the formula has
    // something to multiply. Use the helpers already in the test file.
    // ... use test fixtures to give a known delivery RP and assert total.
  });

  it("adds RP from hub-room infrastructure", () => {
    // ... test that placing a Research Lab adds +1 RP/turn.
  });

  it("adds RP from completed tech with addRPPerTurn effects", () => {
    // ... existing test logic that asserts tech-effect-based RP.
  });
});
```

> The test fixtures and helpers (`createEmptyTestState` etc.) already exist
> in this file. Re-use them; don't introduce a new fixture pattern. The
> body of the new "adds delivery RP" test should construct a single planet
> pair + a route and assert a known value from the formula.

- [ ] **Step 3: Run tests, verify pass**

Run: `npx vitest run src/game/tech/__tests__/TechTree.test.ts`
Expected: PASS. Other suites might temporarily fail because behavior changed (e.g. `Phase3Integration.test.ts` asserts specific RP/turn values) — that's expected. We fix those in Step 4.

- [ ] **Step 4: Update other tests broken by behavior change**

Run: `npm run test 2>&1 | grep -E "FAIL|✗"`

For each failing test outside the new TechTree tests, update the assertion to reflect the new RP economy. Common cases:

- `Phase3Integration.test.ts` line 265 / 298 — assertions like `expect(calculateRPPerTurn(state)).toBe(N)` need updated N values based on new formula.
- Any test that uses the `RP_DIVERSITY_THRESHOLD` or `RP_RESEARCH_PLANET_BONUS` constants — these constants are obsolete; remove the usage.

Re-run after each fix to converge.

- [ ] **Step 5: Remove obsolete constants**

If `RP_DIVERSITY_THRESHOLD` and `RP_RESEARCH_PLANET_BONUS` are no longer referenced anywhere, delete them from `src/data/constants.ts`. Run:

```bash
grep -rn "RP_DIVERSITY_THRESHOLD\|RP_RESEARCH_PLANET_BONUS" /Users/ianlintner/Projects/spacebiz/.claude/worktrees/research-economy-redesign/src/
```

If only `constants.ts` matches, delete the lines. Otherwise update the remaining callers.

- [ ] **Step 6: Commit**

```bash
git add src/game/tech/TechTree.ts src/game/tech/__tests__/TechTree.test.ts src/data/constants.ts
git commit -m "feat(tech): rewrite calculateRPPerTurn to use new delivery+infra economy"
```

---

## Task 6: Update isTechAvailable for Tier Walls

**Files:**

- Modify: `src/game/tech/TechTree.ts` (the `isTechAvailable` function)

T3 and T4 tech nodes require the branch to be committed. T1 and T2 nodes work as before.

- [ ] **Step 1: Update isTechAvailable**

Edit `src/game/tech/TechTree.ts`. Find `isTechAvailable` (around line 34). Add the commitment check:

```typescript
import { isBranchCommitted } from "./BranchCommitment.ts";

export function isTechAvailable(techId: string, tech: TechState): boolean {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return false;

  // Existing checks — kept verbatim:
  if (tech.queue.includes(techId)) return false;
  if (!node.repeatable && (tech.purchaseCount[techId] ?? 0) >= 1) return false;

  if (CARGO_PACT_IDS.has(techId)) {
    const conflict = [...CARGO_PACT_IDS].some(
      (id) =>
        id !== techId &&
        (tech.completedTechIds.includes(id) || tech.queue.includes(id)),
    );
    if (conflict) return false;
  }

  // NEW: Tier wall — T3 and T4 nodes require the branch to be committed.
  // T1/T2 nodes are accessible to any player without commitment.
  if (node.tier >= 3 && !isBranchCommitted(node.branch, tech)) {
    return false;
  }

  if (techId === "fuel_efficiency_1") return true;

  return node.edges.some((neighborId) =>
    tech.completedTechIds.includes(neighborId),
  );
}
```

- [ ] **Step 2: Add a test for tier-wall gating**

Append to `src/game/tech/__tests__/TechTree.test.ts`:

```typescript
describe("isTechAvailable — tier wall", () => {
  it("blocks T3+ techs in uncommitted branches", () => {
    const tech: TechState = {
      researchPoints: 1_000,
      completedTechIds: ["logistics_3"],
      purchaseCount: { logistics_3: 1 },
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    // logistics_4 is T4, branch not committed
    expect(isTechAvailable("logistics_4", tech)).toBe(false);
  });

  it("allows T3+ techs in committed branches when neighbor is owned", () => {
    const tech: TechState = {
      researchPoints: 1_000,
      completedTechIds: ["logistics_3"],
      purchaseCount: { logistics_3: 1 },
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: ["logistics"],
    };
    expect(isTechAvailable("logistics_4", tech)).toBe(true);
  });

  it("allows T1/T2 techs without commitment", () => {
    const tech: TechState = {
      researchPoints: 1_000,
      completedTechIds: ["fuel_efficiency_1"],
      purchaseCount: { fuel_efficiency_1: 1 },
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    // logistics_hub is T1, no commitment required
    expect(isTechAvailable("logistics_hub", tech)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

Run: `npx vitest run src/game/tech/__tests__/TechTree.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/game/tech/TechTree.ts src/game/tech/__tests__/TechTree.test.ts
git commit -m "feat(tech): T3/T4 nodes require branch commitment"
```

---

## Task 7: Rebalance T3/T4 RP Costs

**Files:**

- Modify: `src/data/constants.ts` (TECH_GRAPH entries with tier 3 or 4)

Apply `newCost = roundUpToFive(existingCost × 2.0)` to every T3 and T4 node.

- [ ] **Step 1: Audit current T3/T4 costs**

Run:

```bash
awk '/tier: 3,|tier: 4,/{found=1} found && /rpCost:/{print NR": "$0; found=0}' \
  /Users/ianlintner/Projects/spacebiz/.claude/worktrees/research-economy-redesign/src/data/constants.ts
```

Note each line number and current value. Apply the transform: `newCost = ceil((current × 2) / 5) × 5`. Reference table:

| Old | New |
| --- | --- |
| 18  | 40  |
| 20  | 40  |
| 22  | 45  |
| 28  | 60  |
| 30  | 60  |
| 45  | 90  |
| 50  | 100 |
| 60  | 120 |
| 75  | 150 |
| 80  | 160 |

- [ ] **Step 2: Apply edits**

For each T3/T4 entry in `src/data/constants.ts`, update its `rpCost` to the new value. Use the table above. Do not touch T1 or T2 nodes (lower line numbers in each tech branch block).

- [ ] **Step 3: Typecheck + test**

Run: `npm run check`
Expected: typecheck PASS, build PASS. Some tests may need adjustment if they assumed specific RP costs — update those assertions to the new values.

- [ ] **Step 4: Commit**

```bash
git add src/data/constants.ts src/game/tech/__tests__/
git commit -m "balance(tech): double T3/T4 RP costs (rounded up to nearest 5)"
```

---

## Task 8: Hub Room Definitions — Three Tiers

**Files:**

- Modify: `src/data/types.ts` (add new HubRoomType entries)
- Modify: `src/data/constants.ts` (HUB_ROOM_DEFINITIONS)

Replace the single Research Lab with three tiers, with prereq rules.

- [ ] **Step 1: Add new HubRoomType members**

Edit `src/data/types.ts:499-519`. Update the `HubRoomType` const + type:

```typescript
export const HubRoomType = {
  SimpleTerminal: "simpleTerminal",
  ImprovedTerminal: "improvedTerminal",
  AdvancedTerminal: "advancedTerminal",
  TradeOffice: "tradeOffice",
  PassengerLounge: "passengerLounge",
  ResearchLab: "researchLab", // ← retained, now T1
  RdCenter: "rdCenter", // ← NEW
  TheoreticalInstitute: "theoreticalInstitute", // ← NEW
  CargoWarehouse: "cargoWarehouse",
  // ... keep all other existing entries
} as const;
export type HubRoomType = (typeof HubRoomType)[keyof typeof HubRoomType];
```

> Preserve every other entry that already exists in the type. The plan above
> shows only the affected window — copy unchanged entries through.

- [ ] **Step 2: Update HUB_ROOM_DEFINITIONS**

Edit the `[HubRoomType.ResearchLab]` block in `src/data/constants.ts` (around line 1336+). Replace with:

```typescript
[HubRoomType.ResearchLab]: {
  type: HubRoomType.ResearchLab,
  name: "Research Lab",
  description:
    "Generates +1 research point per turn. Foundation for advanced research facilities.",
  icon: "🔬",
  buildCost: 15_000,
  upkeepCost: 1_500,
  limit: 3,
  techRequirement: null, // ← no tech prereq in new economy
  bonusScope: "empire",
  bonusEffects: [{ type: "addRPPerTurn", value: 1 }],
},
[HubRoomType.RdCenter]: {
  type: HubRoomType.RdCenter,
  name: "R&D Center",
  description:
    "Generates +3 research points per turn. Requires a Research Lab in the same hub + 1 branch commitment.",
  icon: "🧪",
  buildCost: 50_000,
  upkeepCost: 5_000,
  limit: 2,
  techRequirement: null,
  bonusScope: "empire",
  bonusEffects: [{ type: "addRPPerTurn", value: 3 }],
},
[HubRoomType.TheoreticalInstitute]: {
  type: HubRoomType.TheoreticalInstitute,
  name: "Theoretical Institute",
  description:
    "Generates +6 research points per turn. Requires an R&D Center in the same hub + 2 branch commitments.",
  icon: "🏛️",
  buildCost: 150_000,
  upkeepCost: 15_000,
  limit: 1,
  techRequirement: null,
  bonusScope: "empire",
  bonusEffects: [{ type: "addRPPerTurn", value: 6 }],
},
```

Leave all other entries in `HUB_ROOM_DEFINITIONS` unchanged.

- [ ] **Step 3: Add to availableRoomTypes lists**

Search for `HubRoomType.ResearchLab,` references in the array `availableRoomTypes`:

```bash
grep -n "HubRoomType.ResearchLab," /Users/ianlintner/Projects/spacebiz/.claude/worktrees/research-economy-redesign/src/data/constants.ts | head -5
```

In each hub's `availableRoomTypes` list that includes `ResearchLab`, add `RdCenter` and `TheoreticalInstitute` after it.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If TypeScript flags exhaustive-switch issues on the new HubRoomType members (some `switch` statement on room types), update the switch to handle the new cases (typically a pass-through to a default).

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/constants.ts
git commit -m "feat(hub): add R&D Center + Theoretical Institute room tiers"
```

---

## Task 9: Hub Room Build Validation (Commitments + Prereqs)

**Files:**

- Modify: `src/scenes/StationBuilderScene.ts` (room-build validation)

Enforce: R&D Center requires a Research Lab in the same hub AND 1+ commitments held. Theoretical Institute requires an R&D Center in the same hub AND 2+ commitments.

- [ ] **Step 1: Find the build-validation site**

Run:

```bash
grep -n "canBuildRoom\|validateBuild\|buildRoom" /Users/ianlintner/Projects/spacebiz/.claude/worktrees/research-economy-redesign/src/scenes/StationBuilderScene.ts | head -10
```

Locate the function that decides whether a room can be built (look for a callsite that checks `def.techRequirement` or returns a boolean for the build button).

- [ ] **Step 2: Add commitment + prereq gates**

In the validation function, after the existing tech-requirement check, add:

```typescript
import { getCommitmentCount } from "../game/tech/BranchCommitment.ts";
import { HubRoomType } from "../data/types.ts";

// ... inside the validate function:
const commitments = getCommitmentCount(state.tech);
if (roomType === HubRoomType.RdCenter) {
  const hasLab = hub.rooms.some((r) => r.type === HubRoomType.ResearchLab);
  if (!hasLab)
    return { ok: false, reason: "Requires a Research Lab in this hub" };
  if (commitments < 1)
    return { ok: false, reason: "Requires 1 branch commitment" };
}
if (roomType === HubRoomType.TheoreticalInstitute) {
  const hasCenter = hub.rooms.some((r) => r.type === HubRoomType.RdCenter);
  if (!hasCenter)
    return { ok: false, reason: "Requires an R&D Center in this hub" };
  if (commitments < 2)
    return { ok: false, reason: "Requires 2 branch commitments" };
}
```

> Match the existing return-type shape — if the function returns a plain
> boolean instead of `{ ok, reason }`, return `false` from the new branches
> and surface the reason via a different existing channel (look at how
> tech-requirement failures are reported in the UI today and mirror that).

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/StationBuilderScene.ts
git commit -m "feat(hub): enforce commitment + prereq gates for R&D rooms"
```

---

## Task 10: TechCommitmentBadge UI Component

**Files:**

- Create: `src/ui/tech/TechCommitmentBadge.ts`
- Test: `src/ui/tech/__tests__/TechCommitmentBadge.test.ts`

A small Phaser Container showing "Commitments N / 3" plus a list of committed branch icons. Lives in the tech tree scene's top-right area or near the RP indicator.

- [ ] **Step 1: Write failing tests**

Create `src/ui/tech/__tests__/TechCommitmentBadge.test.ts`. Use the existing `mountComponent` harness pattern (see `src/ui/tech/__tests__/TechBonusesPanel.test.ts` for the model):

```typescript
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import * as Phaser from "phaser";
import { mountComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import { TechCommitmentBadge } from "../TechCommitmentBadge.ts";
import type { TechState } from "../../../data/types.ts";

function emptyTechState(): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
    committedBranches: [],
  };
}

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("TechCommitmentBadge", () => {
  it("renders '0 / 3' for a fresh tech state", async () => {
    const { component, cleanup } = await mountComponent(
      (scene) => new TechCommitmentBadge(scene, { x: 0, y: 0, width: 240 }),
    );
    cleanups.push(cleanup);
    component.setBadgeState(emptyTechState());
    expect(component.getDisplayText()).toBe("Commitments  ·  0 / 3");
  });

  it("lists committed branches", async () => {
    const { component, cleanup } = await mountComponent(
      (scene) => new TechCommitmentBadge(scene, { x: 0, y: 0, width: 240 }),
    );
    cleanups.push(cleanup);
    component.setBadgeState({
      ...emptyTechState(),
      committedBranches: ["logistics", "engineering"],
    });
    expect(component.getDisplayText()).toBe("Commitments  ·  2 / 3");
    const branches = component.getCommittedBranchLabels();
    expect(branches).toContain("Logistics");
    expect(branches).toContain("Engineering");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/ui/tech/__tests__/TechCommitmentBadge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the badge**

Create `src/ui/tech/TechCommitmentBadge.ts`:

```typescript
import * as Phaser from "phaser";
import { colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { MAX_COMMITMENTS } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";

export interface TechCommitmentBadgeConfig {
  x: number;
  y: number;
  width: number;
}

const BRANCH_LABELS: Record<string, string> = {
  logistics: "Logistics",
  engineering: "Engineering",
  intelligence: "Intelligence",
  crisis: "Crisis",
  diplomacy: "Diplomacy",
  fleet: "Fleet",
};

export class TechCommitmentBadge extends Phaser.GameObjects.Container {
  private badgeWidth: number;
  private bg!: Phaser.GameObjects.Graphics;
  private headerText!: Phaser.GameObjects.Text;
  private branchListText!: Phaser.GameObjects.Text;
  private currentState: TechState | null = null;
  private cardHeight = 38;

  constructor(scene: Phaser.Scene, config: TechCommitmentBadgeConfig) {
    super(scene, config.x, config.y);
    this.badgeWidth = config.width;
    scene.add.existing(this);

    const theme = getTheme();
    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.headerText = scene.add.text(8, 6, "Commitments  ·  0 / 3", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      fontStyle: "bold",
    });
    this.add(this.headerText);

    this.branchListText = scene.add.text(8, 20, "", {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.text),
    });
    this.add(this.branchListText);

    this.redrawBg();
  }

  setBadgeState(tech: TechState): this {
    this.currentState = tech;
    const n = tech.committedBranches.length;
    this.headerText.setText(`Commitments  ·  ${n} / ${MAX_COMMITMENTS}`);
    const labels = this.getCommittedBranchLabels();
    if (labels.length === 0) {
      this.branchListText.setText("— none yet —");
      this.branchListText.setColor(colorToString(getTheme().colors.textDim));
    } else {
      this.branchListText.setText(labels.join(" · "));
      // Tint by first committed branch for visual flavour
      this.branchListText.setColor(
        colorToString(getBranchColor(tech.committedBranches[0])),
      );
    }
    return this;
  }

  getDisplayText(): string {
    return this.headerText.text;
  }

  getCommittedBranchLabels(): string[] {
    if (!this.currentState) return [];
    return this.currentState.committedBranches.map(
      (b) => BRANCH_LABELS[b] ?? b,
    );
  }

  resize(width: number): this {
    this.badgeWidth = width;
    this.redrawBg();
    return this;
  }

  getBadgeHeight(): number {
    return this.cardHeight;
  }

  private redrawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x121a2c, 0.95);
    this.bg.fillRoundedRect(0, 0, this.badgeWidth, this.cardHeight, 6);
    this.bg.lineStyle(1, 0x2c3a55, 1);
    this.bg.strokeRoundedRect(0, 0, this.badgeWidth, this.cardHeight, 6);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/ui/tech/__tests__/TechCommitmentBadge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tech/TechCommitmentBadge.ts src/ui/tech/__tests__/TechCommitmentBadge.test.ts
git commit -m "feat(tech-ui): TechCommitmentBadge — shows N / 3 + branch list"
```

---

## Task 11: Commit Button on TechDetailCard

**Files:**

- Modify: `src/ui/tech/TechDetailCard.ts`

When the selected tech is a T3 or T4 node in an uncommitted branch AND the branch's T2 Mastery is researched AND the player can afford the next commitment cost AND the player has free commitment slots, show a "Commit to <Branch> — §<cost>" button. Otherwise, fall back to the existing action button logic.

- [ ] **Step 1: Add commit handler to config**

Edit `src/ui/tech/TechDetailCard.ts`. Extend `TechDetailCardConfig`:

```typescript
export interface TechDetailCardConfig {
  x: number;
  y: number;
  width: number;
  onAction: (techId: string) => void;
  onCommit: (branchId: string) => void; // NEW
}
```

- [ ] **Step 2: Detect "commit moment" in setSelection**

In `TechDetailCard.setSelection`, after computing `isCompleted` / `isResearching` / `isQueued` / `available`, add the commit-moment detection:

```typescript
import {
  canCommitToBranch,
  getNextCommitmentCost,
} from "../../game/tech/BranchCommitment.ts";
import { gameStore } from "../../data/GameStore.ts";

// ... inside setSelection, before the button-state machine:

const state = gameStore.getState();
const isT3Plus = node.tier >= 3;
const branchUncommitted = !tech.committedBranches.includes(node.branch);
const showCommitButton = isT3Plus && branchUncommitted;

let commitGateLabel: string | null = null;
let commitGateEnabled = false;
if (showCommitButton) {
  const cost = getNextCommitmentCost(tech);
  const check = canCommitToBranch(node.branch, tech, state.cash);
  if (check.ok && cost !== null) {
    commitGateLabel = `Commit to ${branchLabel(node.branch)} — §${cost.toLocaleString("en-US")}`;
    commitGateEnabled = true;
  } else if (cost === null) {
    commitGateLabel = `Commitment cap reached (max 3)`;
  } else if (!check.ok) {
    commitGateLabel = check.reason;
  }
}
```

- [ ] **Step 3: Use the commit-button state in the button label logic**

Replace the existing button-state machine in `setSelection` to prefer the commit button when applicable:

```typescript
let label = "Select a technology";
let disabled = true;
let buttonAction: "unlock" | "commit" = "unlock";

if (showCommitButton && commitGateLabel) {
  label = commitGateLabel;
  disabled = !commitGateEnabled;
  buttonAction = "commit";
} else if (isCompleted) {
  label = "Maxed out";
} else if (isResearching) {
  label = "Already researching";
} else if (isQueued) {
  label = `In queue · #${tech.queue.indexOf(node.id) + 1}`;
} else if (!available) {
  label = "Locked — research a prerequisite";
} else if (canAfford) {
  label = `Unlock — ${cost} RP`;
  disabled = false;
} else {
  label = `Queue — ${cost} RP`;
  disabled = false;
}

this.button.setLabel(label);
this.button.setDisabled(disabled);
this.button.setVisible(true);
this.currentButtonAction = buttonAction; // remember for the click handler
this.currentBranchId = buttonAction === "commit" ? node.branch : null;
```

Update the Button's onClick to dispatch to the right handler:

```typescript
this.button = new Button(scene, {
  x: this.cardWidth / 2,
  y: this.cardHeight - 18,
  width: this.cardWidth - 20,
  label: "Unlock",
  disabled: true,
  onClick: () => {
    if (this.currentButtonAction === "commit" && this.currentBranchId) {
      this.onCommit(this.currentBranchId);
    } else if (this.selectedTechId) {
      this.onAction(this.selectedTechId);
    }
  },
});
```

Add the new private fields near the top of the class:

```typescript
private currentButtonAction: "unlock" | "commit" = "unlock";
private currentBranchId: string | null = null;
private onCommit: (branchId: string) => void;
```

And in the constructor: `this.onCommit = config.onCommit;`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Callers of `new TechDetailCard(...)` will need to pass `onCommit` — typecheck will flag them. Update the scene wire-up in the next task.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tech/TechDetailCard.ts
git commit -m "feat(tech-ui): TechDetailCard surfaces Commit button when applicable"
```

---

## Task 12: Wire Commitment into TechTreeScene

**Files:**

- Modify: `src/scenes/TechTreeScene.ts`

Add the commitment badge to the right rail (above current research) and wire the `onCommit` handler.

- [ ] **Step 1: Import + field**

Edit `src/scenes/TechTreeScene.ts`. Add to imports:

```typescript
import { TechCommitmentBadge } from "../ui/tech/TechCommitmentBadge.ts";
import { commitToBranch } from "../game/tech/BranchCommitment.ts";
```

Add a private field on the scene class:

```typescript
private commitmentBadge!: TechCommitmentBadge;
```

- [ ] **Step 2: Construct + position the badge**

In the `create()` method, after constructing `currentCard` and before `detailCard`, add:

```typescript
this.commitmentBadge = new TechCommitmentBadge(this, {
  x: 0,
  y: 0,
  width: RAIL_WIDTH - 24,
});
```

In `relayout()`, position it just above the rpStatusText:

```typescript
// after this.rpStatusText.setPosition(...)
let railY = railInnerY + 18;
this.commitmentBadge.setPosition(railInnerX, railY);
this.commitmentBadge.resize(railInnerW);
railY += this.commitmentBadge.getBadgeHeight() + 8;

this.currentCard.setPosition(railInnerX, railY);
this.currentCard.resize(railInnerW);
railY += this.currentCard.getCardHeight() + 8;

this.detailCard.setPosition(railInnerX, railY);
this.detailCard.resize(railInnerW);
railY += this.detailCard.getCardHeight() + 12;

this.queuePanel.setPosition(railInnerX, railY);
this.queuePanel.resize(railInnerW);
```

(Replace the existing `let y = railInnerY + 18` block with the above.)

- [ ] **Step 3: Wire detailCard onCommit + refresh badge**

When constructing the `TechDetailCard`, pass the new `onCommit` handler:

```typescript
this.detailCard = new TechDetailCard(this, {
  x: 0,
  y: 0,
  width: RAIL_WIDTH - 24,
  onAction: (techId) => this.handleUnlockOrQueue(techId),
  onCommit: (branchId) => this.handleCommit(branchId),
});
```

Add the new private method:

```typescript
private handleCommit(branchId: string): void {
  const state = gameStore.getState();
  const result = commitToBranch(branchId, state.tech, state.cash);
  if (!result) return;
  gameStore.setState({
    ...state,
    tech: result.tech,
    cash: result.newCash,
  });
  this.refresh();
}
```

Update `refresh()` to also call `setBadgeState`:

```typescript
private refresh(): void {
  const state = gameStore.getState();
  const tech = state.tech;
  // ... existing rpStatusText.setText, this.graph.setGraphState etc.
  this.commitmentBadge.setBadgeState(tech);  // NEW
  // ... rest unchanged
}
```

- [ ] **Step 4: Typecheck + tests + manual smoke**

Run: `npm run check`
Expected: PASS.

If the scene loads in dev (`npm run dev`), navigate to TechTreeScene via QA console (`__sft.goToScene("TechTreeScene")`). Confirm:

- Commitment badge renders in the right rail showing "Commitments · 0 / 3" + "— none yet —"
- After unlocking the logistics_cap mastery and clicking a T4 logistics node, the detail card shows "Commit to Logistics — §50,000"
- Clicking it deducts cash and updates the badge to "1 / 3" with "Logistics" listed

(Manual verification is OK here — the scene-level integration tests can be skipped since headless Phaser doesn't render fully.)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/TechTreeScene.ts
git commit -m "feat(tech-ui): wire commitment badge + onCommit handler in TechTreeScene"
```

---

## Task 13: Graph Locked State for Uncommitted T3/T4

**Files:**

- Modify: `src/ui/TechGraphCanvas.ts`

The graph already has a `locked` visual state. We extend the locked predicate so T3/T4 nodes in uncommitted branches render as locked regardless of neighbor completion.

- [ ] **Step 1: Pass committedBranches into graph state**

Edit `src/ui/TechGraphCanvas.ts`. Extend `TechGraphState`:

```typescript
export interface TechGraphState {
  completedTechIds: string[];
  purchaseCount: Record<string, number>;
  queue: string[];
  researchPoints: number;
  isAvailable: (techId: string) => boolean;
  committedBranches: string[]; // NEW
}
```

- [ ] **Step 2: Use the new field in node-state computation**

Find `getNodeState` (or wherever the per-node state is computed). Add a check before falling through to `available`/`locked`:

```typescript
private getNodeState(techId: string, state: TechGraphState): NodeState {
  if (state.completedTechIds.includes(techId)) return "completed";
  if (state.queue[0] === techId) return "researching";
  if (state.queue.includes(techId)) return "queued";

  // T3/T4 in uncommitted branches are always locked
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (node && node.tier >= 3 && !state.committedBranches.includes(node.branch)) {
    return "locked";
  }

  if (state.isAvailable(techId)) return "available";
  return "locked";
}
```

- [ ] **Step 3: Update the scene to pass the new field**

In `src/scenes/TechTreeScene.ts`, find where `setGraphState` is called and add the committedBranches field:

```typescript
this.graph.setGraphState({
  completedTechIds: tech.completedTechIds,
  purchaseCount: tech.purchaseCount,
  queue: tech.queue,
  researchPoints: tech.researchPoints,
  isAvailable: (id) => isTechAvailable(id, tech),
  committedBranches: tech.committedBranches, // NEW
});
```

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: PASS.

In dev: after committing to a branch, the graph should re-render so T3/T4 nodes of that branch transition from locked → available/completed appearance.

- [ ] **Step 5: Commit**

```bash
git add src/ui/TechGraphCanvas.ts src/scenes/TechTreeScene.ts
git commit -m "feat(tech-ui): graph locks T3/T4 nodes in uncommitted branches"
```

---

## Task 14: RP Source Breakdown on Bonuses Tab

**Files:**

- Modify: `src/ui/tech/TechBonusesPanel.ts`

Add a small breakdown row above the stat cards: "RP/turn: 1 base · 4.2 deliveries · 1 infra · 6.2 total".

- [ ] **Step 1: Add a breakdown helper**

Edit `src/game/tech/TechTree.ts`. Add an exported function alongside `calculateRPPerTurn`:

```typescript
export interface RPBreakdown {
  base: number;
  delivery: number;
  infrastructure: number;
  total: number;
}

export function getRPBreakdown(state: GameState): RPBreakdown {
  const base = BASE_RP_PER_TURN;

  let delivery = 0;
  for (const route of state.activeRoutes) {
    if (route.paused) continue;
    const trips = route.lastTurnTrips ?? 1;
    delivery += calculateRouteRP(route, trips, state);
  }

  let infrastructure = 0;
  // From tech effects with addRPPerTurn
  for (const [techId, count] of Object.entries(state.tech.purchaseCount)) {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") {
        infrastructure += effect.value * count;
      }
    }
  }
  // From hub rooms
  for (const hub of state.hubs ?? []) {
    for (const room of hub.rooms ?? []) {
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
```

- [ ] **Step 2: Render the breakdown on the Bonuses panel**

Edit `src/ui/tech/TechBonusesPanel.ts`. Add a new text element rendered above the card grid:

```typescript
import { getRPBreakdown } from "../../game/tech/TechTree.ts";
import { gameStore } from "../../data/GameStore.ts";

// inside the constructor, after this.emptyText creation:
this.rpBreakdownText = scene.add.text(0, 0, "", {
  fontSize: "11px",
  fontFamily: getTheme().fonts.body.family,
  color: colorToString(getTheme().colors.text),
  fontStyle: "bold",
});
this.add(this.rpBreakdownText);

// add a field:
private rpBreakdownText!: Phaser.GameObjects.Text;

// in setBonusesState, BEFORE the existing entries.length check:
const state = gameStore.getState();
const breakdown = getRPBreakdown(state);
this.rpBreakdownText
  .setPosition(0, 0)
  .setText(
    `RP/turn  ·  ${breakdown.base} base · ${breakdown.delivery} deliveries · ${breakdown.infrastructure} infra  ·  ${breakdown.total} total`,
  );

// shift the card grid down by ~24px to make room
```

Adjust the card layout in `setBonusesState` so cards start at y = 24 instead of y = 0:

```typescript
entries.forEach((entry, idx) => {
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  const x = col * (cardWidth + CARD_GAP);
  const y = 24 + row * (CARD_HEIGHT + CARD_GAP); // ← was just row * (...)
  this.renderCard(entry, x, y, cardWidth);
});
```

- [ ] **Step 3: Verify**

Run: `npm run check`
Expected: PASS.

In dev: navigate to TechTree → Bonuses tab. Confirm the RP breakdown shows above any stat cards.

- [ ] **Step 4: Commit**

```bash
git add src/game/tech/TechTree.ts src/ui/tech/TechBonusesPanel.ts
git commit -m "feat(tech-ui): RP/turn breakdown on Bonuses tab"
```

---

## Task 15: Final Integration + Screenshots

- [ ] **Step 1: Full CI gate**

Run: `npm run check`
Expected: typecheck PASS, all tests PASS, build PASS.

- [ ] **Step 2: Manual smoke test in dev**

Run: `npm run dev`. Open the QA console and walk this scenario:

1. `__sft.goToScene("TechTreeScene")` — confirm commitment badge shows 0/3.
2. Unlock several T1/T2 nodes; confirm they cost the same as before.
3. Try clicking a T4 node in an uncommitted branch — detail card should say "Commit to <Branch> — §50,000". Disabled if no mastery yet.
4. Unlock the branch mastery node (T2 ★), confirm the commit button becomes enabled.
5. Click commit — cash drops by §50k, badge updates to 1/3, T3/T4 nodes in that branch unlock, the rest of T3/T4 nodes elsewhere stay locked.
6. Confirm Bonuses tab shows the RP breakdown line.
7. Navigate to a hub station → Research Lab buildable at §15k; R&D Center listed but blocked with "Requires Research Lab + 1 commitment".

- [ ] **Step 3: Capture screenshots**

Use Playwright via the MCP to capture, save under `docs/pr-screenshots/research-economy-redesign/`:

1. `01-tree-with-badge.png` — Tree tab showing the commitment badge with at least one commit.
2. `02-commit-button.png` — Detail card showing "Commit to <Branch> — §<cost>".
3. `03-locked-t4.png` — Graph showing T4 nodes locked in uncommitted branches.
4. `04-bonuses-breakdown.png` — Bonuses tab with the new RP breakdown line.

- [ ] **Step 4: Commit screenshots**

```bash
git add docs/pr-screenshots/research-economy-redesign/
git commit -m "docs(research-economy): PR screenshots"
```

---

## Self-Review Notes

**Spec coverage matrix:**

| Spec section                             | Task    |
| ---------------------------------------- | ------- |
| Base tick stays at +1                    | 5       |
| Delivery RP formula (cargo × dist × emp) | 4       |
| Per-turn aggregation                     | 5       |
| Three-tier R&D rooms                     | 8       |
| Room prereq enforcement                  | 9       |
| Tier walls (T3/T4 require commitment)    | 6       |
| Commitment mechanics (cost, cap, perm)   | 1, 2, 3 |
| T3/T4 cost rebalance                     | 7       |
| Commitment badge UI                      | 10, 12  |
| Commit button on detail card             | 11, 12  |
| Locked T3/T4 visual                      | 13      |
| RP breakdown on Bonuses tab              | 14      |

**Things the engineer must verify at integration time:**

1. **`route.lastTurnTrips`** — referenced in Tasks 5 and 14 but may not exist on `ActiveRoute`. If it doesn't, read from `state.lastTurnResult.routePerformance` keyed by route id, or compute via `getEffectiveTrips` if such a helper exists. The plan flags this in Task 5 Step 1's note.
2. **`gameStore.setState` vs `gameStore.update`** — Task 12 uses `setState({ ...state, tech: ..., cash: ... })`. Confirm the project's preferred mutator (some files use `gameStore.update({ cash, tech })` — match that pattern).
3. **`HubRoomType` exhaustive switches** — Task 8 adds two new entries. Some code may have an exhaustive switch over HubRoomType (e.g. icon mapping, render switches). Typecheck will flag these; add cases as needed.
