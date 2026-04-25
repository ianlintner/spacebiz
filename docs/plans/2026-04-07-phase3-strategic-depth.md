# Phase 3: Strategic Depth — Contracts, Empire Access, Route Slots & Tech Tree

**Date:** 2026-04-07  
**Status:** Design Complete  
**Dependencies:** Phase 2 (AI & Empires), Economy Rebalance

---

## Problem Statement

Players can buy every profitable route in the game with no meaningful limit. The escalating license fees from the economy rebalance slow expansion slightly, but the optimal strategy remains "open every route you can afford." This creates:

1. **Tedious gameplay** — clicking through 50+ route opportunities with no reason to skip any
2. **No strategic identity** — every playthrough follows the same "buy everything" pattern
3. **Meaningless decisions** — route selection reduces to "highest profit first"
4. **No empire progression** — all empires accessible from turn 1 with only tariff friction
5. **Missing mid/late game systems** — no long-term investment or research decisions

## Design Goals

- **Routes must be a scarce resource.** Players choose _which_ routes to run, not _how many_ they can afford.
- **Empire access is earned.** You start local and expand through contracts, not cash.
- **Inter-empire trade is prestigious and limited.** One cargo type per empire pair, trade bans, tariffs create real constraints.
- **Contracts create tension.** Some at a loss, but they unlock empires and grant bonuses.
- **Tech tree provides long-term goals.** Investments in research unlock more slots, routes, and capabilities.
- **Events interact with the new systems.** Grounding routes, banning imports, shifting tariffs.

---

## System 1: Route Slots

### Core Mechanic

Players have a **limited number of route slots**. Each active route occupies one slot. Slots are the hard cap — you cannot open a route without a free slot, regardless of cash.

### Slot Allocation

| Source                    | Slots         | Notes                                                                          |
| ------------------------- | ------------- | ------------------------------------------------------------------------------ |
| **Starting**              | 3             | All players begin with 3 slots                                                 |
| **Home empire bonus**     | +1            | Intra-empire routes within your starting empire                                |
| **Empire unlock**         | +1 per empire | Completing an empire contract grants +1 slot                                   |
| **Tech tree**             | +1 to +4      | "Logistics Network" tech branch                                                |
| **Contracts (temporary)** | +1 each       | Contract routes use a temporary bonus slot that expires when the contract ends |

### Slot Progression by Game Phase

| Phase | Turns  | Expected Slots | Routes Active              |
| ----- | ------ | -------------- | -------------------------- |
| Early | 1–15   | 4–5            | 3–4 intra-empire           |
| Mid   | 16–35  | 6–8            | 4–6, first inter-empire    |
| Late  | 36–60+ | 8–12           | 6–10, multi-empire network |

### Slot Rules

- **Deleting a route frees the slot immediately.** Players can restructure their network.
- **Contract slots are temporary.** When a contract ends, the slot goes away but the contract route is also removed. The permanent +1 comes from the empire unlock reward.
- **AI companies also have slot limits:** 4 base + 1 per personality tier (Aggressive: +3, Steady: +1, Cherry: +2). Max 12 unchanged for AI.

### Constants

```
BASE_ROUTE_SLOTS = 3
HOME_EMPIRE_BONUS_SLOTS = 1
SLOT_PER_EMPIRE_UNLOCK = 1
```

---

## System 2: Empire Access & Progression

### Starting State

At game start, the player has **access to their home empire + 2 adjacent empires** (3 total). "Adjacent" = the 2 empires whose systems are closest to the player's home system center.

All other empires are **locked**. Locked empires:

- Appear on the galaxy map (borders visible, greyed out)
- Cannot be selected as route origin or destination
- System details hidden (no planet data visible until unlocked)
- AI companies **can** trade in locked empires (they have their own access)

### Unlocking Empires

Empires are unlocked by completing **empire contracts** (see System 3). Each locked empire periodically offers a contract. Completing it grants:

1. **Full access** to that empire's systems and planets
2. **+1 permanent route slot**
3. **Reputation bonus** (+5 reputation)
4. **Research points** (see System 5)

### Empire Route Restrictions (Inter-Empire Trade)

Once you have access to two empires, you can create **inter-empire routes** between them. These routes face restrictions:

- **One cargo type per empire-pair direction.** Between Empire A → Empire B, you may only run one type of cargo (e.g., Technology). You choose when creating the route. A→B Technology does not block B→A Technology (different direction).
- **Tariffs apply** at the existing rates (5–20% based on disposition).
- **Some empires ban imports/exports** of specific cargo types (see Empire Trade Policies below).

### Empire Trade Policies

Each empire has a **trade policy** generated at galaxy creation:

| Policy            | Effect                                       | Frequency      |
| ----------------- | -------------------------------------------- | -------------- |
| **Open Trade**    | No restrictions                              | 40% of empires |
| **Import Ban**    | 1–2 cargo types cannot be imported           | 25% of empires |
| **Export Ban**    | 1–2 cargo types cannot be exported           | 20% of empires |
| **Protectionist** | Import ban on 2 types + 50% tariff surcharge | 15% of empires |

