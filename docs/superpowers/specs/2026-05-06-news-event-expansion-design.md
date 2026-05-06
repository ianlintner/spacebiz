# News & Event Expansion — Design Spec

_Star Freight Tycoon · 2026-05-06_

## Goal

Transform the GNN ticker and event system from a one-liner headline feed into a living, characterful universe. Players should feel like they're tuned into a real galactic news network — with memorable recurring personalities, ongoing sports seasons, celebrity feuds, political spin, space anomalies that escalate into real consequences, and enough variety that no two playthroughs feel the same.

---

## Approach: Living World Architecture (Approach B)

The foundational change is a `UniverseRoster` — a seeded, persistent set of ~27 named entities (sports teams, musicians, celebrities, pundits, criminals, military officers) saved to `GameStore`. These entities have state that ticks each turn, giving every flavor template access to real history rather than random name rolls. Story bodies are added to `FlavorTemplate` at contextual depth by category. Six new ticker categories (with six new newscasters) expand the breadth. Fifteen new space hazard events (split effects-bearing and flavor-only) add Stellaris/MOO2-style phenomena. Nineteen new dilemmas and three new event chains round out the depth.

---

## 1. Universe Roster System

### 1.1 Data Model

New types added to `src/data/types.ts`:

```ts
interface UniverseRoster {
  sportsTeams: SportsTeam[]; // 8 teams across 2 leagues
  musicians: Musician[]; // 6 artists/bands
  celebrities: Celebrity[]; // 6 holovid/gossip figures
  pundits: Pundit[]; // 4 political commentators
  crimeFigures: CrimeFigure[]; // 3 recurring criminals/syndicates
  militaryOfficers: MilitaryOfficer[]; // 4 fleet commanders
}

interface SportsTeam {
  id: string;
  name: string; // e.g. "Vortex Nomads"
  homePort: string; // bound to a real port from galaxy state at seed time
  league: "Core" | "Rim"; // two leagues for standings
  wins: number;
  losses: number;
  streak: number; // positive = win streak, negative = loss streak
  lastResult?: string; // "defeated the Cygnus Comets 7-3"
  championship: boolean; // won this season
}

interface Musician {
  id: string;
  name: string; // e.g. "Drix Vael"
  genre: MusicGenre; // "void-jazz" | "hyperpop" | "drone-folk" | "synthpulse" | "death-ambient" | "celestial-pop"
  currentAlbum?: string;
  onTour: boolean;
  tourPort?: string; // bound port when on tour
  controversyActive: boolean;
  controversyDesc?: string; // short description of active controversy
}

interface Celebrity {
  id: string;
  name: string;
  role: string; // "holovid star" | "socialite" | "reality host" | "chef" | "influencer"
  currentFeud?: string; // id of another celebrity they're feuding with
  latestProject?: string; // current show/film/venture name
  scandalActive: boolean;
}

interface Pundit {
  id: string;
  name: string;
  affiliation: string; // empire name they're associated with
  slant: "pro-empire" | "skeptic" | "contrarian" | "sensationalist";
  recentQuote?: string;
}

interface CrimeFigure {
  id: string;
  name: string; // e.g. "The Pale Meridian" (syndicate) or "Vrek Sonn" (individual)
  type: "syndicate" | "pirate_lord" | "smuggler";
  active: boolean; // false if arrested/defeated this playthrough
  lastSighting?: string; // port name
}

interface MilitaryOfficer {
  id: string;
  name: string;
  rank: string; // "Admiral" | "Commodore" | "Fleet Captain"
  empire: string;
  status: "active" | "disgraced" | "retired" | "missing";
  currentCommand?: string; // fleet/vessel name
}

type MusicGenre =
  | "void-jazz"
  | "hyperpop"
  | "drone-folk"
  | "synthpulse"
  | "death-ambient"
  | "celestial-pop";

interface RosterHistoryEntry {
  turn: number;
  entityId: string;
  event: string; // human-readable summary for use in story templates
}
```

### 1.2 New GameStore Fields

```ts
universeRoster: UniverseRoster;       // seeded once at game start, persisted in save
rosterHistory: RosterHistoryEntry[];  // last 10 notable outcomes for story callbacks
```

### 1.3 Seeding

`src/generation/news/universeRoster.ts` — new file.

- `seedUniverseRoster(rng: SeededRNG, galaxyState: GalaxyState): UniverseRoster`
  - Names drawn from themed name pools (alien-sci-fi registers per archetype)
  - `homePort` for sports teams bound to real ports from `galaxyState`
  - `tourPort` for musicians on tour bound to real ports
  - All randomness through `SeededRNG` — deterministic per save seed

