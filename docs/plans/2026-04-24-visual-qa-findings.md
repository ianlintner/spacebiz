# Visual QA Findings — 2026-04-24

Full visual pass over the live Phaser build (`npm run dev`, desktop 1280×800,
tablet 768×1024, mobile 375×812). Scenes exercised: MainMenu, GalaxySetup,
GameHUD + GalaxyMap, SystemMap, PlanetDetail, Fleet, Routes, Contracts,
Finance, TechTree, Market, Empire, Competition, StationBuilder, SandboxSetup,
AISandbox, GameOver.

**No console errors, no failed network requests.** All issues below are
UI/UX/content polish.

Severity: **P0** blocks gameplay, **P1** major UX/content bug, **P2** polish.

---

## P0 — Broken at narrow viewports

### 1. Mobile/tablet layout leaves game unreachable
- **Where:** `src/site.css` + `src/main.ts` (`.game-frame`, `.viewport--hero`)
- **Symptom:** At 768×1024 and 375×812 the `.game-frame__screen--hero`
  keeps a desktop aspect ratio, so the canvas is tiny or the frame holds
  hundreds of px of empty black space above the hero image and command deck,
  pushing buttons well below the fold.
- **Fix:** Collapse the frame's desktop aspect on `(max-width: 900px)` —
  either let the canvas take natural block height (`aspect-ratio: auto;
  min-height: 70vh`) or switch to a full-bleed layout. There's already a
  [responsive-ui-plan](2026-04-06-responsive-ui-plan.md) — verify whether it
  was fully landed.

---

## P1 — Content/UX bugs

### 2. GalaxyMap top-left labels collide with HUD top bar
- **Where:** `src/scenes/GalaxyMapScene.ts`
- **Symptom:** "Galaxy Map" title + "Hyperlanes: 0/4 ▯▯▯▯" render behind
  the HUD's company-name block and cash readout.
- **Fix:** Offset Galaxy Map's title group by the HUD's top-bar height
  (looks like ~56 px) or move it inline into the HUD frame.

### 3. GalaxyMap legend truncated on the right
- **Where:** `src/scenes/GalaxyMapScene.ts`
- **Symptom:** "Scroll to zoom · Drag to p[an]", "Star size = planets in
  syst[em]", "Lines = active trade rout[es]" all clipped.
- **Fix:** Anchor the legend to `right: 16` with right-aligned text or
  clamp the x to `width - textWidth - margin`.

### 4. SystemMap: overlapping "Galaxy" + "Click a planet…" renders as "GaLineos"
- **Where:** `src/scenes/SystemMapScene.ts`
- **Symptom:** Two labels drawn at the same top-left coordinate garble
  into "GaLineos planet for local market details and route setup". Also
  a stray horizontal line visible.
- **Fix:** Separate the title and hint positions; remove the orphan graphic.

### 5. Routes table: cargo column clipped
- **Where:** `src/scenes/RoutesScene.ts` (Route Finder tab)
- **Symptom:** Cargo values render as "Passen", "Luxury" as "Luxur",
  "Techno", "Medica".
- **Fix:** Widen the cargo column by ~40 px, shrink From/To/Empire, or
  use the short label from constants (e.g. `PAX`, `LUX`).

### 6. Market table: column headers clipped
- **Where:** `src/scenes/MarketScene.ts`
- **Symptom:** "Passenge(r)", "Raw Mate(rials)", "Technolo(gy)" cut off.
- **Fix:** Rotate headers 30–45° or use the same short labels as the
  filter chips in the Routes scene.

### 7. Currency symbol inconsistent in Station Builder
- **Where:** `src/scenes/StationBuilderScene.ts` (room palette)
- **Symptom:** Rooms priced `$5,000`, `$10,000`, etc. while every other
  scene uses the `§` glyph for game credits.
- **Fix:** Replace `$` with `§` — `formatCredits()` / `§${n.toLocaleString()}`.

### 8. Cargo labels inconsistent across scenes
- **Where:** `src/scenes/PlanetDetailScene.ts`, `src/scenes/SystemMapScene.ts`
- **Symptom:**
  - PlanetDetail market shows the cargo type as "Raw" (should be "Raw Materials").
  - SystemMap planet tag reads `rawMaterials` (camelCase ID).
- **Fix:** Route both through a shared `CARGO_LABELS` record. SystemMap is
  clearly printing the enum id directly — look for `planet.primaryExport` /
  `planet.tags` rendering.

