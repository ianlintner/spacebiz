# Roguelike Tech Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear 5×4 tech grid with a radial graph-based tech tree with pan/zoom, adjacency-based unlocking, instant-or-queue hybrid mechanic, repeatable nodes, and a reorderable queue strip.

**Architecture:** New `TechGraphCanvas` and `TechQueueRow` Phaser components replace `TechTreeGrid`; `TechState` gains `purchaseCount: Record<string,number>` and `queue: string[]` while keeping `completedTechIds` in sync for backwards compat; ~40-node `TECH_GRAPH` replaces `TECH_TREE` with explicit `edges`, `position`, and `icon` fields; `TechTree.ts` logic is rewritten around queue and instant-purchase; AI follows pre-authored `AI_TECH_STRATEGIES` arrays.

**Tech Stack:** Phaser 4, TypeScript strict, Vitest 4, existing theme/layout system

**Spec:** `docs/superpowers/specs/2026-05-07-roguelike-tech-tree-design.md`

---

## File Map

| File                                          | Action  | Responsibility                                                                                                                                      |
| --------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                           | Modify  | Add fields to `Technology`, extend `TechState`, add `addRPPerTurn` effect type                                                                      |
| `src/data/constants.ts`                       | Modify  | Replace `TECH_TREE` array with `TECH_GRAPH` (40 nodes), keep `TECH_TREE` alias, add `AI_TECH_STRATEGIES`                                            |
| `src/data/GameStore.ts`                       | Modify  | Add `purchaseCount: {}` and `queue: []` to initial `TechState`                                                                                      |
| `src/game/NewGameSetup.ts`                    | Modify  | Same initial state additions                                                                                                                        |
| `src/game/tech/TechTree.ts`                   | Rewrite | `effectiveCost`, new `isTechAvailable`, `instantUnlockOrQueue`, `reorderQueue`, `removeFromQueue`, `processResearch`, `calculateRPPerTurn` (RP cap) |
| `src/game/tech/__tests__/TechTree.test.ts`    | Rewrite | Tests for new logic                                                                                                                                 |
| `src/game/tech/TechEffects.ts`                | Modify  | Use `purchaseCount` (multiply effect by count), handle `addRPPerTurn`                                                                               |
| `src/game/tech/__tests__/TechEffects.test.ts` | Modify  | Update for purchaseCount                                                                                                                            |
| `src/game/ai/steps/aiTechStep.ts`             | Rewrite | Strategy-array based, `AI_TECH_STRATEGIES`, 10% opportunistic grab                                                                                  |
| `src/ui/TechGraphCanvas.ts`                   | Create  | Radial pan/zoom canvas, NodeView, edge lines, `BRANCH_LABELS` export                                                                                |
| `src/ui/__tests__/TechGraphCanvas.test.ts`    | Create  | Smoke tests                                                                                                                                         |
| `src/ui/TechQueueRow.ts`                      | Create  | Queue strip, drag-to-reorder, remove button                                                                                                         |
| `src/ui/__tests__/TechQueueRow.test.ts`       | Create  | Smoke tests                                                                                                                                         |
| `src/ui/TechTreeGrid.ts`                      | Delete  | Replaced by TechGraphCanvas                                                                                                                         |
| `src/ui/__tests__/TechTreeGrid.test.ts`       | Delete  | No longer needed                                                                                                                                    |
| `src/scenes/TechTreeScene.ts`                 | Rewrite | New layout: canvas + queue row + sidebar unlock button                                                                                              |
| `src/ui/index.ts`                             | Modify  | Export TechGraphCanvas + TechQueueRow, remove TechTreeGrid                                                                                          |
| `src/game/save/` (loader)                     | Modify  | Migration shim: `completedTechIds[]` → `purchaseCount` for old saves                                                                                |

---

## Task 1: Extend `types.ts` — TechNode fields + TechState queue

**Files:**

- Modify: `src/data/types.ts`

- [ ] **Step 1: Open `src/data/types.ts` and locate the `TechEffect` interface (around line 1019). Add `addRPPerTurn` to the type union.**

```typescript
// Find the type union inside TechEffect and add to the end:
    | "addRPPerTurn";
```

Full updated `TechEffect`:

```typescript
export interface TechEffect {
  type:
    | "addRouteSlots"
    | "modifyLicenseFee"
    | "modifyTariff"
    | "modifyMaintenance"
    | "modifyFuel"
    | "modifyConditionDecay"
    | "modifyRevenue"
    | "addTripsPerTurn"
    | "addCargoTypesPerPair"
    | "modifySaturation"
    | "modifyEventDuration"
    | "modifyEventCash"
    | "addAutoRepair"
    | "modifyOverhaulCost"
    | "addEmbargoImmunity"
    | "addMothballRefund"
    | "addBreakdownRevenue"
    | "addMarketForecast"
    | "addSaturationDisplay"
    | "addMarketReset"
    | "addRPPerTurn";
  value: number;
  target?: "friendly" | "neutral" | "hostile" | "all";
}
```

- [ ] **Step 2: Find the `Technology` interface (around line 1045). Add `icon`, `edges`, `position`, `repeatable`, and `repeatCostScale` fields. Keep `tier` (used by IntelLevel.ts).**

```typescript
export interface Technology {
  id: string;
  name: string;
  icon: string; // emoji for node display
  branch: TechBranch;
  tier: 1 | 2 | 3 | 4;
  rpCost: number;
  description: string;
  effects: TechEffect[];
  edges: string[]; // adjacent node IDs (bidirectional)
  position: { angle: number; radius: number }; // polar: degrees, ring units (RING_SPACING=130px)
  repeatable?: boolean;
  repeatCostScale?: number; // cost multiplier per repeat; default 1.5
}

// Alias for new code — both refer to the same interface
export type TechNode = Technology;
```

- [ ] **Step 3: Find the `TechState` interface (around line 1055). Add `purchaseCount` and `queue`.**

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

- [ ] **Step 4: Run typecheck to confirm no regressions.**

```bash
npm run typecheck
```

Expected: compilation errors only in `constants.ts` (where `TECH_TREE` nodes are missing the new required fields — will be fixed in Task 2). All other files should pass.

- [ ] **Step 5: Commit.**

```bash
git add src/data/types.ts
git commit -m "feat(tech): extend Technology + TechState for graph-based tree"
```

---

## Task 2: Write TECH_GRAPH data and update initial state

**Files:**

- Modify: `src/data/constants.ts`
- Modify: `src/data/GameStore.ts`
- Modify: `src/game/NewGameSetup.ts`

- [ ] **Step 1: In `constants.ts`, find the `TECH_TREE` declaration (around line 668). Replace it entirely with `TECH_GRAPH` (40 nodes) and add `TECH_TREE` as a compatibility alias and `AI_TECH_STRATEGIES`.**

Replace from `export const TECH_TREE: Technology[] = [` through the closing `];` with:

```typescript
export const TECH_GRAPH: Technology[] = [
  // ── Center ──────────────────────────────────────────────────────────────────
  {
    id: "fuel_efficiency_1",
    name: "Fuel Savings I",
    icon: "🔋",
    branch: TechBranch.Engineering,
    tier: 1,
    rpCost: 4,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 0, radius: 0 },
    edges: [
      "logistics_hub",
      "engineering_hub",
      "intelligence_hub",
      "crisis_hub",
      "diplomacy_hub",
    ],
    description: "−1% fuel costs per purchase",
    effects: [{ type: "modifyFuel", value: -0.01 }],
  },

  // ── Logistics Branch ────────────────────────────────────────────────────────
  {
    id: "logistics_hub",
    name: "Efficient Scheduling",
    icon: "⏱️",
    branch: TechBranch.Logistics,
    tier: 1,
    rpCost: 6,
    position: { angle: 270, radius: 1 },
    edges: ["fuel_efficiency_1", "logistics_2a", "logistics_2b"],
    description: "+1 route slot",
    effects: [{ type: "addRouteSlots", value: 1 }],
  },
  {
    id: "logistics_2a",
    name: "Short Haul Focus",
    icon: "🗺️",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 10,
    position: { angle: 250, radius: 2 },
    edges: ["logistics_hub", "logistics_trips_r", "logistics_3"],
    description: "+1 trip/turn on all routes",
    effects: [{ type: "addTripsPerTurn", value: 1 }],
  },
  {
    id: "logistics_2b",
    name: "Long Haul Network",
    icon: "🌐",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 10,
    position: { angle: 290, radius: 2 },
    edges: ["logistics_hub", "logistics_3"],
    description: "+10% route revenue",
    effects: [{ type: "modifyRevenue", value: 0.1 }],
  },
  {
    id: "logistics_trips_r",
    name: "Route Efficiency I",
    icon: "⚡",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 12,
    repeatable: true,
    repeatCostScale: 1.6,
    position: { angle: 235, radius: 2.6 },
    edges: ["logistics_2a"],
    description: "+0.5 trips/turn on all routes",
    effects: [{ type: "addTripsPerTurn", value: 0.5 }],
  },
  {
    id: "logistics_3",
    name: "Regional Hub Protocols",
    icon: "🏢",
    branch: TechBranch.Logistics,
    tier: 3,
    rpCost: 20,
    position: { angle: 270, radius: 3 },
    edges: ["logistics_2a", "logistics_2b", "logistics_4"],
    description: "+1 route slot, −10% license fees",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyLicenseFee", value: -0.1 },
    ],
  },
  {
    id: "logistics_4",
    name: "Omnipresent Logistics",
    icon: "🌌",
    branch: TechBranch.Logistics,
    tier: 4,
    rpCost: 45,
    position: { angle: 270, radius: 4 },
    edges: ["logistics_3", "logistics_cap"],
    description: "+1 route slot, +10% all revenue",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyRevenue", value: 0.1 },
    ],
  },
  {
    id: "logistics_cap",
    name: "★ Logistics Mastery",
    icon: "🏆",
    branch: TechBranch.Logistics,
    tier: 4,
    rpCost: 60,
    position: { angle: 270, radius: 4.8 },
    edges: ["logistics_4"],
    description: "+2 route slots, −15% license fees, +5% revenue",
    effects: [
      { type: "addRouteSlots", value: 2 },
      { type: "modifyLicenseFee", value: -0.15 },
      { type: "modifyRevenue", value: 0.05 },
    ],
  },

  // ── Engineering Branch ───────────────────────────────────────────────────────
  {
    id: "engineering_hub",
    name: "Workshop",
    icon: "🔧",
    branch: TechBranch.Engineering,
    tier: 1,
    rpCost: 6,
    position: { angle: 342, radius: 1 },
    edges: ["fuel_efficiency_1", "engineering_2a", "engineering_2b"],
    description: "−10% maintenance costs",
    effects: [{ type: "modifyMaintenance", value: -0.1 }],
  },
  {
    id: "engineering_2a",
    name: "Fuel Injection",
    icon: "⛽",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 10,
    position: { angle: 325, radius: 2 },
    edges: ["engineering_hub", "fuel_savings_r", "engineering_3"],
    description: "−10% fuel costs",
    effects: [{ type: "modifyFuel", value: -0.1 }],
  },
  {
    id: "engineering_2b",
    name: "Hull Plating",
    icon: "🛠️",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 10,
    position: { angle: 359, radius: 2 },
    edges: ["engineering_hub", "engineering_overhaul_r", "engineering_3"],
    description: "Ship condition decay −20%",
    effects: [{ type: "modifyConditionDecay", value: -0.2 }],
  },
  {
    id: "fuel_savings_r",
    name: "Fuel Savings II",
    icon: "🔋",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 14,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 310, radius: 2.6 },
    edges: ["engineering_2a"],
    description: "−1% fuel costs per purchase",
    effects: [{ type: "modifyFuel", value: -0.01 }],
  },
  {
    id: "engineering_overhaul_r",
    name: "Efficient Yard I",
    icon: "🏗️",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 16,
    repeatable: true,
    repeatCostScale: 1.6,
    position: { angle: 14, radius: 2.6 },
    edges: ["engineering_2b"],
    description: "−3% overhaul cost per purchase",
    effects: [{ type: "modifyOverhaulCost", value: -0.03 }],
  },
  {
    id: "engineering_3",
    name: "Autonomous Repair",
    icon: "🤖",
    branch: TechBranch.Engineering,
    tier: 3,
    rpCost: 22,
    position: { angle: 342, radius: 3 },
    edges: ["engineering_2a", "engineering_2b", "engineering_4"],
    description: "+3 condition/turn auto-repair",
    effects: [{ type: "addAutoRepair", value: 3 }],
  },
  {
    id: "engineering_4",
    name: "Elite Fleet",
    icon: "🚀",
    branch: TechBranch.Engineering,
    tier: 4,
    rpCost: 45,
    position: { angle: 342, radius: 4 },
    edges: ["engineering_3", "engineering_cap"],
    description: "−20% overhaul cost, ship decay −10%",
    effects: [
      { type: "modifyOverhaulCost", value: -0.2 },
      { type: "modifyConditionDecay", value: -0.1 },
    ],
  },
  {
    id: "engineering_cap",
    name: "★ Engineering Mastery",
    icon: "🏆",
    branch: TechBranch.Engineering,
    tier: 4,
    rpCost: 60,
    position: { angle: 342, radius: 4.8 },
    edges: ["engineering_4"],
    description: "+5 auto-repair/turn, −10% maintenance, −10% fuel",
    effects: [
      { type: "addAutoRepair", value: 5 },
      { type: "modifyMaintenance", value: -0.1 },
      { type: "modifyFuel", value: -0.1 },
    ],
  },

  // ── Intelligence Branch ──────────────────────────────────────────────────────
  {
    id: "intelligence_hub",
    name: "Market Forecasting",
    icon: "📊",
    branch: TechBranch.Intelligence,
    tier: 1,
    rpCost: 6,
    position: { angle: 54, radius: 1 },
    edges: ["fuel_efficiency_1", "intelligence_2a", "intelligence_2b"],
    description: "Trend predictions shown 2 turns ahead",
    effects: [{ type: "addMarketForecast", value: 2 }],
  },
  {
    id: "intelligence_2a",
    name: "Supply Chain Analytics",
    icon: "🔍",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 10,
    position: { angle: 37, radius: 2 },
    edges: ["intelligence_hub", "intelligence_3"],
    description: "Saturation shown numerically, +5% cargo prices",
    effects: [
      { type: "addSaturationDisplay", value: 1 },
      { type: "modifyRevenue", value: 0.05 },
    ],
  },
  {
    id: "intelligence_2b",
    name: "RP Lab I",
    icon: "🧪",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 10,
    repeatable: true,
    repeatCostScale: 1.8,
    position: { angle: 71, radius: 2 },
    edges: ["intelligence_hub", "intelligence_rp_r", "intelligence_3"],
    description: "+1 RP/turn",
    effects: [{ type: "addRPPerTurn", value: 1 }],
  },
  {
    id: "intelligence_rp_r",
    name: "Research Accelerator",
    icon: "🔬",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 18,
    repeatable: true,
    repeatCostScale: 2.0,
    position: { angle: 86, radius: 2.6 },
    edges: ["intelligence_2b"],
    description: "+1 RP/turn",
    effects: [{ type: "addRPPerTurn", value: 1 }],
  },
  {
    id: "intelligence_3",
    name: "Arbitrage Algorithms",
    icon: "💹",
    branch: TechBranch.Intelligence,
    tier: 3,
    rpCost: 22,
    position: { angle: 54, radius: 3 },
    edges: ["intelligence_2a", "intelligence_2b", "intelligence_4"],
    description: "Route finder shows true net profit, −20% saturation impact",
    effects: [{ type: "modifySaturation", value: -0.2 }],
  },
  {
    id: "intelligence_4",
    name: "Market Manipulation",
    icon: "📈",
    branch: TechBranch.Intelligence,
    tier: 4,
    rpCost: 45,
    position: { angle: 54, radius: 4 },
    edges: ["intelligence_3", "intelligence_cap"],
    description: "Reset saturation on 1 planet per 5 turns",
    effects: [{ type: "addMarketReset", value: 5 }],
  },
  {
    id: "intelligence_cap",
    name: "★ Intelligence Mastery",
    icon: "🏆",
    branch: TechBranch.Intelligence,
    tier: 4,
    rpCost: 60,
    position: { angle: 54, radius: 4.8 },
    edges: ["intelligence_4"],
    description: "+2 RP/turn, +10% revenue, −10% saturation",
    effects: [
      { type: "addRPPerTurn", value: 2 },
      { type: "modifyRevenue", value: 0.1 },
      { type: "modifySaturation", value: -0.1 },
    ],
  },

  // ── Crisis Branch ────────────────────────────────────────────────────────────
  {
    id: "crisis_hub",
    name: "Emergency Reserves",
    icon: "🛡️",
    branch: TechBranch.Crisis,
    tier: 1,
    rpCost: 6,
    position: { angle: 126, radius: 1 },
    edges: ["fuel_efficiency_1", "crisis_2a", "crisis_2b"],
    description: "Event costs −15%",
    effects: [{ type: "modifyEventCash", value: -0.15 }],
  },
  {
    id: "crisis_2a",
    name: "Crisis Response",
    icon: "🚨",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    position: { angle: 109, radius: 2 },
    edges: ["crisis_hub", "crisis_reserves_r", "crisis_3"],
    description: "Hazard event duration −1 turn (min 1)",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_2b",
    name: "Political Connections",
    icon: "🏛️",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    position: { angle: 143, radius: 2 },
    edges: ["crisis_hub", "crisis_3"],
    description: "Empire event duration −1, 25% avoid chance",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_reserves_r",
    name: "Cash Cushion I",
    icon: "💰",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 94, radius: 2.6 },
    edges: ["crisis_2a"],
    description: "Event cash cost −3% per purchase",
    effects: [{ type: "modifyEventCash", value: -0.03 }],
  },
  {
    id: "crisis_3",
    name: "Galactic Insurance",
    icon: "⛑️",
    branch: TechBranch.Crisis,
    tier: 3,
    rpCost: 22,
    position: { angle: 126, radius: 3 },
    edges: ["crisis_2a", "crisis_2b", "crisis_4"],
    description: "Grounded routes pay 50% mothball refund",
    effects: [{ type: "addMothballRefund", value: 0.5 }],
  },
  {
    id: "crisis_4",
    name: "Unbreakable Operations",
    icon: "⚓",
    branch: TechBranch.Crisis,
    tier: 4,
    rpCost: 45,
    position: { angle: 126, radius: 4 },
    edges: ["crisis_3", "crisis_cap"],
    description: "Breakdowns earn 50% revenue, +1 embargo immunity",
    effects: [
      { type: "addBreakdownRevenue", value: 0.5 },
      { type: "addEmbargoImmunity", value: 1 },
    ],
  },
  {
    id: "crisis_cap",
    name: "★ Crisis Mastery",
    icon: "🏆",
    branch: TechBranch.Crisis,
    tier: 4,
    rpCost: 60,
    position: { angle: 126, radius: 4.8 },
    edges: ["crisis_4"],
    description: "Event costs −20%, event duration −1 more",
    effects: [
      { type: "modifyEventCash", value: -0.2 },
      { type: "modifyEventDuration", value: -1 },
    ],
  },

  // ── Diplomacy Branch ─────────────────────────────────────────────────────────
  {
    id: "diplomacy_hub",
    name: "Cultural Exchange",
    icon: "🤝",
    branch: TechBranch.Diplomacy,
    tier: 1,
    rpCost: 6,
    position: { angle: 198, radius: 1 },
    edges: ["fuel_efficiency_1", "diplomacy_2a", "diplomacy_2b"],
    description: "−10% tariffs on friendly empires",
    effects: [{ type: "modifyTariff", value: -0.1, target: "friendly" }],
  },
  {
    id: "diplomacy_2a",
    name: "Trade Envoys",
    icon: "📜",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 10,
    position: { angle: 181, radius: 2 },
    edges: [
      "diplomacy_hub",
      "diplomacy_food",
      "diplomacy_tech",
      "diplomacy_luxury",
      "diplomacy_3",
    ],
    description: "+1 cargo type per empire pair",
    effects: [{ type: "addCargoTypesPerPair", value: 1 }],
  },
  {
    id: "diplomacy_2b",
    name: "Border Protocols",
    icon: "🛂",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 10,
    position: { angle: 215, radius: 2 },
    edges: ["diplomacy_hub", "diplomacy_relations_r", "diplomacy_3"],
    description: "−15% tariffs on neutral empires",
    effects: [{ type: "modifyTariff", value: -0.15, target: "neutral" }],
  },
  {
    id: "diplomacy_food",
    name: "Food Trade Pact",
    icon: "🌾",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 158, radius: 2.6 },
    edges: ["diplomacy_2a"],
    description:
      "+8% revenue (cargo-pact: mutually exclusive with tech/luxury)",
    effects: [{ type: "modifyRevenue", value: 0.08 }],
  },
  {
    id: "diplomacy_tech",
    name: "Tech Export License",
    icon: "💡",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 175, radius: 2.8 },
    edges: ["diplomacy_2a"],
    description:
      "+8% revenue (cargo-pact: mutually exclusive with food/luxury)",
    effects: [{ type: "modifyRevenue", value: 0.08 }],
  },
  {
    id: "diplomacy_luxury",
    name: "Luxury Broker",
    icon: "💎",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 192, radius: 2.6 },
    edges: ["diplomacy_2a"],
    description: "+8% revenue (cargo-pact: mutually exclusive with food/tech)",
    effects: [{ type: "modifyRevenue", value: 0.08 }],
  },
  {
    id: "diplomacy_relations_r",
    name: "Goodwill I",
    icon: "🕊️",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 10,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 230, radius: 2.6 },
    edges: ["diplomacy_2b"],
    description: "−5% tariffs on all empires per purchase",
    effects: [{ type: "modifyTariff", value: -0.05, target: "all" }],
  },
  {
    id: "diplomacy_3",
    name: "Diplomatic Immunity",
    icon: "🏛️",
    branch: TechBranch.Diplomacy,
    tier: 3,
    rpCost: 22,
    position: { angle: 198, radius: 3 },
    edges: ["diplomacy_2a", "diplomacy_2b", "diplomacy_4"],
    description: "Immune to 1 embargo/game, −20% tariffs hostile",
    effects: [
      { type: "addEmbargoImmunity", value: 1 },
      { type: "modifyTariff", value: -0.2, target: "hostile" },
    ],
  },
  {
    id: "diplomacy_4",
    name: "Galactic Trade Authority",
    icon: "🌍",
    branch: TechBranch.Diplomacy,
    tier: 4,
    rpCost: 45,
    position: { angle: 198, radius: 4 },
    edges: ["diplomacy_3", "diplomacy_cap"],
    description: "+1 cargo type for all empires, −10% all tariffs",
    effects: [
      { type: "addCargoTypesPerPair", value: 1 },
      { type: "modifyTariff", value: -0.1, target: "all" },
    ],
  },
  {
    id: "diplomacy_cap",
    name: "★ Diplomacy Mastery",
    icon: "🏆",
    branch: TechBranch.Diplomacy,
    tier: 4,
    rpCost: 60,
    position: { angle: 198, radius: 4.8 },
    edges: ["diplomacy_4"],
    description: "−15% all tariffs, +5% revenue, immune to 1 more embargo",
    effects: [
      { type: "modifyTariff", value: -0.15, target: "all" },
      { type: "modifyRevenue", value: 0.05 },
      { type: "addEmbargoImmunity", value: 1 },
    ],
  },
];

// Backwards compatibility alias — all existing code that imports TECH_TREE continues to work
export const TECH_TREE = TECH_GRAPH;

export const AI_TECH_STRATEGIES: Record<string, string[]> = {
  aggressiveExpander: [
    "fuel_efficiency_1",
    "logistics_hub",
    "logistics_2a",
    "crisis_hub",
    "fuel_efficiency_1",
    "logistics_trips_r",
    "crisis_2a",
    "logistics_2b",
    "crisis_reserves_r",
    "logistics_trips_r",
    "logistics_3",
    "crisis_2b",
    "crisis_3",
    "logistics_4",
    "crisis_reserves_r",
  ],
  steadyHauler: [
    "fuel_efficiency_1",
    "engineering_hub",
    "engineering_2a",
    "fuel_savings_r",
    "engineering_2b",
    "fuel_efficiency_1",
    "fuel_savings_r",
    "engineering_3",
    "engineering_overhaul_r",
    "intelligence_hub",
    "fuel_savings_r",
    "intelligence_2a",
    "engineering_4",
    "intelligence_3",
  ],
  cherryPicker: [
    "fuel_efficiency_1",
    "diplomacy_hub",
    "diplomacy_2a",
    "diplomacy_luxury",
    "intelligence_hub",
    "diplomacy_2b",
    "intelligence_2a",
    "diplomacy_relations_r",
    "intelligence_2b",
    "diplomacy_3",
    "diplomacy_relations_r",
    "intelligence_3",
    "diplomacy_4",
    "intelligence_rp_r",
  ],
};
```

