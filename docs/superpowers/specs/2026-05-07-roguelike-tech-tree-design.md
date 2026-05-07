# Roguelike Tech Tree — Design Spec

**Date:** 2026-05-07  
**Branch:** feat/news-event-expansion (to be implemented on new branch)  
**Status:** Approved — ready for implementation planning

---

## Overview

Replace the current linear 5×4 tech grid with a radial, graph-based tech tree that feels like a modern roguelike skill tree (Path of Exile / Hades style). The goal is to make research a core, satisfying game loop: early unlocks are fast and cheap, deep specialization is rewarding, and your tech choices shape your company's playstyle for the entire run.

**Design goals:**

- Dopamine hit from frequent early unlocks (first 3–5 turns)
- Meaningful specialization: player commits to a company "build"
- Generalists get small buffs across the board; specialists get compounding depth rewards
- RP generation is bounded — no snowball to unlock the whole tree
- AI companies follow pre-authored tech strategies that define their galaxy-map behavior

---

## Section 1: Data Model

### `TechNode` (replaces `Technology` in `types.ts`)

```typescript
export interface TechNode {
  id: string;
  name: string;
  icon: string; // emoji
  branch: TechBranch;
  description: string;
  effects: TechEffect[];
  rpCost: number; // base cost (first purchase)
  edges: string[]; // adjacent node IDs (bidirectional)
  position: { angle: number; radius: number }; // polar layout: angle=degrees, radius=ring index
  repeatable?: boolean; // can be re-purchased after owning
  repeatCostScale?: number; // cost multiplier per repeat (default 1.5)
}
```

`tier` and `branch`-as-prerequisite are removed. Adjacency in `edges[]` is the only prerequisite.

### `TechState` changes

```typescript
export interface TechState {
  researchPoints: number; // total banked RP (grows each turn, spent on purchases)
  purchaseCount: Record<string, number>; // techId → times purchased (replaces completedTechIds)
  queue: string[]; // ordered pending unlock IDs
  currentResearchId: string | null; // always queue[0] or null (kept for backwards compat)
  researchProgress: number; // display value: Math.min(researchPoints, effectiveCost(queue[0]))
}
```

`completedTechIds` becomes a computed helper:

```typescript
export function getCompletedTechIds(tech: TechState): string[] {
  return Object.entries(tech.purchaseCount)
    .filter(([, count]) => count > 0)
    .map(([id]) => id);
}
```

### `effectiveCost(techId, techState)` helper

```typescript
export function effectiveCost(techId: string, tech: TechState): number {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return Infinity;
  const count = tech.purchaseCount[techId] ?? 0;
  const scale = node.repeatCostScale ?? 1;
  return Math.round(node.rpCost * Math.pow(scale, count));
}
```

### AI strategy

```typescript
// In constants.ts
export const AI_TECH_STRATEGIES: Record<string, string[]> = {
  aggressiveExpander: ["logistics_hub", "logistics_2a", "crisis_hub", ...],
  steadyHauler:       ["engineering_hub", "fuel_efficiency_1", "fuel_efficiency_1", ...],
  cherryPicker:       ["diplomacy_hub", "cargo_luxury_1", "diplomacy_2a", ...],
};
```

---

## Section 2: `TechGraphCanvas` Component

New file: `src/ui/TechGraphCanvas.ts`

A `Phaser.GameObjects.Container` that owns all graph rendering and input.

### Internal structure

```
TechGraphCanvas
  ├── bgHitRect     (Rectangle, alpha=0, full panel — drag target)
  ├── edgeLayer     (Container — connector lines, rendered first)
  └── nodeLayer     (Container — NodeView instances)
```

### NodeView (per node)

```
glow    Rectangle  branch color, alpha-pulsing when queued/researching
bg      Rectangle  rounded dark fill, branch-colored border
icon    Text       emoji, 20px, centered
name    Text       10px caption, below icon, word-wrapped
badge   Text       "8 RP" / "×2 12 RP" / queue position number
hitArea Rectangle  transparent, interactive, full node bounds
```

