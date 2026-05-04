# Industry Chain Economy — Design Spec

**Date:** 2026-05-03
**Status:** Approved (brainstorm), pending implementation plan
**Goal:** Replace today's diffuse per-planet supply/demand with a Transport
Fever–style production chain. Make planet _type_ and system _layout_ the
primary drivers of route value, so the player's core game-loop activity is
discovering and connecting industrial graphs across the galaxy.

---

## 1. Problem

Today every planet produces 1–2 cargos and demands 2–3 (see
[constants.ts](../../../src/data/constants.ts) `PLANET_CARGO_PROFILES`).
Planet specialization is weak: most worlds are reasonable destinations for
most cargos. The result is that route-building is dominated by _price math_
(which lane has the best margin right now?), not _topology_ (which systems
have the right combination of producers and consumers?).

Goals for the redesign:

1. Producer worlds should be _narrow_. One planet, one export.
2. Inter-planet relationships should matter — connecting a Mining world to
   a Tech world should feel like an upgrade, not just a price tweak.
3. The system (not the planet) should become the unit of trade. Planning a
   route should require thinking about which _systems_ contain which
   _industries_.
4. Keep the change shippable as an MVP — no buffers, no decay timers, no
   per-volume balancing on day one.

---

## 2. Design Decisions

These were settled during brainstorming:

- **Connection-based industry boost** (not buffer/decay, not volume-matched).
  A producer's input is either "active" or "inactive" each turn, based on
  whether _any_ route is currently delivering the input cargo to the
  producer's _system_.
- **5 producer types + 2 consumer types**, replacing the current 7-type
  roster. Resort and Research are dropped from this iteration.
- **One route per cargo type per system pair**. Between System X and
  System Y, the player may operate at most one Food route, one Tech
  route, etc. AI companies have the same constraint applied independently.
- **Single-input chains** (each producer has at most one input cargo).
  Multi-input chains rejected as too punishing under the slot rule.
- **No save migration**. The version bump invalidates old saves; players
  start a new game on this version.

---

## 3. Planet Roster

| Type              | Produces                    | Demands (cargo, base volume)                                                             | Industry Input |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| **Agricultural**  | Food                        | —                                                                                        | —              |
| **Mining**        | Raw Materials, Hazmat (low) | —                                                                                        | —              |
| **Tech World**    | Technology                  | —                                                                                        | Raw Materials  |
| **Manufacturing** | Medical                     | —                                                                                        | Passengers     |
| **Luxury World**  | Luxury                      | —                                                                                        | Food           |
| **Core World**    | —                           | Food (high), Tech (high), Luxury (high), Medical (high), Passengers (high), Hazmat (low) | —              |
| **Frontier**      | —                           | Food (low), Medical (low), Tech (low)                                                    | —              |

Notes:

- Producer worlds _do not_ consume their own input as a market good.
  Concretely: in `PLANET_CARGO_PROFILES`, the producer's input cargo is
  _not_ added to `demands`, and at runtime the producer's market entry
  for that cargo has zero (or near-zero) `baseDemand`. The input acts as
  a catalyst — its arrival in-system flips a flag, but no buy-and-resell
  market exists for it at the producer planet.
- Hazmat remains a Mining byproduct; only Core demands it (low volume,
  high price). It is the niche premium cargo.
- Passengers earn an industrial role (Manufacturing input) on top of
  their existing role (Core demand).

---

## 4. Industry Chain Mechanic

### 4.1 Activation rule

At the start of each turn's market update, for each producer planet `P`:

```text
P.industryInput is the cargo type required to boost P (e.g. Raw for Tech World).
P's input is "active" iff there exists any route R in state.routes such that:
  - R is not paused (R.paused !== true)
  - R.cargoType === P.industryInput
  - R.destinationPlanet.systemId === P.systemId
```

The route's origin doesn't matter; ownership doesn't matter (player and
AI routes both count). Feeding the _system_ is enough — the route does not
need to terminate at the producer planet itself. This rewards system
planning: a single Raw delivery to any planet in a system with multiple
Tech worlds boosts all of them.

