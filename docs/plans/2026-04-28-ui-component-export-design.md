# UI Component Library Export + Slider Integration

**Date:** 2026-04-28  
**Branch:** claude/semantic-theme-tokens-1777383572  
**Scope:** Export input components (Slider, Checkbox, Toggle, RadioGroup) from @spacebiz/ui; integrate Slider into game mechanics; document unused components for future work.

## Overview

The UI library has four production-ready input components (Slider, Checkbox, Toggle, RadioGroup) that are implemented with tests but not yet exported or integrated into the game. This work:

1. Exports all 4 components from the main UI package
2. Integrates Slider into 2-3 game mechanics where numeric range input is natural
3. Documents Checkbox/Toggle/RadioGroup as available for future use
4. Defers theme tokens and styleguide polish work to future PRs

## Component Library Export

### What Components Are Exported

All 4 input components from `packages/spacebiz-ui/src/input/`:

- **Slider** — numeric range input with optional formatting
- **Checkbox** — boolean checkbox with label
- **Toggle** — iOS-style on/off switch with custom labels
- **RadioGroup** — single-choice selection from multiple options

Each has:

- Full TypeScript types (Config interfaces)
- Unit tests in `__tests__/`
- Integration with theme system

### Export Implementation

Add to `packages/spacebiz-ui/src/index.ts`:

```ts
export { Slider, quantizeSliderValue } from "./input/Slider.ts";
export type { SliderConfig } from "./input/Slider.ts";

export { Checkbox } from "./input/Checkbox.ts";
export type { CheckboxConfig } from "./input/Checkbox.ts";

export { Toggle } from "./input/Toggle.ts";
export type { ToggleConfig } from "./input/Toggle.ts";

export { RadioGroup } from "./input/RadioGroup.ts";
export type { RadioGroupConfig, RadioOption } from "./input/RadioGroup.ts";
```

No changes to the components themselves; they're already production-ready.

## Slider Integration in Game

### Strategy

Slider is the most universally useful input control (numeric ranges are common in games). Checkbox/Toggle/RadioGroup have fewer obvious use cases without creating new UI.

Integration focuses on:

1. **Finding existing text/button-based numeric input** — replace with Slider
2. **Enhancing existing mechanics** — where granular control improves gameplay

### Identified Integration Points

Audit will look for:

- **Ship quantity selection** — Routes UI or fleet management (e.g., "select 1–50 ships for this route")
- **Cargo volume adjustment** — Trade routes or station commerce (e.g., "sell 0–100 units of ore")
- **Parameter tuning** — If game has difficulty, economy, or production parameters (e.g., "production rate: 0–10x")

At least 2 use cases will be implemented. If fewer natural fits exist, additional ones are documented as "would benefit from Slider but deferred."

### Integration Pattern

Each Slider instance will:

- Use theme colors and layout from getTheme()
- Include optional formatting (e.g., "50 units", "2.5x multiplier")
- Emit onChange callbacks that update game state
- Be tested by visual validation (playing the game) and existing unit tests

## Documentation for Unused Components

### Checkbox, Toggle, RadioGroup

Add a comment in `packages/spacebiz-ui/src/input/index.ts`:

```ts
/**
 * Checkbox, Toggle, and RadioGroup are available for use but currently
 * integrated in the game. They're production-ready and can be used for:
 * - Checkbox: opt-in/out toggles, feature flags
 * - Toggle: on/off switches with custom labels (e.g., "Sound: ON" / "Sound: OFF")
 * - RadioGroup: single-choice selection across multiple options (e.g., difficulty)
 *
 * See styleguide/sections/legacy.ts for component examples and usage patterns.
 */
export { Checkbox } from "./Checkbox.ts";
export type { CheckboxConfig } from "./Checkbox.ts";

export { Toggle } from "./Toggle.ts";
export type { ToggleConfig } from "./Toggle.ts";

export { RadioGroup } from "./RadioGroup.ts";
export type { RadioGroupConfig, RadioOption } from "./RadioGroup.ts";
```

This makes their availability discoverable to future developers.

## Testing & Validation

### Unit Tests

All input components have unit tests in `packages/spacebiz-ui/src/input/__tests__/`:

- Checkbox.test.ts
- Toggle.test.ts
- RadioGroup.test.ts
- Slider behavior validated through integration (no dedicated unit test, but used in scenes)

These remain unchanged and passing.

### Integration Testing

Slider integration is validated by:

1. **Visual inspection** — Play the game, verify Sliders appear and respond to input
2. **Game state** — Verify slider changes propagate correctly to game logic
3. **CI gates** — All tests pass, build succeeds, no TypeScript errors

No new test files are required; integration tested through manual play.

## Implementation Order

1. **Export components** — Add all 4 to UI package index.ts (5 min)
2. **Audit game for Slider use cases** — Scan src/scenes and src/ui for numeric input (10 min)
3. **Implement first Slider integration** — Replace or enhance one game mechanic (20 min)
4. **Implement second Slider integration** (if applicable) (15 min)
5. **Add documentation comments** — Mark unused components (5 min)
6. **Run CI and validate** — Typecheck, test, build, manual play (10 min)

**Estimated time:** ~1 hour

## Out of Scope

This PR does NOT:

- Implement theme variants (dark/light/high-contrast)
- Polish the styleguide system
- Integrate Checkbox, Toggle, or RadioGroup into the game
- Create new game features solely to use input components

These are deferred to future work.

## Success Criteria

- ✓ All 4 input components exported from @spacebiz/ui
- ✓ Slider integrated into 2–3 game mechanics
- ✓ Checkbox/Toggle/RadioGroup documented as available
- ✓ All tests passing (typecheck, unit tests, build)
- ✓ Manual validation: Sliders appear and work correctly in game
