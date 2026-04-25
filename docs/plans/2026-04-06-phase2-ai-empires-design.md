# Phase 2: AI Competition & Galactic Empires — Design & Implementation Plan

**Date:** April 6, 2026  
**Phase:** Post-MVP → Full Game  
**Goal:** Transform the MVP sandbox into a competitive game with AI rivals, galactic empires/borders, and balanced game lengths (Small 20-30m, Medium 60m)

---

## 1. Game Size Presets

| Setting        | Small  | Medium  | Large    |
| -------------- | ------ | ------- | -------- |
| Turns          | 20     | 40      | 60       |
| Empires        | 3      | 5       | 7        |
| Systems/Empire | 3-4    | 4-6     | 5-7      |
| Planets/System | 3-5    | 3-6     | 3-6      |
| AI Companies   | 2      | 4       | 6        |
| Starting Cash  | §200K  | §250K   | §300K    |
| Starting Ships | 2      | 2       | 3        |
| Total Planets  | ~30-50 | ~70-120 | ~120-200 |

---

## 2. Galactic Empires (Replaces Sectors)

### Core Concept

Sectors become **Empires** — sovereign galactic nations. Each empire has:

- A name, color, and identity
- Territory (star systems within the empire)
- A **border crossing tariff** for inter-empire trade

### Empire Properties

```
Empire {
  id: string
  name: string           // "Terran Federation", "Kral Dominion", etc.
  color: number          // hex color for map display
  tariffRate: number     // 0.05-0.20 (5%-20% of cargo value)
  disposition: string    // friendly/neutral/hostile (flavor, affects tariff)
  homeSystemId: string   // capital system
}
```

### Border Crossing Mechanics (Aerobiz-inspired)

- **Intra-empire routes:** No tariff, normal operations
- **Inter-empire routes:** Tariff charged per trip = `cargoValue × tariffRate`
- Tariff rates vary by empire (5%-20%) and disposition
- **Friendly empires:** 5-8% tariff
- **Neutral empires:** 10-15% tariff
- **Hostile empires:** 15-20% tariff
- Tariffs are paid to the destination empire (abstracted away — just a cost)
- Events can modify tariff rates temporarily (trade agreements, embargoes)

### Empire Generation

- Empires replace the old sector concept
- Each empire gets 3-7 star systems (based on game size)
- Empire names from a themed generator (sci-fi faction names)
- Colors assigned from a palette ensuring visual distinction
- Empires positioned with spatial coherence on the galaxy map

---

## 3. AI Companies

### Core Design

AI companies are simplified competitors that:

- Operate routes, earn revenue, grow fleets
- Compete for market share (increase saturation at destinations)
- Are visible to the player (news reports, market impact)
- Can go bankrupt / be ranked against the player

### AI Company Properties

```
AICompany {
  id: string
  name: string              // "Kral Freight Corp", "Nova Logistics"
  empireId: string           // home empire
  cash: number
  fleet: Ship[]
  activeRoutes: ActiveRoute[]
  reputation: number
  totalCargoDelivered: number
  difficulty: 'easy' | 'medium' | 'hard'
  personality: AIPersonality
  bankrupt: boolean
}
```

### AI Personalities

- **Aggressive Expander:** Prioritizes buying ships and opening routes fast, higher bankruptcy risk
- **Steady Hauler:** Conservative, focuses on profitable intra-empire routes first
- **Cherry Picker:** Seeks the highest-margin routes, will cross borders for profit

### AI Turn Resolution

Each turn, AI companies:

1. **Earn revenue** from their active routes (simplified — uses same formulas as player)
2. **Pay costs** (fuel, maintenance, tariffs)
3. **Make decisions** based on personality:
   - Buy ships if cash > 2× cheapest ship cost
   - Open new routes if they have idle ships
   - Prefer intra-empire routes (Steady), cross-border routes (Cherry Picker), or any profitable (Aggressive)
4. **Impact markets** — AI deliveries increase saturation at destinations
5. **Can go bankrupt** — removed from competition

### AI Allocation to Empires

- Default: 1 AI company per empire (player claims one empire as "home")
- If more AI than empires: overflow AIs go to empires with most systems
- Player's home empire may or may not have an AI competitor
- AI companies get names themed to their home empire

