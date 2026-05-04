# Industry Chain Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current diffuse planet supply/demand system with Transport Fever–style production chains: 5 narrow producer types + 2 consumer types, a connection-based industry boost, and a one-route-per-cargo-type-per-system-pair slot rule.

**Architecture:** The change lands in two phases. Phase 1 replaces `PlanetType` values and fixes everything that breaks (constants, generator, initializer, visual tables) to keep the build green. Phase 2 layers on the three new behaviours: the `IndustryChain` module, the updated market tick that applies the boost, and the new route-creation guard. Phase 3 adds the chain-status UX and a final CI gate.

**Tech Stack:** TypeScript, Vitest 4, Phaser 4, Vite 8. Run `npm run check` (typecheck + tests + build) to verify gates. Run `npm run typecheck` for a fast type-only check.

**Spec:** [docs/superpowers/specs/2026-05-03-industry-chain-economy-design.md](../specs/2026-05-03-industry-chain-economy-design.md)

---

## File Map

| File                                               | Action     | Purpose                                                                                                                                                                                  |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                                | Modify     | Replace `PlanetType` union (7 old → 7 new values)                                                                                                                                        |
| `src/data/constants.ts`                            | Modify     | Replace `PLANET_CARGO_PROFILES`, `PLANET_PASSENGER_VOLUME`; add `PLANET_INDUSTRY_INPUT`, `INDUSTRY_INPUT_SUPPLY_MULTIPLIER`, `INDUSTRY_INPUT_DECAY_MULTIPLIER`; bump `SAVE_VERSION` to 8 |
| `src/siteContent.ts`                               | Modify     | Update `LABELS` map for new planet type strings                                                                                                                                          |
| `src/ui/RoutePickerMap.ts`                         | Modify     | Replace `PLANET_TYPE_COLORS` and `PLANET_ZONE_RANK`                                                                                                                                      |
| `src/scenes/system3d/SystemView3D.ts`              | Modify     | Replace `PLANET_BASE_COLORS` and `PLANET_RADIUS_BY_TYPE`                                                                                                                                 |
| `src/generation/GalaxyGenerator.ts`                | Modify     | Replace `INNER/MIDDLE/OUTER_WEIGHTS`, `generatePopulation` switch                                                                                                                        |
| `src/generation/MarketInitializer.ts`              | Modify     | Suppress input-cargo demand at producer worlds                                                                                                                                           |
| `src/game/economy/IndustryChain.ts`                | **Create** | Pure functions: `getInputCargo`, `getOutputCargo`, `getActiveProducers`                                                                                                                  |
| `src/game/economy/__tests__/IndustryChain.test.ts` | **Create** | Tests for IndustryChain                                                                                                                                                                  |
| `src/game/economy/MarketUpdater.ts`                | Modify     | Add optional `activeProducerIds` + `planets` params; apply supply boost + decay multiplier                                                                                               |
| `src/game/economy/__tests__/MarketUpdater.test.ts` | Modify     | Tests for the boost (existing tests keep passing with defaults)                                                                                                                          |
| `src/game/simulation/TurnSimulator.ts`             | Modify     | Compute `getActiveProducers` and pass to `updateMarket`                                                                                                                                  |
| `src/game/routes/RouteManager.ts`                  | Modify     | Export `hasDuplicateSystemPairCargo` helper                                                                                                                                              |
| `src/game/empire/EmpireAccessManager.ts`           | Modify     | Call `hasDuplicateSystemPairCargo` in `validateRouteCreation`                                                                                                                            |
| `src/game/empire/__tests__/EmpireAccess.test.ts`   | Modify     | Add system-pair rule tests                                                                                                                                                               |
| `src/game/ai/steps/aiDecisionStep.ts`              | Modify     | Filter duplicate-cargo candidates in `openAIRoute`                                                                                                                                       |
| `src/scenes/PlanetDetailScene.ts`                  | Modify     | Add industry chain status label                                                                                                                                                          |

---

## Phase 1 — Replace PlanetType (foundation, keeps build green)

### Task 1: Replace `PlanetType` in `src/data/types.ts`

**Files:**

- Modify: `src/data/types.ts:267-276`

- [ ] **Step 1.1: Replace the `PlanetType` const object**

Open `src/data/types.ts`. Replace lines 267–276:

```ts
export const PlanetType = {
  Agricultural: "agricultural",
  Mining: "mining",
  TechWorld: "techWorld",
  Manufacturing: "manufacturing",
  LuxuryWorld: "luxuryWorld",
  CoreWorld: "coreWorld",
  Frontier: "frontier",
} as const;
export type PlanetType = (typeof PlanetType)[keyof typeof PlanetType];
```

- [ ] **Step 1.2: Run typecheck to see the full breakage list**

```bash
npm run typecheck 2>&1 | head -60
```

Expected: many errors in `constants.ts`, `GalaxyGenerator.ts`, `RoutePickerMap.ts`, `SystemView3D.ts`, `siteContent.ts`. This is the full list of files to fix in subsequent steps.

---

### Task 2: Update constants in `src/data/constants.ts`

**Files:**

- Modify: `src/data/constants.ts`

- [ ] **Step 2.1: Bump `SAVE_VERSION` to 8**

Find `export const SAVE_VERSION = 7;` and change to:

```ts
export const SAVE_VERSION = 8;
```

- [ ] **Step 2.2: Replace `PLANET_CARGO_PROFILES`**

Replace the entire `PLANET_CARGO_PROFILES` block (currently lines 587–624):

```ts
export const PLANET_CARGO_PROFILES: Record<
  PlanetType,
  { produces: CargoType[]; demands: CargoType[] }
> = {
  [PlanetType.Agricultural]: {
    produces: [CargoType.Food],
    demands: [],
  },
  [PlanetType.Mining]: {
    produces: [CargoType.RawMaterials, CargoType.Hazmat],
    demands: [],
  },
  [PlanetType.TechWorld]: {
    produces: [CargoType.Technology],
    demands: [],
  },
  [PlanetType.Manufacturing]: {
    produces: [CargoType.Medical],
    demands: [],
  },
  [PlanetType.LuxuryWorld]: {
    produces: [CargoType.Luxury],
    demands: [],
  },
  [PlanetType.CoreWorld]: {
    produces: [],
    demands: [
      CargoType.Food,
      CargoType.Technology,
      CargoType.Luxury,
      CargoType.Medical,
      CargoType.Passengers,
      CargoType.Hazmat,
    ],
  },
  [PlanetType.Frontier]: {
    produces: [],
    demands: [CargoType.Food, CargoType.Medical, CargoType.Technology],
  },
};
```

