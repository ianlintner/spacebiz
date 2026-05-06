# News & Event Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the GNN ticker and event system into a living universe — persistent roster of sports teams/musicians/celebrities, six new ticker categories, story bodies for the NewscasterScene, fifteen space hazard events, three new event chains, and nineteen new dilemmas.

**Architecture:** Approach B (Living World) from spec `docs/superpowers/specs/2026-05-06-news-event-expansion-design.md`. A `UniverseRoster` saved to `GameState` provides persistent named entities. `FlavorTemplate` gains a `story[]` field rendered in `NewscasterScene`. New `SpaceHazardEventDefinitions.ts` adds Stellaris/MOO2-style phenomena. Three new `EventChain` arcs.

**Tech Stack:** Phaser 4 + TypeScript + Vite + Vitest. `as const` objects (no enums). `import type` for type-only imports. All randomness through `SeededRNG`.

**Spec:** [`docs/superpowers/specs/2026-05-06-news-event-expansion-design.md`](../specs/2026-05-06-news-event-expansion-design.md)

---

## Codebase Anchors (key facts every task needs)

- `GameState` interface: `src/data/types.ts:1181`
- `OptionScalingTag`: `src/data/types.ts:61-66`
- `EventChainId`: `src/data/types.ts:172-178`
- `EventEffect`: `src/data/types.ts:680-706`
- `DilemmaCategory`: `src/data/types.ts:89-94`
- `createDefaultState()`: `src/data/GameStore.ts:14-82`
- `simulateTurn()`: `src/game/simulation/TurnSimulator.ts:366`
- `tickEventChains` / `checkChainTriggers` calls: `src/game/simulation/TurnSimulator.ts:733-735`
- Ticker feed call site: `src/scenes/GameHUDScene.ts:1981` (`buildTickerItems`)
- `substituteTickerTokens`: `src/generation/news/tokens.ts:187`
- `FlavorTemplate`: `src/generation/news/types.ts:43-48`
- `TickerItem`: `src/generation/news/types.ts:34-41`
- `CATEGORY_META` / `FLAVOR_CATEGORIES`: `src/generation/news/categories.ts:16-71`
- `NEWSCASTER_DEFS` / `NEWSCASTER_BY_CATEGORY`: `src/generation/news/newscasters.ts`
- `NewscasterScene` typewriter at `src/scenes/NewscasterScene.ts:194-215`

**Run after every task:** `npm run check` (typecheck + tests + build) — must pass before committing.

---

## Task 1: Add core types

**Files:**

- Modify: `src/data/types.ts` (add UniverseRoster types, extend OptionScalingTag, EventChainId, EventEffect)

This task adds all the shared TypeScript types that later tasks consume. No tests yet — types are validated by `tsc --noEmit` in step 5.

- [ ] **Step 1: Add `"navigation"` to `OptionScalingTag`**

Locate `OptionScalingTag` at line 61-66 in `src/data/types.ts`. Replace:

```ts
export type OptionScalingTag =
  | "fleetCondition"
  | "fleetSize"
  | "tech"
  | "rep"
  | "cash";
```

with:

```ts
export type OptionScalingTag =
  | "fleetCondition"
  | "fleetSize"
  | "tech"
  | "rep"
  | "cash"
  | "navigation";
```

- [ ] **Step 2: Add new `EventChainId` values**

Locate `EventChainId` at line 172-178. Replace with:

```ts
export type EventChainId =
  | "pirate_campaign"
  | "diplomatic_crisis"
  | "plague"
  | "fuel_crisis"
  | "black_market_scandal"
  | "empire_succession"
  | "anomaly_investigation"
  | "galactic_music_tour"
  | "military_buildup";
```

- [ ] **Step 3: Add new `EventEffect` types**

Locate `EventEffect` at line 680-706. Add `"modifyFleetCondition"` and `"blockSystem"` to the effect type union:

```ts
export interface EventEffect {
  type:
    | "modifyPrice"
    | "blockRoute"
    | "modifySpeed"
    | "modifyDemand"
    | "modifyCash"
    | "modifyReputation"
    | "blockPassengers"
    | "groundEmpireRoutes"
    | "blockImport"
    | "removeBans"
    | "modifyTariff"
    | "closeBorders"
    | "openBorders"
    | "declareWar"
    | "signPeace"
    | "formAlliance"
    | "formTradePact"
    | "degradeRelation"
    | "modifyFleetCondition"
    | "blockSystem";
  targetId?: string;
  cargoType?: CargoType;
  value: number;
  empireId?: string;
  empireId2?: string;
  surface?: "modal" | "digest";
}
```

- [ ] **Step 4: Add UniverseRoster types**

Append to the end of `src/data/types.ts` (before any `export {}` if present, otherwise at file end):

```ts
// ---------------------------------------------------------------------------
// Universe Roster — persistent named entities for living-world ticker stories
// ---------------------------------------------------------------------------

export type MusicGenre =
  | "void-jazz"
  | "hyperpop"
  | "drone-folk"
  | "synthpulse"
  | "death-ambient"
  | "celestial-pop";

export interface SportsTeam {
  id: string;
  name: string;
  homePort: string;
  league: "Core" | "Rim";
  wins: number;
  losses: number;
  /** Positive = win streak, negative = loss streak. */
  streak: number;
  lastResult?: string;
  championship: boolean;
}

export interface Musician {
  id: string;
  name: string;
  genre: MusicGenre;
  currentAlbum?: string;
  onTour: boolean;
  tourPort?: string;
  controversyActive: boolean;
  controversyDesc?: string;
}

export interface Celebrity {
  id: string;
  name: string;
  role: string;
  /** id of another Celebrity they're feuding with, if any */
  currentFeud?: string;
  latestProject?: string;
  scandalActive: boolean;
}

export interface Pundit {
  id: string;
  name: string;
  affiliation: string;
  slant: "pro-empire" | "skeptic" | "contrarian" | "sensationalist";
  recentQuote?: string;
}

export interface CrimeFigure {
  id: string;
  name: string;
  type: "syndicate" | "pirate_lord" | "smuggler";
  active: boolean;
  lastSighting?: string;
}

export interface MilitaryOfficer {
  id: string;
  name: string;
  rank: string;
  empire: string;
  status: "active" | "disgraced" | "retired" | "missing";
  currentCommand?: string;
}

export interface UniverseRoster {
  sportsTeams: SportsTeam[];
  musicians: Musician[];
  celebrities: Celebrity[];
  pundits: Pundit[];
  crimeFigures: CrimeFigure[];
  militaryOfficers: MilitaryOfficer[];
}

export interface RosterHistoryEntry {
  turn: number;
  entityId: string;
  /** Human-readable summary usable in ticker story templates. */
  event: string;
}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (these types are not yet referenced — just compiled)

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts
git commit -m "feat(types): add UniverseRoster types and extend event/scaling unions

Adds SportsTeam, Musician, Celebrity, Pundit, CrimeFigure, MilitaryOfficer,
UniverseRoster, RosterHistoryEntry, MusicGenre. Adds 'navigation' scaling
tag, three new EventChainIds (anomaly_investigation, galactic_music_tour,
military_buildup), and two new EventEffect types (modifyFleetCondition,
blockSystem)."
```

---

## Task 2: Universe Roster seeder + tick

**Files:**

- Create: `src/generation/news/universeRoster.ts`
- Create: `src/generation/news/__tests__/universeRoster.test.ts`

This task creates the deterministic seeder and per-turn tick function. Galaxy state ports are bound at seed time so teams/musicians have real homes.

- [ ] **Step 1: Write failing test**

Create `src/generation/news/__tests__/universeRoster.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { seedUniverseRoster, rosterTick } from "../universeRoster.ts";

const fakeGalaxy = {
  planets: [
    { name: "Kepler-4" },
    { name: "Veylor Prime" },
    { name: "Brittain-9" },
    { name: "Aurora Reach" },
    { name: "Sigma Drift" },
    { name: "Halcyon Hub" },
    { name: "Marrow Belt" },
    { name: "Quasar Verge" },
  ],
} as const;

describe("seedUniverseRoster", () => {
  it("produces a roster with the expected entity counts", () => {
    const roster = seedUniverseRoster(new SeededRNG(42), fakeGalaxy as never);
    expect(roster.sportsTeams).toHaveLength(8);
    expect(roster.musicians).toHaveLength(6);
    expect(roster.celebrities).toHaveLength(6);
    expect(roster.pundits).toHaveLength(4);
    expect(roster.crimeFigures).toHaveLength(3);
    expect(roster.militaryOfficers).toHaveLength(4);
  });

  it("is deterministic for the same seed", () => {
    const a = seedUniverseRoster(new SeededRNG(99), fakeGalaxy as never);
    const b = seedUniverseRoster(new SeededRNG(99), fakeGalaxy as never);
    expect(a.sportsTeams[0].name).toBe(b.sportsTeams[0].name);
    expect(a.musicians[0].name).toBe(b.musicians[0].name);
  });

  it("binds sports teams to real ports from galaxy state", () => {
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    const planetNames = fakeGalaxy.planets.map((p) => p.name);
    for (const team of roster.sportsTeams) {
      expect(planetNames).toContain(team.homePort);
    }
  });

  it("starts all sports teams at 0-0 with no streak", () => {
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    for (const team of roster.sportsTeams) {
      expect(team.wins).toBe(0);
      expect(team.losses).toBe(0);
      expect(team.streak).toBe(0);
      expect(team.championship).toBe(false);
    }
  });
});

describe("rosterTick", () => {
  it("plays one match per pair of teams and updates standings", () => {
    const roster = seedUniverseRoster(new SeededRNG(11), fakeGalaxy as never);
    const history = rosterTick(roster, new SeededRNG(11), 1);

    const totalGames = roster.sportsTeams.reduce(
      (sum, t) => sum + t.wins + t.losses,
      0,
    );
    // 8 teams paired into 4 matches; each match adds 1 win + 1 loss = 2 game-rows
    expect(totalGames).toBe(8);

    // Should produce at least 4 sports history entries (one per match)
    expect(
      history.filter((h) => h.event.includes("defeated")).length,
    ).toBeGreaterThanOrEqual(4);
  });

  it("flips musician onTour state across turns", () => {
    const roster = seedUniverseRoster(new SeededRNG(33), fakeGalaxy as never);
    const initial = roster.musicians.map((m) => m.onTour);
    // tick several turns to give state a chance to flip
    for (let t = 1; t <= 10; t++) {
      rosterTick(roster, new SeededRNG(33 + t), t);
    }
    const after = roster.musicians.map((m) => m.onTour);
    expect(initial).not.toEqual(after);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm run test -- universeRoster`
Expected: FAIL (`Cannot find module '../universeRoster.ts'`)

- [ ] **Step 3: Create the implementation**

Create `src/generation/news/universeRoster.ts`:

```ts
import type {
  UniverseRoster,
  SportsTeam,
  Musician,
  Celebrity,
  Pundit,
  CrimeFigure,
  MilitaryOfficer,
  MusicGenre,
  RosterHistoryEntry,
  GalaxyState,
} from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Name pools — alien sci-fi register, themed per archetype
// ---------------------------------------------------------------------------

const TEAM_PREFIXES = [
  "Vortex",
  "Cygnus",
  "Halcyon",
  "Pulsar",
  "Nebula",
  "Drift",
  "Orbit",
  "Tidal",
  "Iron",
  "Solar",
  "Twilight",
  "Quasar",
  "Comet",
  "Verge",
  "Stellar",
  "Voidline",
];

const TEAM_SUFFIXES = [
  "Nomads",
  "Comets",
  "Reapers",
  "Drifters",
  "Saints",
  "Wreckers",
  "Sentries",
  "Aces",
  "Runners",
  "Vagrants",
  "Marauders",
  "Talons",
  "Wolves",
  "Hawks",
  "Outlaws",
  "Heralds",
];

const MUSICIAN_FIRST = [
  "Drix",
  "Kira",
  "Vael",
  "Loom",
  "Sable",
  "Halix",
  "Mira",
  "Cygne",
  "Thurr",
  "Veska",
  "Orin",
  "Nyx",
  "Korrin",
  "Pyx",
  "Solen",
  "Tessa",
];

const MUSICIAN_LAST = [
  "Vael",
  "Onn",
  "Roxx",
  "Marlow",
  "Drevin",
  "Halqar",
  "Sett",
  "Brann",
  "Voss",
  "Quell",
  "Mire",
  "Pyre",
];

const MUSIC_GENRES: MusicGenre[] = [
  "void-jazz",
  "hyperpop",
  "drone-folk",
  "synthpulse",
  "death-ambient",
  "celestial-pop",
];

const ALBUM_TITLES = [
  "Hollow Constellations",
  "Dust & Diamond",
  "Slow Light Catastrophe",
  "Twin Moon Hymnal",
  "Saltpaper Saints",
  "After Apogee",
  "Kindling Stars",
  "Soft Mutiny",
  "Pale Empyrean",
  "Argent Reverie",
  "Static Choir",
  "Murmur of Empires",
];

const CELEB_FIRST = [
  "Brix",
  "Ondra",
  "Kessa",
  "Voryn",
  "Lana",
  "Sivix",
  "Tarek",
  "Quill",
  "Mavix",
  "Dela",
  "Joren",
  "Fenix",
];

const CELEB_LAST = [
  "Morvaan",
  "Halcyx",
  "Drev",
  "Selnis",
  "Karne",
  "Vexx",
  "Tyron",
  "Ovan",
  "Crest",
  "Brell",
  "Thane",
  "Solaire",
];

const CELEB_ROLES = [
  "holovid star",
  "socialite",
  "reality host",
  "celebrity chef",
  "influencer",
  "former captain turned commentator",
];

const CELEB_PROJECTS = [
  "the holovid 'Crown of Ash'",
  "the variety show 'Late Light'",
  "a perfume line called Astrum",
  "a tell-all memoir",
  "a holo-documentary about dust pirates",
  "a luxury restaurant chain",
];

const PUNDIT_FIRST = [
  "Kalen",
  "Mox",
  "Thessa",
  "Roven",
  "Aeloria",
  "Brann",
  "Lorr",
  "Petra",
  "Yvex",
  "Demir",
];

const PUNDIT_LAST = [
  "Vrede",
  "Collat",
  "Marquand",
  "Harrow",
  "Senn",
  "Ostrik",
  "Briel",
  "Korr",
  "Vance",
];

const PUNDIT_QUOTES = [
  "'A tariff is just a polite way of saying war.'",
  "'Every star has its own kind of corruption.'",
  "'Trust the data, distrust the dataset.'",
  "'The Empire never sleeps. It just naps strategically.'",
  "'When freight slows, civilizations stumble.'",
];

const CRIME_NAMES = [
  "The Pale Meridian",
  "Vrek Sonn",
  "The Quiet Hand",
  "Marra Cael",
  "Ironwidow Cartel",
  "Halix Ovo",
  "The Slow Knife",
  "Sevek Drun",
];

const MILITARY_FIRST = [
  "Harken",
  "Veska",
  "Oren",
  "Drelle",
  "Jorra",
  "Sevix",
  "Krein",
  "Maxen",
  "Tarrow",
];

const MILITARY_LAST = [
  "Voss",
  "Calderan",
  "Reth",
  "Kaine",
  "Ostrov",
  "Pyre",
  "Hesker",
  "Vance",
  "Kort",
];

const MILITARY_RANKS = ["Admiral", "Commodore", "Fleet Captain"];

const COMMAND_NAMES = [
  "the dreadnought Iron Vow",
  "the carrier Long Twilight",
  "the strike group Solace",
  "the battleline Argent Pyre",
  "the fleet Cold Tide",
  "the Hammer Squadron",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickN<T>(rng: SeededRNG, source: readonly T[], count: number): T[] {
  // Without-replacement sample using the RNG.
  const pool = [...source];
  const out: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = rng.nextInt(0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function unique<T>(rng: SeededRNG, source: readonly T[], count: number): T[] {
  return pickN(rng, source, count);
}

function makeName(
  rng: SeededRNG,
  first: readonly string[],
  last: readonly string[],
): string {
  return `${first[rng.nextInt(0, first.length - 1)]} ${last[rng.nextInt(0, last.length - 1)]}`;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export function seedUniverseRoster(
  rng: SeededRNG,
  galaxyState: GalaxyState,
): UniverseRoster {
  const planetNames = galaxyState.planets.map((p) => p.name);

  // 8 sports teams across 2 leagues (4 each)
  const teamPrefixes = unique(rng, TEAM_PREFIXES, 8);
  const teamSuffixes = unique(rng, TEAM_SUFFIXES, 8);
  const sportsTeams: SportsTeam[] = teamPrefixes.map((prefix, i) => ({
    id: `team_${i}`,
    name: `${prefix} ${teamSuffixes[i]}`,
    homePort:
      planetNames.length > 0
        ? planetNames[rng.nextInt(0, planetNames.length - 1)]
        : "Unknown Port",
    league: i < 4 ? "Core" : "Rim",
    wins: 0,
    losses: 0,
    streak: 0,
    championship: false,
  }));

  // 6 musicians
  const musicians: Musician[] = [];
  for (let i = 0; i < 6; i++) {
    const onTour = rng.nextFloat() < 0.4;
    musicians.push({
      id: `musician_${i}`,
      name: makeName(rng, MUSICIAN_FIRST, MUSICIAN_LAST),
      genre: MUSIC_GENRES[rng.nextInt(0, MUSIC_GENRES.length - 1)],
      currentAlbum: ALBUM_TITLES[rng.nextInt(0, ALBUM_TITLES.length - 1)],
      onTour,
      tourPort:
        onTour && planetNames.length > 0
          ? planetNames[rng.nextInt(0, planetNames.length - 1)]
          : undefined,
      controversyActive: false,
    });
  }

  // 6 celebrities
  const celebrities: Celebrity[] = [];
  for (let i = 0; i < 6; i++) {
    celebrities.push({
      id: `celeb_${i}`,
      name: makeName(rng, CELEB_FIRST, CELEB_LAST),
      role: CELEB_ROLES[rng.nextInt(0, CELEB_ROLES.length - 1)],
      latestProject: CELEB_PROJECTS[rng.nextInt(0, CELEB_PROJECTS.length - 1)],
      scandalActive: false,
    });
  }

  // 4 pundits
  const pundits: Pundit[] = [];
  const slants: Pundit["slant"][] = [
    "pro-empire",
    "skeptic",
    "contrarian",
    "sensationalist",
  ];
  for (let i = 0; i < 4; i++) {
    pundits.push({
      id: `pundit_${i}`,
      name: makeName(rng, PUNDIT_FIRST, PUNDIT_LAST),
      affiliation:
        galaxyState.empires?.[
          rng.nextInt(0, Math.max(0, (galaxyState.empires?.length ?? 1) - 1))
        ]?.name ?? "Independent",
      slant: slants[i],
      recentQuote: PUNDIT_QUOTES[rng.nextInt(0, PUNDIT_QUOTES.length - 1)],
    });
  }

  // 3 crime figures
  const crimeNames = unique(rng, CRIME_NAMES, 3);
  const crimeTypes: CrimeFigure["type"][] = [
    "syndicate",
    "pirate_lord",
    "smuggler",
  ];
  const crimeFigures: CrimeFigure[] = crimeNames.map((name, i) => ({
    id: `crime_${i}`,
    name,
    type: crimeTypes[i],
    active: true,
    lastSighting:
      planetNames.length > 0
        ? planetNames[rng.nextInt(0, planetNames.length - 1)]
        : undefined,
  }));

  // 4 military officers
  const militaryOfficers: MilitaryOfficer[] = [];
  for (let i = 0; i < 4; i++) {
    militaryOfficers.push({
      id: `officer_${i}`,
      name: makeName(rng, MILITARY_FIRST, MILITARY_LAST),
      rank: MILITARY_RANKS[rng.nextInt(0, MILITARY_RANKS.length - 1)],
      empire:
        galaxyState.empires?.[
          rng.nextInt(0, Math.max(0, (galaxyState.empires?.length ?? 1) - 1))
        ]?.name ?? "Independent",
      status: "active",
      currentCommand: COMMAND_NAMES[rng.nextInt(0, COMMAND_NAMES.length - 1)],
    });
  }

  return {
    sportsTeams,
    musicians,
    celebrities,
    pundits,
    crimeFigures,
    militaryOfficers,
  };
}

// ---------------------------------------------------------------------------
// Tick — called once per turn during simulation
// ---------------------------------------------------------------------------

const SCORE_LOW = 1;
const SCORE_HIGH = 9;

export function rosterTick(
  roster: UniverseRoster,
  rng: SeededRNG,
  turn: number,
): RosterHistoryEntry[] {
  const history: RosterHistoryEntry[] = [];

  // --- Sports: pair teams, simulate one game per pair --------------------
  const teams = [...roster.sportsTeams];
  // Shuffle pairings deterministically
  for (let i = teams.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  for (let i = 0; i + 1 < teams.length; i += 2) {
    const a = teams[i];
    const b = teams[i + 1];
    const aScore = rng.nextInt(SCORE_LOW, SCORE_HIGH) + Math.max(0, a.streak);
    const bScore = rng.nextInt(SCORE_LOW, SCORE_HIGH) + Math.max(0, b.streak);
    const winner = aScore >= bScore ? a : b;
    const loser = aScore >= bScore ? b : a;
    const winScore = Math.max(aScore, bScore);
    const loseScore = Math.min(aScore, bScore);
    winner.wins += 1;
    loser.losses += 1;
    winner.streak = winner.streak >= 0 ? winner.streak + 1 : 1;
    loser.streak = loser.streak <= 0 ? loser.streak - 1 : -1;
    winner.lastResult = `defeated the ${loser.name} ${winScore}-${loseScore}`;
    loser.lastResult = `lost to the ${winner.name} ${winScore}-${loseScore}`;
    history.push({
      turn,
      entityId: winner.id,
      event: `${winner.name} defeated ${loser.name} ${winScore}-${loseScore}`,
    });
  }

  // --- Championship check (any team reaches 5 wins past losses) ----------
  for (const team of roster.sportsTeams) {
    if (!team.championship && team.wins - team.losses >= 5) {
      team.championship = true;
      history.push({
        turn,
        entityId: team.id,
        event: `${team.name} clinched the ${team.league} League championship`,
      });
    }
  }

  // --- Musicians: tour state + controversies -----------------------------
  for (const m of roster.musicians) {
    // 25% chance to flip tour state per turn
    if (rng.nextFloat() < 0.25) {
      m.onTour = !m.onTour;
      if (!m.onTour) {
        m.tourPort = undefined;
      }
    }
    // 10% chance to start/end a controversy
    if (rng.nextFloat() < 0.1) {
      m.controversyActive = !m.controversyActive;
      if (m.controversyActive) {
        m.controversyDesc = pickControversy(rng);
        history.push({
          turn,
          entityId: m.id,
          event: `${m.name} embroiled in controversy: ${m.controversyDesc}`,
        });
      } else {
        m.controversyDesc = undefined;
      }
    }
  }

  // --- Celebrities: feuds + scandals -------------------------------------
  for (const c of roster.celebrities) {
    if (rng.nextFloat() < 0.08) {
      c.scandalActive = !c.scandalActive;
      if (c.scandalActive) {
        history.push({
          turn,
          entityId: c.id,
          event: `${c.name} caught in a fresh scandal`,
        });
      }
    }
    if (!c.currentFeud && rng.nextFloat() < 0.05) {
      const others = roster.celebrities.filter((o) => o.id !== c.id);
      if (others.length > 0) {
        c.currentFeud = others[rng.nextInt(0, others.length - 1)].id;
      }
    } else if (c.currentFeud && rng.nextFloat() < 0.15) {
      c.currentFeud = undefined;
    }
  }

  // --- Crime figures: occasional arrest/return ---------------------------
  for (const cf of roster.crimeFigures) {
    if (cf.active && rng.nextFloat() < 0.05) {
      cf.active = false;
      history.push({
        turn,
        entityId: cf.id,
        event: `${cf.name} reported arrested by Imperial authorities`,
      });
    } else if (!cf.active && rng.nextFloat() < 0.2) {
      cf.active = true;
      history.push({
        turn,
        entityId: cf.id,
        event: `${cf.name} resurfaces in the underworld`,
      });
    }
  }

  // Military officer status is driven by military_buildup chain — no tick here

  return history;
}

const CONTROVERSIES = [
  "stage walkout at the Halcyon festival",
  "leaked diss track aimed at a rival",
  "tax evasion allegations from three empires",
  "publicly feuding with their own producer",
  "accused of plagiarising a derelict transmission",
  "uninvited from the Galactic Music Awards",
];

function pickControversy(rng: SeededRNG): string {
  return CONTROVERSIES[rng.nextInt(0, CONTROVERSIES.length - 1)];
}
```

- [ ] **Step 4: Run the test**

Run: `npm run test -- universeRoster`
Expected: PASS (all roster tests green)

- [ ] **Step 5: Run full check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/generation/news/universeRoster.ts src/generation/news/__tests__/universeRoster.test.ts
git commit -m "feat(roster): add UniverseRoster seeder + per-turn tick

seedUniverseRoster() builds 27 named entities (8 teams, 6 musicians,
6 celebrities, 4 pundits, 3 crime figures, 4 military officers) bound
to galaxy ports, deterministic per save seed. rosterTick() simulates
sports games, tour states, controversies, scandals, and underworld
churn each turn."
```

---

## Task 3: GameState fields + GameStore integration + simulation hook

**Files:**

- Modify: `src/data/types.ts` (add `universeRoster`, `rosterHistory` to `GameState`)
- Modify: `src/data/GameStore.ts` (initialize fields in `createDefaultState`)
- Modify: `src/game/simulation/TurnSimulator.ts` (call `rosterTick` during turn processing)

- [ ] **Step 1: Add roster fields to `GameState`**

Locate `GameState` interface at `src/data/types.ts:1181`. Add these fields somewhere within the interface (recommend grouping near `activeEventChains`):

```ts
  /** Persistent named entities for living-world ticker stories. */
  universeRoster: UniverseRoster;
  /** Last 10 notable roster outcomes for cross-story callbacks. */
  rosterHistory: RosterHistoryEntry[];
```

- [ ] **Step 2: Initialize fields in `createDefaultState`**

Open `src/data/GameStore.ts`. At the top, add the import:

```ts
import { seedUniverseRoster } from "../generation/news/universeRoster.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
```

Inside `createDefaultState()`, add these fields to the returned state object (near `activeEventChains` if present, otherwise anywhere). Use a stub galaxy because the real galaxy is generated later in setup; the roster gets re-seeded in the new game flow:

```ts
    universeRoster: {
      sportsTeams: [],
      musicians: [],
      celebrities: [],
      pundits: [],
      crimeFigures: [],
      militaryOfficers: [],
    },
    rosterHistory: [],
```

- [ ] **Step 3: Locate the new-game setup function**

Find the function that finalizes a new game (after galaxy generation). Run:

```bash
grep -rn "seedUniverseRoster\|generateGalaxy\|finalizeNewGame\|setupNewGame\|startNewGame" src/ --include="*.ts" | head -30
```

The new-game flow generates galaxy, then sets state. Find that flow and add roster seeding right after galaxy is generated. Most likely candidates: `src/scenes/GameSetupScene.ts` or `src/game/setup/*.ts`. The implementer should grep and identify the precise line where galaxy state has been built and the player is about to enter `GameHUDScene`.

- [ ] **Step 4: Seed the roster after galaxy is generated**

In the new-game setup flow (the file found in Step 3), immediately after the galaxy is finalized but before the state is committed, call:

```ts
import { seedUniverseRoster } from "../generation/news/universeRoster.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";

// after galaxyState is built and state.galaxy assigned:
const rosterRng = new SeededRNG(state.seed + 0x517a33); // distinct namespace from galaxy seed
const universeRoster = seedUniverseRoster(rosterRng, state.galaxy);
state = { ...state, universeRoster, rosterHistory: [] };
```

- [ ] **Step 5: Hook `rosterTick` into the turn simulator**

Open `src/game/simulation/TurnSimulator.ts`. Locate lines 733-735 (where `tickEventChains` and `checkChainTriggers` are called). Add the import at the top of the file:

```ts
import { rosterTick } from "../../generation/news/universeRoster.ts";
```

Add this block immediately before the `tickEventChains` call:

```ts
// --- Universe roster tick (sports, music, celebrities, crime, military) ---
{
  const rosterRng = new SeededRNG(
    nextState.seed + nextState.turn * 31 + 0x510c,
  );
  const newHistory = rosterTick(
    nextState.universeRoster,
    rosterRng,
    nextState.turn,
  );
  const combined = [...nextState.rosterHistory, ...newHistory];
  nextState = {
    ...nextState,
    rosterHistory: combined.slice(Math.max(0, combined.length - 10)),
  };
}
```

(The `rosterTick` mutates the roster in place, which is fine because we're inside the simulation pipeline that creates a fresh `nextState` object. The `rosterHistory` slice keeps only the last 10 entries.)

- [ ] **Step 6: Add a regression test for save/load round-trip**

Create `src/data/__tests__/rosterPersistence.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { seedUniverseRoster } from "../../generation/news/universeRoster.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

describe("UniverseRoster JSON round-trip", () => {
  it("survives JSON.stringify/parse without losing fields", () => {
    const fakeGalaxy = {
      planets: [
        { name: "Kepler-4" },
        { name: "Veylor Prime" },
        { name: "Halcyon" },
      ],
    };
    const roster = seedUniverseRoster(new SeededRNG(7), fakeGalaxy as never);
    const round = JSON.parse(JSON.stringify(roster));
    expect(round.sportsTeams).toHaveLength(8);
    expect(round.sportsTeams[0].name).toBe(roster.sportsTeams[0].name);
    expect(round.musicians[0].genre).toBe(roster.musicians[0].genre);
  });
});
```

- [ ] **Step 7: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/data/types.ts src/data/GameStore.ts src/game/simulation/TurnSimulator.ts src/data/__tests__/rosterPersistence.test.ts
# ALSO add the new-game setup file modified in Step 4
git commit -m "feat(state): integrate UniverseRoster into GameState + turn simulation

Adds universeRoster + rosterHistory to GameState. Initializes empty in
createDefaultState; seeded with real galaxy ports during new-game setup.
TurnSimulator calls rosterTick() each turn and keeps a 10-entry history
window for ticker story callbacks."
```

---

## Task 4: New ticker categories + metadata

**Files:**

- Modify: `src/generation/news/types.ts` (extend `TickerCategory` union; add `StoryDepth`; extend `FlavorTemplate` and `TickerItem`)
- Modify: `src/generation/news/categories.ts` (add 6 entries to `CATEGORY_META` and `FLAVOR_CATEGORIES`)

This task adds the 6 new categories and extends the type contracts for story bodies. Story body resolution in tokens/feed comes in Task 6.

- [ ] **Step 1: Extend `TickerCategory`, add `StoryDepth`, extend `FlavorTemplate` and `TickerItem`**

Open `src/generation/news/types.ts`. Replace lines 7-48 with:

```ts
export type TickerCategory =
  // Structural — sourced from real game state
  | "headline"
  | "leader"
  | "stock"
  // Twenty original flavor pools
  | "politics"
  | "corporate"
  | "market_mover"
  | "crime"
  | "science"
  | "sports"
  | "celebrity"
  | "cosmic_weather"
  | "local"
  | "health"
  | "religion"
  | "blotter"
  | "food"
  | "realestate"
  | "travel"
  | "fashion"
  | "academia"
  | "xenobiology"
  | "obituary"
  | "homage"
  // Six new flavor pools (2026-05 expansion)
  | "anomaly"
  | "music"
  | "discovery"
  | "gossip"
  | "military"
  | "propaganda";

export type StoryDepth = "short" | "medium" | "long";

export interface TickerItem {
  category: TickerCategory;
  text: string;
  /** Higher number = appears earlier in panel. headline=100, leader=80, stock=60, flavor=20-40. */
  priority: number;
  /** Optional color override (e.g., stock up/down). RGB hex int, theme-token compatible. */
  color?: number;
  /** Optional rendered story body (longer narrative shown in NewscasterScene). */
  story?: string;
  /** Story depth hint used for UI badges (e.g., [DEVELOPING] for "long"). */
  storyDepth?: StoryDepth;
}