### 4.2 Effect on supply

When the input is active, `baseSupply` for the producer's _output_ cargo
is multiplied by `INDUSTRY_INPUT_SUPPLY_MULTIPLIER` (initial value: **2.0**).

Price is unchanged in formula
([PriceCalculator.ts](../../../src/game/economy/PriceCalculator.ts)). The
existing `demandMultiplier = demand / supply, clamped [0.5, 3.0]` math
naturally absorbs the boost: doubled supply pushes prices toward the floor
unless demand keeps up. The win for the chained producer is **stable
prices under volume**, not higher prices per unit.

### 4.3 Saturation interaction

Active-input producers also get a saturation decay bonus: their output
cargo's saturation decays at `INDUSTRY_INPUT_DECAY_MULTIPLIER × SATURATION_DECAY_RATE`
(initial value: 1.5×). Flooding a chained-up Tech world clears faster than
flooding an unchained one — the factory keeps producing.

### 4.4 Why this is the real chain reward

A chained producer offers:

- Higher _sustainable_ throughput (supply doesn't crash from saturation as
  fast).
- Stable, predictable prices for long-term contracts.
- A "factory feel" on the map — chained producers visually distinct from
  unchained ones (UX requirement, see §6).

An unchained producer offers:

- Burst margin: the first ship to a low-supply, high-demand producer
  catches a price spike before saturation kicks in.

This creates a real choice: chain it for sustained profit, or arbitrage
the unchained version for a one-shot.

---

## 5. Route Slot Rule

### 5.1 The constraint

> Between any two systems X and Y, the player may operate at most one
> route per cargo type. AI companies have the same constraint applied
> independently per-AI. Intra-system routes use `(systemId, systemId)` as
> the pair.

### 5.2 Enforcement

- **Validation point:** `RouteManager.canCreateRoute(originPlanetId, destPlanetId, cargoType, ownerId)`
  returns a discriminated union `{ ok: true } | { ok: false, reason: "duplicateCargoOnSystemPair", existingRouteId }`.
- **UI surface:** Route Builder shows "blocked: System X→Y already has a
  Food route (RouteName)" with a link to the existing route. Player can
  choose to delete the existing route to free the slot.
- **AI behavior:** AI route-selection logic must filter candidates against
  the same predicate before scoring.

### 5.3 Interaction with existing slot pools

The existing System/Empire/Galactic slot pools (granted by contracts,
modified by hub bonuses) continue to apply. The slot pool gates _how many
total_ routes the player can run; the new rule gates _which routes_
between any given system pair. Both constraints must pass.

---

## 6. UX Surface

Minimum visible UX changes:

- **Route Builder** must surface the duplicate-cargo block with a clear
  message and a link to the conflicting route.
- **Planet info card** for producer worlds must display:
  - The required input cargo (e.g. "Industry input: Raw Materials")
  - Current activation status ("✓ Active — supplied by _Sol → Tau_ (Food)" or "✗ Inactive")
- **Galaxy / system map** should visually distinguish chained vs unchained
  producers (e.g. a small icon or glow). Exact visual TBD during
  implementation.

Out of scope for MVP UX:

- Animated chain visualization on the galaxy map.
- Tutorial / onboarding for the new mechanic.
- Adviser hints about chain opportunities.

These can land in follow-up work once the mechanic is playtested.

---

## 7. Galaxy Generation

Producer distribution rules (initial values, tunable):

- Every system contains at least one planet.
- Every system has a 70% chance of containing at least one _producer_
  planet. The remaining 30% of systems are pure consumer/frontier.
- Producer types are weighted: Agricultural and Mining slightly more
  common than Tech, Manufacturing, and Luxury (the three "tier-2"
  industries that need inputs).
- Core Worlds are scarce: target ~1 Core per 3 systems. Cores cluster
  toward the galactic center / capital empires.
- Frontier worlds fill the rest. Every system without a Core has at least
  one Frontier so early-game survival routes always exist.

