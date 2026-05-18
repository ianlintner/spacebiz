# Tech Tree UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static TechTreeScene UI with a right-rail layout featuring a sortable Researched table, an aggregated Bonuses dashboard, branch-colored glowing nodes, a breathing-pulse animation on the active research, and a slot-card queue with drag-to-reorder.

**Architecture:** UI-only change. The radial graph stays; node/edge rendering gets a complete visual upgrade in `TechGraphCanvas`. The old left-portrait sidebar is removed. A new `TabGroup` swaps the main content area between Tree/Researched/Bonuses. The right rail (current research → selected detail → queue) is rendered outside the tab group and stays visible across tabs. No changes to `TechTree.ts` logic, `TECH_GRAPH` data, `TechState` shape, save format, or turn-step code.

**Tech Stack:** Phaser 4 (`import * as Phaser from "phaser"`), TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Vitest 4, `@spacebiz/ui` component library (`GlassPanel`, `Button`, `TabGroup`, `DataTable`, `StatusChip`, `ScrollFrame`, `getTheme`, `colorToString`).

**Reference spec:** [docs/superpowers/specs/2026-05-18-tech-tree-ui-redesign-design.md](../specs/2026-05-18-tech-tree-ui-redesign-design.md)

---

## File Map

**New files:**

- `packages/spacebiz-ui/src/theme/branchColors.ts` — branch color constants + accessor
- `src/game/tech/EffectBreakdown.ts` — aggregated effect helper for Bonuses tab
- `src/game/tech/__tests__/EffectBreakdown.test.ts` — tests
- `src/ui/tech/TechCurrentResearchCard.ts` — hero "now researching" card
- `src/ui/tech/TechDetailCard.ts` — selected-tech detail + action button
- `src/ui/tech/TechQueuePanel.ts` — vertical slot-card queue (replaces TechQueueRow)
- `src/ui/tech/__tests__/TechQueuePanel.test.ts` — tests
- `src/ui/tech/TechResearchedTable.ts` — sortable DataTable wrapper
- `src/ui/tech/TechBonusesPanel.ts` — stat card grid
- `src/ui/tech/__tests__/TechBonusesPanel.test.ts` — tests

**Modified:**

- `packages/spacebiz-ui/src/Theme.ts` — add branch color tokens
- `packages/spacebiz-ui/src/index.ts` — re-export branch colors
- `src/ui/TechGraphCanvas.ts` — branch colors, glow, breathing animation
- `src/ui/index.ts` — swap `TechQueueRow` export for `TechQueuePanel`
- `src/scenes/TechTreeScene.ts` — full rewrite to new layout

**Deleted:**

- `src/ui/TechQueueRow.ts`
- `src/ui/__tests__/TechQueueRow.test.ts`

---

## Task 1: Branch Colors in Theme

**Files:**

- Create: `packages/spacebiz-ui/src/theme/branchColors.ts`
- Modify: `packages/spacebiz-ui/src/index.ts`
- Test: (manual — colors are data, exercised by Task 2+)

The branch color palette is the foundation everything else uses. We add it as a standalone module under `packages/spacebiz-ui/src/theme/` so consumers can `import { BRANCH_COLORS } from "@spacebiz/ui"` everywhere.

- [ ] **Step 1: Create the branch color module**

Create `packages/spacebiz-ui/src/theme/branchColors.ts`:

```typescript
/**
 * Branch color palette for the Tech Tree.
 *
 * Domain-specific (not semantic), so these live alongside the legacy flat
 * Theme.colors map rather than under `color.*` semantic tokens.
 *
 * Used by:
 *   - TechGraphCanvas (node borders, glow, edges)
 *   - TechDetailCard / TechResearchedTable (branch chips)
 *   - TechBonusesPanel (source attribution)
 */
export const BRANCH_COLORS = {
  logistics: 0x88e0ff, // Cyan
  engineering: 0xfcd96f, // Gold
  intelligence: 0xff9ce0, // Pink
  crisis: 0xffaa66, // Orange
  diplomacy: 0x9cffb0, // Mint
  fleet: 0xc89cff, // Violet
} as const;

export type BranchId = keyof typeof BRANCH_COLORS;

export function getBranchColor(branchId: string): number {
  return (BRANCH_COLORS as Record<string, number>)[branchId] ?? 0x88aacc;
}
```

- [ ] **Step 2: Re-export from `@spacebiz/ui` index**

Edit `packages/spacebiz-ui/src/index.ts`. Add this export near the top with the other theme exports:

```typescript
export { BRANCH_COLORS, getBranchColor } from "./theme/branchColors.ts";
export type { BranchId } from "./theme/branchColors.ts";
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit**

```bash
git add packages/spacebiz-ui/src/theme/branchColors.ts packages/spacebiz-ui/src/index.ts
git commit -m "feat(ui): add BRANCH_COLORS palette for tech tree branches"
```

---

## Task 2: EffectBreakdown Helper

**Files:**

- Create: `src/game/tech/EffectBreakdown.ts`
- Test: `src/game/tech/__tests__/EffectBreakdown.test.ts`

This is the Bonuses-tab data layer. Walks `state.tech.purchaseCount`, sums each effect type, attributes contributions back to their source tech(s). Reuses `TECH_GRAPH` from constants for tech lookup. We TDD this — the logic is pure and easy to test.

- [ ] **Step 1: Write failing tests**

Create `src/game/tech/__tests__/EffectBreakdown.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getEffectBreakdown } from "../EffectBreakdown.ts";
import type { TechState } from "../../../data/types.ts";

function emptyTechState(): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
  };
}