export interface FlavorTemplate {
  category: TickerCategory;
  template: string;
  /** Selection weight, default 1. Use lower weights to make a homage rarer. */
  weight?: number;
  /** 1-3 story body variants; one is picked at render time. Tokens supported same as `template`. */
  story?: string[];
  /** Override default depth for this category. */
  storyDepth?: StoryDepth;
}

/** Default story depth by category — used by feed/scene when template omits storyDepth. */
export const CATEGORY_STORY_DEPTH: Record<TickerCategory, StoryDepth> = {
  // Structural — no story rendered
  headline: "short",
  leader: "short",
  stock: "short",
  // Short
  blotter: "short",
  obituary: "short",
  food: "short",
  fashion: "short",
  gossip: "short",
  // Medium
  sports: "medium",
  music: "medium",
  celebrity: "medium",
  crime: "medium",
  politics: "medium",
  corporate: "medium",
  propaganda: "medium",
  military: "medium",
  local: "medium",
  health: "medium",
  religion: "medium",
  realestate: "medium",
  travel: "medium",
  academia: "medium",
  market_mover: "medium",
  homage: "medium",
  // Long
  anomaly: "long",
  discovery: "long",
  science: "long",
  cosmic_weather: "long",
  xenobiology: "long",
};
```

- [ ] **Step 2: Add the new entries to `CATEGORY_META`**

Open `src/generation/news/categories.ts`. Locate `CATEGORY_META` (line 16-47) and append these entries before the closing `}`:

```ts
  anomaly: { badge: "ANM", label: "Anomaly Report", toneColor: "warning" },
  music: { badge: "MUS", label: "Music & Culture", toneColor: "textDim" },
  discovery: { badge: "DSC", label: "Discovery", toneColor: "accent" },
  gossip: { badge: "GSP", label: "Society", toneColor: "textDim" },
  military: { badge: "MIL", label: "Defense", toneColor: "text" },
  propaganda: { badge: "STA", label: "State Affairs", toneColor: "textDim" },
```

- [ ] **Step 3: Add new entries to `FLAVOR_CATEGORIES`**

Locate `FLAVOR_CATEGORIES` (line 50-71) and append the six new categories:

```ts
export const FLAVOR_CATEGORIES: TickerCategory[] = [
  "politics",
  "corporate",
  "market_mover",
  "crime",
  "science",
  "sports",
  "celebrity",
  "cosmic_weather",
  "local",
  "health",
  "religion",
  "blotter",
  "food",
  "realestate",
  "travel",
  "fashion",
  "academia",
  "xenobiology",
  "obituary",
  "homage",
  // Expansion
  "anomaly",
  "music",
  "discovery",
  "gossip",
  "military",
  "propaganda",
];
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS (the new categories aren't yet referenced from templates, that comes in Tasks 12-13)

- [ ] **Step 5: Commit**

```bash
git add src/generation/news/types.ts src/generation/news/categories.ts
git commit -m "feat(ticker): add 6 new categories and story body fields

New TickerCategory values: anomaly, music, discovery, gossip, military,
propaganda. FlavorTemplate gains optional story[] + storyDepth.
TickerItem gains story + storyDepth carrier fields. CATEGORY_STORY_DEPTH
map provides default depth by category."
```

---

## Task 5: New newscasters

**Files:**

- Modify: `src/generation/news/newscasters.ts` (add 6 NewscasterType values, 6 NewscasterDef entries, 6 routing entries)

- [ ] **Step 1: Extend `NewscasterType` union**

Open `src/generation/news/newscasters.ts`. Locate `NewscasterType` (lines 3-16). Replace with:

```ts
export type NewscasterType =
  | "anchor"
  | "anchor_b"
  | "anchor_c"
  | "anchor_d"
  | "science"
  | "finance"
  | "fashion"
  | "field"
  | "weather"
  | "paparazzi"
  | "sports"
  | "investigator"
  | "explorer"
  // 2026-05 expansion
  | "anomaly"
  | "music"
  | "discovery"
  | "gossip"
  | "military"
  | "propaganda";
```

- [ ] **Step 2: Add the 6 new `NewscasterDef` entries**

Locate `NEWSCASTER_DEFS` Record. Add these entries at the end (before the closing `}`):

```ts
  anomaly: {
    type: "anomaly",
    name: "Zix Anomura",
    title: "Phenomena Correspondent",
    channel: "GNN Deep Scan",
    portraitKey: "newscaster_anomaly",
    accentColor: 0x00ffcc,
  },
  music: {
    type: "music",
    name: "Lyra Cass",
    title: "Culture & Sound Correspondent",
    channel: "GNN Pulse",
    portraitKey: "newscaster_music",
    accentColor: 0xff66aa,
  },
  discovery: {
    type: "discovery",
    name: "Dr. Venn Orix",
    title: "Exploration Correspondent",
    channel: "GNN Frontier Desk",
    portraitKey: "newscaster_discovery",
    accentColor: 0x88ff44,
  },
  gossip: {
    type: "gossip",
    name: "Sable Drenn",
    title: "Society Correspondent",
    channel: "GNN Inner Circle",
    portraitKey: "newscaster_gossip",
    accentColor: 0xffaa00,
  },
  military: {
    type: "military",
    name: "Cmdr. Harke Voss",
    title: "Defense Correspondent",
    channel: "GNN Strategic Bureau",
    portraitKey: "newscaster_military",
    accentColor: 0xcc2200,
  },
  propaganda: {
    type: "propaganda",
    name: "The Archivist",
    title: "State Affairs Analyst",
    channel: "GNN Authority Desk",
    portraitKey: "newscaster_propaganda",
    accentColor: 0x888888,
  },
```

- [ ] **Step 3: Add 6 new `NEWSCASTER_BY_CATEGORY` routes**

Locate `NEWSCASTER_BY_CATEGORY`. Add these entries at the end:

```ts
  anomaly: "anomaly",
  music: "music",
  discovery: "discovery",
  gossip: "gossip",
  military: "military",
  propaganda: "propaganda",
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — TypeScript will enforce that `NEWSCASTER_BY_CATEGORY` covers all `TickerCategory` values now.

- [ ] **Step 5: Commit**

```bash
git add src/generation/news/newscasters.ts
git commit -m "feat(newscasters): add 6 new GNN correspondents

Zix Anomura (anomaly), Lyra Cass (music), Dr. Venn Orix (discovery),
Sable Drenn (gossip), Cmdr. Harke Voss (military), The Archivist
(propaganda). Each gets a NewscasterDef and category routing entry."
```

---

## Task 6: Story body architecture — token resolution + ticker feed

**Files:**

- Modify: `src/generation/news/tokens.ts` (add roster token resolvers)
- Modify: `src/generation/news/tickerFeed.ts` (resolve story body when picking a flavor template)
- Create: `src/generation/news/__tests__/storyResolution.test.ts`

This task wires the story body through the pipeline so a `TickerItem` carries a resolved `story` string when its source `FlavorTemplate` had a `story[]` pool.

- [ ] **Step 1: Write failing test for roster token resolution**

Create `src/generation/news/__tests__/storyResolution.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { substituteTickerTokens } from "../tokens.ts";
import { seedUniverseRoster } from "../universeRoster.ts";
import type { GameState } from "../../../data/types.ts";

const fakeGalaxy = {
  planets: [
    { name: "Kepler-4" },
    { name: "Veylor" },
    { name: "Halcyon" },
    { name: "Sigma" },
    { name: "Aurora" },
    { name: "Brittain" },
    { name: "Quasar" },
    { name: "Marrow" },
  ],
  empires: [{ name: "Helion" }, { name: "Korr" }],
};

function makeState(): GameState {
  const roster = seedUniverseRoster(new SeededRNG(101), fakeGalaxy as never);
  return {
    seed: 101,
    turn: 1,
    galaxy: fakeGalaxy,
    universeRoster: roster,
    rosterHistory: [],
    aiCompanies: [],
  } as unknown as GameState;
}

describe("substituteTickerTokens roster bindings", () => {
  it("resolves {team}, {team2}, {musician}, {celeb}, {pundit}, {officer}, {rank}, {crime_figure}", () => {
    const state = makeState();
    const out = substituteTickerTokens(
      "{team} routs {team2}; {musician} reacts. {celeb}, {pundit}, {rank} {officer}, {crime_figure}.",
      state,
      new SeededRNG(202),
    );
    // Tokens are substituted (none left in result)
    expect(out).not.toContain("{team}");
    expect(out).not.toContain("{musician}");
    expect(out).not.toContain("{celeb}");
    expect(out).not.toContain("{pundit}");
    expect(out).not.toContain("{officer}");
    expect(out).not.toContain("{rank}");
    expect(out).not.toContain("{crime_figure}");
    // Two distinct teams
    const teamNames = state.universeRoster.sportsTeams.map((t) => t.name);
    const found = teamNames.filter((n) => out.includes(n));
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it("{last_result} resolves to the bound team's lastResult", () => {
    const state = makeState();
    state.universeRoster.sportsTeams[0].lastResult =
      "defeated the Marrow Hawks 9-3";
    const out = substituteTickerTokens(
      "{team} {last_result}.",
      state,
      new SeededRNG(303),
    );
    // The team that gets bound must match the lastResult that gets bound.
    // The simplest assertion: the output contains some team's lastResult fragment.
    const anyMatch = state.universeRoster.sportsTeams.some(
      (t) => t.lastResult && out.includes(t.lastResult),
    );
    expect(anyMatch).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm run test -- storyResolution`
Expected: FAIL (tokens like `{team}` left unresolved)

- [ ] **Step 3: Add roster token resolvers**

Open `src/generation/news/tokens.ts`. The function uses a `TokenContext` with a `bound` Map. Add resolution branches inside the regex switch (the file resolves tokens around line 194-236).

First, at the top of `substituteTickerTokens`, after creating the context, add a roster reference:

```ts
const roster = state.universeRoster;
```

Then in the switch/case ladder, add these cases (insert them before the default branch):

```ts
case "team": {
  if (!roster?.sportsTeams?.length) return match;
  if (ctx.bound.has("team")) return ctx.bound.get("team")!;
  const team = roster.sportsTeams[ctx.rng.nextInt(0, roster.sportsTeams.length - 1)];
  ctx.bound.set("team", team.name);
  ctx.bound.set("__team_id", team.id);
  if (team.lastResult) ctx.bound.set("__team_last_result", team.lastResult);
  return team.name;
}
case "team2": {
  if (!roster?.sportsTeams?.length) return match;
  if (ctx.bound.has("team2")) return ctx.bound.get("team2")!;
  const taken = ctx.bound.get("__team_id");
  const pool = roster.sportsTeams.filter((t) => t.id !== taken);
  if (!pool.length) return match;
  const team = pool[ctx.rng.nextInt(0, pool.length - 1)];
  ctx.bound.set("team2", team.name);
  return team.name;
}
case "last_result": {
  return ctx.bound.get("__team_last_result") ?? "took the field";
}
case "musician": {
  if (!roster?.musicians?.length) return match;
  if (ctx.bound.has("musician")) return ctx.bound.get("musician")!;
  const m = roster.musicians[ctx.rng.nextInt(0, roster.musicians.length - 1)];
  ctx.bound.set("musician", m.name);
  ctx.bound.set("__musician_id", m.id);
  if (m.controversyDesc) ctx.bound.set("__controversy", m.controversyDesc);
  if (m.currentAlbum) ctx.bound.set("__album", m.currentAlbum);
  ctx.bound.set("__genre", m.genre);
  return m.name;
}
case "album": {
  return ctx.bound.get("__album") ?? "their latest record";
}
case "genre": {
  return ctx.bound.get("__genre") ?? "void-jazz";
}
case "controversy": {
  return ctx.bound.get("__controversy") ?? "an unspecified incident";
}
case "celeb": {
  if (!roster?.celebrities?.length) return match;
  if (ctx.bound.has("celeb")) return ctx.bound.get("celeb")!;
  const c = roster.celebrities[ctx.rng.nextInt(0, roster.celebrities.length - 1)];
  ctx.bound.set("celeb", c.name);
  return c.name;
}
case "pundit": {
  if (!roster?.pundits?.length) return match;
  if (ctx.bound.has("pundit")) return ctx.bound.get("pundit")!;
  const p = roster.pundits[ctx.rng.nextInt(0, roster.pundits.length - 1)];
  ctx.bound.set("pundit", p.name);
  return p.name;
}
case "crime_figure": {
  if (!roster?.crimeFigures?.length) return match;
  const active = roster.crimeFigures.filter((c) => c.active);
  if (!active.length) return roster.crimeFigures[0].name;
  if (ctx.bound.has("crime_figure")) return ctx.bound.get("crime_figure")!;
  const cf = active[ctx.rng.nextInt(0, active.length - 1)];
  ctx.bound.set("crime_figure", cf.name);
  return cf.name;
}
case "officer": {
  if (!roster?.militaryOfficers?.length) return match;
  if (ctx.bound.has("officer")) return ctx.bound.get("officer")!;
  const o = roster.militaryOfficers[ctx.rng.nextInt(0, roster.militaryOfficers.length - 1)];
  ctx.bound.set("officer", o.name);
  ctx.bound.set("__rank", o.rank);
  return o.name;
}
case "rank": {
  if (ctx.bound.has("__rank")) return ctx.bound.get("__rank")!;
  if (!roster?.militaryOfficers?.length) return match;
  const o = roster.militaryOfficers[ctx.rng.nextInt(0, roster.militaryOfficers.length - 1)];
  ctx.bound.set("__rank", o.rank);
  return o.rank;
}
```

- [ ] **Step 4: Resolve story body in `tickerFeed.ts`**

Open `src/generation/news/tickerFeed.ts`. Locate the flavor item construction (around line 125 — `text: substituteTickerTokens(tmpl.template, state, rng)`). The current TickerItem construction needs to also pick a story variant. Add this above the construction:

```ts
import { CATEGORY_STORY_DEPTH } from "./types.ts";
```

(if not already imported). Then in the flavor loop, replace the item construction with:

```ts
let story: string | undefined;
if (tmpl.story && tmpl.story.length > 0) {
  const variant = tmpl.story[rng.nextInt(0, tmpl.story.length - 1)];
  story = substituteTickerTokens(variant, state, rng);
}
const depth = tmpl.storyDepth ?? CATEGORY_STORY_DEPTH[tmpl.category];
flavorItems.push({
  category: tmpl.category,
  text: substituteTickerTokens(tmpl.template, state, rng),
  priority: 40 - drawIndex,
  story,
  storyDepth: depth,
});
```

(Adapt to the existing variable names — `flavorItems` may be called something else; the implementer should match the surrounding code.)

Critical: when resolving `story`, use the SAME `rng` that resolved `template` in the same iteration so that `{team}` in the headline binds to the same team referenced in the story body. The `bound` Map inside `substituteTickerTokens` only persists within a single call — so to share bindings across template+story, we need a small refactor. Use this approach instead:

```ts
// Build a single resolved bundle so headline + story share token bindings
const resolvedHeadline = substituteTickerTokens(tmpl.template, state, rng);
let resolvedStory: string | undefined;
if (tmpl.story && tmpl.story.length > 0) {
  const variant = tmpl.story[rng.nextInt(0, tmpl.story.length - 1)];
  resolvedStory = substituteTickerTokens(variant, state, rng);
}
```

Note: Sharing bindings across two calls would require a context-passing API change. For Phase 1, accept that the headline and story may bind different teams/musicians (each call resolves independently). If the spec requires shared bindings, do it as a follow-up:

> **Implementer note (deferred):** Sharing token bindings across template + story is a known follow-up. For this task, headline and story resolve independently. The binding consistency is a polish item; functional correctness comes first.

Update the spec's "Section 1.5" `{last_result}` clause appropriately later if sharing isn't implemented.

- [ ] **Step 5: Run tests**

Run: `npm run test -- storyResolution`
Expected: PASS

Run: `npm run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/generation/news/tokens.ts src/generation/news/tickerFeed.ts src/generation/news/__tests__/storyResolution.test.ts
git commit -m "feat(news): wire story body resolution + roster tokens

Adds {team}, {team2}, {musician}, {album}, {genre}, {celeb}, {pundit},
{crime_figure}, {officer}, {rank}, {last_result}, {controversy} token
resolvers. Ticker feed now resolves a story[] variant alongside each
headline, attaching to TickerItem.story for NewscasterScene rendering."
```

---

## Task 7: NewscasterScene story rendering + DEVELOPING badge

**Files:**

- Modify: `src/scenes/NewscasterScene.ts`

- [ ] **Step 1: Render story body when present, fall back to text**

Open `src/scenes/NewscasterScene.ts`. Locate the typewriter setup at lines 194-215. The current code reads `this.item.text`. Change it to prefer `this.item.story`:

```ts
this.fullStoryText = this.item.story ?? this.item.text;
```

Place this assignment where `fullStoryText` was previously set.

- [ ] **Step 2: Add `[DEVELOPING]` badge for long-depth stories**

Locate the header bar creation block (lines 87-108). After the LIVE indicator, add:

```ts
if (this.item.storyDepth === "long") {
  const developing = this.add
    .text(panelX + panelW - 110, headerY + 8, "[DEVELOPING]", {
      fontFamily: theme.fonts.mono,
      fontSize: "12px",
      color: theme.colors.warning,
    })
    .setOrigin(1, 0);
  this.widgets.push(developing);
  // Simple alpha pulse
  this.tweens.add({
    targets: developing,
    alpha: { from: 1, to: 0.4 },
    duration: 800,
    ease: "Sine.InOut",
    yoyo: true,
    repeat: -1,
  });
}
```

(Use exact theme color tokens from the existing `theme` import. Position values may need to align with the current header layout — match the LIVE indicator positioning style.)

- [ ] **Step 3: Verify with a manual smoke test**

Add a brief in-line comment near the new code:

```ts
// item.story takes precedence over item.text; absent story → backward-compatible fallback.
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Browser smoke test (CLAUDE.md UI workflow)**

Per project CLAUDE.md, UI changes need browser verification. Start dev server:

```bash
npm run dev
```

Open the game, click any ticker item. Confirm:

- The newscaster modal opens
- Without `story`: text matches the ticker headline (current behavior)
- With `story`: typewriter renders the longer body (need a template with `story[]` to test — this becomes possible after Task 12)

If templates with stories don't exist yet (Tasks 12-14 not done), this step is purely a regression test for the fallback path.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/NewscasterScene.ts
git commit -m "feat(newscaster): render story body + add DEVELOPING badge

NewscasterScene typewriter now prefers TickerItem.story over .text,
falling back when absent (backward compatible). Long-depth items
display a pulsing [DEVELOPING] badge in the header."
```

---

## Task 8: Space hazard event definitions

**Files:**

- Create: `src/game/events/SpaceHazardEventDefinitions.ts`
- Modify: `src/game/events/EventDefinitions.ts` (re-export new events)

- [ ] **Step 1: Create the SpaceHazardEventDefinitions file**

Create `src/game/events/SpaceHazardEventDefinitions.ts`:

```ts
import type {
  EventEffect,
  EventChoice,
  ChoiceOption,
} from "../../data/types.ts";

/** Local mirror of EventTemplate to avoid circular import with EventDefinitions.ts. */
export interface SpaceHazardEventTemplate {
  id: string;
  name: string;
  description: string;
  category: "hazard";
  duration: number;
  effects: EventEffect[];
  weight: number;
  headwindWeight: number;
  tailwindWeight: number;
  requiresChoice?: boolean;
  choices?: EventChoice[];
  choiceOptions?: ChoiceOption[];
  /** Tier 1 = effects-bearing; Tier 2 = pure flavor anomaly. */
  tier: 1 | 2;
}

// ===========================================================================
// Tier 1 — Effects-bearing space hazards (8 events)
// ===========================================================================

const hyperlaneInstability: SpaceHazardEventTemplate = {
  id: "hyperlane_instability",
  name: "Hyperlane Instability",
  description:
    "Subspace currents in {target} are surging unpredictably. Hyperlanes through the sector are intermittently impassable.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 5,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifySpeed", value: -50, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "reroute_traffic",
      label: "Reroute fleet around the affected lanes",
      outcomeDescription: "You absorb the time hit but ships stay safe.",
      baseSuccess: 70,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: -3000 }],
    },
    {
      id: "wait_it_out",
      label: "Hold ships in port until lanes stabilize",
      outcomeDescription: "Lost contracts pile up but no ships are lost.",
      baseSuccess: 80,
      scalingTags: ["cash"],
      effects: [{ type: "modifyCash", value: -5000 }],
    },
    {
      id: "send_repair_crew",
      label: "Charter a repair team to stabilize the lanes",
      outcomeDescription:
        "Risky and expensive — but you're the hero if it works.",
      baseSuccess: 45,
      scalingTags: ["tech", "navigation"],
      effects: [
        { type: "modifyCash", value: -8000 },
        { type: "modifyReputation", value: 6 },
      ],
    },
  ],
};

const wormholeDetected: SpaceHazardEventTemplate = {
  id: "wormhole_detected",
  name: "Wormhole Detected",
  description:
    "Survey ships near {target} have logged a stable wormhole opening into a distant system. The shortcut won't last forever.",
  category: "hazard",
  duration: 3,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 4,
  tier: 1,
  effects: [{ type: "modifyCash", value: 0 }], // economic gain encoded in choices
  requiresChoice: true,
  choiceOptions: [
    {
      id: "exploit_wormhole",
      label: "Run high-margin cargo through the shortcut",
      outcomeDescription: "Big payday if you're fast enough.",
      baseSuccess: 60,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: 18000 }],
    },
    {
      id: "report_wormhole",
      label: "Report the wormhole to imperial astrocartography",
      outcomeDescription: "Earn imperial favor and a finder's fee.",
      baseSuccess: 75,
      scalingTags: ["rep"],
      effects: [
        { type: "modifyCash", value: 4000 },
        { type: "modifyReputation", value: 8 },
      ],
    },
    {
      id: "sell_coordinates",
      label: "Sell coordinates to the highest bidder",
      outcomeDescription: "Cash up, reputation down — someone always talks.",
      baseSuccess: 55,
      scalingTags: ["cash"],
      effects: [
        { type: "modifyCash", value: 12000 },
        { type: "modifyReputation", value: -5 },
      ],
    },
  ],
};

const radiationBurst: SpaceHazardEventTemplate = {
  id: "radiation_burst",
  name: "Radiation Burst",
  description:
    "A pulsar near {target} has triggered a hard-radiation cascade through nearby trade lanes.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 4,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifyFleetCondition", value: -15, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "shield_up",
      label: "Pay for hardened shielding upgrade",
      outcomeDescription: "Hull integrity preserved, wallet hurts.",
      baseSuccess: 75,
      scalingTags: ["cash", "tech"],
      effects: [{ type: "modifyCash", value: -7000 }],
    },
    {
      id: "push_through",
      label: "Push through with current shielding",
      outcomeDescription: "Faster delivery, but ships take a beating.",
      baseSuccess: 40,
      scalingTags: ["fleetCondition"],
      effects: [
        { type: "modifyFleetCondition", value: -25, targetId: "{target}" },
      ],
    },
    {
      id: "detour_radiation",
      label: "Long detour around the radiation",
      outcomeDescription: "Safe but slow — contracts may slip.",
      baseSuccess: 80,
      scalingTags: ["navigation"],
      effects: [{ type: "modifyCash", value: -2500 }],
    },
  ],
};