### Node visual states

| State            | bg fill               | border              | text             | badge       |
| ---------------- | --------------------- | ------------------- | ---------------- | ----------- |
| locked           | `0x0a0a1a`            | dim grey `0x333333` | grey `0x555555`  | hidden      |
| available        | dark tint `0x111128`  | branch color 60%    | white            | RP cost     |
| queued           | dark                  | branch color bright | white            | queue index |
| owned            | branch color 20% tint | branch color solid  | branch color + ✓ | hidden      |
| available-repeat | branch tint           | pulsing accent      | full color       | repeat cost |

### Pan & Zoom

- **Pan:** `bgHitRect` pointerdown/move/up — offsets container position. Clamped: center node stays within 1 ring-width of panel edge.
- **Zoom:** scene `wheel` event → scale container 0.4×–1.4×. Zoom anchors to cursor (adjusts pan offset to keep hovered point stable).
- **Center button:** small "⌖" button in corner resets pan/zoom to default (center node centered, scale 1.0).

### Connector lines

- Drawn in `edgeLayer` between node position centers for each entry in `edges[]`
- Color: branch color of target node, 30% alpha if target locked, 70% alpha otherwise
- Thickness: 1px locked, 2px if either endpoint is owned/available

### Public API

```typescript
class TechGraphCanvas extends Phaser.GameObjects.Container {
  setGraphState(state: TechGraphState): this;
  // TechGraphState = { purchaseCount, queue, isAvailable }
  onSelect: (techId: string) => void;
}
```

---

## Section 3: Scene Layout

`TechTreeScene` is significantly reshaped. `TechTreeGrid` is removed.

### Layout zones

```
┌──────────────────┬──────────────────────────────────────────┐
│  Sidebar         │  Main Panel                              │
│  PortraitPanel   │  ┌────────────────────────────────────┐  │
│                  │  │  RP: 42  •  +3/turn  •  Owned: 4   │  │
│  Selected node:  │  ├────────────────────────────────────┤  │
│  name            │  │                                    │  │
│  branch          │  │       TechGraphCanvas              │  │
│  effects         │  │       (pan + zoom)                 │  │
│  cost            │  │                                    │  │
│  status          │  ├────────────────────────────────────┤  │
│                  │  │  Queue row (72px)                  │  │
│  [Unlock 8 RP]   │  │  [🔋×2][⏱️][🔧] → drag/remove    │  │
│  or              │  └────────────────────────────────────┘  │
│  [Queue 8 RP]    │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### RP status bar (top of main panel)

Single line: `Total RP: 42  •  +3 RP/turn  •  Owned: 4 / 50`

### Queue row (bottom strip, 72px tall)

- Each queued tech: 48×48 tile — icon + name + cost
- First tile: progress bar beneath (active research)
- Drag left/right to reorder; small `✕` per tile to remove
- Empty state: faint caption `"Click an available node to research"`
- Tiles use same NodeView visual language (smaller scale)

### Sidebar detail (PortraitPanel, unchanged component)

- Default: "Select a node to view details."
- Selected: name, branch, full effects description, current cost (includes repeat multiplier), status line
- **Unlock button** (primary CTA, bottom of sidebar):
  - `"Unlock — 8 RP"` if `researchPoints >= effectiveCost` → instant
  - `"Queue — 8 RP"` if not enough RP → adds to queue
  - Disabled: locked nodes, non-repeatable owned nodes, already queued

---

## Section 4: Unlock & Queue Mechanics

### Availability rules (`isTechAvailable`)

1. Center node (`fuel_efficiency_1`): always available
2. Non-repeatable node already owned: unavailable
3. Node already in queue: unavailable
4. Cargo-pact nodes (`diplomacy_food`, `diplomacy_tech`, `diplomacy_luxury`): unavailable if any other cargo-pact node is owned (mutual exclusivity enforced here, not via edges)
5. All others: at least one neighbor (in `edges[]`) has `purchaseCount >= 1`

For repeatable nodes: available again after purchase as long as not currently in queue.

### Unlock flow (player clicks button)

```
cost = effectiveCost(techId)
if researchPoints >= cost:
    researchPoints -= cost
    purchaseCount[techId] = (purchaseCount[techId] ?? 0) + 1
    unlock neighbors (recompute available states for all nodes in edges[techId])
    process queue head with same logic (chain completions)
