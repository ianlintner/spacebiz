# Tech Tree UI Redesign

**Date:** 2026-05-18
**Status:** Design — pending implementation plan

## Goal

Replace the current TechTreeScene UI with a slick, modern, information-rich layout
that turns research from a static interaction into a clear, interactive flow.

Three problems with the current UI:

1. **Static queue** — a single horizontal strip of 52px tiles with cramped `◀▶✕`
   micro-buttons. Hard to read, hard to interact with, doesn't communicate "this
   slot is empty, fill me."
2. **No way to review what you have** — completed techs are visually marked on
   the graph, but there is no list view, no aggregate of active bonuses, no
   answer to "what does my tech actually do for me right now?"
3. **Visual flatness** — nodes are colored rectangles; completed paths look the
   same as incomplete ones. No glow, no breathing, no sense of progression.

The redesign keeps the existing radial graph (the spatial encoding of
branch-by-angle, tier-by-radius is a feature) and rebuilds everything around it.

## Layout

**Right-rail layout, no left sidebar.** The graph fills the main area, and a
~280px right rail holds all controls and live information. A tab strip across
the top switches the main content area between Tree / Researched / Bonuses
views — the right rail stays put across all three tabs.

```text
┌──────────────────────────────────────────────────┬─────────────────┐
│  [ Tree ]  [ Researched ]  [ Bonuses ]           │  ⚙ Currently    │
├──────────────────────────────────────────────────┤    Researching  │
│                                                  │  ┌───────────┐  │
│                                                  │  │ progress  │  │
│            radial tech graph                     │  └───────────┘  │
│            (branch-colored halos)                │                 │
│                                                  │  ▸ Selected     │
│                                                  │  tech detail    │
│                                                  │  + Unlock btn   │
│                                                  ├─────────────────┤
│                                                  │  📋 Queue · 2/4 │
│                                                  │  ┌─────────────┐│
│                                                  │  │ slot card 1 ││
│                                                  │  └─────────────┘│
│                                                  │  ┌─────────────┐│
│                                                  │  │ slot card 2 ││
│                                                  │  └─────────────┘│
│                                                  │  + empty slot   │
│                                                  │  + empty slot   │
└──────────────────────────────────────────────────┴─────────────────┘
```

The right rail content area, top to bottom:

1. **Currently Researching** — hero panel with the active tech's icon, name,
   branch chip, animated progress bar, and "X/Y RP · ~N turns" meta.
2. **Selected Tech Detail** — card showing the clicked tech's full info plus
   the Unlock/Queue button. Always visible; shows a placeholder when nothing
   is selected.
3. **Queue** — fixed slot count, empty slots visible as dashed placeholders.

The 3-section split is implemented as a single vertical stack within the rail,
not three independent panels. The selected-detail card grows or shrinks based
on content; queue slots have a fixed height.

## Tabs

A TabGroup at the top of the main area switches between three views. The
right rail does not change between tabs.

### Tab: Tree (default)

Renders the redesigned radial graph (see _Graph_ below).

### Tab: Researched

A sortable `DataTable` of every owned tech. Columns:

| Tech                    | Branch    | Tier | Owned | Effect          |
| ----------------------- | --------- | ---- | ----- | --------------- |
| ⏱️ Efficient Scheduling | Logistics | 1    | 1×    | +1 route slot   |
| ⚡ Route Efficiency I   | Logistics | 2    | 3×    | +1.5 trips/turn |

The `Effect` column uses the tech's `description` field directly (already a
single-line summary in `TECH_GRAPH`). Multi-effect techs render the
description as-is — no per-effect breakdown in this view (Bonuses tab covers
that).

Sortable by every column. Branch column renders as a colored chip using the
branch palette (see _Branch Colors_). The `Owned` column shows the repeatable
purchase count (×N) or `1×` for one-shot techs.

Clicking a row in this table selects that tech on the graph (jumps to its
detail card in the right rail). Implementation note: this means a tab switch
back to Tree after click would land with the selection visible.

### Tab: Bonuses

A grid of stat cards showing the aggregated effect of every tech the player
owns. Each card has:

- Label (e.g. "Route Slots", "Fuel Cost")
- Big number (e.g. "+2", "−5%") colored green for positive, red for negative
- Source line (e.g. "from 5 techs" or single tech name)

Only stats with a nonzero modifier render — no "0%" cards. The grid is a
responsive 2-column layout that wraps to 1 column at narrow widths.