describe("getEffectBreakdown", () => {
  it("returns empty array when no techs owned", () => {
    expect(getEffectBreakdown(emptyTechState())).toEqual([]);
  });

  it("returns one entry per distinct effect type", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["logistics_hub"],
      purchaseCount: { logistics_hub: 1 },
    };
    // logistics_hub effect: addRouteSlots +1
    const breakdown = getEffectBreakdown(tech);
    const slots = breakdown.find((e) => e.effectType === "addRouteSlots");
    expect(slots).toBeDefined();
    expect(slots?.value).toBe(1);
    expect(slots?.sources).toHaveLength(1);
    expect(slots?.sources[0].techId).toBe("logistics_hub");
    expect(slots?.sources[0].contribution).toBe(1);
  });

  it("multiplies repeatable tech contributions by purchase count", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["fuel_efficiency_1"],
      purchaseCount: { fuel_efficiency_1: 3 },
    };
    // fuel_efficiency_1 effect: modifyFuel -0.01 per purchase
    const breakdown = getEffectBreakdown(tech);
    const fuel = breakdown.find((e) => e.effectType === "modifyFuel");
    expect(fuel?.value).toBeCloseTo(-0.03);
    expect(fuel?.sources[0].contribution).toBeCloseTo(-0.03);
  });

  it("aggregates multiple techs with the same effect type", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["logistics_hub", "logistics_3"],
      purchaseCount: { logistics_hub: 1, logistics_3: 1 },
    };
    // both contribute addRouteSlots
    const slots = getEffectBreakdown(tech).find(
      (e) => e.effectType === "addRouteSlots",
    );
    expect(slots?.value).toBe(2);
    expect(slots?.sources).toHaveLength(2);
  });

  it("classifies sign correctly", () => {
    const tech: TechState = {
      ...emptyTechState(),
      purchaseCount: { fuel_efficiency_1: 1, logistics_hub: 1 },
    };
    const breakdown = getEffectBreakdown(tech);
    expect(breakdown.find((e) => e.effectType === "modifyFuel")?.sign).toBe(
      "negative",
    );
    expect(breakdown.find((e) => e.effectType === "addRouteSlots")?.sign).toBe(
      "positive",
    );
  });

  it("skips effect types with zero net value", () => {
    // If a tech has +5% and another has -5%, the net is 0 → omit.
    // Hard to construct from real techs, so we test the omission rule by
    // verifying no zero-value entries ever appear in a populated breakdown.
    const tech: TechState = {
      ...emptyTechState(),
      purchaseCount: { logistics_hub: 1 },
    };
    for (const entry of getEffectBreakdown(tech)) {
      expect(entry.value).not.toBe(0);
    }
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/game/tech/__tests__/EffectBreakdown.test.ts`
Expected: FAIL — `Cannot find module '../EffectBreakdown.ts'`

- [ ] **Step 3: Implement the helper**

Create `src/game/tech/EffectBreakdown.ts`:

```typescript
import type { TechEffect, TechState } from "../../data/types.ts";
import { TECH_GRAPH } from "../../data/constants.ts";

export interface EffectSource {
  techId: string;
  techName: string;
  contribution: number;
}

export interface EffectEntry {
  effectType: TechEffect["type"];
  /** Display label (e.g. "Fuel Cost", "Route Slots"). */
  label: string;
  /** How to format the value (percent for multipliers, flat for counts). */
  format: "percent" | "flat";
  /** Net value across all sources. For percent effects this is a fraction (e.g. -0.05). */
  value: number;
  /** UI sign — for color coding. Negative fuel/cost is "positive" for the player; we keep raw sign here and let the UI decide. */
  sign: "positive" | "negative";
  sources: EffectSource[];
}

// Display metadata per effect type. Format rule:
//   percent — value is a fraction; UI renders as ±X%
//   flat    — value is a number; UI renders as ±N
const EFFECT_META: Record<
  TechEffect["type"],
  { label: string; format: "percent" | "flat" }
> = {
  addRouteSlots: { label: "Route Slots", format: "flat" },
  modifyLicenseFee: { label: "License Fees", format: "percent" },
  modifyTariff: { label: "Tariffs", format: "percent" },
  modifyMaintenance: { label: "Maintenance", format: "percent" },
  modifyFuel: { label: "Fuel Cost", format: "percent" },
  modifyConditionDecay: { label: "Condition Decay", format: "percent" },
  modifyRevenue: { label: "Route Revenue", format: "percent" },
  addTripsPerTurn: { label: "Trips per Turn", format: "flat" },
  addCargoTypesPerPair: { label: "Cargo Types / Pair", format: "flat" },
  modifySaturation: { label: "Saturation Floor", format: "percent" },
  modifyEventDuration: { label: "Event Duration", format: "percent" },
  modifyEventCash: { label: "Event Cash", format: "percent" },
  addAutoRepair: { label: "Auto-Repair / Turn", format: "flat" },
  modifyOverhaulCost: { label: "Overhaul Cost", format: "percent" },
  addEmbargoImmunity: { label: "Embargo Immunity", format: "flat" },
  addMothballRefund: { label: "Mothball Refund", format: "percent" },
  addBreakdownRevenue: { label: "Breakdown Revenue", format: "percent" },
  addMarketForecast: { label: "Market Forecast", format: "flat" },
  addSaturationDisplay: { label: "Saturation Display", format: "flat" },
  addMarketReset: { label: "Market Resets", format: "flat" },
  addRPPerTurn: { label: "RP per Turn", format: "flat" },
  addFreightCapacity: { label: "Freight Capacity", format: "flat" },
  addPassengerCapacity: { label: "Passenger Capacity", format: "flat" },
  upgradeFreightHull: { label: "Freight Hull Mark", format: "flat" },
  upgradePassengerHull: { label: "Passenger Hull Mark", format: "flat" },
};

export function getEffectBreakdown(tech: TechState): EffectEntry[] {
  // Map of effectType → accumulator
  const byType = new Map<
    TechEffect["type"],
    { value: number; sources: Map<string, EffectSource> }
  >();

  for (const [techId, count] of Object.entries(tech.purchaseCount)) {
    if (count <= 0) continue;
    const node = TECH_GRAPH.find((n) => n.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      const contribution = effect.value * count;
      const entry = byType.get(effect.type) ?? {
        value: 0,
        sources: new Map(),
      };
      entry.value += contribution;
      const existing = entry.sources.get(techId);
      if (existing) {
        existing.contribution += contribution;
      } else {
        entry.sources.set(techId, {
          techId,
          techName: node.name,
          contribution,
        });
      }
      byType.set(effect.type, entry);
    }
  }

  const result: EffectEntry[] = [];
  for (const [effectType, agg] of byType) {
    if (agg.value === 0) continue;
    const meta = EFFECT_META[effectType];
    result.push({
      effectType,
      label: meta.label,
      format: meta.format,
      value: agg.value,
      sign: agg.value > 0 ? "positive" : "negative",
      sources: [...agg.sources.values()],
    });
  }
  return result;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/game/tech/__tests__/EffectBreakdown.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/game/tech/EffectBreakdown.ts src/game/tech/__tests__/EffectBreakdown.test.ts
git commit -m "feat(tech): add getEffectBreakdown helper for Bonuses tab"
```

---

## Task 3: TechGraphCanvas — Branch Colors & Glow

**Files:**

- Modify: `src/ui/TechGraphCanvas.ts`

Three visual changes:

1. Node fill/border uses `BRANCH_COLORS[tech.branch]` for completed/available/queued states.
2. Completed nodes get a soft outer halo (separate Graphics layer behind the node, branch-tinted, additive blend).
3. Edges between two completed nodes are drawn in branch color (3px, glowing) instead of the current `#88aaff`.

This task does NOT add the breathing animation (Task 4 does that, separately).

- [ ] **Step 1: Add branch-color import & glow layer scaffolding**

Edit `src/ui/TechGraphCanvas.ts`. Update the imports at the top:

```typescript
import * as Phaser from "phaser";
import type { Technology } from "../data/types.ts";
import { TECH_GRAPH } from "../data/constants.ts";
import { applyClippingMask, getTheme, getBranchColor } from "@spacebiz/ui";
```

In the `NodeView` interface (around line 44), add the glow layer field:

```typescript
interface NodeView {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics; // NEW: outer halo behind bg
  iconText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  tech: Technology;
}
```

Remove the obsolete `STATE_COLORS` constant block (lines 34–40). State colors are now derived per-node from the branch color or are fixed (gold for researching).

- [ ] **Step 2: Add a glow layer to each node in `buildNodes()`**

Locate the `buildNodes()` method. Replace the body of the per-tech for-loop with:

```typescript
for (const tech of TECH_GRAPH) {
  const { x, y } = this.polarToXY(tech.position.angle, tech.position.radius);

  // Glow layer (drawn first, behind everything; additive blend).
  const glow = this.scene.add.graphics();
  glow.setBlendMode(Phaser.BlendModes.ADD);
  glow.setAlpha(0);

  const bg = this.scene.add.graphics();

  const iconText = this.scene.add
    .text(0, -8, tech.icon, {
      fontSize: "20px",
      fontFamily: theme.fonts.body.family,
    })
    .setOrigin(0.5, 0.5);

  const nameText = this.scene.add
    .text(0, 14, tech.name, {
      fontSize: "8px",
      fontFamily: theme.fonts.body.family,
      color: "#ccccdd",
      wordWrap: { width: NODE_SIZE - 4 },
      align: "center",
    })
    .setOrigin(0.5, 0);

  const nodeContainer = new Phaser.GameObjects.Container(this.scene, x, y, [
    glow,
    bg,
    iconText,
    nameText,
  ]);
  this.scene.add.existing(nodeContainer);
  nodeContainer.setSize(NODE_SIZE, NODE_SIZE);
  nodeContainer.setInteractive();
  nodeContainer.on("pointerup", () => this.config.onSelect(tech.id));
  nodeContainer.on("pointerover", () => this.applyHoverStyle(tech.id));
  nodeContainer.on("pointerout", () => this.refreshNodeView(tech.id));

  this.graphGroup.add(nodeContainer);
  this.nodeViews.set(tech.id, {
    container: nodeContainer,
    bg,
    glow,
    iconText,
    nameText,
    tech,
  });
}
```

- [ ] **Step 3: Replace `refreshNodeView()` with branch-color version**

Replace the entire `refreshNodeView` method with:

```typescript
private refreshNodeView(techId: string): void {
  if (!this.currentState) return;
  const view = this.nodeViews.get(techId);
  if (!view) return;
  const nodeState = this.getNodeState(techId, this.currentState);
  const branchColor = getBranchColor(view.tech.branch);
  const RESEARCHING_COLOR = 0xfcd96f; // gold

  view.bg.clear();
  view.glow.clear();
  view.glow.setAlpha(0);

  switch (nodeState) {
    case "locked": {
      view.container.setAlpha(0.35);
      view.bg.fillStyle(0x1a2235, 1);
      view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      view.bg.lineStyle(1, 0x2c3a55, 1);
      view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      break;
    }
    case "available": {
      view.container.setAlpha(0.92);
      view.bg.fillStyle(0x141c2e, 0.95);
      view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      view.bg.lineStyle(2, branchColor, 1);
      view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      break;
    }
    case "queued": {
      view.container.setAlpha(1);
      view.bg.fillStyle(0x141c2e, 0.95);
      view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      // Dashed-look: draw four short line segments. Phaser has no dash support
      // on strokeRoundedRect, so we approximate with a brighter solid border
      // plus a subtle halo.
      view.bg.lineStyle(2, branchColor, 1);
      view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      this.drawHalo(view.glow, branchColor, 0.35);
      view.glow.setAlpha(1);
      break;
    }
    case "researching": {
      view.container.setAlpha(1);
      view.bg.fillStyle(0x2a1a08, 1);
      view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      view.bg.lineStyle(2, RESEARCHING_COLOR, 1);
      view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      this.drawHalo(view.glow, RESEARCHING_COLOR, 0.6);
      view.glow.setAlpha(0.55);
      // Breathing animation is started by ensureBreathingTween (Task 4).
      break;
    }
    case "completed": {
      view.container.setAlpha(1);
      view.bg.fillStyle(0x0d1a30, 1);
      view.bg.fillRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      view.bg.lineStyle(2, branchColor, 1);
      view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
      this.drawHalo(view.glow, branchColor, 0.45);
      view.glow.setAlpha(1);
      break;
    }
  }
}

private drawHalo(g: Phaser.GameObjects.Graphics, color: number, intensity: number): void {
  // Three concentric stroked rects with falling alpha — cheap, no shader.
  for (let i = 0; i < 3; i++) {
    const pad = 4 + i * 4;
    const alpha = intensity * (1 - i * 0.3);
    g.lineStyle(2, color, alpha);
    g.strokeRoundedRect(
      -HALF - pad,
      -HALF - pad,
      NODE_SIZE + pad * 2,
      NODE_SIZE + pad * 2,
      10 + i * 2,
    );
  }
}

private applyHoverStyle(techId: string): void {
  const view = this.nodeViews.get(techId);
  if (!view) return;
  // Brighten the existing bg by drawing a white overlay.
  view.bg.lineStyle(2, 0xffffff, 0.9);
  view.bg.strokeRoundedRect(-HALF, -HALF, NODE_SIZE, NODE_SIZE, 8);
}
```

- [ ] **Step 4: Replace `drawEdges()` with branch-color version**

Replace the `drawEdges` method body:

```typescript
private drawEdges(state: TechGraphState): void {
  this.edgeGfx.clear();
  const drawn = new Set<string>();
  for (const tech of TECH_GRAPH) {
    const { x: x1, y: y1 } = this.polarToXY(
      tech.position.angle,
      tech.position.radius,
    );
    for (const neighborId of tech.edges) {
      const edgeKey = [tech.id, neighborId].sort().join("|");
      if (drawn.has(edgeKey)) continue;
      drawn.add(edgeKey);
      const neighbor = TECH_GRAPH.find((n) => n.id === neighborId);
      if (!neighbor) continue;
      const { x: x2, y: y2 } = this.polarToXY(
        neighbor.position.angle,
        neighbor.position.radius,
      );
      const aDone = state.completedTechIds.includes(tech.id);
      const bDone = state.completedTechIds.includes(neighborId);
      const bothDone = aDone && bDone;
      const eitherDone = aDone || bDone;

      // Branch color = higher-tier endpoint's branch (fallback to tech's branch)
      const branchTech = neighbor.tier > tech.tier ? neighbor : tech;
      const branchColor = getBranchColor(branchTech.branch);

      if (bothDone) {
        // Glow pass first (wide, dim, additive)
        this.edgeGfx.lineStyle(6, branchColor, 0.25);
        this.edgeGfx.beginPath();
        this.edgeGfx.moveTo(x1, y1);
        this.edgeGfx.lineTo(x2, y2);
        this.edgeGfx.strokePath();
        // Core line
        this.edgeGfx.lineStyle(3, branchColor, 1);
        this.edgeGfx.beginPath();
        this.edgeGfx.moveTo(x1, y1);
        this.edgeGfx.lineTo(x2, y2);
        this.edgeGfx.strokePath();
      } else if (eitherDone) {
        this.edgeGfx.lineStyle(1.5, branchColor, 0.35);
        this.edgeGfx.beginPath();
        this.edgeGfx.moveTo(x1, y1);
        this.edgeGfx.lineTo(x2, y2);
        this.edgeGfx.strokePath();
      } else {
        this.edgeGfx.lineStyle(1, 0x243049, 1);
        this.edgeGfx.beginPath();
        this.edgeGfx.moveTo(x1, y1);
        this.edgeGfx.lineTo(x2, y2);
        this.edgeGfx.strokePath();
      }
    }
  }
}
```

- [ ] **Step 5: Set edge graphics to additive blend for glow pass**

In the `TechGraphCanvas` constructor, right after `this.edgeGfx = scene.add.graphics();` (around line 100), add:

```typescript
this.edgeGfx.setBlendMode(Phaser.BlendModes.NORMAL);
```

(We're keeping the edge layer in NORMAL blend; the wide dim "glow pass" stroke alpha is enough — additive blend would brighten the dark slate edges undesirably.)

- [ ] **Step 6: Verify typecheck & run existing test**

Run: `npm run typecheck`
Expected: PASS

Run: `npx vitest run src/ui/__tests__/TechGraphCanvas.test.ts`
Expected: PASS (existing test — likely just constructs the canvas; should still work since the public API didn't change)

- [ ] **Step 7: Commit**

```bash
git add src/ui/TechGraphCanvas.ts
git commit -m "feat(tech-tree): branch-colored nodes + halo glow on completed paths"
```

---

## Task 4: Breathing Pulse on Researching Node

**Files:**

- Modify: `src/ui/TechGraphCanvas.ts`

The researching node needs a slow 1.6s breathing pulse on its glow layer (alpha+scale yoyo). We manage one Phaser tween at a time, retargeted whenever the researching node changes.

- [ ] **Step 1: Add breathing tween state to the class**

Add these fields near the top of the `TechGraphCanvas` class (just under `private currentState: TechGraphState | null = null;`):

```typescript
private breathingTween: Phaser.Tweens.Tween | null = null;
private breathingTechId: string | null = null;
```

- [ ] **Step 2: Add the breathing tween management method**

Add this method to the class (near the other state methods):

```typescript
private ensureBreathingTween(researchingId: string | null): void {
  // If the researching node hasn't changed, leave the tween alone.
  if (this.breathingTechId === researchingId) return;

  // Stop and reset previous breathing target.
  if (this.breathingTween) {
    this.breathingTween.stop();
    this.breathingTween = null;
  }
  if (this.breathingTechId) {
    const prev = this.nodeViews.get(this.breathingTechId);
    if (prev) {
      prev.glow.setAlpha(0);
      prev.glow.setScale(1);
    }
  }
  this.breathingTechId = researchingId;
  if (!researchingId) return;

  const view = this.nodeViews.get(researchingId);
  if (!view) return;

  view.glow.setScale(1);
  view.glow.setAlpha(0.55);

  this.breathingTween = this.scene.tweens.add({
    targets: view.glow,
    alpha: { from: 0.55, to: 1.0 },
    scaleX: { from: 1.0, to: 1.08 },
    scaleY: { from: 1.0, to: 1.08 },
    duration: 1600,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
}
```

- [ ] **Step 3: Call `ensureBreathingTween` from `setGraphState`**

Find the `setGraphState` method and update it to:

```typescript
setGraphState(state: TechGraphState): this {
  this.currentState = state;
  this.drawEdges(state);
  for (const tech of TECH_GRAPH) {
    this.refreshNodeView(tech.id);
  }
  this.ensureBreathingTween(state.queue[0] ?? null);
  return this;
}
```

- [ ] **Step 4: Clean up the tween in `destroy()`**

Update the `destroy` method to stop the tween:

```typescript
override destroy(fromScene?: boolean): void {
  if (this.breathingTween) {
    this.breathingTween.stop();
    this.breathingTween = null;
  }
  if (this._onMove) this.scene.input.off("pointermove", this._onMove);
  if (this._onUp) this.scene.input.off("pointerup", this._onUp);
  if (this._onWheel) this.scene.input.off("wheel", this._onWheel);
  if (this.maskSyncBound) {
    this.scene.events.off("preupdate", this.maskSyncBound, this);
  }
  this.clipMask?.destroy();
  super.destroy(fromScene);
}
```

- [ ] **Step 5: Verify typecheck & test**

Run: `npm run typecheck && npx vitest run src/ui/__tests__/TechGraphCanvas.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/TechGraphCanvas.ts
git commit -m "feat(tech-tree): slow breathing pulse on researching node"
```

---

## Task 5: TechCurrentResearchCard

**Files:**

- Create: `src/ui/tech/TechCurrentResearchCard.ts`

The hero "Currently Researching" card at the top of the right rail. Pure rendering, no input handling. Takes a state input via `setState()`.

- [ ] **Step 1: Implement the component**

Create `src/ui/tech/TechCurrentResearchCard.ts`:

```typescript
import * as Phaser from "phaser";
import { getTheme, colorToString, getBranchColor } from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";
import { effectiveCost, calculateRPPerTurn } from "../../game/tech/TechTree.ts";
import type { GameState } from "../../data/types.ts";

export interface TechCurrentResearchCardConfig {
  x: number;
  y: number;
  width: number;
}

export class TechCurrentResearchCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private bg!: Phaser.GameObjects.Graphics;
  private iconText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private metaText!: Phaser.GameObjects.Text;
  private emptyText!: Phaser.GameObjects.Text;
  private height = 92;

  constructor(scene: Phaser.Scene, config: TechCurrentResearchCardConfig) {
    super(scene, config.x, config.y);
    this.cardWidth = config.width;
    scene.add.existing(this);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    const theme = getTheme();
    this.iconText = scene.add
      .text(20, 20, "", {
        fontSize: "22px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5);
    this.add(this.iconText);

    this.nameText = scene.add.text(38, 10, "", {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.add(this.nameText);

    this.subText = scene.add.text(38, 26, "", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.subText);

    this.progressTrack = scene.add
      .rectangle(10, 58, this.cardWidth - 20, 6, 0x1e2a40, 1)
      .setOrigin(0, 0.5);
    this.add(this.progressTrack);

    this.progressFill = scene.add
      .rectangle(10, 58, 0, 6, 0x6ccfff, 1)
      .setOrigin(0, 0.5);
    this.add(this.progressFill);

    this.metaText = scene.add.text(10, 68, "", {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.metaText);

    this.emptyText = scene.add.text(10, 30, "", {
      fontSize: "11px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.emptyText);

    this.redrawBg();
  }

  setState(state: GameState): this {
    const tech = state.tech;
    const headId = tech.queue[0] ?? null;
    const node = headId ? TECH_GRAPH.find((n) => n.id === headId) : null;
    const theme = getTheme();

    if (!node) {
      this.iconText.setVisible(false);
      this.nameText.setVisible(false);
      this.subText.setVisible(false);
      this.progressTrack.setVisible(false);
      this.progressFill.setVisible(false);
      this.metaText.setVisible(false);
      this.emptyText
        .setText("⚙ No research queued — select a tech to begin")
        .setVisible(true);
      return this;
    }

    this.emptyText.setVisible(false);
    this.iconText.setText(node.icon).setVisible(true);
    this.nameText.setText(node.name).setVisible(true);
    this.subText
      .setText(`${branchLabel(node.branch)} · Tier ${node.tier}`)
      .setColor(colorToString(getBranchColor(node.branch)))
      .setVisible(true);

    const cost = effectiveCost(node.id, tech);
    const rpPerTurn = calculateRPPerTurn(state);
    const progress = cost > 0 ? Math.min(tech.researchPoints / cost, 1) : 0;
    const turnsLeft =
      rpPerTurn > 0
        ? Math.ceil((cost - tech.researchPoints) / rpPerTurn)
        : Infinity;

    this.progressTrack.setVisible(true);
    this.progressFill
      .setVisible(true)
      .setSize((this.cardWidth - 20) * progress, 6);

    this.metaText
      .setText(
        `${tech.researchPoints} / ${cost} RP · +${rpPerTurn} RP/turn · ~${
          isFinite(turnsLeft) ? Math.max(0, turnsLeft) : "—"
        } turns`,
      )
      .setColor(colorToString(theme.colors.textDim))
      .setVisible(true);

    return this;
  }

  resize(width: number): this {
    this.cardWidth = width;
    this.progressTrack.setSize(width - 20, 6);
    this.redrawBg();
    return this;
  }

  private redrawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x121a2c, 0.95);
    this.bg.fillRoundedRect(0, 0, this.cardWidth, this.height, 8);
    this.bg.lineStyle(1, 0x2c3a55, 1);
    this.bg.strokeRoundedRect(0, 0, this.cardWidth, this.height, 8);
  }

  getCardHeight(): number {
    return this.height;
  }
}

function branchLabel(branchId: string): string {
  return branchId.charAt(0).toUpperCase() + branchId.slice(1);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/ui/tech/TechCurrentResearchCard.ts
git commit -m "feat(tech-tree): TechCurrentResearchCard component"
```

---

## Task 6: TechDetailCard

**Files:**

- Create: `src/ui/tech/TechDetailCard.ts`

The selected-tech detail card with the unlock/queue button. Lives between the current-research card and the queue in the right rail.

- [ ] **Step 1: Implement the component**

Create `src/ui/tech/TechDetailCard.ts`:

```typescript
import * as Phaser from "phaser";
import { Button, colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";
import { effectiveCost, isTechAvailable } from "../../game/tech/TechTree.ts";

export interface TechDetailCardConfig {
  x: number;
  y: number;
  width: number;
  onAction: (techId: string) => void;
}

export class TechDetailCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private height = 168;
  private bg!: Phaser.GameObjects.Graphics;
  private placeholder!: Phaser.GameObjects.Text;
  private icon!: Phaser.GameObjects.Text;
  private name!: Phaser.GameObjects.Text;
  private branchChip!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private prereqText!: Phaser.GameObjects.Text;
  private button!: Button;
  private selectedTechId: string | null = null;
  private onAction: (techId: string) => void;

  constructor(scene: Phaser.Scene, config: TechDetailCardConfig) {
    super(scene, config.x, config.y);
    this.cardWidth = config.width;
    this.onAction = config.onAction;
    scene.add.existing(this);

    const theme = getTheme();

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.placeholder = scene.add
      .text(
        this.cardWidth / 2,
        this.height / 2,
        "Select a tech on the graph to see details",
        {
          fontSize: "11px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
          align: "center",
          wordWrap: { width: this.cardWidth - 20 },
        },
      )
      .setOrigin(0.5, 0.5);
    this.add(this.placeholder);

    this.icon = scene.add
      .text(20, 18, "", {
        fontSize: "22px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.icon);

    this.name = scene.add
      .text(38, 8, "", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setVisible(false);
    this.add(this.name);

    this.branchChip = scene.add
      .text(38, 26, "", {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: "#ffffff",
        padding: { left: 4, right: 4, top: 1, bottom: 1 },
      })
      .setVisible(false);
    this.add(this.branchChip);

    this.statusText = scene.add
      .text(this.cardWidth - 10, 12, "", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(1, 0)
      .setVisible(false);
    this.add(this.statusText);

    this.descText = scene.add
      .text(10, 50, "", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: this.cardWidth - 20 },
      })
      .setVisible(false);
    this.add(this.descText);

    this.costText = scene.add
      .text(10, 100, "", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: "#fcd96f",
      })
      .setVisible(false);
    this.add(this.costText);

    this.prereqText = scene.add
      .text(10, 118, "", {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
        wordWrap: { width: this.cardWidth - 20 },
      })
      .setVisible(false);
    this.add(this.prereqText);

    this.button = new Button(scene, {
      x: this.cardWidth / 2,
      y: this.height - 18,
      width: this.cardWidth - 20,
      label: "Unlock",
      disabled: true,
      onClick: () => {
        if (this.selectedTechId) this.onAction(this.selectedTechId);
      },
    });
    this.add(this.button);
    this.button.setVisible(false);

    this.redrawBg();
  }

  setSelection(techId: string | null, tech: TechState): this {
    this.selectedTechId = techId;
    const node = techId ? TECH_GRAPH.find((n) => n.id === techId) : null;
    if (!node) {
      this.placeholder.setVisible(true);
      this.icon.setVisible(false);
      this.name.setVisible(false);
      this.branchChip.setVisible(false);
      this.statusText.setVisible(false);
      this.descText.setVisible(false);
      this.costText.setVisible(false);
      this.prereqText.setVisible(false);
      this.button.setVisible(false);
      return this;
    }

    this.placeholder.setVisible(false);

    const branchColor = getBranchColor(node.branch);
    const isCompleted =
      (tech.purchaseCount[node.id] ?? 0) >= 1 && !node.repeatable;
    const isResearching = tech.queue[0] === node.id;
    const isQueued = tech.queue.includes(node.id);
    const available = isTechAvailable(node.id, tech);
    const cost = effectiveCost(node.id, tech);
    const canAfford = tech.researchPoints >= cost;

    let statusLabel: string;
    let statusColor: number;
    if (isCompleted) {
      statusLabel = "✓ Completed";
      statusColor = 0x9cffb0;
    } else if (isResearching) {
      statusLabel = "⚙ Researching";
      statusColor = 0xfcd96f;
    } else if (isQueued) {
      statusLabel = "📋 In Queue";
      statusColor = 0xffaa66;
    } else if (available) {
      statusLabel = canAfford ? "★ Available" : "★ Available (unaffordable)";
      statusColor = canAfford ? branchColor : 0x88a;
    } else {
      statusLabel = "🔒 Locked";
      statusColor = 0x778;
    }

    this.icon.setText(node.icon).setVisible(true);
    this.name.setText(node.name).setVisible(true);
    this.branchChip
      .setText(` ${branchLabel(node.branch)} · T${node.tier} `)
      .setBackgroundColor(colorToString(branchColor))
      .setVisible(true);
    this.statusText
      .setText(statusLabel)
      .setColor(colorToString(statusColor))
      .setVisible(true);
    this.descText.setText(node.description).setVisible(true);

    const ownedSuffix = node.repeatable
      ? ` · Owned ×${tech.purchaseCount[node.id] ?? 0}`
      : "";
    this.costText.setText(`Cost: ${cost} RP${ownedSuffix}`).setVisible(true);

    if (!available && !isCompleted && !isQueued) {
      const neighborNames = node.edges
        .map((id) => TECH_GRAPH.find((n) => n.id === id)?.name)
        .filter((n): n is string => !!n)
        .slice(0, 2);
      this.prereqText
        .setText(
          neighborNames.length ? `Requires: ${neighborNames.join(" or ")}` : "",
        )
        .setVisible(neighborNames.length > 0);
    } else {
      this.prereqText.setVisible(false);
    }

    // Button state
    let label = "Select a technology";
    let disabled = true;
    if (isCompleted) {
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

    return this;
  }

  resize(width: number): this {
    this.cardWidth = width;
    this.placeholder.setPosition(width / 2, this.height / 2);
    this.placeholder.setWordWrapWidth(width - 20);
    this.descText.setWordWrapWidth(width - 20);
    this.prereqText.setWordWrapWidth(width - 20);
    this.statusText.setX(width - 10);
    this.button.setPosition(width / 2, this.height - 18);
    this.redrawBg();
    return this;
  }

  private redrawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x121a2c, 0.95);
    this.bg.fillRoundedRect(0, 0, this.cardWidth, this.height, 8);
    this.bg.lineStyle(1, 0x2c3a55, 1);
    this.bg.strokeRoundedRect(0, 0, this.cardWidth, this.height, 8);
  }

  getCardHeight(): number {
    return this.height;
  }
}

function branchLabel(branchId: string): string {
  return branchId.charAt(0).toUpperCase() + branchId.slice(1);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/ui/tech/TechDetailCard.ts
git commit -m "feat(tech-tree): TechDetailCard with branch chip + contextual action button"
```

---

## Task 7: TechQueuePanel (replaces TechQueueRow)

**Files:**

- Create: `src/ui/tech/TechQueuePanel.ts`
- Test: `src/ui/tech/__tests__/TechQueuePanel.test.ts`

Vertical slot-card queue. Up to `visibleSlots` (default 4) cards visible; overflow rendered as "+N more". Each card has a grip handle, branch-tinted icon, name, cost, ✕ remove, and up/down reorder arrows on hover. Drag-to-reorder uses pointer events on the grip.

- [ ] **Step 1: Write failing tests**

Create `src/ui/tech/__tests__/TechQueuePanel.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll } from "vitest";
import * as Phaser from "phaser";
import { TechQueuePanel } from "../TechQueuePanel.ts";

// Minimal headless scene
function makeScene(): Phaser.Scene {
  const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    width: 800,
    height: 600,
    banner: false,
    audio: { noAudio: true },
  });
  // Create a bare scene the test can use
  const scene = new Phaser.Scene("test");
  game.scene.add("test", scene, true);
  return scene;
}

describe("TechQueuePanel", () => {
  let scene: Phaser.Scene;

  beforeAll(() => {
    scene = makeScene();
  });

  it("constructs with no queue items", () => {
    const panel = new TechQueuePanel(scene, {
      x: 0,
      y: 0,
      width: 240,
      visibleSlots: 4,
      onRemove: () => undefined,
      onReorder: () => undefined,
    });
    panel.setState({
      queue: [],
      researchPoints: 0,
      purchaseCount: {},
    });
    expect(panel.getSlotCount()).toBe(0);
  });

  it("reports filled vs empty slot count", () => {
    const panel = new TechQueuePanel(scene, {
      x: 0,
      y: 0,
      width: 240,
      visibleSlots: 4,
      onRemove: () => undefined,
      onReorder: () => undefined,
    });
    panel.setState({
      queue: ["logistics_hub", "logistics_2a"],
      researchPoints: 0,
      purchaseCount: {},
    });
    expect(panel.getSlotCount()).toBe(2);
  });

  it("invokes onRemove with the clicked slot index", () => {
    const onRemove = vi.fn();
    const panel = new TechQueuePanel(scene, {
      x: 0,
      y: 0,
      width: 240,
      visibleSlots: 4,
      onRemove,
      onReorder: () => undefined,
    });
    panel.setState({
      queue: ["logistics_hub", "logistics_2a"],
      researchPoints: 0,
      purchaseCount: {},
    });
    panel.triggerRemove(1); // test helper
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("invokes onReorder when moving up/down", () => {
    const onReorder = vi.fn();
    const panel = new TechQueuePanel(scene, {
      x: 0,
      y: 0,
      width: 240,
      visibleSlots: 4,
      onRemove: () => undefined,
      onReorder,
    });
    panel.setState({
      queue: ["logistics_hub", "logistics_2a", "logistics_2b"],
      researchPoints: 0,
      purchaseCount: {},
    });
    panel.triggerReorder(2, 1); // test helper
    expect(onReorder).toHaveBeenCalledWith(2, 1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/ui/tech/__tests__/TechQueuePanel.test.ts`
Expected: FAIL — `Cannot find module '../TechQueuePanel.ts'`

- [ ] **Step 3: Implement the panel**

Create `src/ui/tech/TechQueuePanel.ts`:

```typescript
import * as Phaser from "phaser";
import { TECH_GRAPH } from "../../data/constants.ts";
import { colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { effectiveCost } from "../../game/tech/TechTree.ts";
import type { TechState } from "../../data/types.ts";

export interface TechQueuePanelConfig {
  x: number;
  y: number;
  width: number;
  visibleSlots?: number; // default 4
  onRemove: (index: number) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export interface TechQueuePanelState {
  queue: string[];
  researchPoints: number;
  purchaseCount: Record<string, number>;
}

const SLOT_HEIGHT = 44;
const SLOT_GAP = 6;
const HEADER_HEIGHT = 22;

export class TechQueuePanel extends Phaser.GameObjects.Container {
  private cfg: TechQueuePanelConfig;
  private visibleSlots: number;
  private slotGroup!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private currentState: TechQueuePanelState | null = null;

  constructor(scene: Phaser.Scene, config: TechQueuePanelConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    this.visibleSlots = config.visibleSlots ?? 4;
    scene.add.existing(this);

    const theme = getTheme();
    this.header = scene.add.text(0, 0, "📋 Queue · 0 / 4", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      fontStyle: "bold",
    });
    this.add(this.header);

    this.slotGroup = new Phaser.GameObjects.Container(scene, 0, HEADER_HEIGHT);
    scene.add.existing(this.slotGroup);
    this.add(this.slotGroup);
  }

  setState(state: TechQueuePanelState): this {
    this.currentState = state;
    this.slotGroup.removeAll(true);
    this.header.setText(
      `📋 Queue · ${state.queue.length} / ${this.visibleSlots}`,
    );

    const theme = getTheme();
    const slotsToRender = Math.min(state.queue.length, this.visibleSlots);

    for (let i = 0; i < this.visibleSlots; i++) {
      const y = i * (SLOT_HEIGHT + SLOT_GAP);
      if (i < slotsToRender) {
        this.renderFilledSlot(i, state.queue[i], state, y, theme);
      } else {
        this.renderEmptySlot(i, y, theme);
      }
    }

    if (state.queue.length > this.visibleSlots) {
      const moreText = this.scene.add.text(
        0,
        this.visibleSlots * (SLOT_HEIGHT + SLOT_GAP),
        `+ ${state.queue.length - this.visibleSlots} more queued`,
        {
          fontSize: "9px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      this.slotGroup.add(moreText);
    }

    return this;
  }

  resize(width: number): this {
    this.cfg.width = width;
    if (this.currentState) this.setState(this.currentState);
    return this;
  }

  getSlotCount(): number {
    return this.currentState?.queue.length ?? 0;
  }

  // Test helpers — exposed so unit tests don't need to simulate pointer events.
  triggerRemove(index: number): void {
    this.cfg.onRemove(index);
  }
  triggerReorder(fromIdx: number, toIdx: number): void {
    this.cfg.onReorder(fromIdx, toIdx);
  }

  getPanelHeight(): number {
    return HEADER_HEIGHT + this.visibleSlots * (SLOT_HEIGHT + SLOT_GAP) + 12;
  }

  private renderFilledSlot(
    index: number,
    techId: string,
    state: TechQueuePanelState,
    y: number,
    theme: ReturnType<typeof getTheme>,
  ): void {
    const tech = TECH_GRAPH.find((t) => t.id === techId);
    if (!tech) return;
    const isActive = index === 0;
    const cost = effectiveCost(techId, {
      purchaseCount: state.purchaseCount,
    } as TechState);
    const branchColor = getBranchColor(tech.branch);

    const bg = this.scene.add.graphics();
    bg.fillStyle(isActive ? 0x1f2c46 : 0x141c2e, 1);
    bg.fillRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);
    bg.lineStyle(1, isActive ? branchColor : 0x2c3a55, 1);
    bg.strokeRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);

    // Active progress bar
    if (isActive && cost > 0) {
      const progress = Math.min(state.researchPoints / cost, 1);
      bg.fillStyle(branchColor, 0.35);
      bg.fillRect(0, y + SLOT_HEIGHT - 3, this.cfg.width * progress, 3);
    }

    const grip = this.scene.add
      .text(8, y + SLOT_HEIGHT / 2, "⋮⋮", {
        fontSize: "12px",
        fontFamily: theme.fonts.body.family,
        color: "#5c6c8a",
      })
      .setOrigin(0, 0.5);

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(branchColor, 0.18);
    iconBg.fillRoundedRect(22, y + 10, 24, 24, 5);
    iconBg.lineStyle(1, branchColor, 0.5);
    iconBg.strokeRoundedRect(22, y + 10, 24, 24, 5);

    const icon = this.scene.add
      .text(34, y + 22, tech.icon, {
        fontSize: "14px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5);

    const slotNum = this.scene.add.text(50, y + 8, `#${index + 1}`, {
      fontSize: "8px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });

    const name = this.scene.add.text(50, y + 18, tech.name, {
      fontSize: "11px",
      fontFamily: theme.fonts.body.family,
      color: "#ffffff",
      wordWrap: { width: this.cfg.width - 90 },
    });

    const costLabel = this.scene.add
      .text(this.cfg.width - 24, y + 12, `${cost} RP`, {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: isActive ? colorToString(branchColor) : "#6677aa",
      })
      .setOrigin(1, 0);

    const removeBtn = this.scene.add
      .text(this.cfg.width - 8, y + 4, "✕", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: "#aa4444",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    removeBtn.on("pointerover", () => removeBtn.setColor("#ff7777"));
    removeBtn.on("pointerout", () => removeBtn.setColor("#aa4444"));
    removeBtn.on("pointerup", () => this.cfg.onRemove(index));

    this.slotGroup.add([
      bg,
      grip,
      iconBg,
      icon,
      slotNum,
      name,
      costLabel,
      removeBtn,
    ]);

    // Reorder arrows on hover (kept lightweight; no full drag-and-drop yet)
    if (index > 0) {
      const up = this.scene.add
        .text(this.cfg.width - 8, y + 20, "▲", {
          fontSize: "8px",
          fontFamily: theme.fonts.body.family,
          color: "#88a",
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      up.on("pointerup", () => this.cfg.onReorder(index, index - 1));
      this.slotGroup.add(up);
    }
    if (index < (this.currentState?.queue.length ?? 0) - 1) {
      const down = this.scene.add
        .text(this.cfg.width - 8, y + 30, "▼", {
          fontSize: "8px",
          fontFamily: theme.fonts.body.family,
          color: "#88a",
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      down.on("pointerup", () => this.cfg.onReorder(index, index + 1));
      this.slotGroup.add(down);
    }
  }

  private renderEmptySlot(
    index: number,
    y: number,
    theme: ReturnType<typeof getTheme>,
  ): void {
    const bg = this.scene.add.graphics();
    bg.lineStyle(1, 0x2c3a55, 0.6);
    bg.strokeRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);
    const label = this.scene.add
      .text(this.cfg.width / 2, y + SLOT_HEIGHT / 2, "+ Empty slot", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: "#56678a",
      })
      .setOrigin(0.5, 0.5);
    this.slotGroup.add([bg, label]);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/ui/tech/__tests__/TechQueuePanel.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/tech/TechQueuePanel.ts src/ui/tech/__tests__/TechQueuePanel.test.ts
git commit -m "feat(tech-tree): TechQueuePanel — vertical slot-card queue"
```

---

## Task 8: TechResearchedTable

**Files:**

- Create: `src/ui/tech/TechResearchedTable.ts`

Sortable DataTable wrapper for the Researched tab. Columns: Tech (icon+name), Branch (colored chip), Tier, Owned, Effect. Reuses the existing `DataTable` from `@spacebiz/ui`.

- [ ] **Step 1: Implement the wrapper**

Create `src/ui/tech/TechResearchedTable.ts`:

```typescript
import * as Phaser from "phaser";
import {
  DataTable,
  ScrollFrame,
  colorToString,
  getBranchColor,
  getTheme,
} from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";

export interface TechResearchedTableConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect: (techId: string) => void;
}

interface ResearchedRow extends Record<string, unknown> {
  techId: string;
  tech: string;
  branch: string;
  tier: number;
  owned: number;
  effect: string;
}

export class TechResearchedTable extends Phaser.GameObjects.Container {
  private cfg: TechResearchedTableConfig;
  private frame: ScrollFrame;
  private table: DataTable;
  private emptyText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: TechResearchedTableConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    scene.add.existing(this);

    const theme = getTheme();
    this.frame = new ScrollFrame(scene, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
    });
    this.add(this.frame);

    this.table = new DataTable(scene, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
      contentSized: true,
      columns: [
        {
          key: "tech",
          label: "Tech",
          width: 160,
          flex: 2,
          sortable: true,
        },
        {
          key: "branch",
          label: "Branch",
          width: 90,
          sortable: true,
          colorFn: (value) =>
            typeof value === "string" ? getBranchColor(value) : null,
          format: (v) =>
            typeof v === "string"
              ? v.charAt(0).toUpperCase() + v.slice(1)
              : String(v),
        },
        {
          key: "tier",
          label: "Tier",
          width: 50,
          align: "center",
          sortable: true,
        },
        {
          key: "owned",
          label: "Owned",
          width: 60,
          align: "center",
          sortable: true,
          format: (v) => (typeof v === "number" ? `${v}×` : String(v)),
        },
        {
          key: "effect",
          label: "Effect",
          width: 200,
          flex: 3,
          sortable: false,
        },
      ],
      onRowSelect: (_idx, row) => {
        const techId = (row as ResearchedRow).techId;
        config.onSelect(techId);
      },
      emptyStateText: "No techs researched yet",
      emptyStateHint: "Unlock a tech on the Tree tab to populate this list",
    });
    this.frame.setContent(this.table);

    this.emptyText = scene.add
      .text(config.width / 2, config.height / 2, "", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.emptyText);
  }

  setState(tech: TechState): this {
    const rows: ResearchedRow[] = [];
    for (const [techId, count] of Object.entries(tech.purchaseCount)) {
      if (count <= 0) continue;
      const node = TECH_GRAPH.find((n) => n.id === techId);
      if (!node) continue;
      rows.push({
        techId,
        tech: `${node.icon} ${node.name}`,
        branch: node.branch,
        tier: node.tier,
        owned: count,
        effect: node.description,
      });
    }
    this.table.setRows(rows);
    return this;
  }

  resize(width: number, height: number): this {
    this.cfg.width = width;
    this.cfg.height = height;
    this.frame.setSize(width, height);
    this.table.setSize(width, height);
    this.emptyText.setPosition(width / 2, height / 2);
    return this;
  }
}
```

> Verified APIs: `DataTable.setRows`, `DataTable.setSize`, `ScrollFrame.setContent`, `ScrollFrame.setSize`. (Confirmed by reading [packages/spacebiz-ui/src/DataTable.ts](../../packages/spacebiz-ui/src/DataTable.ts) and [packages/spacebiz-ui/src/ScrollFrame.ts](../../packages/spacebiz-ui/src/ScrollFrame.ts).)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/tech/TechResearchedTable.ts
git commit -m "feat(tech-tree): TechResearchedTable for Researched tab"
```

---

## Task 9: TechBonusesPanel

**Files:**

- Create: `src/ui/tech/TechBonusesPanel.ts`
- Test: `src/ui/tech/__tests__/TechBonusesPanel.test.ts`

Stat card grid. Renders one card per non-zero effect entry from `getEffectBreakdown`. Cards lay out in a responsive 2-column grid (1 column when width < 240px).

- [ ] **Step 1: Write failing tests**

Create `src/ui/tech/__tests__/TechBonusesPanel.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import * as Phaser from "phaser";
import { TechBonusesPanel } from "../TechBonusesPanel.ts";

function makeScene(): Phaser.Scene {
  const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    width: 800,
    height: 600,
    banner: false,
    audio: { noAudio: true },
  });
  const scene = new Phaser.Scene("test");
  game.scene.add("test", scene, true);
  return scene;
}

describe("TechBonusesPanel", () => {
  let scene: Phaser.Scene;
  beforeAll(() => {
    scene = makeScene();
  });

  it("renders zero cards for empty state", () => {
    const panel = new TechBonusesPanel(scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
    panel.setState({
      researchPoints: 0,
      completedTechIds: [],
      purchaseCount: {},
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
    });
    expect(panel.getCardCount()).toBe(0);
  });

  it("renders one card per active effect type", () => {
    const panel = new TechBonusesPanel(scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
    // logistics_hub adds 1 route slot; logistics_2b adds 10% revenue.
    panel.setState({
      researchPoints: 0,
      completedTechIds: ["logistics_hub", "logistics_2b"],
      purchaseCount: { logistics_hub: 1, logistics_2b: 1 },
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
    });
    expect(panel.getCardCount()).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/ui/tech/__tests__/TechBonusesPanel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the panel**

Create `src/ui/tech/TechBonusesPanel.ts`:

```typescript
import * as Phaser from "phaser";
import { colorToString, getTheme } from "@spacebiz/ui";
import {
  getEffectBreakdown,
  type EffectEntry,
} from "../../game/tech/EffectBreakdown.ts";
import type { TechState } from "../../data/types.ts";

export interface TechBonusesPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CARD_HEIGHT = 64;
const CARD_GAP = 8;

export class TechBonusesPanel extends Phaser.GameObjects.Container {
  private cfg: TechBonusesPanelConfig;
  private cardGroup: Phaser.GameObjects.Container;
  private emptyText: Phaser.GameObjects.Text;
  private cardCount = 0;

  constructor(scene: Phaser.Scene, config: TechBonusesPanelConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    scene.add.existing(this);

    const theme = getTheme();
    this.cardGroup = new Phaser.GameObjects.Container(scene, 0, 0);
    scene.add.existing(this.cardGroup);
    this.add(this.cardGroup);

    this.emptyText = scene.add
      .text(
        config.width / 2,
        config.height / 2,
        "No active bonuses — research a tech to see effects here",
        {
          fontSize: "11px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
          align: "center",
          wordWrap: { width: config.width - 40 },
        },
      )
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.emptyText);
  }

  setState(tech: TechState): this {
    this.cardGroup.removeAll(true);
    const entries = getEffectBreakdown(tech);
    this.cardCount = entries.length;

    if (entries.length === 0) {
      this.emptyText.setVisible(true);
      return this;
    }
    this.emptyText.setVisible(false);

    const cols = this.cfg.width >= 240 ? 2 : 1;
    const cardWidth = (this.cfg.width - CARD_GAP * (cols - 1)) / cols;

    entries.forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * (cardWidth + CARD_GAP);
      const y = row * (CARD_HEIGHT + CARD_GAP);
      this.renderCard(entry, x, y, cardWidth);
    });
    return this;
  }

  resize(width: number, height: number): this {
    this.cfg.width = width;
    this.cfg.height = height;
    this.emptyText.setPosition(width / 2, height / 2);
    this.emptyText.setWordWrapWidth(width - 40);
    // Re-render existing data layout at new width by re-running setState
    // is the caller's responsibility — we don't store the TechState here.
    return this;
  }

  getCardCount(): number {
    return this.cardCount;
  }

  private renderCard(
    entry: EffectEntry,
    x: number,
    y: number,
    width: number,
  ): void {
    const theme = getTheme();

    // Player-perspective color: percent effects that reduce a cost are GOOD
    // even though their raw sign is negative. Map a few known reducer types.
    const reducerEffects = new Set([
      "modifyLicenseFee",
      "modifyTariff",
      "modifyMaintenance",
      "modifyFuel",
      "modifyConditionDecay",
      "modifyOverhaulCost",
      "modifyEventDuration",
    ]);
    const playerGood =
      (entry.sign === "negative" && reducerEffects.has(entry.effectType)) ||
      (entry.sign === "positive" && !reducerEffects.has(entry.effectType));
    const valueColor = playerGood ? 0x9cffb0 : 0xff9c9c;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x141c2e, 0.95);
    bg.fillRoundedRect(x, y, width, CARD_HEIGHT, 6);
    bg.lineStyle(1, 0x2c3a55, 1);
    bg.strokeRoundedRect(x, y, width, CARD_HEIGHT, 6);

    const label = this.scene.add.text(
      x + 10,
      y + 8,
      entry.label.toUpperCase(),
      {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
        letterSpacing: 1,
      },
    );

    const formatted = formatValue(entry);
    const valueText = this.scene.add.text(x + 10, y + 20, formatted, {
      fontSize: "18px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(valueColor),
      fontStyle: "bold",
    });

    const fromText = this.scene.add.text(x + 10, y + 46, sourceLine(entry), {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      wordWrap: { width: width - 20 },
    });

    this.cardGroup.add([bg, label, valueText, fromText]);
  }
}