### 1.4 Tick Function

`rosterTick(roster: UniverseRoster, rng: SeededRNG, turn: number): RosterHistoryEntry[]`

Called once per turn during simulation. Updates:

- Sports standings: each team plays a simulated match (weighted by streak), updates `wins`, `losses`, `streak`, `lastResult`
- Musicians: `onTour` flag flips on/off per tour arc; `controversyActive` has a small chance to fire/resolve each turn
- Celebrities: feuds form/resolve; `scandalActive` fires occasionally
- Crime figures: small chance of arrest (`active = false`), reactivation after 3 turns
- Military officers: status changes driven by `military_buildup` event chain state

Returns an array of `RosterHistoryEntry` for that turn — appended to `rosterHistory` (capped at 10 entries).

### 1.5 Token Integration

`flavorTemplates.ts` gains new tokens:

| Token            | Resolves to                                           |
| ---------------- | ----------------------------------------------------- |
| `{team}`         | Random active `SportsTeam.name`                       |
| `{team2}`        | Different active `SportsTeam.name`                    |
| `{musician}`     | Random `Musician.name`                                |
| `{album}`        | Random `Musician.currentAlbum` (or generated if null) |
| `{genre}`        | Random `MusicGenre`                                   |
| `{celeb}`        | Random `Celebrity.name`                               |
| `{pundit}`       | Random `Pundit.name`                                  |
| `{crime_figure}` | Random active `CrimeFigure.name`                      |
| `{officer}`      | Random `MilitaryOfficer.name`                         |
| `{rank}`         | Random `MilitaryOfficer.rank`                         |

Story bodies may also use `{last_result}` (resolves to the `lastResult` of whichever team was bound to `{team}` in the same template substitution pass) and `{controversy}` (resolves to `Musician.controversyDesc` of whichever musician was bound to `{musician}`).

---

## 2. New Ticker Categories

### 2.1 Six New TickerCategory Values

Added to the `TickerCategory` union in `src/generation/news/types.ts`:

```ts
| "anomaly"      // spatial phenomena, strange readings, unexplained events
| "music"        // galactic artists, concerts, album releases, genre wars
| "discovery"    // exploration finds, archaeological digs, first contacts
| "gossip"       // universe drama, feuds, rumors, roster cross-story callbacks
| "military"     // fleet movements, border patrols, arms deals, defections
| "propaganda"   // empire spin, state media, disinformation, counter-narratives
```

### 2.2 New CategoryMeta Entries

| Category     | Badge | Label           | Tone    |
| ------------ | ----- | --------------- | ------- |
| `anomaly`    | ANM   | Anomaly Report  | warning |
| `music`      | MUS   | Music & Culture | textDim |
| `discovery`  | DSC   | Discovery       | accent  |
| `gossip`     | GSP   | Society         | textDim |
| `military`   | MIL   | Defense         | text    |
| `propaganda` | STA   | State Affairs   | textDim |

### 2.3 Six New Newscasters

Added to `src/generation/news/newscasters.ts`:

| Name             | Type         | Title                         | Channel              | Accent   |
| ---------------- | ------------ | ----------------------------- | -------------------- | -------- |
| Zix Anomura      | `anomaly`    | Phenomena Correspondent       | GNN Deep Scan        | 0x00ffcc |
| Lyra Cass        | `music`      | Culture & Sound Correspondent | GNN Pulse            | 0xff66aa |
| Dr. Venn Orix    | `discovery`  | Exploration Correspondent     | GNN Frontier Desk    | 0x88ff44 |
| Sable Drenn      | `gossip`     | Society Correspondent         | GNN Inner Circle     | 0xffaa00 |
| Cmdr. Harke Voss | `military`   | Defense Correspondent         | GNN Strategic Bureau | 0xcc2200 |
| The Archivist    | `propaganda` | State Affairs Analyst         | GNN Authority Desk   | 0x888888 |

`The Archivist` uses a silhouette-only portrait (no face) to signal official state voice.

Category routing additions to `NEWSCASTER_BY_CATEGORY`:

- `anomaly` → `anomaly` (Zix Anomura)
- `music` → `music` (Lyra Cass)
- `discovery` → `discovery` (Dr. Venn Orix)
- `gossip` → `gossip` (Sable Drenn)
- `military` → `military` (Cmdr. Harke Voss)
- `propaganda` → `propaganda` (The Archivist)