Effect aggregation is a new helper that wraps the existing single-effect
aggregators in `src/game/tech/TechEffects.ts` (e.g. `getRevenueMultiplier`,
`getFuelMultiplier`, `getTechRouteSlotBonus`). The wrapper walks
`techState.purchaseCount`, attributes each effect back to its source tech(s),
and returns a UI-friendly breakdown:

```ts
type EffectBreakdown = Array<{
  label: string; // "Fuel Cost"
  value: number; // -0.05
  format: "percent" | "flat" | "slots";
  sign: "positive" | "negative" | "neutral";
  sources: Array<{ techId: string; contribution: number }>;
}>;
```

## Graph

The radial layout, node positions, edges, pan/zoom, and mask all stay. What
changes is the visual style.

### Branch Colors

Each branch gets a signature color used in:

- Node border & glow when completed
- Edge color when both endpoints completed
- Branch chip in detail card and Researched table
- Stat card source attribution (where it makes sense)

| Branch       | Color  | Hex       |
| ------------ | ------ | --------- |
| Logistics    | Cyan   | `#88e0ff` |
| Engineering  | Gold   | `#fcd96f` |
| Intelligence | Pink   | `#ff9ce0` |
| Crisis       | Orange | `#ffaa66` |
| Diplomacy    | Mint   | `#9cffb0` |
| Fleet        | Violet | `#c89cff` |

These get added as `branchColors` to the legacy flat `Theme.colors` map (not
the semantic `color.*` tokens — branch colors are domain-specific, not
intent-based). Components reach them via `getTheme().colors.branchColors[branchId]`.

### Node States

| State       | Render                                                                |
| ----------- | --------------------------------------------------------------------- |
| Locked      | Dim gray, faint border, 35% opacity, slight blur                      |
| Available   | Branch-color border, no glow, 92% opacity                             |
| Queued      | Branch-color dashed border, soft glow                                 |
| Researching | Bright gold border, **slow breathing pulse** (see below), strong glow |
| Completed   | Branch-color solid border, **steady branch-color outer halo glow**    |

### Breathing animation (researching node)

Phaser tween on a derived alpha/scale value, applied to a glow Graphics layer
behind the node. Slower than a typical pulse:

```ts
scene.tweens.add({
  targets: glow,
  alpha: { from: 0.55, to: 1.0 },
  scale: { from: 1.0, to: 1.08 },
  duration: 1600,
  ease: "Sine.easeInOut",
  yoyo: true,
  repeat: -1,
});
```

The 1600ms duration is intentional — a long, calm inhale-exhale rather than
a heartbeat. Tween targets a dedicated glow Graphics object so the node
container itself doesn't scale (would break hit testing).

### Edge States

| State                                   | Render                                  |
| --------------------------------------- | --------------------------------------- |
| Both endpoints completed                | Branch color, 3px wide, soft outer glow |
| One endpoint available, other completed | Branch color, 35% opacity, 1.5px        |
| Neither                                 | Dim slate `#243049`, 1px                |

(Edge color uses the branch of the higher-tier endpoint. If both are tier-0
hubs they default to slate.)

Glow on edges is a second `Graphics` stroke pass at lower alpha + slight
blur via Phaser's `setBlendMode("ADD")`. Cheap enough at 100ish edges that
this should not measurably affect frame rate.

## Right Rail Components

### Currently Researching

Top of the rail. Built fresh — current code shows this as a one-line text
label, which is the biggest visual regression to fix.

- 36×36 icon tile with branch tint background
- Tech name + branch/tier subtitle
- Animated progress bar with gradient fill (`#6cf → #fcd96f`)
- Meta line: "X / Y RP · +N RP/turn · ~K turns"
- If queue is empty: render a muted "No research queued — pick a tech below"
  placeholder card instead.

### Selected Tech Detail

Below current research, above queue. The same data the current
`PortraitPanel.updatePortrait` shows, restructured:

- Tech icon + name + branch chip (colored)
- Status badge (Available / Queued / Researching / Completed / Locked)
- Effect description (multi-line, wrapped)
- Cost row: `Cost: N RP` + `Owned: ×K` for repeatables
- Prerequisites if locked: `Requires: <neighbor name>` (placeholder is filled at render time)
- **Action button** — full-width gradient button. Label varies:
  - `Unlock — N RP` when affordable and available
  - `Queue — N RP` when available but unaffordable
  - `Already researching` (disabled) when at queue[0]
  - `In queue · position #N` (disabled) when queued
  - `Maxed out` (disabled) when completed non-repeatable
  - `Requires …` (disabled) when locked