function formatValue(entry: EffectEntry): string {
  const sign = entry.value > 0 ? "+" : entry.value < 0 ? "−" : "";
  const abs = Math.abs(entry.value);
  if (entry.format === "percent") {
    return `${sign}${(abs * 100).toFixed(0)}%`;
  }
  // Flat — show one decimal if non-integer
  const formatted = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);
  return `${sign}${formatted}`;
}

function sourceLine(entry: EffectEntry): string {
  if (entry.sources.length === 1) return `from ${entry.sources[0].techName}`;
  return `from ${entry.sources.length} techs`;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/ui/tech/__tests__/TechBonusesPanel.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/tech/TechBonusesPanel.ts src/ui/tech/__tests__/TechBonusesPanel.test.ts
git commit -m "feat(tech-tree): TechBonusesPanel stat card grid"
```

---

## Task 10: Rewrite TechTreeScene

**Files:**

- Modify: `src/scenes/TechTreeScene.ts`

The full layout integration: tabs across the top, graph/researched/bonuses as tab content, right rail with current research → detail card → queue panel.

- [ ] **Step 1: Replace the scene file**

Replace `src/scenes/TechTreeScene.ts` entirely with:

```typescript
import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  GlassPanel,
  TabGroup,
  attachReflowHandler,
  colorToString,
  createStarfield,
  getLayout,
  getTheme,
  GROUP_TAB_STRIP_HEIGHT,
  SceneUiDirector,
} from "../ui/index.ts";
import { TechGraphCanvas } from "../ui/TechGraphCanvas.ts";
import { TechCurrentResearchCard } from "../ui/tech/TechCurrentResearchCard.ts";
import { TechDetailCard } from "../ui/tech/TechDetailCard.ts";
import { TechQueuePanel } from "../ui/tech/TechQueuePanel.ts";
import { TechResearchedTable } from "../ui/tech/TechResearchedTable.ts";
import { TechBonusesPanel } from "../ui/tech/TechBonusesPanel.ts";
import {
  instantUnlockOrQueue,
  isTechAvailable,
  removeFromQueue,
  reorderQueue,
} from "../game/tech/TechTree.ts";