- [ ] **Step 2.3: Replace `PLANET_PASSENGER_VOLUME`**

Replace the `PLANET_PASSENGER_VOLUME` block (currently lines 626–634):

```ts
export const PLANET_PASSENGER_VOLUME: Record<PlanetType, number> = {
  [PlanetType.Agricultural]: 15,
  [PlanetType.Mining]: 15,
  [PlanetType.TechWorld]: 40,
  [PlanetType.Manufacturing]: 50,
  [PlanetType.LuxuryWorld]: 60,
  [PlanetType.CoreWorld]: 100,
  [PlanetType.Frontier]: 25,
};
```

- [ ] **Step 2.4: Add the three new industry chain constants** (after `PLANET_PASSENGER_VOLUME`)

```ts
export const PLANET_INDUSTRY_INPUT: Record<PlanetType, CargoType | null> = {
  [PlanetType.Agricultural]: null,
  [PlanetType.Mining]: null,
  [PlanetType.TechWorld]: CargoType.RawMaterials,
  [PlanetType.Manufacturing]: CargoType.Passengers,
  [PlanetType.LuxuryWorld]: CargoType.Food,
  [PlanetType.CoreWorld]: null,
  [PlanetType.Frontier]: null,
};

export const INDUSTRY_INPUT_SUPPLY_MULTIPLIER = 2.0;
export const INDUSTRY_INPUT_DECAY_MULTIPLIER = 1.5;
```

- [ ] **Step 2.5: Run typecheck — errors should now be only in visual/generator files**

```bash
npm run typecheck 2>&1 | grep "error TS" | head -20
```

---

### Task 3: Fix visual planet-type tables

**Files:**

- Modify: `src/siteContent.ts:58-64`
- Modify: `src/ui/RoutePickerMap.ts:12-30`
- Modify: `src/scenes/system3d/SystemView3D.ts:15-33`

- [ ] **Step 3.1: Update `siteContent.ts` LABELS**

In `src/siteContent.ts`, find the planet type block inside `const LABELS` and replace:

```ts
  [PlanetType.Agricultural]: "Agricultural",
  [PlanetType.Mining]: "Mining",
  [PlanetType.TechWorld]: "Tech World",
  [PlanetType.Manufacturing]: "Manufacturing",
  [PlanetType.LuxuryWorld]: "Luxury World",
  [PlanetType.CoreWorld]: "Core World",
  [PlanetType.Frontier]: "Frontier",
```

- [ ] **Step 3.2: Update `RoutePickerMap.ts` color + zone tables**

Replace `PLANET_TYPE_COLORS` and `PLANET_ZONE_RANK` in `src/ui/RoutePickerMap.ts`:

```ts
const PLANET_TYPE_COLORS: Record<PlanetType, number> = {
  agricultural: 0x68b45a,
  mining: 0x8b8e97,
  techWorld: 0x73ddff,
  manufacturing: 0x9b8870,
  luxuryWorld: 0xff7fd3,
  coreWorld: 0xf6b04f,
  frontier: 0x4b86d6,
};

const PLANET_ZONE_RANK: Record<PlanetType, number> = {
  mining: 0,
  techWorld: 1,
  manufacturing: 2,
  agricultural: 3,
  luxuryWorld: 4,
  frontier: 5,
  coreWorld: 6,
};
```

- [ ] **Step 3.3: Update `SystemView3D.ts` color + radius tables**

Replace `PLANET_BASE_COLORS` and `PLANET_RADIUS_BY_TYPE` in `src/scenes/system3d/SystemView3D.ts`:

```ts
const PLANET_BASE_COLORS: Record<PlanetType, number> = {
  agricultural: 0x68b45a,
  mining: 0x8b8e97,
  techWorld: 0x73ddff,
  manufacturing: 0x9b8870,
  luxuryWorld: 0xff7fd3,
  coreWorld: 0xf6b04f,
  frontier: 0x4b86d6,
};

const PLANET_RADIUS_BY_TYPE: Record<PlanetType, number> = {
  agricultural: 0.7,
  mining: 0.55,
  techWorld: 0.6,
  manufacturing: 0.75,
  luxuryWorld: 0.65,
  coreWorld: 0.85,
  frontier: 0.65,
};
```

- [ ] **Step 3.4: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error TS" | head -20
```

Expected: errors now only in `GalaxyGenerator.ts`.

---

### Task 4: Update `GalaxyGenerator.ts`

**Files:**

- Modify: `src/generation/GalaxyGenerator.ts:46-88` (weight tables)
- Modify: `src/generation/GalaxyGenerator.ts:717-735` (`generatePopulation`)

- [ ] **Step 4.1: Replace the three orbital zone weight tables**

Replace `INNER_WEIGHTS`, `MIDDLE_WEIGHTS`, and `OUTER_WEIGHTS` in `src/generation/GalaxyGenerator.ts`:

```ts
const INNER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.CoreWorld, 30],
  [PlanetType.TechWorld, 25],
  [PlanetType.Mining, 20],
  [PlanetType.Manufacturing, 15],
  [PlanetType.Agricultural, 5],
  [PlanetType.LuxuryWorld, 3],
  [PlanetType.Frontier, 2],
];

const MIDDLE_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Agricultural, 25],
  [PlanetType.Frontier, 20],
  [PlanetType.TechWorld, 15],
  [PlanetType.LuxuryWorld, 15],
  [PlanetType.Manufacturing, 10],
  [PlanetType.CoreWorld, 10],
  [PlanetType.Mining, 5],
];