### 9. AISandbox duplicate company names
- **Where:** `src/game/NewGameSetup.ts` (`AI_COMPANY_NAME_PREFIXES` +
  `AI_COMPANY_NAME_SUFFIXES`) and/or `src/game/ai/AISimulator.ts`
- **Symptom:** Two rivals both named "Prime" in a 4-company sandbox.
- **Fix:** Sample names without replacement; fall back to
  `prefix + "-" + empireShortName` on exhaustion.

### 10. AISandbox activity feed prints raw planet IDs
- **Where:** `src/game/simulation/SimulationLogger.ts`
- **Symptom:** Feed shows `Void Fleet … opened planet-3-1-0→planet-1-4-2`.
- **Fix:** Resolve ids to names when formatting the log line
  (`state.galaxy.planets[id].name`).

### 11. AISandbox turn counter disagreement
- **Where:** `src/scenes/AISandboxScene.ts`
- **Symptom:** Header shows "Turn 2 / 25" while the right-hand meter
  reads "8 / 100 turns".
- **Fix:** One counter is inner-tick vs outer-turn — unify the source or
  relabel (e.g. "2/25 turns · 8/100 sim ticks").

### 12. Competition Scene header collision
- **Where:** `src/scenes/CompetitionScene.ts`
- **Symptom:** Column headers render as "Routes (T3)Ships (T3)Status" with
  no gap.
- **Fix:** Add column width / padding; split "(T3)" tier suffix onto a
  second line or use a subscript style.

### 13. Competition Scene style label "Cherry"
- **Where:** `src/data/constants.ts` (AI personality definitions) or
  `src/game/ai/` where personalities map to display labels
- **Symptom:** Rival Nebula's style shows "Cherry" — almost certainly a
  typo (intended "Cautious" or "Chary"?).
- **Fix:** Grep `"Cherry"` in `src/` and correct.

### 14. GameHUD left-nav is icon-only, no labels/tooltips
- **Where:** `src/scenes/GameHUDScene.ts` (left sidebar button group)
- **Symptom:** Icons alone for Map / Routes / Fleet / Contracts / Research
  / Finance / Empires / Rivals / Hub. At least one (bar-chart vs chart)
  is ambiguous.
- **Fix:** Add a hover tooltip or render a text label beside each icon.

### 15. Galaxy Setup regenerates seed + system options on every mount
- **Where:** `src/scenes/GalaxySetupScene.ts` (HMR / scene.start cycles)
- **Symptom:** Backing out of Setup and re-entering presents a different
  seed and different starting systems, even though the user hadn't asked
  to randomize.
- **Fix:** Persist last-chosen seed/preset in a module-level cache or
  game registry; only regenerate on explicit "Randomize".

---

## P2 — Polish

### 16. Fleet: Sell Ship / Overhaul enabled with empty fleet
`src/scenes/FleetScene.ts` — disable when `state.fleet.length === 0`.

### 17. Fleet: cash shown twice (HUD top bar + inline "Cash: §275,000")
`src/scenes/FleetScene.ts` — drop the inline label, it's redundant.

### 18. Contracts: "Accept Contract [Enter]" enabled with zero contracts
`src/scenes/ContractsScene.ts` — disable when list empty.

### 19. Sandbox Setup has no visible "selected" state
`src/scenes/SandboxSetupScene.ts` — the default Quick / Spiral / 4 /
Normal / Standard buttons should use the same active style as the
`GalaxySetupScene` preset buttons (`Button.setActive`).

### 20. GameOver adviser modal covers High Scores panel
`src/scenes/GameOverScene.ts` — anchor REX modal to the bottom third or
skip auto-open on GameOver (high scores are the primary content).

### 21. Adviser: click-to-advance vs click-to-dismiss
`src/game/adviser/AdviserEngine.ts` / portrait overlay — clicking the
card body steps through messages; only the × in the corner dismisses.
Consider: click anywhere advances, click × dismisses, ESC dismisses.

### 22. Adviser: stale onboarding script after setup complete
Adviser opens with "First, name your company and choose a starting
system" after Launch. Step-one prompts should fire before Launch, not
on first HUD load.

### 23. Finance: Hub starts with a room + upkeep at Level 0
`src/game/NewGameSetup.ts` — player begins with 1 "Simple Terminal"
installed at Hub Level 0 but the P&L already shows `-§500 Upkeep / Turn`.
Either grant a rent-free Level 0, or start the player at Hub Level 1 so
the UI isn't "Level 0" with paid rooms.

### 24. "Q1 Y1" bottom-right badge hugs the ▶ end-turn button
`src/scenes/GameHUDScene.ts` — add ~12 px margin between the turn badge
and the play arrow.