const gravitationalAnomaly: SpaceHazardEventTemplate = {
  id: "gravitational_anomaly",
  name: "Gravitational Anomaly",
  description:
    "A localized gravity well near {target} is bending light and slowing every ship that crosses it.",
  category: "hazard",
  duration: 2,
  weight: 4,
  headwindWeight: 3,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifySpeed", value: -20, targetId: "{target}" }],
};

const spatialRift: SpaceHazardEventTemplate = {
  id: "spatial_rift",
  name: "Spatial Rift",
  description:
    "Reality is buckling near {target}. A cargo freighter has already vanished into the rift.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 5,
  tailwindWeight: 0,
  tier: 1,
  effects: [{ type: "blockRoute", value: 1, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "salvage_rift",
      label: "Send a salvage team to recover the cargo",
      outcomeDescription: "Risky — but the cargo is worth a fortune.",
      baseSuccess: 40,
      scalingTags: ["fleetCondition", "tech"],
      effects: [
        { type: "modifyCash", value: 14000 },
        { type: "modifyFleetCondition", value: -10, targetId: "{target}" },
      ],
    },
    {
      id: "abandon_rift",
      label: "Write off the cargo and reroute traffic",
      outcomeDescription: "Take the loss, keep your ships intact.",
      baseSuccess: 90,
      scalingTags: ["navigation"],
      effects: [{ type: "modifyCash", value: -6000 }],
    },
    {
      id: "sell_rift_info",
      label: "Sell rift coordinates to a research consortium",
      outcomeDescription: "Modest cash, but academics will remember you.",
      baseSuccess: 70,
      scalingTags: ["rep"],
      effects: [
        { type: "modifyCash", value: 4500 },
        { type: "modifyReputation", value: 4 },
      ],
    },
  ],
};

const darkMatterSurge: SpaceHazardEventTemplate = {
  id: "dark_matter_surge",
  name: "Dark Matter Surge",
  description:
    "Dark-matter density in the {target} sector has spiked, ballooning fuel-burn rates galaxy-wide.",
  category: "hazard",
  duration: 3,
  weight: 3,
  headwindWeight: 4,
  tailwindWeight: 1,
  tier: 1,
  effects: [{ type: "modifyPrice", cargoType: "fuel", value: 30 }],
};

const ionTempest: SpaceHazardEventTemplate = {
  id: "ion_tempest",
  name: "Ion Tempest",
  description:
    "An ion tempest has knocked out long-range comms across {target}. Diplomacy and rival messaging silenced.",
  category: "hazard",
  duration: 2,
  weight: 2,
  headwindWeight: 3,
  tailwindWeight: 1,
  tier: 1,
  // Modeled as flavor-only effect at MVP; a future "suspendComms" effect could
  // formally cancel rival messages and diplomacy events for the duration.
  effects: [{ type: "modifyReputation", value: 0 }],
};

const stellarCollapseWarning: SpaceHazardEventTemplate = {
  id: "stellar_collapse_warning",
  name: "Stellar Collapse Warning",
  description:
    "The star at the heart of {target} is collapsing. Mass evacuation is underway and all in-system trade is suspended.",
  category: "hazard",
  duration: 3,
  weight: 1,
  headwindWeight: 8,
  tailwindWeight: 0,
  tier: 1,
  effects: [{ type: "blockSystem", value: 1, targetId: "{target}" }],
  requiresChoice: true,
  choiceOptions: [
    {
      id: "evacuate_assets",
      label: "Evacuate your in-system assets",
      outcomeDescription: "Take the financial hit but salvage your fleet.",
      baseSuccess: 75,
      scalingTags: ["fleetSize", "navigation"],
      effects: [{ type: "modifyCash", value: -8000 }],
    },
    {
      id: "stay_put",
      label: "Bet the star's collapse will be slower than projected",
      outcomeDescription:
        "If the prediction is wrong, big rewards. If right, big losses.",
      baseSuccess: 30,
      scalingTags: ["cash"],
      effects: [{ type: "modifyCash", value: 12000 }],
    },
    {
      id: "evac_profiteer",
      label: "Charter your ships as evacuation transport at premium rates",
      outcomeDescription: "Cash on hand goes up, public opinion goes down.",
      baseSuccess: 60,
      scalingTags: ["fleetSize"],
      effects: [
        { type: "modifyCash", value: 16000 },
        { type: "modifyReputation", value: -8 },
      ],
    },
  ],
};

// ===========================================================================
// Tier 2 — Flavor-only anomalies (7 events; no gameplay effects)
// ===========================================================================

