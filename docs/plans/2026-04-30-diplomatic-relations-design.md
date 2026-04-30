# Diplomatic Relations System (Wave 1) — Design

**Date:** 2026-04-30
**Status:** Design approved, pending implementation plan
**Scope:** Wave 1 (symmetric thin slice). Wave 2 items listed at end.

## 1. Purpose & Scope

Add character-driven narrative interactions between the player's company and other actors in the game world (empires and rival companies). The system extends the existing dilemma pattern: the same modal/portrait/choice UI handles diplomatic dialog, but interactions can also be **player-initiated** through a dedicated Foreign Relations hub — not only AI-initiated as dilemmas are.

The wave 1 ship is a **symmetric thin slice**: one peaceful action and one structural action per target type, plus a single risk verb. The full vocabulary (sabotage, contract poaching, smear, tech-improved espionage, multi-turn operations) is deferred to wave 2.

### Verbs shipping in wave 1

| Verb                | Target                           | Purpose                                                                       |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| Send Gift           | Empire or Rival                  | Buy standing, may earn `OweFavor`                                             |
| Lobby For           | Empire (subject = a Rival)       | Move that empire's view of a third-party rival upward                         |
| Lobby Against       | Empire (subject = a Rival)       | Move that empire's view of a third-party rival downward                       |
| Propose Non-Compete | Rival (subject = an Empire pair) | Mutual market segregation agreement                                           |
| Surveil (Espionage) | Rival                            | Reveal one of: cash / top contract by value / top empire-standing for 3 turns |

### AI-initiated offers (wave 1)

Rivals and empires can push offers into the existing `pendingChoiceEvents[]` queue, throttled to ≤1/turn sharing the dilemma slot:

- Empire offers exclusive contract (when standing ≥ Warm)
- Empire delivers diplomatic gift (random, cooldown-gated)
- Rival proposes non-compete (when player has 2+ contracts in empires they care about)
- Rival ambassador delivers warning if `SuspectedSpy:Player` was set during espionage exposure

## 2. Design principles

- **Reuse the dilemma pattern.** The dialog modal, choice options, success rolls, and effect resolver already exist. Diplomacy adds new content and a hub UI on top — not a parallel system.
- **Tags carry narrative state; standing carries temperature.** A single 0–100 number per target represents the relationship's current temperature. Durable narrative state (broken promises, owed favors, suspected espionage, non-compete pacts) lives as **tags** with explicit expiry turns. This keeps balance math simple while giving emergent flavor.
- **Tight loop, no spam.** Per turn, at most 3 diplomacy modals fire (≤2 player-initiated outcomes that breach the modal threshold + ≤1 AI-initiated offer). Routine outcomes route to the review-phase digest. Tier transitions, espionage exposure, and non-compete acceptance/refusal always earn a modal.
- **Ambassadors recur, rulers are rare.** Each empire and rival gets a generated ambassador / relations director who handles routine diplomacy. The ruler/CEO portrait surfaces only for high-stakes moments (tier transitions, espionage exposure, formal offers).

## 3. Data model

### 3.1 New types (in `src/data/types.ts`)

```ts
type StandingTag =
  | { kind: "OweFavor"; expiresOnTurn: number }
  | { kind: "RecentlyGifted"; expiresOnTurn: number }
  | {
      kind: "SuspectedSpy";
      suspectId: "player" | string;
      expiresOnTurn: number;
    }
  | {
      kind: "NonCompete";
      protectedEmpireIds: readonly string[];
      expiresOnTurn: number;
    }
  | {
      kind: "LeakedIntel";
      lens: "cash" | "topContractByValue" | "topEmpireStanding";
      value: string;
      expiresOnTurn: number;
    };

interface Ambassador {
  name: string;
  portrait: CharacterPortrait;
  personality: "formal" | "mercenary" | "suspicious" | "warm";
}

type DiplomacyActionKind =
  | "giftEmpire"
  | "giftRival"
  | "lobbyFor"
  | "lobbyAgainst"
  | "proposeNonCompete"
  | "surveil";

interface QueuedDiplomacyAction {
  id: string;
  kind: DiplomacyActionKind;
  targetId: string; // empireId or rivalId
  subjectId?: string; // for lobby (rivalId) or non-compete (empire pair)
  subjectIdSecondary?: string;
  surveilLens?: "cash" | "topContractByValue" | "topEmpireStanding";
  cashCost: number;
}

interface DiplomacyState {
  // Standing (0..100). empireStanding promotes the existing empireReputation field.
  empireStanding: Record<string, number>;
  rivalStanding: Record<string, number>;

  // Tags per target.
  empireTags: Record<string, readonly StandingTag[]>;
  rivalTags: Record<string, readonly StandingTag[]>;

  // Generated at game start, persisted thereafter.
  empireAmbassadors: Record<string, Ambassador>;
  rivalLiaisons: Record<string, Ambassador>;

  // cooldownKey -> next available turn.
  // Single-target actions: `${actionKind}:${targetId}` (e.g., "giftEmpire:vex").
  // Lobby actions are per (empire, rival) pair: `${actionKind}:${empireId}:${rivalId}` (e.g., "lobbyFor:vex:chen").
  cooldowns: Record<string, number>;

  // Queue populated during planning, drained during simulation.
  queuedActions: readonly QueuedDiplomacyAction[];

  // Diagnostic: count of player-initiated actions resolved this turn.
  actionsResolvedThisTurn: number;
}
```