const OUTER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Frontier, 35],
  [PlanetType.Agricultural, 20],
  [PlanetType.Mining, 20],
  [PlanetType.LuxuryWorld, 15],
  [PlanetType.CoreWorld, 5],
  [PlanetType.TechWorld, 3],
  [PlanetType.Manufacturing, 2],
];
```

- [ ] **Step 4.2: Replace the `generatePopulation` switch**

Replace the `generatePopulation` function body:

```ts
function generatePopulation(rng: SeededRNG, type: PlanetTypeT): number {
  switch (type) {
    case PlanetType.CoreWorld:
      return rng.nextInt(500000, 2000000);
    case PlanetType.Manufacturing:
      return rng.nextInt(200000, 800000);
    case PlanetType.TechWorld:
      return rng.nextInt(100000, 500000);
    case PlanetType.LuxuryWorld:
      return rng.nextInt(30000, 200000);
    case PlanetType.Agricultural:
      return rng.nextInt(50000, 300000);
    case PlanetType.Mining:
      return rng.nextInt(10000, 100000);
    case PlanetType.Frontier:
      return rng.nextInt(5000, 80000);
    default:
      return rng.nextInt(10000, 100000);
  }
}
```

- [ ] **Step 4.3: Run typecheck — should be clean now**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4.4: Run tests**

```bash
npm run test 2>&1 | tail -20
```

Expected: some GalaxyGenerator tests may fail if they assert on specific planet types by name. Note which ones.

- [ ] **Step 4.5: Fix GalaxyGenerator tests**

In `src/generation/__tests__/GalaxyGenerator.test.ts`, update `ALL_PLANET_TYPES` on line 5 (it derives from `PlanetType` dynamically so will auto-update). The "all planets have valid PlanetType" test should pass automatically since it reads from `Object.values(PlanetType)`. However, any test checking for specific type values like `PlanetType.Terran` must be updated to use the new values.

Search for old values in test file:

```bash
grep -n "Terran\|Industrial\|HubStation\|Resort\|Research" src/generation/__tests__/GalaxyGenerator.test.ts
```

If any found, replace with equivalent new values (CoreWorld for HubStation, Frontier for Terran, TechWorld for Industrial, LuxuryWorld for Resort, Manufacturing for Research).

- [ ] **Step 4.6: Run tests again**

```bash
npm run test
```

Expected: all tests pass.

---

### Task 5: Update `MarketInitializer.ts` for new profiles

**Files:**

- Modify: `src/generation/MarketInitializer.ts`

- [ ] **Step 5.1: Import `PLANET_INDUSTRY_INPUT`**

Add `PLANET_INDUSTRY_INPUT` to the import from `../data/constants.ts` in `src/generation/MarketInitializer.ts`.

Full import block should be:

```ts
import {
  PLANET_CARGO_PROFILES,
  PLANET_PASSENGER_VOLUME,
  PLANET_INDUSTRY_INPUT,
  BASE_CARGO_PRICES,
  BASE_FUEL_PRICE,
} from "../data/constants.ts";
```

- [ ] **Step 5.2: Suppress input-cargo demand at producer worlds**

In `createPlanetMarket`, the existing logic has three branches: `producedSet`, `demandedSet`, and neutral. Add a fourth case before the existing checks to suppress the industry input cargo:

Replace the section that starts `if (cargoType === CargoType.Passengers)` with:

```ts
const inputCargo = PLANET_INDUSTRY_INPUT[planet.type];

if (cargoType === CargoType.Passengers) {
  // Use passenger volume to create meaningful demand differentials.
  if (paxVolume >= 70) {
    baseSupply = rng.nextFloat(15, 30);
    baseDemand = rng.nextFloat(paxVolume * 0.7, paxVolume);
  } else if (paxVolume >= 40) {
    baseSupply = rng.nextFloat(25, 45);
    baseDemand = rng.nextFloat(40, 65);
  } else {
    baseSupply = rng.nextFloat(50, 80);
    baseDemand = rng.nextFloat(10, 25);
  }
} else if (inputCargo !== null && cargoType === inputCargo) {
  // Input cargo at its own producer world is a catalyst, not a market good:
  // near-zero demand prevents spurious buy/sell markets.
  baseSupply = rng.nextFloat(5, 15);
  baseDemand = rng.nextFloat(1, 5);
} else if (producedSet.has(cargoType)) {
  baseSupply = rng.nextFloat(60, 100);
  baseDemand = rng.nextFloat(10, 30);
} else if (demandedSet.has(cargoType)) {
  baseSupply = rng.nextFloat(10, 30);
  baseDemand = rng.nextFloat(60, 100);
} else {
  baseSupply = rng.nextFloat(30, 50);
  baseDemand = rng.nextFloat(30, 50);
}
```

- [ ] **Step 5.3: Run full CI gate**

```bash
npm run check
```

Expected: typecheck passes, tests pass, build passes. Phase 1 complete.

- [ ] **Step 5.4: Commit Phase 1**

```bash
git add src/data/types.ts src/data/constants.ts src/siteContent.ts src/ui/RoutePickerMap.ts src/scenes/system3d/SystemView3D.ts src/generation/GalaxyGenerator.ts src/generation/MarketInitializer.ts src/generation/__tests__/GalaxyGenerator.test.ts
git commit -m "feat(economy): replace PlanetType roster with 5-producer + 2-consumer system

New roster: Agricultural, Mining, TechWorld, Manufacturing, LuxuryWorld (producers)
+ CoreWorld and Frontier (consumers). Drops Terran, Industrial, HubStation, Resort,
Research. Bumps SAVE_VERSION to 8.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 2 — Industry chain + route slot rule

### Task 6: Create `IndustryChain.ts`

**Files:**

- Create: `src/game/economy/IndustryChain.ts`
- Create: `src/game/economy/__tests__/IndustryChain.test.ts`

- [ ] **Step 6.1: Write the failing tests first**