- [ ] **Step 2: In `src/data/GameStore.ts`, find the `tech:` block in the initial state (around line 53) and add the two new fields.**

```typescript
// Before:
tech: {
  researchPoints: 0,
  completedTechIds: [],
  currentResearchId: null,
  researchProgress: 0,
},

// After:
tech: {
  researchPoints: 0,
  completedTechIds: [],
  purchaseCount: {},
  queue: [],
  currentResearchId: null,
  researchProgress: 0,
},
```

- [ ] **Step 3: In `src/game/NewGameSetup.ts`, find the `tech:` block (around line 366) and add the same two fields.**

```typescript
// Before:
tech: {
  researchPoints: 0,
  completedTechIds: [],
  currentResearchId: null,
  researchProgress: 0,
},

// After:
tech: {
  researchPoints: 0,
  completedTechIds: [],
  purchaseCount: {},
  queue: [],
  currentResearchId: null,
  researchProgress: 0,
},
```

- [ ] **Step 4: Run typecheck.**

```bash
npm run typecheck
```

Expected: passes. The old `TECH_TREE` nodes no longer compile because they're missing the new required fields (`icon`, `edges`, `position`). Those are now gone — `TECH_GRAPH` provides them. Any other file importing `TECH_TREE` still works because `TECH_TREE = TECH_GRAPH`.

- [ ] **Step 5: Run tests.**

```bash
npm run test
```

Expected: existing TechTree and TechEffects tests fail (they rely on old `TECH_TREE` shape and old `isTechAvailable` — fixed in Tasks 3–5).

- [ ] **Step 6: Commit.**

```bash
git add src/data/constants.ts src/data/GameStore.ts src/game/NewGameSetup.ts
git commit -m "feat(tech): add TECH_GRAPH (40 nodes), AI_TECH_STRATEGIES, extend initial TechState"
```

---

## Task 3: Rewrite `TechTree.ts`

**Files:**

- Modify: `src/game/tech/TechTree.ts`

- [ ] **Step 1: Replace the entire file with the following.**

```typescript
import type { GameState, TechState, Technology } from "../../data/types.ts";
import {
  TECH_GRAPH,
  BASE_RP_PER_TURN,
  RP_DIVERSITY_THRESHOLD,
  RP_RESEARCH_PLANET_BONUS,
} from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cargo-pact node IDs — only one may be owned at a time. */
const CARGO_PACT_IDS = new Set([
  "diplomacy_food",
  "diplomacy_tech",
  "diplomacy_luxury",
]);

/**
 * Effective RP cost for a tech node accounting for repeat purchases.
 * For non-repeatable nodes, count is always 0 when called (they block purchase
 * once owned via isTechAvailable), so Math.pow(scale, 0) = 1 — base cost.
 */
export function effectiveCost(techId: string, tech: TechState): number {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return Infinity;
  const count = tech.purchaseCount[techId] ?? 0;
  const scale = node.repeatCostScale ?? 1;
  return Math.round(node.rpCost * Math.pow(scale, count));
}

/**
 * Apply a single purchase of techId to TechState.
 * Keeps completedTechIds in sync for backwards compat.
 */
export function applyPurchase(techId: string, tech: TechState): TechState {
  const newCount = (tech.purchaseCount[techId] ?? 0) + 1;
  const newCompletedIds =
    newCount === 1 ? [...tech.completedTechIds, techId] : tech.completedTechIds;
  return {
    ...tech,
    purchaseCount: { ...tech.purchaseCount, [techId]: newCount },
    completedTechIds: newCompletedIds,
  };
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/**
 * Whether a tech is available to unlock or queue.
 */
export function isTechAvailable(techId: string, tech: TechState): boolean {
  const node = TECH_GRAPH.find((n) => n.id === techId);
  if (!node) return false;

  // Already in queue
  if (tech.queue.includes(techId)) return false;

  const count = tech.purchaseCount[techId] ?? 0;

  // Non-repeatable already owned
  if (!node.repeatable && count > 0) return false;

  // Cargo-pact mutual exclusivity
  if (CARGO_PACT_IDS.has(techId)) {
    const blocked = [...CARGO_PACT_IDS]
      .filter((id) => id !== techId)
      .some((id) => (tech.purchaseCount[id] ?? 0) > 0);
    if (blocked) return false;
  }

  // Center node is always available
  if (techId === "fuel_efficiency_1") return true;

  // Adjacency: at least one neighbor must be owned
  return node.edges.some((edgeId) => (tech.purchaseCount[edgeId] ?? 0) > 0);
}

export function getAvailableTechs(tech: TechState): Technology[] {
  return TECH_GRAPH.filter((n) => isTechAvailable(n.id, tech));
}

// ---------------------------------------------------------------------------
// Unlock / Queue
// ---------------------------------------------------------------------------

/**
 * Attempt instant unlock (if enough RP) or add to queue.
 * Returns null if the tech is not available.
 */
export function instantUnlockOrQueue(
  techId: string,
  tech: TechState,
): TechState | null {
  if (!isTechAvailable(techId, tech)) return null;

  const cost = effectiveCost(techId, tech);
  if (tech.researchPoints >= cost) {
    // Instant purchase
    const afterPurchase = applyPurchase(techId, {
      ...tech,
      researchPoints: tech.researchPoints - cost,
    });
    afterPurchase.currentResearchId = afterPurchase.queue[0] ?? null;
    return afterPurchase;
  }

  // Add to queue
  const newQueue = [...tech.queue, techId];
  return {
    ...tech,
    queue: newQueue,
    currentResearchId: newQueue[0],
    researchProgress: 0,
  };
}

/** Kept for backwards compat with callers that still use setResearchTarget. */
export function setResearchTarget(
  techId: string,
  tech: TechState,
): TechState | null {
  return instantUnlockOrQueue(techId, tech);
}

export function reorderQueue(
  tech: TechState,
  fromIdx: number,
  toIdx: number,
): TechState {
  const queue = [...tech.queue];
  const [item] = queue.splice(fromIdx, 1);
  queue.splice(toIdx, 0, item);
  return { ...tech, queue, currentResearchId: queue[0] ?? null };
}

export function removeFromQueue(tech: TechState, index: number): TechState {
  const queue = [...tech.queue];
  queue.splice(index, 1);
  return { ...tech, queue, currentResearchId: queue[0] ?? null };
}

// ---------------------------------------------------------------------------
// Turn processing
// ---------------------------------------------------------------------------

/**
 * Process tech research for one turn.
 * Adds RP, auto-completes any queue items that become affordable (chain).
 */
export function processResearch(
  state: GameState,
  rpThisTurn: number,
): TechState {
  let tech: TechState = {
    ...state.tech,
    purchaseCount: { ...state.tech.purchaseCount },
    queue: [...state.tech.queue],
    researchPoints: state.tech.researchPoints + rpThisTurn,
  };

  // Auto-complete queue items while affordable
  while (tech.queue.length > 0) {
    const nextId = tech.queue[0];
    const cost = effectiveCost(nextId, tech);
    if (tech.researchPoints >= cost) {
      tech.researchPoints -= cost;
      tech.queue = tech.queue.slice(1);
      tech = applyPurchase(nextId, tech);
    } else {
      break;
    }
  }

  tech.currentResearchId = tech.queue[0] ?? null;
  tech.researchProgress =
    tech.queue.length > 0
      ? Math.min(tech.researchPoints, effectiveCost(tech.queue[0], tech))
      : 0;

  return tech;
}

// ---------------------------------------------------------------------------
// RP per turn
// ---------------------------------------------------------------------------

export function calculateRPPerTurn(state: GameState): number {
  let rp = BASE_RP_PER_TURN;

  // Diversity bonus
  const distinctCargos = new Set(
    state.activeRoutes
      .filter((r) => r.cargoType && r.assignedShipIds.length > 0)
      .map((r) => r.cargoType),
  );
  if (distinctCargos.size >= RP_DIVERSITY_THRESHOLD) rp += 1;

  // Tech-world route bonus
  const researchPlanets = new Set(
    state.galaxy.planets.filter((p) => p.type === "techWorld").map((p) => p.id),
  );
  let techRouteCount = 0;
  for (const route of state.activeRoutes) {
    if (route.assignedShipIds.length === 0) continue;
    if (
      researchPlanets.has(route.originPlanetId) ||
      researchPlanets.has(route.destinationPlanetId)
    )
      techRouteCount++;
  }
  rp += Math.floor(techRouteCount * RP_RESEARCH_PLANET_BONUS);

  // RP node bonus — addRPPerTurn effects, capped at +4
  let rpNodeBonus = 0;
  for (const node of TECH_GRAPH) {
    const count = state.tech.purchaseCount[node.id] ?? 0;
    if (count === 0) continue;
    for (const effect of node.effects) {
      if (effect.type === "addRPPerTurn") rpNodeBonus += effect.value * count;
    }
  }
  rp += Math.min(Math.floor(rpNodeBonus), 4);

  return rp;
}

// ---------------------------------------------------------------------------
// Compat helpers (used by TechTreeScene + GameHUDScene)
// ---------------------------------------------------------------------------

export function getCurrentResearch(tech: TechState): Technology | null {
  if (!tech.currentResearchId) return null;
  return TECH_GRAPH.find((t) => t.id === tech.currentResearchId) ?? null;
}

export function getResearchProgress(tech: TechState): number {
  if (!tech.currentResearchId) return 0;
  const node = TECH_GRAPH.find((t) => t.id === tech.currentResearchId);
  if (!node) return 0;
  const cost = effectiveCost(tech.currentResearchId, tech);
  return Math.min(1, tech.researchProgress / cost);
}

export function getCompletedTechIds(tech: TechState): string[] {
  return Object.entries(tech.purchaseCount)
    .filter(([, count]) => count > 0)
    .map(([id]) => id);
}
```