Ban targets are chosen based on what the empire **produces** (export bans on strategic goods) or what it **demands** (import bans to protect local industry).

### Trade Policy Events

Events can temporarily modify trade policies:

| Event                     | Effect                                                                            | Duration  |
| ------------------------- | --------------------------------------------------------------------------------- | --------- |
| **Trade Embargo**         | All routes between two specific empires grounded                                  | 2–3 turns |
| **Import Crackdown**      | Empire adds 1 import ban                                                          | 3–4 turns |
| **Free Trade Summit**     | Empire removes all bans temporarily                                               | 2–3 turns |
| **Tariff War**            | Two empires double tariffs on each other                                          | 3–5 turns |
| **Smuggling Opportunity** | Banned cargo can be shipped at 3× price but −10 reputation if caught (50% chance) | 1–2 turns |

### Empire Access on Galaxy Map

The galaxy map UI shows empire access status:

- **Accessible empires:** Full color borders, clickable systems, route lines visible
- **Locked empires:** Dimmed borders (30% alpha), lock icon on label, systems shown as dim dots
- **Active contract empires:** Pulsing border, contract icon, progress indicator

---

## System 3: Contract System

### Overview

Contracts are **missions offered by empires** that require the player to operate a specific route for a set duration. Contracts are the **primary way to unlock new empires** and a secondary source of research points and reputation.

### Contract Types

| Type                 | Route                                            | Duration  | Reward                                    | Loss Risk   |
| -------------------- | ------------------------------------------------ | --------- | ----------------------------------------- | ----------- |
| **Empire Unlock**    | From your empire → locked empire planet          | 4–6 turns | Empire access + slot + 5 rep + 3 RP       | Medium-High |
| **Passenger Ferry**  | Between any 2 accessible planets                 | 3–4 turns | §15K–30K + 2 RP                           | Low         |
| **Emergency Supply** | Deliver specific cargo to specific planet        | 2–3 turns | §20K–50K + 3 rep + 1 RP                   | Medium      |
| **Trade Alliance**   | Inter-empire route, specific cargo               | 4–5 turns | Tariff reduction 50% for that pair + 2 RP | Low-Medium  |
| **Research Courier** | Deliver Technology or Medical to Research planet | 3–4 turns | 5 RP                                      | Medium      |

### Contract Generation

- **Empire unlock contracts** appear when the player has access to an empire adjacent to a locked one. One available at a time per locked empire. Regenerated if declined (next turn).
- **Other contracts** appear on the **Contracts screen** (new scene). 2–4 available at any time. Refreshed each turn (old ones expire, new ones appear).
- Contracts are generated by a seeded RNG system to ensure determinism.

### Contract Route Mechanics

When a contract is accepted:

1. **A route is auto-created** from the specified origin to destination with the specified cargo type.
2. **A temporary contract slot** is added (does not consume regular slots).
3. The player must **assign a ship** to the route (not auto-assigned).
4. The route must remain **active for the full duration** — if the player deletes it or has no ship assigned for 2+ consecutive turns, the contract **fails**.

### Contract Failure

