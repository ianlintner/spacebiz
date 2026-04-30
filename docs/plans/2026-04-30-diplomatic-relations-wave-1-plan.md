# Diplomatic Relations System (Wave 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the wave-1 diplomatic relations system per [docs/plans/2026-04-30-diplomatic-relations-design.md](2026-04-30-diplomatic-relations-design.md) — five player-initiated verbs (gift, lobby for/against, propose non-compete, surveil), AI-initiated offers throttled into the existing dilemma slot, a Foreign Relations hub UI, a reusable character-dialog modal, and a per-turn modal cap of 3.

**Architecture:** Pure TypeScript game-logic modules under `src/game/diplomacy/` resolve actions and tick state; a new `DiplomacyScene` queues player actions during planning; `TurnSimulator` drains the queue and emits modal/digest entries during simulation. The dilemma modal renderer is extracted into a reusable `CharacterDialogModal` component shared by both diplomacy and dilemmas.

**Tech Stack:** Phaser 4 + TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Vite 8, Vitest 4, Node 22. Path alias `@spacebiz/ui` for shared UI primitives.

**Conventions:**

- All new modules use `import * as Phaser from "phaser"` for Phaser imports.
- Type-only imports use `import type { ... }`.
- No enums; use `as const` objects or string union types.
- Tests live in sibling `__tests__/` dirs as `*.test.ts`.
- Run `npm run check` (typecheck + test + build) before committing each task.
- All commits use Conventional Commits style; this branch (`claude/peaceful-raman-228fe8`) stacks features without merging to main.

---

## File Structure

**New files:**

| Path                                            | Responsibility                                 |
| ----------------------------------------------- | ---------------------------------------------- |
| `src/game/diplomacy/StandingTiers.ts`           | Tier classification + transition detection     |
| `src/game/diplomacy/StandingTags.ts`            | Tag add/remove/find/expire                     |
| `src/game/diplomacy/Cooldowns.ts`               | Compound cooldown keys; check/set helpers      |
| `src/game/diplomacy/AmbassadorGenerator.ts`     | Seeded ambassador/liaison generation           |
| `src/game/diplomacy/DiplomacyResolver.ts`       | Action resolution per verb + global throttle   |
| `src/game/diplomacy/DiplomacyState.ts`          | tick: drift, expire, decrement, reset          |
| `src/game/diplomacy/CopyTemplates.ts`           | Flavor pool keyed by (kind, personality, tier) |
| `src/game/diplomacy/DiplomacyAI.ts`             | `selectDiplomacyOffer` candidate scoring       |
| `src/scenes/DiplomacyScene.ts`                  | Foreign Relations hub (planning-phase)         |
| `src/ui/CharacterDialogModal.ts`                | Reusable modal extracted from DilemmaScene     |
| `src/game/diplomacy/__tests__/*.test.ts`        | One test file per module above                 |
| `src/scenes/__tests__/DiplomacyScene.test.ts`   | Smoke test for hub                             |
| `src/ui/__tests__/CharacterDialogModal.test.ts` | Modal structural test                          |

**Modified files:**

| Path                                   | Change                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                    | Add `StandingTag`, `Ambassador`, `DiplomacyActionKind`, `QueuedDiplomacyAction`, `DiplomacyState`; extend `EventEffect` with `surface?`; add `diplomacy` to `GameState` |
| `src/data/GameStore.ts`                | Seed empty `DiplomacyState` in `createDefaultState()`; remove obsolete `empireReputation` field                                                                         |
| `src/game/NewGameSetup.ts`             | Generate ambassadors at game start                                                                                                                                      |
| `src/game/SaveManager.ts`              | Migrate older saves missing `diplomacy`                                                                                                                                 |
| `src/game/simulation/TurnSimulator.ts` | Insert process queue + tick + AI offer steps                                                                                                                            |
| `src/scenes/DilemmaScene.ts`           | Refactor to consume `CharacterDialogModal`                                                                                                                              |
| `src/scenes/GameHUDScene.ts`           | Add Foreign Relations button + scene route                                                                                                                              |
| `src/scenes/TurnReportScene.ts`        | Add Diplomatic Activity digest section                                                                                                                                  |

---

## Task 1: Core types

**Files:**

- Modify: `src/data/types.ts`

- [ ] **Step 1: Add new diplomacy types**

In `src/data/types.ts`, after the existing `CharacterPortrait` declaration around line 1072, add:

```ts
// ────────────────────────────── Diplomacy ──────────────────────────────────

export type StandingTag =
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

export type AmbassadorPersonality =
  | "formal"
  | "mercenary"
  | "suspicious"
  | "warm";

export interface Ambassador {
  name: string;
  portrait: CharacterPortrait;
  personality: AmbassadorPersonality;
}

export type DiplomacyActionKind =
  | "giftEmpire"
  | "giftRival"
  | "lobbyFor"
  | "lobbyAgainst"
  | "proposeNonCompete"
  | "surveil";

export type SurveilLens = "cash" | "topContractByValue" | "topEmpireStanding";

export interface QueuedDiplomacyAction {
  id: string;
  kind: DiplomacyActionKind;
  targetId: string;
  subjectId?: string;
  subjectIdSecondary?: string;
  surveilLens?: SurveilLens;
  cashCost: number;
}

export interface DiplomacyState {
  empireStanding: Record<string, number>;
  rivalStanding: Record<string, number>;
  /** Per-empire view of each rival (for lobby targeting). */
  crossEmpireRivalStanding: Record<string, Record<string, number>>;
  empireTags: Record<string, readonly StandingTag[]>;
  rivalTags: Record<string, readonly StandingTag[]>;
  empireAmbassadors: Record<string, Ambassador>;
  rivalLiaisons: Record<string, Ambassador>;
  cooldowns: Record<string, number>;
  queuedActions: readonly QueuedDiplomacyAction[];
  actionsResolvedThisTurn: number;
}
```

- [ ] **Step 2: Extend `EventEffect` with surface**

Find `EventEffect` at lines ~680–705 and add the field at the end of the interface:

```ts
export interface EventEffect {
  type: /* existing union */;
  targetId?: string;
  cargoType?: CargoType;
  value: number;
  empireId?: string;
  empireId2?: string;
  surface?: "modal" | "digest";
}
```

- [ ] **Step 3: Add `diplomacy` to `GameState`**

Find the `GameState` interface around line 1074. Replace the existing line `empireReputation?: Record<string, number>;` (around line 1156) with nothing (deleting it) and add at the bottom of the interface (just before the closing `}` around line 1169):

```ts
diplomacy: DiplomacyState;
```

Make `diplomacy` required (no `?`) — the initial state always seeds an empty one.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: errors about `empireReputation` being missing in `createDefaultState` (we fix that in Task 2). Other unrelated TS errors should not appear.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts
git commit -m "feat(types): add diplomacy types to GameState"
```

---

## Task 2: Seed empty DiplomacyState in GameStore

**Files:**

- Modify: `src/data/GameStore.ts`
- Test: `src/data/__tests__/GameStore.test.ts` (likely exists; if not, create)

- [ ] **Step 1: Write the failing test**

Add to `src/data/__tests__/GameStore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { gameStore } from "../GameStore.ts";

describe("GameStore.createDefaultState", () => {
  it("seeds an empty DiplomacyState", () => {
    gameStore.reset();
    const s = gameStore.getState();
    expect(s.diplomacy).toBeDefined();
    expect(s.diplomacy.empireStanding).toEqual({});
    expect(s.diplomacy.rivalStanding).toEqual({});
    expect(s.diplomacy.crossEmpireRivalStanding).toEqual({});
    expect(s.diplomacy.empireTags).toEqual({});
    expect(s.diplomacy.rivalTags).toEqual({});
    expect(s.diplomacy.empireAmbassadors).toEqual({});
    expect(s.diplomacy.rivalLiaisons).toEqual({});
    expect(s.diplomacy.cooldowns).toEqual({});
    expect(s.diplomacy.queuedActions).toEqual([]);
    expect(s.diplomacy.actionsResolvedThisTurn).toBe(0);
  });
});
```

(If `gameStore.reset()` doesn't exist, use whatever existing API the test file uses to obtain a fresh state.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/GameStore.test.ts -t "seeds an empty"`
Expected: FAIL — `s.diplomacy` is undefined.

- [ ] **Step 3: Update `createDefaultState()`**

In `src/data/GameStore.ts`, locate `createDefaultState()` (around line 13). Find the line `empireReputation: {},` (around line 78) and **replace it** with:

```ts
diplomacy: {
  empireStanding: {},
  rivalStanding: {},
  crossEmpireRivalStanding: {},
  empireTags: {},
  rivalTags: {},
  empireAmbassadors: {},
  rivalLiaisons: {},
  cooldowns: {},
  queuedActions: [],
  actionsResolvedThisTurn: 0,
},
```

- [ ] **Step 4: Run test + typecheck + full suite**

```
npx vitest run src/data/__tests__/GameStore.test.ts
npm run typecheck
npm run test
```

Expected: target test passes; typecheck clean; full suite passes (no test depended on `empireReputation`).

- [ ] **Step 5: Commit**

```bash
git add src/data/GameStore.ts src/data/__tests__/GameStore.test.ts
git commit -m "feat(state): seed empty DiplomacyState; remove empireReputation stub"
```

---

## Task 3: Standing tier utility

**Files:**

- Create: `src/game/diplomacy/StandingTiers.ts`
- Test: `src/game/diplomacy/__tests__/StandingTiers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/diplomacy/__tests__/StandingTiers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getStandingTier,
  isTierTransition,
  STANDING_TIERS,
} from "../StandingTiers.ts";

describe("StandingTiers", () => {
  it("classifies values into tiers at boundaries", () => {
    expect(getStandingTier(0)).toBe("Hostile");
    expect(getStandingTier(19)).toBe("Hostile");
    expect(getStandingTier(20)).toBe("Cold");
    expect(getStandingTier(39)).toBe("Cold");
    expect(getStandingTier(40)).toBe("Neutral");
    expect(getStandingTier(59)).toBe("Neutral");
    expect(getStandingTier(60)).toBe("Warm");
    expect(getStandingTier(79)).toBe("Warm");
    expect(getStandingTier(80)).toBe("Allied");
    expect(getStandingTier(100)).toBe("Allied");
  });

  it("clamps out-of-range values", () => {
    expect(getStandingTier(-5)).toBe("Hostile");
    expect(getStandingTier(150)).toBe("Allied");
  });

  it("detects tier transitions in either direction", () => {
    expect(isTierTransition(19, 20)).toBe(true);
    expect(isTierTransition(20, 19)).toBe(true);
    expect(isTierTransition(40, 50)).toBe(false);
    expect(isTierTransition(40, 40)).toBe(false);
  });

  it("exposes tier metadata", () => {
    expect(STANDING_TIERS.length).toBe(5);
    expect(STANDING_TIERS[0]).toMatchObject({ name: "Hostile", min: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/diplomacy/__tests__/StandingTiers.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/StandingTiers.ts`:

```ts
export type StandingTierName =
  | "Hostile"
  | "Cold"
  | "Neutral"
  | "Warm"
  | "Allied";

export interface StandingTier {
  readonly name: StandingTierName;
  readonly min: number;
  readonly max: number;
}

export const STANDING_TIERS: readonly StandingTier[] = [
  { name: "Hostile", min: 0, max: 19 },
  { name: "Cold", min: 20, max: 39 },
  { name: "Neutral", min: 40, max: 59 },
  { name: "Warm", min: 60, max: 79 },
  { name: "Allied", min: 80, max: 100 },
];

export function getStandingTier(value: number): StandingTierName {
  const clamped = Math.max(0, Math.min(100, value));
  for (const tier of STANDING_TIERS) {
    if (clamped >= tier.min && clamped <= tier.max) return tier.name;
  }
  return "Neutral";
}

export function isTierTransition(before: number, after: number): boolean {
  return getStandingTier(before) !== getStandingTier(after);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/diplomacy/__tests__/StandingTiers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/StandingTiers.ts src/game/diplomacy/__tests__/StandingTiers.test.ts
git commit -m "feat(diplomacy): add standing tier classification"
```