Galaxy generation lives in `src/game/galaxy/GalaxyGenerator.ts` (or
wherever planets are currently seeded — implementation plan will confirm).

---

## 8. Implementation Footprint

### Touched files (estimated)

- [src/data/types.ts](../../../src/data/types.ts) — replace `PlanetType`
  union; add `Planet.industryInput?: CargoType` (optional only because
  consumer types lack it).
- [src/data/constants.ts](../../../src/data/constants.ts) — replace
  `PLANET_CARGO_PROFILES`, `PLANET_PASSENGER_VOLUME`; add new constants
  `PLANET_INDUSTRY_INPUT`, `INDUSTRY_INPUT_SUPPLY_MULTIPLIER`,
  `INDUSTRY_INPUT_DECAY_MULTIPLIER`.
- [src/game/economy/MarketUpdater.ts](../../../src/game/economy/MarketUpdater.ts)
  — read industry chain status during the per-turn market refresh; apply
  supply multiplier and decay multiplier when active.
- [src/game/economy/PriceCalculator.ts](../../../src/game/economy/PriceCalculator.ts)
  — unchanged (the boost lives in supply, not in the formula).
- [src/game/routes/RouteManager.ts](../../../src/game/routes/RouteManager.ts)
  — add `canCreateRoute()` guard for the duplicate-cargo-per-system-pair
  rule; integrate into existing creation flow.
- Galaxy generator — new producer/consumer distribution rules; planet
  count per system unchanged.
- AI route selection — filter candidates against the new slot rule.
- UI — Route Builder block message, planet info card chain status.

### New module

- `src/game/economy/IndustryChain.ts` — pure functions:
  - `isInputActive(planetId: string, state: GameState): boolean`
  - `getActiveProducers(state: GameState): Set<string>`
  - `getInputCargo(planetType: PlanetType): CargoType | null`

  Keeps the chain-evaluation logic out of MarketUpdater. Pure, easy to
  test in isolation, importable from UI for the planet info card.

### Tests

- `IndustryChain.test.ts` — activation rule, system-vs-planet feeding,
  multiple producers in one system.
- `MarketUpdater.test.ts` — supply multiplier applied when active, decay
  multiplier applied when active, baseline preserved when inactive.
- `RouteManager.test.ts` — duplicate-cargo block on same system pair,
  different cargos allowed, different system pairs allowed.
- `GalaxyGenerator.test.ts` (or equivalent) — producer distribution
  weighting, Core scarcity, Frontier fill.

### Not in scope

- Persisting old saves through the migration (saves invalidated; load
  failure shows a clear message).
- Resort, Research planet types (deferred).
- Multi-input chains (Section 2 decision).
- Volume-scaled chain effects (Section 2 decision).
- Tutorial / onboarding for the new mechanic.

---

## 9. Open Questions

These can be settled in the implementation plan, not blockers for spec
sign-off:

- Exact producer-type weights for galaxy generation.
- Exact demand volumes for Core (`high` placeholder) and Frontier (`low`
  placeholder).
- Visual treatment for chained-vs-unchained producers on the system map.
- Whether AI uses chain-awareness in its route scoring (ship to chained
  producers preferentially) or just respects the slot rule.

---

## 10. Success Criteria

A playtest of the new system should demonstrate:

1. Players regularly _delete and rewire_ routes mid-game to free system-pair
   slots — proof that the slot rule is creating decisions, not just
   blocking.
2. Players notice and pursue chains. ("I should run Raw to Tau Ceti before
   I buy more Tech-route ships.") If most players never realize the
   chains exist, the UX surface is too quiet.
3. Producer planets in well-connected systems are visibly more valuable
   than producer planets in dead-end systems. Topology drives strategy.
4. AI companies don't break — they should respect the slot rule, build
   chains opportunistically, and remain competitive without
   chain-awareness in v1.

If any of these fail in playtest, the tuning dials (`INDUSTRY_INPUT_SUPPLY_MULTIPLIER`,
producer distribution weights, Core scarcity) are the first things to
turn.
