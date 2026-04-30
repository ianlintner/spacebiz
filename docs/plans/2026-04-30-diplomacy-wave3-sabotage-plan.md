# Diplomacy Wave 3 — Slice 1: Sabotage

Status: in-progress
Branch: `claude/diplomacy-wave3-sabotage`

## Why this slice

Of the wave-3 backlog (sabotage / contract-poaching / smear / tech integration /
empire-vs-empire reactions / blockades / multi-turn ops / call-in-favor),
**sabotage is the highest-impact verb**. The original spec calls it out as
"the most novel mechanic," and it slots cleanly into the existing
`DiplomacyResolver` shape (gift / lobby / non-compete / surveil are all
parallel single-call resolvers). It also opens the door for follow-up
slices (smear is a tag-injection variant, contract-poaching is a payload
swap) so it earns its complexity.

## Concrete shape

### Data model

- New `DiplomacyActionKind`: `"sabotage"`.
- New `StandingTag`: `{ kind: "Sabotaged"; expiresOnTurn: number }`. Applied to
  the rival on success — surfaces in the hub as a "bad" intent badge.
- Reuse the existing `SuspectedSpy:player` tag on exposure (failure path), so
  the existing AI offer reaction in `selectDiplomacyOffer` already covers it.

### Resolver

`resolveSabotage(state, action, rng)` — mirrors `resolveSurveil` shape:

- Cost: `30_000` cash. On failure, refund 50% (matches gift refund pattern).
- Cooldown: `8` turns (longer than surveil's 6 — sabotage is heavier).
- Base success: `0.5` (50/50 — riskier than surveil's 0.65).
- On success:
  - Add `Sabotaged` tag to the rival, expiring in `4` turns.
  - Deduct `200_000` cash from the targeted rival's `cash` (in
    `state.aiCompanies`). This models the disruption — capped at the rival's
    current cash so we never go negative.
  - Digest entry naming the rival and the cash hit.
- On failure (exposed):
  - Add `SuspectedSpy:player` tag to the rival (TTL `5` turns — same as
    surveil exposure).
  - Modal entry: "Sabotage exposed" — their counter-intel team flagged you.

### Dispatcher + queue helper

- Add `sabotage` to the switch in `resolveDiplomacyAction`.
- Add `"Sabotage"` label to the verb map in `DiplomacyScene.refreshQueuedSummary`.

### Hub integration

- New action descriptor in `getActionsForRival`:
  `{ kind: "sabotage", label: "Sabotage Operation", cashCost: 30_000, category: "single" }`.
- New tag badge in `describeTag` for `Sabotaged`:
  - Label: `Sabotaged`
  - Intent: `bad` (it's bad for the rival, but the player sees it as their
    own offensive action — neutral might also fit, but `bad` keeps the badge
    color stable with the existing convention that "Spied!" on rival rows
    means a hostile relation marker is in play).

### AI reaction (light touch)

- Extend `selectDiplomacyOffer` to also fire the rival warning event when the
  rival has a `Sabotaged` tag. The warning copy stays the same — the
  mechanic is identical (the rival is angry at the player). This means even
  if the player gets in clean (no `SuspectedSpy:player`), they still face
  some narrative blowback while the `Sabotaged` tag is live.

### What we do NOT do in this slice

- No tech-tree integration (deferred — slice 4 of the backlog).
- No multi-turn setup→execute→reveal flow (slice 7).
- No ripple to empire-of-rival's standing (slice 5 territory).
- No blockades (slice 6).

## TDD task list

Each task gets a failing test first, then implementation, then `npm run check`.

1. **Type plumbing** — extend `DiplomacyActionKind` and add `Sabotaged` to
   `StandingTag`. (Compile-only; verified via typecheck rather than a test.)
2. **`describeTag` for `Sabotaged`** — extend
   `diplomacyHubHelpers.describeTag` so the new tag is renderable. Test:
   intent + label assertions.
3. **`getActionsForRival` includes sabotage** — extend the helper. Test:
   sabotage descriptor present with right cost/category.
4. **Resolver: success path** — `DiplomacyResolver.sabotage.test.ts`. Find
   a success seed; assert `Sabotaged` tag on rival, rival cash deducted by
   200k (or capped), digest entry, no modal, cash spent in full.
5. **Resolver: failure path** — find a failure seed; assert
   `SuspectedSpy:player` tag, modal entry, no `Sabotaged` tag, half cash
   refunded.
6. **Resolver: cooldown + counter** — assert `sabotage:<rival>` cooldown
   set to `turn + 8` and `actionsResolvedThisTurn` incremented.
7. **Resolver: rival cash floor** — when rival cash < 200k, deduction is
   capped at current cash (no negatives).
8. **Dispatcher integration** — extend
   `DiplomacyResolver.dispatch.test.ts` with a `sabotage` dispatch case.
9. **AI offer reaction** — extend `DiplomacyAI.test.ts`: when only the
   `Sabotaged` tag is present (no `SuspectedSpy`), `selectDiplomacyOffer`
   can still produce a `diplomacy:rivalSpyWarning` event.
10. **Scene queue label** — verb-map test (the existing helpers tests
    don't cover this; we'll add a smoke-test by exercising the hub helpers
    only — the scene-level verb map is small enough to verify by reading
    after the change).

## Verification

- `npm run check` clean.
- New test count: ~10 added tests on top of 1417+.
- Manual: skip — the slice is data + helpers + resolver. The hub UI
  integration is exercised by existing scene tests + the helper tests.
  No new picker shape, no new layout.