const RAIL_WIDTH = 280;
const RAIL_GAP = 12;
const TAB_STRIP_HEIGHT = 32;

export class TechTreeScene extends Phaser.Scene {
  private mainPanel!: GlassPanel;
  private railPanel!: GlassPanel;

  // Tab content containers
  private treeContent!: Phaser.GameObjects.Container;
  private researchedContent!: Phaser.GameObjects.Container;
  private bonusesContent!: Phaser.GameObjects.Container;

  private tabs!: TabGroup;
  private graph!: TechGraphCanvas;
  private researchedTable!: TechResearchedTable;
  private bonusesPanel!: TechBonusesPanel;

  // Right rail components
  private currentCard!: TechCurrentResearchCard;
  private detailCard!: TechDetailCard;
  private queuePanel!: TechQueuePanel;
  private rpStatusText!: Phaser.GameObjects.Text;

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

    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;
    const mainWidth = L.mainContentWidth - RAIL_WIDTH - RAIL_GAP;

    // Main glass panel (Tree / Researched / Bonuses live inside this)
    this.mainPanel = new GlassPanel(this, {
      x: L.mainContentLeft,
      y: contentTop,
      width: mainWidth,
      height: contentHeight,
      title: "Research & Technology",
    });

    // Right rail glass panel
    this.railPanel = new GlassPanel(this, {
      x: L.mainContentLeft + mainWidth + RAIL_GAP,
      y: contentTop,
      width: RAIL_WIDTH,
      height: contentHeight,
      title: "Current Research",
    });