### 25. Setup "Planets: 1" starting systems feel thin
`src/game/NewGameSetup.ts` — three starter options all listed 1-planet
systems (Aldirus/Corithius/Feririon after first load). When only 1 of 3
options has >1 planet, pick higher-planet systems for two of the three.

### 26. Empire / Diplomatic Relations is a raw O(n²) matrix
`src/scenes/EmpireScene.ts` — at 8 empires this is 56 rows with no
filter. Add a "Involves my empire" toggle at the top, default on.

### 27. Adviser card width eats the right edge of the HUD nav
At 813 px display, the REX adviser card's × close button sits right on
top of the right-side HUD nav badge. Pad the adviser's right edge.

---

## Recommended ordering

1. **P0 responsive fix** — today's biggest blocker for anyone loading on
   a laptop with a narrow window. Likely small CSS diff.
2. **P1 text & content bugs** (items 5–14) — each is localized to one
   scene and cheap to ship. Batch into one PR titled "Scene text polish".
3. **P1 UX coherence** (items 14, 15, 21, 22) — small individual changes,
   bigger combined effect on first-run feel.
4. **P2 polish** — schedule alongside whatever scene is next being
   touched; no single one blocks play.

---

## Out of scope (flagged for later)

- Full mobile support (control scheme, not just layout) — needs its own
  plan.
- AISandbox turn counter redesign — only matters if AISandbox is meant
  to be user-facing vs. a dev tool.
- Galaxy Map: no visible "player home" marker or camera centering on
  start. Worth a dedicated UX pass.

---

## Gameplay-Critical Bugs (discovered via source-code deep-dive — 2026-04-24)

These are **separate from the visual issues above** and go beyond UI polish.
They affect the core game loop and economy balance.

Severity: **P0** blocks/breaks gameplay, **P1** major balance/logic bug.

---

### G1 (P0): Starter fleet is always empty — no ships at game start

- **Files:** `src/data/constants.ts` lines 201, 217, 233; `src/game/NewGameSetup.ts` lines 273–282
- **Symptom:** Fleet screen shows "No ships in your fleet" on every new game.
  The Route Finder shows 0 idle ships. Players cannot trade without buying a ship first,
  but the UI gives no guidance about this.
- **Root cause:** All three game-length presets (`quick`, `standard`, `epic`) have
  `startingShips: 0`. The loop in `NewGameSetup.ts` that would create a Cargo Shuttle
  (i=0) and Passenger Shuttle (i=1) never executes.
- **Test confirmation:** `NewGameSetup.test.ts:43–48` asserts `fleet.length === 0`
  and documents "players auto-buy ships" as intended behaviour — but no in-game
  onboarding explains this, leaving new players stuck.
- **Fix options:**
  - **Option A** — Restore starter ships: set `startingShips: 2` in `quick` and
    `standard` presets; update the test to expect `fleet.length >= 2`.
  - **Option B** — Keep empty fleet but add explicit onboarding: show a mandatory
    "Buy your first ship to get started" prompt in the Fleet scene when fleet is empty,
    and update the Adviser intro script to guide the player to the Fleet screen before
    Routes.

---

### G2 (P0): Route profit values are 50–400× too high for short-distance routes

- **Files:** `src/game/routes/RouteManager.ts` lines 89–96; `src/data/constants.ts` line 48
- **Symptom:** Route Finder shows §4.4M profit for a dist=1.1 route at game start.
  Even dist=5 routes show §500k–§1M profit. The entire economy is warped.
- **Root cause:** `calculateTripsPerTurn` uses `floor(TURN_DURATION / roundTripTime)`
  with no upper cap. `TURN_DURATION=100` and the galaxy generator places planets
  1–5 canvas pixels from their star, so intra-system distances are ~1–7 px. This
  produces 28–200 trips/turn. There is **no `MAX_TRIPS_PER_TURN` ceiling** anywhere.
- **Concrete example:** dist=1.1, shipSpeed=4 → roundTripTime=0.55 → **181 trips/turn**
  → 181 × 80 cargo × §50 price = §724,000 per turn for one ship on one route.
- **The `INTRA_SYSTEM_REVENUE_MULTIPLIER=0.5` band-aid** (`constants.ts` line 54)
  was added to partially dampen this but halving §724k still gives §362k — still
  wildly inflated.