Create `src/game/economy/__tests__/IndustryChain.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getInputCargo,
  getOutputCargo,
  getActiveProducers,
} from "../IndustryChain.ts";
import { PlanetType, CargoType } from "../../../data/types.ts";
import type { Planet, ActiveRoute } from "../../../data/types.ts";

function makePlanet(
  id: string,
  systemId: string,
  type: Planet["type"],
): Planet {
  return { id, name: id, systemId, type, x: 0, y: 0, population: 100000 };
}

function makeRoute(
  id: string,
  destPlanetId: string,
  cargoType: ActiveRoute["cargoType"],
  paused = false,
): ActiveRoute {
  return {
    id,
    originPlanetId: "origin-1",
    destinationPlanetId: destPlanetId,
    distance: 100,
    assignedShipIds: [],
    cargoType,
    paused,
  };
}

describe("getInputCargo", () => {
  it("returns RawMaterials for TechWorld", () => {
    expect(getInputCargo(PlanetType.TechWorld)).toBe(CargoType.RawMaterials);
  });

  it("returns Passengers for Manufacturing", () => {
    expect(getInputCargo(PlanetType.Manufacturing)).toBe(CargoType.Passengers);
  });

  it("returns Food for LuxuryWorld", () => {
    expect(getInputCargo(PlanetType.LuxuryWorld)).toBe(CargoType.Food);
  });

  it("returns null for Agricultural (no input)", () => {
    expect(getInputCargo(PlanetType.Agricultural)).toBeNull();
  });

  it("returns null for CoreWorld (consumer)", () => {
    expect(getInputCargo(PlanetType.CoreWorld)).toBeNull();
  });
});

describe("getOutputCargo", () => {
  it("returns Technology for TechWorld", () => {
    expect(getOutputCargo(PlanetType.TechWorld)).toBe(CargoType.Technology);
  });

  it("returns Food for Agricultural", () => {
    expect(getOutputCargo(PlanetType.Agricultural)).toBe(CargoType.Food);
  });

  it("returns null for CoreWorld (no output)", () => {
    expect(getOutputCargo(PlanetType.CoreWorld)).toBeNull();
  });
});

describe("getActiveProducers", () => {
  it("marks a TechWorld as active when a Raw route delivers to its system", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const otherPlanet = makePlanet("other-1", "sys-2", PlanetType.Mining);
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, otherPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("other-1")).toBe(false);
  });

  it("activates via system-level delivery (route targets other planet in same system)", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const sisterPlanet = makePlanet("sister-1", "sys-1", PlanetType.Frontier);
    // Route delivers Raw to the sister planet in the same system, not directly to techPlanet
    const rawRoute = makeRoute("r1", "sister-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, sisterPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
  });

  it("does NOT activate when the input route is paused", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const pausedRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials, true);

    const result = getActiveProducers([techPlanet], [pausedRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("does NOT activate with wrong cargo type", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const foodRoute = makeRoute("r1", "tech-1", CargoType.Food);

    const result = getActiveProducers([techPlanet], [foodRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("returns empty set when no routes", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const result = getActiveProducers([techPlanet], []);
    expect(result.size).toBe(0);
  });

  it("activates multiple producers in the same system with one route", () => {
    const tech1 = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const tech2 = makePlanet("tech-2", "sys-1", PlanetType.TechWorld);
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([tech1, tech2], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("tech-2")).toBe(true);
  });

  it("consumer planets (CoreWorld, Frontier) are never added to activeProducers", () => {
    const core = makePlanet("core-1", "sys-1", PlanetType.CoreWorld);
    const frontier = makePlanet("front-1", "sys-1", PlanetType.Frontier);
    const anyRoute = makeRoute("r1", "core-1", CargoType.Food);

    const result = getActiveProducers([core, frontier], [anyRoute]);
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
npm run test -- src/game/economy/__tests__/IndustryChain.test.ts 2>&1 | tail -10
```

Expected: FAIL — `../IndustryChain.ts` not found.

- [ ] **Step 6.3: Create `src/game/economy/IndustryChain.ts`**

```ts
import type {
  Planet,
  ActiveRoute,
  PlanetType,
  CargoType,
} from "../../data/types.ts";
import {
  PLANET_INDUSTRY_INPUT,
  PLANET_CARGO_PROFILES,
} from "../../data/constants.ts";

export function getInputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_INDUSTRY_INPUT[planetType] ?? null;
}

export function getOutputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_CARGO_PROFILES[planetType]?.produces[0] ?? null;
}

/**
 * Returns the set of producer planet IDs whose industry input is active this
 * turn. A producer's input is active when any non-paused route delivers the
 * required input cargo to any planet in the same system as the producer.
 */
export function getActiveProducers(
  planets: Planet[],
  allRoutes: ActiveRoute[],
): Set<string> {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  const activeRoutes = allRoutes.filter((r) => !r.paused);

  const activeProducers = new Set<string>();

  for (const planet of planets) {
    const inputCargo = getInputCargo(planet.type);
    if (inputCargo === null) continue;

    const hasInputRoute = activeRoutes.some(
      (r) =>
        r.cargoType === inputCargo &&
        planetById.get(r.destinationPlanetId)?.systemId === planet.systemId,
    );

    if (hasInputRoute) {
      activeProducers.add(planet.id);
    }
  }

  return activeProducers;
}
```

- [ ] **Step 6.4: Run tests**

