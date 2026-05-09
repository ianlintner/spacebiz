# Galaxy & Economy Refresh — Design

**Date:** 2026-05-09
**Status:** Approved (brainstorming complete) — pending implementation plan
**Scope:** Major refresh of galaxy generation, empire/system/world generation, goods specialization, and the price/population loop.
**Save compatibility:** Clean break. We are pre-1.0 / alpha. Save version bumps; old saves are rejected with a friendly modal.

## Goals

1. **Larger galaxy** that visually reads as a two-arm spiral, with three size tiers (~300 / ~450 / ~600 systems). Optimize first for the ~300-system Quick tier; ensure Standard (~450) is comfortable; Epic (~600) is supported but not perf-tuned.
2. **Per-world production/consumption.** Worlds only produce certain goods and only accept certain goods, varying within a planet type (two Agricultural worlds can be very different).
3. **Balanced empires** that contain at least one producer for most major good types (≥5 of 7) — without making every empire feel identical.
4. **Special-resource planets** (one per major good type, ~7 per galaxy) that all empires want. Owner empire gates access via reputation. Player company gets layered rewards (premium prices + passive bonus + exclusive charters).
5. **Lightweight population/food loop** that ties world population to per-capita demand. Food deficits shrink populations and create import opportunities; events can flip self-sufficient worlds into deficit.
6. **Some goods earn more when imported** (e.g. luxury) — supported via a category-level import multiplier in pricing.

## Non-goals

- Specialized empire archetypes beyond `balanced` (tech-heavy, agrarian, frontier-focused). Hooks are in place; templates ship in a future plan.
- Internal empire politics (factions, coups, civil wars).
- Worker/laborer migration between worlds.
- Production chains deeper than the existing single-input boost (no Anno/Vic3-style multi-stage chains).
- New ship hulls or cargo-bay variants for specials — they ride existing hulls.
- Performance optimization of the market tick at Epic scale (flagged as a follow-up; not a blocker).

## Architectural approach

**Approach C — Layered pipeline with reconciliation pass.**

Generate everything organically (spiral skeleton → empire territories → systems → world types/biomes by orbital zone), then run a single post-pass that reassigns _biomes_ on existing worlds to satisfy the balanced-archetype rule. No re-rolls; deterministic from a seed. The reconciliation pass is also the natural seam for future non-balanced empire templates.

---

## 1. Goods model

### Cargo types — unchanged

The existing 7 cargo types remain: `Passengers`, `RawMaterials`, `Food`, `Technology`, `Luxury`, `Hazmat`, `Medical`. They drive ship hold types, contracts, market UI, and the existing 198-test suite. Replacing them is high churn for marginal gain.

### New: good categories

Categorize the 7 types so we can apply category-wide pricing rules without expanding the type set:

| Category  | Members                     | Pricing rule                                              |
| --------- | --------------------------- | --------------------------------------------------------- |
| Bulk      | RawMaterials, Food          | Standard supply/demand only                               |
| Strategic | Technology, Hazmat, Medical | Standard supply/demand + event swings                     |
| Premium   | Luxury, Passengers          | **+25% import multiplier** when crossing an empire border |

### New: special-resource cargo as variants of parent types

Specials are unique named cargoes that **share the parent type's hold/ship slot**. A Heavy Freighter rated for Luxury can carry Singing Crystals — no new ship hulls.

**The 7 specials (one per cargo type that supports it; passenger and hazmat included):**

| Parent       | Special id            | Working name             | Owner-side flavor              | Active-route bonus                      |
| ------------ | --------------------- | ------------------------ | ------------------------------ | --------------------------------------- |
| Food         | `food_genesis`        | Genesis Produce          | Bio-engineered super-crops     | +5% pop growth on all worlds you serve  |
| RawMaterials | `raw_adamantine`      | Adamantine Lode          | Hyper-dense alloy ore          | -10% ship hull/refit cost               |
| Technology   | `tech_jokaero`        | Jokaero Artifacts        | Sapient artisan workshop world | +1 cargo capacity on all freighters     |
| Luxury       | `lux_pleasure_garden` | Pleasure Garden Vintages | Legendary vintages             | +15% reputation gain across all empires |
| Hazmat       | `hzm_antimatter_tap`  | Antimatter Tap           | Stable antimatter well         | -10% fleet fuel cost                    |
| Medical      | `med_panacea`         | Panacea Bloom            | Wonder-drug source             | -25% turns lost to crew/event damage    |
| Passengers   | `pax_pilgrimage`      | Pilgrimage Spire         | Galactic cultural capital      | +20% passenger contract payouts         |