const ghostSignal: SpaceHazardEventTemplate = {
  id: "ghost_signal",
  name: "Ghost Signal",
  description:
    "A repeating signal from {target} matches no known civilization. Linguists are flocking to study it.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const ancientProbeDetected: SpaceHazardEventTemplate = {
  id: "ancient_probe_detected",
  name: "Ancient Probe Detected",
  description:
    "Long-range scans pick up a pre-hyperlane probe drifting in the {target} void.",
  category: "hazard",
  duration: 1,
  weight: 2,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const temporalEcho: SpaceHazardEventTemplate = {
  id: "temporal_echo",
  name: "Temporal Echo",
  description:
    "Multiple crews near {target} report seeing themselves emerge from the same hyperlane minutes earlier.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const voidChoirPhenomenon: SpaceHazardEventTemplate = {
  id: "void_choir_phenomenon",
  name: "Void Choir Phenomenon",
  description:
    "Harmonic frequencies of unknown origin are emanating from deep space near {target}.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const massHallucinationReport: SpaceHazardEventTemplate = {
  id: "mass_hallucination_report",
  name: "Mass Hallucination Report",
  description:
    "Three independent crews from {target} report identical visions of an unknown world.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const unexplainedFormation: SpaceHazardEventTemplate = {
  id: "unexplained_formation",
  name: "Unexplained Formation",
  description:
    "An asteroid field near {target} has spontaneously aligned into a flawless geometric pattern.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

const firstContactSignal: SpaceHazardEventTemplate = {
  id: "first_contact_signal",
  name: "First Contact Signal",
  description:
    "A possible non-human transmission is being decoded near {target}. The xenobiology desks are losing their minds.",
  category: "hazard",
  duration: 1,
  weight: 1,
  headwindWeight: 1,
  tailwindWeight: 1,
  tier: 2,
  effects: [],
};

// ===========================================================================
// Exports
// ===========================================================================

export const TIER_1_HAZARDS: SpaceHazardEventTemplate[] = [
  hyperlaneInstability,
  wormholeDetected,
  radiationBurst,
  gravitationalAnomaly,
  spatialRift,
  darkMatterSurge,
  ionTempest,
  stellarCollapseWarning,
];

export const TIER_2_ANOMALIES: SpaceHazardEventTemplate[] = [
  ghostSignal,
  ancientProbeDetected,
  temporalEcho,
  voidChoirPhenomenon,
  massHallucinationReport,
  unexplainedFormation,
  firstContactSignal,
];

export const ALL_SPACE_HAZARDS: SpaceHazardEventTemplate[] = [
  ...TIER_1_HAZARDS,
  ...TIER_2_ANOMALIES,
];
```

- [ ] **Step 2: Re-export hazards from `EventDefinitions.ts`**

Open `src/game/events/EventDefinitions.ts`. At the bottom of the file, locate the array of all events (e.g. `EVENT_TEMPLATES` or similar). Add an import at the top:

```ts
import { ALL_SPACE_HAZARDS } from "./SpaceHazardEventDefinitions.ts";
```

Append the hazards to the all-events export. The implementer should match the existing export style — likely:

```ts
export const EVENT_TEMPLATES: EventTemplate[] = [
  // ...existing events...
  ...(ALL_SPACE_HAZARDS as unknown as EventTemplate[]),
];
```

(Use a type assertion if `SpaceHazardEventTemplate` is structurally compatible with `EventTemplate` but not nominally identical — the local interfaces have the same shape minus the `tier` field, which `EventTemplate` ignores.)

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/events/SpaceHazardEventDefinitions.ts src/game/events/EventDefinitions.ts
git commit -m "feat(events): add 15 space hazard events (8 effect, 7 flavor)

Tier 1 (effects): hyperlane_instability, wormhole_detected, radiation_burst,
gravitational_anomaly, spatial_rift, dark_matter_surge, ion_tempest,
stellar_collapse_warning. Tier 2 (flavor): ghost_signal, ancient_probe,
temporal_echo, void_choir, mass_hallucination, unexplained_formation,
first_contact. Stellaris/MOO2/Trek-inspired."
```

---

## Task 9: New event chains

**Files:**

- Modify: `src/game/events/EventChainDefinitions.ts`

- [ ] **Step 1: Append three new chain definitions**

Open `src/game/events/EventChainDefinitions.ts`. After the existing chains (the file ends with an array export), add these three chain definitions before the final export array. Use the same `EventChainDefinition` interface as existing chains.

```ts
// ---------------------------------------------------------------------------
// Chain 7: Anomaly Investigation (3 steps)
// Triggers: when a Tier 2 anomaly fires; 40% chance to seed
// ---------------------------------------------------------------------------

const anomalyInvestigationChain: EventChainDefinition = {
  chainId: "anomaly_investigation",
  name: "Anomaly Investigation",
  description:
    "A flavor anomaly escalates into a real consequence — discovery or disaster.",
  triggerCondition: (state) =>
    state.turn >= 4 &&
    state.activeEventChains.every(
      (c) => c.chainId !== "anomaly_investigation",
    ) &&
    // Trigger only when a tier-2 anomaly is in activeEvents
    state.activeEvents.some((e) =>
      [
        "ghost_signal",
        "ancient_probe_detected",
        "temporal_echo",
        "void_choir_phenomenon",
        "mass_hallucination_report",
        "unexplained_formation",
        "first_contact_signal",
      ].includes(e.id),
    ),
  steps: [
    {
      stepIndex: 0,
      delayTurns: 0,
      prompt:
        "Strange readings persist near a recent anomaly. Your survey teams want to deploy a probe.",
      options: [
        {
          id: "send_probe",
          label: "Send a deep-space probe",
          outcomeDescription:
            "Most expensive option — but you'll know what's out there.",
          baseSuccess: 60,
          scalingTags: ["cash", "tech"],
          effects: [{ type: "modifyCash", value: -6000 }],
        },
        {
          id: "sell_coordinates_anomaly",
          label: "Sell coordinates to a rival corporation",
          outcomeDescription: "Cash now, reputation later.",
          baseSuccess: 80,
          effects: [
            { type: "modifyCash", value: 4000 },
            { type: "modifyReputation", value: -3 },
          ],
        },
        {
          id: "ignore_anomaly",
          label: "Ignore it",
          outcomeDescription: "Free, but you may regret it.",
          baseSuccess: 90,
          effects: [],
        },
      ],
    },
    {
      stepIndex: 1,
      delayTurns: 2,
      prompt:
        "The probe returns with data. The readings are unprecedented — and ambiguous.",
      options: [
        {
          id: "investigate_further",
          label: "Charter a follow-up expedition",
          outcomeDescription: "Most likely to yield a discovery.",
          baseSuccess: 55,
          scalingTags: ["cash", "tech", "navigation"],
          effects: [{ type: "modifyCash", value: -10000 }],
        },
        {
          id: "publish_findings",
          label: "Publish the findings publicly",
          outcomeDescription: "Reputation boost; you lose exclusive claim.",
          baseSuccess: 75,
          effects: [{ type: "modifyReputation", value: 8 }],
        },
        {
          id: "stay_quiet",
          label: "Stay quiet and watch what happens",
          outcomeDescription:
            "No cost, no reward — but you'll be on the back foot if it escalates.",
          baseSuccess: 80,
          effects: [],
        },
      ],
    },
    {
      stepIndex: 2,
      delayTurns: 2,
      prompt:
        "The investigation reaches its conclusion. Either an ancient ruin is uncovered — or the anomaly has destabilized into a spatial rift.",
      options: [
        {
          id: "claim_discovery",
          label: "Claim the discovery (if positive outcome)",
          outcomeDescription:
            "Big reputation gain and potential research income.",
          baseSuccess: 70,
          effects: [
            { type: "modifyCash", value: 18000 },
            { type: "modifyReputation", value: 12 },
          ],
        },
        {
          id: "absorb_disaster",
          label: "Absorb the disaster (if negative outcome)",
          outcomeDescription: "Take the route damage and move on.",
          baseSuccess: 90,
          effects: [{ type: "modifyFleetCondition", value: -10 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 8: Galactic Music Tour (3 steps)
// Triggers: turn >= 6, a roster Musician with onTour: false exists
// ---------------------------------------------------------------------------

const galacticMusicTourChain: EventChainDefinition = {
  chainId: "galactic_music_tour",
  name: "Galactic Music Tour",
  description:
    "A roster musician launches a tour. Player can sponsor, ship cargo, or ignore.",
  triggerCondition: (state) =>
    state.turn >= 6 &&
    state.activeEventChains.every((c) => c.chainId !== "galactic_music_tour") &&
    state.universeRoster.musicians.some((m) => !m.onTour),
  steps: [
    {
      stepIndex: 0,
      delayTurns: 0,
      prompt:
        "{musician} is announcing a galactic tour. Promoters are courting freight companies for sponsorship.",
      options: [
        {
          id: "sponsor_tour",
          label: "Sponsor the tour",
          outcomeDescription: "Brand visibility across the galaxy.",
          baseSuccess: 65,
          scalingTags: ["cash", "rep"],
          effects: [
            { type: "modifyCash", value: -8000 },
            { type: "modifyReputation", value: 6 },
          ],
        },
        {
          id: "book_tour_cargo",
          label: "Book cargo contracts hauling tour equipment",
          outcomeDescription: "Steady revenue, no glamour.",
          baseSuccess: 75,
          scalingTags: ["fleetSize"],
          effects: [{ type: "modifyCash", value: 5000 }],
        },
        {
          id: "ignore_tour",
          label: "Ignore the tour",
          outcomeDescription: "A rival sponsors it instead.",
          baseSuccess: 95,
          effects: [{ type: "modifyReputation", value: -2 }],
        },
      ],
    },
    {
      stepIndex: 1,
      delayTurns: 2,
      prompt:
        "Concert night at {port}. {musician} pulls record crowds — but rumors of a contract dispute swirl.",
      options: [
        {
          id: "amplify_sponsorship",
          label: "Double down on sponsorship visibility",
          outcomeDescription: "More marketing spend, more brand lift.",
          baseSuccess: 55,
          scalingTags: ["cash"],
          effects: [
            { type: "modifyCash", value: -4000 },
            { type: "modifyReputation", value: 5 },
          ],
        },
        {
          id: "stay_low_key",
          label: "Stay low-key — let the tour speak for itself",
          outcomeDescription: "Modest gains either way.",
          baseSuccess: 80,
          effects: [{ type: "modifyReputation", value: 2 }],
        },
      ],
    },
    {
      stepIndex: 2,
      delayTurns: 1,
      prompt:
        "Aftermath: {musician} is now embroiled in {controversy}. Sponsors are caught in the spotlight.",
      options: [
        {
          id: "distance_from_scandal",
          label: "Quietly distance yourself from the artist",
          outcomeDescription:
            "Save your rep at the cost of being seen as a fair-weather backer.",
          baseSuccess: 70,
          scalingTags: ["rep"],
          effects: [{ type: "modifyReputation", value: -2 }],
        },
        {
          id: "defend_artist",
          label: "Publicly defend the artist",
          outcomeDescription: "Polarizing — could pay off, could backfire.",
          baseSuccess: 50,
          scalingTags: ["rep"],
          effects: [{ type: "modifyReputation", value: 8 }],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain 9: Military Buildup (4 steps)
// Triggers: turn >= 10, two empires have active diplomatic relations
// ---------------------------------------------------------------------------

const militaryBuildupChain: EventChainDefinition = {
  chainId: "military_buildup",
  name: "Military Buildup",
  description:
    "An arms race escalates between two empires; player can profit, mediate, or hedge.",
  triggerCondition: (state) =>
    state.turn >= 10 &&
    state.activeEventChains.every((c) => c.chainId !== "military_buildup") &&
    (state.galaxy?.empires?.length ?? 0) >= 2,
  steps: [
    {
      stepIndex: 0,
      delayTurns: 0,
      prompt:
        "Intelligence sources report unusual fleet movements between two empires. {rank} {officer} is mobilizing.",
      options: [
        {
          id: "report_to_empire",
          label: "Report the buildup to your home empire",
          outcomeDescription: "Earn favor with your home empire.",
          baseSuccess: 75,
          scalingTags: ["rep"],
          effects: [{ type: "modifyReputation", value: 5 }],
        },
        {
          id: "sell_intel_rival",
          label: "Sell the intel to the rival empire",
          outcomeDescription: "Cash gain, reputation loss if discovered.",
          baseSuccess: 50,
          scalingTags: ["cash"],
          effects: [
            { type: "modifyCash", value: 14000 },
            { type: "modifyReputation", value: -8 },
          ],
        },
        {
          id: "sit_on_intel",
          label: "Sit on the intel",
          outcomeDescription: "No risk, no reward.",
          baseSuccess: 95,
          effects: [],
        },
      ],
    },
    {
      stepIndex: 1,
      delayTurns: 3,
      prompt:
        "The arms race formalizes. Border tariffs spike and military contractors are hiring freight at premium rates.",
      options: [
        {
          id: "hedge_both",
          label: "Hedge — supply both empires through shells",
          outcomeDescription: "Modest gain, complex logistics.",
          baseSuccess: 50,
          scalingTags: ["fleetSize"],
          effects: [{ type: "modifyCash", value: 8000 }],
        },
        {
          id: "commit_one",
          label: "Commit fully to one side's supply chain",
          outcomeDescription: "Bigger gain if you pick the winner.",
          baseSuccess: 60,
          scalingTags: ["fleetSize", "rep"],
          effects: [
            { type: "modifyCash", value: 12000 },
            { type: "modifyReputation", value: 4 },
          ],
        },
        {
          id: "move_assets",
          label: "Quietly move assets out of the conflict zone",
          outcomeDescription: "Safe play; no profit from the war boom.",
          baseSuccess: 85,
          scalingTags: ["navigation"],
          effects: [{ type: "modifyCash", value: -3000 }],
        },
      ],
    },
    {
      stepIndex: 2,
      delayTurns: 2,
      prompt:
        "A border incident has occurred. {officer}'s status hangs in the balance. The galaxy holds its breath.",
      options: [
        {
          id: "offer_mediation",
          label: "Offer mediation services",
          outcomeDescription:
            "Big reputation upside if successful, embarrassment if not.",
          baseSuccess: 35,
          scalingTags: ["rep", "tech"],
          effects: [{ type: "modifyReputation", value: 12 }],
        },
        {
          id: "profiteer_conflict",
          label: "Profiteer from emergency demand",
          outcomeDescription: "Cash up, ethics down.",
          baseSuccess: 70,
          scalingTags: ["fleetSize"],
          effects: [
            { type: "modifyCash", value: 16000 },
            { type: "modifyReputation", value: -6 },
          ],
        },
        {
          id: "pull_routes",
          label: "Pull all cross-border routes preemptively",
          outcomeDescription: "Protect your fleet, lose contracts.",
          baseSuccess: 90,
          effects: [{ type: "modifyCash", value: -7000 }],
        },
      ],
    },
    {
      stepIndex: 3,
      delayTurns: 2,
      prompt:
        "The buildup resolves — either into open war or a tense armistice. The dust is settling.",
      options: [
        {
          id: "war_post_mortem",
          label: "Publicly back the survivor empire",
          outcomeDescription: "Long-term diplomatic capital.",
          baseSuccess: 65,
          effects: [{ type: "modifyReputation", value: 8 }],
        },
        {
          id: "armistice_business",
          label: "Quietly resume normal operations",
          outcomeDescription: "No flair, no fuss.",
          baseSuccess: 90,
          effects: [],
        },
      ],
    },
  ],
};
```

- [ ] **Step 2: Add the three chains to the all-chains export array**

Locate the existing `ALL_EVENT_CHAINS` (or equivalent) array at the bottom of the file. Append the three new chain references:

```ts
  anomalyInvestigationChain,
  galacticMusicTourChain,
  militaryBuildupChain,
```

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/events/EventChainDefinitions.ts
git commit -m "feat(chains): add 3 new event chains

anomaly_investigation: bridges Tier 2 flavor anomalies into Tier 1
consequences (discovery or spatial_rift). galactic_music_tour: roster
musician launches tour, player can sponsor/ship/ignore, ends with
controversy. military_buildup: 4-step arms race with mediate/profiteer/
hedge choices, resolving to war or armistice."
```

---

## Task 10: Dilemma expansion — Space Hazard + Military (9 dilemmas)

**Files:**

- Modify: `src/game/events/DilemmaDefinitions.ts`

- [ ] **Step 1: Read existing dilemma file structure**

Open `src/game/events/DilemmaDefinitions.ts`. Note the existing pattern: each dilemma is a `DilemmaTemplate` object with `id`, `category`, `imageKey`, `prompt`, `weight`, `headwindWeight`, `tailwindWeight`, and `options[]`. Each option has `id`, `label`, `outcomeDescription`, `baseSuccess`, `scalingTags`, and `effects`.

- [ ] **Step 2: Append 5 Space Hazard dilemmas**

Add these to the `DILEMMA_TEMPLATES` array (the array typically ends with a `]` at the bottom of the file):

```ts
  // ---------------------------------------------------------------------------
  // Space Hazard dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "navigate_spatial_rift",
    category: "operational",
    imageKey: "dilemma_spatial_rift",
    prompt: "A spatial rift is destabilizing the {port} corridor. Your captain wants instructions before sunrise.",
    weight: 4, headwindWeight: 4, tailwindWeight: 1,
    options: [
      { id: "push_through_rift", label: "Push through with reinforced shielding", outcomeDescription: "Fast and risky.", baseSuccess: 45,
        scalingTags: ["fleetCondition", "tech"],
        effects: [{ type: "modifyCash", value: -3500 }, { type: "modifyFleetCondition", value: -8 }] },
      { id: "hull_reinforce_rift", label: "Hull-reinforce before crossing", outcomeDescription: "Slower but safer.", baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -7000 }] },
      { id: "abandon_rift_route", label: "Abandon the route entirely", outcomeDescription: "Lose contracts, save lives.", baseSuccess: 90,
        scalingTags: ["navigation"],
        effects: [{ type: "modifyCash", value: -5000 }, { type: "modifyReputation", value: 2 }] },
    ],
  },
  {
    id: "wormhole_exploitation",
    category: "opportunity",
    imageKey: "dilemma_wormhole",
    prompt: "A wormhole has opened near {port} — but it's collapsing within days. Big risk, big margin.",
    weight: 3, headwindWeight: 1, tailwindWeight: 4,
    options: [
      { id: "use_wormhole", label: "Run cargo through before it collapses", outcomeDescription: "Hit the window for a payday.", baseSuccess: 55,
        scalingTags: ["fleetSize", "navigation"],
        effects: [{ type: "modifyCash", value: 14000 }] },
      { id: "sell_wormhole_access", label: "Sell access rights to a rival", outcomeDescription: "Less profit, less risk.", baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 8000 }, { type: "modifyReputation", value: -3 }] },
      { id: "report_wormhole_imp", label: "Report it to imperial astrocartography", outcomeDescription: "Earn imperial favor and a finder's fee.", baseSuccess: 75,
        scalingTags: ["rep"],
        effects: [{ type: "modifyCash", value: 3000 }, { type: "modifyReputation", value: 7 }] },
    ],
  },
  {
    id: "radiation_shelter",
    category: "operational",
    imageKey: "dilemma_radiation",
    prompt: "A radiation burst is sweeping {port}. Captain {ceo} requests guidance for the in-flight fleet.",
    weight: 4, headwindWeight: 3, tailwindWeight: 1,
    options: [
      { id: "ground_radiation", label: "Ground all in-system ships", outcomeDescription: "No casualties, missed deliveries.", baseSuccess: 90,
        scalingTags: ["navigation"],
        effects: [{ type: "modifyCash", value: -6000 }] },
      { id: "push_radiation", label: "Push through with current shielding", outcomeDescription: "Faster but ships take damage.", baseSuccess: 40,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyFleetCondition", value: -15 }] },
      { id: "hire_shielded_escort", label: "Hire shielded escorts", outcomeDescription: "Expensive but safe.", baseSuccess: 75,
        scalingTags: ["cash", "tech"],
        effects: [{ type: "modifyCash", value: -9000 }] },
    ],
  },
  {
    id: "dark_matter_futures",
    category: "financial",
    imageKey: "dilemma_dark_matter",
    prompt: "Your analyst caught wind of an imminent dark-matter surge — fuel will spike. The data isn't public yet.",
    weight: 3, headwindWeight: 1, tailwindWeight: 4,
    options: [
      { id: "buy_fuel_futures", label: "Buy fuel futures heavily", outcomeDescription: "If your tip is right, big payday.", baseSuccess: 60,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 11000 }] },
      { id: "wait_dark_matter", label: "Wait for public data", outcomeDescription: "No insider risk, no insider profit.", baseSuccess: 95,
        effects: [] },
      { id: "warn_others_dm", label: "Warn other shippers (and your home empire)", outcomeDescription: "You become the trustworthy one.", baseSuccess: 80,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }] },
    ],
  },
  {
    id: "stellar_evacuation_profiteer",
    category: "opportunity",
    imageKey: "dilemma_stellar_collapse",
    prompt: "{port} is being evacuated as its star collapses. Refugees will pay anything for transport off-world.",
    weight: 2, headwindWeight: 1, tailwindWeight: 5,
    options: [
      { id: "price_gouge_refugees", label: "Charge premium evacuation rates", outcomeDescription: "Massive cash, ugly press.", baseSuccess: 70,
        scalingTags: ["fleetSize", "cash"],
        effects: [{ type: "modifyCash", value: 22000 }, { type: "modifyReputation", value: -12 }] },
      { id: "free_transport_refugees", label: "Provide free transport", outcomeDescription: "Goodwill that lasts a generation.", baseSuccess: 85,
        scalingTags: ["fleetSize"],
        effects: [{ type: "modifyCash", value: -10000 }, { type: "modifyReputation", value: 18 }] },
      { id: "ignore_evacuation", label: "Stay clear of the chaos", outcomeDescription: "Neither hero nor villain.", baseSuccess: 95,
        effects: [] },
    ],
  },