```bash
npm run test -- src/game/economy/__tests__/IndustryChain.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/game/economy/IndustryChain.ts src/game/economy/__tests__/IndustryChain.test.ts
git commit -m "feat(economy): add IndustryChain module — connection-based producer boost

Pure functions: getInputCargo, getOutputCargo, getActiveProducers.
An active input = any non-paused route delivering the input cargo to the
producer's system, regardless of ownership.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Update `MarketUpdater.ts` to apply industry boost

**Files:**

- Modify: `src/game/economy/MarketUpdater.ts`
- Modify: `src/game/economy/__tests__/MarketUpdater.test.ts`

- [ ] **Step 7.1: Write the new failing tests**

Add a new `describe` block at the end of `src/game/economy/__tests__/MarketUpdater.test.ts`:

```ts
describe("industry chain boost", () => {
  it("doubles effective supply for active producer's output cargo", () => {
    // Tech planet with base supply 50 — no boost vs active boost
    const unboostedMarket = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Technology]: { baseSupply: 50, baseDemand: 50 },
        }),
      },
    });

    const rng = new SeededRNG(42);

    // Without boost
    const noBoost = updateMarket(unboostedMarket, rng);
    const noBoostPrice =
      noBoost.planetMarkets["tech-1"][CargoType.Technology].currentPrice;

    // With tech-1 marked as active producer of Technology
    const rng2 = new SeededRNG(42); // same seed
    // We need to pass planets so MarketUpdater knows tech-1 produces Technology.
    // Use a minimal Planet-like object matching the Planet interface.
    const techPlanet: import("../../../data/types.ts").Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: "techWorld" as import("../../../data/types.ts").PlanetType,
      x: 0,
      y: 0,
      population: 100000,
    };
    const boosted = updateMarket(unboostedMarket, rng2, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const boostedPrice =
      boosted.planetMarkets["tech-1"][CargoType.Technology].currentPrice;

    // Boosted price should be lower because supply is doubled (more supply → lower price)
    expect(boostedPrice).toBeLessThan(noBoostPrice);
  });

  it("boosts saturation decay for active producer's output cargo", () => {
    const market = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Technology]: {
            saturation: 0.8,
            baseSupply: 50,
            baseDemand: 50,
          },
        }),
      },
    });

    const techPlanet: import("../../../data/types.ts").Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: "techWorld" as import("../../../data/types.ts").PlanetType,
      x: 0,
      y: 0,
      population: 100000,
    };

    const rng = new SeededRNG(42);
    const updated = updateMarket(market, rng, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const entry = updated.planetMarkets["tech-1"][CargoType.Technology];

    // Boosted decay: 0.8 * (1 - 0.08 * 1.5) = 0.8 * 0.88 = 0.704
    expect(entry.saturation).toBeCloseTo(0.8 * (1 - 0.08 * 1.5), 4);
  });

  it("does not boost non-output cargo at an active producer", () => {
    const market = makeMarketState({
      planetMarkets: {
        "tech-1": makePlanetMarket({
          [CargoType.Food]: { saturation: 0.8, baseSupply: 50, baseDemand: 50 },
        }),
      },
    });

    const techPlanet: import("../../../data/types.ts").Planet = {
      id: "tech-1",
      name: "Tech 1",
      systemId: "sys-1",
      type: "techWorld" as import("../../../data/types.ts").PlanetType,
      x: 0,
      y: 0,
      population: 100000,
    };

    const rng = new SeededRNG(42);
    const updated = updateMarket(market, rng, new Set(["tech-1"]), [
      techPlanet,
    ]);
    const foodEntry = updated.planetMarkets["tech-1"][CargoType.Food];

    // Normal decay (no boost for Food at a TechWorld)
    expect(foodEntry.saturation).toBeCloseTo(0.8 * 0.92, 4);
  });
});
```

- [ ] **Step 7.2: Run tests to confirm the new ones fail**

```bash
npm run test -- src/game/economy/__tests__/MarketUpdater.test.ts 2>&1 | tail -15
```

Expected: the three new tests FAIL (function signature not yet updated).

- [ ] **Step 7.3: Update `MarketUpdater.ts` signature and logic**

In `src/game/economy/MarketUpdater.ts`, replace the entire file content:

```ts
import { CargoType } from "../../data/types.ts";
import type {
  CargoType as CargoTypeT,
  MarketState,
  CargoMarketEntry,
  Planet,
  PlanetMarket,
  Trend,
} from "../../data/types.ts";
import {
  BASE_FUEL_PRICE,
  SATURATION_DECAY_RATE,
  PLANET_CARGO_PROFILES,
  INDUSTRY_INPUT_SUPPLY_MULTIPLIER,
  INDUSTRY_INPUT_DECAY_MULTIPLIER,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { calculatePrice } from "./PriceCalculator.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

/**
 * Per-turn market update. Returns a new MarketState (does not mutate input).
 *
 * Steps:
 * 1. Decay saturation (boosted for active industry producer output)
 * 2. Random-walk trends with momentum
 * 3. Recalculate currentPrice (boosted supply for active industry producer output)
 * 4. Fluctuate fuel price with +-0.5 walk, clamped to [50%, 150%] of BASE_FUEL_PRICE
 *
 * activeProducerIds: set of planet IDs whose industry input is active this turn.
 * planets: the galaxy planet list, needed to look up planet type → output cargo.
 * Both default to empty — omitting them disables the industry boost (used by tests
 * that pre-date the feature).
 */
export function updateMarket(
  market: MarketState,
  rng: SeededRNG,
  activeProducerIds: Set<string> = new Set(),
  planets: Planet[] = [],
): MarketState {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  const newPlanetMarkets: Record<string, PlanetMarket> = {};

  for (const planetId of Object.keys(market.planetMarkets)) {
    const planetMarket = market.planetMarkets[planetId];
    const newEntries: Partial<Record<CargoTypeT, CargoMarketEntry>> = {};

    const planet = planetById.get(planetId);
    const isActiveProducer = activeProducerIds.has(planetId);
    const outputCargo: CargoTypeT | null = planet
      ? (PLANET_CARGO_PROFILES[planet.type]?.produces[0] ?? null)
      : null;

    for (const cargoType of ALL_CARGO_TYPES) {
      const entry = planetMarket[cargoType];

      const isOutputCargo = isActiveProducer && cargoType === outputCargo;

      // Step 1: Decay saturation (1.5× faster when input is active)
      const decayRate = isOutputCargo
        ? SATURATION_DECAY_RATE * INDUSTRY_INPUT_DECAY_MULTIPLIER
        : SATURATION_DECAY_RATE;
      const newSaturation = entry.saturation * (1 - decayRate);

      // Step 2: Random-walk trends
      const { trend: newTrend, momentum: newMomentum } = updateTrend(
        entry.trend,
        entry.trendMomentum,
        rng,
      );

      const updatedEntry: CargoMarketEntry = {
        ...entry,
        saturation: newSaturation,
        trend: newTrend,
        trendMomentum: newMomentum,
        eventModifier: entry.eventModifier,
      };

      // Step 3: Recalculate price — apply supply multiplier transiently for
      // active producer output (baseSupply is not mutated; the boost only
      // affects the recalculated currentPrice each turn).
      const effectiveEntry: CargoMarketEntry = isOutputCargo
        ? {
            ...updatedEntry,
            baseSupply:
              updatedEntry.baseSupply * INDUSTRY_INPUT_SUPPLY_MULTIPLIER,
          }
        : updatedEntry;
      updatedEntry.currentPrice = calculatePrice(effectiveEntry, cargoType);

      newEntries[cargoType] = updatedEntry;
    }

    newPlanetMarkets[planetId] = newEntries as PlanetMarket;
  }

  // Step 4: Fluctuate fuel price (additive walk to avoid drift)
  const fuelChange = rng.nextFloat(-0.5, 0.5);
  const newFuelPrice = market.fuelPrice + fuelChange;
  const minFuel = BASE_FUEL_PRICE * 0.5;
  const maxFuel = BASE_FUEL_PRICE * 1.5;
  const clampedFuelPrice = Math.min(maxFuel, Math.max(minFuel, newFuelPrice));

  return {
    fuelPrice: Math.round(clampedFuelPrice * 100) / 100,
    fuelTrend: market.fuelTrend,
    planetMarkets: newPlanetMarkets,
  };
}

/**
 * Update trend with random walk and momentum.
 */
function updateTrend(
  currentTrend: Trend,
  momentum: number,
  rng: SeededRNG,
): { trend: Trend; momentum: number } {
  if (!rng.chance(0.2)) {
    return { trend: currentTrend, momentum };
  }

  const momentumBonus = Math.abs(momentum) * 0.05;
  let newTrend: Trend = currentTrend;

  switch (currentTrend) {
    case "rising": {
      const fallChance = Math.max(0.05 - momentumBonus, 0.01);
      const stableChance = Math.max(0.15 - momentumBonus * 0.5, 0.05);
      const roll = rng.next();
      if (roll < fallChance) {
        newTrend = "falling";
      } else if (roll < fallChance + stableChance) {
        newTrend = "stable";
      }
      break;
    }
    case "stable": {
      const risingChance =
        momentum > 0 ? 0.1 + momentumBonus : 0.1 - momentumBonus;
      const roll = rng.next();
      if (roll < Math.max(risingChance, 0.02)) {
        newTrend = "rising";
      } else if (
        roll <
        Math.max(risingChance, 0.02) +
          Math.max(0.1 - (momentum > 0 ? momentumBonus : -momentumBonus), 0.02)
      ) {
        newTrend = "falling";
      }
      break;
    }
    case "falling": {
      const riseChance = Math.max(0.05 - momentumBonus, 0.01);
      const stableChance = Math.max(0.15 - momentumBonus * 0.5, 0.05);
      const roll = rng.next();
      if (roll < riseChance) {
        newTrend = "rising";
      } else if (roll < riseChance + stableChance) {
        newTrend = "stable";
      }
      break;
    }
  }

  let newMomentum = momentum;
  if (newTrend === "rising") {
    newMomentum = Math.min(momentum + 1, 5);
  } else if (newTrend === "falling") {
    newMomentum = Math.max(momentum - 1, -5);
  } else {
    if (newMomentum > 0) newMomentum--;
    else if (newMomentum < 0) newMomentum++;
  }

  return { trend: newTrend, momentum: newMomentum };
}
```

- [ ] **Step 7.4: Run all market tests**

```bash
npm run test -- src/game/economy/__tests__/MarketUpdater.test.ts
```

Expected: all tests PASS (existing tests still work because defaults silence the boost; new tests confirm the boost).

- [ ] **Step 7.5: Commit**

```bash
git add src/game/economy/MarketUpdater.ts src/game/economy/__tests__/MarketUpdater.test.ts
git commit -m "feat(economy): apply industry chain supply boost in market update tick

Active producers (input route present in system) get 2× effective supply
and 1.5× saturation decay for their output cargo each turn. baseSupply is
never mutated — boost is applied transiently during price recalculation.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Wire chain data in `TurnSimulator.ts`

**Files:**

- Modify: `src/game/simulation/TurnSimulator.ts:24` (import), `~633` (call site)

- [ ] **Step 8.1: Add the `getActiveProducers` import**

In `src/game/simulation/TurnSimulator.ts`, find the import from `../economy/MarketUpdater.ts` and add a second import:

```ts
import { getActiveProducers } from "../economy/IndustryChain.ts";
```

- [ ] **Step 8.2: Pass chain data to `updateMarket`**

Find the line `const updatedMarket = updateMarket(nextState.market, rng);` (around line 633) and replace it with:

```ts
// Gather all active routes across player and all AI companies for chain evaluation.
const allRoutesForChain = [
  ...nextState.activeRoutes,
  ...nextState.aiCompanies.flatMap((ai) => ai.activeRoutes),
];
const activeProducerIds = getActiveProducers(
  nextState.galaxy.planets,
  allRoutesForChain,
);
const updatedMarket = updateMarket(
  nextState.market,
  rng,
  activeProducerIds,
  nextState.galaxy.planets,
);
```

- [ ] **Step 8.3: Run CI gate**

```bash
npm run check
```

Expected: all green.

- [ ] **Step 8.4: Commit**

```bash
git add src/game/simulation/TurnSimulator.ts
git commit -m "feat(economy): wire industry chain boost into turn simulator

TurnSimulator now computes active producers from player + AI routes and
passes them to updateMarket each turn.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Add system-pair route rule

**Files:**

- Modify: `src/game/routes/RouteManager.ts`
- Modify: `src/game/empire/EmpireAccessManager.ts`
- Modify: `src/game/ai/steps/aiDecisionStep.ts`
- Modify: `src/game/empire/__tests__/EmpireAccess.test.ts`

- [ ] **Step 9.1: Write failing tests for the new rule**

Open `src/game/empire/__tests__/EmpireAccess.test.ts`. Add a new `describe` block at the end (before the closing of the file):

First check the existing test structure to find the right place:

```bash
grep -n "describe\|it(" src/game/empire/__tests__/EmpireAccess.test.ts | tail -20
```

Then add:

```ts
describe("validateRouteCreation — system-pair cargo uniqueness", () => {
  function makeMinimalState(
    routes: import("../../../data/types.ts").ActiveRoute[],
  ): import("../../../data/types.ts").GameState {
    // Use createNewGame to get a valid state, then patch routes and planets
    const state = createNewGame({ seed: 1, gameSize: "quick" });
    // Add two systems with planets in different empires for testing
    const sys1: import("../../../data/types.ts").StarSystem = {
      id: "test-sys-1",
      name: "System Alpha",
      sectorId: "s1",
      empireId: state.galaxy.empires[0]?.id ?? "emp1",
      x: 0,
      y: 0,
      starColor: 0xffffff,
    };
    const sys2: import("../../../data/types.ts").StarSystem = {
      id: "test-sys-2",
      name: "System Beta",
      sectorId: "s1",
      empireId: state.galaxy.empires[0]?.id ?? "emp1",
      x: 100,
      y: 0,
      starColor: 0xffffff,
    };
    const planet1: import("../../../data/types.ts").Planet = {
      id: "tp-1",
      name: "Alpha Prime",
      systemId: "test-sys-1",
      type: "agricultural" as import("../../../data/types.ts").PlanetType,
      x: 0,
      y: 0,
      population: 100000,
    };
    const planet2: import("../../../data/types.ts").Planet = {
      id: "tp-2",
      name: "Beta Prime",
      systemId: "test-sys-2",
      type: "coreWorld" as import("../../../data/types.ts").PlanetType,
      x: 100,
      y: 0,
      population: 500000,
    };
    return {
      ...state,
      activeRoutes: routes,
      galaxy: {
        ...state.galaxy,
        systems: [...state.galaxy.systems, sys1, sys2],
        planets: [...state.galaxy.planets, planet1, planet2],
      },
    };
  }

  it("blocks a second Food route between the same system pair", () => {
    const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
      id: "existing-1",
      originPlanetId: "tp-1",
      destinationPlanetId: "tp-2",
      distance: 100,
      assignedShipIds: [],
      cargoType: "food" as import("../../../data/types.ts").CargoType,
    };
    const state = makeMinimalState([existingFoodRoute]);

    const error = validateRouteCreation(
      "tp-1",
      "tp-2",
      "food" as import("../../../data/types.ts").CargoType,
      state,
    );
    expect(error).toMatch(/system pair.*food/i);
  });

  it("allows a second route between the same system pair with different cargo", () => {
    const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
      id: "existing-1",
      originPlanetId: "tp-1",
      destinationPlanetId: "tp-2",
      distance: 100,
      assignedShipIds: [],
      cargoType: "food" as import("../../../data/types.ts").CargoType,
    };
    const state = makeMinimalState([existingFoodRoute]);

    const error = validateRouteCreation(
      "tp-1",
      "tp-2",
      "technology" as import("../../../data/types.ts").CargoType,
      state,
    );
    // Should not fail on the cargo uniqueness rule (may fail on slots, but not the cargo rule)
    if (error) {
      expect(error).not.toMatch(/system pair/i);
    }
  });

  it("blocks a Food route even when origin and destination are swapped", () => {
    const existingFoodRoute: import("../../../data/types.ts").ActiveRoute = {
      id: "existing-1",
      originPlanetId: "tp-2",
      destinationPlanetId: "tp-1",
      distance: 100,
      assignedShipIds: [],
      cargoType: "food" as import("../../../data/types.ts").CargoType,
    };
    const state = makeMinimalState([existingFoodRoute]);

    const error = validateRouteCreation(
      "tp-1",
      "tp-2",
      "food" as import("../../../data/types.ts").CargoType,
      state,
    );
    expect(error).toMatch(/system pair.*food/i);
  });
});
```

- [ ] **Step 9.2: Run tests to confirm new ones fail**

```bash
npm run test -- src/game/empire/__tests__/EmpireAccess.test.ts 2>&1 | tail -15
```

Expected: the three new tests FAIL ("system pair" message not yet returned).

- [ ] **Step 9.3: Add `hasDuplicateSystemPairCargo` to `RouteManager.ts`**

In `src/game/routes/RouteManager.ts`, after the `getFreeSlotsForScope` function (around line 301), add:

```ts
/**
 * Returns true when the given system pair already has a route for `cargoType`.
 * The check is bidirectional: A→B and B→A are the same pair.
 * Used by validateRouteCreation (player) and openAIRoute (AI) to enforce the
 * one-route-per-cargo-per-system-pair rule.
 */
