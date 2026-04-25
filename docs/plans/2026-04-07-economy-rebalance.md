# Economy Rebalance — Anti-Snowball & Fun Mechanics

**Date:** 2026-04-07
**Goal:** Prevent buy-all-routes snowballing while keeping route-building fun. Create meaningful economic tension inspired by 16-bit cozy biz sims (Aerobiz, Transport Tycoon) with modern game design (Offworld Trading Company, Slipways, Mini Motorways).

---

## 1. Problem Analysis: Why The Player Snowballs

### Current Math (Small Game, 60 turns)

**Starting state:** 300k credits, 2 ships (Cargo Shuttle + Passenger Shuttle)

**Turn 1 best case — Cargo Shuttle on a short luxury route:**

- Distance ~100, speed 4 → trips = floor(100/(200/4)) = 2 trips
- 80 capacity × 2 trips × ~60 credits (luxury) = **9,600 revenue**
- Fuel: 2 × 200 × 0.8 × 10 = **3,200 fuel**
- Net: **~6,400/turn** per ship

**Turn 1 Passenger Shuttle:**

- 60 passengers × 2 trips × ~50 credits = **6,000 revenue**
- Fuel: 2 × 200 × 1.0 × 10 = **4,000 fuel**
- Net: **~2,000/turn**

**Combined: ~8,400 net/turn** with 2 starter ships

**Snowball path:**

- Turn 1: +8,400 → 308,400 cash
- By turn 5: +42k income, buy a Bulk Freighter (150k). 3 ships now.
- Bulk Freighter alone: 300 cap × 2 trips × 60 = 36,000 rev - ~2,400 fuel = **33,600/turn**
- By turn 10: ~200k banked after Bulk Freighter, buy another. 4 ships.
- By turn 15: 500k+ banked, buy MegaHauler (500k). 5 ships.
- MegaHauler: 800 × 2 × 60 = 96,000 - 1,200 fuel = **~95,000/turn alone**
- By turn 20: Player earning 150k+/turn. AI earning ~15k/turn. Game is decided.

### Root Causes

1. **No route creation cost** — Routes are free. Ship is the only gate.
2. **No capacity ceiling** — A planet can absorb infinite cargo with only a price penalty.
3. **Saturation is too weak** — 15% decay means markets recover in ~3 turns. Flooding a market has no lasting consequence.
4. **Ship scaling is linear** — MegaHauler is 10× Cargo Shuttle capacity but only 12.5× the cost. ROI improves with scale.
5. **No operating license / permit system** — No scarcity on who can trade where.
6. **AI starts weak** — AI gets 200k vs player's 300k, and makes worse decisions.

---

## 2. Design Pillars

### Inspired By:

- **Aerobiz Supersonic (SNES)** — Slot-limited routes, hub selection, franchise rights, seasonal demand
- **Transport Tycoon Deluxe** — Station ratings, cargo aging, subsidies, competitor blocking
- **Offworld Trading Company** — Finite resources, market manipulation, claim limits
- **Slipways** — Tight resource chains, every connection matters, no undo
- **Mini Motorways** — Elegant constraints create meaningful decisions from simple rules

### Design Goals:

1. **Route creation should be a meaningful commitment** (not free)
2. **Diminishing returns prevent infinite scaling** (soft cap on routes)
3. **Markets should punish flooding and reward diversification**
4. **Ships should have real trade-offs** (not just "bigger = better")
5. **Mid-game tension** — AI competition + events should threaten your lead
6. **Late-game feels earned** — Dominance comes from smart play, not just being first

---

## 3. Changes — The Rebalance

### 3A. Route License Fees (NEW)

Every route requires paying a **license fee** to operate. This is the main anti-snowball lever.

```
License Fee = BASE_LICENSE_FEE × distanceMultiplier × routeCountMultiplier

Where:
  BASE_LICENSE_FEE = 5,000
  distanceMultiplier = max(1.0, distance / 100)
  routeCountMultiplier = 1.0 + (existingRoutes × 0.25)
```