### 2.4 Portrait Generation

Six new entries in `scripts/generate-newscaster-portraits.py` — one per newscaster. The Archivist's portrait is a deliberate silhouette/shadow graphic (can be a static asset rather than generated).

---

## 3. Story Body Architecture

### 3.1 FlavorTemplate Changes

```ts
interface FlavorTemplate {
  category: TickerCategory;
  template: string; // headline — unchanged, still drives the ticker strip
  story?: string[]; // 1-3 story body variants; one picked at render time
  storyDepth?: StoryDepth; // overrides category default if set
  weight?: number; // unchanged
}

type StoryDepth = "short" | "medium" | "long";
```

`story[]` entries support all tokens available to `template`. One variant is picked at render time using the same `SeededRNG` pass that resolves tokens — deterministic per turn.

### 3.2 Default Depth by Category

| Depth    | Categories                                                                                                                                                    | Approx. sentence count |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `short`  | `blotter`, `obituary`, `food`, `fashion`, `gossip`                                                                                                            | 2 sentences            |
| `medium` | `sports`, `music`, `celebrity`, `crime`, `politics`, `corporate`, `propaganda`, `military`, `local`, `health`, `religion`, `realestate`, `travel`, `academia` | 3-4 sentences          |
| `long`   | `anomaly`, `discovery`, `science`, `cosmic_weather`, `xenobiology`                                                                                            | 4-6 sentences          |

Structural categories (`headline`, `leader`, `stock`) have no story body — the NewscasterScene falls back to the ticker text for these.

### 3.3 NewscasterScene Changes

- When `story[]` is present on the resolved `TickerItem`, the typewriter renders the story body instead of the headline text.
- When absent, falls back to `text` (current behavior — fully backward-compatible).
- A `[DEVELOPING]` badge renders in the header bar for `long`-depth items (right-aligned, uses the theme `warning` tone color, simple alpha-pulse tween).
- Story bodies are resolved through the same token-substitution pass as headlines, so `{team}`, `{musician}`, etc. bind correctly.

---

## 4. Space Hazard Events

New file: `src/game/events/SpaceHazardEventDefinitions.ts`

### 4.1 Tier 1 — Effects-Bearing Hazards (8 events)

All have `category: "hazard"` in the game event system. Several include player choice options.

| Event ID                   | Effect                                                                                 | Player Choice?                                        | Trope Source                |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------- |
| `hyperlane_instability`    | Blocks 1-2 routes for 2 turns                                                          | Yes — reroute, wait, or send repair crew              | Stellaris hyperspace storms |
| `wormhole_detected`        | Opens temporary shortcut between 2 distant ports for 3 turns                           | Yes — exploit it, report it, or sell coordinates      | MOO2 wormhole discovery     |
| `radiation_burst`          | Fleet condition -15% on affected routes                                                | Yes — shield up (cost), push through (risk), detour   | Star Trek radiation zones   |
| `gravitational_anomaly`    | All ships in sector -20% speed for 2 turns                                             | No — flavor-only effect                               | Stellaris gravity wells     |
| `spatial_rift`             | Destroys cargo on 1 route; offers salvage dilemma                                      | Yes — salvage, abandon, sell info                     | Star Trek spatial anomalies |
| `dark_matter_surge`        | Fuel costs +30% in affected sector for 3 turns                                         | No                                                    | Original                    |
| `ion_tempest`              | Disables rival messages and diplomacy events for 2 turns                               | No                                                    | Classic space opera         |
| `stellar_collapse_warning` | All routes through 1 system suspended for 3 turns; mass evacuation ticker stories fire | Yes — evacuate assets, stay put, profiteer from panic | Stellaris star collapse     |

Each Tier 1 event generates an `anomaly` ticker item when it fires, giving Zix Anomura content to report.

### 4.2 Tier 2 — Flavor-Only Anomalies (7 events)

No gameplay effects. Generate `anomaly` ticker stories with `long` story depth.

| Event ID                    | Concept                                              |
| --------------------------- | ---------------------------------------------------- |
| `ghost_signal`              | Repeating signal from dead civilization              |
| `ancient_probe_detected`    | Pre-hyperlane era probe drifting through sector      |
| `temporal_echo`             | Ships report seeing themselves from the future       |
| `void_choir_phenomenon`     | Unexplained harmonic frequencies from deep space     |
| `mass_hallucination_report` | Multiple crews report identical visions              |
| `unexplained_formation`     | Asteroid field spontaneously forms geometric pattern |
| `first_contact_signal`      | Possible non-human origin communication              |

