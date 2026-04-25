# Star Freight Tycoon - MVP Game Design

## Overview

A single-player space business/tycoon simulation inspired by Koei biz sims (Aerobiz, Aerobiz Supersonic) and transport tycoon games. Players own a shipping company in a procedurally generated galaxy, creating freight and passenger routes between planets and solar systems. The goal: survive 20 turns (5 galactic years) without going bankrupt, while building the most profitable space shipping empire.

**Tech stack:** Phaser 3 (latest) + TypeScript + Vite
**UI approach:** Full Phaser canvas rendering with reusable component library
**Target platform:** Web browser (desktop-first)

---

## Core Game Loop

Hybrid turn structure with three phases per turn:

```
PLANNING PHASE (player makes decisions)
  -> Buy/sell ships
  -> Create/modify routes
  -> Take loans / repay debt
  -> Review market intel & trends
  -> Upgrade hub presence

SIMULATION PHASE (quarter plays out, animated)
  -> Ships fly assigned routes
  -> Revenue generated per trip
  -> Events fire (market shifts, hazards, opportunities)
  -> Costs deducted (fuel, maintenance, loan interest)

REVIEW PHASE (results presented)
  -> Profit & Loss report for the quarter
  -> News digest (events that fired)
  -> Route performance breakdown
  -> Market trend changes highlighted
  -> Proceed to next turn
```

**Game length:** 20 turns = 5 galactic years (1 turn = 1 quarter)

**Victory/Loss:**

- Loss: negative cash + no sellable assets for 2 consecutive turns = bankruptcy
- Win: survive all 20 turns
- Score: net worth + route network size + reputation + total cargo/passengers moved
- High score table per galaxy seed encourages replayability

---

## Galaxy Generation

Seed-based procedural generation. Medium-scale galaxy.

### Structure

```
Galaxy
 ├── 2-3 Sectors (named regions of space)
 │    ├── 4-6 Star Systems per sector
 │    │    ├── 3-6 Planets/Stations per system
```

Total: ~30-50 destinations per game.

### Distance Model

Three tiers create natural strategic layers:

- **Intra-system:** 1-5 distance units (cheap, fast trips)
- **Inter-system:** 10-30 distance units (moderate cost)
- **Inter-sector:** 40-80 distance units (expensive, slow — high risk/reward)

### Planet Types

| Type         | Produces              | Demands                | Passenger Volume |
| ------------ | --------------------- | ---------------------- | ---------------- |
| Terran       | Tech, Luxury          | Food, Raw Materials    | High             |
| Industrial   | Tech, Manufactured    | Raw Materials, Food    | Medium           |
| Mining       | Raw Materials, Hazmat | Tech, Food, Medical    | Low              |
| Agricultural | Food, Organics        | Tech, Luxury           | Low              |
| Hub Station  | Nothing               | Everything (small qty) | Very High        |
| Resort       | Luxury                | Food, Medical          | High (tourist)   |
| Research     | Medical, Tech         | Everything else        | Low              |

Each planet is procedurally assigned a type based on its system's star class and orbital position. Names are procedurally generated with a sci-fi name generator.

### Map Rendering

Two zoom levels:

1. **Galaxy view:** Systems as star icons, sectors as colored regions, inter-system routes as lines
2. **System view:** Click a system to see planets laid out, intra-system routes visible

---

## Economy & Market System

### Cargo Types (7)

1. **Passengers** (economy class)
2. **Raw Materials** (ore, minerals, gases)
3. **Food & Organics**
4. **Technology**
5. **Luxury Goods**
6. **Hazardous Materials**
7. **Medical Supplies**

### Per-Planet Market State

Each planet tracks per cargo type:

- `baseSupply` — how much it produces per turn
- `baseDemand` — how much it consumes per turn
- `currentPrice` — derived from supply/demand balance
- `saturation` — 0-100%, increases when player delivers goods
- `trend` — rising / stable / falling (visible to player)

### Price Formula

```
price = basePrice * demandMultiplier * (1 - saturation * 0.6) * trendModifier * eventModifier
```

### Saturation Mechanic (anti-spam)

- Every unit delivered to a planet increases its saturation for that cargo type
- Saturation decays ~15% per turn naturally
- At 80%+ saturation, prices crater dramatically
- Effect: players cannot exploit a single route indefinitely — must diversify

### Trend System