- **Reputation penalty:** −5 to −10 reputation
- **Cash penalty:** Forfeit a deposit (10–20% of contract's potential reward as cash)
- **Empire remains locked** (for empire unlock contracts)
- **Cooldown:** That empire's next unlock contract delayed by 3 turns

### Contract Revenue

Contract routes earn normal route revenue **plus or minus** a contract modifier:

- **Profitable contracts:** Revenue is normal. Reward is the bonus on top.
- **Break-even contracts:** Route covers fuel/maintenance but no profit. Reward compensates.
- **Loss-leader contracts:** Route loses §2K–5K/turn. The empire unlock or RP reward makes it worthwhile _if_ you have the cash reserves.

Empire unlock contracts are **always** loss-leaders or break-even. This ensures unlocking empires is a **strategic investment**, not free money.

### Contract UI (New Scene: ContractsScene)

Tab-based layout matching RoutesScene style:

**Tab 1: Available Contracts**

| Column      | Content                                            |
| ----------- | -------------------------------------------------- |
| Type        | Icon + name (Empire Unlock, Passenger Ferry, etc.) |
| From        | Origin planet (empire name)                        |
| To          | Destination planet (empire name)                   |
| Cargo       | Required cargo type                                |
| Duration    | Turns remaining                                    |
| Est. Profit | Projected per-turn profit (green/red)              |
| Reward      | Text summary of rewards                            |

- Selecting a contract shows details in the portrait panel
- "Accept Contract" button with confirmation modal showing full terms
- Mini-map shows the contract route

**Tab 2: Active Contracts**

| Column     | Content                                |
| ---------- | -------------------------------------- |
| Contract   | Name and type                          |
| Route      | Origin → Destination                   |
| Turns Left | Countdown                              |
| Status     | On Track / Warning (no ship) / Failing |
| Revenue    | This turn's revenue                    |

- Warning indicator if ship not assigned
- "Abandon Contract" button with penalty confirmation

### Contract Data Structure

```typescript
interface Contract {
  id: string;
  type:
    | "empireUnlock"
    | "passengerFerry"
    | "emergencySupply"
    | "tradeAlliance"
    | "researchCourier";
  targetEmpireId: string | null; // for empire unlock contracts
  originPlanetId: string;
  destinationPlanetId: string;
  cargoType: CargoType;
  durationTurns: number;
  turnsRemaining: number;
  rewardCash: number;
  rewardReputation: number;
  rewardResearchPoints: number;
  rewardTariffReduction: {
    empireA: string;
    empireB: string;
    reduction: number;
  } | null;
  depositPaid: number; // forfeited on failure
  status: "available" | "active" | "completed" | "failed" | "expired";
  linkedRouteId: string | null; // route created for this contract
  turnsWithoutShip: number; // failure counter
}
```

---

## System 4: Inter-Empire Route Planning & UI

### Route Finder Updates

The Route Finder tab needs significant updates to support the new systems:

#### Empire Filter

Add an **empire filter bar** above the cargo filter:

```
[Home Empire ▼] → [All Accessible ▼]    or    [Empire A ▼] → [Empire B ▼]
```

- **Left dropdown:** Origin empire (defaults to home empire)
- **Right dropdown:** Destination empire (defaults to "All Accessible")
- Locked empires shown greyed out with lock icon
- "All Accessible" scans all unlocked empires
- Selecting a specific pair shows only routes between those two empires

#### Route Opportunity Display

Each route opportunity row now shows:

| Column     | New/Updated                                                         |
| ---------- | ------------------------------------------------------------------- |
| Empire     | NEW — Shows origin empire → destination empire (color-coded)        |
| Tariff     | NEW — Shows tariff % for inter-empire routes, "—" for intra         |
| Net Profit | UPDATED — Now deducts tariff from profit estimate                   |
| Restricted | NEW — Shows cargo ban icon if that cargo is banned by either empire |
| Slot       | NEW — Shows "N/M" (used/total) route slot counter                   |

#### Route Creation Validation

Before creating a route, validate:

1. ✅ Player has a free route slot
2. ✅ Origin empire is accessible
3. ✅ Destination empire is accessible
4. ✅ Cargo type not banned by either empire's trade policy
5. ✅ If inter-empire: no existing route with same cargo type in same direction for that empire pair
6. ✅ Player can afford license fee

Show clear error messages for each failure case.

### Galaxy Map Updates

#### Empire Selection Mode

Clicking an empire border or label on the galaxy map enters **Empire Focus Mode**:

- Selected empire highlighted (full brightness)
- Other empires dimmed to 50%
- Trade policy summary shown in an info card:
  ```
  ┌─ Zephyrian Collective ────────────┐
  │ Disposition: Neutral               │
  │ Tariff: 12%                        │
  │ Policy: Import Ban (Technology)    │
  │ Your Routes: 2/1 cargo types       │
  │ Status: Unlocked                   │
  └────────────────────────────────────┘
  ```
- Click another empire to see pair-specific info (tariff, allowed cargo, existing routes)
- ESC or click empty space to exit focus mode

#### Route Slot Indicator

The HUD shows current slot usage: `Routes: 5/8 ■■■■■□□□`

#### Locked Empire Visuals

- Systems in locked empires rendered as small dim dots (no star glow)
- Empire borders drawn with dashed lines at 30% alpha
- Lock icon (🔒) rendered at empire label position
- Hover tooltip: "Complete a contract to unlock trade with [Empire Name]"

### System Map Updates

- If system belongs to a locked empire, show a "Locked" overlay with contract prompt
- If accessible, show trade policy restrictions as icons next to planet names
- Show which cargo types are banned (red X overlay on cargo icon)

---

## System 5: Tech Tree

### Overview

The tech tree provides **long-term strategic investment** through Research Points (RP). It gates access to more route slots, better economics, event mitigation, and empire capabilities.

### Research Points (RP)

| Source                         | RP/Occurrence                                   | Notes                   |
| ------------------------------ | ----------------------------------------------- | ----------------------- |
| **Passive**                    | 1 RP/turn                                       | Always earned           |
| **Contracts**                  | 1–5 RP                                          | Varies by contract type |
| **Research Courier contracts** | 5 RP                                            | Highest RP reward       |
| **Trade Alliance contracts**   | 2 RP                                            | Moderate                |
| **Empire unlock**              | 3 RP                                            | One-time per empire     |
| **Diversity bonus**            | 1 RP/turn per 4+ cargo types traded             | Encourages diversity    |
| **Research planet bonus**      | +0.5 RP/turn per route to/from Research planets | Rounded down            |

### Tech Tree Structure

The tree has **5 branches** with **4 tiers each** (20 technologies total). Each tier costs more RP. Technologies within the same branch must be researched in order (tier 1 → 2 → 3 → 4). Branches are independent.

#### Branch 1: Logistics Network

Expand your route capacity and efficiency.

| Tier | Name                         | Cost  | Effect                                              |
| ---- | ---------------------------- | ----- | --------------------------------------------------- |
| 1    | **Efficient Scheduling**     | 8 RP  | +1 route slot                                       |
| 2    | **Regional Hub Protocols**   | 16 RP | +1 route slot, −10% license fees                    |
| 3    | **Galactic Freight Network** | 30 RP | +1 route slot, intra-empire routes get +1 trip/turn |
| 4    | **Omnipresent Logistics**    | 50 RP | +1 route slot, all routes get +10% revenue          |

#### Branch 2: Diplomacy & Trade

Improve inter-empire trade economics.

| Tier | Name                         | Cost  | Effect                                                                   |
| ---- | ---------------------------- | ----- | ------------------------------------------------------------------------ |
| 1    | **Cultural Exchange**        | 8 RP  | −20% tariffs on friendly empires                                         |
| 2    | **Trade Envoys**             | 16 RP | Can run 2 cargo types per empire pair (up from 1)                        |
| 3    | **Diplomatic Immunity**      | 30 RP | −20% tariffs on neutral empires, immune to 1 embargo/game                |
| 4    | **Galactic Trade Authority** | 50 RP | −20% tariffs on hostile empires, 2nd cargo type per pair for all empires |

#### Branch 3: Fleet Engineering

Improve ship performance and reduce costs.

| Tier | Name                         | Cost  | Effect                                                             |
| ---- | ---------------------------- | ----- | ------------------------------------------------------------------ |
| 1    | **Improved Maintenance**     | 8 RP  | −15% maintenance costs                                             |
| 2    | **Fuel Injection Systems**   | 16 RP | −15% fuel costs                                                    |
| 3    | **Hull Reinforcement**       | 30 RP | Ship condition decays 30% slower                                   |
| 4    | **Autonomous Repair Drones** | 50 RP | Ships auto-repair +3 condition/turn (up to 80), overhaul cost −30% |

#### Branch 4: Market Intelligence

Better market information and price advantages.

| Tier | Name                       | Cost  | Effect                                                                       |
| ---- | -------------------------- | ----- | ---------------------------------------------------------------------------- |
| 1    | **Market Forecasting**     | 8 RP  | Trend predictions shown 2 turns ahead in UI                                  |
| 2    | **Supply Chain Analytics** | 16 RP | Saturation shown numerically in route finder, +10% cargo prices              |
| 3    | **Arbitrage Algorithms**   | 30 RP | Route finder shows true net profit (after all costs), −20% saturation impact |
| 4    | **Market Manipulation**    | 50 RP | Once per 5 turns: reset saturation on one planet to 0                        |

#### Branch 5: Crisis Management

Mitigate events and handle adversity.

| Tier | Name                      | Cost  | Effect                                                                                                                                |
| ---- | ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Emergency Reserves**    | 8 RP  | Events that cost cash reduced by 25%                                                                                                  |
| 2    | **Crisis Response Teams** | 16 RP | Hazard events duration −1 turn (min 1)                                                                                                |
| 3    | **Political Connections** | 30 RP | Empire events (embargoes, tariff wars) duration −1 turn, 25% chance to avoid them entirely                                            |
| 4    | **Galactic Insurance**    | 50 RP | Route groundings pay a mothball refund (50% of expected revenue), breakdowns never cause full revenue loss (50% revenue instead of 0) |

### Research Mechanic

- **One technology researched at a time.** Player queues the next tech.
- **RP accumulates passively** each turn (1 base + bonuses).
- **No "spending" RP** — RP is a cumulative counter. When you hit the cost threshold, the tech completes.
- **Research progress carries over.** If Tech A costs 8 RP and you earned 10 RP by the time it completes, the extra 2 RP applies to the next queued tech.

### Tech Tree UI (New Scene: TechTreeScene)

Visual tree layout with 5 horizontal branches:

```
  LOGISTICS    ──[T1]──[T2]──[T3]──[T4]
  DIPLOMACY    ──[T1]──[T2]──[T3]──[T4]
  ENGINEERING  ──[T1]──[T2]──[T3]──[T4]
  INTELLIGENCE ──[T1]──[T2]──[T3]──[T4]
  CRISIS       ──[T1]──[T2]──[T3]──[T4]
```

Each node shows:

- **Locked:** Dim, no detail (prerequisite not met)
- **Available:** Highlighted border, shows name + cost + effect summary
- **Researching:** Animated glow, progress bar showing RP progress
- **Completed:** Full brightness, checkmark, effect active

**Interaction:**

- Click a node to see full description in portrait panel
- Click "Research" on an available node to queue it
- Current research shown in HUD: `⚙ Researching: Efficient Scheduling (5/8 RP)`
- Arrow keys navigate between nodes
- Tab switches branches

### Tech Tree Data Structure

```typescript
type TechBranch =
  | "logistics"
  | "diplomacy"
  | "engineering"
  | "intelligence"
  | "crisis";

interface Technology {
  id: string;
  name: string;
  branch: TechBranch;
  tier: 1 | 2 | 3 | 4;
  rpCost: number;
  description: string;
  effects: TechEffect[];
}

interface TechEffect {
  type:
    | "addRouteSlots"
    | "modifyLicenseFee"
    | "modifyTariff"
    | "modifyMaintenance"
    | "modifyFuel"
    | "modifyConditionDecay"
    | "modifyRevenue"
    | "addTripsPerTurn"
    | "addCargoTypesPerPair"
    | "modifySaturation"
    | "modifyEventDuration"
    | "modifyEventCash"
    | "addAutoRepair"
    | "modifyOverhaulCost"
    | "addEmbargoImmunity"
    | "addMothballRefund"
    | "addBreakdownRevenue"
    | "addMarketForecast"
    | "addSaturationDisplay"
    | "addMarketReset";
  value: number;
  target?: "friendly" | "neutral" | "hostile" | "all";
}

interface TechState {
  researchPoints: number;
  completedTechIds: string[];
  currentResearchId: string | null;
  researchProgress: number; // RP toward current tech
}
```

---

## System 6: Mothball Fees & Route Grounding

### Route Grounding

Events (embargoes, hazards, blockades) can **ground** routes — temporarily disable them so they generate no revenue. Currently routes are simply blocked. Phase 3 adds a **mothball fee** for grounded routes.

### Mothball Fee

When a route is grounded by an event:

```
Mothball Fee = Base Maintenance of assigned ship × 0.5 per turn grounded
```

This represents the cost of keeping the ship idle, crew on standby, and docking fees. The player pays this each turn the route is grounded.

### Player Choices for Grounded Routes

When a route is grounded, the player can:

1. **Wait it out** — Pay mothball fees until the event ends. Route resumes automatically.
2. **Reassign the ship** — Move the ship to another route during planning phase. The grounded route holds its slot but has no ship.
3. **Delete the route** — Free the slot entirely. No more mothball fees, but lose the license fee investment.

### Grounding Events

| Event            | What's Grounded                              | Duration  |
| ---------------- | -------------------------------------------- | --------- |
| Trade Embargo    | All routes between 2 empires                 | 2–3 turns |
| Quarantine       | All routes to/from a specific planet         | 2–3 turns |
| Pirate Blockade  | All routes through a specific system         | 1–2 turns |
| Asteroid Storm   | All routes through a specific system         | 1 turn    |
| Import Crackdown | Routes importing banned cargo into an empire | 3–4 turns |

---

## System 7: Updated Scoring

### Revised Score Formula

```
netWorth = cash + fleetValue − loanBalance
score = netWorth
      + reputation × 100
      + totalCargoDelivered × 0.5
      + activeRoutes.length × 500
      + distinctEmpiresTraded × 1000
      + distinctCargoTypes × 2000
      + empiresUnlocked × 1500          // NEW
      + contractsCompleted × 750         // NEW
      + techsResearched × 500            // NEW
```

### Scoring Strategy Diversity

The new systems create multiple viable scoring paths:

| Strategy            | Focus                    | Score Source                                    |
| ------------------- | ------------------------ | ----------------------------------------------- |
| **Empire Builder**  | Unlock all empires fast  | Empire bonuses + contract bonuses + wide access |
| **Tech Researcher** | Rush tech tree           | Tech bonuses + efficiency gains compound        |
| **Trade Mogul**     | Maximize route profit    | Net worth + cargo volume                        |
| **Diplomat**        | Trade alliance contracts | Reduced tariffs + inter-empire bonuses          |
| **Specialist**      | Dominate one cargo type  | High saturation mastery + market manipulation   |

---

## System 8: AI Adaptation

### AI and Route Slots

AI companies receive slot limits matching their personality:

| Personality         | Base Slots | Max Slots |
| ------------------- | ---------- | --------- |
| Aggressive Expander | 5          | 10        |
| Steady Hauler       | 4          | 7         |
| Cherry Picker       | 4          | 8         |

AI gains +1 slot every 10 turns (simulating organic growth) up to max.

### AI and Empires

- AI starts with access to their home empire + 1 adjacent empire
- AI gains access to 1 new empire every 12 turns (automatic, no contracts)
- AI does not interact with the contract system
- AI respects empire trade policies (won't ship banned cargo)
- AI does not research tech (keeps them simpler than the player)

### AI and Trade Restrictions

- AI respects the 1-cargo-per-empire-pair restriction
- AI prefers intra-empire routes (SteadyHauler: 80%, AggressiveExpander: 50%, CherryPicker: 60%)
- AI checks trade policies before opening routes

---

## Updated GameState

### New Fields

```typescript
interface GameState {
  // ... existing fields ...

  // Phase 3 additions
  routeSlots: number; // current max route slots
  unlockedEmpireIds: string[]; // empires the player can trade with
  contracts: Contract[]; // all contracts (available + active + completed)
  tech: TechState; // research progress
  empireTradePolicies: Record<string, EmpireTradePolicyEntry>; // per-empire trade rules
  interEmpireCargoLocks: InterEmpireCargoLock[]; // tracks which cargo locked per pair
}

interface EmpireTradePolicyEntry {
  policy: "openTrade" | "importBan" | "exportBan" | "protectionist";
  bannedImports: CargoType[];
  bannedExports: CargoType[];
  tariffSurcharge: number; // added to base tariff (0 for most, 0.5 for protectionist)
}

interface InterEmpireCargoLock {
  originEmpireId: string;
  destinationEmpireId: string;
  cargoType: CargoType;
  routeId: string;
}
```

### New Constants

```typescript
// Route Slots
BASE_ROUTE_SLOTS = 3;
HOME_EMPIRE_BONUS_SLOTS = 1;
SLOT_PER_EMPIRE_UNLOCK = 1;

// Empire Access
STARTING_ADJACENT_EMPIRES = 2;

// Contracts
MAX_AVAILABLE_CONTRACTS = 4;
CONTRACT_FAILURE_REP_PENALTY = -7;
CONTRACT_FAILURE_COOLDOWN_TURNS = 3;
CONTRACT_UNASSIGNED_SHIP_LIMIT = 2; // turns without ship before failure

// Tech Tree
BASE_RP_PER_TURN = 1;
RP_DIVERSITY_THRESHOLD = 4; // cargo types needed for diversity RP
RP_RESEARCH_PLANET_BONUS = 0.5;

// Mothball
MOTHBALL_FEE_RATIO = 0.5; // of ship base maintenance

// Inter-empire trade
BASE_CARGO_TYPES_PER_PAIR = 1;

// AI slot progression
AI_SLOT_GROWTH_INTERVAL = 10; // turns between +1 slot
AI_EMPIRE_UNLOCK_INTERVAL = 12; // turns between new empire access
```

---

## New Scenes & UI

### New Scenes

| Scene              | Purpose                               | Nav Position                          |
| ------------------ | ------------------------------------- | ------------------------------------- |
| **ContractsScene** | View/accept/manage contracts          | Between Routes and Fleet in sidebar   |
| **TechTreeScene**  | Research tree visualization and queue | Between Finance and Market in sidebar |

### HUD Updates

Add to the persistent HUD bar:

- **Route slots:** `Routes: 5/8` with slot bar
- **Research:** `⚙ Fuel Injection (12/16 RP)` with inline progress
- **Active contracts:** `📋 2 contracts` indicator
- **Empire access:** Small empire color dots showing which empires are unlocked

### Updated Nav Sidebar

```
Galaxy Map
System Map        (context-dependent)
Planet Detail     (context-dependent)
──────────
Routes            (+ slot counter badge)
Contracts         (NEW — badge shows available contracts)
Fleet
Finance
Market
Tech Tree         (NEW — badge shows research ready)
```

### Route Builder Panel Updates

- Show "Slots: 5/8" in header
- Disable confirm if no slots available
- Show empire access status for origin/destination
- Show trade policy warnings (banned cargo, tariff info)
- Show inter-empire cargo lock status

---

## Implementation Plan

### Phase 3A: Core Data & Types (Foundation)

**Files:** `types.ts`, `constants.ts`

1. Add `Contract`, `TechState`, `Technology`, `TechEffect`, `EmpireTradePolicyEntry`, `InterEmpireCargoLock` types
2. Add `TechBranch` type constant
3. Add new `GameState` fields: `routeSlots`, `unlockedEmpireIds`, `contracts`, `tech`, `empireTradePolicies`, `interEmpireCargoLocks`
4. Add all new constants (route slots, empire access, contracts, tech, mothball, AI)
5. Define the 20 technologies as a `TECH_TREE` constant array
6. Add `ContractType` constant

### Phase 3B: Empire Access & Trade Policies

**Files:** `generation/`, new `game/empire/`

1. Implement `EmpirePolicyGenerator` — assigns trade policies at galaxy generation
2. Implement `EmpireAccessManager` — tracks unlocked empires, validates access
3. Update `GalaxyGenerator` to assign trade policies
4. Update `NewGameSetup` to initialize `unlockedEmpireIds` (home + 2 adjacent), `routeSlots`, `tech`
5. Implement `findAdjacentEmpires()` utility
6. Add trade policy validation to route creation (`canCreateRoute()`)

### Phase 3C: Route Slot System

**Files:** `game/routes/`

1. Add `getAvailableRouteSlots()`, `getUsedRouteSlots()` helpers
2. Update `createRoute()` to check slot availability
3. Update `deleteRoute()` to free slots
4. Add inter-empire cargo lock tracking
5. Validate 1-cargo-per-pair restriction in route creation
6. Update `scanAllRouteOpportunities()` to filter by accessible empires, trade policies, and available slots

### Phase 3D: Contract System

**New files:** `game/contracts/ContractGenerator.ts`, `game/contracts/ContractManager.ts`

1. Implement `ContractGenerator` — creates contract offers based on game state
2. Implement `ContractManager` — accept, track, complete, fail contracts
3. Empire unlock contract logic (loss-leader pricing, temporary slot)
4. Contract route auto-creation and linking
5. Turn processing: check contract progress, tick durations, handle failures
6. Contract reward distribution (cash, rep, RP, tariff reduction, empire unlock)

### Phase 3E: Tech Tree System

**New files:** `game/tech/TechTree.ts`, `game/tech/TechEffects.ts`

1. Define `TECH_TREE` data (20 technologies, effects, costs)
2. Implement `TechResearchManager` — queue research, accumulate RP, complete techs
3. Implement `applyTechEffects()` — modifies game calculations based on completed techs
4. Integrate RP sources: passive, contracts, diversity, research planets
5. Hook tech effects into: route revenue, fuel costs, maintenance, tariffs, event handling, condition decay, saturation, slot count

### Phase 3F: Mothball & Event Updates

**Files:** `game/events/`

1. Add mothball fee calculation to grounded routes
2. Add new event templates (Trade Embargo, Import Crackdown, Free Trade Summit, Tariff War, Smuggling Opportunity)
3. Update event effects to interact with empire trade policies
4. Tech tree crisis management effects (duration reduction, immunity, mothball refunds)

### Phase 3G: Simulation Updates

**Files:** `game/simulation/`

1. Update turn processing to:
   - Calculate mothball fees for grounded routes
   - Process contract progress (tick durations, check completion/failure)
   - Accumulate and apply RP
   - Check tech completion
   - Apply tech effects to all calculations
2. Update AI turn processing for slot limits, trade restrictions, empire access progression
3. Update scoring calculation with new bonuses

### Phase 3H: ContractsScene UI

**New file:** `scenes/ContractsScene.ts`

1. Two-tab layout (Available / Active) matching RoutesScene style
2. Contract detail panel with route preview
3. Accept/Abandon buttons with confirmation modals
4. Mini-map showing contract route
5. Portrait panel showing destination planet/empire info
6. Status indicators (on track, warning, failing)

### Phase 3I: TechTreeScene UI

**New file:** `scenes/TechTreeScene.ts`

1. 5-branch horizontal tree layout
2. Node states: locked, available, researching, completed
3. Research queue interaction (click to queue)
4. Effect descriptions in portrait panel
5. RP income breakdown display
6. Animated research progress

### Phase 3J: Route & Map UI Updates

**Files:** `scenes/RoutesScene.ts`, `ui/RouteBuilderPanel.ts`, `scenes/GalaxyMapScene.ts`, `scenes/SystemMapScene.ts`

1. Route Finder: Add empire filter dropdowns, slot counter, tariff column, restriction icons
2. Route Builder Panel: Slot validation, empire access checks, trade policy warnings
3. Galaxy Map: Empire focus mode, locked empire visuals, route slot indicator in HUD
4. System Map: Locked overlay for inaccessible systems, trade policy icons

### Phase 3K: HUD & Navigation Updates

**Files:** `scenes/GameHUDScene.ts`

1. Route slot indicator in HUD
2. Research progress indicator in HUD
3. Contract badge on nav sidebar
4. Empire access dots
5. Updated action prompt bar messages for contracts and research
6. Contracts and Tech Tree nav buttons in sidebar

### Phase 3L: Adviser & Tutorial Updates

**Files:** `game/adviser/`

1. New adviser messages for: contracts, tech tree, empire access, trade policies
2. Tutorial additions: first contract, first tech research, first empire unlock
3. Warning messages: contract at risk, grounded routes, trade policy changes
4. Tip rotation expanded with contract/tech/empire tips

### Phase 3M: Testing

**New test files in `__tests__/` directories**

1. Route slot math (allocation, freeing, contract slots)
2. Empire access (initial setup, adjacent calculation, unlock)
3. Trade policy generation and validation
4. Inter-empire cargo lock enforcement
5. Contract lifecycle (generation, accept, progress, complete, fail)
6. Tech tree (RP accumulation, tech completion, effect application)
7. Mothball fee calculation
8. Updated scoring formula
9. AI slot progression and trade restriction compliance
10. Integration: full turn cycle with all new systems

---

## Balance Targets

### Small Game (60 turns)

| Metric              | Target    |
| ------------------- | --------- |
| Empires unlocked    | 4–5 of 8  |
| Final route slots   | 8–10      |
| Techs researched    | 6–8 of 20 |
| Contracts completed | 6–10      |
| Final routes active | 6–8       |
| RP earned           | ~80–100   |

### Medium Game (80 turns)

| Metric              | Target      |
| ------------------- | ----------- |
| Empires unlocked    | 6–8 of 10   |
| Final route slots   | 10–13       |
| Techs researched    | 10–14 of 20 |
| Contracts completed | 10–16       |
| Final routes active | 8–11        |
| RP earned           | ~120–160    |

### Large Game (100 turns)

| Metric              | Target      |
| ------------------- | ----------- |
| Empires unlocked    | 9–12 of 12  |
| Final route slots   | 12–16       |
| Techs researched    | 14–20 of 20 |
| Contracts completed | 15–25       |
| Final routes active | 10–14       |
| RP earned           | ~160–220    |

---

## Game Flow Example (Small, 60 turns)

### Turns 1–5: Homeworld Setup

- Start with 3 slots + 1 home empire bonus = 4 slots
- Access to home empire + 2 adjacent = 3 empires
- Open 2–3 intra-empire routes in home empire
- 1–2 contracts available; take a Passenger Ferry for easy §15K + 2 RP
- Begin researching Efficient Scheduling (8 RP — completes ~turn 7)

### Turns 6–15: First Expansion

- Efficient Scheduling complete → 5 slots
- Empire unlock contract appears for 4th empire — loss-leader, costs ~§3K/turn for 5 turns
- Accept it, assign ship, absorb the cost
- Complete first inter-empire route with adjacent empire (1 cargo type: Technology)
- Take a Research Courier contract for 5 RP
- Research Cultural Exchange for tariff savings

### Turns 16–25: Growing Network

- 4th empire unlocked → 6 slots
- New empire offers interesting routes but Food is banned (Import Ban)
- Route options require real thought: Medical to their Research planet? Luxury to Resort?
- Trade Embargo event grounds your Technology route for 2 turns — pay mothball or reassign ship?
- Pick up Regional Hub Protocols for another slot + license fee discount

### Turns 26–40: Strategic Decisions

- 7–8 slots, access to 5 empires
- Choose: rush more empire unlocks (Empire Builder path) or research Fuel Injection (Engineering path)?
- Tariff War event between two of your empires — double tariffs for 4 turns
- Diplomatic Immunity tech would have prevented this... lesson learned
- Contract for Trade Alliance reduces tariffs between two key empires permanently

### Turns 41–60: Endgame Optimization

- 9–10 slots, 5–6 empires, 6–8 techs researched
- Saturation is real — need to rotate cargo types using Market Manipulation (if researched)
- Final push: optimize route network for max score
- Each slot precious — delete underperforming route to open a better one
- Score reflects your strategy: empire count, tech investment, cargo diversity, net worth

---

## Summary of Changes by File

### New Files

- `src/game/contracts/ContractGenerator.ts`
- `src/game/contracts/ContractManager.ts`
- `src/game/tech/TechTree.ts`
- `src/game/tech/TechEffects.ts`
- `src/game/empire/EmpirePolicyGenerator.ts`
- `src/game/empire/EmpireAccessManager.ts`
- `src/scenes/ContractsScene.ts`
- `src/scenes/TechTreeScene.ts`

### Modified Files

- `src/data/types.ts` — New types and GameState fields
- `src/data/constants.ts` — New constants, tech tree data
- `src/game/routes/RouteCalculator.ts` — Slot checks, cargo locks, trade policy validation
- `src/game/routes/RouteScanner.ts` — Filter by access, policies, slots
- `src/game/economy/PriceCalculator.ts` — Tech effect modifiers
- `src/game/fleet/FleetManager.ts` — Tech effect modifiers (maintenance, fuel, condition)
- `src/game/events/EventTemplates.ts` — New empire/trade events
- `src/game/events/EventProcessor.ts` — Mothball fees, tech-based duration changes
- `src/game/simulation/TurnSimulator.ts` — Contract processing, RP accumulation, tech effects
- `src/game/ai/AISimulator.ts` — Slot limits, trade restrictions, empire progression
- `src/game/scoring/ScoreCalculator.ts` — New bonus categories
- `src/game/NewGameSetup.ts` — Initialize new state fields
- `src/generation/GalaxyGenerator.ts` — Trade policy generation
- `src/scenes/RoutesScene.ts` — Empire filter, slot counter, restrictions
- `src/ui/RouteBuilderPanel.ts` — Slot validation, policy warnings
- `src/scenes/GalaxyMapScene.ts` — Empire focus mode, locked visuals
- `src/scenes/SystemMapScene.ts` — Locked overlay, policy icons
- `src/scenes/GameHUDScene.ts` — Slot indicator, RP progress, contract badge, nav updates
- `src/game/adviser/AdviserEngine.ts` — New messages for contracts, tech, empires
- `src/game/config.ts` — Scene registration for new scenes