else:
    queue.push(techId)
```

### Turn processing (`processResearch`)

```
researchPoints += rpThisTurn
while queue.length > 0 AND researchPoints >= effectiveCost(queue[0]):
    cost = effectiveCost(queue[0])
    researchPoints -= cost
    purchaseCount[queue[0]] += 1
    unlock neighbors of queue[0]
    queue.shift()
currentResearchId = queue[0] ?? null
researchProgress = researchPoints  // progress toward queue[0] cost
```

### Queue manipulation

- **Reorder:** swap `queue[i]` and `queue[j]` — pure array mutation, no side effects
- **Remove:** splice `queue[i]` — no side effects (purchase not started)

---

## Section 5: Tech Graph — Node Catalogue

### Design principles

- **~50 nodes** total
- **`edges[]` is bidirectional** — if node A lists node B in its edges, node B must also list node A. The tables below show edges from each node's perspective; the implementation must enforce symmetry.
- **Cost curve:** center=4 RP, ring1=6–8, ring2=10–16, ring3=20–35, ring4 capstones=40–70
- **Repeatable nodes** at every ring — the dopamine loop
- **6 archetypes** (see below) — player must choose 2–3 to go deep
- **Cargo-specific nodes** on Diplomacy/Logistics sub-spokes (mutually exclusive branches)
- **Route-length nodes** on Engineering/Logistics (short-haul vs long-haul fork)

### Center node

| ID                  | Name           | Icon | Cost | Repeatable | Effect         |
| ------------------- | -------------- | ---- | ---- | ---------- | -------------- |
| `fuel_efficiency_1` | Fuel Savings I | 🔋   | 4 RP | ✓ ×1.5     | −1% fuel costs |

Edges to all 5 branch hubs.

### Branch hubs (radius 1, 6–8 RP each)

| Branch       | ID                 | Name                 | Icon | Cost | Effect                     |
| ------------ | ------------------ | -------------------- | ---- | ---- | -------------------------- |
| Logistics    | `logistics_hub`    | Efficient Scheduling | ⏱️   | 6    | +1 route slot              |
| Diplomacy    | `diplomacy_hub`    | Cultural Exchange    | 🤝   | 6    | −10% tariffs friendly      |
| Engineering  | `engineering_hub`  | Workshop             | 🔧   | 6    | −10% maintenance           |
| Intelligence | `intelligence_hub` | Market Forecasting   | 📊   | 6    | Trends shown 2 turns ahead |
| Crisis       | `crisis_hub`       | Emergency Reserves   | 🛡️   | 6    | Event costs −15%           |

### Logistics branch (route slots, trip frequency, short/long fork)

| ID                  | Name                   | Icon | Cost | Rep    | Effect                              | Edges               |
| ------------------- | ---------------------- | ---- | ---- | ------ | ----------------------------------- | ------------------- |
| `logistics_2a`      | Short Haul Specialist  | 🗺️   | 10   | —      | +1 trip/turn on routes ≤2 hops      | hub, logistics_3    |
| `logistics_2b`      | Long Haul Network      | 🌐   | 10   | —      | +15% revenue on cross-empire routes | hub, logistics_3    |
| `logistics_3`       | Regional Hub Protocols | 🏢   | 20   | —      | +1 route slot, −10% license fees    | 2a, 2b, logistics_4 |
| `logistics_trips_r` | Route Efficiency I     | ⚡   | 12   | ✓ ×1.6 | +0.5 trips/turn (repeatable)        | 2a                  |
| `logistics_4`       | Omnipresent Logistics  | 🌌   | 50   | —      | +1 route slot, +10% all revenue     | logistics_3         |
| `logistics_cap`     | ★ Logistics Mastery    | 🏆   | 65   | —      | All Logistics effects ×1.2          | logistics_4         |

### Diplomacy branch (tariffs, empire relations, cargo-type fork)

| ID                      | Name                     | Icon | Cost | Rep    | Effect                              | Edges               |
| ----------------------- | ------------------------ | ---- | ---- | ------ | ----------------------------------- | ------------------- |
| `diplomacy_2a`          | Trade Envoys             | 📜   | 10   | —      | +1 cargo type per empire pair       | hub, diplomacy_3    |
| `diplomacy_2b`          | Border Protocols         | 🛂   | 10   | —      | −15% tariffs neutral empires        | hub, diplomacy_3    |
| `diplomacy_3`           | Diplomatic Immunity      | 🏛️   | 20   | —      | Immune to 1 embargo/game            | 2a, 2b, diplomacy_4 |
| `diplomacy_food`        | Food Trade Pact          | 🌾   | 12   | —      | +8% Food cargo revenue              | 2a                  |
| `diplomacy_tech`        | Tech Export License      | 💡   | 12   | —      | +8% Technology cargo revenue        | 2a                  |
| `diplomacy_luxury`      | Luxury Broker            | 💎   | 12   | —      | +8% Luxury cargo revenue            | 2a                  |
| `diplomacy_relations_r` | Goodwill I               | 🕊️   | 10   | ✓ ×1.5 | +0.5% tariff reduction all empires  | 2b                  |
| `diplomacy_4`           | Galactic Trade Authority | 🌍   | 50   | —      | −20% tariffs hostile, +1 cargo pair | diplomacy_3         |
| `diplomacy_cap`         | ★ Diplomacy Mastery      | 🏆   | 65   | —      | All Diplomacy effects ×1.2          | diplomacy_4         |

_Note: `diplomacy_food`, `diplomacy_tech`, `diplomacy_luxury` are mutually exclusive via game logic — each owned node locks the others (not via edges, via purchase check)._

### Engineering branch (fuel, maintenance, ships, long-haul fork)

| ID                       | Name                  | Icon | Cost | Rep    | Effect                              | Edges                 |
| ------------------------ | --------------------- | ---- | ---- | ------ | ----------------------------------- | --------------------- |
| `engineering_2a`         | Fuel Injection        | ⛽   | 10   | —      | −10% fuel costs                     | hub, engineering_3    |
| `engineering_2b`         | Hull Plating          | 🛠️   | 10   | —      | Condition decay −20%                | hub, engineering_3    |
| `fuel_savings_r`         | Fuel Savings II       | 🔋   | 14   | ✓ ×1.5 | −1% fuel costs                      | 2a                    |
| `engineering_3`          | Autonomous Repair     | 🤖   | 22   | —      | +3 condition/turn auto-repair       | 2a, 2b, engineering_4 |
| `engineering_overhaul_r` | Efficient Yard I      | 🏗️   | 16   | ✓ ×1.6 | −3% overhaul cost                   | 2b                    |
| `engineering_4`          | Elite Fleet           | 🚀   | 50   | —      | +2 max condition cap, −30% overhaul | engineering_3         |
| `engineering_cap`        | ★ Engineering Mastery | 🏆   | 65   | —      | All Engineering effects ×1.2        | engineering_4         |

### Intelligence branch (market data, RP generation, revenue)

| ID                  | Name                   | Icon | Cost | Rep    | Effect                                              | Edges                  |
| ------------------- | ---------------------- | ---- | ---- | ------ | --------------------------------------------------- | ---------------------- |
| `intelligence_2a`   | Supply Chain Analytics | 🔍   | 10   | —      | Saturation shown numerically, +5% cargo prices      | hub, intelligence_3    |
| `intelligence_2b`   | RP Lab I               | 🧪   | 10   | ✓ ×1.8 | +0.5 RP/turn                                        | hub, intelligence_3    |
| `intelligence_3`    | Arbitrage Algorithms   | 💹   | 22   | —      | Route finder shows true net profit, −20% saturation | 2a, 2b, intelligence_4 |
| `intelligence_rp_r` | Research Accelerator   | 🔬   | 18   | ✓ ×2.0 | +0.5 RP/turn (higher scale = RP cap enforcer)       | 2b                     |
| `intelligence_4`    | Market Manipulation    | 📈   | 50   | —      | Reset saturation on 1 planet once per 5 turns       | intelligence_3         |
| `intelligence_cap`  | ★ Intelligence Mastery | 🏆   | 65   | —      | All Intelligence effects ×1.2                       | intelligence_4         |

### Crisis branch (events, resilience, short-route synergy)

| ID                  | Name                   | Icon | Cost | Rep    | Effect                                           | Edges            |
| ------------------- | ---------------------- | ---- | ---- | ------ | ------------------------------------------------ | ---------------- |
| `crisis_2a`         | Crisis Response        | 🚨   | 10   | —      | Hazard event duration −1 turn                    | hub, crisis_3    |
| `crisis_2b`         | Political Connections  | 🏛️   | 10   | —      | Empire event duration −1, 25% avoid chance       | hub, crisis_3    |
| `crisis_reserves_r` | Cash Cushion I         | 💰   | 10   | ✓ ×1.5 | Event cash cost −3%                              | crisis_2a        |
| `crisis_3`          | Galactic Insurance     | 🛡️   | 22   | —      | Grounded routes 50% mothball refund              | 2a, 2b, crisis_4 |
| `crisis_4`          | Unbreakable Operations | ⚓   | 50   | —      | Breakdowns earn 50% revenue, +1 embargo immunity | crisis_3         |
| `crisis_cap`        | ★ Crisis Mastery       | 🏆   | 65   | —      | All Crisis effects ×1.2                          | crisis_4         |

### 6 Player Archetypes (build targets)

| Archetype        | Key nodes                                         | Expected playstyle                   |
| ---------------- | ------------------------------------------------- | ------------------------------------ |
| Short Hauler     | logistics_2a, logistics_trips_r ×3, crisis branch | Max trips on short routes, resilient |
| Long Hauler      | logistics_2b, engineering_2a, fuel_savings_r ×3   | Low cost cross-empire runs           |
| Cargo Specialist | diplomacy_2a + one cargo pact, intelligence_2a    | Deep margin on one cargo type        |
| Research Engine  | intelligence_2b ×3, intelligence_rp_r ×2          | Fast tree unlock (RP capped)         |
| Diplomat         | diplomacy branch deep, diplomacy_relations_r ×3   | Best tariffs, empire access          |
| Efficient Hauler | engineering full branch, fuel_efficiency_1 ×3     | Lowest operating costs               |

---

## Section 6: RP Economy & Balance

### Generation bounds

- Base RP/turn: **3**
- Max from all RP nodes (fully stacked): **+4 RP/turn** (additive, never multiplicative)
- Hard cap enforced in `calculateRPPerTurn`: clamp RP-node contribution to 4
- Absolute max RP/turn: **7** (base 3 + node cap 4)

### Expected unlock targets

| Play style                 | Turns | RP earned | Nodes unlocked                   |
| -------------------------- | ----- | --------- | -------------------------------- |
| Casual spread              | 40    | ~160      | ~18–22 nodes                     |
| Optimal single-branch      | 40    | ~220      | 1 full branch + inner ring (~18) |
| Optimal RP build           | 40    | ~280      | ~30–35 nodes                     |
| Perfect play (all sources) | 60    | ~420      | ~40 nodes (~80%)                 |

**No single build unlocks all 5 capstones** — each capstone costs 65 RP and requires 60% of its branch owned. 5 capstones = 325 RP in capstone costs alone; achieving that and filling the branches is arithmetically impossible within a normal game length.

### Diversity & route bonuses (unchanged)

- +1 RP if trading ≥3 distinct cargo types (unchanged)
- +0.5 RP per active route to/from techWorld planets (unchanged, rounded down)

---

## Section 7: AI Tech Strategies

### Mechanism

Each AI company has a `techStrategy: string[]` — an ordered array of tech IDs. On each simulation turn:

1. Attempt to instant-purchase `techStrategy[nextUnlocked]` if affordable
2. Otherwise bank RP
3. 10% chance to also grab any cheap (`rpCost ≤ 8`) adjacent unlocked node not in strategy

No queue UI, no player-facing interaction. Same `processResearch` / `effectiveCost` logic applies.

### Pre-authored strategies (in `constants.ts`)

```typescript
AI_TECH_STRATEGIES = {
  aggressiveExpander: [
    "logistics_hub", "logistics_2a", "logistics_trips_r", "logistics_trips_r",
    "crisis_hub", "crisis_2a", "crisis_reserves_r", "logistics_3", ...
  ],
  steadyHauler: [
    "engineering_hub", "fuel_efficiency_1", "engineering_2a", "fuel_savings_r",
    "fuel_savings_r", "engineering_2b", "intelligence_hub", "intelligence_2a", ...
  ],
  cherryPicker: [
    "diplomacy_hub", "diplomacy_2a", "diplomacy_luxury", "intelligence_hub",
    "intelligence_2a", "diplomacy_2b", "diplomacy_relations_r", ...
  ],
}
```

### Galaxy-map behavior driven by tech

AI companies apply `TechEffects` identically to the player. This means:

- More Logistics nodes → AI takes more route slots, prefers frequent short routes
- Diplomacy cargo pact nodes → AI routes that cargo type preferentially
- Engineering deep → AI flies older/cheaper ships more efficiently
- Intelligence nodes → AI reacts to saturation data

AI differentiation is **authoring, not logic** — new AI personalities just need a new `techStrategy` array.

---

## Files Changed

| File                                       | Change                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/data/types.ts`                        | `Technology` → `TechNode`; extend `TechState` with `queue`, `purchaseCount`  |
| `src/data/constants.ts`                    | Replace `TECH_TREE` with `TECH_GRAPH: TechNode[]`; add `AI_TECH_STRATEGIES`  |
| `src/game/tech/TechTree.ts`                | Rewrite: new availability rules, effectiveCost, queue logic, processResearch |
| `src/game/tech/TechEffects.ts`             | Minor: handle repeat purchase count in effect application                    |
| `src/game/ai/steps/aiTechStep.ts`          | Rewrite: follow strategy array, 10% opportunistic grab                       |
| `src/ui/TechGraphCanvas.ts`                | **New**: radial canvas with pan/zoom, NodeView, edge lines                   |
| `src/ui/TechTreeGrid.ts`                   | **Delete** (replaced by TechGraphCanvas)                                     |
| `src/scenes/TechTreeScene.ts`              | Rewrite: new layout, queue row, sidebar unlock button                        |
| `src/ui/index.ts`                          | Export `TechGraphCanvas`; remove `TechTreeGrid` export                       |
| `src/game/tech/__tests__/TechTree.test.ts` | Update for new data model                                                    |
| `src/ui/__tests__/TechTreeGrid.test.ts`    | **Delete**; add `TechGraphCanvas.test.ts`                                    |

---

## Out of Scope

- Animated node unlock particles (nice-to-have, post-MVP)
- Save/load migration for existing saves with old `completedTechIds` (add migration shim in loader)
- Touchscreen drag (pan uses pointer events which work on touch, but pinch-zoom not required)
- Per-node artwork (emoji covers this for now)