- Each turn, demand trends shift via weighted random walk
- Small changes are common, large swings are rare
- Trends are visible to the player (up/down/stable arrow indicators)
- Creates "read the market" gameplay in mid-to-late game

### Passenger Model

Same framework but with "popularity" instead of saturation:

- Well-served routes build loyalty (bonus passengers over time)
- Over-capacity on popular routes drives ticket prices down
- Under-served routes have pent-up demand (first-mover advantage)

### Fuel

- Global fuel price fluctuates mildly per turn
- Fuel cost per trip = distance _ ship.fuelEfficiency _ fuelPricePerUnit
- Fuel is a constant cost pressure that makes route distance meaningful

---

## Ships & Fleet

### Ship Properties

```typescript
interface Ship {
  id: string;
  name: string;
  class: ShipClass;
  cargoCapacity: number; // max cargo units
  passengerCapacity: number; // max passengers
  speed: number; // 1-10, affects transit time
  fuelEfficiency: number; // cost multiplier per distance unit
  reliability: number; // 70-99%, breakdown chance
  age: number; // turns since purchase
  condition: number; // 0-100%, degrades over time
  purchaseCost: number;
  maintenanceCost: number; // per-turn upkeep
  assignedRoute: string | null;
}
```

### Ship Classes (8 at launch)

| Class             | Cargo | Pax | Speed | Fuel Eff | Cost |
| ----------------- | ----- | --- | ----- | -------- | ---- |
| Cargo Shuttle     | 80    | 0   | 4     | 0.8      | 40K  |
| Passenger Shuttle | 0     | 60  | 5     | 1.0      | 55K  |
| Mixed Hauler      | 50    | 30  | 3     | 1.2      | 60K  |
| Fast Courier      | 30    | 10  | 8     | 1.8      | 80K  |
| Bulk Freighter    | 300   | 0   | 2     | 0.6      | 150K |
| Star Liner        | 0     | 200 | 6     | 1.4      | 250K |
| Mega Hauler       | 800   | 0   | 2     | 0.5      | 500K |
| Luxury Liner      | 20    | 150 | 7     | 1.6      | 600K |

### Ship Aging & Maintenance

- Condition drops 2-5% per turn (random range)
- Below 50% condition: breakdown risk doubles
- Maintenance cost increases with age (1% per turn of age)
- Overhaul: restore to 90% condition, costs 30% of purchase price
- Sell: at depreciated value (based on age and condition)

### Route Assignment

MVP: Each ship assigned to one point-to-point route (origin <-> destination round trip). Ships make as many round trips as their speed allows per quarter. Multi-stop routes are post-MVP.

**Trips per turn:** `floor(turnDuration / (distance * 2 / speed))`

---

## Events & Storyteller

### Storyteller (Invisible Director)

Tracks player financial health and adjusts event probability weights:

- Doing well → slightly more headwinds (pirate activity, market downturns)
- Struggling → slightly more tailwinds (profitable contracts, market booms)
- Never feels unfair — just adjusts probabilities, doesn't guarantee outcomes

### Event Categories

**Market Events** (affect economy):

- Resource booms/busts on specific planets
- Trade agreements (reduce costs in a sector)
- Technology breakthroughs (shift demand)
- Economic recession (global demand drop)

**Hazard Events** (affect routes):

- Asteroid storms (route blocked for 1-2 turns)
- Pirate activity (increased breakdown risk on routes)
- Solar flare disruption (speed penalties in a system)
- Quarantine (no passengers to/from a planet)

**Opportunity Events** (player choices):

- Emergency transport contracts (deliver X for bonus payment)
- Derelict ship salvage (cheap ship, but low condition)
- New system discovered (expand the map)
- Government subsidies (reduced fuel cost if you serve a route)

**Flavor Events** (atmosphere, no mechanical impact):

- Alien ambassador visits
- Cultural festivals
- Scientific discoveries
- Galactic news stories

### Event Properties

- Frequency: 1-3 events per turn
- Duration: instant (1 turn) or persistent (2-4 turns)
- Visibility: all events shown in News Feed during review phase
- Some opportunity events require player decision (accept/decline modal)

---

## UI Component System

Full Phaser canvas UI with reusable component library.

### Theme System

Single `ThemeConfig` object defines:

- Colors (background, panel, text, accent, profit-green, loss-red)
- Fonts (heading, body, caption sizes)
- Spacing (padding, margins, gaps)
- Nine-slice texture keys for panels/buttons
- All components read from theme — reskinning = changing one config