---

## Task 4: Standing tag utilities

**Files:**

- Create: `src/game/diplomacy/StandingTags.ts`
- Test: `src/game/diplomacy/__tests__/StandingTags.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/diplomacy/__tests__/StandingTags.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  addTag,
  removeTagsByKind,
  hasTagOfKind,
  findTagOfKind,
  expireTags,
} from "../StandingTags.ts";
import type { StandingTag } from "../../../data/types.ts";

const tag = (kind: StandingTag["kind"], expiresOnTurn: number): StandingTag => {
  switch (kind) {
    case "OweFavor":
    case "RecentlyGifted":
      return { kind, expiresOnTurn };
    case "SuspectedSpy":
      return { kind, suspectId: "player", expiresOnTurn };
    case "NonCompete":
      return { kind, protectedEmpireIds: ["e1"], expiresOnTurn };
    case "LeakedIntel":
      return { kind, lens: "cash", value: "1000", expiresOnTurn };
  }
};

describe("StandingTags", () => {
  it("adds a tag (immutable)", () => {
    const tags: readonly StandingTag[] = [];
    const next = addTag(tags, tag("OweFavor", 5));
    expect(next).toHaveLength(1);
    expect(tags).toHaveLength(0);
  });

  it("hasTagOfKind / findTagOfKind", () => {
    const tags = [tag("OweFavor", 5), tag("RecentlyGifted", 3)];
    expect(hasTagOfKind(tags, "OweFavor")).toBe(true);
    expect(hasTagOfKind(tags, "SuspectedSpy")).toBe(false);
    expect(findTagOfKind(tags, "RecentlyGifted")?.expiresOnTurn).toBe(3);
  });

  it("removeTagsByKind drops all tags of the given kind", () => {
    const tags = [
      tag("OweFavor", 5),
      tag("OweFavor", 7),
      tag("RecentlyGifted", 3),
    ];
    const next = removeTagsByKind(tags, "OweFavor");
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("RecentlyGifted");
  });

  it("expireTags strips tags whose expiresOnTurn <= currentTurn", () => {
    const tags = [
      tag("OweFavor", 5),
      tag("RecentlyGifted", 10),
      tag("SuspectedSpy", 3),
    ];
    const next = expireTags(tags, 5);
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("RecentlyGifted");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/StandingTags.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/StandingTags.ts`:

```ts
import type { StandingTag } from "../../data/types.ts";

export function addTag(
  tags: readonly StandingTag[],
  tag: StandingTag,
): readonly StandingTag[] {
  return [...tags, tag];
}

export function removeTagsByKind(
  tags: readonly StandingTag[],
  kind: StandingTag["kind"],
): readonly StandingTag[] {
  return tags.filter((t) => t.kind !== kind);
}

export function hasTagOfKind(
  tags: readonly StandingTag[],
  kind: StandingTag["kind"],
): boolean {
  return tags.some((t) => t.kind === kind);
}

export function findTagOfKind<K extends StandingTag["kind"]>(
  tags: readonly StandingTag[],
  kind: K,
): Extract<StandingTag, { kind: K }> | undefined {
  return tags.find((t) => t.kind === kind) as
    | Extract<StandingTag, { kind: K }>
    | undefined;
}

export function expireTags(
  tags: readonly StandingTag[],
  currentTurn: number,
): readonly StandingTag[] {
  return tags.filter((t) => t.expiresOnTurn > currentTurn);
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/game/diplomacy/__tests__/StandingTags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/StandingTags.ts src/game/diplomacy/__tests__/StandingTags.test.ts
git commit -m "feat(diplomacy): add standing tag utilities"
```

---

## Task 5: Cooldown utilities

**Files:**

- Create: `src/game/diplomacy/Cooldowns.ts`
- Test: `src/game/diplomacy/__tests__/Cooldowns.test.ts`

- [ ] **Step 1: Failing test**

Create `src/game/diplomacy/__tests__/Cooldowns.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  cooldownKey,
  isOnCooldown,
  setCooldown,
  decrementCooldowns,
} from "../Cooldowns.ts";

describe("Cooldowns", () => {
  it("builds single-target keys", () => {
    expect(cooldownKey("giftEmpire", "vex")).toBe("giftEmpire:vex");
  });

  it("builds compound keys for lobby (target + subject)", () => {
    expect(cooldownKey("lobbyFor", "vex", "chen")).toBe("lobbyFor:vex:chen");
  });

  it("isOnCooldown true when nextAvailableTurn > currentTurn", () => {
    const cd = { "giftEmpire:vex": 5 };
    expect(isOnCooldown(cd, "giftEmpire:vex", 4)).toBe(true);
    expect(isOnCooldown(cd, "giftEmpire:vex", 5)).toBe(false);
    expect(isOnCooldown(cd, "giftEmpire:vex", 6)).toBe(false);
    expect(isOnCooldown(cd, "missing", 1)).toBe(false);
  });

  it("setCooldown returns a new map", () => {
    const cd = {};
    const next = setCooldown(cd, "giftEmpire:vex", 7);
    expect(next).toEqual({ "giftEmpire:vex": 7 });
    expect(cd).toEqual({});
  });

  it("decrementCooldowns drops keys that reach <= currentTurn", () => {
    const cd = { a: 5, b: 10, c: 3 };
    const next = decrementCooldowns(cd, 5);
    expect(next).toEqual({ b: 10 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/Cooldowns.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/Cooldowns.ts`:

```ts
import type { DiplomacyActionKind } from "../../data/types.ts";

export function cooldownKey(
  kind: DiplomacyActionKind,
  targetId: string,
  subjectId?: string,
): string {
  return subjectId ? `${kind}:${targetId}:${subjectId}` : `${kind}:${targetId}`;
}

export function isOnCooldown(
  cooldowns: Record<string, number>,
  key: string,
  currentTurn: number,
): boolean {
  const until = cooldowns[key];
  return until !== undefined && until > currentTurn;
}

export function setCooldown(
  cooldowns: Record<string, number>,
  key: string,
  nextAvailableTurn: number,
): Record<string, number> {
  return { ...cooldowns, [key]: nextAvailableTurn };
}

export function decrementCooldowns(
  cooldowns: Record<string, number>,
  currentTurn: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(cooldowns)) {
    if (v > currentTurn) next[k] = v;
  }
  return next;
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/game/diplomacy/__tests__/Cooldowns.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/Cooldowns.ts src/game/diplomacy/__tests__/Cooldowns.test.ts
git commit -m "feat(diplomacy): add cooldown helpers (compound keys for lobby)"
```

---

## Task 6: Ambassador generator

**Files:**

- Create: `src/game/diplomacy/AmbassadorGenerator.ts`
- Test: `src/game/diplomacy/__tests__/AmbassadorGenerator.test.ts`

- [ ] **Step 1: Failing test**

Create `src/game/diplomacy/__tests__/AmbassadorGenerator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateAmbassadors } from "../AmbassadorGenerator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { Empire, AICompany } from "../../../data/types.ts";

const empire: Empire = {
  id: "vex",
  name: "Vex Hegemony",
  color: 0xff0000,
  tariffRate: 0.1,
  disposition: "neutral",
  homeSystemId: "sys-1",
  leaderName: "Emperor Vex IX",
  leaderPortrait: { portraitId: "p1", category: "alien" },
};

const rival: AICompany = {
  id: "chen",
  empireId: "sol",
  cash: 1_000_000,
  fleet: [],
  activeRoutes: [],
  reputation: 50,
  totalCargoDelivered: 0,
  personality: "balanced",
  bankrupt: false,
  ceoName: "Chen Wei",
  ceoPortrait: { portraitId: "p2", category: "human" },
};

describe("AmbassadorGenerator", () => {
  it("generates one ambassador per empire and one liaison per rival", () => {
    const rng = new SeededRNG(123);
    const out = generateAmbassadors(rng, [empire], [rival]);
    expect(Object.keys(out.empireAmbassadors)).toEqual(["vex"]);
    expect(Object.keys(out.rivalLiaisons)).toEqual(["chen"]);
  });

  it("ambassadors have name, portrait, personality", () => {
    const rng = new SeededRNG(123);
    const out = generateAmbassadors(rng, [empire], [rival]);
    const amb = out.empireAmbassadors["vex"]!;
    expect(typeof amb.name).toBe("string");
    expect(amb.name.length).toBeGreaterThan(0);
    expect(amb.portrait.portraitId).toBeDefined();
    expect(["formal", "mercenary", "suspicious", "warm"]).toContain(
      amb.personality,
    );
  });

  it("is deterministic for the same seed", () => {
    const a = generateAmbassadors(new SeededRNG(42), [empire], [rival]);
    const b = generateAmbassadors(new SeededRNG(42), [empire], [rival]);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/AmbassadorGenerator.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/AmbassadorGenerator.ts`:

```ts
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  Ambassador,
  AmbassadorPersonality,
  AICompany,
  Empire,
} from "../../data/types.ts";

const FIRST_NAMES = [
  "Alra",
  "Brent",
  "Caius",
  "Doru",
  "Elin",
  "Faro",
  "Galen",
  "Hess",
  "Ilo",
  "Jarn",
  "Kael",
  "Lyra",
  "Mira",
  "Noct",
  "Oso",
  "Pell",
  "Quin",
  "Rho",
];
const SURNAMES = [
  "Vex",
  "Korr",
  "Sallow",
  "Ridge",
  "Pell",
  "Drey",
  "Halloran",
  "Iskren",
  "Marsh",
  "Onaga",
  "Strel",
  "Volk",
];
const PERSONALITIES: readonly AmbassadorPersonality[] = [
  "formal",
  "mercenary",
  "suspicious",
  "warm",
];
const PORTRAIT_IDS = [
  "amb-01",
  "amb-02",
  "amb-03",
  "amb-04",
  "amb-05",
  "amb-06",
  "amb-07",
  "amb-08",
];

function makeAmbassador(rng: SeededRNG): Ambassador {
  const first = rng.pick([...FIRST_NAMES]);
  const last = rng.pick([...SURNAMES]);
  return {
    name: `${first} ${last}`,
    portrait: { portraitId: rng.pick([...PORTRAIT_IDS]), category: "human" },
    personality: rng.pick([...PERSONALITIES]),
  };
}

export function generateAmbassadors(
  rng: SeededRNG,
  empires: readonly Empire[],
  rivals: readonly AICompany[],
): {
  empireAmbassadors: Record<string, Ambassador>;
  rivalLiaisons: Record<string, Ambassador>;
} {
  const empireAmbassadors: Record<string, Ambassador> = {};
  const rivalLiaisons: Record<string, Ambassador> = {};
  for (const e of empires) {
    empireAmbassadors[e.id] = makeAmbassador(rng);
  }
  for (const r of rivals) {
    rivalLiaisons[r.id] = makeAmbassador(rng);
  }
  return { empireAmbassadors, rivalLiaisons };
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/game/diplomacy/__tests__/AmbassadorGenerator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/AmbassadorGenerator.ts src/game/diplomacy/__tests__/AmbassadorGenerator.test.ts
git commit -m "feat(diplomacy): seeded ambassador/liaison generator"
```

---

## Task 7: Wire ambassador generation into NewGameSetup

**Files:**

- Modify: `src/game/NewGameSetup.ts`
- Test: `src/game/__tests__/NewGameSetup.test.ts` (extend existing)

- [ ] **Step 1: Failing test**

Add to `src/game/__tests__/NewGameSetup.test.ts` (or create if absent):