### 3.2 Extensions to `GameState`

- Add `diplomacy: DiplomacyState`.
- The existing stubbed `empireReputation: Record<empireId, number>` field is renamed/promoted into `diplomacy.empireStanding`. Existing code that touches `empireReputation` (currently unwired) gets updated to read from the new path. No save-migration concern — the field isn't currently surfaced to gameplay.

### 3.3 Standing tiers

Internally a 0–100 number; player sees the tier label and a progress bar within the tier:

| Tier    | Range  |
| ------- | ------ |
| Hostile | 0–19   |
| Cold    | 20–39  |
| Neutral | 40–59  |
| Warm    | 60–79  |
| Allied  | 80–100 |

Tier transitions are always modal (they're the moments that earn the screen).

## 4. Action catalog

| Action              | Cash                                                                   | Cooldown / target           | Success roll                                                                                                                                 | Outcome on success                                             | Outcome on failure                                  | Default surface                            |
| ------------------- | ---------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Send Gift (empire)  | base 5k + 1.5k × number of systems controlled by that empire (cap 20k) | 3 turns                     | 70% base, +10% if `RecentlyGifted` absent                                                                                                    | +8 standing, `RecentlyGifted` (3t), 30% chance `OweFavor` (5t) | Refused, 50% cash refund                            | Digest on accept; modal on refuse          |
| Send Gift (rival)   | ~3–12k                                                                 | 3 turns                     | 80% base                                                                                                                                     | +6 standing, `RecentlyGifted` (3t)                             | Refused                                             | Digest on accept; modal on refuse          |
| Lobby For/Against   | ~10–25k                                                                | 4 turns per (empire, rival) | 60% base, +15% if `OweFavor` from that empire                                                                                                | ±10 standing on the _empire's view of the named rival_         | No effect, 50% cash refund                          | Digest unless tier transition              |
| Propose Non-Compete | 0 cash                                                                 | 5 turns per rival           | Rival accepts iff standing ≥ Cold and the deal is in their strategic interest (heuristic: each side gets ≥1 empire in their top-3 contracts) | Mutual `NonCompete` (10t); breach = −20 standing + tag drop    | Refused                                             | Always modal (rival CEO portrait)          |
| Surveil             | ~15k                                                                   | 6 turns per rival           | 65% base                                                                                                                                     | `LeakedIntel` tag with chosen lens (3t)                        | Exposed: `SuspectedSpy:Player` on rival's tags (5t) | Digest on clean success; modal on exposure |

### 4.1 Cross-target dampener (anti-grind)

While _any_ empire has the `RecentlyGifted` tag active, gift effectiveness across all empires halves (+8 → +4). Same applies to rivals. This prevents round-robin gift grinding.

### 4.2 Diminishing returns

Above standing 70, all positive standing changes scale by `(100 - currentStanding) / 30`, so reaching Allied (80+) requires sustained investment, not a single gift spree.

### 4.3 Global throttle

`diplomacy.actionsResolvedThisTurn ≤ 2`. Raised to 3 when player reputation tier ≥ `renowned`. Player can _queue_ up to the cap during planning; the simulator ignores any queued action beyond the cap with a digest-only "deferred" line.

## 5. AI behavior

Wave 1 ships **reactive policy**, not a full AI. Each turn during simulation, after dilemma selection:

1. `selectDiplomacyOffer(state)` builds candidate offers from each empire and rival based on standing tier, tags, and recent player actions.
2. Candidates are scored by _interestingness_ (in priority order):
   1. Tier transitions in either direction
   2. Tag-driven hooks (e.g., `SuspectedSpy:Player` → rival warning event)
   3. Standing-tier-gated offers (Warm+ → exclusive contracts, Allied → alliance overture)
   4. Random gift / friendly note
3. At most one offer is emitted into `pendingChoiceEvents[]`. Storyteller's existing cooldown logic gates this — diplomacy offers compete with regular dilemmas for the single slot.

### 5.1 Standing drift

Each turn, all standing values drift toward 50 (Neutral) by 1 point. Hostile standings (< 30) drift only after 3 consecutive turns of no negative action. Drift is silent (digest only if a tier transition occurs).

### 5.2 Tag expiry

Tags carry `expiresOnTurn`. At the top of `tickDiplomacyState(state)`, expired tags are stripped before action processing. A digest line announces expiry only for tags the player initiated (e.g., "Non-Compete with Chen Logistics expired").

## 6. UI surface

### 6.1 Foreign Relations hub — new `DiplomacyScene`

Reachable from a "Foreign Relations" button on the planning HUD, alongside Fleet / Routes / Contracts.

**Layout (text sketch):**

```
+----------------------------------------------------+
| Foreign Relations          Actions: 0/2    AP: -- |
+--------------------+-------------------------------+
|  Empires (5)       |   [Selected target panel]     |
|  o Vex Hegemony    |   ┌─────────────────────────┐ |
|    [Warm 64]       |   │  [Ambassador portrait]  │ |
|    tags: OweFavor  |   │  Ambassador Krell       │ |
|  o Sol Federation  |   │  "Standing: Warm (64)"  │ |
|    [Neutral 48]    |   │  Tags: OweFavor (3t)    │ |
|  ...               |   └─────────────────────────┘ |
|                    |                                |
|  Rivals (4)        |   Actions:                    |
|  o Chen Logistics  |   [ Send Gift  $12k ]         |
|    [Cold 32]       |   [ Lobby For ▾ $18k ]        |
|    intel: cash=2.1M|   [ Lobby Against ▾ $18k ]    |
|  o ...             |   [ Surveil ▾ $15k ]          |
+--------------------+-------------------------------+
```

- **Left rail:** scrollable list of empires + rivals, sorted by `|standingChangeThisTurn|` then alphabetically. Each row shows tier label, up to 2 tag badges (with "+N" overflow), and intel badges if surveillance is active.
- **Right pane:** selected target. Portrait, name, tier badge, full tag list, action buttons. Buttons show cost, cooldown remaining, and target dropdown for Lobby/Surveil ("Lobby Vex against… [Chen Logistics ▾]").
- **Header counter:** `Actions: X/2` (shows Y/3 at high reputation). Buttons disabled at cap.

Reuses existing `Panel`, `Button`, `Label`, `ScrollableList`, `DataTable`, `ProgressBar` from `src/ui/`.

### 6.2 Character dialog modal — `CharacterDialogModal`

Extracted from the existing `DilemmaScene` rendering logic into a reusable component. The dilemma scene continues to use it; diplomacy outcomes also use it.

```ts
interface CharacterDialogProps {
  speaker: { name: string; subtitle: string; portrait: CharacterPortrait };
  speakerTier: "ambassador" | "ruler"; // affects header style
  flavor: string; // template-resolved by personality + tier
  options: ChoiceOption[]; // reuses existing ChoiceOption type
  onChoose: (id: string) => void;
}
```

- **Ambassador tier:** muted gold text, smaller portrait frame, header "Ambassador Krell · Vex Hegemony".
- **Ruler tier:** full gold accent, larger portrait, distinctive frame, slow fade-in. Header "Emperor Vex IX".

Player-initiated outcomes that breach the modal threshold (refusal, exposure, tier transition) and AI-initiated offers both use this component.

### 6.3 Review-phase digest

The existing review screen gains a "Diplomatic activity" section listing routine outcomes:

- "Gift to Vex Hegemony accepted: +8 standing"
- "Surveillance of Chen Logistics: leaked cash position 2.1M (3 turns)"
- "Sol Federation drifted from Warm → Neutral"

One line per resolved action. No modal interruption.

### 6.4 Copy templating

Flavor lines are picked from a pool keyed by `(eventKind, personalityTag, tierBucket)`. This bounds writing burden to ~16 templates per event type rather than per-character bespoke. Same indexing pattern as existing dilemma copy.

## 7. Pacing / spam control summary

Per turn, **total diplomacy modal volume ≤ 3**:

- ≤ 2 player-initiated outcomes that breach the modal threshold (refusal, exposure, tier transition, non-compete proposal). Most outcomes resolve to digest.
- ≤ 1 AI-initiated diplomacy offer (sharing the dilemma slot via Storyteller).
- Tier transitions, espionage exposure, and non-compete acceptance/refusal **always** modal.

Modal-vs-digest decision lives in the resolver. Each effect carries `surface: "modal" | "digest"`. The resolver collects digest effects into a single review-phase summary and only opens modals for the `modal`-tagged outcomes.

## 8. Game loop integration

In `src/game/simulation/TurnSimulator.ts`'s `simulateTurn`:

1. (existing steps 1–8a)
2. (existing) `selectDilemma()` — now competing for the same slot as `selectDiplomacyOffer()`
3. **NEW** `processQueuedDiplomacyActions(state)` — resolves player-initiated actions queued during planning, applies effects, builds modal/digest entries, increments `actionsResolvedThisTurn`
4. **NEW** `tickDiplomacyState(state)` — drift, tag expiry, cooldown decrement, reset `actionsResolvedThisTurn = 0` for the upcoming turn
5. **NEW** `selectDiplomacyOffer(state)` — emit at most 1 AI offer into `pendingChoiceEvents[]` (gated by Storyteller's cooldown)
6. (existing remaining simulation)

Player-initiated actions are queued during planning (same pattern as fleet moves) into `diplomacy.queuedActions`. Resolution happens in simulation. Outcome modals play after dilemmas, before the review screen.

## 9. New / modified files

**New:**

- `src/game/diplomacy/DiplomacyResolver.ts` — pure functions for action resolution
- `src/game/diplomacy/DiplomacyAI.ts` — `selectDiplomacyOffer`, candidate scoring
- `src/game/diplomacy/DiplomacyState.ts` — `tickDiplomacyState`, drift, tag expiry
- `src/game/diplomacy/AmbassadorGenerator.ts` — generates ambassadors at game start
- `src/game/diplomacy/CopyTemplates.ts` — `(eventKind, personalityTag, tierBucket)` flavor pool
- `src/scenes/DiplomacyScene.ts` — Foreign Relations hub
- `src/ui/CharacterDialogModal.ts` — extracted reusable modal
- `__tests__/` siblings for the above

**Modified:**

- `src/data/types.ts` — new types, `GameState.diplomacy`, deprecate `empireReputation`
- `src/data/GameStore.ts` — initial state includes `DiplomacyState`
- `src/game/simulation/TurnSimulator.ts` — new pipeline steps
- `src/scenes/DilemmaScene.ts` — refactored to consume `CharacterDialogModal`
- `src/scenes/PlanningScene.ts` (or equivalent HUD) — add Foreign Relations button
- `src/scenes/ReviewScene.ts` — add Diplomatic activity digest section

## 10. Testing strategy

Pure-function game logic gets unit tests; UI gets snapshot/integration tests:

- `__tests__/DiplomacyResolver.test.ts` — every action × success/failure × tag interactions, cross-target dampener, diminishing returns, modal/digest routing
- `__tests__/DiplomacyAI.test.ts` — `selectDiplomacyOffer` produces valid offers within budget; tier transition prioritization
- `__tests__/DiplomacyState.test.ts` — tag expiry, standing drift (including Hostile floor), cooldown decrement
- `__tests__/AmbassadorGenerator.test.ts` — deterministic generation under seeded RNG
- Integration test: full turn with 2 player actions + 1 AI offer → exactly 3 modals queued, digest contains routine entries
- Snapshot test: `CharacterDialogModal` rendering at ambassador-tier vs ruler-tier

## 11. Risks & mitigations

- **Standing inflation.** With +8 per gift and 3-turn cooldown across 5 empires, players could grind toward Allied. Mitigation: cross-target `RecentlyGifted` dampener (§4.1) + diminishing returns above 70 (§4.2).
- **Dialog copy authoring burden.** Mitigation: `(eventKind, personalityTag, tierBucket)` template pool, ~16 templates per event type covers the matrix (§6.4).
- **Players ignoring the system.** Mitigation: small status badge on the Foreign Relations button counting standing changes >5pts this turn nudges engagement without spam.
- **Save compatibility.** `empireReputation` is currently stubbed but unwired in gameplay. Renaming to `diplomacy.empireStanding` is safe in this branch; if any save data exists in the wild, a one-shot migration in `loadGame` reads the old path and writes the new one before validation.

## 12. Wave 2 (deferred — explicitly out of scope)

- Sabotage (active negative action against rivals; chains with `SuspectedSpy:Player` retaliation)
- Contract poaching as espionage payload
- Smear / tag injection as espionage payload
- Tech tree improving espionage success rate
- Empire-vs-empire diplomacy reactions to player lobbying (a successful "Lobby Against" might worsen the _target empire's_ relations with the named rival's patron empire)
- Per-empire economic blockades triggered by tier=Hostile
- Multi-turn "diplomatic operations" with setup → execute → reveal stages
- Explicit "call in favor" verb spending `OweFavor` (currently auto-applied as success-rate bonus)

## 13. Open questions

- **Q: should `OweFavor` be auto-spent or be a player-visible "cash in" verb?** Default for wave 1: auto-spent (applied as +15% success modifier on next eligible action against that target). Promote to explicit verb in wave 2 if playtesting shows players want the agency.
- **Q: should the planning HUD surface a small "diplomacy summary" card** on each turn (e.g., "2 empires drifting toward Cold this turn") to nudge engagement? Default: no card; instead, a small badge on the Foreign Relations button shows the count of standing changes >5pts since last visit.