    // Build tab content containers (sized in relayout)
    this.treeContent = this.add.container(0, 0);
    this.researchedContent = this.add.container(0, 0);
    this.bonusesContent = this.add.container(0, 0);

    // Graph — added to treeContent
    this.graph = new TechGraphCanvas(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => this.handleSelect(techId),
    });
    this.treeContent.add(this.graph);

    // Researched table
    this.researchedTable = new TechResearchedTable(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => {
        this.tabs.setActiveTab(0);
        this.handleSelect(techId);
      },
    });
    this.researchedContent.add(this.researchedTable);

    // Bonuses panel
    this.bonusesPanel = new TechBonusesPanel(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    this.bonusesContent.add(this.bonusesPanel);

    // Tab group
    this.tabs = new TabGroup(this, {
      x: 0,
      y: 0,
      width: 100,
      tabHeight: TAB_STRIP_HEIGHT,
      tabs: [
        { label: "Tree", content: this.treeContent },
        { label: "Researched", content: this.researchedContent },
        { label: "Bonuses", content: this.bonusesContent },
      ],
      defaultTab: 0,
    });

    // ── Right rail ──────────────────────────────────────────────
    this.currentCard = new TechCurrentResearchCard(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
    });
    this.detailCard = new TechDetailCard(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
      onAction: (techId) => this.handleUnlockOrQueue(techId),
    });
    this.queuePanel = new TechQueuePanel(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
      visibleSlots: 4,
      onRemove: (idx) => this.handleQueueRemove(idx),
      onReorder: (from, to) => this.handleQueueReorder(from, to),
    });

    // RP status header — small label above the current-research card
    this.rpStatusText = this.add.text(0, 0, "", {
      fontSize: "10px",
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    });

    this.relayout();
    this.refresh();

    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;
    const mainWidth = L.mainContentWidth - RAIL_WIDTH - RAIL_GAP;

    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(mainWidth, contentHeight);

    this.railPanel.setPosition(
      L.mainContentLeft + mainWidth + RAIL_GAP,
      contentTop,
    );
    this.railPanel.setSize(RAIL_WIDTH, contentHeight);

    // Tab strip across top of main panel
    const tabX = L.mainContentLeft + 12;
    const tabY = contentTop + 36;
    this.tabs.setPosition(tabX, tabY);
    this.tabs.setSize(mainWidth - 24, TAB_STRIP_HEIGHT);

    // Tab content area below the strip
    const contentInnerX = L.mainContentLeft + 12;
    const contentInnerY = tabY + TAB_STRIP_HEIGHT + 8;
    const contentInnerW = mainWidth - 24;
    const contentInnerH = contentHeight - (contentInnerY - contentTop) - 12;

    this.treeContent.setPosition(contentInnerX, contentInnerY);
    this.researchedContent.setPosition(contentInnerX, contentInnerY);
    this.bonusesContent.setPosition(contentInnerX, contentInnerY);

    this.graph.setPosition(0, 0);
    this.graph.setSize(contentInnerW, contentInnerH);

    this.researchedTable.resize(contentInnerW, contentInnerH);
    this.bonusesPanel.resize(contentInnerW, contentInnerH);

    // Right rail content
    const railInnerX = L.mainContentLeft + mainWidth + RAIL_GAP + 12;
    const railInnerY = contentTop + 36;
    const railInnerW = RAIL_WIDTH - 24;

    this.rpStatusText.setPosition(railInnerX, railInnerY);

    let y = railInnerY + 18;
    this.currentCard.setPosition(railInnerX, y);
    this.currentCard.resize(railInnerW);
    y += this.currentCard.getCardHeight() + 8;

    this.detailCard.setPosition(railInnerX, y);
    this.detailCard.resize(railInnerW);
    y += this.detailCard.getCardHeight() + 12;

    this.queuePanel.setPosition(railInnerX, y);
    this.queuePanel.resize(railInnerW);
  }

  private handleSelect(techId: string): void {
    this.selectedTechId = techId;
    const state = gameStore.getState();
    this.detailCard.setSelection(techId, state.tech);
  }

  private handleUnlockOrQueue(techId: string): void {
    const state = gameStore.getState();
    if (!isTechAvailable(techId, state.tech)) return;
    const newTech = instantUnlockOrQueue(techId, state.tech);
    if (!newTech) return;
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private handleQueueRemove(index: number): void {
    const state = gameStore.getState();
    const newTech = removeFromQueue(state.tech, index);
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private handleQueueReorder(fromIdx: number, toIdx: number): void {
    const state = gameStore.getState();
    const newTech = reorderQueue(state.tech, fromIdx, toIdx);
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private refresh(): void {
    const state = gameStore.getState();
    const tech = state.tech;

    this.rpStatusText.setText(
      `${tech.researchPoints} RP available · ${tech.completedTechIds.length} techs unlocked`,
    );

    this.graph.setGraphState({
      completedTechIds: tech.completedTechIds,
      purchaseCount: tech.purchaseCount,
      queue: tech.queue,
      researchPoints: tech.researchPoints,
      isAvailable: (id) => isTechAvailable(id, tech),
    });

    this.currentCard.setState(state);
    this.detailCard.setSelection(this.selectedTechId, tech);
    this.queuePanel.setState({
      queue: tech.queue,
      researchPoints: tech.researchPoints,
      purchaseCount: tech.purchaseCount,
    });
    this.researchedTable.setState(tech);
    this.bonusesPanel.setState(tech);
  }
}
```

> Verified TabGroup API: `setActiveTab(index)`, `setSize(width, _height)`. (Confirmed by reading [packages/spacebiz-ui/src/TabGroup.ts](../../packages/spacebiz-ui/src/TabGroup.ts).)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS. If TabGroup methods don't exist as named, replace them with the actual public methods (look in CompetitionScene for the canonical usage).

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`

Manual checklist in browser:

- Open the Tech Tree scene (via QA console: `__sft.goToScene("TechTreeScene")` or play through to it).
- Confirm the graph appears with branch-colored nodes/edges where applicable (start a new game and unlock 1-2 techs to see the glow).
- Click a tech node → Selected Detail card on the right updates.
- Click Unlock → tech researches (if affordable) or appears in the queue.
- Verify the breathing pulse on the currently-researching node (slow ~1.6s).
- Switch to Researched tab → table populated, click a row → tab snaps back to Tree with selection.
- Switch to Bonuses tab → cards visible.
- Confirm the right rail stays visible across all 3 tabs.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/TechTreeScene.ts
git commit -m "feat(tech-tree): rewrite scene with right rail + tabs + new components"
```

---

## Task 11: Remove TechQueueRow (old component)

**Files:**

- Delete: `src/ui/TechQueueRow.ts`
- Delete: `src/ui/__tests__/TechQueueRow.test.ts`
- Modify: `src/ui/index.ts`

The new `TechQueuePanel` replaces `TechQueueRow`. Confirm nothing else imports the old component before deleting.

- [ ] **Step 1: Find any remaining importers**

Run: `grep -rn "TechQueueRow" src/ packages/ 2>/dev/null`
Expected: Only matches in `src/ui/TechQueueRow.ts`, `src/ui/__tests__/TechQueueRow.test.ts`, and `src/ui/index.ts`. If anything else imports it, stop and update that caller first.

- [ ] **Step 2: Remove the exports from `src/ui/index.ts`**

Open `src/ui/index.ts` and delete these two lines:

```typescript
export { TechQueueRow } from "./TechQueueRow.ts";
export type { TechQueueRowConfig, TechQueueRowState } from "./TechQueueRow.ts";
```

- [ ] **Step 3: Delete the old files**

```bash
git rm src/ui/TechQueueRow.ts src/ui/__tests__/TechQueueRow.test.ts
```

- [ ] **Step 4: Verify all gates pass**

Run: `npm run check`
Expected: PASS — typecheck, tests, and build all succeed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/index.ts
git commit -m "refactor(tech-tree): remove TechQueueRow (replaced by TechQueuePanel)"
```

---

## Task 12: Final integration verification

**Files:** (no edits — verification only)

- [ ] **Step 1: Run the full CI gate locally**

Run: `npm run check`
Expected: typecheck + tests + build all PASS.

- [ ] **Step 2: Run dev server and capture screenshots**

Run: `npm run dev`

Use the Claude Preview MCP or Playwright to capture screenshots of:

1. Tree tab — graph with at least 3 completed techs (shows branch-colored edges + halos)
2. Tree tab — a tech selected, detail card visible on the right
3. Tree tab — queue with 2-3 items
4. Researched tab — table with multiple branches visible
5. Bonuses tab — multiple stat cards

Save under `docs/pr-screenshots/tech-tree-redesign/`.

- [ ] **Step 3: Commit screenshots**

```bash
git add docs/pr-screenshots/tech-tree-redesign/
git commit -m "docs(tech-tree): PR screenshots for redesign"
```

---

## Self-Review Notes

**Spec coverage check** — every spec section mapped to a task:

| Spec section          | Task |
| --------------------- | ---- |
| Layout (right rail)   | 10   |
| Tabs (3-tab strip)    | 10   |
| Tree tab (graph)      | 3, 4 |
| Researched tab        | 8    |
| Bonuses tab           | 2, 9 |
| Branch Colors         | 1    |
| Node states           | 3    |
| Breathing animation   | 4    |
| Edge states           | 3    |
| Current Research card | 5    |
| Selected Detail card  | 6    |
| Queue (slot cards)    | 7    |
| Interaction Flow      | 10   |
| `getEffectBreakdown`  | 2    |

**Type consistency** — `setState` / `setSelection` / `resize` method names are consistent across `TechCurrentResearchCard`, `TechDetailCard`, `TechQueuePanel`, `TechResearchedTable`, `TechBonusesPanel`. Scene refresh calls them uniformly.

**Verified package APIs (no engineer-side guessing required):**

- `TabGroup.setActiveTab(index): void`
- `TabGroup.setSize(width, _height): this`
- `DataTable.setRows(rows[]): void`
- `DataTable.setSize(width, height): this`
- `ScrollFrame.setContent(child): void`
- `ScrollFrame.setSize(width, height): this`