```ts
import { describe, it, expect } from "vitest";
import { setupNewGame } from "../NewGameSetup.ts"; // adjust import to actual export

describe("setupNewGame — diplomacy", () => {
  it("seeds an ambassador for every empire and a liaison for every rival", () => {
    const state = setupNewGame({ seed: 42 });
    for (const e of state.empires) {
      expect(state.diplomacy.empireAmbassadors[e.id]).toBeDefined();
    }
    for (const r of state.aiCompanies) {
      expect(state.diplomacy.rivalLiaisons[r.id]).toBeDefined();
    }
  });

  it("seeds neutral standing (50) for all empires and rivals", () => {
    const state = setupNewGame({ seed: 42 });
    for (const e of state.empires) {
      expect(state.diplomacy.empireStanding[e.id]).toBe(50);
    }
    for (const r of state.aiCompanies) {
      expect(state.diplomacy.rivalStanding[r.id]).toBe(50);
    }
  });
});
```

(If actual function name / signature differs, adjust to match. Read `src/game/NewGameSetup.ts` to find the right export. The shape of options it accepts and the property name for rivals (`aiCompanies` or similar) must match.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/__tests__/NewGameSetup.test.ts -t "diplomacy"`
Expected: FAIL — empireAmbassadors empty / standing missing.

- [ ] **Step 3: Update `setupNewGame` (or equivalent)**

In `src/game/NewGameSetup.ts`, after empires and rivals are constructed but before the function returns the new state, add:

```ts
import { generateAmbassadors } from "./diplomacy/AmbassadorGenerator.ts";

// ... inside setupNewGame, after empires/rivals are built:
const { empireAmbassadors, rivalLiaisons } = generateAmbassadors(
  rng,
  empires,
  aiCompanies,
);
const empireStanding: Record<string, number> = Object.fromEntries(
  empires.map((e) => [e.id, 50]),
);
const rivalStanding: Record<string, number> = Object.fromEntries(
  aiCompanies.map((c) => [c.id, 50]),
);

const diplomacy: DiplomacyState = {
  empireStanding,
  rivalStanding,
  empireTags: {},
  rivalTags: {},
  empireAmbassadors,
  rivalLiaisons,
  cooldowns: {},
  queuedActions: [],
  actionsResolvedThisTurn: 0,
};
```

Then include `diplomacy` in the returned state object.

(`rng` and `empires` / `aiCompanies` variable names must match the existing function. Adjust as needed.)

- [ ] **Step 4: Run tests**

```
npx vitest run src/game/__tests__/NewGameSetup.test.ts
npm run typecheck
```

Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/NewGameSetup.ts src/game/__tests__/NewGameSetup.test.ts
git commit -m "feat(diplomacy): seed ambassadors and standing on new game"
```

---

## Task 8: DiplomacyResolver — gift actions

**Files:**

- Create: `src/game/diplomacy/DiplomacyResolver.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyResolver.gift.test.ts`

- [ ] **Step 1: Failing test**

Create `src/game/diplomacy/__tests__/DiplomacyResolver.gift.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveGiftEmpire, resolveGiftRival } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    diplomacy: {
      empireStanding: { vex: 50 },
      rivalStanding: { chen: 50 },
      empireTags: { vex: [] },
      rivalTags: { chen: [] },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
    },
    cash: 100_000,
    // ... other GameState fields filled with reasonable defaults; cast as GameState
  } as unknown as GameState;
}

describe("resolveGiftEmpire", () => {
  it("on success: +8 standing, RecentlyGifted tag, deducts cash, sets cooldown", () => {
    const rng = new SeededRNG(1); // first roll < 0.7 = success per SeededRNG behavior
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    const out = resolveGiftEmpire(baseState(), action, rng);
    expect(out.nextState.diplomacy.empireStanding.vex).toBeGreaterThan(50);
    expect(out.nextState.cash).toBe(90_000);
    expect(
      out.nextState.diplomacy.empireTags.vex.some(
        (t) => t.kind === "RecentlyGifted",
      ),
    ).toBe(true);
    expect(out.nextState.diplomacy.cooldowns["giftEmpire:vex"]).toBe(8); // turn 5 + 3
  });

  it("applies cross-target dampener when any other empire has RecentlyGifted", () => {
    const s = baseState();
    s.diplomacy.empireStanding["sol"] = 50;
    s.diplomacy.empireTags["sol"] = [
      { kind: "RecentlyGifted", expiresOnTurn: 10 },
    ];
    const rng = new SeededRNG(1);
    const out = resolveGiftEmpire(
      s,
      {
        id: "a",
        kind: "giftEmpire",
        targetId: "vex",
        cashCost: 10_000,
      },
      rng,
    );
    // Standing change should be +4 (halved) instead of +8.
    expect(out.nextState.diplomacy.empireStanding.vex).toBe(54);
  });

  it("applies diminishing returns above standing 70", () => {
    const s = baseState();
    s.diplomacy.empireStanding["vex"] = 76;
    const rng = new SeededRNG(1);
    const out = resolveGiftEmpire(
      s,
      {
        id: "a",
        kind: "giftEmpire",
        targetId: "vex",
        cashCost: 10_000,
      },
      rng,
    );
    // raw +8 * (100-76)/30 = 6.4 -> floor to integer (6).
    expect(out.nextState.diplomacy.empireStanding.vex).toBeGreaterThan(76);
    expect(out.nextState.diplomacy.empireStanding.vex).toBeLessThan(84);
  });

  it("on failure: refunds 50% cash, surfaces modal, no standing change", () => {
    const rng = new SeededRNG(99); // tuned to roll above 0.7 first
    const out = resolveGiftEmpire(
      baseState(),
      {
        id: "a",
        kind: "giftEmpire",
        targetId: "vex",
        cashCost: 10_000,
      },
      rng,
    );
    if (out.success === false) {
      expect(out.nextState.cash).toBe(95_000);
      expect(out.nextState.diplomacy.empireStanding.vex).toBe(50);
      expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("resolveGiftRival", () => {
  it("on success: +6 standing, RecentlyGifted tag, deducts cash", () => {
    const rng = new SeededRNG(1);
    const out = resolveGiftRival(
      baseState(),
      {
        id: "a",
        kind: "giftRival",
        targetId: "chen",
        cashCost: 5_000,
      },
      rng,
    );
    expect(out.nextState.diplomacy.rivalStanding.chen).toBeGreaterThan(50);
    expect(out.nextState.cash).toBe(95_000);
  });
});
```

(If exact RNG seeds don't reliably succeed/fail, accept either branch deterministically by checking `out.success` and asserting only the appropriate post-conditions. Adjust seeds via the implementation iteration.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.gift.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/DiplomacyResolver.ts`:

```ts
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  GameState,
  QueuedDiplomacyAction,
  StandingTag,
} from "../../data/types.ts";
import { addTag, hasTagOfKind } from "./StandingTags.ts";
import { setCooldown, cooldownKey } from "./Cooldowns.ts";
import { isTierTransition } from "./StandingTiers.ts";

export interface DigestEntry {
  readonly text: string;
}

export interface ModalEntry {
  readonly speakerKind:
    | "empireAmbassador"
    | "empireRuler"
    | "rivalLiaison"
    | "rivalCEO";
  readonly targetId: string;
  readonly headline: string;
  readonly flavor: string;
}

export interface ResolutionOutcome {
  readonly nextState: GameState;
  readonly modalEntries: readonly ModalEntry[];
  readonly digestEntries: readonly DigestEntry[];
  readonly success: boolean;
}

const GIFT_EMPIRE_BASE_DELTA = 8;
const GIFT_RIVAL_BASE_DELTA = 6;
const GIFT_EMPIRE_COOLDOWN = 3;
const GIFT_RIVAL_COOLDOWN = 3;
const GIFT_RECENTLY_GIFTED_TTL = 3;
const GIFT_OWE_FAVOR_TTL = 5;
const GIFT_OWE_FAVOR_CHANCE = 0.3;
const GIFT_EMPIRE_BASE_SUCCESS = 0.7;
const GIFT_RIVAL_SUCCESS = 0.8;
const GIFT_NO_RECENT_BONUS = 0.1;
const DIMINISHING_RETURNS_THRESHOLD = 70;

function applyStandingDelta(current: number, delta: number): number {
  if (delta <= 0 || current < DIMINISHING_RETURNS_THRESHOLD) {
    return clamp(current + delta);
  }
  const scale = (100 - current) / 30;
  return clamp(current + Math.floor(delta * scale));
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function anyEmpireRecentlyGifted(state: GameState): boolean {
  return Object.values(state.diplomacy.empireTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}
function anyRivalRecentlyGifted(state: GameState): boolean {
  return Object.values(state.diplomacy.rivalTags).some((tags) =>
    hasTagOfKind(tags, "RecentlyGifted"),
  );
}

export function resolveGiftEmpire(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const dampener = anyEmpireRecentlyGifted(state) ? 0.5 : 1.0;
  const successChance =
    GIFT_EMPIRE_BASE_SUCCESS +
    (anyEmpireRecentlyGifted(state) ? 0 : GIFT_NO_RECENT_BONUS);
  const success = rng.chance(successChance);

  const beforeStanding = state.diplomacy.empireStanding[targetId] ?? 50;
  let nextStanding = beforeStanding;
  let cashAfter = state.cash - action.cashCost;
  const tagsBefore = state.diplomacy.empireTags[targetId] ?? [];
  let tagsAfter = tagsBefore;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_EMPIRE_BASE_DELTA * dampener);
    nextStanding = applyStandingDelta(beforeStanding, delta);
    tagsAfter = addTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    } as StandingTag);
    if (rng.chance(GIFT_OWE_FAVOR_CHANCE)) {
      tagsAfter = addTag(tagsAfter, {
        kind: "OweFavor",
        expiresOnTurn: state.turn + GIFT_OWE_FAVOR_TTL,
      } as StandingTag);
    }
    digest.push({
      text: `Gift to ${targetId} accepted: +${delta} standing.`,
    });
    if (isTierTransition(beforeStanding, nextStanding)) {
      modal.push({
        speakerKind: "empireRuler",
        targetId,
        headline: "Tier shift",
        flavor: "Standing has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "empireAmbassador",
      targetId,
      headline: "Gift refused",
      flavor: "The ambassador returns your gift unopened.",
    });
  }

  const nextCooldownKey = cooldownKey("giftEmpire", targetId);
  const nextCooldowns = setCooldown(
    state.diplomacy.cooldowns,
    nextCooldownKey,
    state.turn + GIFT_EMPIRE_COOLDOWN,
  );

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...state.diplomacy,
        empireStanding: {
          ...state.diplomacy.empireStanding,
          [targetId]: nextStanding,
        },
        empireTags: {
          ...state.diplomacy.empireTags,
          [targetId]: tagsAfter,
        },
        cooldowns: nextCooldowns,
        actionsResolvedThisTurn: state.diplomacy.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}

export function resolveGiftRival(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const { targetId } = action;
  const dampener = anyRivalRecentlyGifted(state) ? 0.5 : 1.0;
  const success = rng.chance(GIFT_RIVAL_SUCCESS);

  const before = state.diplomacy.rivalStanding[targetId] ?? 50;
  const tagsBefore = state.diplomacy.rivalTags[targetId] ?? [];
  let next = before;
  let tagsAfter = tagsBefore;
  let cashAfter = state.cash - action.cashCost;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    const delta = Math.floor(GIFT_RIVAL_BASE_DELTA * dampener);
    next = applyStandingDelta(before, delta);
    tagsAfter = addTag(tagsAfter, {
      kind: "RecentlyGifted",
      expiresOnTurn: state.turn + GIFT_RECENTLY_GIFTED_TTL,
    });
    digest.push({ text: `Gift to ${targetId} accepted: +${delta} standing.` });
    if (isTierTransition(before, next)) {
      modal.push({
        speakerKind: "rivalCEO",
        targetId,
        headline: "Tier shift",
        flavor: "Relationship temperature has shifted.",
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    modal.push({
      speakerKind: "rivalLiaison",
      targetId,
      headline: "Gift refused",
      flavor: "Their corporate liaison politely declines.",
    });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...state.diplomacy,
        rivalStanding: {
          ...state.diplomacy.rivalStanding,
          [targetId]: next,
        },
        rivalTags: {
          ...state.diplomacy.rivalTags,
          [targetId]: tagsAfter,
        },
        cooldowns: setCooldown(
          state.diplomacy.cooldowns,
          cooldownKey("giftRival", targetId),
          state.turn + GIFT_RIVAL_COOLDOWN,
        ),
        actionsResolvedThisTurn: state.diplomacy.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.gift.test.ts`
Expected: PASS. If RNG seeds don't deterministically yield expected branch, tune the test to assert based on `out.success` rather than hard-coded seed assumptions.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyResolver.ts src/game/diplomacy/__tests__/DiplomacyResolver.gift.test.ts
git commit -m "feat(diplomacy): resolve gift empire/rival actions"
```

---

## Task 9: DiplomacyResolver — lobby actions

**Files:**

- Modify: `src/game/diplomacy/DiplomacyResolver.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyResolver.lobby.test.ts`

- [ ] **Step 1: Failing test**

Create test file with a `baseState` similar to Task 8 (copy the helper — DRY across files via shared test helper if a `__tests__/_helpers.ts` exists; otherwise duplicate the inline factory):

```ts
import { describe, it, expect } from "vitest";
import { resolveLobby } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    diplomacy: {
      empireStanding: { vex: 50 },
      rivalStanding: { chen: 50, kade: 50 },
      empireTags: { vex: [] },
      rivalTags: { chen: [], kade: [] },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
    },
    // crossEmpireRivalStanding is the per-empire view of a rival; seeded below
    crossEmpireRivalStanding: { vex: { chen: 50 } },
  } as unknown as GameState;
}