When no tech is selected, render a calm placeholder:
"Select a tech on the graph to see details."

### Queue (Hero Slot Cards)

Fixed slot count, max-queue = current behavior (no enforced cap; just visually
budget 4 visible slots with overflow into a "+N more" footer if longer).

Each filled slot is a card with:

- Grip handle `⋮⋮` on the left (drag affordance, accessibility focusable)
- 22px icon tile with branch color tint
- Tech name (truncated with ellipsis)
- Remove `✕` button on the right (red on hover)

Reordering: drag-and-drop using Phaser pointer events. Drop zones snap between
slots. As a fallback (and for keyboard a11y), arrow buttons appear on hover.

Empty slots render as dashed-border `+ Empty slot` placeholders. Clicking an
empty slot is a no-op (or could subtly hint "select a tech to queue").

The queue card lives in the **right rail** in all 3 tabs — switching to
Researched or Bonuses does not hide the queue.

## Interaction Flow

1. Click a node → graph highlights it with a white outer ring; the Selected
   Detail card in the right rail updates.
2. Click `Unlock` → if affordable, tech researches instantly; queue advances.
   If unaffordable but available, tech is appended to queue. Visual feedback:
   queue gains a new card with a brief slide-in tween; node updates to
   "queued" or "researching" state.
3. Click `✕` on a queue card → tech is removed; remaining cards shift left
   with a 150ms tween.
4. Drag a queue card up/down → reorder. Live preview as you drag (semi-
   transparent ghost card). Drop snaps to nearest valid slot.

## Implementation Boundaries

This work is **UI-only**. The redesign does NOT change:

- `TechTree.ts` core logic (`instantUnlockOrQueue`, `effectiveCost`, etc.)
- `TECH_GRAPH` data in `constants.ts`
- `processResearch` or any turn-step code
- `TechState` shape or save format

What changes:

| File                                | Change                                              |
| ----------------------------------- | --------------------------------------------------- |
| `src/scenes/TechTreeScene.ts`       | Rewritten — new layout, no left portrait            |
| `src/ui/TechGraphCanvas.ts`         | Node/edge rendering: branch colors, glow, breathing |
| `src/ui/TechQueueRow.ts`            | Replaced by `TechQueuePanel.ts` (vertical, cards)   |
| `src/ui/TechCurrentResearchCard.ts` | New — hero current research card                    |
| `src/ui/TechDetailCard.ts`          | New — selected-tech detail with action button       |
| `src/ui/TechResearchedTable.ts`     | New — DataTable wrapper for Researched tab          |
| `src/ui/TechBonusesPanel.ts`        | New — stat card grid for Bonuses tab                |
| `src/game/tech/TechEffects.ts`      | Adds `getEffectBreakdown()` helper                  |
| `packages/spacebiz-ui/src/Theme.ts` | Adds `branchColors` to palette                      |

The 3-tab content panels (Tree / Researched / Bonuses) are sibling containers
managed by `TabGroup`. Only one is visible at a time; the right rail is
outside the tab group.

## Testing Strategy

- Vitest unit tests for `getEffectBreakdown()` covering: empty state, single
  tech, multiple stacks of same effect, mixed branches, repeatable counts.
- Vitest unit tests for `TechBonusesPanel` rendering logic (data → cards)
  with a small mock state.
- Vitest test for the existing `TechQueueRow` test suite migrated to
  `TechQueuePanel` (same behaviors: remove, reorder, render counts).
- Manual QA in dev server: every node state, breathing animation visibility,
  drag-and-drop in the queue, tab switching preserves right rail, click on
  Researched row jumps back to graph with selection.

## Out Of Scope

- Tech preview / "what-if" simulation (showing future state of bonuses).
- Tech search / filter inputs on the graph (could be a follow-up).
- Tooltips on graph nodes (current code has none; we don't add them here).
- Audio cues for unlock / queue / complete (separate ticket).
- Mobile / touch-optimized reordering (drag works on touch but no extra
  affordances).
- Migration of save data — `TechState` shape is unchanged.

## Open Questions

None — all visual and structural decisions confirmed during brainstorming:

- Layout B (right rail, no left sidebar) ✓
- Right rail variant 1 (hero current + slot cards) ✓
- Graph variant B (branch-colored halos) with slow breathing on researching ✓
- Researched = sortable table ✓
- Bonuses = stat card grid ✓
- Selected detail lives in right rail (no popover/modal) ✓