```

- [ ] **Step 3: Append 4 Military dilemmas**

Add these immediately after the Space Hazard block:

```ts
  // ---------------------------------------------------------------------------
  // Military dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "arms_dealer_contact",
    category: "diplomatic",
    imageKey: "dilemma_arms_dealer",
    prompt: "An off-the-books arms dealer wants to use your fleet to ship to {empire}. Their tech is bleeding-edge and illegal.",
    weight: 3, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "buy_illegal_tech", label: "Buy the tech for your fleet", outcomeDescription: "Capability gain, reputation risk.", baseSuccess: 50,
        scalingTags: ["cash", "tech"],
        effects: [{ type: "modifyCash", value: -10000 }, { type: "modifyReputation", value: -4 }] },
      { id: "report_arms_dealer", label: "Report the dealer to imperial authorities", outcomeDescription: "Empire favor, dangerous enemies.", baseSuccess: 65,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 10 }] },
      { id: "double_agent_arms", label: "Run them as a double agent", outcomeDescription: "Highest risk, highest reward.", baseSuccess: 35,
        scalingTags: ["tech", "rep"],
        effects: [{ type: "modifyCash", value: 9000 }, { type: "modifyReputation", value: 4 }] },
    ],
  },
  {
    id: "defecting_officer",
    category: "narrative",
    imageKey: "dilemma_defector",
    prompt: "{rank} {officer} of {empire} wants to defect — and they want your fleet to extract them.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "shelter_defector", label: "Shelter the defector quietly", outcomeDescription: "Diplomatic risk; long-term ally.", baseSuccess: 50,
        scalingTags: ["fleetCondition", "rep"],
        effects: [{ type: "modifyReputation", value: 6 }] },
      { id: "sell_defector_back", label: "Sell them back to {empire}", outcomeDescription: "Cash and empire favor; betrayal taste in mouth.", baseSuccess: 70,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 12000 }, { type: "modifyReputation", value: -7 }] },
      { id: "exploit_defector_intel", label: "Take the intel, leave them stranded", outcomeDescription: "Tech edge; dishonor.", baseSuccess: 60,
        scalingTags: ["tech"],
        effects: [{ type: "modifyReputation", value: -10 }] },
    ],
  },
  {
    id: "border_patrol_bribe",
    category: "operational",
    imageKey: "dilemma_border_bribe",
    prompt: "A {empire} border patrol officer is hinting that a small payment will skip the inspection of your fleet.",
    weight: 5, headwindWeight: 5, tailwindWeight: 1,
    options: [
      { id: "pay_border_bribe", label: "Pay the bribe", outcomeDescription: "Faster, dirtier.", baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -2500 }, { type: "modifyReputation", value: -2 }] },
      { id: "refuse_bribe", label: "Refuse and accept the inspection delay", outcomeDescription: "Clean conscience, slow ship.", baseSuccess: 85,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyCash", value: -1500 }] },
      { id: "report_corrupt_patrol", label: "Report the corrupt officer", outcomeDescription: "Big rep gain; certain officials remember you.", baseSuccess: 60,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 6 }] },
    ],
  },
  {
    id: "mercenary_contract",
    category: "diplomatic",
    imageKey: "dilemma_mercenary",
    prompt: "A contested route through {sector} needs armed escorts. A mercenary outfit is offering competitive rates.",
    weight: 4, headwindWeight: 4, tailwindWeight: 2,
    options: [
      { id: "hire_mercenaries", label: "Hire the mercenaries", outcomeDescription: "Cargo arrives safely, but you're now linked to them.", baseSuccess: 75,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -6000 }] },
      { id: "no_protection", label: "Run the route without protection", outcomeDescription: "Cheap and dangerous.", baseSuccess: 35,
        scalingTags: ["fleetCondition"],
        effects: [{ type: "modifyFleetCondition", value: -12 }] },
      { id: "cede_route", label: "Cede the route to a rival", outcomeDescription: "Lose contracts, lose face.", baseSuccess: 90,
        effects: [{ type: "modifyCash", value: -3500 }, { type: "modifyReputation", value: -3 }] },
    ],
  },
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/events/DilemmaDefinitions.ts
git commit -m "feat(dilemmas): add 9 space hazard + military dilemmas

Space hazard (5): navigate_spatial_rift, wormhole_exploitation,
radiation_shelter, dark_matter_futures, stellar_evacuation_profiteer.
Military (4): arms_dealer_contact, defecting_officer,
border_patrol_bribe, mercenary_contract."
```

---

## Task 11: Dilemma expansion — Anomaly/Discovery + Music + Propaganda (10 dilemmas)

**Files:**

- Modify: `src/game/events/DilemmaDefinitions.ts`

- [ ] **Step 1: Append 4 Anomaly/Discovery dilemmas**

Add to `DILEMMA_TEMPLATES`:

```ts
  // ---------------------------------------------------------------------------
  // Anomaly / Discovery dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "ancient_ruins_rights",
    category: "opportunity",
    imageKey: "dilemma_ancient_ruins",
    prompt: "An anomaly investigation has uncovered ancient ruins on {planet}. Excavation rights are about to go up for auction.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "claim_excavation", label: "Buy excavation rights outright", outcomeDescription: "Expensive, high upside.", baseSuccess: 50,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -15000 }, { type: "modifyReputation", value: 8 }] },
      { id: "partner_empire_dig", label: "Partner with {empire}", outcomeDescription: "Shared spoils, shared credit.", baseSuccess: 70,
        scalingTags: ["rep"],
        effects: [{ type: "modifyCash", value: -6000 }, { type: "modifyReputation", value: 5 }] },
      { id: "tip_off_rivals", label: "Tip off rivals to start a bidding war", outcomeDescription: "Watch the chaos from the sidelines.", baseSuccess: 60,
        effects: [{ type: "modifyCash", value: 4000 }] },
    ],
  },
  {
    id: "alien_contact_protocol",
    category: "diplomatic",
    imageKey: "dilemma_first_contact",
    prompt: "A first-contact signal has been confirmed near {sector}. Imperial protocol demands immediate handoff — but your CEO sees other angles.",
    weight: 1, headwindWeight: 1, tailwindWeight: 2,
    options: [
      { id: "follow_protocol", label: "Follow first-contact protocol exactly", outcomeDescription: "Big rep gain, no economic upside.", baseSuccess: 80,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 14 }] },
      { id: "private_trade_contact", label: "Establish private trade relations", outcomeDescription: "Lucrative, illegal, fragile.", baseSuccess: 35,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 18000 }, { type: "modifyReputation", value: -8 }] },
      { id: "handoff_with_terms", label: "Hand off to empire with finder's terms", outcomeDescription: "Modest cash, modest rep.", baseSuccess: 75,
        scalingTags: ["rep"],
        effects: [{ type: "modifyCash", value: 6000 }, { type: "modifyReputation", value: 6 }] },
    ],
  },
  {
    id: "recovered_artifact_sale",
    category: "opportunity",
    imageKey: "dilemma_artifact",
    prompt: "Your salvage team recovered a sealed artifact. Three buyers are offering very different deals.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "auction_artifact", label: "Auction it to the highest bidder", outcomeDescription: "Maximum cash, no goodwill.", baseSuccess: 75,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 13000 }] },
      { id: "donate_to_museum", label: "Donate it to a public museum", outcomeDescription: "Goodwill across the empire.", baseSuccess: 90,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 12 }] },
      { id: "keep_for_research", label: "Keep it for your R&D division", outcomeDescription: "Tech upside; collectors are upset.", baseSuccess: 65,
        scalingTags: ["tech"],
        effects: [{ type: "modifyCash", value: -2000 }, { type: "modifyReputation", value: -2 }] },
    ],
  },
  {
    id: "xenobiologist_hostage",
    category: "narrative",
    imageKey: "dilemma_xeno_hostage",
    prompt: "A xenobiologist working on {planet} has been taken hostage by a militia. They want a ransom — or your fleet.",
    weight: 1, headwindWeight: 2, tailwindWeight: 2,
    options: [
      { id: "pay_ransom_xeno", label: "Pay the ransom", outcomeDescription: "Quick resolution, set a precedent.", baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -8000 }, { type: "modifyReputation", value: 4 }] },
      { id: "rescue_with_fleet", label: "Mount a rescue with your fleet", outcomeDescription: "Heroic, dangerous.", baseSuccess: 40,
        scalingTags: ["fleetSize", "fleetCondition"],
        effects: [{ type: "modifyFleetCondition", value: -10 }, { type: "modifyReputation", value: 12 }] },
      { id: "negotiate_via_empire", label: "Push the empire to negotiate on your behalf", outcomeDescription: "Slow but politically clean.", baseSuccess: 65,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 6 }] },
    ],
  },
```

- [ ] **Step 2: Append 3 Music/Culture dilemmas**

```ts
  // ---------------------------------------------------------------------------
  // Music / Culture dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "tour_sponsorship",
    category: "opportunity",
    imageKey: "dilemma_tour",
    prompt: "{musician} is launching a galactic tour and looking for sponsorship. Your name on the marquee or stay anonymous?",
    weight: 3, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "sponsor_tour_dilemma", label: "Sponsor the tour visibly", outcomeDescription: "Brand lift across the galaxy.", baseSuccess: 65,
        scalingTags: ["cash", "rep"],
        effects: [{ type: "modifyCash", value: -7000 }, { type: "modifyReputation", value: 8 }] },
      { id: "quiet_sponsor", label: "Sponsor anonymously", outcomeDescription: "Influence without exposure.", baseSuccess: 80,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: -4500 }, { type: "modifyReputation", value: 2 }] },
      { id: "decline_tour", label: "Decline — fund your own marketing instead", outcomeDescription: "Predictable, uncreative.", baseSuccess: 90,
        effects: [] },
    ],
  },
  {
    id: "banned_album",
    category: "narrative",
    imageKey: "dilemma_banned_album",
    prompt: "{musician} just dropped {album}; {empire} has banned it. Black market demand is exploding.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "smuggle_album", label: "Smuggle the album through your freight network", outcomeDescription: "Big margins, big legal risk.", baseSuccess: 45,
        scalingTags: ["cash"],
        effects: [{ type: "modifyCash", value: 12000 }, { type: "modifyReputation", value: -5 }] },
      { id: "publicly_decry_ban", label: "Publicly decry the ban", outcomeDescription: "Cultural credibility.", baseSuccess: 70,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 6 }] },
      { id: "stay_neutral_album", label: "Stay neutral", outcomeDescription: "No risk, no upside.", baseSuccess: 95,
        effects: [] },
    ],
  },
  {
    id: "musician_defection",
    category: "diplomatic",
    imageKey: "dilemma_musician_defect",
    prompt: "{musician} is trying to defect from {empire}'s state-controlled label. They've asked for safe passage on your fleet.",
    weight: 1, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "help_defect_musician", label: "Help them defect", outcomeDescription: "Cultural hero, diplomatic enemy.", baseSuccess: 50,
        scalingTags: ["rep", "navigation"],
        effects: [{ type: "modifyReputation", value: 10 }] },
      { id: "report_defection", label: "Report the request to {empire}", outcomeDescription: "Empire favor, artist hates you forever.", baseSuccess: 80,
        effects: [{ type: "modifyReputation", value: 4 }] },
      { id: "stall_decision", label: "Stall and let the situation resolve itself", outcomeDescription: "Cowardly but safe.", baseSuccess: 90,
        effects: [{ type: "modifyReputation", value: -2 }] },
    ],
  },
```

- [ ] **Step 3: Append 3 Propaganda dilemmas**

```ts
  // ---------------------------------------------------------------------------
  // Propaganda dilemmas
  // ---------------------------------------------------------------------------
  {
    id: "state_media_plant",
    category: "diplomatic",
    imageKey: "dilemma_state_media",
    prompt: "{empire} state media offers a glowing profile of your company — in exchange for tariff concessions on a sensitive route.",
    weight: 3, headwindWeight: 2, tailwindWeight: 3,
    options: [
      { id: "accept_plant", label: "Accept the deal", outcomeDescription: "Free press; rep with rivals takes a hit.", baseSuccess: 75,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 4 }] },
      { id: "decline_plant", label: "Decline politely", outcomeDescription: "Independent press credibility.", baseSuccess: 85,
        effects: [{ type: "modifyReputation", value: 2 }] },
      { id: "leak_offer", label: "Leak the offer to a rival outlet", outcomeDescription: "Massive scandal for {empire}; you become a target.", baseSuccess: 50,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }] },
    ],
  },
  {
    id: "counter_narrative_leak",
    category: "narrative",
    imageKey: "dilemma_counter_leak",
    prompt: "An investigative journalist has shown you embarrassing data about {empire}'s freight subsidies. Publishing it would weaken them.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "leak_to_journalist", label: "Help the journalist publish", outcomeDescription: "{empire} weakened; expect retaliation.", baseSuccess: 55,
        scalingTags: ["rep"],
        effects: [{ type: "modifyReputation", value: 8 }] },
      { id: "sit_on_data", label: "Sit on the data", outcomeDescription: "Save it for later leverage.", baseSuccess: 90,
        effects: [] },
      { id: "warn_empire", label: "Warn {empire} the leak is coming", outcomeDescription: "Empire favor; journalist disappears.", baseSuccess: 70,
        effects: [{ type: "modifyReputation", value: -3 }] },
    ],
  },
  {
    id: "journalist_protection",
    category: "narrative",
    imageKey: "dilemma_journalist",
    prompt: "An investigative journalist on the run from {empire} is asking for safe passage on your fleet. Their next story will rattle three empires.",
    weight: 2, headwindWeight: 1, tailwindWeight: 3,
    options: [
      { id: "shelter_journalist", label: "Shelter them", outcomeDescription: "Independent press hero; one empire furious.", baseSuccess: 55,
        scalingTags: ["rep", "navigation"],
        effects: [{ type: "modifyReputation", value: 9 }] },
      { id: "deny_journalist", label: "Decline involvement", outcomeDescription: "Stay neutral, lose moral high ground.", baseSuccess: 90,
        effects: [{ type: "modifyReputation", value: -2 }] },
      { id: "sell_journalist_out", label: "Hand them over to {empire}", outcomeDescription: "Empire favor; lasting infamy.", baseSuccess: 80,
        effects: [{ type: "modifyReputation", value: -10 }] },
    ],
  },
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/events/DilemmaDefinitions.ts
git commit -m "feat(dilemmas): add 10 anomaly/music/propaganda dilemmas