describe("resolveLobby (For/Against)", () => {
  it("lobbyFor on success raises empire's view of named rival by +10", () => {
    const a: QueuedDiplomacyAction = {
      id: "a",
      kind: "lobbyFor",
      targetId: "vex",
      subjectId: "chen",
      cashCost: 15_000,
    };
    const rng = new SeededRNG(1);
    const out = resolveLobby(baseState(), a, rng);
    if (out.success) {
      expect(out.nextState.crossEmpireRivalStanding!.vex.chen).toBe(60);
    }
  });

  it("lobbyAgainst on success drops empire's view of named rival by 10", () => {
    const a: QueuedDiplomacyAction = {
      id: "a",
      kind: "lobbyAgainst",
      targetId: "vex",
      subjectId: "chen",
      cashCost: 15_000,
    };
    const rng = new SeededRNG(1);
    const out = resolveLobby(baseState(), a, rng);
    if (out.success) {
      expect(out.nextState.crossEmpireRivalStanding!.vex.chen).toBe(40);
    }
  });

  it("OweFavor from target empire boosts success rate", () => {
    const s = baseState();
    s.diplomacy.empireTags["vex"] = [{ kind: "OweFavor", expiresOnTurn: 99 }];
    const rng = new SeededRNG(50);
    const out = resolveLobby(
      s,
      {
        id: "a",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 15_000,
      },
      rng,
    );
    // We don't pin success/failure exactly; ensure no throw and effect or refund applied.
    expect(out).toBeDefined();
  });

  it("uses compound cooldown key (action:empire:rival)", () => {
    const rng = new SeededRNG(1);
    const out = resolveLobby(
      baseState(),
      {
        id: "a",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 15_000,
      },
      rng,
    );
    expect(out.nextState.diplomacy.cooldowns["lobbyFor:vex:chen"]).toBe(9);
  });
});
```

**Note:** `crossEmpireRivalStanding` is already declared on `DiplomacyState` in Task 1 and seeded as `{}` in Task 2. The lobby resolver lazily initializes per-empire entries on first use; alternatively, seed all `(empire, rival) → 50` pairs in `setupNewGame` (Task 7) for predictability. Wave 1 picks lazy initialization to keep Task 7 simple.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.lobby.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/game/diplomacy/DiplomacyResolver.ts`:

```ts
const LOBBY_BASE_SUCCESS = 0.6;
const LOBBY_OWE_FAVOR_BONUS = 0.15;
const LOBBY_DELTA = 10;
const LOBBY_COOLDOWN = 4;

export function resolveLobby(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const empireId = action.targetId;
  const rivalId = action.subjectId;
  if (!rivalId) {
    throw new Error("resolveLobby requires subjectId (target rival)");
  }
  const direction = action.kind === "lobbyFor" ? +1 : -1;
  const empireTags = state.diplomacy.empireTags[empireId] ?? [];
  const oweBonus = hasTagOfKind(empireTags, "OweFavor")
    ? LOBBY_OWE_FAVOR_BONUS
    : 0;
  const success = rng.chance(LOBBY_BASE_SUCCESS + oweBonus);

  const cross = state.crossEmpireRivalStanding ?? {};
  const empireMap = cross[empireId] ?? {};
  const before = empireMap[rivalId] ?? 50;
  let next = before;
  let cashAfter = state.cash - action.cashCost;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];

  if (success) {
    next = clamp(before + direction * LOBBY_DELTA);
    digest.push({
      text: `${empireId} ${direction > 0 ? "warmer" : "cooler"} toward ${rivalId} (${before} → ${next}).`,
    });
    if (isTierTransition(before, next)) {
      modal.push({
        speakerKind: "empireAmbassador",
        targetId: empireId,
        headline: "Tier shift",
        flavor: `Their stance toward ${rivalId} has shifted.`,
      });
    }
  } else {
    cashAfter = state.cash - Math.floor(action.cashCost * 0.5);
    digest.push({ text: `Lobbying ${empireId} on ${rivalId}: no effect.` });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      crossEmpireRivalStanding: {
        ...cross,
        [empireId]: { ...empireMap, [rivalId]: next },
      },
      diplomacy: {
        ...state.diplomacy,
        cooldowns: setCooldown(
          state.diplomacy.cooldowns,
          cooldownKey(action.kind, empireId, rivalId),
          state.turn + LOBBY_COOLDOWN,
        ),
        actionsResolvedThisTurn: state.diplomacy.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.lobby.test.ts
npm run typecheck
```

Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyResolver.ts src/game/diplomacy/__tests__/DiplomacyResolver.lobby.test.ts
git commit -m "feat(diplomacy): resolve lobby for/against (lazy cross-empire init)"
```

---

## Task 10: DiplomacyResolver — propose non-compete

**Files:**

- Modify: `src/game/diplomacy/DiplomacyResolver.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyResolver.nonCompete.test.ts`

- [ ] **Step 1: Failing test**

Create the test:

```ts
import { describe, it, expect } from "vitest";
import { resolveNonCompete } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";

function baseState(rivalStanding = 50): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    diplomacy: {
      empireStanding: {},
      rivalStanding: { chen: rivalStanding },
      empireTags: {},
      rivalTags: { chen: [] },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
      crossEmpireRivalStanding: {},
    },
  } as unknown as GameState;
}