- **Fix (recommended — add a trips cap):**
  ```ts
  // RouteManager.ts line 95 — add a cap
  export const MAX_TRIPS_PER_TURN = 10; // ships make at most 10 round trips per turn
  // in calculateTripsPerTurn:
  return Math.min(MAX_TRIPS_PER_TURN, Math.max(1, Math.floor(TURN_DURATION / roundTripTime)));
  ```
  A cap of 10 means a dist=1.1 route gets the same 10 trips as a dist=5 route —
  short routes remain profitable but not broken. Adjust `MAX_TRIPS_PER_TURN` to
  taste after playtesting.
- **Alternative fix:** Scale up all galaxy distances by 50× in `GalaxyGenerator.ts`
  so a "short" intra-system distance becomes ~50–250 instead of 1–5, bringing
  trips/turn to 1–4 naturally.

---

### G3 (P1): `estimateRouteRevenue` disagrees with actual simulation revenue

- **Files:** `src/game/routes/RouteManager.ts` lines 596–618; `src/game/simulation/TurnSimulator.ts` lines 170–174
- **Symptom:** The profit shown in the Route Finder and Active Routes tab is
  systematically wrong — 2× over for intra-system routes, up to 1.5× under
  for long inter-system routes.
- **Root cause:** `estimateRouteRevenue()` (used by the UI) omits both modifiers
  that the actual simulation applies:
  - `INTRA_SYSTEM_REVENUE_MULTIPLIER = 0.5` (halves local route revenue in sim)
  - `distancePremium` bonus up to `+50%` for long routes (added in sim, missing from estimate)
- **Fix:** Update `estimateRouteRevenue` to apply the same multiplier logic:
  ```ts
  // RouteManager.ts ~line 617 — match TurnSimulator.ts logic
  const isLocal = isLocalRoute(route, state);
  const distancePremium = isLocal
    ? 0
    : Math.min(DISTANCE_PREMIUM_CAP, route.distance * DISTANCE_PREMIUM_RATE);
  const multiplier = isLocal ? INTRA_SYSTEM_REVENUE_MULTIPLIER : 1 + distancePremium;
  return Math.round(trips * capacity * price * multiplier * 100) / 100;
  ```
  This requires passing `state` (or at minimum the route's origin/dest for `isLocalRoute`)
  into `estimateRouteRevenue`. The function signature change will require updates in
  `RoutesScene.ts` and any other callers.

---

### G4 (P1): Route Finder uses raw `currentPrice` instead of `calculatePrice()`

- **File:** `src/game/routes/RouteManager.ts` line 765; `src/game/simulation/TurnSimulator.ts` line 146
- **Symptom:** Route Finder profit estimates diverge further from actuals when market
  saturation is nonzero, because the UI reads `destEntry.currentPrice` directly while
  the simulation calls `calculatePrice(destEntry, route.cargoType)` which applies
  saturation and demand adjustments.
- **Fix:** Replace `destEntry.currentPrice` with `calculatePrice(destEntry, route.cargoType)`
  in `scanAllRouteOpportunities` at line 765.

---

### G5 (P1): Profit column has no "per turn" qualifier — players misread it as per-trip

- **File:** `src/scenes/RoutesScene.ts` line 311
- **Symptom:** Column header reads `"Profit"` with no time qualifier. Since each turn
  represents a long period with many trips, the per-turn value is much larger than
  per-trip, and new players assume it's the per-trip revenue.
- **Fix:** Change label to `"Profit/turn"` or add a subtitle row to the table header.

---

### G6 (P1): favicon.ico missing — console 404 error on every page load

- **File:** `public/favicon.ico` (missing)
- **Symptom:** Browser console shows two 404 errors for `/favicon.ico` on load.
- **Fix:** Add a favicon. Simplest: copy/create a 32×32 `.ico` file in `public/`.
  Or add `<link rel="icon" href="data:,">` to `index.html` to suppress the request.

---

## Fix priority order (gameplay bugs)

| Priority | Bug | Effort | Impact |
|---|---|---|---|
| **P0** | G2: Add `MAX_TRIPS_PER_TURN` cap | Small (2 lines + constant) | Fixes economy completely |
| **P0** | G1: Add fleet onboarding OR restore starter ships | Small-medium | Unblocks new players |
| **P1** | G3: Fix `estimateRouteRevenue` multipliers | Medium (signature change) | Accurate profit display |
| **P1** | G4: Use `calculatePrice()` in Route Finder | Tiny (1 line) | More accurate estimates |
| **P1** | G5: Add "/turn" to Profit column header | Tiny (1 char) | Clearer UI |
| **P1** | G6: Add favicon | Tiny | Clean console |