Anomaly/Discovery (4): ancient_ruins_rights, alien_contact_protocol,
recovered_artifact_sale, xenobiologist_hostage. Music (3):
tour_sponsorship, banned_album, musician_defection. Propaganda (3):
state_media_plant, counter_narrative_leak, journalist_protection.
Brings dilemma total from 13 to 32."
```

---

## Task 12: Content — anomaly + music + discovery templates with story bodies (~75 templates)

**Files:**

- Modify: `src/generation/news/flavorTemplates.ts`

This task adds 25 templates per new category, each with 1-2 story body variants. Categories' story depth: `anomaly` = long, `music` = medium, `discovery` = long. Use the **roster tokens** added in Task 6 for music templates.

**Token vocabulary available:** `{empire}`, `{empire2}`, `{ceo}`, `{ceo2}`, `{percent}`, `{commodity}`, `{n}`, `{n2}`, `{port}`, `{sector}`, `{planet}`, `{stock}`, `{company}`, `{tonnage}`, `{credits}`, `{adj}`, `{system}`, plus new roster tokens: `{team}`, `{team2}`, `{musician}`, `{album}`, `{genre}`, `{celeb}`, `{pundit}`, `{crime_figure}`, `{officer}`, `{rank}`, `{last_result}`, `{controversy}`.

- [ ] **Step 1: Add 25 anomaly templates with long story bodies**

Open `src/generation/news/flavorTemplates.ts`. Locate the existing `homage` block and **after it**, add a new block:

```ts
// ---------------------------------------------------------------------------
// ANOMALY (25 templates) — Stellaris/MOO2/Trek-style spatial phenomena
// ---------------------------------------------------------------------------
const anomalyTemplates: FlavorTemplate[] = [
  {
    category: "anomaly",
    template:
      "Unexplained gravitational lensing reported near {sector}; civilian traffic advised to detour",
    story: [
      "Survey crews near {sector} are reporting impossible gravitational lensing — stars in the wrong positions, light bending in directions that don't add up. Imperial astronomers caution against speculation but admit the data is, in their words, 'profoundly weird.' Civilian traffic has been advised to take the long route until the phenomenon resolves or someone, anyone, can explain it.",
    ],
  },
  {
    category: "anomaly",
    template:
      "Class-{n} subspace harmonic detected in {system}; researchers describe it as 'humming'",
    story: [
      "A class-{n} subspace harmonic has been detected resonating through {system}. Researchers stress they have no working theory for what the harmonic represents — only that it is steady, persistent, and described by one xenoacoustic specialist as 'humming, almost on purpose.' Empire research stations have been given priority access to the phenomenon and the public is being asked, politely, not to come closer.",
    ],
  },
  // ... 23 more anomaly templates ...
];
```

**Implementer guidance — write 25 anomaly entries.** Style: Star Trek "we found something we can't explain" energy. Mix dread, awe, and gentle humor. Story bodies are 4-6 sentences (long depth). Always reference {sector}, {system}, or {planet} for spatial grounding. Include at least 5 entries that reference {pundit} reactions or {company} R&D divisions for cross-roster flavor.

Sample additional templates to write:

- "Probe loses contact with researchers near {planet} — debate continues over whether it returned"
- "Anomalous time dilation in {sector} delays mail by {n} cycles, and also by {n} seconds, simultaneously"
- "Strange reflective surface forms over {planet}'s pole; visible from neighboring systems"
- "{company} R&D pulls all assets from {sector} after 'unexplained sensor readings'"
- "Pulsar near {system} skips a beat; first time in recorded history"
- "Xenobiologists request quarantine of {planet} pending 'shape-shifting biome' study"
- "Survey records show {sector} appears to be {percent}% larger than last cycle"
- "Communication beacon in {sector} reports it does not exist; investigation paused"
- "A second moon detected over {planet}; locals confirm there had been only one"
- "{rank} {officer} cancels {empire} fleet exercise after 'incompatible reality readings'"
- "Pre-recorded star map of {sector} no longer matches observable star map"
- "Unidentified signal source in {sector} appears to read all incoming hails before they arrive"
- "Voidcap researchers withdraw paper claiming {planet} 'has feelings'"
- "Sentient fog reported drifting through {port} bazaar; cleanup pending"
- "{empire} astronomy guild splits over whether {system} has eight planets or nine"
- "Hyperlane network reports a new lane in {sector} with no known endpoints"
- "Three colony ships in {sector} report seeing themselves arriving an hour earlier"
- "Newly catalogued nebula in {sector} resembles a face; authorities urge calm"
- "Xenobiology survey: thirty percent of {planet}'s flora 'should not be possible'"
- "Astrolab freighter reports unexplained {percent}% mass gain over a single cycle"
- "Asteroid belt around {planet} arranged into perfect spiral; cause unknown"
- "{empire} research vessel returns from {sector} with logs corrupted into poetry"
- "Time on {port} station reportedly running {percent}% faster than reference"

Each template needs at least one `story[]` entry with 4-6 sentences. Vary tone — clinical, awed, dryly humorous. Reference roster tokens occasionally (`{pundit}` for political angles, `{company}` R&D, `{officer}` for military reactions).

- [ ] **Step 2: Add 25 music templates with medium story bodies**

Add after the anomaly block:

```ts
// ---------------------------------------------------------------------------
// MUSIC (25 templates) — galactic artists, concerts, genre wars
// ---------------------------------------------------------------------------
const musicTemplates: FlavorTemplate[] = [
  {
    category: "music",
    template: "{musician} announces galactic tour kicking off at {port}",
    story: [
      "{musician} is taking {album} on the road. The tour opens at {port} next cycle and is expected to draw record crowds across {n} stops. Industry analysts are calling it the biggest {genre} tour of the decade.",
    ],
  },
  {
    category: "music",
    template:
      "{album} debuts at #1 on the galactic chart; {genre} fans rejoice",
    story: [
      "{musician}'s {album} has shattered first-week records, holding the top slot on every major streaming network. Critics are split — some calling it 'the future of {genre}' and others 'a competent disappointment' — but the numbers don't lie. {pundit} weighed in: 'This is what culture looks like when it's still alive.'",
    ],
  },
  // ... 23 more music templates ...
];
```

**Implementer guidance — write 25 music entries.** Style: galactic music magazine meets late-night talk show. Reference `{musician}`, `{album}`, `{genre}` heavily. Include scandal/controversy angles using `{controversy}`. Stories are 3-4 sentences (medium depth).

Sample additional templates to write:

- "{musician} cancels {port} show citing 'creative differences with the gravity'"
- "{musician} feuds publicly with rival; {genre} forums in chaos"
- "{empire} cultural ministry bans {album} for 'subversive frequencies'"
- "Underground {genre} club at {port} hits capacity for {n} cycles running"
- "Holovid biopic of {musician} announced; rumored {credits} budget"
- "{musician} embroiled in {controversy}; tour sales somehow up"
- "{genre} festival on {planet} draws {n2} attendees, sets new attendance record"
- "Critic compares {album} to the void; {musician} thanks them"
- "Anonymous bidder pays {credits} for original {album} master tapes"
- "{musician} drops surprise diss track; {genre} community in flames"
- "Lawsuit filed: rival claims {musician} stole {album}'s opening hook"
- "{musician} awarded {empire}'s highest cultural honor; refuses to attend"
- "Orchestra at {port} performs {album} arranged for two thousand instruments"
- "{musician}'s livestream concert on {planet} gets {n2}M concurrent viewers"
- "{genre} purists picket {musician}'s collaboration with {empire} state composers"
- "Bootleg recording of {musician}'s {port} soundcheck sells out in {n} hours"
- "{musician} marries fellow artist; tabloid bidding war erupts"
- "Streaming royalties scandal: {company} exec accused of skimming {percent}% from {genre} artists"
- "{album} certified platinum on three planets simultaneously"
- "Underground {genre} scene at {port} celebrates {n}-cycle anniversary"
- "{musician}'s remix of {empire} anthem sparks diplomatic incident"
- "Holovid talk show ambushes {musician} with footage of old performance"
- "Music critic {pundit} declares {genre} 'officially over' for the third time this decade"

- [ ] **Step 3: Add 25 discovery templates with long story bodies**

Add after the music block:

```ts
// ---------------------------------------------------------------------------
// DISCOVERY (25 templates) — exploration finds, archaeology, new species
// ---------------------------------------------------------------------------
const discoveryTemplates: FlavorTemplate[] = [
  {
    category: "discovery",
    template:
      "Pre-empire ruins uncovered on {planet}; {empire} academia in uproar",
    story: [
      "Excavation teams on {planet} have uncovered structures predating any known empire — possibly by tens of thousands of cycles. Carbon-equivalent dating has been disputed, but every independent lab has confirmed the same anomalous result. {pundit} called it 'the find of the century, again.' {empire}'s academia council has scheduled emergency sessions, while three rival empires have already filed claims to study the site.",
    ],
  },
  // ... 24 more discovery templates ...
];
```

**Implementer guidance — write 25 discovery entries.** Style: National Geographic crossed with sci-fi archaeology. Reference {planet}, {sector}, {empire} academia. Stories are 4-6 sentences (long depth). Include reactions from `{pundit}` and `{company}` R&D divisions.

Sample additional templates:

- "New sentient species catalogued on {planet}; debates begin over rights extension"
- "Prospector on {planet} stumbles into vein of {commodity} {percent}% above galactic average"
- "Unmapped system found behind {sector} dust cloud; {empire} claims first survey rights"
- "Archaeology team on {planet} unearths object that 'shouldn't exist for another century'"
- "Bioluminescent lifeforms catalogued in {planet}'s deep oceans; tourism interest spiking"
- "Lost colony confirmed alive in {sector}; rescue mission departing from {port}"
- "Cargo retrieved from derelict in {sector} contains data older than empire records"
- "First-contact protocol initiated with {planet}'s indigenous broadcast culture"
- "Unknown alloy recovered from {sector} debris; {company} R&D submits bids"
- "Ancient star map etched on {planet}'s northern continent matches modern hyperlanes"
- "Temple complex on {planet} reveals knowledge of orbital mechanics predating local civilization"
- "Linguist on {planet} decodes {percent}% of substrate dialect; {pundit} calls it 'urgent'"
- "Survey crew finds operational generator buried under {planet}'s ice cap"
- "Floating crystal city catalogued in {sector}; origins unknown"
- "Probe returns with footage of self-replicating geometry near {sector}"
- "Microbial life confirmed in {planet}'s upper atmosphere; quarantine protocols updated"
- "Recovered logs from {sector} shipwreck rewrite empire founding narrative"
- "Xenobiologist team on {planet} discovers symbiosis chain spanning seven species"
- "Genuine pre-translation artifacts surface at {port} black market"
- "Astronomers at {empire} institute identify possible megastructure in {sector}"
- "Teleportation pad found inside {planet} ruins; only outputs in unknown direction"
- "Plant species on {planet} appears to perform mathematical calculations through growth patterns"
- "Survey identifies {n2} previously unmapped objects in {sector}"
- "{empire} expedition recovers fully intact ship from pre-hyperlane era"

- [ ] **Step 4: Register the new template arrays**

Locate `ALL_FLAVOR_TEMPLATES` (or whatever the file's all-export array is called). Add the three new arrays:

```ts
export const ALL_FLAVOR_TEMPLATES: FlavorTemplate[] = [
  // ...existing 20 categories...
  ...anomalyTemplates,
  ...musicTemplates,
  ...discoveryTemplates,
];
```

If the file uses `getTemplatesForCategory` switch logic, add the three new cases mapping the category to its array.

- [ ] **Step 5: Run check + smoke test**

Run: `npm run check`
Expected: PASS

Run: `npm run dev` and open the game. After ~3 turns, you should see anomaly/music/discovery items appear in the ticker. Click one → confirm story body renders in NewscasterScene typewriter.

- [ ] **Step 6: Commit**

```bash
git add src/generation/news/flavorTemplates.ts
git commit -m "feat(news): add 75 flavor templates for anomaly/music/discovery

