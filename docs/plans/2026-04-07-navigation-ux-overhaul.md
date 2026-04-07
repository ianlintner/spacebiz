# Navigation & UX Flow Overhaul

**Date**: 2026-04-07
**Goal**: Make it obvious what the player should do next at every point in the game loop.

---

## Problem Analysis

New players land on GalaxyMapScene after setup with ships but **no routes** and **no guidance** about what to click. The existing adviser/tutorial system generates messages _after_ turns, not _during_ planning. Navigation buttons exist but don't communicate urgency or attention needed.

### Key pain points:

1. **No "what next?" prompt** — player stares at galaxy map with no direction
2. **End Turn has no guard rails** — player can end turn with 0 routes (ships idle, wasting maintenance)
3. **Nav buttons are flat** — no badges/indicators for attention needed (unassigned ships, no routes)
4. **Phase transitions are subtle** — small "Phase: planning" label, no contextual action text
5. **Post-turn always returns to galaxy map** — should route to the scene most relevant to the player's situation
6. **Disabled nav has no explanation** — during sim/review, buttons grey out silently

---

## Changes

### 1. Action Prompt Bar (bottom bar, replaces "Phase: planning" label)

Context-sensitive text in the HUD bottom bar that changes based on game state:

| State                        | Prompt Text                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| Turn 1, no routes            | `💡 Open Routes to set up your first trade route`            |
| Has routes, unassigned ships | `💡 Assign ships to routes in the Fleet screen`              |
| Fleet condition < 50%        | `⚠️ Fleet needs maintenance — check Fleet screen`            |
| In debt 2+ turns             | `⚠️ Cash negative — consider selling ships or taking a loan` |
| All good, planning phase     | `✓ Ready — press ▶ to end turn`                              |
| Simulation phase             | `▶ Simulating Q{n} Y{n}...`                                  |
| Review phase                 | `📊 Reviewing results`                                       |

Priority order: highest-priority issue wins. Simple function, no new files.

### 2. Pre-End-Turn Validation Modal

When player clicks End Turn (▶), check for critical issues and show a confirmation modal:

- **No routes**: "You have no active routes. Your ships will sit idle. End turn anyway?"
- **Unassigned ships**: "2 ships have no route assigned. They'll earn nothing. End turn anyway?"
- **No ships**: "You have no ships! Buy one from Fleet first."

If no issues, proceed directly (no unnecessary friction for experienced players).

### 3. Nav Badge Indicators

Small colored dot/badge on nav sidebar buttons when attention is needed:

- **Routes** button: red dot if 0 routes
- **Fleet** button: yellow dot if unassigned ships or avg condition < 50%
- **Finance** button: red dot if cash < 0

Badges clear when the issue is resolved. Simple `setVisible()` on small circle game objects.

### 4. Smart Post-Turn Scene Routing

After TurnReportScene "Continue", instead of always going to GalaxyMapScene:

- If 0 routes → go to RoutesScene
- If unassigned ships → go to FleetScene
- If cash < 0 and no loans → go to FinanceScene
- Otherwise → GalaxyMapScene (default)

### 5. Disabled Nav Tooltip Text

During simulation/review, nav button tooltips change to explain why disabled:

- "Navigation locked during simulation"
- "Review turn results to continue"

---

## Implementation

All changes are in **GameHUDScene.ts** and **TurnReportScene.ts** only. No new files, no new deps.