---

## 4. Route Distance & Costs Update

### Distance Tiers

1. **Intra-system:** Very short (planet-to-planet within same system) — Distance 1-10
2. **Intra-empire:** Medium (system-to-system within same empire) — Distance 50-200
3. **Inter-empire:** Long (system-to-system across empires) — Distance 100-400+

### Cost Structure per Trip

```
Revenue = trips × capacity × destPrice
Fuel    = trips × distance × 2 × fuelEfficiency × fuelPrice
Tariff  = (inter-empire?) ? revenue × destEmpire.tariffRate : 0
Net     = Revenue - Fuel - Tariff
```

### Border Crossing Impact on Profit

The tariff makes inter-empire routes less profitable per-unit but:

- Prices at distant planets may be higher (less saturation from local AI/player)
- Creates strategic choice: safe/cheap local vs. risky/expensive distant routes
- Some cargo types are only produced in certain empire territories

---

## 5. Victory & Scoring Updates

### Win Conditions

- **Survive to final turn** (same as before)
- **Score-based ranking** against AI companies

### Updated Scoring

```
finalScore = netWorth + (reputation × 100) + (totalCargoDelivered × 0.5) + (routeCount × 500) + empireBonus

empireBonus = empiresTraded × 1000   // Bonus for trading across empires
```

### Game Over Screen Enhancement

- Show player ranking vs AI companies (1st place, 2nd place, etc.)
- Show each company's final score, net worth, routes
- Highlight if any AI went bankrupt

---

## 6. Updated Event System

### New Empire-Related Events

- **Trade Agreement:** Tariff reduced between two empires for 3 turns
- **Border Dispute:** Tariff doubled between two empires for 2 turns
- **Embargo:** Routes blocked between two empires for 1 turn
- **Empire Subsidy:** Home empire gives cash bonus to companies in its territory
- **Pirate Corridor:** Specific inter-empire routes have breakdown risk

---

## 7. Balance Design

### Small Game (20-30 minutes, 20 turns)

- 3 empires × 3-4 systems × 3-5 planets = ~30-50 planets
- 2 AI competitors
- Player starts with §200K, 2 ships
- Goal: survive, beat 2 AI in score
- Tight economy — every route matters
- AI starts with same resources as player

### Medium Game (45-60 minutes, 40 turns)

- 5 empires × 4-6 systems × 3-6 planets = ~70-120 planets
- 4 AI competitors
- Player starts with §250K, 2 ships
- More room to expand, cross-border trading becomes important mid-game
- AI has varied difficulty (1 easy, 2 medium, 1 hard)

### Tariff Balance

- Tariffs should make inter-empire routes ~10-20% less profitable than optimal intra-empire ones
- But distant markets have less saturation, so cross-border can be worth it
- This creates the Aerobiz "international routes are expensive but premium" dynamic

---

## 8. Implementation Order

### Phase A: Data Layer (Types, Constants, Config)

1. Add Empire type and AI company types to `types.ts`
2. Add game size config, empire constants, AI constants to `constants.ts`
3. Update GameState to include empires, AI companies, game size
4. Add `GameSize` type and presets

### Phase B: Generation

5. Update GalaxyGenerator to create empires (replaces sectors)
6. Add EmpireNameGenerator
7. Update NewGameSetup for game size selection and AI initialization

### Phase C: AI System

8. Create `src/game/ai/AICompany.ts` — AI decision-making
9. Create `src/game/ai/AISimulator.ts` — AI turn resolution

### Phase D: Game Logic Updates

10. Update RouteManager — tariff calculation for inter-empire routes
11. Update TurnSimulator — simulate AI turns, apply AI saturation
12. Update EventEngine — new empire-related events
13. Update ScoreCalculator — empire trading bonus, AI ranking

### Phase E: UI Updates

14. Update GalaxySetupScene — game size picker
15. Update GalaxyMapScene — show empire boundaries/colors
16. Update GameHUDScene — show AI company standings
17. Update TurnReportScene — show AI activity summary
18. Update GameOverScene — show final rankings vs AI

### Phase F: Testing

19. Write tests for AI simulation, tariff calculation, empire generation
20. Balance testing — verify game length targets
