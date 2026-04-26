# Galactic News Ticker

**Date:** 2026-04-26
**Status:** Implementing
**Scope:** Add a digital news ticker that summarizes each turn's galaxy events, dilemmas, leader rankings, stock movements, and flavor news. Primary placement is the post-simulation review (TurnReportScene), with a secondary marquee on the simulation playback screen.

## Goal

After a turn simulates, the player sees a rich, atmospheric "Galactic News Network" feed that mixes:

1. **Headlines** — real game events that fired this turn (storyteller events, dilemmas, AI narrative beats).
2. **Leader rankings** — top companies by cash / route count, with one-line color commentary.
3. **Galactic Market** — stock-ticker style price line for ~24 symbols (player + rivals + flavor brands).
4. **Flavor news** — 500+ templated headlines pulled from 20 categories so no one type dominates.

Tone: dry sci-fi with knowing genre homages (Douglas Adams, Asimov, Dune, Star Trek, Blade Runner). The reader-in-on-the-joke voice — never winks too hard.

## Twenty Flavor Categories

Each category has its own pool. The feed selects from at most ~3 categories per turn so the same theme doesn't dominate.

| # | Category | Tone | Example header |
|---|---|---|---|
| 1 | Galactic Politics | serious | "{empire} parliament adjourns over tariff vote" |
| 2 | Corporate Earnings | serious | "{company} posts {percent}% revenue growth Q{n}" |
| 3 | Market Movers | serious/numeric | "{stock} jumps {percent}% on contract win" |
| 4 | Crime & Piracy | serious | "Customs seize {tonnage} tonnes of contraband near {port}" |
| 5 | Science & Tech | serious sci-fi | "{empire} researchers claim FTL coil efficiency record" |
| 6 | Sports | light | "{empire} routs {empire2} 18-3 in zero-G ball semifinal" |
| 7 | Celebrity & Media | light | "Holovid star {ceo} denies third divorce in weekly statement" |
| 8 | Cosmic Weather | serious | "Class-3 ion storm forecast over {system} by Tuesday cycle" |
| 9 | Local Planet News | light | "{port} traffic council unveils new pedestrian sky-bridge" |
| 10 | Health & Medical | mixed | "Longevity treatments now available on {port} for {credits}" |
| 11 | Religion & Philosophy | mixed | "Cult of the Frozen Logician schisms over heat-death debate" |
| 12 | Odd Crime Blotter | dry humor | "{port} man arrested attempting to mail self to {planet}" |
| 13 | Food & Cuisine | light | "Three-star reviewer pans {port} restaurant: 'tastes of regret'" |
| 14 | Real Estate | mixed | "Megastructure permit issued for orbital ring above {planet}" |
| 15 | Travel & Tourism | light | "{planet} resort posts record {percent}% occupancy this cycle" |
| 16 | Fashion & Trends | light/satirical | "Anti-grav heels make comeback on {port} runway week" |
| 17 | Education & Academia | mixed | "{empire} University paper retracted over fabricated stardata" |
| 18 | Xenobiology | mixed | "Researchers describe new sentient mold on {planet}" |
| 19 | Obituaries & Tributes | serious | "Industrialist {ceo} eulogized as 'tireless and largely tolerable'" |
| 20 | Sci-Fi Homages | dry humor | "Towel sales up {percent}% on {planet} ahead of Galactic Hitchhiker's Day" |

## Data model

```ts
type TickerCategory =
  | "headline"          // real game event
  | "leader"            // ranking commentary
  | "stock"             // market mover line
  | "politics" | "corporate" | "market_mover" | "crime" | "science"
  | "sports" | "celebrity" | "cosmic_weather" | "local" | "health"
  | "religion" | "blotter" | "food" | "realestate" | "travel"
  | "fashion" | "academia" | "xenobiology" | "obituary" | "homage";

interface TickerItem {
  category: TickerCategory;
  text: string;          // already-substituted, ready to render
  priority: number;      // higher = pinned higher in panel
  color?: number;        // optional override (stock up green, down red)
}

interface FlavorTemplate {
  category: TickerCategory;
  template: string;      // contains {empire} {company} {ceo} {planet} {percent} ...
  weight?: number;       // default 1
}
```

## Token vocabulary

Extends the existing Storyteller `{empire}/{rival}/{port}` set:

| Token | Source |
|---|---|
| `{empire}`, `{empire2}` | random distinct empires |
| `{company}` | random AI company name |
| `{ceo}`, `{ceo2}` | random distinct CEO names |
| `{planet}`, `{planet2}` | random distinct planet names |
| `{port}` | alias for `{planet}` (matches Storyteller convention) |
| `{system}` | random star system |
| `{sector}` | random sector |
| `{stock}` | 4-letter stock symbol |
| `{percent}` | small/medium/large numeric % (sign chosen by template) |
| `{credits}` | "1.2M cr" / "340K cr" style amount |
| `{tonnage}` | "240 tonnes" / "1,800 tonnes" |
| `{n}` | small int 2..9 |
| `{n2}` | small int 10..99 |
| `{adj}` | curated sci-fi adjective ("rogue", "deuterium-soaked", "mostly-harmless") |
| `{commodity}` | curated cargo / luxury good |

`tokens.ts` runs a single regex pass with a fallback so unknown tokens render unchanged (prevents UI breakage if a template ships with a typo).

## File layout

```
docs/plans/2026-04-26-galactic-news-ticker.md   (this)
src/generation/news/
  types.ts                  TickerItem, TickerCategory, FlavorTemplate types
  categories.ts             metadata for each of the 20 categories (label, color, badge)
  tokens.ts                 token substitution + vocab pools
  flavorTemplates.ts        ~500 templates across 20 categories (sectioned)
  stockTicker.ts            generate symbols + per-turn price simulation
  tickerFeed.ts             compose per-turn TickerItem[] from events + stock + flavor
  __tests__/
    flavorTemplates.test.ts validates parses, no orphan tokens, category coverage
    tickerFeed.test.ts      determinism, balance, no-duplicate, category caps
    stockTicker.test.ts     symbol stability + price plausibility
src/ui/
  GalacticNewsPanel.ts      Phaser panel — vertical-scroll ticker with category badges
  __tests__/                (smoke; UI tested via integration only)
src/scenes/TurnReportScene.ts   replace News Digest panel with GalacticNewsPanel
```

No save format change — ticker output is derived per turn from `state.seed + state.turn` and `state.history[last]`.

## Feed composition rules

`tickerFeed.generateForTurn(state, turnResult, rng)` returns ~22 items:

1. **3-5 headlines** from `turnResult.eventsOccurred` and active narrative effects (priority 100 — top).
2. **3 leader lines** for top 3 AI companies + the player (priority 80).
3. **5 stock movers** sampled from the simulated stock list (priority 60, color = profit/loss).
4. **8-12 flavor lines** drawn from at most 4 random categories with a per-category cap of 3, weighted so heavy categories (Sci-Fi Homages, Odd Crime Blotter) appear roughly every other turn rather than every turn.

Determinism: a single SeededRNG seeded from `state.seed * 31 + state.turn` so re-running the same turn produces the same news (avoids unsettling text changes if the player navigates away and back).

## UI

`GalacticNewsPanel` extends Panel:

- Title bar: "GALACTIC NEWS NETWORK"
- Body: list of news lines, each rendered as `[CATEGORY] headline text` where `[CATEGORY]` is a colored 3-letter badge (POL, MKT, SCI, etc.) and the headline is in body color, dim for flavor and accent for headlines.
- Auto-scrolls vertically every 4s by stepping the y-offset of an inner container, looping when end is reached. Stops scrolling when player hovers (so they can read).
- Color rules: headlines = accent cyan, leader = profit green / loss red, stock = profit/loss based on direction, flavor = textDim.

This drops into the bottom-left "News Digest" slot in TurnReportScene at half-width × 132px height. Existing Market Changes panel on the right is preserved.

## Out of scope (follow-ups)

- Persistent bottom-of-screen marquee in `GameHUDScene` (always visible) — easy follow-up once the data layer is in place.
- Localization of templates — currently English-only.
- Player-driven news (player actions causing specific headlines).

## Risks

- **Template fatigue:** if categories repeat too often, immersion breaks. Mitigation: per-category cap of 3 per turn + recent-use memory of last 6 turns persisted only in-memory.
- **Token explosion:** unknown tokens silently fail today; chose to leave them visible in the rendered text rather than throw, so authoring errors are obvious during dev but never crash the panel.
- **Test brittleness:** 500 templates × token substitution × RNG → too many possibilities to assert exact strings. Tests assert structural properties (category coverage, parse validity, balance) and one snapshot at seed=42 for sanity.