- [ ] **Step 2: Run typecheck.**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit (tests still failing — fixed in Task 4).**

```bash
git add src/game/tech/TechTree.ts
git commit -m "feat(tech): rewrite TechTree.ts — graph-based availability, queue, instant unlock"
```

---

## Task 4: Rewrite `TechTree.test.ts`

**Files:**

- Modify: `src/game/tech/__tests__/TechTree.test.ts`

- [ ] **Step 1: Replace the entire test file.**

```typescript
import { describe, it, expect } from "vitest";
import type { TechState } from "../../../data/types.ts";
import {
  effectiveCost,
  isTechAvailable,
  instantUnlockOrQueue,
  reorderQueue,
  removeFromQueue,
  processResearch,
  applyPurchase,
} from "../TechTree.ts";

// Minimal TechState factory
function mkTech(overrides: Partial<TechState> = {}): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
    ...overrides,
  };
}

describe("effectiveCost", () => {
  it("returns base cost on first purchase", () => {
    expect(effectiveCost("fuel_efficiency_1", mkTech())).toBe(4);
  });

  it("scales cost for repeatable on repeat purchase", () => {
    const tech = mkTech({ purchaseCount: { fuel_efficiency_1: 1 } });
    // 4 * 1.5^1 = 6
    expect(effectiveCost("fuel_efficiency_1", tech)).toBe(6);
  });

  it("scales cost for 3rd purchase", () => {
    const tech = mkTech({ purchaseCount: { fuel_efficiency_1: 2 } });
    // 4 * 1.5^2 = 9
    expect(effectiveCost("fuel_efficiency_1", tech)).toBe(9);
  });

  it("returns Infinity for unknown id", () => {
    expect(effectiveCost("nonexistent", mkTech())).toBe(Infinity);
  });
});

describe("isTechAvailable", () => {
  it("center node is always available", () => {
    expect(isTechAvailable("fuel_efficiency_1", mkTech())).toBe(true);
  });

  it("hub node locked when center not owned", () => {
    expect(isTechAvailable("logistics_hub", mkTech())).toBe(false);
  });

  it("hub node available when center owned", () => {
    const tech = mkTech({
      purchaseCount: { fuel_efficiency_1: 1 },
      completedTechIds: ["fuel_efficiency_1"],
    });
    expect(isTechAvailable("logistics_hub", tech)).toBe(true);
  });

  it("non-repeatable already owned is unavailable", () => {
    const tech = mkTech({
      purchaseCount: { fuel_efficiency_1: 1, logistics_hub: 1 },
      completedTechIds: ["fuel_efficiency_1", "logistics_hub"],
    });
    expect(isTechAvailable("logistics_hub", tech)).toBe(false);
  });

  it("repeatable already owned is available again", () => {
    const tech = mkTech({ purchaseCount: { fuel_efficiency_1: 1 } });
    expect(isTechAvailable("fuel_efficiency_1", tech)).toBe(true);
  });

  it("node in queue is unavailable", () => {
    const tech = mkTech({ queue: ["fuel_efficiency_1"] });
    expect(isTechAvailable("fuel_efficiency_1", tech)).toBe(false);
  });

  it("cargo pact mutually exclusive — food blocks luxury", () => {
    const tech = mkTech({
      purchaseCount: {
        fuel_efficiency_1: 1,
        diplomacy_hub: 1,
        diplomacy_2a: 1,
        diplomacy_food: 1,
      },
      completedTechIds: [
        "fuel_efficiency_1",
        "diplomacy_hub",
        "diplomacy_2a",
        "diplomacy_food",
      ],
    });
    expect(isTechAvailable("diplomacy_luxury", tech)).toBe(false);
    expect(isTechAvailable("diplomacy_tech", tech)).toBe(false);
  });

  it("cargo pact allows the one not yet owned", () => {
    const tech = mkTech({
      purchaseCount: {
        fuel_efficiency_1: 1,
        diplomacy_hub: 1,
        diplomacy_2a: 1,
      },
      completedTechIds: ["fuel_efficiency_1", "diplomacy_hub", "diplomacy_2a"],
    });
    expect(isTechAvailable("diplomacy_food", tech)).toBe(true);
    expect(isTechAvailable("diplomacy_luxury", tech)).toBe(true);
  });
});

describe("instantUnlockOrQueue", () => {
  it("returns null for unavailable tech", () => {
    expect(instantUnlockOrQueue("logistics_hub", mkTech())).toBeNull();
  });

  it("instant unlocks when affordable", () => {
    const tech = mkTech({ researchPoints: 10 });
    const result = instantUnlockOrQueue("fuel_efficiency_1", tech);
    expect(result).not.toBeNull();
    expect(result!.purchaseCount["fuel_efficiency_1"]).toBe(1);
    expect(result!.completedTechIds).toContain("fuel_efficiency_1");
    expect(result!.researchPoints).toBe(6); // 10 - 4
  });

  it("queues when not affordable", () => {
    const tech = mkTech({ researchPoints: 2 });
    const result = instantUnlockOrQueue("fuel_efficiency_1", tech);
    expect(result).not.toBeNull();
    expect(result!.queue).toEqual(["fuel_efficiency_1"]);
    expect(result!.purchaseCount["fuel_efficiency_1"]).toBeUndefined();
    expect(result!.researchPoints).toBe(2); // unchanged
  });

  it("queues first item sets currentResearchId", () => {
    const tech = mkTech({ researchPoints: 0 });
    const result = instantUnlockOrQueue("fuel_efficiency_1", tech)!;
    expect(result.currentResearchId).toBe("fuel_efficiency_1");
  });
});

describe("reorderQueue", () => {
  it("moves item from front to back", () => {
    const tech = mkTech({ queue: ["a", "b", "c"], currentResearchId: "a" });
    const result = reorderQueue(tech, 0, 2);
    expect(result.queue).toEqual(["b", "c", "a"]);
    expect(result.currentResearchId).toBe("b");
  });
});

describe("removeFromQueue", () => {
  it("removes item at index", () => {
    const tech = mkTech({ queue: ["a", "b", "c"], currentResearchId: "a" });
    const result = removeFromQueue(tech, 0);
    expect(result.queue).toEqual(["b", "c"]);
    expect(result.currentResearchId).toBe("b");
  });

  it("empty queue after last removal", () => {
    const tech = mkTech({ queue: ["a"], currentResearchId: "a" });
    const result = removeFromQueue(tech, 0);
    expect(result.queue).toEqual([]);
    expect(result.currentResearchId).toBeNull();
  });
});

describe("processResearch", () => {
  const baseState = {
    activeRoutes: [],
    galaxy: { planets: [] },
    tech: mkTech({ researchPoints: 0, queue: ["fuel_efficiency_1"] }),
  } as unknown as Parameters<typeof processResearch>[0];

  it("accumulates RP", () => {
    const result = processResearch(baseState, 2);
    expect(result.researchPoints).toBe(2);
  });

  it("auto-completes when RP reaches cost", () => {
    const state = {
      ...baseState,
      tech: mkTech({ researchPoints: 1, queue: ["fuel_efficiency_1"] }),
    } as unknown as Parameters<typeof processResearch>[0];
    const result = processResearch(state, 3); // total 4 = cost
    expect(result.purchaseCount["fuel_efficiency_1"]).toBe(1);
    expect(result.queue).toEqual([]);
    expect(result.currentResearchId).toBeNull();
  });

  it("chains completions when multiple queue items become affordable", () => {
    // 2 cheap items in queue, 20 RP incoming
    const state = {
      ...baseState,
      tech: mkTech({
        researchPoints: 0,
        queue: ["fuel_efficiency_1", "crisis_hub"],
      }),
    } as unknown as Parameters<typeof processResearch>[0];
    // fuel_efficiency_1 costs 4, crisis_hub costs 6 → need 10 RP total
    const result = processResearch(state, 15);
    expect(result.purchaseCount["fuel_efficiency_1"]).toBe(1);
    expect(result.purchaseCount["crisis_hub"]).toBe(1);
    expect(result.queue).toEqual([]);
    expect(result.researchPoints).toBe(5); // 15 - 4 - 6
  });

  it("does not unlock if RP insufficient", () => {
    const result = processResearch(baseState, 2); // need 4, only get 2
    expect(result.purchaseCount["fuel_efficiency_1"]).toBeUndefined();
    expect(result.queue).toEqual(["fuel_efficiency_1"]);
  });
});
```

- [ ] **Step 2: Run tests.**

```bash
npm run test -- src/game/tech/__tests__/TechTree.test.ts
```

Expected: all pass.

- [ ] **Step 3: Commit.**

```bash
git add src/game/tech/__tests__/TechTree.test.ts
git commit -m "test(tech): rewrite TechTree tests for graph-based model"
```

---

## Task 5: Update `TechEffects.ts`

**Files:**

- Modify: `src/game/tech/TechEffects.ts`

- [ ] **Step 1: Replace the entire file. Key change: iterate `purchaseCount` instead of `completedTechIds`, multiply effect values by purchase count to handle repeatables.**