**Examples:**

- 1st route, distance 100: 5,000 × 1.0 × 1.0 = **5,000**
- 3rd route, distance 150: 5,000 × 1.5 × 1.5 = **11,250**
- 6th route, distance 200: 5,000 × 2.0 × 2.25 = **22,500**
- 10th route, distance 200: 5,000 × 2.0 × 3.5 = **35,000**

This makes each additional route progressively more expensive — the 10th route costs 7× the 1st.

### 3B. Stronger Saturation (REBALANCE)

Markets flood faster and recover slower:

```
Old: saturationIncrease = cargo / (baseDemand × 10)
New: saturationIncrease = cargo / (baseDemand × 5)

Old: SATURATION_DECAY_RATE = 0.15
New: SATURATION_DECAY_RATE = 0.08

Old: SATURATION_PRICE_IMPACT = 0.6  (max 60% price drop)
New: SATURATION_PRICE_IMPACT = 0.8  (max 80% price drop)
```

**Effect:** Dumping cargo floods markets 2× faster, and markets take ~12 turns to fully recover (vs ~6 before). This forces route diversification — you can't run 5 ships on the same luxury route.

### 3C. Ship Rebalance — Diminishing Scale

Bigger ships should have **per-unit inefficiencies** to prevent linear scaling:

| Ship              | Old Cap | New Cap | Old Cost | New Cost | Old Maint | New Maint | Notes                                           |
| ----------------- | ------- | ------- | -------- | -------- | --------- | --------- | ----------------------------------------------- |
| Cargo Shuttle     | 80      | 80      | 40k      | 40k      | 2k        | 2k        | Unchanged starter                               |
| Passenger Shuttle | 60      | 60      | 55k      | 55k      | 3k        | 3k        | Unchanged starter                               |
| Mixed Hauler      | 50/30   | 50/30   | 60k      | 60k      | 3.5k      | 3.5k      | Good early versatility                          |
| Fast Courier      | 30/10   | 30/10   | 80k      | 80k      | 5k        | 5k        | Speed niche                                     |
| Bulk Freighter    | 300     | 200     | 150k     | 180k     | 6k        | 8k        | Nerfed: was too efficient                       |
| Star Liner        | 200 pax | 150 pax | 250k     | 280k     | 10k       | 12k       | Nerfed proportionally                           |
| Mega Hauler       | 800     | 400     | 500k     | 500k     | 15k       | 22k       | Big nerf: halved capacity, 47% more maintenance |
| Luxury Liner      | 150 pax | 120 pax | 600k     | 600k     | 20k       | 25k       | Nerfed: premium but costly                      |

**Key insight:** The Bulk Freighter was the snowball ship. 300 cargo at 150k was 2 credits/capacity. Now it's 200 cargo at 180k = 0.9 credits/capacity — still good but doesn't obsolete small ships. MegaHauler drops from 1.6 cr/cap to 0.8 cr/cap, making it a late-game luxury, not a no-brainer.

### 3D. Fleet Maintenance Scaling (NEW)

Large fleets get progressively more expensive to maintain — representing bureaucracy, logistics, crew costs:

```
Fleet overhead = sum of all ship maintenance × (1 + fleetOverhead)
Where fleetOverhead = max(0, (fleetSize - 4) × 0.05)
```

**Examples:**

- 4 ships: 0% overhead (free threshold)
- 6 ships: 10% overhead
- 8 ships: 20% overhead
- 10 ships: 30% overhead
- 15 ships: 55% overhead

### 3E. Starting Cash & AI Parity (REBALANCE)

Reduce the starting advantage gap:

```
Old player start: 300k (small), 350k (medium), 400k (large)
New player start: 250k (small), 300k (medium), 350k (large)

Old AI start: 200k (all sizes)
New AI start: 200k (small), 250k (medium), 300k (large)

Old AI max routes: 8
New AI max routes: 12
```