Tier 2 events can seed the `anomaly_investigation` event chain (see Section 5).

### 4.3 New Scaling Tag

```ts
type OptionScalingTag =
  | "fleetCondition"
  | "fleetSize"
  | "tech"
  | "rep"
  | "cash"
  | "navigation";
```

`"navigation"` scales success% based on total active route count and any navigation-boosting tech the player has researched. Used by space hazard choice options.

---

## 5. New Event Chains

Three new entries added to `EventChainId` union and `EventChainDefinitions.ts`:

```ts
| "anomaly_investigation"
| "galactic_music_tour"
| "military_buildup"
```

### 5.1 `anomaly_investigation` (3 steps)

The flagship chain — bridges Tier 2 flavor anomaly into Tier 1 consequence.

- **Trigger:** Any Tier 2 anomaly event fires; 40% chance to seed the chain
- **Step 0 (flavor):** Zix Anomura reports the anomaly. Choice: send probe, sell coordinates to a rival, ignore.
- **Step 1 (escalation, +2 turns):** Probe data returns. Choice: investigate further (cost), publish findings (rep), stay quiet.
- **Step 2 (resolution, +2 turns):** Two outcomes — ancient ruin discovered (discovery reward + `discovery` ticker story + rep boost) OR anomaly destabilizes into a `spatial_rift` (Tier 1 effect, route damage, player warned).

Player choices at Step 0 and 1 gate the outcome: investing resources improves the chance of the discovery outcome; ignoring it makes the `spatial_rift` outcome more likely.

### 5.2 `galactic_music_tour` (3 steps)

- **Trigger:** Turn ≥ 6, a `Musician` with `onTour: false` exists in roster. When the chain fires, the selected musician's `onTour` is set to `true` immediately to prevent a second chain from triggering for the same artist.
- **Step 0:** Tour announced at a port near player's hub. Choice: sponsor the tour, book cargo contracts for equipment transport, ignore.
- **Step 1 (+2 turns):** Concert night. If sponsored: rep boost + `music` ticker story with player company name-dropped. If cargo: cash bonus. If ignored: rival sponsors it, rival gets rep boost.
- **Step 2 (+1 turn):** Aftermath. Chance of `controversyActive` flipping on the musician — `gossip` ticker stories fire. If player sponsored: choice to distance from scandal or defend the artist publicly.

### 5.3 `military_buildup` (4 steps)

- **Trigger:** Turn ≥ 10, two empires have active trade relationship
- **Step 0:** Intelligence leak — `military` ticker story reports unusual fleet movements. Choice: report to empire (rep), sell intel to rival empire (cash), sit on it.
- **Step 1 (+3 turns):** Arms race formalizes. Border tariffs increase. Choice: hedge with both empires, commit to one, quietly move assets.
- **Step 2 (+2 turns):** Border incident. `MilitaryOfficer` status changes. Choice: offer mediation (rep, risk), profiteer from conflict demand, pull all cross-border routes.
- **Step 3 (+2 turns):** Resolution — escalates to `war_declaration` (existing event) OR a tense armistice. `military` and `propaganda` ticker stories fire heavily during all steps.

---

## 6. Dilemma Expansion

`src/game/events/DilemmaDefinitions.ts` expands from 13 to 32 dilemmas (+19).

### New Dilemmas by Category

**Space Hazard (5):**

- `navigate_spatial_rift` — push through, hull-reinforce, or abandon route
- `wormhole_exploitation` — use before it collapses, sell access, or report to empire
- `radiation_shelter` — ground fleet, push through with casualties, or hire shielded escorts
- `dark_matter_futures` — buy fuel futures before surge is public knowledge, wait, or warn others
- `stellar_evacuation_profiteer` — price-gouge refugees, provide free transport, or ignore

**Military (4):**

- `arms_dealer_contact` — buy illegal tech, report contact, or use as double-agent
- `defecting_officer` — shelter the defector, sell them back, or exploit their intel
- `border_patrol_bribe` — pay to skip inspection, refuse and take the delay, or report the corrupt patrol
- `mercenary_contract` — hire mercs to guard a contested route, attempt without protection, or cede the route

**Anomaly / Discovery (4):**

- `ancient_ruins_rights` — claim excavation rights (expensive), partner with empire, or tip off a rival to cause a bidding war
- `alien_contact_protocol` — follow official first-contact protocol (rep), establish private trade contact (cash), or hand off to empire (rep + reward)
- `recovered_artifact_sale` — auction to highest bidder, donate to museum (rep), or keep for tech advantage
- `xenobiologist_hostage` — pay ransom, attempt rescue with fleet, or negotiate via empire channels