Pricing rules for specials:

- Base price = parent type base × **2.5**.
- **Ignores saturation** (always lucrative).
- Still subject to event modifiers (a war between you and the owner can spike or freeze the price).

Reward layers (all three stack):

1. **Premium prices** when carrying — applied automatically by `PriceCalculator` for `cargo.specialId != null`.
2. **Passive company bonus** while you hold an _active_ exclusive supply route from the special's home world. Lost the moment the route is severed (war, embargo, last carrier ship destroyed). Defending the route becomes a goal.
3. **Reputation-gated charters** — the owner empire only lists special-cargo charters once your reputation with them ≥ Trusted (existing tier).

---

## 2. World model + lightweight pop/food loop

### Planet data model

```ts
interface Planet {
  // existing fields kept (id, name, type, planetClass, orbital params, …)
  type: PlanetType; // existing 7
  biome: PlanetBiome; // NEW — ~3 per type, ~21 total
  productionTags: GoodTag[]; // NEW — actually-produced goods (subset of biome's pool)
  consumptionTags: GoodTag[]; // NEW — actually-demanded goods
  productionScale: number; // NEW — 0.4–1.8 multiplier on output
  population: number; // EXISTING field, now LIVE — drives demand
  populationCap: number; // NEW — soft cap from biome × type × size
  specialResource?: SpecialId; // NEW — set on the 7 special worlds, undefined elsewhere
}
```

`PLANET_CARGO_PROFILES` (the static type → produces/demands table in `constants.ts:587`) is **deleted**. Production and consumption are now derived from biome + tags at generation time and stored on each world.

### Biomes — illustrative table (full table in `src/data/biomes.ts`)

| Type          | Biome            | Produces               | Consumes                   | Zone weight  |
| ------------- | ---------------- | ---------------------- | -------------------------- | ------------ |
| Agricultural  | breadbasket      | food (high)            | tech, luxury               | middle/outer |
| Agricultural  | subsistence      | food (low)             | medical                    | outer        |
| Agricultural  | aquaculture      | food, medical          | rawMaterials               | middle       |
| Mining        | core-extraction  | rawMaterials (high)    | food, medical              | inner/middle |
| Mining        | gas-giant-skim   | rawMaterials, hazmat   | tech, food                 | outer        |
| Mining        | asteroid-belt    | rawMaterials           | food, passengers           | any          |
| TechWorld     | research-cluster | technology             | food, passengers, luxury   | inner/middle |
| TechWorld     | data-haven       | technology, passengers | medical                    | inner        |
| TechWorld     | forge-academy    | technology             | rawMaterials, hazmat       | middle       |
| Manufacturing | heavy-industry   | medical, hazmat        | rawMaterials, food         | middle       |
| Manufacturing | precision-fab    | medical                | tech, rawMaterials         | inner        |
| Manufacturing | shipyards        | (rawMaterials sink)    | rawMaterials, hazmat, tech | inner        |
| LuxuryWorld   | resort           | luxury                 | food, medical, passengers  | any          |
| LuxuryWorld   | artisan-guild    | luxury, technology     | rawMaterials, food         | inner        |
| LuxuryWorld   | spice-jungle     | luxury, medical        | tech, hazmat               | outer        |
| CoreWorld     | capital          | passengers             | all (heavy demand)         | inner        |
| CoreWorld     | metropolitan     | passengers, medical    | food, luxury, tech         | inner/middle |
| CoreWorld     | admin-hub        | passengers             | luxury, medical            | inner        |
| Frontier      | colony           | (variable)             | food, medical, tech        | outer        |
| Frontier      | outpost          | rawMaterials (low)     | food, medical              | outer        |
| Frontier      | refuge           | (none)                 | food, medical, passengers  | outer        |

Frontier biomes are the preferred reassignment targets in the reconciliation pass.

### Per-capita demand & food loop

```text
demand[good]      = population × perCapita[good] × biomeDemandMultiplier[good]
production[good]  = base[type, biome] × productionScale × industryInputBoost
balance[good]     = production - demand
```

**Per-capita defaults** (initial values; will tune):