### 3F. Cargo Price Rebalance

Make high-value goods rarer and riskier:

| Cargo         | Old Price | New Price | Notes                                |
| ------------- | --------- | --------- | ------------------------------------ |
| Raw Materials | 15        | 12        | Staple, abundant                     |
| Food          | 20        | 18        | Staple, reliable                     |
| Hazmat        | 35        | 40        | Risky premium                        |
| Technology    | 45        | 38        | Slightly less lucrative              |
| Passengers    | 50        | 45        | Was too easy money                   |
| Medical       | 55        | 50        | Niche but valuable                   |
| Luxury        | 60        | 55        | Was the snowball cargo - slight nerf |

### 3G. Fuel Efficiency Rebalance

Make fuel a real cost for big ships:

| Ship              | Old Fuel Eff | New Fuel Eff | Notes                         |
| ----------------- | ------------ | ------------ | ----------------------------- |
| Cargo Shuttle     | 0.8          | 0.8          |                               |
| Passenger Shuttle | 1.0          | 1.0          |                               |
| Mixed Hauler      | 1.2          | 1.2          |                               |
| Fast Courier      | 1.8          | 2.0          | Speed costs fuel              |
| Bulk Freighter    | 0.6          | 1.0          | Was unrealistically cheap     |
| Star Liner        | 1.4          | 1.5          |                               |
| Mega Hauler       | 0.5          | 1.2          | Was absurdly cheap - big nerf |
| Luxury Liner      | 1.6          | 1.8          |                               |

---

## 4. Expected Game Flow After Rebalance

### Turns 1-10: Establishment Phase

- Player runs 2-3 routes with starter ships (~6-8k net/turn)
- Save up for 3rd ship around turn 5-8
- License fees are cheap, markets are unsaturated
- **Decision:** Diversify cargo types or specialize early?

### Turns 11-25: Expansion Phase

- Player has 4-6 ships, 4-6 routes (~20-30k net/turn)
- License fees getting noticeable (6th route costs ~15-25k)
- AI companies competing for the same high-value routes
- Saturated markets force finding new trade pairs
- **Decision:** Expand to new empires (tariffs!) or dominate home turf?

### Turns 26-40: Competition Phase

- Fleet overhead adding 10-20% to costs
- Best routes are saturated — need to find niches
- Events create disruptions that reward flexibility
- AI might have 8-10 routes, competing head-to-head
- **Decision:** Buy a MegaHauler for one amazing route or 3 more shuttles?

### Turns 41-60: Mastery Phase

- Player earning 40-60k/turn if well-diversified
- Mega/Luxury ships profitable but not dominant
- Score optimization through empire diversity and reputation
- **Decision:** Consolidate for safety or push for high score?

### "Ideal" Player at Turn 60 (Small Game):

- **Fleet:** 8-10 ships (mix of sizes)
- **Routes:** 8-10 active routes across 3-4 empires
- **Cash:** ~500k-700k
- **Net worth vs AI:** 1.5-2x ahead (not 10x)

This is much healthier than the current state where a skilled player can be 10x+ ahead by turn 20.

---

## 5. Implementation Checklist

- [ ] Update `constants.ts`: new prices, ship stats, license fee constants, fleet overhead constant
- [ ] Update `RouteManager.ts`: add `calculateLicenseFee()` function
- [ ] Update `TurnSimulator.ts`: apply fleet overhead to maintenance
- [ ] Update `TurnSimulator.ts`: use new saturation formula (baseDemand × 5)
- [ ] Update `FleetManager.ts`: expose fleet overhead calculation
- [ ] Update `NewGameSetup.ts`: new starting cash values
- [ ] Update `AISimulator.ts`: new AI max routes, starting cash
- [ ] Update existing tests to match new values
- [ ] Add new tests for license fees and fleet overhead