```typescript
import type { GameState, TechEffect } from "../../data/types.ts";
import { TECH_GRAPH } from "../../data/constants.ts";

// ---------------------------------------------------------------------------
// Core query — multiply effect by purchase count (handles repeatables)
// ---------------------------------------------------------------------------

export function getTechEffectTotal(
  state: GameState,
  effectType: TechEffect["type"],
  target?: "friendly" | "neutral" | "hostile" | "all",
): number {
  let total = 0;
  for (const node of TECH_GRAPH) {
    const count = state.tech.purchaseCount[node.id] ?? 0;
    if (count === 0) continue;
    for (const effect of node.effects) {
      if (effect.type !== effectType) continue;
      if (
        target &&
        effect.target &&
        effect.target !== target &&
        effect.target !== "all"
      )
        continue;
      total += effect.value * count;
    }
  }
  return total;
}

export function hasTechEffect(
  state: GameState,
  effectType: TechEffect["type"],
): boolean {
  for (const node of TECH_GRAPH) {
    const count = state.tech.purchaseCount[node.id] ?? 0;
    if (count === 0) continue;
    if (node.effects.some((e) => e.type === effectType)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Named getters (unchanged signatures — callers unaffected)
// ---------------------------------------------------------------------------

export function getTechRouteSlotBonus(state: GameState): number {
  return getTechEffectTotal(state, "addRouteSlots");
}

export function getLicenseFeeMultiplier(state: GameState): number {
  return 1 + getTechEffectTotal(state, "modifyLicenseFee");
}

export function getTariffMultiplier(
  state: GameState,
  disposition: "friendly" | "neutral" | "hostile",
): number {
  let total = 0;
  for (const node of TECH_GRAPH) {
    const count = state.tech.purchaseCount[node.id] ?? 0;
    if (count === 0) continue;
    for (const effect of node.effects) {
      if (effect.type !== "modifyTariff") continue;
      if (
        !effect.target ||
        effect.target === "all" ||
        effect.target === disposition
      ) {
        total += effect.value * count;
      }
    }
  }
  return Math.max(0, 1 + total);
}

export function getMaintenanceMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyMaintenance"));
}

export function getFuelMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyFuel"));
}

export function getRevenueMultiplier(state: GameState): number {
  return 1 + getTechEffectTotal(state, "modifyRevenue");
}

export function getConditionDecayMultiplier(state: GameState): number {
  return Math.max(0, 1 + getTechEffectTotal(state, "modifyConditionDecay"));
}

export function getAutoRepairPerTurn(state: GameState): number {
  return getTechEffectTotal(state, "addAutoRepair");
}

export function getIntraEmpireTripBonus(state: GameState): number {
  return getTechEffectTotal(state, "addTripsPerTurn");
}
```

- [ ] **Step 2: Run tests.**

```bash
npm run test -- src/game/tech/__tests__/TechEffects.test.ts
```

If TechEffects tests fail because they relied on `completedTechIds`, update the test fixtures to use `purchaseCount` instead. The test file will need its `mkState` helper to use:

```typescript
// In the test file, update the state factory from:
tech: { completedTechIds: ["logistics_1"], ... }
// To:
tech: {
  completedTechIds: ["logistics_hub"],
  purchaseCount: { logistics_hub: 1 },
  queue: [],
  researchPoints: 0,
  currentResearchId: null,
  researchProgress: 0,
}
// And use new node IDs from TECH_GRAPH (e.g. "logistics_hub" not "logistics_1")
```

- [ ] **Step 3: Run all tests.**

```bash
npm run test
```

Expected: TechTree + TechEffects pass. aiTechStep tests may fail — fixed in Task 6.

- [ ] **Step 4: Commit.**

```bash
git add src/game/tech/TechEffects.ts src/game/tech/__tests__/TechEffects.test.ts
git commit -m "feat(tech): update TechEffects to use purchaseCount with repeat multiplier"
```

---

## Task 6: Rewrite `aiTechStep.ts`

**Files:**

- Modify: `src/game/ai/steps/aiTechStep.ts`

- [ ] **Step 1: Replace the entire file.**

```typescript
import type { AICompany, GameState, TechState } from "../../../data/types.ts";
import { TECH_GRAPH, AI_TECH_STRATEGIES } from "../../../data/constants.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";
import { isTechAvailable, effectiveCost } from "../../tech/TechTree.ts";

// AI earns RP each turn (flat — no diversity bonus complexity)
const AI_RP_PER_TURN = 1;

/**
 * Apply a purchase to an AI company's TechState.
 * Mirrors applyPurchase from TechTree.ts but operates on a standalone TechState.
 */
function applyAIPurchase(techId: string, tech: TechState): TechState {
  const cost = effectiveCost(techId, tech);
  const newCount = (tech.purchaseCount[techId] ?? 0) + 1;
  const newCompletedIds =
    newCount === 1 ? [...tech.completedTechIds, techId] : tech.completedTechIds;
  return {
    ...tech,
    researchPoints: tech.researchPoints - cost,
    purchaseCount: { ...tech.purchaseCount, [techId]: newCount },
    completedTechIds: newCompletedIds,
  };
}

/**
 * Find the next tech the AI should buy based on its pre-authored strategy.
 * If a tech ID appears multiple times in the strategy array, the AI buys it
 * that many times before advancing.
 */
function getNextStrategyTarget(
  strategy: string[],
  tech: TechState,
): string | null {
  const purchased: Record<string, number> = {};
  for (const id of strategy) {
    purchased[id] = (purchased[id] ?? 0) + 1;
    const actual = tech.purchaseCount[id] ?? 0;
    if (actual < purchased[id]) return id;
  }
  return null; // strategy complete
}

/**
 * Process AI tech for one simulation turn.
 * Initialises techState if missing, accumulates RP, buys next strategy item
 * if affordable, then has a 10% chance to grab a cheap adjacent node.
 */
export function processAITech(
  company: AICompany,
  _state: GameState,
  rng: SeededRNG,
): AICompany {
  let tech: TechState = company.techState ?? {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
  };

  // Accumulate RP
  tech = { ...tech, researchPoints: tech.researchPoints + AI_RP_PER_TURN };

  // Follow strategy
  const strategy =
    AI_TECH_STRATEGIES[company.personality] ??
    AI_TECH_STRATEGIES["aggressiveExpander"]!;
  const nextId = getNextStrategyTarget(strategy, tech);
  if (nextId && isTechAvailable(nextId, tech)) {
    const cost = effectiveCost(nextId, tech);
    if (tech.researchPoints >= cost) {
      tech = applyAIPurchase(nextId, tech);
    }
  }

  // 10% chance to grab any cheap adjacent available node (organic feel)
  if (rng.next() < 0.1) {
    const candidates = TECH_GRAPH.filter(
      (n) => n.rpCost <= 8 && n.id !== nextId && isTechAvailable(n.id, tech),
    );
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(rng.next() * candidates.length)];
      const cost = effectiveCost(pick.id, tech);
      if (tech.researchPoints >= cost) {
        tech = applyAIPurchase(pick.id, tech);
      }
    }
  }

  return {
    ...company,
    techState: {
      ...tech,
      currentResearchId: null,
      researchProgress: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Effect helpers — used by simulation steps to apply AI tech bonuses
// ---------------------------------------------------------------------------

function sumEffects(
  techState: TechState,
  type: "modifyMaintenance" | "modifyFuel" | "modifyRevenue",
): number {
  let total = 0;
  for (const node of TECH_GRAPH) {
    const count = techState.purchaseCount[node.id] ?? 0;
    if (count === 0) continue;
    for (const effect of node.effects) {
      if (effect.type === type) total += effect.value * count;
    }
  }
  return total;
}

export function getAIMaintenanceMultiplier(techState: TechState): number {
  return Math.max(0, 1 + sumEffects(techState, "modifyMaintenance"));
}

export function getAIFuelMultiplier(techState: TechState): number {
  return Math.max(0, 1 + sumEffects(techState, "modifyFuel"));
}

export function getAIRevenueMultiplier(techState: TechState): number {
  return 1 + sumEffects(techState, "modifyRevenue");
}

// Kept for backwards compat — was used by old aiTechStep to branch by personality
export { getAIMaintenanceMultiplier as getAITechBranch };
```

- [ ] **Step 2: Run typecheck.**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Run all tests.**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 4: Commit.**

```bash
git add src/game/ai/steps/aiTechStep.ts
git commit -m "feat(tech): rewrite aiTechStep to follow AI_TECH_STRATEGIES arrays"
```

---

## Task 7: Create `TechGraphCanvas.ts`

**Files:**

- Create: `src/ui/TechGraphCanvas.ts`

- [ ] **Step 1: Create the file.**