| Good         | per-capita | notes                                                 |
| ------------ | ---------- | ----------------------------------------------------- |
| food         | 1.00       | every population unit eats                            |
| medical      | 0.10       | basic healthcare                                      |
| luxury       | 0.20       | scaled up for CoreWorld/LuxuryWorld biomes            |
| passengers   | 0.05       | population-driven travel                              |
| tech         | n/a        | industrial input only — set by biome consumption tags |
| rawMaterials | n/a        | industrial input only                                 |
| hazmat       | n/a        | industrial input only                                 |

**Population dynamics:**

- food deficit ≥ 3 turns → pop shrinks 2%/turn until the deficit closes.
- food surplus ≥ 5 turns AND medical demand met → pop grows 1%/turn up to `populationCap`.
- A `Famine` event (existing event system) can flip a self-sufficient world into deficit → temporarily lucrative food imports, satisfying the "only profitable when an empire loses food source" goal.

### Pricing extensions

`PriceCalculator` gains two multipliers (composed with existing supply/demand/saturation/event):

1. **`importMultiplier`** — Premium-category goods (Luxury, Passengers) sold across an empire border earn ×1.25 base.
2. **`specialPremium`** — special-resource cargoes earn ×2.5 base everywhere and ignore saturation.

Both are pure additions; existing multipliers are unchanged.

---

## 3. Galaxy generation

### Size tiers (replaces preset numbers; tier names kept)

| Tier     | Systems | Empires | Avg systems/empire | Planets total (~2.0/system) |
| -------- | ------: | ------: | -----------------: | --------------------------: |
| Quick    |    ~300 |      11 |                ~27 |                        ~600 |
| Standard |    ~450 |      12 |                ~37 |                        ~900 |
| Epic     |    ~600 |      14 |                ~43 |                       ~1200 |

Performance is targeted at the Quick tier first (~300 systems). Standard (~450) is the comfort goal; Epic (~600) is supported but not perf-tuned in this initiative; a separate perf follow-up is flagged.

### Spiral layout — two arms

Replace the current "sector centers + bridge systems" with a continuous two-arm logarithmic spiral:

1. Generate `systemCount × 1.4` candidate points along two arms (existing `SPIRAL_ARMS = 2`, sweep 1.8π) with radial jitter.
2. Cull candidates Poisson-disk-style until we hit `systemCount`.
3. Run **k-means** with `k = empireCount` to cluster candidates into territories. Each cluster becomes an empire region — irregular contiguous shapes that follow the arm.
4. Empire centers = cluster centroids; borders = Voronoi cells around centroids (consumed by `EmpireBorderManager`).
5. Hyperlanes: existing MST-first + density-fill, but with a **tangential-along-arm bias** scored higher than radial — produces visible "highway" routes along each arm.

### Empire archetype: `balanced` (MVP)

A balanced empire MUST contain at least one producer for each of the **5 required cargo types**: food, rawMaterials, technology, medical (manufacturing-derived), luxury. Passengers fall out of any populated world (not enforced). Hazmat is bonus and not enforced. This "5 required, 2 optional" rule keeps empires recognizably balanced without forcing every empire to be identical.

### Reconciliation pass

After systems and worlds are generated:

```text
for each empire:
  coverage = computeProductionCoverage(empire)
  missing  = REQUIRED_TYPES - coverage   // {food, raw, tech, medical, luxury}
  for each missing good, in priority order:
    candidate = pickReassignmentTarget(empire, missing)
    // prefers: largest unspecialized world; type compatible with biome
    reassign world's biome to one that produces `missing`
    update productionTags / consumptionTags
  // assert coverage now contains all 5 required types
```

Key rules:

- Reassignment changes **biome only** (not type), so visuals/orbital placement stay correct.
- Frontier worlds are preferred reassignment targets (neutral-purpose).
- A hard fail logs a warning and falls back to a synthetic `frontier-colony-{good}` biome — generation never crashes.

### Special-resource placement (after reconciliation)

1. Pick 7 distinct empires weighted by territory size (bigger = more likely).
2. In each chosen empire, pick a world matching the special's parent type (Genesis Produce → Agricultural, Jokaero → TechWorld, etc.).
3. Stamp `specialResource: 'food_genesis'` (etc.) on the world; bump its `productionScale`; add the matching tag to the empire's owned-specials list.
4. If a good type has no empire with the right parent type (rare after reconciliation), the corresponding special is omitted with a generation log. Galaxies can have 5–7 specials, not always exactly 7.