**Music / Culture (3):**

- `tour_sponsorship` — sponsor a musician's galactic tour for brand visibility vs. cost
- `banned_album` — distribute banned music through freight channels for cash vs. legal risk
- `musician_defection` — help a musician defect from a rival empire's state-controlled label (rep vs. diplomatic risk)

**Propaganda (3):**

- `state_media_plant` — allow an empire to plant a positive story about you in exchange for a trade perk (rep risk)
- `counter_narrative_leak` — leak embarrassing empire data to a journalist (rival empire weakened, own empire angered)
- `journalist_protection` — shelter an investigative journalist being pursued by an empire (rep boost, empire hostility)

All new dilemmas follow existing pattern: `baseSuccess`, 2-3 `scalingTags` from `["fleetCondition", "fleetSize", "tech", "rep", "cash", "navigation"]`, and `effects`.

---

## 7. Content Volume Summary

| Layer                        | Before | After    |
| ---------------------------- | ------ | -------- |
| Ticker categories            | 23     | **29**   |
| Newscasters                  | 13     | **19**   |
| Flavor templates (headlines) | ~492   | **~667** |
| Story bodies                 | 0      | **~400** |
| Game events                  | 36     | **51**   |
| Flavor-only anomaly events   | 0      | **7**    |
| Dilemmas                     | 13     | **32**   |
| Event chains                 | 6      | **9**    |
| Universe roster entities     | 0      | **~27**  |
| Token types                  | ~12    | **~22**  |

---

## 8. File Manifest

| File                                             | Change Type                                                                                                                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                              | Modify — add roster types, `"navigation"` scaling tag, new chain IDs                                                                                                                                  |
| `src/data/GameStore.ts`                          | Modify — add `universeRoster`, `rosterHistory` fields                                                                                                                                                 |
| `src/generation/news/types.ts`                   | Modify — add 6 `TickerCategory` values; add `story`, `storyDepth` to `FlavorTemplate`                                                                                                                 |
| `src/generation/news/categories.ts`              | Modify — add 6 `CategoryMeta` entries                                                                                                                                                                 |
| `src/generation/news/newscasters.ts`             | Modify — add 6 newscaster defs + routing entries                                                                                                                                                      |
| `src/generation/news/flavorTemplates.ts`         | Modify — +175 templates (6 new categories × ~25 each, +25 across existing categories) + story body strings added to ALL 29 flavor categories (20 existing + 6 new + 3 structural categories excluded) |
| `src/generation/news/universeRoster.ts`          | **New** — roster types, `seedUniverseRoster()`, `rosterTick()`                                                                                                                                        |
| `src/generation/news/tickerFeed.ts`              | Modify — pass roster state to template resolution                                                                                                                                                     |
| `src/game/events/SpaceHazardEventDefinitions.ts` | **New** — 8 effects-bearing + 7 flavor-only anomaly events                                                                                                                                            |
| `src/game/events/EventDefinitions.ts`            | Modify — import + re-export space hazard events                                                                                                                                                       |
| `src/game/events/DilemmaDefinitions.ts`          | Modify — +19 dilemmas                                                                                                                                                                                 |
| `src/game/events/EventChainDefinitions.ts`       | Modify — +3 chains                                                                                                                                                                                    |
| `src/scenes/NewscasterScene.ts`                  | Modify — render story body; `[DEVELOPING]` badge                                                                                                                                                      |
| `scripts/generate-newscaster-portraits.py`       | Modify — +6 portrait entries                                                                                                                                                                          |

---

## 9. Out of Scope

- Persistent celebrity relationship graphs (feuds tracked beyond a boolean flag)
- Cross-story callbacks within a single feed rotation (two items referencing the same incident)
- Full generative story composition from game state (Approach C)
- Newscaster voice/audio
- Player-triggered news stories (player actions generating custom headlines)

These can be revisited in a follow-up expansion.

---

## 10. Success Criteria

- NewscasterScene shows story body text (not just headline) for all flavor categories
- Roster characters appear by name in relevant category templates and story bodies
- Sports standings change measurably turn-over-turn; championship result generates a `sports` headline
- At least one Tier 1 space hazard event fires in a typical 15-turn game
- `anomaly_investigation` chain fires at least once per playthrough on average
- `npm run check` passes (typecheck + tests + build)