25 templates per new category, each with 1-2 story body variants.
Anomaly stories are long-depth (Star Trek-style 4-6 sentence
phenomena reports). Music templates use roster tokens ({musician},
{album}, {genre}) for living-world character continuity. Discovery
stories are long-depth archaeology/first-contact narratives."
```

---

## Task 13: Content — gossip + military + propaganda templates with story bodies (~75 templates)

**Files:**

- Modify: `src/generation/news/flavorTemplates.ts`

Categories' story depth: `gossip` = short, `military` = medium, `propaganda` = medium.

- [ ] **Step 1: Add 25 gossip templates with short story bodies**

```ts
// ---------------------------------------------------------------------------
// GOSSIP (25 templates) — universe drama, feuds, rumors
// ---------------------------------------------------------------------------
const gossipTemplates: FlavorTemplate[] = [
  {
    category: "gossip",
    template:
      "{celeb} spotted having dinner with {celeb}'s ex; PR teams scrambling",
    story: [
      "{celeb} was photographed at a restaurant on {port} with someone they shouldn't have been having dinner with. The PR statements are already drafting themselves.",
    ],
  },
  // ... 24 more gossip templates ...
];
```

**Style:** TMZ-meets-Variety. 2-sentence stories (short depth). Heavy use of `{celeb}`, `{musician}`, light name-dropping of `{ceo}`. Tabloid voice.

Sample additional templates:

- "{celeb} feuds with {celeb} over project credit; insiders predict 'long winter'"
- "{musician} and {celeb} dating? Source close to neither says yes"
- "{ceo}'s third divorce paperwork leaked; lawyers cite 'voidlight differences'"
- "{celeb} unfollowed by entire {empire} entertainment district overnight"
- "{musician}'s rumored side project with {celeb} confirmed by accidental holovid post"
- "{celeb}'s yacht spotted at {port}; {n2} guests, zero permits"
- "Mysterious patron pays off {celeb}'s gambling debts; rumors swirl"
- "{musician} and {musician}'s feud reignites after one-line interview answer"
- "{celeb} caught wearing rival {empire}'s designer to {empire} state dinner"
- "{ceo}'s personal chef walks out mid-banquet citing {commodity} disagreement"
- "{celeb}'s 'just friends' yacht tour now in its {n}th cycle"
- "Galactic gossip column claims {celeb} secretly funded {musician}'s comeback"
- "{celeb} blocks fan account that correctly predicted their next move"
- "Anonymous source: {celeb} 'never recovered' from being snubbed by {empire} council"
- "{musician}'s assistant fired after sharing tour rider with tabloid"
- "{celeb} arrives at {port} party two hours late; party leaves an hour earlier"
- "{ceo} caught with rival {company}'s heir at {port} restaurant"
- "{celeb} refuses to share an elevator with {celeb}; building staff comply"
- "{musician}'s 'private' performance for {empire} ambassador goes viral"
- "Holovid star {celeb} reportedly demanded all crew speak in haiku on set"
- "{celeb} buys an entire wing of {port} hotel just to avoid {celeb}"
- "{musician} dating rumor sparked by single shared sandwich; sandwich was excellent"
- "{celeb}'s fashion line panned by every reviewer; sells out in {n} hours"
- "{empire}'s official biographer admits draft was 'mostly just gossip column clippings'"

- [ ] **Step 2: Add 25 military templates with medium story bodies**

```ts
// ---------------------------------------------------------------------------
// MILITARY (25 templates) — fleet movements, defections, arms deals
// ---------------------------------------------------------------------------
const militaryTemplates: FlavorTemplate[] = [
  {
    category: "military",
    template:
      "{rank} {officer} of {empire} promoted to command of {sector} fleet",
    story: [
      "{rank} {officer} has been confirmed as the new commander of {empire}'s {sector} fleet. The promotion comes as tensions in the sector escalate. Defense analysts are calling it 'the right hand for the wrong moment.'",
    ],
  },
  // ... 24 more military templates ...
];
```

**Style:** Defense desk reporting — cool, factual, occasional cynical aside. Reference `{rank}`, `{officer}`, `{empire}`. Stories 3-4 sentences (medium depth).

Sample additional templates:

- "{empire} announces {percent}% increase in fleet budget; rivals 'reviewing options'"
- "Defection: {rank} {officer} reportedly seeking asylum in {empire2}"
- "Joint fleet exercise in {sector} 'unrelated' to recent border incidents, says {empire} spokesperson"
- "Arms convoy intercepted near {planet}; {empire} denies ownership three different times"
- "New stealth corvette unveiled by {empire}; {pundit} calls it 'mostly press release'"
- "{rank} {officer} testifies before {empire} council; transcript reveals {percent}% redactions"
- "Mercenary group operating in {sector} now formally banned by three empires"
- "{empire} retires {rank} {officer} after {n2} cycles of service; statue planned at {port}"
- "Border patrol incident leaves {n} cargo ships impounded; {empire} apologizes diplomatically"
- "Naval intelligence leaks suggest {empire} testing FTL torpedoes in {sector}"
- "{rank} {officer} disgraced after audit reveals {credits} unaccounted"
- "Disarmament summit in {port} ends without agreement; {pundit} unsurprised"
- "Patrol fleet in {sector} accidentally encounters second patrol fleet; embarrassment ensues"
- "Military contractor in {empire} wins {credits} contract over {percent}% lower bid"
- "Black-site facility on {planet} confirmed by satellite imagery; {empire} declines comment"
- "{rank} {officer} retires to {port} estate; rumors of return persist"
- "Border treaty between {empire} and {empire2} renewed for {n2} cycles"
- "Veterans on {planet} march for unpaid hazard wages dating back {n} cycles"
- "{empire} navy unveils new flagship; {pundit} dryly notes price equals {empire}'s healthcare budget"
- "Cyberwarfare unit at {empire} academy graduates first cohort; commencement classified"
- "Decommissioned battleship sold for scrap to {company}; reactor rumored intact"
- "{rank} {officer}'s memoir banned in {empire}, becomes instant bestseller in {empire2}"
- "Joint patrol agreement signed for {sector}; routes finally safe from pirates, say officials"
- "{empire} denies satellite imagery showing fleet buildup near {planet}; satellite agrees to differ"

- [ ] **Step 3: Add 25 propaganda templates with medium story bodies**

```ts
// ---------------------------------------------------------------------------
// PROPAGANDA (25 templates) — state spin, disinformation, counter-narratives
// ---------------------------------------------------------------------------
const propagandaTemplates: FlavorTemplate[] = [
  {
    category: "propaganda",
    template:
      "{empire} state media reports {percent}% citizen approval of leadership; rival outlets dispute methodology",
    story: [
      "The official {empire} broadcast network has announced that {percent}% of citizens approve of current leadership — a figure {pundit} described as 'mathematically suspicious.' Independent surveys in {sector} show numbers between {n} and {n2} percent. The state response cited 'foreign-funded methodological bias.'",
    ],
  },
  // ... 24 more propaganda templates ...
];
```

**Style:** Knowing, dry. The Archivist is a steel-grey state-voice character. Stories 3-4 sentences (medium depth). Use `{empire}`, `{pundit}` heavily.

Sample additional templates:

- "{empire} ministry of truth issues clarification on yesterday's clarification"
- "State news on {empire} celebrates {n2}-cycle peace; same broadcast lists three active conflicts"
- "{empire} 'spontaneous citizens' rally' attracts identical signs and bottled water"
- "Counter-narrative leaked: {empire} freight subsidies {percent}% higher than reported"
- "{pundit} ridicules {empire} state media for using stock footage of victories"
- "{empire} bans documentary 'mostly for legal reasons,' cites {n} unrelated paragraphs"
- "Education ministry in {empire} updates textbooks for {n}th time this cycle"
- "Journalist on {planet} disappears after publishing freight corruption exposé"
- "{empire} announces 'historic' agricultural surplus; rival empire notes harvest hasn't happened yet"
- "State holovid on {empire} hits {n2}M views; foreign analysts note {percent}% are bots"
- "{empire} state radio jamming detected across {sector}; cause: 'technical maintenance'"
- "Ministry on {empire} renames national holiday for the {n}th time in a decade"
- "{empire} cultural attache pens op-ed in {empire2} paper; pundits trace authorship to AI"
- "Censored book in {empire} smuggled in via {port}; sells for {credits} per copy"
- "{empire} broadcast network airs same heroic profile of {rank} {officer} for {n} cycles running"
- "State translator's note: enemy speeches in {empire} have new word inserted in every translation"
- "Disinformation campaign linked to {empire} traced through {n} relay points"
- "{empire} state news reports drought; satellite imagery shows record rainfall"
- "Whistleblower on {planet} exposes {company} bribes to {empire} broadcast officials"
- "Ministry of education in {empire} bans inquiry into {sector} historical events"
- "Counter-propaganda lab founded at {empire2} university; first publication banned everywhere"
- "Sealed records release in {empire} reveals {n2}-cycle cover-up; nobody surprised"
- "Pirate radio on {planet} mocks {empire} state broadcast verbatim; ratings beat the original"
- "{empire} demands {empire2} retract documentary; {empire2} broadcasts it again instead"

- [ ] **Step 4: Register new arrays in `ALL_FLAVOR_TEMPLATES`**

Add to the export array:

```ts
  ...gossipTemplates,
  ...militaryTemplates,
  ...propagandaTemplates,
```

Update `getTemplatesForCategory` if needed.

- [ ] **Step 5: Run check + browser smoke test**

Run: `npm run check`
Expected: PASS

Run: `npm run dev` and verify gossip/military/propaganda items appear in the ticker. Click each → story body renders.

- [ ] **Step 6: Commit**

```bash
git add src/generation/news/flavorTemplates.ts
git commit -m "feat(news): add 75 flavor templates for gossip/military/propaganda

Gossip: 25 short-depth tabloid templates with {celeb} drama and feuds.
Military: 25 medium-depth defense desk templates ({rank}, {officer},
{empire}). Propaganda: 25 medium-depth state-spin templates with
counter-narrative angles via {pundit}."
```

---

## Task 14: Content — story bodies for existing 20 flavor categories

**Files:**

- Modify: `src/generation/news/flavorTemplates.ts`

This task adds `story[]` arrays to all existing flavor templates that don't yet have one. For each of the 20 existing categories (politics, corporate, market_mover, crime, science, sports, celebrity, cosmic_weather, local, health, religion, blotter, food, realestate, travel, fashion, academia, xenobiology, obituary, homage), add a story body to every template.

**Implementer note:** This is repetitive but high-leverage content work. Each existing template already has a one-line headline. Add a `story` array (1-2 variants) using the appropriate depth for the category (per `CATEGORY_STORY_DEPTH` map):

- short: `blotter`, `obituary`, `food`, `fashion` → 2 sentences
- medium: `sports`, `celebrity`, `crime`, `politics`, `corporate`, `local`, `health`, `religion`, `realestate`, `travel`, `academia`, `market_mover`, `homage` → 3-4 sentences
- long: `science`, `cosmic_weather`, `xenobiology` → 4-6 sentences

- [ ] **Step 1: Add story bodies to sports templates**

Locate the `sports` block in `flavorTemplates.ts`. For each existing template, add a `story` field. Example:

```ts
{
  category: "sports",
  template: "{empire} routs {empire2} 18-3 in zero-G ball semifinal",
  story: [
    "It was a blowout from the opening bell. {empire}'s zero-G ball team dismantled {empire2} 18-3 in front of a sold-out arena on {port}. Coach {ceo} credited 'dominant defensive geometry' and a single rookie playing their first professional cycle.",
    "{empire2} fans had little to celebrate as {empire} executed a near-flawless gravity-shift offense. {pundit} called it 'a generational performance,' though local broadcasters were less generous.",
  ],
},
```

**Use the existing template list — every template gets at least one story variant.** Reference roster tokens (`{team}`, `{musician}`, `{celeb}`, `{officer}`) opportunistically where they fit the category. For sports specifically, prefer `{team}` over `{empire}` where possible (rewrite headlines to use `{team}` if it fits — but only when it improves the story).

- [ ] **Step 2: Add story bodies to celebrity templates**

Same pattern. Use `{celeb}`, `{musician}` where natural.

- [ ] **Step 3: Add story bodies to crime templates**

Use `{crime_figure}` where it fits.

- [ ] **Step 4: Add story bodies to politics templates**

Use `{pundit}` for political reactions.

- [ ] **Step 5: Add story bodies to corporate, market_mover templates**

Use `{ceo}`, `{company}`, financial-news voice.

- [ ] **Step 6: Add story bodies to science, cosmic_weather, xenobiology templates (long depth, 4-6 sentences)**

These are the deepest stories. Take the time to make them feel substantial. Reference researchers, observatories, peer review, etc.

- [ ] **Step 7: Add story bodies to local, health, religion, realestate, travel, academia (medium depth)**

Standard medium-depth treatment.

- [ ] **Step 8: Add story bodies to blotter, food, fashion, obituary (short depth, 2 sentences)**

Tight, punchy, quirky for blotter/food/fashion. Reverent and specific for obituary.

- [ ] **Step 9: Add story bodies to homage templates**

Sci-fi inside-joke energy. Stories should expand the homage with affectionate detail.

- [ ] **Step 10: Run check + browser smoke test**

Run: `npm run check`
Expected: PASS

Run: `npm run dev`. Click 5 different ticker items across categories. All should show story bodies (not just headlines).

- [ ] **Step 11: Commit**

```bash
git add src/generation/news/flavorTemplates.ts
git commit -m "feat(news): add story bodies to all 20 existing flavor categories

Every existing flavor template now has at least one story[] variant
at category-appropriate depth (short/medium/long). Sports, celebrity,
crime, politics, gossip stories opportunistically reference roster
tokens for character continuity. Sci-fi homage stories expand the
inside jokes with affectionate detail."
```

---

## Task 15: Portrait generation script update

**Files:**

- Modify: `scripts/generate-newscaster-portraits.py`
- Optionally: Add a static silhouette PNG for `The Archivist` to `assets-source/portraits/newscaster/`

- [ ] **Step 1: Read existing script structure**

Open `scripts/generate-newscaster-portraits.py`. Understand the existing pattern — likely a list of newscaster definitions with name, prompt, output path. The implementer should follow that pattern exactly.

- [ ] **Step 2: Add 6 new newscaster portrait entries**

Add entries for the 6 new newscasters using the existing pattern. Suggested prompts:

- **Zix Anomura** (anomaly): "alien xenobiologist field reporter, glowing teal eyes, deep-space science divination aesthetic, cybernetic monocle, pixel-art portrait"
- **Lyra Cass** (music): "vibrant alien music critic, holographic earrings, magenta fur trim, stylish pixel-art portrait"
- **Dr. Venn Orix** (discovery): "weathered explorer-academic alien, dust-coated coat, telescope strap, weathered eyes, pixel-art portrait"
- **Sable Drenn** (gossip): "glamorous alien socialite gossip columnist, amber lipstick, dramatic eye-shadow, voidlight earrings, pixel-art portrait"
- **Cmdr. Harke Voss** (military): "stern alien military officer with neural-link scar, bloodred eye, formal uniform, pixel-art portrait"
- **The Archivist** (propaganda): "silhouette only, no visible face, steel-grey shroud, abstract lighting, pixel-art portrait"

Output paths follow the existing pattern: `assets-source/portraits/newscaster/{slug}.png`.

- [ ] **Step 3: Run the optimize-assets pipeline (manual; only if generating real portraits)**

If the implementer is actually generating portraits:

```bash
# Run the script (requires whatever toolchain it uses — check CLAUDE.md asset pipeline)
python scripts/generate-newscaster-portraits.py

# Then optimize:
npm run optimize-assets
```

Both source PNGs (in `assets-source/`) and optimized output (`public/portraits/newscaster/`) should be committed.

**If portrait generation requires API keys / external services not available to the implementer:** Skip Step 3 and just commit the script changes. The portraits can be generated in a follow-up. NewscasterScene already has placeholder fallback handling for missing portrait keys.

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-newscaster-portraits.py
# If portraits were generated: also add public/portraits/newscaster/*.{webp,png} and assets-source/portraits/newscaster/*.png
git commit -m "feat(portraits): add generation entries for 6 new newscasters

Adds Zix Anomura, Lyra Cass, Dr. Venn Orix, Sable Drenn,
Cmdr. Harke Voss, and The Archivist (silhouette-only) to the
newscaster portrait pipeline."
```

---

## Final verification

After all tasks are complete, run a final regression sweep:

- [ ] **Final check:** `npm run check` — must PASS
- [ ] **Browser smoke test:** start a fresh game, play 10 turns, click ticker items across all categories. Verify:
  - Sports standings change between turns
  - At least one space hazard event fires
  - At least one of the 3 new event chains seeds (anomaly_investigation most likely)
  - All 19 new newscasters can be triggered by clicking the right category
  - Story bodies render in NewscasterScene
- [ ] **PR screenshots:** Per CLAUDE.md, capture screenshots of the NewscasterScene with each new category and at least one Tier 1 hazard event firing. Save to `docs/pr-screenshots/pr-<NUMBER>/`.

---

## Self-review notes

(Run after writing this plan, before handoff.)

**Spec coverage:** Section-by-section.

- Spec §1 (Universe Roster) → Tasks 1-3
- Spec §2 (New Ticker Categories) → Tasks 4-5
- Spec §3 (Story Body Architecture) → Tasks 4, 6, 7
- Spec §4 (Space Hazard Events) → Task 8
- Spec §5 (New Event Chains) → Task 9
- Spec §6 (Dilemma Expansion) → Tasks 10-11
- Spec §7 (Content Volume) → Tasks 12-14
- Spec §8 (File Manifest) → Covered across tasks
- Spec §10 (Success Criteria) → Final verification block

**Type consistency:** `UniverseRoster`, `RosterHistoryEntry`, `MusicGenre`, `OptionScalingTag` extension, `EventChainId` extension, `EventEffect` extension, `TickerCategory` extension, `StoryDepth`, `CATEGORY_STORY_DEPTH` map — all introduced in Task 1 / 4, referenced consistently downstream.

**Known limitation flagged in Task 6:** Headline + story tokens resolve in independent `substituteTickerTokens` calls. Shared bindings across template+story is a follow-up polish item — does not affect functional correctness for this plan's scope.

**Portrait generation in Task 15:** May require external API access. Plan has explicit fallback path if generation toolchain isn't available; placeholder portrait fallback already exists in NewscasterScene.