```typescript
import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import type { TechBranch as TechBranchValue } from "../data/types.ts";
import { TechBranch } from "../data/types.ts";
import { TECH_GRAPH } from "../data/constants.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TechNodeDisplayState =
  | "locked"
  | "available"
  | "queued"
  | "owned"
  | "available-repeat";

export interface TechGraphState {
  purchaseCount: Record<string, number>;
  queue: string[];
  isAvailable: (techId: string) => boolean;
}

export interface TechGraphCanvasConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect?: (techId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_SPACING = 130;
const NODE_SIZE = 60;

export const BRANCH_LABELS: Record<TechBranchValue, string> = {
  [TechBranch.Logistics]: "Logistics",
  [TechBranch.Diplomacy]: "Diplomacy",
  [TechBranch.Engineering]: "Engineering",
  [TechBranch.Intelligence]: "Intelligence",
  [TechBranch.Crisis]: "Crisis Mgmt",
};

const BRANCH_COLORS: Record<TechBranchValue, number> = {
  [TechBranch.Logistics]: 0x4fc3f7,
  [TechBranch.Diplomacy]: 0xffd54f,
  [TechBranch.Engineering]: 0xff8a65,
  [TechBranch.Intelligence]: 0xce93d8,
  [TechBranch.Crisis]: 0xef5350,
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface NodeView {
  techId: string;
  glow: Phaser.GameObjects.Rectangle;
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  glowTween: Phaser.Tweens.Tween | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Radial tech graph canvas with pan (drag) and zoom (scroll wheel).
 * All nodes and edges live in a `graphGroup` Container that is translated
 * and scaled for pan/zoom. The canvas starts centered on the center node.
 */
export class TechGraphCanvas extends Phaser.GameObjects.Container {
  private canvasWidth: number;
  private canvasHeight: number;
  private graphGroup: Phaser.GameObjects.Container;
  private edgeLayer: Phaser.GameObjects.Container;
  private nodeLayer: Phaser.GameObjects.Container;
  private nodeViews = new Map<string, NodeView>();
  private edgeList: Array<{
    line: Phaser.GameObjects.Line;
    aId: string;
    bId: string;
  }> = [];

  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  private currentState: TechGraphState | null = null;
  readonly onSelect?: (techId: string) => void;

  constructor(scene: Phaser.Scene, config: TechGraphCanvasConfig) {
    super(scene, config.x, config.y);
    this.canvasWidth = config.width;
    this.canvasHeight = config.height;
    this.onSelect = config.onSelect;

    // Transparent background rect — drag target, blocks clicks from reaching
    // game objects behind the canvas
    const bgHit = scene.add
      .rectangle(
        config.width / 2,
        config.height / 2,
        config.width,
        config.height,
        0x000000,
        0,
      )
      .setInteractive({ useHandCursor: false });
    this.add(bgHit);

    // Graph group: translated/scaled for pan + zoom
    this.graphGroup = scene.add.container(config.width / 2, config.height / 2);
    this.edgeLayer = scene.add.container(0, 0);
    this.nodeLayer = scene.add.container(0, 0);
    this.graphGroup.add([this.edgeLayer, this.nodeLayer]);
    this.add(this.graphGroup);

    this.buildGraph();
    this.setupPanZoom(bgHit);

    scene.add.existing(this);
  }

  // ── Coordinate helpers ──────────────────────────────────────────────────

  private polarToXY(angle: number, radius: number): { x: number; y: number } {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius * RING_SPACING,
      y: Math.sin(rad) * radius * RING_SPACING,
    };
  }

  // ── Graph construction (one-time) ───────────────────────────────────────

  private buildGraph(): void {
    const theme = getTheme();

    // ── Edges first (so they render beneath nodes) ──
    const drawnEdges = new Set<string>();
    for (const node of TECH_GRAPH) {
      const pos = this.polarToXY(node.position.angle, node.position.radius);
      for (const edgeId of node.edges) {
        const key = [node.id, edgeId].sort().join("|");
        if (drawnEdges.has(key)) continue;
        drawnEdges.add(key);

        const other = TECH_GRAPH.find((n) => n.id === edgeId);
        if (!other) continue;
        const otherPos = this.polarToXY(
          other.position.angle,
          other.position.radius,
        );

        const line = this.scene.add
          .line(0, 0, pos.x, pos.y, otherPos.x, otherPos.y, 0x333333, 0.5)
          .setOrigin(0, 0);
        this.edgeLayer.add(line);
        this.edgeList.push({ line, aId: node.id, bId: edgeId });
      }
    }

    // ── Nodes ──
    for (const node of TECH_GRAPH) {
      const pos = this.polarToXY(node.position.angle, node.position.radius);
      const branchColor = BRANCH_COLORS[node.branch] ?? 0x888888;

      const glow = this.scene.add
        .rectangle(
          pos.x,
          pos.y,
          NODE_SIZE + 8,
          NODE_SIZE + 8,
          branchColor,
          0.15,
        )
        .setVisible(false);
      this.nodeLayer.add(glow);

      const bg = this.scene.add
        .rectangle(pos.x, pos.y, NODE_SIZE, NODE_SIZE, 0x0a0a1a, 0.95)
        .setStrokeStyle(1, 0x333333, 0.3);
      this.nodeLayer.add(bg);

      const icon = this.scene.add
        .text(pos.x, pos.y - 9, node.icon, { fontSize: "20px" })
        .setOrigin(0.5, 0.5);
      this.nodeLayer.add(icon);

      const name = this.scene.add
        .text(pos.x, pos.y + 12, node.name, {
          fontSize: "8px",
          fontFamily: theme.fonts.caption.family,
          color: colorToString(0x555555),
          wordWrap: { width: NODE_SIZE - 6 },
          align: "center",
        })
        .setOrigin(0.5, 0);
      this.nodeLayer.add(name);

      const badge = this.scene.add
        .text(pos.x + NODE_SIZE / 2 - 3, pos.y + NODE_SIZE / 2 - 3, "", {
          fontSize: "7px",
          fontFamily: theme.fonts.caption.family,
          color: colorToString(0x444444),
        })
        .setOrigin(1, 1)
        .setVisible(false);
      this.nodeLayer.add(badge);

      const hitArea = this.scene.add
        .rectangle(pos.x, pos.y, NODE_SIZE, NODE_SIZE, 0x000000, 0)
        .setInteractive({ useHandCursor: false });
      this.nodeLayer.add(hitArea);

      hitArea.on("pointerup", () => {
        if (this.onSelect) this.onSelect(node.id);
      });
      hitArea.on("pointerover", () => {
        if (bg.input) bg.setStrokeStyle(2, 0xffffff, 0.5);
      });
      hitArea.on("pointerout", () => {
        // Stroke will be restored on next setGraphState / applyDisplayState
        if (this.currentState) {
          const ds = this.computeDisplayState(node.id, this.currentState);
          this.applyStroke(bg, ds, branchColor);
        }
      });

      this.nodeViews.set(node.id, {
        techId: node.id,
        glow,
        bg,
        icon,
        name,
        badge,
        hitArea,
        glowTween: null,
      });
    }
  }

  // ── Pan / Zoom ──────────────────────────────────────────────────────────

  private setupPanZoom(bgHit: Phaser.GameObjects.Rectangle): void {
    bgHit.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = ptr.x - this.x - this.panX;
      this.dragStartY = ptr.y - this.y - this.panY;
    });

    this.scene.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.panX = ptr.x - this.x - this.dragStartX;
      this.panY = ptr.y - this.y - this.dragStartY;
      this.graphGroup.setPosition(
        this.canvasWidth / 2 + this.panX,
        this.canvasHeight / 2 + this.panY,
      );
    });

    this.scene.input.on("pointerup", () => {
      this.isDragging = false;
    });

    this.scene.input.on(
      "wheel",
      (
        _ptr: Phaser.Input.Pointer,
        _objs: unknown,
        _dx: number,
        deltaY: number,
      ) => {
        const ptr = this.scene.input.activePointer;
        const oldZoom = this.zoom;
        this.zoom = Phaser.Math.Clamp(this.zoom - deltaY * 0.001, 0.4, 1.4);
        const factor = this.zoom / oldZoom;
        // Cursor-anchored zoom: keep hovered point stable
        const cursorLocalX = ptr.x - this.x - this.canvasWidth / 2 - this.panX;
        const cursorLocalY = ptr.y - this.y - this.canvasHeight / 2 - this.panY;
        this.panX -= cursorLocalX * (factor - 1);
        this.panY -= cursorLocalY * (factor - 1);
        this.graphGroup.setPosition(
          this.canvasWidth / 2 + this.panX,
          this.canvasHeight / 2 + this.panY,
        );
        this.graphGroup.setScale(this.zoom);
      },
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────

  public resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.graphGroup.setPosition(this.canvasWidth / 2, this.canvasHeight / 2);
    this.graphGroup.setScale(1);
  }

  public resizeCanvas(width: number, height: number): this {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.graphGroup.setPosition(width / 2 + this.panX, height / 2 + this.panY);
    return this;
  }

  public setGraphState(state: TechGraphState): this {
    this.currentState = state;
    for (const [techId, view] of this.nodeViews) {
      const ds = this.computeDisplayState(techId, state);
      this.applyDisplayState(view, ds, state);
    }
    this.refreshEdgeColors(state);
    return this;
  }

  // ── Display state helpers ───────────────────────────────────────────────

  private computeDisplayState(
    techId: string,
    state: TechGraphState,
  ): TechNodeDisplayState {
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) return "locked";
    const count = state.purchaseCount[techId] ?? 0;
    if (state.queue.includes(techId)) return "queued";
    if (count > 0 && node.repeatable && state.isAvailable(techId))
      return "available-repeat";
    if (count > 0) return "owned";
    if (state.isAvailable(techId)) return "available";
    return "locked";
  }

  private applyDisplayState(
    view: NodeView,
    ds: TechNodeDisplayState,
    state: TechGraphState,
  ): void {
    const node = TECH_GRAPH.find((n) => n.id === view.techId);
    if (!node) return;
    const theme = getTheme();
    const branchColor = BRANCH_COLORS[node.branch] ?? 0x888888;
    const count = state.purchaseCount[view.techId] ?? 0;

    // Background fill + stroke
    switch (ds) {
      case "locked":
        view.bg.setFillStyle(0x0a0a1a, 0.95);
        view.icon.setAlpha(0.25);
        view.name.setColor(colorToString(0x444444));
        view.badge.setVisible(false);
        view.hitArea.disableInteractive();
        break;
      case "available":
        view.bg.setFillStyle(0x111128, 0.95);
        view.icon.setAlpha(1);
        view.name.setColor(colorToString(theme.colors.text));
        view.badge.setText(`${node.rpCost} RP`).setVisible(true);
        view.badge.setColor(colorToString(theme.colors.accent));
        view.hitArea.setInteractive({ useHandCursor: true });
        break;
      case "queued": {
        view.bg.setFillStyle(0x111128, 0.95);
        view.icon.setAlpha(1);
        view.name.setColor(colorToString(theme.colors.text));
        const qIdx = state.queue.indexOf(view.techId) + 1;
        view.badge.setText(`#${qIdx}`).setVisible(true);
        view.badge.setColor(colorToString(branchColor));
        view.hitArea.setInteractive({ useHandCursor: true });
        this.startGlow(view, branchColor);
        break;
      }
      case "owned":
        view.bg.setFillStyle(branchColor, 0.18);
        view.icon.setAlpha(1);
        view.name.setColor(colorToString(branchColor));
        view.badge.setText("✓").setVisible(true);
        view.badge.setColor(colorToString(theme.colors.profit));
        view.hitArea.disableInteractive();
        this.stopGlow(view);
        break;
      case "available-repeat": {
        view.bg.setFillStyle(branchColor, 0.18);
        view.icon.setAlpha(1);
        view.name.setColor(colorToString(branchColor));
        const scale = node.repeatCostScale ?? 1;
        const repeatCost = Math.round(node.rpCost * Math.pow(scale, count));
        view.badge.setText(`×${count + 1} ${repeatCost}RP`).setVisible(true);
        view.badge.setColor(colorToString(theme.colors.accent));
        view.hitArea.setInteractive({ useHandCursor: true });
        break;
      }
    }

    this.applyStroke(view.bg, ds, branchColor);
    if (ds !== "queued") this.stopGlow(view);
  }

  private applyStroke(
    bg: Phaser.GameObjects.Rectangle,
    ds: TechNodeDisplayState,
    branchColor: number,
  ): void {
    switch (ds) {
      case "locked":
        bg.setStrokeStyle(1, 0x333333, 0.3);
        break;
      case "available":
      case "available-repeat":
        bg.setStrokeStyle(2, branchColor, 0.6);
        break;
      case "queued":
        bg.setStrokeStyle(2, branchColor, 1.0);
        break;
      case "owned":
        bg.setStrokeStyle(2, branchColor, 0.9);
        break;
    }
  }

  private startGlow(view: NodeView, color: number): void {
    view.glow.setFillStyle(color, 0.15).setVisible(true);
    if (!view.glowTween) {
      view.glowTween = this.scene.tweens.add({
        targets: view.glow,
        alpha: { from: 0.08, to: 0.3 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private stopGlow(view: NodeView): void {
    view.glow.setVisible(false);
    if (view.glowTween) {
      view.glowTween.stop();
      view.glowTween = null;
    }
  }

  private refreshEdgeColors(state: TechGraphState): void {
    for (const { line, aId, bId } of this.edgeList) {
      const ownedA = (state.purchaseCount[aId] ?? 0) > 0;
      const ownedB = (state.purchaseCount[bId] ?? 0) > 0;
      const nodeA = TECH_GRAPH.find((n) => n.id === aId);
      const color = nodeA
        ? (BRANCH_COLORS[nodeA.branch] ?? 0x333333)
        : 0x333333;
      if (ownedA || ownedB) {
        line.setStrokeStyle(2, color, 0.7);
      } else {
        line.setStrokeStyle(1, 0x333333, 0.4);
      }
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  override destroy(fromScene?: boolean): void {
    this.scene.input.off("pointermove");
    this.scene.input.off("pointerup");
    this.scene.input.off("wheel");
    for (const view of this.nodeViews.values()) {
      if (view.glowTween) {
        view.glowTween.stop();
        view.glowTween = null;
      }
    }
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 2: Run typecheck.**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/ui/TechGraphCanvas.ts
git commit -m "feat(ui): add TechGraphCanvas — radial pan/zoom tech graph"
```

---

## Task 8: Create `TechQueueRow.ts` and smoke tests

**Files:**

- Create: `src/ui/TechQueueRow.ts`
- Create: `src/ui/__tests__/TechQueueRow.test.ts`
- Create: `src/ui/__tests__/TechGraphCanvas.test.ts`

- [ ] **Step 1: Create `src/ui/TechQueueRow.ts`.**

```typescript
import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import { TECH_GRAPH } from "../data/constants.ts";
import type { Technology } from "../data/types.ts";
import { effectiveCost } from "../game/tech/TechTree.ts";
import type { TechState } from "../data/types.ts";

export interface TechQueueRowConfig {
  x: number;
  y: number;
  width: number;
  height: number; // ~72px recommended
  onRemove?: (index: number) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
}

const TILE_SIZE = 52;
const TILE_GAP = 6;

interface QueueTile {
  container: Phaser.GameObjects.Container;
  progressBg: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
}

/**
 * Horizontal strip showing queued techs. Each tile has:
 * - Icon + name + cost badge
 * - Progress bar under the first tile (active research)
 * - ◀ / ▶ arrows to reorder, ✕ to remove
 */
export class TechQueueRow extends Phaser.GameObjects.Container {
  private rowWidth: number;
  private rowHeight: number;
  private tiles: QueueTile[] = [];
  private emptyLabel: Phaser.GameObjects.Text;

  private readonly onRemove?: (i: number) => void;
  private readonly onMoveLeft?: (i: number) => void;
  private readonly onMoveRight?: (i: number) => void;

  constructor(scene: Phaser.Scene, config: TechQueueRowConfig) {
    super(scene, config.x, config.y);
    this.rowWidth = config.width;
    this.rowHeight = config.height;
    this.onRemove = config.onRemove;
    this.onMoveLeft = config.onMoveLeft;
    this.onMoveRight = config.onMoveRight;

    // Background strip
    const bg = scene.add
      .rectangle(
        config.width / 2,
        config.height / 2,
        config.width,
        config.height,
        0x0a0a1a,
        0.5,
      )
      .setStrokeStyle(1, 0x222244, 0.8);
    this.add(bg);

    const theme = getTheme();
    this.emptyLabel = scene.add
      .text(
        config.width / 2,
        config.height / 2,
        "Click an available node to queue research",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(0x444466),
        },
      )
      .setOrigin(0.5, 0.5);
    this.add(this.emptyLabel);

    scene.add.existing(this);
  }

  /** Rebuild tiles from current queue + TechState. */
  public setQueueState(queue: string[], tech: TechState): void {
    // Destroy old tiles
    for (const tile of this.tiles) {
      tile.container.destroy();
    }
    this.tiles = [];

    this.emptyLabel.setVisible(queue.length === 0);

    const theme = getTheme();
    const startX = 8;

    for (let i = 0; i < queue.length; i++) {
      const techId = queue[i];
      const node = TECH_GRAPH.find((n) => n.id === techId);
      if (!node) continue;

      const tileX = startX + i * (TILE_SIZE + TILE_GAP);
      const tileContainer = this.scene.add.container(tileX, 4);
      this.add(tileContainer);

      // Tile background
      const tileBg = this.scene.add
        .rectangle(
          TILE_SIZE / 2,
          TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          0x111128,
          0.95,
        )
        .setStrokeStyle(1, 0x2a2a5a, 0.8);
      tileContainer.add(tileBg);

      // Icon
      tileContainer.add(
        this.scene.add
          .text(TILE_SIZE / 2, 12, node.icon, { fontSize: "16px" })
          .setOrigin(0.5, 0),
      );

      // Name (truncated)
      const displayName =
        node.name.length > 10 ? node.name.slice(0, 9) + "…" : node.name;
      tileContainer.add(
        this.scene.add
          .text(TILE_SIZE / 2, 30, displayName, {
            fontSize: "7px",
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.text),
            align: "center",
            wordWrap: { width: TILE_SIZE - 4 },
          })
          .setOrigin(0.5, 0),
      );

      // Cost badge
      const cost = effectiveCost(techId, tech);
      tileContainer.add(
        this.scene.add
          .text(TILE_SIZE - 2, TILE_SIZE - 2, `${cost}RP`, {
            fontSize: "7px",
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.accent),
          })
          .setOrigin(1, 1),
      );

      // ✕ remove button
      const removeBtn = this.scene.add
        .text(TILE_SIZE - 1, 1, "✕", {
          fontSize: "9px",
          color: colorToString(0x884444),
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      removeBtn.on("pointerup", () => {
        if (this.onRemove) this.onRemove(i);
      });
      removeBtn.on("pointerover", () => removeBtn.setColor("#ff6666"));
      removeBtn.on("pointerout", () =>
        removeBtn.setColor(colorToString(0x884444)),
      );
      tileContainer.add(removeBtn);

      // ◀ / ▶ reorder arrows (not shown for single-item queue)
      if (queue.length > 1) {
        if (i > 0) {
          const leftArrow = this.scene.add
            .text(1, TILE_SIZE / 2, "◀", {
              fontSize: "9px",
              color: colorToString(0x555577),
            })
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });
          leftArrow.on("pointerup", () => {
            if (this.onMoveLeft) this.onMoveLeft(i);
          });
          tileContainer.add(leftArrow);
        }
        if (i < queue.length - 1) {
          const rightArrow = this.scene.add
            .text(TILE_SIZE - 1, TILE_SIZE / 2, "▶", {
              fontSize: "9px",
              color: colorToString(0x555577),
            })
            .setOrigin(1, 0.5)
            .setInteractive({ useHandCursor: true });
          rightArrow.on("pointerup", () => {
            if (this.onMoveRight) this.onMoveRight(i);
          });
          tileContainer.add(rightArrow);
        }
      }

      // Progress bar (first tile only = active research)
      const progressBg = this.scene.add.rectangle(
        TILE_SIZE / 2,
        TILE_SIZE + 4,
        TILE_SIZE,
        4,
        0x222244,
        1,
      );
      const progressFill = this.scene.add
        .rectangle(0, TILE_SIZE + 4, 0, 4, 0x00ffcc, i === 0 ? 1 : 0)
        .setOrigin(0, 0.5);

      tileContainer.add([progressBg, progressFill]);

      if (i === 0) {
        const cost2 = effectiveCost(techId, tech);
        const fraction =
          cost2 > 0 ? Math.min(1, tech.researchPoints / cost2) : 0;
        progressFill.setSize(Math.max(0, TILE_SIZE * fraction), 4);
        progressFill.setAlpha(1);
      }

      this.tiles.push({ container: tileContainer, progressBg, progressFill });
    }
  }

  public resizeRow(width: number, height: number): void {
    this.rowWidth = width;
    this.rowHeight = height;
  }
}
```

- [ ] **Step 2: Create smoke tests for TechQueueRow.**

```typescript
// src/ui/__tests__/TechQueueRow.test.ts
import { describe, it, expect } from "vitest";

describe("TechQueueRow (smoke)", () => {
  it("module imports without error", async () => {
    const mod = await import("../TechQueueRow.ts");
    expect(mod.TechQueueRow).toBeDefined();
  });
});
```

- [ ] **Step 3: Create smoke tests for TechGraphCanvas.**

```typescript
// src/ui/__tests__/TechGraphCanvas.test.ts
import { describe, it, expect } from "vitest";

describe("TechGraphCanvas (smoke)", () => {
  it("module imports without error", async () => {
    const mod = await import("../TechGraphCanvas.ts");
    expect(mod.TechGraphCanvas).toBeDefined();
    expect(mod.BRANCH_LABELS).toBeDefined();
    expect(Object.keys(mod.BRANCH_LABELS)).toHaveLength(5);
  });
});
```

- [ ] **Step 4: Run tests.**

```bash
npm run test -- src/ui/__tests__/TechQueueRow.test.ts src/ui/__tests__/TechGraphCanvas.test.ts
```

Expected: both pass.

- [ ] **Step 5: Commit.**

```bash
git add src/ui/TechQueueRow.ts src/ui/__tests__/TechQueueRow.test.ts src/ui/__tests__/TechGraphCanvas.test.ts
git commit -m "feat(ui): add TechQueueRow component with reorder/remove controls"
```

---

## Task 9: Rewrite `TechTreeScene.ts`

**Files:**

- Modify: `src/scenes/TechTreeScene.ts`

- [ ] **Step 1: Replace the entire file.**

```typescript
import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Button,
  Panel,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  Modal,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
import { TechGraphCanvas, BRANCH_LABELS } from "../ui/TechGraphCanvas.ts";
import { TechQueueRow } from "../ui/TechQueueRow.ts";
import {
  isTechAvailable,
  instantUnlockOrQueue,
  reorderQueue,
  removeFromQueue,
  getCurrentResearch,
  getResearchProgress,
  calculateRPPerTurn,
  effectiveCost,
} from "../game/tech/TechTree.ts";
import { TECH_GRAPH } from "../data/constants.ts";

const QUEUE_ROW_HEIGHT = 72;

export class TechTreeScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private mainPanel!: Panel;
  private canvas!: TechGraphCanvas;
  private queueRow!: TechQueueRow;
  private rpStatusText!: Phaser.GameObjects.Text;
  private unlockButton!: Button;
  private selectedTechId: string | null = null;

  constructor() {
    super({ key: "TechTreeScene" });
  }

  create(): void {
    this.selectedTechId = null;
    new SceneUiDirector(this);
    const L = getLayout();
    const theme = getTheme();

    createStarfield(this);

    // ── Sidebar portrait ──
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portrait.updatePortrait(
      "event",
      0,
      "Research Lab",
      [
        { label: "Info", value: "Select a node to view details." },
        { label: "", value: "Pan and zoom to explore the tree." },
        { label: "", value: "Click a node to see its effects." },
      ],
      { eventCategory: "opportunity" },
    );

    // ── Main panel ──
    this.mainPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Research & Technology",
    });

    // ── RP status ──
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);
    this.rpStatusText = this.add.text(
      0,
      0,
      this.buildRPStatusText(state, rpPerTurn),
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
      },
    );

    // ── TechGraphCanvas ──
    this.canvas = new TechGraphCanvas(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => {
        this.selectedTechId = techId;
        this.updatePortraitForSelection();
        this.updateUnlockButton();
      },
    });
    this.canvas.setGraphState(this.buildGraphState());

    // ── Queue row ──
    this.queueRow = new TechQueueRow(this, {
      x: 0,
      y: 0,
      width: 100,
      height: QUEUE_ROW_HEIGHT,
      onRemove: (i) => this.handleQueueRemove(i),
      onMoveLeft: (i) => this.handleQueueReorder(i, i - 1),
      onMoveRight: (i) => this.handleQueueReorder(i, i + 1),
    });
    this.queueRow.setQueueState(state.tech.queue, state.tech);

    // ── Unlock button (in sidebar area, below portrait) ──
    this.unlockButton = new Button(this, {
      x: 0,
      y: 0,
      autoWidth: true,
      label: "Select a node",
      disabled: true,
      onClick: () => this.handleUnlock(),
    });

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;

    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(L.mainContentWidth, contentHeight);

    const panelX = L.mainContentLeft;
    const panelY = contentTop;
    const panelW = L.mainContentWidth;
    const panelH = contentHeight;

    // RP status line
    this.rpStatusText.setPosition(panelX + 16, panelY + 44);

    // Canvas fills from status line to above queue row
    const canvasTop = panelY + 62;
    const canvasHeight = panelH - 62 - QUEUE_ROW_HEIGHT - 8;
    this.canvas.setPosition(panelX + 8, canvasTop);
    this.canvas.resizeCanvas(panelW - 16, canvasHeight);

    // Queue row at bottom of main panel
    const queueY = panelY + panelH - QUEUE_ROW_HEIGHT - 8;
    this.queueRow.setPosition(panelX + 8, queueY);
    this.queueRow.resizeRow(panelW - 16, QUEUE_ROW_HEIGHT);

    // Unlock button in sidebar below portrait content
    const btnY = contentTop + contentHeight - 52;
    this.unlockButton.setPosition(L.sidebarLeft + 12, btnY);

    this.updateUnlockButton();
  }

  // ── Portrait ─────────────────────────────────────────────────────────────

  private updatePortraitForSelection(): void {
    if (!this.selectedTechId) return;
    const node = TECH_GRAPH.find((n) => n.id === this.selectedTechId);
    if (!node) return;

    const state = gameStore.getState();
    const count = state.tech.purchaseCount[this.selectedTechId] ?? 0;
    const inQueue = state.tech.queue.includes(this.selectedTechId);
    const available = isTechAvailable(this.selectedTechId, state.tech);
    const cost = effectiveCost(this.selectedTechId, state.tech);

    let statusLine: string;
    if (inQueue) {
      const pos = state.tech.queue.indexOf(this.selectedTechId) + 1;
      statusLine = `⏳ Queued (#${pos})`;
    } else if (count > 0 && !node.repeatable) {
      statusLine = "✓ Completed";
    } else if (count > 0 && node.repeatable) {
      statusLine = available ? `★ ×${count} owned — buy again` : "⏳ In queue";
    } else if (available) {
      statusLine = "★ Available";
    } else {
      statusLine = "🔒 Locked — unlock a neighbor first";
    }

    const repeatNote = node.repeatable
      ? ` (repeatable, ×${(node.repeatCostScale ?? 1).toFixed(1)} per buy)`
      : "";

    this.portrait.updatePortrait(
      "event",
      0,
      `${node.icon} ${node.name}`,
      [
        { label: "Branch", value: BRANCH_LABELS[node.branch] },
        { label: "Cost", value: `${cost} RP${repeatNote}` },
        { label: "Status", value: statusLine },
        { label: "Effect", value: node.description },
      ],
      { eventCategory: "opportunity" },
    );
  }

  // ── Unlock button ─────────────────────────────────────────────────────

  private updateUnlockButton(): void {
    if (!this.selectedTechId) {
      this.unlockButton.setDisabled(true);
      this.unlockButton.setLabel("Select a node");
      return;
    }
    const state = gameStore.getState();
    const available = isTechAvailable(this.selectedTechId, state.tech);

    if (!available) {
      this.unlockButton.setDisabled(true);
      this.unlockButton.setLabel("Locked");
      return;
    }

    const cost = effectiveCost(this.selectedTechId, state.tech);
    const canAfford = state.tech.researchPoints >= cost;
    this.unlockButton.setDisabled(false);
    this.unlockButton.setLabel(
      canAfford ? `Unlock — ${cost} RP` : `Queue — ${cost} RP`,
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────

  private handleUnlock(): void {
    if (!this.selectedTechId) return;
    const state = gameStore.getState();

    // Warn if switching research
    const currentResearch = getCurrentResearch(state.tech);
    const isQueuing =
      state.tech.researchPoints <
      effectiveCost(this.selectedTechId, state.tech);
    if (isQueuing && currentResearch && state.tech.queue.length > 0) {
      // Just append — no confirmation needed for queue additions
    } else if (!isQueuing && currentResearch) {
      const newTech = instantUnlockOrQueue(this.selectedTechId, state.tech);
      if (newTech) {
        gameStore.setState({ ...state, tech: newTech });
        this.refreshUi();
      }
      return;
    }

    const newTech = instantUnlockOrQueue(this.selectedTechId, state.tech);
    if (newTech) {
      gameStore.setState({ ...state, tech: newTech });
      this.refreshUi();
    }
  }

  private handleQueueRemove(index: number): void {
    const state = gameStore.getState();
    const newTech = removeFromQueue(state.tech, index);
    gameStore.setState({ ...state, tech: newTech });
    this.refreshUi();
  }

  private handleQueueReorder(fromIdx: number, toIdx: number): void {
    const state = gameStore.getState();
    if (toIdx < 0 || toIdx >= state.tech.queue.length) return;
    const newTech = reorderQueue(state.tech, fromIdx, toIdx);
    gameStore.setState({ ...state, tech: newTech });
    this.refreshUi();
  }

  // ── State builders ────────────────────────────────────────────────────

  private buildGraphState() {
    const state = gameStore.getState();
    return {
      purchaseCount: state.tech.purchaseCount,
      queue: state.tech.queue,
      isAvailable: (techId: string) => isTechAvailable(techId, state.tech),
    };
  }

  private buildRPStatusText(
    state: ReturnType<typeof gameStore.getState>,
    rpPerTurn: number,
  ): string {
    const owned = Object.values(state.tech.purchaseCount).filter(
      (c) => c > 0,
    ).length;
    return `RP: ${state.tech.researchPoints}  •  +${rpPerTurn}/turn  •  Owned: ${owned} / ${TECH_GRAPH.length}`;
  }

  // ── Refresh ───────────────────────────────────────────────────────────

  private refreshUi(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);

    this.rpStatusText.setText(this.buildRPStatusText(state, rpPerTurn));
    this.canvas.setGraphState(this.buildGraphState());
    this.queueRow.setQueueState(state.tech.queue, state.tech);
    this.updatePortraitForSelection();
    this.updateUnlockButton();
  }
}
```

- [ ] **Step 2: Run typecheck.**

```bash
npm run typecheck
```

Fix any type errors before committing. Common issues:

- `Button.setLabel()` — check if the method exists; if not, use `this.unlockButton.destroy(); this.unlockButton = new Button(...)` or check the Button API in `src/ui/Button.ts`.

- [ ] **Step 3: Commit.**

```bash
git add src/scenes/TechTreeScene.ts
git commit -m "feat(scene): rewrite TechTreeScene — radial graph canvas + queue row"
```

---

## Task 10: Cleanup, exports, migration shim, final CI check

**Files:**

- Modify: `src/ui/index.ts`
- Delete: `src/ui/TechTreeGrid.ts`
- Delete: `src/ui/__tests__/TechTreeGrid.test.ts`
- Find and modify: save/load file (search for `completedTechIds` in save loader)

- [ ] **Step 1: Update `src/ui/index.ts` — export new components, remove TechTreeGrid.**

Find the line(s) exporting `TechTreeGrid` and replace with the new exports:

```typescript
// Remove:
export { TechTreeGrid, BRANCH_LABELS } from "./TechTreeGrid.ts";