export function hasDuplicateSystemPairCargo(
  existingRoutes: ActiveRoute[],
  planets: Planet[],
  originSystemId: string,
  destSystemId: string,
  cargoType: CargoType,
): boolean {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  return existingRoutes.some((r) => {
    if (r.cargoType !== cargoType) return false;
    const rOriginSysId = planetById.get(r.originPlanetId)?.systemId;
    const rDestSysId = planetById.get(r.destinationPlanetId)?.systemId;
    if (!rOriginSysId || !rDestSysId) return false;
    return (
      (rOriginSysId === originSystemId && rDestSysId === destSystemId) ||
      (rOriginSysId === destSystemId && rDestSysId === originSystemId)
    );
  });
}
```

- [ ] **Step 9.4: Add the check to `validateRouteCreation` in `EmpireAccessManager.ts`**

In `src/game/empire/EmpireAccessManager.ts`, add the import at the top:

```ts
import { hasDuplicateSystemPairCargo } from "../routes/RouteManager.ts";
```

Then in `validateRouteCreation`, after the slot pool checks (after the `if (isGalactic)` block, around line 224) and before the hyperlane check, add:

```ts
// System-pair cargo uniqueness: only one route per cargo type between any two systems.
if (cargoType !== null) {
  const isDuplicate = hasDuplicateSystemPairCargo(
    state.activeRoutes,
    planets,
    originPlanet.systemId,
    destinationPlanet.systemId,
    cargoType,
  );
  if (isDuplicate) {
    return `System pair already has a ${cargoType} route`;
  }
}
```

- [ ] **Step 9.5: Run the EmpireAccess tests**

```bash
npm run test -- src/game/empire/__tests__/EmpireAccess.test.ts
```

Expected: all tests PASS including the three new ones.

- [ ] **Step 9.6: Update AI route selection in `aiDecisionStep.ts`**

In `src/game/ai/steps/aiDecisionStep.ts`, add the import:

```ts
import { hasDuplicateSystemPairCargo } from "../../routes/RouteManager.ts";
```

In `openAIRoute`, after the existing `existingRouteKeys` check (around line 360), add a system-pair cargo check. Find the inner loop that scores candidate routes and add after `if (existingRouteKeys.has(key)) continue;`:

```ts
      // Respect one-route-per-cargo-per-system-pair rule for AI
      for (const cargoType of cargoTypes) {
        // Skip cargo types where this system pair already has a route
        if (
          hasDuplicateSystemPairCargo(
            existingRoutes,
            planets,
            origin.systemId,
            dest.systemId,
            cargoType,
          )
        )
          continue;
```

Close the loop correctly — the existing `for (const cargoType of cargoTypes)` loop below the existing checks needs to be restructured. Find the current inner `for (const cargoType of cargoTypes) {` loop in `openAIRoute` and prepend the duplicate check as the first statement inside it:

```ts
      for (const cargoType of cargoTypes) {
        // Respect one-route-per-cargo-per-system-pair rule
        if (
          hasDuplicateSystemPairCargo(
            existingRoutes,
            planets,
            origin.systemId,
            dest.systemId,
            cargoType,
          )
        )
          continue;

        // (existing scoring code follows...)
```

- [ ] **Step 9.7: Run full CI gate**

```bash
npm run check
```

Expected: all green.

- [ ] **Step 9.8: Commit**

```bash
git add src/game/routes/RouteManager.ts src/game/empire/EmpireAccessManager.ts src/game/ai/steps/aiDecisionStep.ts src/game/empire/__tests__/EmpireAccess.test.ts
git commit -m "feat(routes): enforce one route per cargo type per system pair

New hasDuplicateSystemPairCargo helper in RouteManager, consumed by both
validateRouteCreation (player) and openAIRoute (AI). Bidirectional: A→B
and B→A are treated as the same pair.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 3 — UX and final gate

### Task 10: Show chain status in `PlanetDetailScene.ts`

**Files:**

- Modify: `src/scenes/PlanetDetailScene.ts`

- [ ] **Step 10.1: Import IndustryChain functions**

In `src/scenes/PlanetDetailScene.ts`, add the import:

```ts
import {
  getInputCargo,
  getOutputCargo,
} from "../game/economy/IndustryChain.ts";
import { getActiveProducers } from "../game/economy/IndustryChain.ts";
```

Or combine:

```ts
import {
  getInputCargo,
  getOutputCargo,
  getActiveProducers,
} from "../game/economy/IndustryChain.ts";
```

- [ ] **Step 10.2: Add chain status label after the planet type/population line**

Find the section where `this.infoLabel` is created (around line 117–122 of `PlanetDetailScene.ts`). After the existing `infoLabel` creation, add a chain status label. The exact placement depends on the scene's layout manager — add it directly below `this.infoLabel` setup.

First, compute the chain status string before creating the label. Find where `planet` is available in the create/init flow and add:

```ts
// Industry chain status
const inputCargo = getInputCargo(planet.type);
const outputCargo = getOutputCargo(planet.type);
let chainText = "";
if (inputCargo !== null && outputCargo !== null) {
  const state = gameStore.getState();
  const allRoutes = [
    ...state.activeRoutes,
    ...state.aiCompanies.flatMap((ai) => ai.activeRoutes),
  ];
  const activeProducers = getActiveProducers(state.galaxy.planets, allRoutes);
  const isActive = activeProducers.has(planet.id);
  chainText = isActive
    ? `Industry input: ${inputCargo} ✓ Active`
    : `Industry input: ${inputCargo} ✗ Inactive — deliver ${inputCargo} to this system to boost ${outputCargo} supply`;
}
```

Then add a label for it:

```ts
if (chainText) {
  this.chainStatusLabel = new Label(this, {
    x: 0,
    y: 0,
    text: chainText,
    style: "caption",
    color: chainText.includes("✓") ? theme.colors.profit : theme.colors.textDim,
    maxWidth: 700,
  });
}
```

(Declare `private chainStatusLabel?: Label;` in the class fields alongside the other labels.)

Then add `this.chainStatusLabel` to the layout flow wherever labels are positioned in this scene — follow the existing layout pattern for `this.hintLabel`.

- [ ] **Step 10.3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 10.4: Commit**

```bash
git add src/scenes/PlanetDetailScene.ts
git commit -m "feat(ui): show industry chain status in PlanetDetailScene

Producer planets display their input cargo requirement and whether it is
currently active (any non-paused route delivering the input to the system).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Final CI gate

- [ ] **Step 11.1: Run full CI gate**

```bash
npm run check
```

Expected: typecheck passes, all tests pass, build succeeds.

- [ ] **Step 11.2: If any test failures, investigate**

```bash
npm run test 2>&1 | grep -A5 "FAIL\|Error"
```

Fix any failures before declaring done.

- [ ] **Step 11.3: Verify SAVE_VERSION bump is wired into SaveManager**

```bash
grep -n "SAVE_VERSION" src/game/SaveManager.ts src/data/constants.ts
```

Expected: `constants.ts` has `SAVE_VERSION = 8`. `SaveManager.ts` should reference it. Confirm the load path shows a clear error (not silent corruption) on version mismatch.

- [ ] **Step 11.4: Final commit if any loose ends**

```bash
git status
```

If any unstaged changes remain, stage and commit them with an appropriate message.

---

## Reference: New Planet Type Cheat Sheet

| Old Value      | New Value       | Produces    | Input         |
| -------------- | --------------- | ----------- | ------------- |
| `terran`       | `frontier`      | —           | —             |
| `industrial`   | `techWorld`     | Technology  | Raw Materials |
| `mining`       | `mining`        | Raw, Hazmat | —             |
| `agricultural` | `agricultural`  | Food        | —             |
| `hubStation`   | `coreWorld`     | —           | —             |
| `resort`       | `luxuryWorld`   | Luxury      | Food          |
| `research`     | `manufacturing` | Medical     | Passengers    |

Tuning knobs (all in `constants.ts`):

- `INDUSTRY_INPUT_SUPPLY_MULTIPLIER = 2.0` — how much supply doubles when input is active
- `INDUSTRY_INPUT_DECAY_MULTIPLIER = 1.5` — how much faster saturation clears for active producers
- Galaxy generator weight tables `INNER/MIDDLE/OUTER_WEIGHTS` — Core scarcity, Frontier density
