# Research Economy Redesign

**Date:** 2026-05-18
**Status:** Design — pending implementation plan

## Goal

Turn research from a passive background drip into an active, identity-defining
system that scales with the player's growth and forces meaningful specialization
mid-to-late game.

The current model accumulates RP at 1–3 per turn from a passive base tick plus
"have routes touching techworlds." That feels invisible, doesn't reward player
decisions, and never punishes a "buy everything from every branch" strategy.
With the recent tech-tree UI expansion (53 nodes across 6 branches), the
shallow RP economy is a bottleneck on the system's perceived depth.

The redesign keeps the tech tree shape intact and overhauls the **economy**
underneath it: where RP comes from, how it scales, and what gates deep
specialization.

## Three RP sources, layered

### 1. Base tick (minimal)

- **+1 RP/turn**, unchanged from current `BASE_RP_PER_TURN`.
- Exists so a player who builds nothing still inches forward.
- Not the primary source; intentionally token.

### 2. Delivery RP (per-turn aggregated)

The main player-driven source. Every active route contributes RP each turn,
scaled by what it delivers and where.

```text
routeRP = baseRP × cargoMult × distanceMult × empireMult × tripsPerTurn
```

| Variable       | Values                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `baseRP`       | 0.15                                                                                              |
| `cargoMult`    | rocks/food = 0.7 · manufactured = 1.0 · luxury = 1.5 · tech = 2.0                                 |
| `distanceMult` | `clamp(0.5, 2.0, distance / 10)` using `calculateDistance(origin, destination)`                   |
| `empireMult`   | 1.0 if origin & destination share the same `empireId` · 1.5 otherwise (uses `getEmpireForPlanet`) |
| `tripsPerTurn` | from the existing route trips computation                                                         |

> `distanceMult` and `empireMult` are intentionally separable. `getRouteScope`
> in the existing code coarsely bins routes as `System / Empire / Galactic`
> but a short inter-empire hop and a long intra-empire haul deserve
> different RP treatment — so we use raw distance for `distanceMult` and
> empire identity for `empireMult` instead of the coarser scope enum.

**Aggregation:** sum across all non-paused active routes once per turn, then
add to the running RP total. Per-trip RP is _not_ tracked (no per-step UI
updates during sim playback).

**Floor:** 0. A route delivering nothing this turn (held by saturation, empire
embargo, etc.) contributes 0.

**Example economy at scale:**

| Game stage | Typical routes                                | Delivery RP/turn |
| ---------- | --------------------------------------------- | ---------------- |
| Year 1     | 4× local/domestic basic cargo                 | ~1–2             |
| Year 3     | 8× mixed, 2 long-haul, 1 inter-empire         | ~5–6             |
| Year 5+    | 12+ routes, several galactic + foreign luxury | ~15–20           |

### 3. R&D infrastructure tiers

Replaces the single existing `ResearchLab` hub room with a three-tier
progression. All are buildable rooms in hub stations.

| Tier | Room name             | RP/turn | Build cost | Upkeep | Limit per hub | Gate                                                  |
| ---- | --------------------- | ------- | ---------- | ------ | ------------- | ----------------------------------------------------- |
| 1    | Research Lab          | +1      | §15k       | §1.5k  | 3             | none                                                  |
| 2    | R&D Center            | +3      | §50k       | §5k    | 2             | requires Research Lab in same hub + 1 commitment held |
| 3    | Theoretical Institute | +6      | §150k      | §15k   | 1             | requires R&D Center in same hub + 2 commitments held  |

> `limit` is per-hub-station (matches existing `HUB_ROOM_DEFINITIONS` semantics).
> A multi-hub player can therefore stack: e.g. two hubs each with 3 Labs + 2
> Centers + 1 Institute = +30 RP/turn from infra at the extreme upper bound.
> That extreme requires both commitments held AND ~§430k invested PER HUB —
> a deliberate runaway-rich payoff, not an early-mid balance concern.

**Tech-prereq vs cash-prereq:** the existing Research Lab requires
`intelligence_2` tech. In the new system, T1 Research Lab is **gated only by
cash** (no tech prereq), making it accessible day one. T2/T3 are gated by
**prior tier built** AND **branch commitments held** (see below).