---

## 4. File-level architecture

### New files

| Path                                         | Purpose                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/data/goodCategories.ts`                 | `GoodCategory` union, `CARGO_TO_CATEGORY` map, import-multiplier rules.                                      |
| `src/data/specialResources.ts`               | All 7 special definitions: id, parent type, base-price multiplier, owner-side bonus spec, charter rules.     |
| `src/data/biomes.ts`                         | The ~21 biome definitions: produces / consumes tags, demand multipliers, zone weights.                       |
| `src/game/economy/PopulationLoop.ts`         | Per-world food-balance tick, growth/shrink, cap math. Pure functions for testability.                        |
| `src/game/economy/CompanyBonusCalculator.ts` | Resolves active-route bonuses from owned specials. Reads route + market state, emits a `CompanyBonusBundle`. |
| `src/generation/SpiralPlacer.ts`             | Poisson-disk along 2 arms + k-means clustering → returns `{ systems[], empires[], borders[] }`.              |
| `src/generation/EmpireReconciler.ts`         | `reconcileEmpireProduction(empire, worlds)` pass.                                                            |
| `src/generation/SpecialPlacer.ts`            | Post-reconciliation special-resource placement.                                                              |

### Modified files (notable)

| File                                       | Change                                                                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                        | Add `PlanetBiome`, `GoodCategory`, `GoodTag`, `SpecialId`. Extend `Empire` with `archetype` + `ownedSpecials`. Extend `Planet` with `biome`, `productionTags`, `consumptionTags`, `productionScale`, `specialResource`. |
| `src/data/constants.ts`                    | **Delete** `PLANET_CARGO_PROFILES` and `PLANET_INDUSTRY_INPUT` (subsumed by biome tags). Keep `BASE_CARGO_PRICES`. Add `PER_CAPITA_DEMAND` and tier-table updates for size presets.                                     |
| `src/generation/GalaxyGenerator.ts`        | Replace empire placement with `SpiralPlacer`. Call `EmpireReconciler` then `SpecialPlacer`. Drive sizes from new tier table.                                                                                            |
| `src/generation/MarketInitializer.ts`      | Seed markets from `productionTags` / `consumptionTags` / `population` instead of static profile lookup.                                                                                                                 |
| `src/game/economy/MarketUpdater.ts`        | Read per-capita demand. The existing industry-input boost becomes a generic "world's consumption tags satisfied" boost.                                                                                                 |
| `src/game/economy/PriceCalculator.ts`      | Add `importMultiplier` (Premium across borders) and `specialPremium`.                                                                                                                                                   |
| `src/game/economy/IndustryChain.ts`        | Adapt: `getIndustryInput()` resolves from tags, not the deleted constant.                                                                                                                                               |
| `src/game/empire/EmpirePolicyGenerator.ts` | Read producer/consumer info from worlds rather than the type table.                                                                                                                                                     |
| `src/game/empire/EmpireBorderManager.ts`   | Consume Voronoi borders from `SpiralPlacer` instead of computing from sector centers. Keep public surface (`borderPolygons[]`) so renderers don't change.                                                               |
| `src/game/turn/*` (turn tick)              | Call `PopulationLoop.tick()` once per turn after market update. Wire `CompanyBonusCalculator` so its results feed the cost calculations downstream.                                                                     |
| `src/game/SaveManager.ts`                  | Bump save version. Reject older saves with a friendly modal.                                                                                                                                                            |
| `src/game/calculateGameSize.ts`            | Update to new tier table.                                                                                                                                                                                               |
| `src/scenes/galaxy2d/GalaxyView2D.ts`      | Render Voronoi borders if exposed. No structural change beyond reading new border source.                                                                                                                               |
| `src/scenes/galaxy2d/Background2D.ts`      | If existing arm visualization assumes sector-centers, switch to spiral skeleton points.                                                                                                                                 |

### Test strategy

- **Unit tests**
  - `biomes.test.ts` — biome → produces/consumes resolution, zone weighting.
  - `EmpireReconciler.test.ts` — every balanced empire ends with ≥5 producer types; reassignment terminates; respects priority.
  - `SpiralPlacer.test.ts` — deterministic output for fixed seed; cluster count matches empire count; no orphan systems.
  - `SpecialPlacer.test.ts` — exactly N specials placed, all on correct parent type; idempotent under same seed.
  - `PopulationLoop.test.ts` — equilibrium under matched supply/demand; deficit shrinks pop after 3 turns; surplus grows after 5; cap respected.
  - `CompanyBonusCalculator.test.ts` — bonuses only active when route exists; correct stacking when player owns multiple specials.
  - `PriceCalculator.test.ts` (extend) — import multiplier across borders; special premium ignores saturation.
- **Property/fuzz tests**
  - 100-galaxy fuzz: generation never throws; reconciliation always converges in ≤ N passes; specials are valid; no NaN populations after 50 turns of tick.
- **Existing tests**
  - The current 198 tests will need updates where they assert against `PLANET_CARGO_PROFILES`. Expected and called out in the implementation plan.

---

## 5. Implementation todo (high-level — input to writing-plans)

This isn't the implementation plan itself, but it's the work-shaped breakdown of the design above so the plan can sequence it.

### Phase A — Types and data foundation

- [ ] Add new types in `types.ts` (`PlanetBiome`, `GoodCategory`, `GoodTag`, `SpecialId`, extend `Empire` and `Planet`).
- [ ] Add `goodCategories.ts` with the Bulk/Strategic/Premium mapping.
- [ ] Add `biomes.ts` with the ~21 biome definitions.
- [ ] Add `specialResources.ts` with all 7 specials and their bonus specs.
- [ ] Add `PER_CAPITA_DEMAND` and updated size-tier table to `constants.ts`. Delete `PLANET_CARGO_PROFILES` and `PLANET_INDUSTRY_INPUT`.
- [ ] Bump save version in `SaveManager.ts`; reject older saves.

### Phase B — Generation pipeline

- [ ] Implement `SpiralPlacer.ts` (Poisson-disk + k-means + Voronoi borders) with seeded determinism. Unit tests.
- [ ] Implement `EmpireReconciler.ts` and unit tests for required-coverage convergence.
- [ ] Implement `SpecialPlacer.ts` and unit tests.
- [ ] Refactor `GalaxyGenerator.ts` to use the new pipeline (spiral → empires → systems → worlds → reconcile → specials).
- [ ] Update `EmpireBorderManager.ts` to consume Voronoi borders from `SpiralPlacer`.

### Phase C — Economy wiring

- [ ] Refactor `MarketInitializer.ts` to read from biome tags + population.
- [ ] Refactor `MarketUpdater.ts` to use per-capita demand and tag-driven industry boost.
- [ ] Extend `PriceCalculator.ts` with `importMultiplier` and `specialPremium`.
- [ ] Implement `PopulationLoop.ts` and wire into the turn tick.
- [ ] Implement `CompanyBonusCalculator.ts` and wire its results into fleet/cost calculations.
- [ ] Update `EmpirePolicyGenerator.ts` to read producer/consumer info from worlds, not the deleted profile table.
- [ ] Update `IndustryChain.ts` to resolve inputs from tags.

### Phase D — Charter and reputation gating for specials

- [ ] Extend the charter system so special-cargo charters appear from the owner empire when reputation ≥ Trusted.
- [ ] Surface ownership of specials in the empire diplomacy UI.

### Phase E — Tests, fuzz, and cleanup

- [ ] Update the existing tests for the new produce/consume model.
- [ ] Add property/fuzz tests for generation determinism and population stability.
- [ ] Manual playthrough at Quick / Standard / Epic to confirm no crashes; capture screenshots for the PR.
- [ ] Flag perf follow-up if Standard tick time regresses meaningfully (~20%).

---

## 6. Open questions / risks

- **Standard-tier perf headroom.** The market tick currently iterates per planet; 600 planets × per-capita arithmetic may add measurable cost. Mitigation: profile during Phase C; if the tick exceeds budget, hoist demand math into a pre-computed table per population step rather than per planet per tick.
- **Reconciliation aesthetics.** If reconciliation rewrites too many biomes in a small empire, the empire feels "patched". Mitigation: prefer Frontier first; cap reassignments per empire.
- **Specials in tiny galaxies.** Quick tier (~150 systems, 8 empires, ~16 systems each) may fail to host all 7 specials with right parent types. Acceptable: galaxies can have 5–7; UI must handle "this special doesn't exist this game" gracefully.
- **k-means determinism.** Seeded RNG must drive initial centroids; verify cross-platform numerical stability in tests.
