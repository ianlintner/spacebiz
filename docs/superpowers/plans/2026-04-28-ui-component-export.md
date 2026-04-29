# UI Component Export + Slider Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export Slider, Checkbox, Toggle, RadioGroup from @spacebiz/ui; integrate Slider into game mechanics; document unused components for future use.

**Architecture:** Export all 4 input components from the main UI package (no code changes needed—they're already production-ready). Audit the game to find 2-3 natural numeric input use cases where Slider improves UX. Integrate Slider into those mechanics. Document the remaining 3 components as available for future use.

**Tech Stack:** Phaser 4, TypeScript, existing UI component library

---

## Task 1: Export All Input Components from UI Package

**Files:**

- Modify: `packages/spacebiz-ui/src/index.ts`

- [ ] **Step 1: Open the UI package index file**

Open `packages/spacebiz-ui/src/index.ts`. Scroll to the end of the file (after Line 126).

- [ ] **Step 2: Add Slider export**

After the last export line, add:

```typescript
export { Slider, quantizeSliderValue } from "./input/Slider.ts";
export type { SliderConfig } from "./input/Slider.ts";
```

- [ ] **Step 3: Add Checkbox export**

After Slider, add:

```typescript
export { Checkbox } from "./input/Checkbox.ts";
export type { CheckboxConfig } from "./input/Checkbox.ts";
```

- [ ] **Step 4: Add Toggle export**

After Checkbox, add:

```typescript
export { Toggle } from "./input/Toggle.ts";
export type { ToggleConfig } from "./input/Toggle.ts";
```

- [ ] **Step 5: Add RadioGroup export**

After Toggle, add:

```typescript
export { RadioGroup } from "./input/RadioGroup.ts";
export type { RadioGroupConfig, RadioOption } from "./input/RadioGroup.ts";
```

- [ ] **Step 6: Verify the file**

Check that the index.ts now exports all 4 components with their types. The file should have ~10 new lines added at the end.

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors. (Warnings are OK.)

- [ ] **Step 8: Commit**

```bash
git add packages/spacebiz-ui/src/index.ts
git commit -m "feat(ui): export input components (Slider, Checkbox, Toggle, RadioGroup)"
```

---

## Task 2: Add Documentation Comments to Input Components

**Files:**

- Modify: `packages/spacebiz-ui/src/input/index.ts`

- [ ] **Step 1: Open the input index file**

Open `packages/spacebiz-ui/src/input/index.ts`.

- [ ] **Step 2: Add comment before Checkbox export**

Before the `export { Checkbox }` line, add:

```typescript
/**
 * Checkbox, Toggle, and RadioGroup are available for use but currently
 * not integrated in the game. They're production-ready and can be used for:
 * - Checkbox: opt-in/out toggles, feature flags
 * - Toggle: on/off switches with custom labels (e.g., "Sound: ON" / "Sound: OFF")
 * - RadioGroup: single-choice selection across multiple options (e.g., difficulty)
 *
 * See styleguide/sections/legacy.ts for component examples and usage patterns.
 */
```

- [ ] **Step 3: Verify the file**

Check that the comment is present and properly formatted. The index.ts should now have the documentation block before the unused component exports.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/spacebiz-ui/src/input/index.ts
git commit -m "docs(ui): document available input components for future use"
```

---

## Task 3: Audit Game Code for Slider Use Cases

**Files:**

- Read (no modifications): `src/scenes/**/*.ts`, `src/ui/**/*.ts`

- [ ] **Step 1: Search for numeric input patterns**

Run:

```bash
grep -r "quantity\|volume\|count\|amount\|units\|number" src/scenes src/ui --include="*.ts" | grep -i "text\|input\|button\|select" | head -20
```

This searches for places where quantities or numeric values are handled with text, buttons, or selection UIs.

- [ ] **Step 2: Manually inspect candidate scenes**

Open and inspect these files for numeric controls:

- `src/scenes/TradeScene.ts` - cargo/trade quantities
- `src/scenes/RouteBuilderPanel.ts` - route parameters, ship counts
- `src/scenes/SandboxSetupScene.ts` - setup parameters
- `src/ui/` - any UI panels with numeric inputs

Look for patterns like:

- Text display of a number (e.g., `{quantity}`)
- Plus/minus buttons (e.g., `addBtn`, `subtractBtn`)
- Fixed choices (e.g., "1", "5", "10", "50" buttons)

- [ ] **Step 3: Identify 2-3 best candidates**

Choose 2-3 locations where a Slider would improve UX. Good candidates:

- Current numeric input is via discrete buttons (add/subtract)
- Range is significant (>5 possible values)
- Granular control would be useful to the player

Document the candidates (file name, scene class, what numeric value is being controlled, current UI pattern).

Examples (you may find different ones):

- **RouteBuilderPanel.ts, cargoQuantity** - Currently discrete "+"/"-" buttons for cargo amount. Slider would allow smooth adjustment from 0–maxCargo.
- **TradeScene.ts, tradeAmount** - Numeric input for trade quantities. Slider would be faster than text input.

- [ ] **Step 4: Confirm at least 2 candidates exist**

If you found fewer than 2 good candidates, check if any scene has difficulty, production rate, or other numeric parameters. If none exist, note this and proceed with 1 Slider integration (and document the others as deferred).

---

## Task 4: Implement First Slider Integration

**Files:**

- Modify: `src/scenes/<Scene>.ts` or `src/ui/<Panel>.ts` (identified in Task 3)
- Test: Visual validation in-game

**Assumptions from Task 3 audit:**

- File: `src/ui/RouteBuilderPanel.ts` (example; adjust based on your audit findings)
- Current pattern: Numeric value displayed or adjusted via buttons
- New behavior: Replace with a Slider

- [ ] **Step 1: Import Slider**

At the top of the file (with other imports), add:

```typescript
import { Slider } from "@spacebiz/ui";
```

- [ ] **Step 2: Locate the numeric property**

Find where the numeric value (e.g., `cargoQuantity`) is currently displayed or adjusted. Note:

- The current value
- The min/max range
- What happens when the value changes (what method gets called)

For example, you might find:

```typescript
private cargoQuantity: number = 10;
private updateCargo(delta: number): void {
  this.cargoQuantity = Math.max(0, Math.min(100, this.cargoQuantity + delta));
  this.refreshUI();
}
```

- [ ] **Step 3: Remove old UI for that property**

Find and remove the old numeric control (e.g., "+"/"-" buttons or text field for that property). For example:

```typescript
// REMOVE this:
const addBtn = new Button(this, {
  /* ... */
});
addBtn.on("pointerdown", () => this.updateCargo(1));
```

- [ ] **Step 4: Add Slider in its place**

Create a Slider instance. Use the same coordinate space and styling as surrounding UI:

```typescript
const cargoSlider = new Slider(this, {
  x: /* x position */,
  y: /* y position */,
  width: 200,  // Adjust as needed
  min: 0,
  max: 100,    // Adjust based on game logic
  step: 1,
  value: this.cargoQuantity,
  label: "Cargo Amount",
  showValue: true,
  formatValue: (v) => `${v} units`,  // Adjust as needed
});

cargoSlider.on("change", (value: number) => {
  this.cargoQuantity = value;
  this.refreshUI();
});

this.add(cargoSlider);  // Add to container or scene
```

- [ ] **Step 5: Adjust coordinates and width**

Position the Slider so it doesn't overlap other UI. Adjust width to fit the layout. Use the theme spacing for consistency:

```typescript
const theme = getTheme();
const sliderX = /* calculate from layout */;
const sliderY = /* calculate from layout */;
const sliderWidth = 200;  // Typical slider width; adjust as needed
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors related to Slider or the scene file.

- [ ] **Step 7: Run tests**

```bash
npm run test
```

Expected: All tests pass. (No new tests needed for this integration.)

- [ ] **Step 8: Start the dev server and test in-game**

```bash
npm run dev
```

Expected: Open the browser, navigate to the scene/panel with the new Slider. Verify:

- Slider appears on screen
- Dragging the slider updates the value in real-time
- The formatted value displays correctly (e.g., "50 units")
- Game logic responds correctly (e.g., cargo amount updates, route calculates correctly)

- [ ] **Step 9: Stop the dev server**

Press Ctrl+C in the terminal.

- [ ] **Step 10: Commit**

```bash
git add src/<path>/<Scene>.ts
git commit -m "feat(game): add Slider control for <property name>"
```

---

## Task 5: Implement Second Slider Integration (if applicable)

**Files:**

- Modify: `src/scenes/<Scene2>.ts` or `src/ui/<Panel2>.ts` (identified in Task 3, if it exists)
- Test: Visual validation in-game

**Process:** Repeat Task 4 for the second Slider use case you identified.

- [ ] **Step 1: Import Slider** (same as Task 4, Step 1)

- [ ] **Step 2: Locate the numeric property** (same as Task 4, Step 2)

- [ ] **Step 3: Remove old UI** (same as Task 4, Step 3)

- [ ] **Step 4: Add Slider in its place**

Create the Slider for the second property. Adjust min/max/step/label/formatValue as appropriate for this specific property.

Example (if the second property is "ship count"):

```typescript
const shipCountSlider = new Slider(this, {
  x: /* x position */,
  y: /* y position */,
  width: 200,
  min: 1,
  max: 50,
  step: 1,
  value: this.shipCount,
  label: "Ship Count",
  showValue: true,
  formatValue: (v) => `${v} ships`,
});

shipCountSlider.on("change", (value: number) => {
  this.shipCount = value;
  this.refreshUI();
});

this.add(shipCountSlider);
```

- [ ] **Step 5: Adjust coordinates and width** (same as Task 4, Step 5)

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 7: Run tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 8: Start dev server and test in-game**

```bash
npm run dev
```

Navigate to the second scene/panel. Verify the Slider appears and works correctly.

- [ ] **Step 9: Stop dev server**

Press Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add src/<path>/<Scene2>.ts
git commit -m "feat(game): add Slider control for <property name>"
```

---

## Task 6: Run Full CI and Final Validation

**Files:**

- None (running CI only)

- [ ] **Step 1: Run the full CI suite**

```bash
npm run check
```

This runs:

1. `npm run typecheck` — TypeScript type checking
2. `npm run lint` — ESLint
3. `npm run format:check` — Prettier formatting
4. `npm run test` — Vitest unit tests
5. `npm run build` — Production build

Expected: All gates pass with no errors. (Warnings are OK.)

- [ ] **Step 2: Review the output**

Verify:

- ✓ typecheck: 0 errors
- ✓ tests: All test files passed, all tests passed
- ✓ build: Production bundle built successfully

- [ ] **Step 3: Spot-check the build artifacts**

Open `dist/index.html` in a browser (or run `npm run preview` to serve it). Verify the game loads and Sliders are visible and functional.

```bash
npm run preview
```

Open http://localhost:4173 in browser. Navigate to scenes with Sliders and test interaction.

- [ ] **Step 4: Stop preview server**

Press Ctrl+C.

- [ ] **Step 5: Create a summary commit (optional)**

If you want a final summary commit:

```bash
git log --oneline -5
```

This shows the 5 most recent commits. Verify all your Slider/export commits are present.

- [ ] **Step 6: Verify git status is clean**

```bash
git status
```

Expected: `On branch claude/semantic-theme-tokens-1777383572` with no uncommitted changes. (Some untracked files from styleguide/knobs/sections are OK; they're out of scope for this PR.)

---

## Summary

**Completed tasks:**

1. ✓ Exported Slider, Checkbox, Toggle, RadioGroup from @spacebiz/ui
2. ✓ Added documentation comments for unused components
3. ✓ Audited game code for Slider use cases
4. ✓ Integrated Slider into first game mechanic
5. ✓ Integrated Slider into second game mechanic (if applicable)
6. ✓ Ran full CI and validated

**Artifacts:**

- `packages/spacebiz-ui/src/index.ts` — new exports
- `packages/spacebiz-ui/src/input/index.ts` — documentation comments
- `src/scenes/<Scene>.ts` and/or `src/ui/<Panel>.ts` — Slider integrations

**Test results:**

- All TypeScript: clean
- All tests: passing
- Build: successful
- Game: Sliders functional and integrated

**Next steps (out of scope):**

- Integrate Checkbox, Toggle, RadioGroup (documented as available)
- Implement theme variants (dark/light)
- Polish styleguide system