// Add:
export { TechGraphCanvas, BRANCH_LABELS } from "./TechGraphCanvas.ts";
export { TechQueueRow } from "./TechQueueRow.ts";
```

- [ ] **Step 2: Delete TechTreeGrid files.**

```bash
rm src/ui/TechTreeGrid.ts
rm src/ui/__tests__/TechTreeGrid.test.ts
```

- [ ] **Step 3: Find the save/load file and add a migration shim.**

Search for the save loader:

```bash
grep -rn "completedTechIds\|loadSave\|parseSave\|fromJSON\|localStorage" src/ --include="*.ts" | grep -v "__tests__" | grep -i "load\|save\|parse\|restore" | head -20
```

In whatever file handles loading save data from localStorage (likely `src/game/SaveManager.ts` or similar), add a migration before the state is applied:

```typescript
// After parsing saved state JSON, before returning it:
function migrateSaveData(state: GameState): GameState {
  const tech = state.tech as GameState["tech"] & {
    completedTechIds?: string[];
  };
  // Migrate old saves that have completedTechIds but no purchaseCount
  if (Array.isArray(tech.completedTechIds) && !tech.purchaseCount) {
    const purchaseCount: Record<string, number> = {};
    for (const id of tech.completedTechIds) {
      purchaseCount[id] = 1;
    }
    return {
      ...state,
      tech: {
        ...tech,
        purchaseCount,
        queue: [],
        currentResearchId: null,
        researchProgress: 0,
      },
    };
  }
  // Ensure new fields exist even if save was created mid-migration
  if (!tech.purchaseCount) {
    return {
      ...state,
      tech: { ...tech, purchaseCount: {}, queue: [] },
    };
  }
  return state;
}
```

Call `migrateSaveData(parsed)` after `JSON.parse(saved)`.

- [ ] **Step 4: Check if `Button.setLabel` exists. If not, adapt TechTreeScene to recreate the button label differently.**

```bash
grep -n "setLabel\|label" src/ui/Button.ts | head -20
```

If `setLabel` doesn't exist, in `TechTreeScene.ts` replace `this.unlockButton.setLabel(...)` with a workaround — look at Button's public API and use its available method (e.g., recreating the button or using a separate Text object for the label).

- [ ] **Step 5: Run full CI check.**

```bash
npm run check
```

Expected: typecheck ✅, test ✅, build ✅.

Fix any remaining failures:

- If tests reference old node IDs (e.g., `"logistics_1"`), update them to new IDs (e.g., `"logistics_hub"`).
- If `getAITechBranch` export is missing (it was re-exported as an alias in Task 6), check if any file still imports it and update the import to the correct function.

- [ ] **Step 6: Commit everything.**

```bash
git add -A
git commit -m "feat(tech): roguelike tech tree — cleanup, migration shim, CI clean"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `npm run check` passes (typecheck + test + build)
- [ ] `TECH_GRAPH` has 40 nodes; `TECH_TREE` alias works for IntelLevel.ts, SuccessFormula.ts, etc.
- [ ] `completedTechIds` stays in sync in `applyPurchase` and `applyAIPurchase`
- [ ] Cargo pact mutual exclusivity blocks `diplomacy_food`, `diplomacy_tech`, `diplomacy_luxury` from coexisting
- [ ] `calculateRPPerTurn` caps RP-node bonus at +4
- [ ] `TechGraphCanvas` pan/zoom cleanup removes scene-level `pointermove`/`pointerup`/`wheel` listeners on destroy
- [ ] All old `TechTreeGrid` imports removed; `BRANCH_LABELS` re-exported from `TechGraphCanvas`
- [ ] Queue row shows progress bar on first tile
- [ ] Old save migration shim handles `completedTechIds`-only saves