**RP from infrastructure is added at turn end alongside delivery RP and the
base tick.**

## Tier Walls + Branch Commitment

The new gating model for deep specialization.

### Universal access (T1 + T2)

- T1 and T2 nodes in **every** branch remain accessible to any player.
- Costs unchanged.
- Includes existing T2 "★ Mastery" cap nodes.

This keeps the early game wide and exploratory — players can dabble across all
6 branches without committing.

### Branch Commitment gate (T3 + T4)

- T3 and T4 nodes in a branch are **locked** until the player commits to that
  branch.
- A branch can only be committed to **after its T2 Mastery node is researched**
  (the existing `*_cap` / `*_mastery` nodes).
- Commitments are purchased with cash at the tech tree screen.

### Commitment mechanics

| Property            | Value                                             |
| ------------------- | ------------------------------------------------- |
| Trigger             | Player-initiated cash spend in tech tree UI       |
| Hard cap            | 3 commitments per game                            |
| Cost (1st → 3rd)    | §50,000 → §150,000 → §400,000                     |
| Reversibility       | Permanent — no swaps, no refunds                  |
| Branch prerequisite | T2 Mastery node of that branch must be researched |
| Effect              | Unlocks T3+ research nodes in that branch         |

### Tech cost rebalance

- **T1 and T2 costs: unchanged.** Preserves early-game tempo.
- **T3 and T4 costs: `newCost = roundUpToFive(existingCost × 2.0)`.**
  Applied as a static data update in `TECH_GRAPH` (no runtime multiplication).
  Existing 28–60 RP nodes become 60–120 RP. The roundUpToFive keeps numbers
  readable on the UI cards (no `57 RP`, just `60`).

## UI surfaces

This work touches the tech tree UI but the redesign there has already shipped.
Specific additions needed on top of the existing right-rail layout:

1. **Commitment indicator** — somewhere persistent in the tech tree scene,
   show "Commitments: 1 / 3" with a list of committed branch names.
2. **Lock state for T3/T4 nodes in uncommitted branches** — render as
   `locked` (existing visual) with a tooltip explaining the commit gate.
3. **Commit button** — appears in the `TechDetailCard` when the selected
   tech is a T3/T4 node in an uncommitted branch AND the branch's T2 Mastery
   is researched AND the player can afford the next commitment tier.
   Label: `Commit to <Branch> — §<cost>`. Disabled with reason text if any
   precondition fails.
4. **Bonuses tab** updates — show RP/turn breakdown (base + delivery + infra)
   so the player can see where their RP comes from.

## What this fixes

| Original pain                      | Fix                                                             |
| ---------------------------------- | --------------------------------------------------------------- |
| Drippy early game                  | Delivery RP scales with cargo/distance/empire decisions         |
| Passive RP                         | ~70% of RP at scale comes from active player decisions          |
| Wrong shape (everything reachable) | 3-commitment cap means T3+ of half the tree is off-limits       |
| No specialization choice           | Cash-spend commitment is the central mid-game identity decision |
| Late-game blast through everything | T3/T4 cost doubling + commitment cap rein this in               |

## Out of scope

- **Decommit / swap mechanic.** Permanent commits in v1 to keep system simple.
  Could revisit if playtesting shows it's punishing.
- **Per-branch RP pools.** Single global RP currency stays; commitments only
  gate _spending_, not earning.
- **AI rivals using the same system.** Apply if trivially compatible; defer
  the full AI commit-AI if it requires nontrivial AI tuning.
- **New tech tree nodes or shape changes.** Cost numbers change; node graph
  does not.
- **Save migration.** Per project alpha rules, bump `SAVE_VERSION` and
  reject old saves with the existing friendly modal.

## Open questions

None — all design dimensions confirmed during brainstorming:

- Three layered RP sources (base + delivery + infra) ✓
- Layered delivery formula with cargo × distance × empire ✓
- Per-turn aggregation, not per-trip ✓
- Three-tier infrastructure rooms ✓
- Tier walls (T1/T2 universal, T3/T4 commit-gated) ✓
- Cash-spend commitment with 3-cap, scaling cost ✓
- Permanent commits ✓
- T3/T4 cost roughly doubled ✓