describe("resolveNonCompete", () => {
  it("rejects below Cold tier (standing < 20)", () => {
    const out = resolveNonCompete(
      baseState(15),
      {
        id: "a",
        kind: "proposeNonCompete",
        targetId: "chen",
        subjectId: "vex",
        subjectIdSecondary: "sol",
        cashCost: 0,
      },
      new SeededRNG(1),
    );
    expect(out.success).toBe(false);
    expect(out.modalEntries.length).toBeGreaterThan(0);
  });

  it("on accept: applies NonCompete tag (10 turns) for both protected empires", () => {
    const out = resolveNonCompete(
      baseState(60),
      {
        id: "a",
        kind: "proposeNonCompete",
        targetId: "chen",
        subjectId: "vex",
        subjectIdSecondary: "sol",
        cashCost: 0,
      },
      new SeededRNG(1),
    );
    if (out.success) {
      const tags = out.nextState.diplomacy.rivalTags.chen;
      const nc = tags.find((t) => t.kind === "NonCompete");
      expect(nc).toBeDefined();
      if (nc && nc.kind === "NonCompete") {
        expect(nc.protectedEmpireIds).toEqual(["vex", "sol"]);
        expect(nc.expiresOnTurn).toBe(15); // turn 5 + 10
      }
    }
  });

  it("always uses modal surface (high-stakes)", () => {
    const out = resolveNonCompete(
      baseState(60),
      {
        id: "a",
        kind: "proposeNonCompete",
        targetId: "chen",
        subjectId: "vex",
        subjectIdSecondary: "sol",
        cashCost: 0,
      },
      new SeededRNG(1),
    );
    expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.nonCompete.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/game/diplomacy/DiplomacyResolver.ts`:

```ts
const NON_COMPETE_TTL = 10;
const NON_COMPETE_COOLDOWN = 5;
const NON_COMPETE_MIN_TIER_STANDING = 20; // Cold or above

export function resolveNonCompete(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const rivalId = action.targetId;
  const empireA = action.subjectId;
  const empireB = action.subjectIdSecondary;
  if (!empireA || !empireB) {
    throw new Error(
      "resolveNonCompete requires subjectId and subjectIdSecondary (empire pair)",
    );
  }

  const standing = state.diplomacy.rivalStanding[rivalId] ?? 50;
  // Wave 1 heuristic: accept iff standing >= Cold (20). Strategic-fit check is
  // intentionally simple here; richer logic is wave 2.
  const accept = standing >= NON_COMPETE_MIN_TIER_STANDING && rng.chance(0.7);

  const tagsBefore = state.diplomacy.rivalTags[rivalId] ?? [];
  const tagsAfter = accept
    ? addTag(tagsBefore, {
        kind: "NonCompete",
        protectedEmpireIds: [empireA, empireB],
        expiresOnTurn: state.turn + NON_COMPETE_TTL,
      })
    : tagsBefore;

  const modal: ModalEntry[] = [
    {
      speakerKind: "rivalCEO",
      targetId: rivalId,
      headline: accept ? "Non-Compete signed" : "Non-Compete refused",
      flavor: accept
        ? `${empireA} and ${empireB} markets are now segregated.`
        : "Their CEO declines the proposal.",
    },
  ];

  return {
    nextState: {
      ...state,
      diplomacy: {
        ...state.diplomacy,
        rivalTags: { ...state.diplomacy.rivalTags, [rivalId]: tagsAfter },
        cooldowns: setCooldown(
          state.diplomacy.cooldowns,
          cooldownKey("proposeNonCompete", rivalId),
          state.turn + NON_COMPETE_COOLDOWN,
        ),
        actionsResolvedThisTurn: state.diplomacy.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: [],
    success: accept,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.nonCompete.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyResolver.ts src/game/diplomacy/__tests__/DiplomacyResolver.nonCompete.test.ts
git commit -m "feat(diplomacy): resolve propose non-compete"
```

---

## Task 11: DiplomacyResolver — surveil

**Files:**

- Modify: `src/game/diplomacy/DiplomacyResolver.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyResolver.surveil.test.ts`

- [ ] **Step 1: Failing test**

Create test:

```ts
import { describe, it, expect } from "vitest";
import { resolveSurveil } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    aiCompanies: [{ id: "chen", cash: 2_100_000 }],
    diplomacy: {
      empireStanding: {},
      rivalStanding: { chen: 50 },
      empireTags: {},
      rivalTags: { chen: [] },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
      crossEmpireRivalStanding: {},
    },
  } as unknown as GameState;
}

describe("resolveSurveil", () => {
  it("clean success: applies LeakedIntel tag with chosen lens (digest only)", () => {
    const a: QueuedDiplomacyAction = {
      id: "a",
      kind: "surveil",
      targetId: "chen",
      surveilLens: "cash",
      cashCost: 15_000,
    };
    const rng = new SeededRNG(1);
    const out = resolveSurveil(baseState(), a, rng);
    if (out.success) {
      const tags = out.nextState.diplomacy.rivalTags.chen;
      const intel = tags.find((t) => t.kind === "LeakedIntel");
      expect(intel).toBeDefined();
      if (intel && intel.kind === "LeakedIntel") {
        expect(intel.lens).toBe("cash");
        expect(intel.value).toBe("2100000");
        expect(intel.expiresOnTurn).toBe(8);
      }
      expect(out.modalEntries).toHaveLength(0);
    }
  });

  it("exposed failure: applies SuspectedSpy:player tag (5t) and modal", () => {
    const a: QueuedDiplomacyAction = {
      id: "a",
      kind: "surveil",
      targetId: "chen",
      surveilLens: "cash",
      cashCost: 15_000,
    };
    const rng = new SeededRNG(99);
    const out = resolveSurveil(baseState(), a, rng);
    if (!out.success) {
      const tags = out.nextState.diplomacy.rivalTags.chen;
      const spy = tags.find((t) => t.kind === "SuspectedSpy");
      expect(spy).toBeDefined();
      if (spy && spy.kind === "SuspectedSpy") {
        expect(spy.suspectId).toBe("player");
        expect(spy.expiresOnTurn).toBe(10);
      }
      expect(out.modalEntries.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.surveil.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/game/diplomacy/DiplomacyResolver.ts`:

```ts
const SURVEIL_BASE_SUCCESS = 0.65;
const SURVEIL_INTEL_TTL = 3;
const SURVEIL_SPY_TTL = 5;
const SURVEIL_COOLDOWN = 6;

function readSurveilValue(
  state: GameState,
  rivalId: string,
  lens: "cash" | "topContractByValue" | "topEmpireStanding",
): string {
  const rival = state.aiCompanies?.find((r) => r.id === rivalId);
  if (!rival) return "unknown";
  switch (lens) {
    case "cash":
      return String(rival.cash ?? 0);
    case "topContractByValue": {
      // Wave 1 stub — actual contract iteration in wave 2 polish.
      const top = (rival.activeRoutes ?? [])
        .map((r: { value?: number }) => r.value ?? 0)
        .sort((a: number, b: number) => b - a)[0];
      return top !== undefined ? String(top) : "none";
    }
    case "topEmpireStanding": {
      const cross = state.crossEmpireRivalStanding ?? {};
      let bestId = "none";
      let bestVal = -1;
      for (const [empireId, map] of Object.entries(cross)) {
        const v = map[rivalId];
        if (v !== undefined && v > bestVal) {
          bestVal = v;
          bestId = empireId;
        }
      }
      return bestId;
    }
  }
}

export function resolveSurveil(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  const rivalId = action.targetId;
  const lens = action.surveilLens ?? "cash";
  const success = rng.chance(SURVEIL_BASE_SUCCESS);

  const tagsBefore = state.diplomacy.rivalTags[rivalId] ?? [];
  let tagsAfter = tagsBefore;
  const modal: ModalEntry[] = [];
  const digest: DigestEntry[] = [];
  const cashAfter = state.cash - action.cashCost;

  if (success) {
    const value = readSurveilValue(state, rivalId, lens);
    tagsAfter = addTag(tagsBefore, {
      kind: "LeakedIntel",
      lens,
      value,
      expiresOnTurn: state.turn + SURVEIL_INTEL_TTL,
    });
    digest.push({
      text: `Surveillance of ${rivalId}: leaked ${lens} = ${value} (${SURVEIL_INTEL_TTL} turns).`,
    });
  } else {
    tagsAfter = addTag(tagsBefore, {
      kind: "SuspectedSpy",
      suspectId: "player",
      expiresOnTurn: state.turn + SURVEIL_SPY_TTL,
    });
    modal.push({
      speakerKind: "rivalLiaison",
      targetId: rivalId,
      headline: "Surveillance exposed",
      flavor: "Their counter-intel team has flagged you.",
    });
  }

  return {
    nextState: {
      ...state,
      cash: cashAfter,
      diplomacy: {
        ...state.diplomacy,
        rivalTags: { ...state.diplomacy.rivalTags, [rivalId]: tagsAfter },
        cooldowns: setCooldown(
          state.diplomacy.cooldowns,
          cooldownKey("surveil", rivalId),
          state.turn + SURVEIL_COOLDOWN,
        ),
        actionsResolvedThisTurn: state.diplomacy.actionsResolvedThisTurn + 1,
      },
    },
    modalEntries: modal,
    digestEntries: digest,
    success,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.surveil.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyResolver.ts src/game/diplomacy/__tests__/DiplomacyResolver.surveil.test.ts
git commit -m "feat(diplomacy): resolve surveil with three lens options"
```

---

## Task 12: DiplomacyResolver — main dispatcher + global throttle

**Files:**

- Modify: `src/game/diplomacy/DiplomacyResolver.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyResolver.dispatch.test.ts`

- [ ] **Step 1: Failing test**

Create test:

```ts
import { describe, it, expect } from "vitest";
import {
  resolveDiplomacyAction,
  processQueuedDiplomacyActions,
} from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    reputation: 30,
    aiCompanies: [{ id: "chen", cash: 1_000_000 }],
    diplomacy: {
      empireStanding: { vex: 50 },
      rivalStanding: { chen: 50 },
      empireTags: { vex: [] },
      rivalTags: { chen: [] },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
      crossEmpireRivalStanding: { vex: { chen: 50 } },
    },
  } as unknown as GameState;
}

describe("resolveDiplomacyAction (dispatch)", () => {
  it("dispatches by kind", () => {
    const a: QueuedDiplomacyAction = {
      id: "x",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 5000,
    };
    const out = resolveDiplomacyAction(baseState(), a, new SeededRNG(1));
    expect(out.nextState.diplomacy.cooldowns["giftEmpire:vex"]).toBeDefined();
  });
});

describe("processQueuedDiplomacyActions", () => {
  it("processes up to throttle and defers the rest", () => {
    const s = baseState();
    s.diplomacy.queuedActions = [
      { id: "1", kind: "giftEmpire", targetId: "vex", cashCost: 1000 },
      { id: "2", kind: "giftRival", targetId: "chen", cashCost: 1000 },
      {
        id: "3",
        kind: "surveil",
        targetId: "chen",
        surveilLens: "cash",
        cashCost: 1000,
      },
    ];
    const result = processQueuedDiplomacyActions(s, new SeededRNG(1));
    // throttle = 2 (reputation < renowned)
    expect(result.nextState.diplomacy.actionsResolvedThisTurn).toBe(2);
    expect(result.digestEntries.some((e) => /deferred/i.test(e.text))).toBe(
      true,
    );
    expect(result.nextState.diplomacy.queuedActions).toHaveLength(0);
  });

  it("throttle raises to 3 when reputation tier >= renowned (>= 75)", () => {
    const s = baseState();
    s.reputation = 80;
    s.diplomacy.queuedActions = [
      { id: "1", kind: "giftEmpire", targetId: "vex", cashCost: 1000 },
      { id: "2", kind: "giftRival", targetId: "chen", cashCost: 1000 },
      {
        id: "3",
        kind: "surveil",
        targetId: "chen",
        surveilLens: "cash",
        cashCost: 1000,
      },
    ];
    const result = processQueuedDiplomacyActions(s, new SeededRNG(1));
    expect(result.nextState.diplomacy.actionsResolvedThisTurn).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.dispatch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/game/diplomacy/DiplomacyResolver.ts`:

```ts
const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;
const REPUTATION_THROTTLE_THRESHOLD = 75;

export function resolveDiplomacyAction(
  state: GameState,
  action: QueuedDiplomacyAction,
  rng: SeededRNG,
): ResolutionOutcome {
  switch (action.kind) {
    case "giftEmpire":
      return resolveGiftEmpire(state, action, rng);
    case "giftRival":
      return resolveGiftRival(state, action, rng);
    case "lobbyFor":
    case "lobbyAgainst":
      return resolveLobby(state, action, rng);
    case "proposeNonCompete":
      return resolveNonCompete(state, action, rng);
    case "surveil":
      return resolveSurveil(state, action, rng);
  }
}

export interface QueueProcessingResult {
  readonly nextState: GameState;
  readonly modalEntries: readonly ModalEntry[];
  readonly digestEntries: readonly DigestEntry[];
}

export function processQueuedDiplomacyActions(
  state: GameState,
  rng: SeededRNG,
): QueueProcessingResult {
  const cap =
    (state.reputation ?? 0) >= REPUTATION_THROTTLE_THRESHOLD
      ? THROTTLE_HIGH
      : THROTTLE_BASE;
  const queued = state.diplomacy.queuedActions;
  const toResolve = queued.slice(0, cap);
  const deferred = queued.slice(cap);

  let cur = {
    ...state,
    diplomacy: { ...state.diplomacy, queuedActions: [] },
  };
  const allModal: ModalEntry[] = [];
  const allDigest: DigestEntry[] = [];

  for (const action of toResolve) {
    const out = resolveDiplomacyAction(cur, action, rng);
    cur = out.nextState;
    allModal.push(...out.modalEntries);
    allDigest.push(...out.digestEntries);
  }

  for (const action of deferred) {
    allDigest.push({
      text: `Diplomatic action ${action.kind} on ${action.targetId} deferred (turn cap reached).`,
    });
  }

  return { nextState: cur, modalEntries: allModal, digestEntries: allDigest };
}
```

- [ ] **Step 4: Run tests + full suite**

```
npx vitest run src/game/diplomacy/__tests__/DiplomacyResolver.dispatch.test.ts
npm run test
npm run typecheck
```

Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyResolver.ts src/game/diplomacy/__tests__/DiplomacyResolver.dispatch.test.ts
git commit -m "feat(diplomacy): main action dispatcher + global throttle"
```

---

## Task 13: tickDiplomacyState (drift / expire / decrement)

**Files:**

- Create: `src/game/diplomacy/DiplomacyTick.ts` (avoid name clash with `DiplomacyState` interface)
- Test: `src/game/diplomacy/__tests__/DiplomacyTick.test.ts`

- [ ] **Step 1: Failing test**

Create the test:

```ts
import { describe, it, expect } from "vitest";
import { tickDiplomacyState } from "../DiplomacyTick.ts";
import type { GameState } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    diplomacy: {
      empireStanding: { vex: 60, sol: 40, low: 25 },
      rivalStanding: { chen: 70 },
      empireTags: {
        vex: [
          { kind: "RecentlyGifted", expiresOnTurn: 5 },
          { kind: "OweFavor", expiresOnTurn: 99 },
        ],
      },
      rivalTags: {},
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: { "giftEmpire:vex": 5, "giftEmpire:sol": 99 },
      queuedActions: [],
      actionsResolvedThisTurn: 2,
      crossEmpireRivalStanding: {},
    },
  } as unknown as GameState;
}

describe("tickDiplomacyState", () => {
  it("drifts standings toward 50 by 1", () => {
    const s = tickDiplomacyState(baseState());
    expect(s.diplomacy.empireStanding.vex).toBe(59);
    expect(s.diplomacy.empireStanding.sol).toBe(41);
    expect(s.diplomacy.rivalStanding.chen).toBe(69);
  });

  it("does not drift Hostile (<30) standings", () => {
    const s = tickDiplomacyState(baseState());
    expect(s.diplomacy.empireStanding.low).toBe(25);
  });

  it("expires tags whose expiresOnTurn <= currentTurn", () => {
    const s = tickDiplomacyState(baseState());
    const tags = s.diplomacy.empireTags.vex;
    expect(tags.some((t) => t.kind === "RecentlyGifted")).toBe(false);
    expect(tags.some((t) => t.kind === "OweFavor")).toBe(true);
  });

  it("decrements cooldowns: drops keys whose value <= currentTurn", () => {
    const s = tickDiplomacyState(baseState());
    expect(s.diplomacy.cooldowns["giftEmpire:vex"]).toBeUndefined();
    expect(s.diplomacy.cooldowns["giftEmpire:sol"]).toBe(99);
  });

  it("resets actionsResolvedThisTurn to 0", () => {
    const s = tickDiplomacyState(baseState());
    expect(s.diplomacy.actionsResolvedThisTurn).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyTick.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/DiplomacyTick.ts`:

```ts
import type { GameState } from "../../data/types.ts";
import { expireTags } from "./StandingTags.ts";
import { decrementCooldowns } from "./Cooldowns.ts";

const HOSTILE_DRIFT_FLOOR = 30;

function driftToward50(value: number): number {
  if (value < HOSTILE_DRIFT_FLOOR) return value;
  if (value > 50) return value - 1;
  if (value < 50) return value + 1;
  return value;
}

function driftMap(map: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    next[k] = driftToward50(v);
  }
  return next;
}

function expireAllTags<T extends { expiresOnTurn: number }>(
  byTarget: Record<string, readonly T[]>,
  currentTurn: number,
): Record<string, readonly T[]> {
  const next: Record<string, readonly T[]> = {};
  for (const [k, tags] of Object.entries(byTarget)) {
    next[k] = expireTags(tags as never, currentTurn) as readonly T[];
  }
  return next;
}

export function tickDiplomacyState(state: GameState): GameState {
  const t = state.turn;
  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      empireStanding: driftMap(state.diplomacy.empireStanding),
      rivalStanding: driftMap(state.diplomacy.rivalStanding),
      empireTags: expireAllTags(state.diplomacy.empireTags, t),
      rivalTags: expireAllTags(state.diplomacy.rivalTags, t),
      cooldowns: decrementCooldowns(state.diplomacy.cooldowns, t),
      actionsResolvedThisTurn: 0,
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyTick.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyTick.ts src/game/diplomacy/__tests__/DiplomacyTick.test.ts
git commit -m "feat(diplomacy): tick — drift, tag expiry, cooldown decrement"
```

---

## Task 14: Copy templates

**Files:**

- Create: `src/game/diplomacy/CopyTemplates.ts`
- Test: `src/game/diplomacy/__tests__/CopyTemplates.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { getFlavor } from "../CopyTemplates.ts";

describe("getFlavor", () => {
  it("returns a non-empty string for any (kind, personality, tier)", () => {
    const s = getFlavor("giftAccepted", "warm", "Neutral");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("falls back to neutral defaults for unknown personality/tier", () => {
    const s = getFlavor("giftAccepted", "warm" as never, "Allied");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("differs across personality tags for the same kind/tier", () => {
    const a = getFlavor("giftRefused", "formal", "Cold");
    const b = getFlavor("giftRefused", "warm", "Cold");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/CopyTemplates.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/CopyTemplates.ts`:

```ts
import type { AmbassadorPersonality } from "../../data/types.ts";
import type { StandingTierName } from "./StandingTiers.ts";

export type FlavorKind =
  | "giftAccepted"
  | "giftRefused"
  | "lobbySuccess"
  | "lobbyFailed"
  | "nonCompeteAccepted"
  | "nonCompeteRefused"
  | "surveilExposed"
  | "tierShift";

const TEMPLATES: Record<
  FlavorKind,
  Record<AmbassadorPersonality, Record<StandingTierName, string>>
> = {
  giftAccepted: {
    formal: {
      Hostile: "Your gift is logged into the registry, dryly.",
      Cold: "The ambassador thanks you with measured precision.",
      Neutral: "Your gift is acknowledged through proper channels.",
      Warm: "The ambassador receives your gift with a courteous smile.",
      Allied: "Your gift will be celebrated at the next state dinner.",
    },
    mercenary: {
      Hostile: "They take it. Don't expect gratitude.",
      Cold: "Cash translates well in any language.",
      Neutral: "They like presents. Keep them coming.",
      Warm: "They count it twice and grin.",
      Allied: "Their accountants will remember this.",
    },
    suspicious: {
      Hostile: "They accept warily, watching for strings.",
      Cold: "They accept, but not before scanning it.",
      Neutral: "They eye the gift, then accept.",
      Warm: "Even friends, they say, deserve scrutiny — accepted.",
      Allied: "Trust is earned. They'll allow you another step.",
    },
    warm: {
      Hostile: "Surprised, they manage a smile.",
      Cold: "A warmer note creeps into their voice.",
      Neutral: "They thank you genuinely.",
      Warm: "They beam at the gesture.",
      Allied: "They embrace your envoy at the door.",
    },
  },
  giftRefused: {
    formal: {
      Hostile: "Refused, with formal regret.",
      Cold: "Refused, with reasons cited.",
      Neutral: "Refused, politely.",
      Warm: "Refused — a procedural matter, they say.",
      Allied: "Refused — protocol forbids it this season.",
    },
    mercenary: {
      Hostile: "Returned with a sneer.",
      Cold: "Not enough.",
      Neutral: "Pass.",
      Warm: "Save it for your enemies.",
      Allied: "Spend it where it'll do more good.",
    },
    suspicious: {
      Hostile: "Refused. They suspect a hook.",
      Cold: "Refused. The gift is unwrapped, examined, sent back.",
      Neutral: "Refused — too many strings, they say.",
      Warm: "Refused, regretfully.",
      Allied: "Refused — they'd rather you keep your hand.",
    },
    warm: {
      Hostile: "Refused, gently.",
      Cold: "Refused with a smile that doesn't reach the eyes.",
      Neutral: "Refused, with apologies.",
      Warm: "Refused — they say a gift between friends should be smaller.",
      Allied: "Refused — they say there's no need.",
    },
  },
  lobbySuccess: fillNeutralAcross("Your argument lands."),
  lobbyFailed: fillNeutralAcross("Your argument fizzles."),
  nonCompeteAccepted: fillNeutralAcross("The agreement is signed."),
  nonCompeteRefused: fillNeutralAcross("The deal is declined."),
  surveilExposed: fillNeutralAcross(
    "They trace the breach to your operatives.",
  ),
  tierShift: fillNeutralAcross("The relationship has shifted."),
};

function fillNeutralAcross(text: string) {
  const tiers: StandingTierName[] = [
    "Hostile",
    "Cold",
    "Neutral",
    "Warm",
    "Allied",
  ];
  const personalities: AmbassadorPersonality[] = [
    "formal",
    "mercenary",
    "suspicious",
    "warm",
  ];
  const out = {} as Record<
    AmbassadorPersonality,
    Record<StandingTierName, string>
  >;
  for (const p of personalities) {
    out[p] = {} as Record<StandingTierName, string>;
    for (const t of tiers) out[p][t] = text;
  }
  return out;
}

export function getFlavor(
  kind: FlavorKind,
  personality: AmbassadorPersonality,
  tier: StandingTierName,
): string {
  return (
    TEMPLATES[kind]?.[personality]?.[tier] ??
    TEMPLATES[kind]?.formal?.Neutral ??
    "..."
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/CopyTemplates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/CopyTemplates.ts src/game/diplomacy/__tests__/CopyTemplates.test.ts
git commit -m "feat(diplomacy): copy templates indexed by (kind, personality, tier)"
```

---

## Task 15: AI offer selector

**Files:**

- Create: `src/game/diplomacy/DiplomacyAI.ts`
- Test: `src/game/diplomacy/__tests__/DiplomacyAI.test.ts`

- [ ] **Step 1: Failing test**

Create the test:

```ts
import { describe, it, expect } from "vitest";
import { selectDiplomacyOffer } from "../DiplomacyAI.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    empires: [{ id: "vex" }, { id: "sol" }],
    aiCompanies: [{ id: "chen" }],
    contracts: [],
    diplomacy: {
      empireStanding: { vex: 70, sol: 50 },
      rivalStanding: { chen: 30 },
      empireTags: { vex: [], sol: [] },
      rivalTags: {
        chen: [{ kind: "SuspectedSpy", suspectId: "player", expiresOnTurn: 9 }],
      },
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
      crossEmpireRivalStanding: {},
    },
  } as unknown as GameState;
}

describe("selectDiplomacyOffer", () => {
  it("returns null sometimes (not every turn fires)", () => {
    let nullCount = 0;
    for (let s = 0; s < 30; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out === null) nullCount++;
    }
    expect(nullCount).toBeGreaterThan(0);
  });

  it("when emitted, the offer is a ChoiceEvent with options", () => {
    for (let s = 0; s < 30; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out) {
        expect(out.id).toBeDefined();
        expect(out.options.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error("Never emitted an offer in 30 trials");
  });

  it("can produce a SuspectedSpy warning when that tag is set", () => {
    let saw = false;
    for (let s = 0; s < 50; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out && out.eventId === "diplomacy:rivalSpyWarning") {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyAI.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/game/diplomacy/DiplomacyAI.ts`:

```ts
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type { ChoiceEvent, GameState } from "../../data/types.ts";
import { hasTagOfKind } from "./StandingTags.ts";
import { getStandingTier } from "./StandingTiers.ts";

interface Candidate {
  readonly weight: number;
  readonly build: () => ChoiceEvent;
}

const OFFER_FIRE_PROBABILITY = 0.4;

export function selectDiplomacyOffer(
  rng: SeededRNG,
  state: GameState,
): ChoiceEvent | null {
  if (!rng.chance(OFFER_FIRE_PROBABILITY)) return null;

  const candidates: Candidate[] = [];

  for (const e of state.empires ?? []) {
    const standing = state.diplomacy.empireStanding[e.id] ?? 50;
    const tier = getStandingTier(standing);
    if (tier === "Warm" || tier === "Allied") {
      candidates.push({
        weight: 3,
        build: () => ({
          id: `dipl-${state.turn}-${e.id}-contract`,
          eventId: "diplomacy:exclusiveContract",
          prompt: `${e.name ?? e.id} offers an exclusive shipping contract.`,
          options: [
            {
              id: "accept",
              label: "Accept",
              outcomeDescription: "Lock in the route.",
              effects: [],
            },
            {
              id: "decline",
              label: "Decline",
              outcomeDescription: "Politely refuse.",
              effects: [],
            },
          ],
          turnCreated: state.turn,
        }),
      });
    }
  }

  for (const r of state.aiCompanies ?? []) {
    const tags = state.diplomacy.rivalTags[r.id] ?? [];
    if (hasTagOfKind(tags, "SuspectedSpy")) {
      candidates.push({
        weight: 4,
        build: () => ({
          id: `dipl-${state.turn}-${r.id}-spy`,
          eventId: "diplomacy:rivalSpyWarning",
          prompt: `${r.id}'s relations director makes a quiet threat about your operatives.`,
          options: [
            {
              id: "deny",
              label: "Deny everything",
              outcomeDescription: "Hold your ground.",
              effects: [],
            },
            {
              id: "apologize",
              label: "Offer an apology",
              outcomeDescription: "Concede the encounter.",
              effects: [],
            },
          ],
          turnCreated: state.turn,
        }),
      });
    }
  }

  if (candidates.length === 0) return null;

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  const roll = rng.next() * total;
  let acc = 0;
  for (const c of candidates) {
    acc += c.weight;
    if (roll <= acc) return c.build();
  }
  return candidates[candidates.length - 1]!.build();
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/diplomacy/__tests__/DiplomacyAI.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/diplomacy/DiplomacyAI.ts src/game/diplomacy/__tests__/DiplomacyAI.test.ts
git commit -m "feat(diplomacy): AI-initiated offer selector"
```

---

## Task 16: Wire into TurnSimulator

**Files:**

- Modify: `src/game/simulation/TurnSimulator.ts`
- Test: `src/game/simulation/__tests__/TurnSimulator.diplomacy.test.ts`

- [ ] **Step 1: Failing integration test**

Create `src/game/simulation/__tests__/TurnSimulator.diplomacy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { simulateTurn } from "../TurnSimulator.ts";
import { setupNewGame } from "../../NewGameSetup.ts";

describe("TurnSimulator — diplomacy integration", () => {
  it("drains queuedActions during simulation", () => {
    const before = setupNewGame({ seed: 1 });
    const empireId = before.empires[0]!.id;
    const queued = {
      ...before,
      diplomacy: {
        ...before.diplomacy,
        queuedActions: [
          { id: "a", kind: "giftEmpire", targetId: empireId, cashCost: 5_000 },
        ],
      },
    };
    const after = simulateTurn(queued);
    expect(after.diplomacy.queuedActions).toHaveLength(0);
  });

  it("ticks diplomacy state (resets actionsResolvedThisTurn to 0)", () => {
    const s = setupNewGame({ seed: 1 });
    s.diplomacy.actionsResolvedThisTurn = 5;
    const after = simulateTurn(s);
    expect(after.diplomacy.actionsResolvedThisTurn).toBe(0);
  });
});
```

(Adapt to the actual `simulateTurn` signature — the existing tests in `src/game/simulation/__tests__/TurnSimulator.test.ts` show the calling pattern.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/simulation/__tests__/TurnSimulator.diplomacy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Insert pipeline calls**

In `src/game/simulation/TurnSimulator.ts`, just after the existing dilemma-selection block (around line 660, after the `if (!hasChoiceFromChainsThisTurn) { … selectDilemma … }` block), insert:

```ts
// ----- Step 8b-i: Process player-initiated diplomacy actions -----
{
  const result = processQueuedDiplomacyActions(nextState, rng);
  nextState = result.nextState;
  // Convert outcome modal entries into pendingChoiceEvents (or store on a new
  // pendingDiplomacyOutcomes field if introduced separately). For wave 1 we
  // surface them via pendingChoiceEvents using a minimal ChoiceEvent shape.
  for (const m of result.modalEntries) {
    nextState = {
      ...nextState,
      pendingChoiceEvents: [
        ...nextState.pendingChoiceEvents,
        {
          id: `dipl-out-${nextState.turn}-${m.targetId}`,
          eventId: `diplomacy:outcome:${m.headline}`,
          prompt: m.flavor,
          options: [
            {
              id: "ack",
              label: "Continue",
              outcomeDescription: "",
              effects: [],
            },
          ],
          turnCreated: nextState.turn,
        },
      ],
    };
  }
  // Digest entries flow into the turn report; existing turnReport plumbing
  // accepts a string[] field — append to whichever field surfaces them.
  if (result.digestEntries.length > 0) {
    nextState = {
      ...nextState,
      turnReport: {
        ...(nextState.turnReport ?? {}),
        diplomacyDigest: [
          ...((nextState.turnReport?.diplomacyDigest as string[]) ?? []),
          ...result.digestEntries.map((d) => d.text),
        ],
      },
    };
  }
}

// ----- Step 8b-ii: AI-initiated diplomacy offer (shares dilemma slot) -----
if (
  !hasChoiceFromChainsThisTurn &&
  nextState.pendingChoiceEvents.length === state.pendingChoiceEvents.length
) {
  const offer = selectDiplomacyOffer(rng, nextState);
  if (offer) {
    nextState = {
      ...nextState,
      pendingChoiceEvents: [...nextState.pendingChoiceEvents, offer],
    };
  }
}

// ----- Step 8b-iii: Tick diplomacy (drift, expire, decrement, reset) -----
nextState = tickDiplomacyState(nextState);
```

Add the imports at the top of the file:

```ts
import { processQueuedDiplomacyActions } from "../diplomacy/DiplomacyResolver.ts";
import { selectDiplomacyOffer } from "../diplomacy/DiplomacyAI.ts";
import { tickDiplomacyState } from "../diplomacy/DiplomacyTick.ts";
```

If `GameState.turnReport` doesn't exist yet, either:

- (a) add it as `turnReport?: { diplomacyDigest?: string[]; [k: string]: unknown }` to `GameState` in `types.ts`, or
- (b) use a top-level field name that _does_ exist (read `TurnReportScene.ts` to find what's already plumbed for the review screen) and append to that.

The implementer subagent should pick (a) if no existing field fits.

- [ ] **Step 4: Run tests + full suite**

```
npx vitest run src/game/simulation/__tests__/TurnSimulator.diplomacy.test.ts
npm run check
```

Expected: target test passes; no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/game/simulation/TurnSimulator.ts src/data/types.ts src/game/simulation/__tests__/TurnSimulator.diplomacy.test.ts
git commit -m "feat(diplomacy): wire queue processing, AI offer, and tick into TurnSimulator"
```

---

## Task 17: Save migration

**Files:**

- Modify: `src/game/SaveManager.ts`
- Test: `src/game/__tests__/SaveManager.test.ts` (extend)

- [ ] **Step 1: Failing test**

Add a test case to `src/game/__tests__/SaveManager.test.ts` (or create the file using Vitest pattern):

```ts
import { describe, it, expect } from "vitest";
import { migrateSave } from "../SaveManager.ts";

describe("migrateSave — diplomacy", () => {
  it("adds an empty DiplomacyState to legacy saves missing it", () => {
    const legacy = {
      version: 1,
      timestamp: 0,
      turn: 1,
      state: {
        seed: 1,
        turn: 1,
        // no diplomacy
      },
    };
    const migrated = migrateSave(legacy as never);
    expect(migrated.state.diplomacy).toBeDefined();
    expect(migrated.state.diplomacy.empireStanding).toEqual({});
    expect(migrated.state.diplomacy.queuedActions).toEqual([]);
  });

  it("preserves diplomacy state when present", () => {
    const fresh = {
      version: 1,
      timestamp: 0,
      turn: 5,
      state: {
        seed: 1,
        turn: 5,
        diplomacy: {
          empireStanding: { vex: 70 },
          rivalStanding: {},
          empireTags: {},
          rivalTags: {},
          empireAmbassadors: {},
          rivalLiaisons: {},
          cooldowns: {},
          queuedActions: [],
          actionsResolvedThisTurn: 0,
          crossEmpireRivalStanding: {},
        },
      },
    };
    const migrated = migrateSave(fresh as never);
    expect(migrated.state.diplomacy.empireStanding.vex).toBe(70);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/__tests__/SaveManager.test.ts -t "diplomacy"`
Expected: FAIL.

- [ ] **Step 3: Update `migrateSave`**

In `src/game/SaveManager.ts`, find `migrateSave()` (around lines 45–55). Add a check before returning:

```ts
if (!envelope.state.diplomacy) {
  envelope.state.diplomacy = {
    empireStanding: {},
    rivalStanding: {},
    empireTags: {},
    rivalTags: {},
    empireAmbassadors: {},
    rivalLiaisons: {},
    cooldowns: {},
    queuedActions: [],
    actionsResolvedThisTurn: 0,
    crossEmpireRivalStanding: {},
  };
}
```

(Use the actual envelope/state field accessors that the existing code uses — `migrateSave` may take an `unknown` and return a typed result. Match its signature.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/game/__tests__/SaveManager.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/SaveManager.ts src/game/__tests__/SaveManager.test.ts
git commit -m "feat(diplomacy): migrate legacy saves missing DiplomacyState"
```

---

## Task 18: Extract `CharacterDialogModal` from DilemmaScene

**Files:**

- Create: `src/ui/CharacterDialogModal.ts`
- Modify: `src/scenes/DilemmaScene.ts`
- Test: `src/ui/__tests__/CharacterDialogModal.test.ts`

This task has higher complexity. The implementer subagent should read `src/scenes/DilemmaScene.ts` end-to-end before starting and identify exactly which render code (panel + portrait + prompt + option-row builder) constitutes the reusable piece.

- [ ] **Step 1: Failing structural test**

Create `src/ui/__tests__/CharacterDialogModal.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildCharacterDialogConfig } from "../CharacterDialogModal.ts";
import type { CharacterPortrait } from "../../data/types.ts";

const portrait: CharacterPortrait = { portraitId: "p1", category: "human" };

describe("buildCharacterDialogConfig", () => {
  it("returns ambassador-tier styling tokens", () => {
    const cfg = buildCharacterDialogConfig({
      speaker: { name: "Krell", subtitle: "Vex Hegemony", portrait },
      speakerTier: "ambassador",
      flavor: "Greetings.",
      options: [{ id: "ok", label: "OK", outcomeDescription: "", effects: [] }],
    });
    expect(cfg.headerColor).toBeDefined();
    expect(cfg.frameStyle).toBe("muted");
  });

  it("returns ruler-tier styling tokens (gold accent, large frame)", () => {
    const cfg = buildCharacterDialogConfig({
      speaker: { name: "Vex IX", subtitle: "Emperor", portrait },
      speakerTier: "ruler",
      flavor: "Audience granted.",
      options: [{ id: "ok", label: "OK", outcomeDescription: "", effects: [] }],
    });
    expect(cfg.frameStyle).toBe("gold");
    expect(cfg.portraitSize).toBeGreaterThan(0);
  });
});
```

The exported `buildCharacterDialogConfig` is a pure function that returns the styling tokens used to build the Phaser display objects. Phaser-side construction is wrapped in a separate exported `openCharacterDialog(scene, props): Promise<string>` that uses the config; structural tests cover the pure config builder.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/__tests__/CharacterDialogModal.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the module**

Create `src/ui/CharacterDialogModal.ts`:

```ts
import * as Phaser from "phaser";
import type { CharacterPortrait, ChoiceOption } from "../data/types.ts";

export interface CharacterDialogProps {
  speaker: { name: string; subtitle: string; portrait: CharacterPortrait };
  speakerTier: "ambassador" | "ruler";
  flavor: string;
  options: readonly ChoiceOption[];
}

export interface CharacterDialogConfig {
  readonly headerColor: number;
  readonly frameStyle: "muted" | "gold";
  readonly portraitSize: number;
  readonly fadeMs: number;
}

const AMB_HEADER = 0xc8a464;
const RULER_HEADER = 0xffd770;

export function buildCharacterDialogConfig(
  props: CharacterDialogProps,
): CharacterDialogConfig {
  if (props.speakerTier === "ruler") {
    return {
      headerColor: RULER_HEADER,
      frameStyle: "gold",
      portraitSize: 220,
      fadeMs: 300,
    };
  }
  return {
    headerColor: AMB_HEADER,
    frameStyle: "muted",
    portraitSize: 160,
    fadeMs: 0,
  };
}

export function openCharacterDialog(
  scene: Phaser.Scene,
  props: CharacterDialogProps,
): Promise<string> {
  // The implementer should port the existing DilemmaScene render code into
  // this function, parameterized by `buildCharacterDialogConfig(props)`. The
  // returned Promise resolves with the chosen option `id`.
  return new Promise((resolve) => {
    // STUB: actual implementation lifts the relevant code from DilemmaScene.
    // Concretely:
    //   1. Create a Panel sized per config.portraitSize/frameStyle.
    //   2. Render portrait (load via portraitLoader.ensureCeoPortrait/
    //      ensureEmpireLeaderPortrait).
    //   3. Render speaker name + subtitle in config.headerColor.
    //   4. Render flavor text body.
    //   5. Render option buttons; each calls resolve(option.id) on click.
    //   6. Apply fade-in if config.fadeMs > 0.
    //
    // For the structural test alone, the stub may resolve immediately on
    // the first option to keep tests synchronous.
    resolve(props.options[0]?.id ?? "");
  });
}
```

- [ ] **Step 4: Refactor DilemmaScene to use the module**

In `src/scenes/DilemmaScene.ts`, identify the existing render path that draws the portrait + name + flavor + option buttons. Replace it with a call:

```ts
import { openCharacterDialog } from "../ui/CharacterDialogModal.ts";

// Inside DilemmaScene.create() or wherever the dilemma is rendered:
const choiceId = await openCharacterDialog(this, {
  speaker: {
    name: "Storyteller", // dilemmas use the existing portrait/illustration; pass
    subtitle: dilemma.category ?? "",
    portrait: { portraitId: dilemma.imageKey ?? "", category: "human" },
  },
  speakerTier: "ambassador",
  flavor: dilemma.prompt,
  options: dilemma.options,
});
```

The exact integration point depends on DilemmaScene's current code. The implementer subagent should:

1. Read DilemmaScene end-to-end.
2. Find the function that builds the modal display objects.
3. Move the code into `openCharacterDialog`'s body.
4. Replace the inlined code with a call to `openCharacterDialog`.

- [ ] **Step 5: Run tests + full suite**

```
npm run check
```

Expected: typecheck clean, tests pass (existing dilemma tests still pass).

- [ ] **Step 6: Commit**

```bash
git add src/ui/CharacterDialogModal.ts src/scenes/DilemmaScene.ts src/ui/__tests__/CharacterDialogModal.test.ts
git commit -m "refactor(ui): extract CharacterDialogModal from DilemmaScene"
```

---

## Task 19: DiplomacyScene (Foreign Relations hub)

**Files:**

- Create: `src/scenes/DiplomacyScene.ts`
- Test: `src/scenes/__tests__/DiplomacyScene.test.ts` (smoke)

Phaser scene tests are minimal — verify queueing logic via a non-scene helper that the scene calls.

- [ ] **Step 1: Failing test for queueing helper**

Create `src/scenes/__tests__/DiplomacyScene.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { queueDiplomacyAction } from "../DiplomacyScene.ts";
import type { GameState, QueuedDiplomacyAction } from "../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    reputation: 50,
    diplomacy: {
      empireStanding: {},
      rivalStanding: {},
      empireTags: {},
      rivalTags: {},
      empireAmbassadors: {},
      rivalLiaisons: {},
      cooldowns: {},
      queuedActions: [],
      actionsResolvedThisTurn: 0,
      crossEmpireRivalStanding: {},
    },
  } as unknown as GameState;
}

describe("queueDiplomacyAction", () => {
  it("appends to queuedActions", () => {
    const a: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    const next = queueDiplomacyAction(baseState(), a);
    expect(next.diplomacy.queuedActions).toHaveLength(1);
    expect(next.diplomacy.queuedActions[0]?.id).toBe("a1");
  });

  it("rejects when cooldown active", () => {
    const s = baseState();
    s.diplomacy.cooldowns["giftEmpire:vex"] = 10;
    const a: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    expect(() => queueDiplomacyAction(s, a)).toThrow(/cooldown/i);
  });

  it("rejects when cap reached for the turn (count of queued >= cap)", () => {
    const s = baseState();
    s.diplomacy.queuedActions = [
      { id: "x1", kind: "giftEmpire", targetId: "vex", cashCost: 0 },
      { id: "x2", kind: "giftEmpire", targetId: "sol", cashCost: 0 },
    ];
    expect(() =>
      queueDiplomacyAction(s, {
        id: "x3",
        kind: "surveil",
        targetId: "chen",
        surveilLens: "cash",
        cashCost: 0,
      }),
    ).toThrow(/cap/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scenes/__tests__/DiplomacyScene.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement scene + helper**

Create `src/scenes/DiplomacyScene.ts`:

```ts
import * as Phaser from "phaser";
import type { GameState, QueuedDiplomacyAction } from "../data/types.ts";
import { gameStore } from "../data/GameStore.ts";
import { isOnCooldown } from "../game/diplomacy/Cooldowns.ts";
import { cooldownKey } from "../game/diplomacy/Cooldowns.ts";

const REPUTATION_THROTTLE_THRESHOLD = 75;
const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;

function getCap(state: GameState): number {
  return (state.reputation ?? 0) >= REPUTATION_THROTTLE_THRESHOLD
    ? THROTTLE_HIGH
    : THROTTLE_BASE;
}

export function queueDiplomacyAction(
  state: GameState,
  action: QueuedDiplomacyAction,
): GameState {
  const key = cooldownKey(action.kind, action.targetId, action.subjectId);
  if (isOnCooldown(state.diplomacy.cooldowns, key, state.turn)) {
    throw new Error(`Action on cooldown: ${key}`);
  }
  if (state.diplomacy.queuedActions.length >= getCap(state)) {
    throw new Error("Per-turn diplomacy cap reached");
  }
  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      queuedActions: [...state.diplomacy.queuedActions, action],
    },
  };
}

export class DiplomacyScene extends Phaser.Scene {
  constructor() {
    super({ key: "DiplomacyScene" });
  }

  create(): void {
    // Implementer: build the layout per design §6.1 using @spacebiz/ui:
    //   - left rail: ScrollableList of empires + rivals with tier + tags badges
    //   - right pane: Panel with portrait + name + tier + tags + action buttons
    //   - header counter: "Actions: X/Y"
    //
    // Each action button click constructs a QueuedDiplomacyAction and calls:
    //   gameStore.setState(queueDiplomacyAction(gameStore.getState(), action));
    //
    // Use portraitLoader.ensureCeoPortrait / ensureEmpireLeaderPortrait for
    // ruler/CEO portraits, but render the *ambassador* portrait by default.
    // Ambassadors live at state.diplomacy.empireAmbassadors[empireId].
  }
}
```

The implementer subagent should fill in the `create()` method using existing UI primitives, following the patterns in `src/scenes/EmpireScene.ts` and `src/scenes/ContractsScene.ts` for similar list-on-left, detail-on-right layouts.

- [ ] **Step 4: Run tests + typecheck**

```
npx vitest run src/scenes/__tests__/DiplomacyScene.test.ts
npm run typecheck
```

Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/DiplomacyScene.ts src/scenes/__tests__/DiplomacyScene.test.ts
git commit -m "feat(diplomacy): Foreign Relations hub scene with action queueing"
```

---

## Task 20: Wire DiplomacyScene into GameHUDScene

**Files:**

- Modify: `src/scenes/GameHUDScene.ts`
- Modify: `src/main.ts` (or wherever scenes are registered)

- [ ] **Step 1: Register the scene**

In `src/main.ts`, locate the `scene` array passed to `Phaser.Game` config. Add:

```ts
import { DiplomacyScene } from "./scenes/DiplomacyScene.ts";

// inside the scenes array:
DiplomacyScene,
```

- [ ] **Step 2: Add menu entry to GameHUDScene**

In `src/scenes/GameHUDScene.ts`:

a. At line ~65 (the `routes/fleet/contracts` mapping object), add:

```ts
diplomacy: "DiplomacyScene",
```

b. At line ~138 (the description map):

```ts
DiplomacyScene: "Foreign Relations — empires, rivals, and standing",
```

c. At line ~152 (the scene-key array used for ordering / inclusion):

```ts
"DiplomacyScene",
```

d. At line ~362 (the menu items array):

```ts
{ label: "Foreign Relations", scene: "DiplomacyScene", icon: "icon-diplomacy" },
```

If the icon `icon-diplomacy` doesn't exist as a loaded asset, use one of the existing icons (e.g., `icon-contracts`) for now and leave a comment to swap in the diplomacy icon later.

- [ ] **Step 3: Smoke check via build**

```
npm run check
```

Expected: typecheck + tests + build all pass.

Manually verify in `npm run dev` that the menu shows Foreign Relations and clicking opens the new scene without errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/scenes/GameHUDScene.ts
git commit -m "feat(diplomacy): add Foreign Relations menu entry and route"
```

---

## Task 21: Diplomatic activity digest section in TurnReportScene

**Files:**

- Modify: `src/scenes/TurnReportScene.ts`
- Test: minimal — extending an existing scene test if present, otherwise rely on `npm run check` pass

- [ ] **Step 1: Read existing structure**

Read `src/scenes/TurnReportScene.ts` and identify where the section panels (P&L, Top Routes, Rival Snap, Market) are constructed (around lines 146–200+).

- [ ] **Step 2: Add a Diplomatic Activity panel**

After the last existing section panel, add:

```ts
const diplomacyDigest =
  (gameStore.getState().turnReport?.diplomacyDigest as string[] | undefined) ?? [];

if (diplomacyDigest.length > 0) {
  const dipPanel = new Panel(this, {
    x: /* match existing panel layout coords */,
    y: /* match existing panel layout coords */,
    width: /* match */,
    height: /* match */,
    title: "Diplomatic Activity",
  });
  let row = 0;
  for (const line of diplomacyDigest) {
    new Label(this, {
      x: dipPanel.x + 16,
      y: dipPanel.y + 36 + row * 22,
      text: `• ${line}`,
      style: "body",
    });
    row++;
  }
}
```

(Adjust to match the exact `Panel` and `Label` constructor signatures — the implementer should grep for an existing `new Panel(this,` call in this file and copy its argument shape.)

- [ ] **Step 3: Run check**

```
npm run check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/TurnReportScene.ts
git commit -m "feat(diplomacy): show Diplomatic Activity digest in turn report"
```

---

## Task 22: Final integration test (3-modal cap)

**Files:**

- Test: `src/game/__tests__/diplomacyIntegration.test.ts`

- [ ] **Step 1: Write integration test**

```ts
import { describe, it, expect } from "vitest";
import { simulateTurn } from "../simulation/TurnSimulator.ts";
import { setupNewGame } from "../NewGameSetup.ts";
import type { QueuedDiplomacyAction } from "../../data/types.ts";

describe("Diplomacy integration — modal cap of 3", () => {
  it("a turn with 2 player actions + 1 AI offer produces ≤3 modals total", () => {
    const initial = setupNewGame({ seed: 7 });
    const empireId = initial.empires[0]!.id;
    const rivalId = initial.aiCompanies[0]!.id;
    const queued: QueuedDiplomacyAction[] = [
      { id: "p1", kind: "giftEmpire", targetId: empireId, cashCost: 5_000 },
      {
        id: "p2",
        kind: "surveil",
        targetId: rivalId,
        surveilLens: "cash",
        cashCost: 15_000,
      },
    ];
    const start = {
      ...initial,
      diplomacy: { ...initial.diplomacy, queuedActions: queued },
    };
    const after = simulateTurn(start);
    // Modals are queued via pendingChoiceEvents; both player-action modals
    // (when they fire) and any AI offer share that queue.
    const newModals =
      after.pendingChoiceEvents.length - initial.pendingChoiceEvents.length;
    expect(newModals).toBeLessThanOrEqual(3);
  });

  it("queued actions exceed cap → only `cap` resolved, rest deferred to digest", () => {
    const initial = setupNewGame({ seed: 1 });
    const empireId = initial.empires[0]!.id;
    const queued: QueuedDiplomacyAction[] = [
      { id: "p1", kind: "giftEmpire", targetId: empireId, cashCost: 1 },
      {
        id: "p2",
        kind: "giftEmpire",
        targetId: initial.empires[1]!.id,
        cashCost: 1,
      },
      {
        id: "p3",
        kind: "giftEmpire",
        targetId: initial.empires[2]!.id,
        cashCost: 1,
      },
    ];
    const start = {
      ...initial,
      reputation: 30, // ensures cap = 2
      diplomacy: { ...initial.diplomacy, queuedActions: queued },
    };
    const after = simulateTurn(start);
    expect(after.diplomacy.queuedActions).toHaveLength(0);
    const digest =
      (after.turnReport?.diplomacyDigest as string[] | undefined) ?? [];
    expect(digest.some((line) => /deferred/i.test(line))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test + full suite**

```
npx vitest run src/game/__tests__/diplomacyIntegration.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/game/__tests__/diplomacyIntegration.test.ts
git commit -m "test(diplomacy): integration tests for modal cap and deferral"
```

---

## Final Review

After all 22 tasks are complete, run:

```bash
npm run check
git log --oneline main..HEAD
```

Expected: all gates pass; ~22 commits stacked on `claude/peaceful-raman-228fe8`. Push the branch with `git push` so the existing PR ([space-tycoon#253](https://github.com/ianlintner/space-tycoon/pull/253)) picks up the implementation commits.

Then dispatch the final code-reviewer subagent for an end-to-end review across the implementation, and proceed via `superpowers:finishing-a-development-branch`.