### Component Library

**BaseComponent** (abstract): position, size, visibility, depth, theme-awareness, interactive state, destroy cleanup.

**Panel:** NineSlice background, optional title bar, vertical/horizontal child layout, optional dragging.

**Button:** Normal/hover/pressed/disabled states, NineSlice background + label, onClick callback, optional icon.

**Label:** BitmapText or WebFont, style variants (heading, body, caption, value), color-coded variants.

**ScrollableList:** Mask-based scrolling, mouse wheel + drag, dynamic item rendering, item click/select.

**DataTable:** Column definitions (label, width, align, sortable), row data binding, sort-by-column, scrollable body with fixed header, row selection.

**ProgressBar:** Fill + background + border, label overlay, animated fill transitions.

**Modal:** Dims background, centered, OK/Cancel buttons, blocks input to other scenes.

**Tooltip:** Follows pointer, show delay, rich text content.

**TabGroup:** Tab buttons, switches visible child panels, active tab indicator.

### Layout

Simple vertical/horizontal stacking with padding/spacing. Fixed-dimension panels (not responsive). Game targets 1280x720 minimum with scaling.

---

## Game Screens (Phaser Scenes)

### Scene Map

```
MainMenuScene
  ├── New Game → GalaxySetupScene → GameHUDScene + GalaxyMapScene
  ├── Continue → GameHUDScene + GalaxyMapScene (load save)
  └── Settings → SettingsScene

Planning Phase Scenes (swappable, HUD persists):
  ├── GalaxyMapScene (default, click system to drill in)
  ├── SystemMapScene (planets in a system)
  ├── PlanetDetailScene (planet info, market data)
  ├── FleetScene (ship list, buy/sell/repair)
  ├── RoutesScene (active routes, create new)
  ├── FinanceScene (P&L, loans, balance sheet)
  └── MarketScene (prices across galaxy, trends)

Simulation Phase:
  └── SimPlaybackScene (animated map, events pop in, fast-forwardable)

Review Phase:
  └── TurnReportScene (P&L, news digest, route performance)

Persistent Overlay Scenes:
  ├── GameHUDScene (cash, turn number, phase indicator, nav buttons)
  └── ModalScene (confirmations, event choice dialogs)
```

~12 scenes total. Each scene composes reusable UI components with different data.

---

## Data Architecture

### Central Game State

```typescript
interface GameState {
  seed: number;
  turn: number;
  phase: "planning" | "simulation" | "review";
  cash: number;
  loans: Loan[];
  reputation: number;

  galaxy: {
    sectors: Sector[];
    systems: StarSystem[];
    planets: Planet[];
  };

  fleet: Ship[];
  activeRoutes: ActiveRoute[];
  market: MarketState;
  events: GameEvent[];
  activeEvents: ActiveEvent[];
  history: TurnResult[];
  storyteller: StorytellerState;
}
```

### Design Principles

- Game state is a plain TypeScript object, fully outside Phaser
- State changes emit events via a simple EventEmitter
- Scenes subscribe to state changes and re-render
- Simulation phase is pure math — no rendering dependency
- Save/load = JSON.stringify/parse to localStorage
- Game logic is unit-testable without Phaser imports

---

## Starting Conditions

- **Starting cash:** ~§200,000
- **Starting ships:** 1 free Cargo Shuttle + 1 free Passenger Shuttle
- **Starting location:** Player picks one of 3 offered systems (procedurally selected, each with different strategic advantages)
- **Loans available:** Up to §500K at 5-8% quarterly interest
- **Goal:** Survive 20 turns, maximize score

---

## MVP Scope Summary

### In MVP

- Hybrid turn loop (plan/sim/review)
- Procedural galaxy (2-3 sectors, ~30-50 planets)
- 7 cargo types + passengers
- 8 ship classes with aging/maintenance
- Saturation-based economy with trends
- Event/storyteller system (~20 unique events)
- Full Phaser UI component kit
- Galaxy & system map views
- Save/load via localStorage
- Score & high score table
- Procedural planet/system/sector naming

### Post-MVP

- AI competitor companies
- Multi-stop routes
- Ship upgrades & customization
- Alien factions & diplomacy
- Sound effects & music
- Achievements
- Configurable galaxy size
- More ship classes
- Supply chain mechanics
- Technology research tree
