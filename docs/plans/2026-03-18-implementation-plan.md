# Star Freight Tycoon - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable MVP of Star Freight Tycoon — a space business tycoon sim with hybrid turn-based gameplay, procedural galaxy generation, dynamic economy, and full Phaser canvas UI.

**Architecture:** Scene-per-screen Phaser 3 game with centralized TypeScript game state (plain objects + EventEmitter). All game logic is pure functions testable without Phaser. UI is a reusable Phaser component library (Panel, Button, Table, etc.). Vite for bundling, Vitest for testing.

**Tech Stack:** Phaser 3.90+, TypeScript 5+, Vite, Vitest

**Design Doc:** `docs/plans/2026-03-16-star-freight-tycoon-design.md`

---

## Phase 1: Project Scaffolding

### Task 1.1: Initialize Vite + Phaser + TypeScript project

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/config.ts`
- Create: `.gitignore`

**Step 1: Scaffold project**

```bash
npm create vite@latest . -- --template vanilla-ts
npm install phaser@latest
npm install -D vitest @vitest/coverage-v8
```

**Step 2: Configure vite.config.ts**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "esnext",
  },
  test: {
    globals: true,
    environment: "node",
  },
});
```

**Step 3: Create Phaser game config**

```typescript
// src/game/config.ts
import Phaser from "phaser";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-container",
    backgroundColor: "#0a0a1a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}
```

**Step 4: Create entry point**

```typescript
// src/main.ts
import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import { BootScene } from "./scenes/BootScene";

const config = createGameConfig([BootScene]);
new Phaser.Game(config);
```

**Step 5: Create BootScene placeholder**

```typescript
// src/scenes/BootScene.ts
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    this.add
      .text(640, 360, "Star Freight Tycoon", {
        fontSize: "48px",
        color: "#00ffcc",
      })
      .setOrigin(0.5);
  }
}
```

**Step 6: Update index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Star Freight Tycoon</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: #000;
        overflow: hidden;
      }
      #game-container {
        width: 100vw;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="game-container"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 7: Verify it runs**

Run: `npx vite --open`
Expected: Browser opens, dark background with "Star Freight Tycoon" text centered.

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Phaser 3 + TypeScript + Vite project"
```

---

## Phase 2: Core Infrastructure

### Task 2.1: Seeded Random Number Generator

**Files:**

- Create: `src/utils/SeededRNG.ts`
- Test: `src/utils/__tests__/SeededRNG.test.ts`

**Step 1: Write failing tests**

```typescript
// src/utils/__tests__/SeededRNG.test.ts
import { describe, it, expect } from "vitest";
import { SeededRNG } from "../SeededRNG";

describe("SeededRNG", () => {
  it("produces deterministic results for same seed", () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());
    expect(results1).toEqual(results2);
  });

  it("produces different results for different seeds", () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);
    expect(rng1.next()).not.toEqual(rng2.next());
  });

  it("next() returns values between 0 and 1", () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("nextInt(min, max) returns integers in range", () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("nextFloat(min, max) returns floats in range", () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextFloat(1.0, 5.0);
      expect(val).toBeGreaterThanOrEqual(1.0);
      expect(val).toBeLessThan(5.0);
    }
  });

  it("pick() selects from array deterministically", () => {
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const items = ["a", "b", "c", "d", "e"];
    expect(rng1.pick(items)).toBe(rng2.pick(items));
  });

  it("shuffle() returns deterministic permutation", () => {
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const items = [1, 2, 3, 4, 5];
    expect(rng1.shuffle([...items])).toEqual(rng2.shuffle([...items]));
  });

  it("chance(probability) returns boolean", () => {
    const rng = new SeededRNG(42);
    let trueCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.chance(0.5)) trueCount++;
    }
    // Should be roughly 50% — allow wide margin
    expect(trueCount).toBeGreaterThan(400);
    expect(trueCount).toBeLessThan(600);
  });
});
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run src/utils/__tests__/SeededRNG.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement SeededRNG**

```typescript
// src/utils/SeededRNG.ts
// Mulberry32 — fast, good distribution, 32-bit state
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}
```

**Step 4: Run tests to verify pass**

Run: `npx vitest run src/utils/__tests__/SeededRNG.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/utils/ && git commit -m "feat: add SeededRNG with Mulberry32 algorithm"
```

---

### Task 2.2: EventEmitter for Game State

**Files:**

- Create: `src/utils/EventEmitter.ts`
- Test: `src/utils/__tests__/EventEmitter.test.ts`

**Step 1: Write failing tests**

```typescript
// src/utils/__tests__/EventEmitter.test.ts
import { describe, it, expect, vi } from "vitest";
import { GameEventEmitter } from "../EventEmitter";

describe("GameEventEmitter", () => {
  it("calls listener when event is emitted", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.on("test", listener);
    emitter.emit("test", { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it("supports multiple listeners", () => {
    const emitter = new GameEventEmitter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    emitter.on("test", l1);
    emitter.on("test", l2);
    emitter.emit("test", {});
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
  });

  it("off() removes listener", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.on("test", listener);
    emitter.off("test", listener);
    emitter.emit("test", {});
    expect(listener).not.toHaveBeenCalled();
  });

  it("once() fires only once", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.once("test", listener);
    emitter.emit("test", {});
    emitter.emit("test", {});
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing when emitting event with no listeners", () => {
    const emitter = new GameEventEmitter();
    expect(() => emitter.emit("nothing", {})).not.toThrow();
  });
});
```

**Step 2: Implement EventEmitter**

```typescript
// src/utils/EventEmitter.ts
type Listener = (data: any) => void;

export class GameEventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  once(event: string, listener: Listener): void {
    const wrapper: Listener = (data) => {
      this.off(event, wrapper);
      listener(data);
    };
    this.on(event, wrapper);
  }

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }
}
```

**Step 3: Run tests**

Run: `npx vitest run src/utils/__tests__/EventEmitter.test.ts`
Expected: All PASS.

**Step 4: Commit**

```bash
git add src/utils/ && git commit -m "feat: add GameEventEmitter for state change notifications"
```

---

### Task 2.3: Game State Types & Interfaces

**Files:**

- Create: `src/data/types.ts`
- Create: `src/data/constants.ts`

**Step 1: Define all game types**

```typescript
// src/data/types.ts

// --- Enums ---
export type GamePhase = "planning" | "simulation" | "review";
export type Trend = "rising" | "stable" | "falling";

export enum CargoType {
  Passengers = "passengers",
  RawMaterials = "rawMaterials",
  Food = "food",
  Technology = "technology",
  Luxury = "luxury",
  Hazmat = "hazmat",
  Medical = "medical",
}

export enum PlanetType {
  Terran = "terran",
  Industrial = "industrial",
  Mining = "mining",
  Agricultural = "agricultural",
  HubStation = "hubStation",
  Resort = "resort",
  Research = "research",
}

export enum ShipClass {
  CargoShuttle = "cargoShuttle",
  PassengerShuttle = "passengerShuttle",
  MixedHauler = "mixedHauler",
  FastCourier = "fastCourier",
  BulkFreighter = "bulkFreighter",
  StarLiner = "starLiner",
  MegaHauler = "megaHauler",
  LuxuryLiner = "luxuryLiner",
}

export enum EventCategory {
  Market = "market",
  Hazard = "hazard",
  Opportunity = "opportunity",
  Flavor = "flavor",
}

// --- Galaxy ---
export interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
}

export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  x: number;
  y: number;
  starColor: number;
}

export interface Planet {
  id: string;
  name: string;
  systemId: string;
  type: PlanetType;
  x: number;
  y: number;
  population: number;
}

// --- Economy ---
export interface CargoMarketEntry {
  baseSupply: number;
  baseDemand: number;
  currentPrice: number;
  saturation: number;
  trend: Trend;
  trendMomentum: number;
  eventModifier: number;
}

export type PlanetMarket = Record<CargoType, CargoMarketEntry>;

export interface MarketState {
  fuelPrice: number;
  fuelTrend: Trend;
  planetMarkets: Record<string, PlanetMarket>; // keyed by planet ID
}

// --- Ships ---
export interface ShipTemplate {
  class: ShipClass;
  name: string;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  baseReliability: number;
  purchaseCost: number;
  baseMaintenance: number;
}

export interface Ship {
  id: string;
  name: string;
  class: ShipClass;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  reliability: number;
  age: number;
  condition: number;
  purchaseCost: number;
  maintenanceCost: number;
  assignedRouteId: string | null;
}

// --- Routes ---
export interface ActiveRoute {
  id: string;
  originPlanetId: string;
  destinationPlanetId: string;
  distance: number;
  assignedShipIds: string[];
  cargoType: CargoType | null; // null = auto-fill based on demand
}

// --- Events ---
export interface GameEvent {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  duration: number; // turns remaining
  effects: EventEffect[];
  requiresChoice?: boolean;
  choices?: EventChoice[];
}

export interface EventEffect {
  type:
    | "modifyPrice"
    | "blockRoute"
    | "modifySpeed"
    | "modifyDemand"
    | "modifyCash"
    | "modifyReputation"
    | "blockPassengers";
  targetId?: string; // planet, system, or route ID
  cargoType?: CargoType;
  value: number;
}

export interface EventChoice {
  label: string;
  effects: EventEffect[];
}

// --- Finance ---
export interface Loan {
  id: string;
  principal: number;
  interestRate: number; // quarterly rate
  remainingBalance: number;
  turnTaken: number;
}

// --- Turn History ---
export interface TurnResult {
  turn: number;
  revenue: number;
  fuelCosts: number;
  maintenanceCosts: number;
  loanPayments: number;
  otherCosts: number;
  netProfit: number;
  cashAtEnd: number;
  cargoDelivered: Record<CargoType, number>;
  passengersTransported: number;
  eventsOccurred: string[]; // event IDs
  routePerformance: RoutePerformance[];
}

export interface RoutePerformance {
  routeId: string;
  trips: number;
  revenue: number;
  fuelCost: number;
  cargoMoved: number;
  passengersMoved: number;
  breakdowns: number;
}

// --- Storyteller ---
export interface StorytellerState {
  playerHealthScore: number; // 0-100, derived from cash/assets/trend
  headwindBias: number; // -1 to 1, positive = more headwinds
  turnsInDebt: number;
  consecutiveProfitTurns: number;
}

// --- Top-level Game State ---
export interface GameState {
  seed: number;
  turn: number;
  maxTurns: number;
  phase: GamePhase;
  cash: number;
  loans: Loan[];
  reputation: number;
  companyName: string;

  galaxy: {
    sectors: Sector[];
    systems: StarSystem[];
    planets: Planet[];
  };

  fleet: Ship[];
  activeRoutes: ActiveRoute[];
  market: MarketState;
  activeEvents: GameEvent[];
  history: TurnResult[];
  storyteller: StorytellerState;

  score: number;
  gameOver: boolean;
  gameOverReason: string | null;
}
```

**Step 2: Define constants**

```typescript
// src/data/constants.ts
import { ShipClass, ShipTemplate, PlanetType, CargoType } from "./types";

export const STARTING_CASH = 200000;
export const MAX_TURNS = 20;
export const BASE_FUEL_PRICE = 10;
export const MAX_LOAN_AMOUNT = 500000;
export const LOAN_INTEREST_RATE_MIN = 0.05;
export const LOAN_INTEREST_RATE_MAX = 0.08;
export const SATURATION_DECAY_RATE = 0.15;
export const SATURATION_PRICE_IMPACT = 0.6;
export const CONDITION_DECAY_MIN = 2;
export const CONDITION_DECAY_MAX = 5;
export const OVERHAUL_COST_RATIO = 0.3;
export const OVERHAUL_RESTORE_CONDITION = 90;
export const BREAKDOWN_THRESHOLD = 50;
export const TURN_DURATION = 100; // abstract time units per quarter

export const SHIP_TEMPLATES: Record<ShipClass, ShipTemplate> = {
  [ShipClass.CargoShuttle]: {
    class: ShipClass.CargoShuttle,
    name: "Cargo Shuttle",
    cargoCapacity: 80,
    passengerCapacity: 0,
    speed: 4,
    fuelEfficiency: 0.8,
    baseReliability: 92,
    purchaseCost: 40000,
    baseMaintenance: 2000,
  },
  [ShipClass.PassengerShuttle]: {
    class: ShipClass.PassengerShuttle,
    name: "Passenger Shuttle",
    cargoCapacity: 0,
    passengerCapacity: 60,
    speed: 5,
    fuelEfficiency: 1.0,
    baseReliability: 90,
    purchaseCost: 55000,
    baseMaintenance: 3000,
  },
  [ShipClass.MixedHauler]: {
    class: ShipClass.MixedHauler,
    name: "Mixed Hauler",
    cargoCapacity: 50,
    passengerCapacity: 30,
    speed: 3,
    fuelEfficiency: 1.2,
    baseReliability: 88,
    purchaseCost: 60000,
    baseMaintenance: 3500,
  },
  [ShipClass.FastCourier]: {
    class: ShipClass.FastCourier,
    name: "Fast Courier",
    cargoCapacity: 30,
    passengerCapacity: 10,
    speed: 8,
    fuelEfficiency: 1.8,
    baseReliability: 85,
    purchaseCost: 80000,
    baseMaintenance: 5000,
  },
  [ShipClass.BulkFreighter]: {
    class: ShipClass.BulkFreighter,
    name: "Bulk Freighter",
    cargoCapacity: 300,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 0.6,
    baseReliability: 94,
    purchaseCost: 150000,
    baseMaintenance: 6000,
  },
  [ShipClass.StarLiner]: {
    class: ShipClass.StarLiner,
    name: "Star Liner",
    cargoCapacity: 0,
    passengerCapacity: 200,
    speed: 6,
    fuelEfficiency: 1.4,
    baseReliability: 88,
    purchaseCost: 250000,
    baseMaintenance: 10000,
  },
  [ShipClass.MegaHauler]: {
    class: ShipClass.MegaHauler,
    name: "Mega Hauler",
    cargoCapacity: 800,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 0.5,
    baseReliability: 90,
    purchaseCost: 500000,
    baseMaintenance: 15000,
  },
  [ShipClass.LuxuryLiner]: {
    class: ShipClass.LuxuryLiner,
    name: "Luxury Liner",
    cargoCapacity: 20,
    passengerCapacity: 150,
    speed: 7,
    fuelEfficiency: 1.6,
    baseReliability: 86,
    purchaseCost: 600000,
    baseMaintenance: 20000,
  },
};

// What each planet type produces (high supply) and demands (high demand)
export const PLANET_CARGO_PROFILES: Record<
  PlanetType,
  { produces: CargoType[]; demands: CargoType[] }
> = {
  [PlanetType.Terran]: {
    produces: [CargoType.Technology, CargoType.Luxury],
    demands: [CargoType.Food, CargoType.RawMaterials],
  },
  [PlanetType.Industrial]: {
    produces: [CargoType.Technology],
    demands: [CargoType.RawMaterials, CargoType.Food],
  },
  [PlanetType.Mining]: {
    produces: [CargoType.RawMaterials, CargoType.Hazmat],
    demands: [CargoType.Technology, CargoType.Food, CargoType.Medical],
  },
  [PlanetType.Agricultural]: {
    produces: [CargoType.Food],
    demands: [CargoType.Technology, CargoType.Luxury],
  },
  [PlanetType.HubStation]: {
    produces: [],
    demands: [
      CargoType.Food,
      CargoType.Technology,
      CargoType.Luxury,
      CargoType.Medical,
    ],
  },
  [PlanetType.Resort]: {
    produces: [CargoType.Luxury],
    demands: [CargoType.Food, CargoType.Medical],
  },
  [PlanetType.Research]: {
    produces: [CargoType.Medical, CargoType.Technology],
    demands: [CargoType.Food, CargoType.RawMaterials, CargoType.Luxury],
  },
};

export const PLANET_PASSENGER_VOLUME: Record<PlanetType, number> = {
  [PlanetType.Terran]: 80,
  [PlanetType.Industrial]: 50,
  [PlanetType.Mining]: 20,
  [PlanetType.Agricultural]: 20,
  [PlanetType.HubStation]: 100,
  [PlanetType.Resort]: 80,
  [PlanetType.Research]: 15,
};

export const BASE_CARGO_PRICES: Record<CargoType, number> = {
  [CargoType.Passengers]: 50,
  [CargoType.RawMaterials]: 15,
  [CargoType.Food]: 20,
  [CargoType.Technology]: 45,
  [CargoType.Luxury]: 60,
  [CargoType.Hazmat]: 35,
  [CargoType.Medical]: 55,
};
```

**Step 3: Commit**

```bash
git add src/data/ && git commit -m "feat: define game state types, interfaces, and constants"
```

---

### Task 2.4: GameStore — centralized state manager

**Files:**

- Create: `src/data/GameStore.ts`
- Test: `src/data/__tests__/GameStore.test.ts`

**Step 1: Write failing tests**

```typescript
// src/data/__tests__/GameStore.test.ts
import { describe, it, expect, vi } from "vitest";
import { GameStore } from "../GameStore";

describe("GameStore", () => {
  it("initializes with default state", () => {
    const store = new GameStore();
    expect(store.getState().turn).toBe(1);
    expect(store.getState().phase).toBe("planning");
    expect(store.getState().cash).toBe(200000);
  });

  it("updates state and emits change event", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("stateChanged", listener);
    store.update({ cash: 150000 });
    expect(store.getState().cash).toBe(150000);
    expect(listener).toHaveBeenCalled();
  });

  it("serializes and deserializes state", () => {
    const store = new GameStore();
    store.update({ cash: 99999, turn: 5 });
    const json = store.serialize();
    const store2 = new GameStore();
    store2.deserialize(json);
    expect(store2.getState().cash).toBe(99999);
    expect(store2.getState().turn).toBe(5);
  });

  it("emits specific field change events", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("cashChanged", listener);
    store.update({ cash: 180000 });
    expect(listener).toHaveBeenCalledWith(180000);
  });
});
```

**Step 2: Implement GameStore**

```typescript
// src/data/GameStore.ts
import { GameState, GamePhase } from "./types";
import { GameEventEmitter } from "../utils/EventEmitter";
import { STARTING_CASH, MAX_TURNS } from "./constants";

function createDefaultState(): GameState {
  return {
    seed: Date.now(),
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "New Ventures Inc.",
    galaxy: { sectors: [], systems: [], planets: [] },
    fleet: [],
    activeRoutes: [],
    market: { fuelPrice: 10, fuelTrend: "stable", planetMarkets: {} },
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
  };
}

export class GameStore extends GameEventEmitter {
  private state: GameState;

  constructor() {
    super();
    this.state = createDefaultState();
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  update(partial: Partial<GameState>): void {
    const oldState = { ...this.state };
    Object.assign(this.state, partial);
    this.emit("stateChanged", this.state);

    // Emit specific field change events
    for (const key of Object.keys(partial) as (keyof GameState)[]) {
      if (oldState[key] !== this.state[key]) {
        this.emit(`${key}Changed`, this.state[key]);
      }
    }
  }

  setState(state: GameState): void {
    this.state = state;
    this.emit("stateChanged", this.state);
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  deserialize(json: string): void {
    this.state = JSON.parse(json);
    this.emit("stateChanged", this.state);
  }

  reset(seed?: number): void {
    this.state = createDefaultState();
    if (seed !== undefined) this.state.seed = seed;
    this.emit("stateChanged", this.state);
  }
}

// Singleton for global access
export const gameStore = new GameStore();
```

**Step 3: Run tests**

Run: `npx vitest run src/data/__tests__/GameStore.test.ts`
Expected: All PASS.

**Step 4: Commit**

```bash
git add src/data/ && git commit -m "feat: add GameStore with event-driven state management"
```

---

## Phase 3: UI Component Library

### Task 3.1: Theme System & Asset Generation

**Files:**

- Create: `src/ui/Theme.ts`
- Create: `src/scenes/BootScene.ts` (update to generate procedural textures)

**Step 1: Define theme config**

```typescript
// src/ui/Theme.ts
export interface ThemeConfig {
  colors: {
    background: number;
    panelBg: number;
    panelBorder: number;
    text: number;
    textDim: number;
    accent: number;
    accentHover: number;
    profit: number;
    loss: number;
    warning: number;
    buttonBg: number;
    buttonHover: number;
    buttonPressed: number;
    buttonDisabled: number;
    scrollbarTrack: number;
    scrollbarThumb: number;
    headerBg: number;
    rowEven: number;
    rowOdd: number;
    rowHover: number;
    modalOverlay: number;
  };
  fonts: {
    heading: { size: number; family: string };
    body: { size: number; family: string };
    caption: { size: number; family: string };
    value: { size: number; family: string };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  panel: {
    borderWidth: number;
    cornerRadius: number;
    titleHeight: number;
  };
  button: {
    height: number;
    minWidth: number;
    borderWidth: number;
  };
}

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    background: 0x0a0a1a,
    panelBg: 0x111128,
    panelBorder: 0x2a2a5a,
    text: 0xe0e0ff,
    textDim: 0x8080aa,
    accent: 0x00ffcc,
    accentHover: 0x33ffdd,
    profit: 0x00ff88,
    loss: 0xff4444,
    warning: 0xffaa00,
    buttonBg: 0x1a1a40,
    buttonHover: 0x2a2a60,
    buttonPressed: 0x0a0a30,
    buttonDisabled: 0x151530,
    scrollbarTrack: 0x0a0a20,
    scrollbarThumb: 0x3a3a6a,
    headerBg: 0x1a1a3a,
    rowEven: 0x111128,
    rowOdd: 0x151535,
    rowHover: 0x1a1a44,
    modalOverlay: 0x000000,
  },
  fonts: {
    heading: { size: 24, family: "monospace" },
    body: { size: 16, family: "monospace" },
    caption: { size: 12, family: "monospace" },
    value: { size: 18, family: "monospace" },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  panel: { borderWidth: 2, cornerRadius: 4, titleHeight: 36 },
  button: { height: 40, minWidth: 120, borderWidth: 2 },
};

let currentTheme: ThemeConfig = DEFAULT_THEME;

export function getTheme(): ThemeConfig {
  return currentTheme;
}

export function setTheme(theme: ThemeConfig): void {
  currentTheme = theme;
}

export function colorToString(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}
```

**Step 2: Update BootScene to generate procedural textures for UI**

```typescript
// src/scenes/BootScene.ts — generates textures used by UI components
import Phaser from "phaser";
import { getTheme } from "../ui/Theme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const theme = getTheme();
    this.generatePanelTexture(
      "panel-bg",
      theme.colors.panelBg,
      theme.colors.panelBorder,
    );
    this.generateButtonTextures(theme);
    this.generatePixelTexture("pixel-white", 0xffffff);

    // Proceed to main menu after textures are ready
    this.scene.start("MainMenuScene");
  }

  private generatePanelTexture(
    key: string,
    fill: number,
    border: number,
  ): void {
    const size = 32;
    const bw = 2;
    const graphics = this.add.graphics();
    graphics.fillStyle(border, 1);
    graphics.fillRect(0, 0, size, size);
    graphics.fillStyle(fill, 1);
    graphics.fillRect(bw, bw, size - bw * 2, size - bw * 2);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private generateButtonTextures(theme: ThemeConfig): void {
    for (const [suffix, color] of [
      ["normal", theme.colors.buttonBg],
      ["hover", theme.colors.buttonHover],
      ["pressed", theme.colors.buttonPressed],
      ["disabled", theme.colors.buttonDisabled],
    ] as const) {
      const size = 32;
      const bw = 2;
      const g = this.add.graphics();
      g.fillStyle(theme.colors.panelBorder, 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(color, 1);
      g.fillRect(bw, bw, size - bw * 2, size - bw * 2);
      g.generateTexture(`btn-${suffix}`, size, size);
      g.destroy();
    }
  }

  private generatePixelTexture(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture(key, 4, 4);
    g.destroy();
  }
}
```

**Step 3: Commit**

```bash
git add src/ui/ src/scenes/ && git commit -m "feat: add theme system and procedural UI texture generation"
```

---

### Task 3.2: Panel Component

**Files:**

- Create: `src/ui/Panel.ts`

**Step 1: Implement Panel**

```typescript
// src/ui/Panel.ts
import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  draggable?: boolean;
}

export class Panel extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.NineSlice;
  protected titleBar: Phaser.GameObjects.Container | null = null;
  protected contentY: number;
  protected panelWidth: number;
  protected panelHeight: number;

  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.panelWidth = config.width;
    this.panelHeight = config.height;

    // Background
    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        config.height,
        4,
        4,
        4,
        4,
      )
      .setOrigin(0, 0);
    this.add(this.bg);

    this.contentY = theme.spacing.sm;

    // Title bar
    if (config.title) {
      const titleBg = scene.add
        .rectangle(
          0,
          0,
          config.width,
          theme.panel.titleHeight,
          theme.colors.headerBg,
        )
        .setOrigin(0, 0);

      const titleText = scene.add.text(
        theme.spacing.md,
        theme.spacing.sm,
        config.title,
        {
          fontSize: `${theme.fonts.heading.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.colors.accent),
        },
      );

      this.titleBar = scene.add.container(0, 0, [titleBg, titleText]);
      this.add(this.titleBar);
      this.contentY = theme.panel.titleHeight + theme.spacing.sm;
    }

    // Draggable
    if (config.draggable) {
      const hitArea = this.titleBar || this.bg;
      (hitArea as Phaser.GameObjects.GameObject).setInteractive({
        draggable: true,
      });
      scene.input.setDraggable(hitArea as Phaser.GameObjects.GameObject);
      hitArea.on(
        "drag",
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          this.x += dragX;
          this.y += dragY;
        },
      );
    }

    scene.add.existing(this);
  }

  getContentY(): number {
    return this.contentY;
  }

  getContentArea(): { x: number; y: number; width: number; height: number } {
    const theme = getTheme();
    return {
      x: theme.spacing.sm,
      y: this.contentY,
      width: this.panelWidth - theme.spacing.sm * 2,
      height: this.panelHeight - this.contentY - theme.spacing.sm,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/ui/ && git commit -m "feat: add Panel UI component with title bar and drag support"
```

---

### Task 3.3: Button Component

**Files:**

- Create: `src/ui/Button.ts`

**Step 1: Implement Button**

```typescript
// src/ui/Button.ts
import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface ButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private label: Phaser.GameObjects.Text;
  private isDisabled: boolean;
  private onClickFn: () => void;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const width = config.width ?? theme.button.minWidth;
    const height = config.height ?? theme.button.height;
    this.isDisabled = config.disabled ?? false;
    this.onClickFn = config.onClick;

    const textureKey = this.isDisabled ? "btn-disabled" : "btn-normal";
    this.bg = scene.add
      .nineslice(0, 0, textureKey, undefined, width, height, 4, 4, 4, 4)
      .setOrigin(0, 0);

    const textColor = this.isDisabled
      ? colorToString(theme.colors.textDim)
      : colorToString(theme.colors.text);
    this.label = scene.add
      .text(width / 2, height / 2, config.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: textColor,
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);

    if (!this.isDisabled) {
      this.bg.setInteractive({ useHandCursor: true });
      this.bg.on("pointerover", () => this.setTexture("btn-hover"));
      this.bg.on("pointerout", () => this.setTexture("btn-normal"));
      this.bg.on("pointerdown", () => this.setTexture("btn-pressed"));
      this.bg.on("pointerup", () => {
        this.setTexture("btn-hover");
        this.onClickFn();
      });
    }

    scene.add.existing(this);
  }

  private setTexture(key: string): void {
    this.bg.setTexture(key);
  }

  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    const theme = getTheme();
    if (disabled) {
      this.bg.setTexture("btn-disabled");
      this.bg.removeInteractive();
      this.label.setColor(colorToString(theme.colors.textDim));
    } else {
      this.bg.setTexture("btn-normal");
      this.bg.setInteractive({ useHandCursor: true });
      this.label.setColor(colorToString(theme.colors.text));
    }
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }
}
```

**Step 2: Commit**

```bash
git add src/ui/ && git commit -m "feat: add Button UI component with hover/press/disabled states"
```

---

### Task 3.4: Label Component

**Files:**

- Create: `src/ui/Label.ts`

```typescript
// src/ui/Label.ts
import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export type LabelStyle = "heading" | "body" | "caption" | "value";

export interface LabelConfig {
  x: number;
  y: number;
  text: string;
  style?: LabelStyle;
  color?: number;
  maxWidth?: number;
}

export class Label extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, config: LabelConfig) {
    const theme = getTheme();
    const fontConfig = theme.fonts[config.style ?? "body"];
    const color = config.color ?? theme.colors.text;

    super(scene, config.x, config.y, config.text, {
      fontSize: `${fontConfig.size}px`,
      fontFamily: fontConfig.family,
      color: colorToString(color),
      wordWrap: config.maxWidth ? { width: config.maxWidth } : undefined,
    });

    scene.add.existing(this);
  }

  setLabelColor(color: number): this {
    this.setColor(colorToString(color));
    return this;
  }
}
```

**Commit:**

```bash
git add src/ui/ && git commit -m "feat: add Label UI component with style variants"
```

---

### Task 3.5: ScrollableList Component

**Files:**

- Create: `src/ui/ScrollableList.ts`

```typescript
// src/ui/ScrollableList.ts
import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface ScrollableListConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  itemHeight: number;
  onSelect?: (index: number) => void;
}

export class ScrollableList extends Phaser.GameObjects.Container {
  private items: Phaser.GameObjects.Container[] = [];
  private mask!: Phaser.Display.Masks.GeometryMask;
  private contentContainer: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private config: ScrollableListConfig;
  private selectedIndex = -1;

  constructor(scene: Phaser.Scene, config: ScrollableListConfig) {
    super(scene, config.x, config.y);
    this.config = config;

    // Clipping mask
    const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(config.x, config.y, config.width, config.height);
    this.mask = maskShape.createGeometryMask();

    this.contentContainer = scene.add.container(0, 0);
    this.contentContainer.setMask(this.mask);
    this.add(this.contentContainer);

    // Scroll via mouse wheel
    const hitArea = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(hitArea);

    hitArea.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _dx: number,
        _dy: number,
        dz: number,
      ) => {
        this.scrollBy(dz * 0.5);
      },
    );

    scene.add.existing(this);
  }

  setItems(
    renderFn: (
      index: number,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => Phaser.GameObjects.Container,
  ): void {
    // renderFn is called per-item; caller creates the visuals
    // This is set up by the caller after construction
  }

  addItem(container: Phaser.GameObjects.Container): void {
    const index = this.items.length;
    const y = index * this.config.itemHeight;
    container.setPosition(0, y);
    this.items.push(container);
    this.contentContainer.add(container);
    this.maxScroll = Math.max(
      0,
      this.items.length * this.config.itemHeight - this.config.height,
    );

    // Make item clickable
    const theme = getTheme();
    const hitBg = this.scene.add
      .rectangle(
        0,
        0,
        this.config.width,
        this.config.itemHeight,
        index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
      )
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    hitBg.on("pointerover", () => hitBg.setFillStyle(theme.colors.rowHover));
    hitBg.on("pointerout", () =>
      hitBg.setFillStyle(
        index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
      ),
    );
    hitBg.on("pointerup", () => {
      this.selectedIndex = index;
      this.config.onSelect?.(index);
    });

    container.addAt(hitBg, 0);
  }

  clearItems(): void {
    this.items.forEach((item) => item.destroy());
    this.items = [];
    this.scrollY = 0;
    this.maxScroll = 0;
  }

  private scrollBy(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.contentContainer.y = -this.scrollY;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }
}
```

**Commit:**

```bash
git add src/ui/ && git commit -m "feat: add ScrollableList UI component with mask scrolling"
```

---

### Task 3.6: DataTable Component

**Files:**

- Create: `src/ui/DataTable.ts`

```typescript
// src/ui/DataTable.ts
import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  format?: (value: any) => string;
  colorFn?: (value: any) => number | null;
}

export interface DataTableConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  columns: ColumnDef[];
  onRowSelect?: (rowIndex: number, rowData: Record<string, any>) => void;
}

export class DataTable extends Phaser.GameObjects.Container {
  private columns: ColumnDef[];
  private rows: Record<string, any>[] = [];
  private headerContainer: Phaser.GameObjects.Container;
  private bodyContainer: Phaser.GameObjects.Container;
  private mask!: Phaser.Display.Masks.GeometryMask;
  private scrollY = 0;
  private maxScroll = 0;
  private config: DataTableConfig;
  private rowHeight = 32;
  private headerHeight = 36;
  private sortKey: string | null = null;
  private sortAsc = true;
  private selectedRow = -1;

  constructor(scene: Phaser.Scene, config: DataTableConfig) {
    super(scene, config.x, config.y);
    this.config = config;
    this.columns = config.columns;

    this.headerContainer = scene.add.container(0, 0);
    this.add(this.headerContainer);

    this.bodyContainer = scene.add.container(0, this.headerHeight);
    this.add(this.bodyContainer);

    // Mask for body scrolling
    const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      config.x,
      config.y + this.headerHeight,
      config.width,
      config.height - this.headerHeight,
    );
    this.mask = maskShape.createGeometryMask();
    this.bodyContainer.setMask(this.mask);

    // Scroll input
    const scrollHit = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(scrollHit);
    scrollHit.on("wheel", (_p: any, _dx: number, _dy: number, dz: number) => {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY + dz * 0.5,
        0,
        this.maxScroll,
      );
      this.bodyContainer.y = this.headerHeight - this.scrollY;
    });

    this.renderHeader();
    scene.add.existing(this);
  }

  private renderHeader(): void {
    const theme = getTheme();
    this.headerContainer.removeAll(true);

    const bg = this.scene.add
      .rectangle(
        0,
        0,
        this.config.width,
        this.headerHeight,
        theme.colors.headerBg,
      )
      .setOrigin(0, 0);
    this.headerContainer.add(bg);

    let x = 0;
    for (const col of this.columns) {
      const text = this.scene.add.text(x + 8, 8, col.label, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accent),
      });

      if (col.sortable) {
        const hitArea = this.scene.add
          .rectangle(x, 0, col.width, this.headerHeight, 0x000000, 0)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        hitArea.on("pointerup", () => {
          if (this.sortKey === col.key) {
            this.sortAsc = !this.sortAsc;
          } else {
            this.sortKey = col.key;
            this.sortAsc = true;
          }
          this.renderBody();
        });
        this.headerContainer.add(hitArea);
      }

      this.headerContainer.add(text);
      x += col.width;
    }
  }

  setData(rows: Record<string, any>[]): void {
    this.rows = [...rows];
    this.selectedRow = -1;
    this.scrollY = 0;
    this.renderBody();
  }

  private renderBody(): void {
    const theme = getTheme();
    this.bodyContainer.removeAll(true);
    this.bodyContainer.y = this.headerHeight;

    let sortedRows = [...this.rows];
    if (this.sortKey) {
      const key = this.sortKey;
      const dir = this.sortAsc ? 1 : -1;
      sortedRows.sort((a, b) => {
        if (a[key] < b[key]) return -1 * dir;
        if (a[key] > b[key]) return 1 * dir;
        return 0;
      });
    }

    sortedRows.forEach((row, i) => {
      const y = i * this.rowHeight;
      const bgColor = i % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd;
      const rowBg = this.scene.add
        .rectangle(0, y, this.config.width, this.rowHeight, bgColor)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      rowBg.on("pointerover", () => rowBg.setFillStyle(theme.colors.rowHover));
      rowBg.on("pointerout", () => rowBg.setFillStyle(bgColor));
      rowBg.on("pointerup", () => {
        this.selectedRow = i;
        this.config.onRowSelect?.(i, row);
      });

      this.bodyContainer.add(rowBg);

      let x = 0;
      for (const col of this.columns) {
        const raw = row[col.key];
        const display = col.format ? col.format(raw) : String(raw ?? "");
        const color = col.colorFn ? col.colorFn(raw) : theme.colors.text;

        const text = this.scene.add.text(x + 8, y + 8, display, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(color ?? theme.colors.text),
        });

        if (col.align === "right") {
          text.setOrigin(1, 0).setX(x + col.width - 8);
        } else if (col.align === "center") {
          text.setOrigin(0.5, 0).setX(x + col.width / 2);
        }

        this.bodyContainer.add(text);
        x += col.width;
      }
    });

    this.maxScroll = Math.max(
      0,
      sortedRows.length * this.rowHeight -
        (this.config.height - this.headerHeight),
    );
  }
}
```

**Commit:**

```bash
git add src/ui/ && git commit -m "feat: add DataTable UI component with sorting and scrolling"
```

---

### Task 3.7: ProgressBar, Modal, Tooltip, TabGroup

**Files:**

- Create: `src/ui/ProgressBar.ts`
- Create: `src/ui/Modal.ts`
- Create: `src/ui/Tooltip.ts`
- Create: `src/ui/TabGroup.ts`
- Create: `src/ui/index.ts` (barrel export)

These follow the same pattern. Implement each as a Container-based component reading from the theme. See design doc for specs. Wire all exports through `src/ui/index.ts`.

**Commit after each component, then barrel export:**

```bash
git add src/ui/ && git commit -m "feat: add ProgressBar, Modal, Tooltip, TabGroup UI components"
```

---

## Phase 4: Galaxy Generation

### Task 4.1: Name Generator

**Files:**

- Create: `src/generation/NameGenerator.ts`
- Test: `src/generation/__tests__/NameGenerator.test.ts`

Implement a seeded sci-fi name generator using syllable combination (prefixes + roots + suffixes). Test that same seed produces same names, names don't repeat within a generation batch.

**Commit:**

```bash
git add src/generation/ && git commit -m "feat: add procedural sci-fi name generator"
```

---

### Task 4.2: Galaxy Generator

**Files:**

- Create: `src/generation/GalaxyGenerator.ts`
- Test: `src/generation/__tests__/GalaxyGenerator.test.ts`

Generate sectors (2-3), systems per sector (4-6), planets per system (3-6). Assign planet types based on weighted random per system position. Calculate distances (Euclidean between positions). Return complete galaxy data matching the `GameState.galaxy` interface.

Tests: deterministic output for same seed, correct counts, all planet types present across galaxy, distance calculations correct.

**Commit:**

```bash
git add src/generation/ && git commit -m "feat: add procedural galaxy generator"
```

---

### Task 4.3: Market Initializer

**Files:**

- Create: `src/generation/MarketInitializer.ts`
- Test: `src/generation/__tests__/MarketInitializer.test.ts`

Given a galaxy, initialize `MarketState` with per-planet cargo entries. Use `PLANET_CARGO_PROFILES` to set base supply/demand. Set initial prices from `BASE_CARGO_PRICES`. All saturation starts at 0, trends at 'stable'.

**Commit:**

```bash
git add src/generation/ && git commit -m "feat: add market state initializer from galaxy data"
```

---

### Task 4.4: New Game Setup

**Files:**

- Create: `src/game/NewGameSetup.ts`
- Test: `src/game/__tests__/NewGameSetup.test.ts`

Orchestrator function: takes a seed, runs galaxy generator + market initializer, creates starting fleet (1 Cargo Shuttle + 1 Passenger Shuttle), sets starting cash, initializes storyteller. Returns complete `GameState`. Also selects 3 candidate starting systems for player choice.

**Commit:**

```bash
git add src/game/ && git commit -m "feat: add new game setup orchestrator"
```

---

## Phase 5: Economy Engine

### Task 5.1: Price Calculator

**Files:**

- Create: `src/game/economy/PriceCalculator.ts`
- Test: `src/game/economy/__tests__/PriceCalculator.test.ts`

Implement the price formula from design doc. Tests: base price with no modifiers, saturation reduces price, trend modifiers affect price, event modifiers stack.

**Commit:**

```bash
git add src/game/economy/ && git commit -m "feat: add price calculator with saturation and trend support"
```

---

### Task 5.2: Market Updater (turn-to-turn)

**Files:**

- Create: `src/game/economy/MarketUpdater.ts`
- Test: `src/game/economy/__tests__/MarketUpdater.test.ts`

Per-turn market update: decay saturation by 15%, random-walk trends, update current prices, fluctuate fuel price. Uses SeededRNG for determinism.

**Commit:**

```bash
git add src/game/economy/ && git commit -m "feat: add per-turn market updater with trend shifts"
```

---

## Phase 6: Fleet & Route Management

### Task 6.1: Fleet Manager

**Files:**

- Create: `src/game/fleet/FleetManager.ts`
- Test: `src/game/fleet/__tests__/FleetManager.test.ts`

Functions: buyShip, sellShip (depreciated value), overhaulShip, ageFleet (per-turn condition decay), calculateMaintenanceCosts, calculateShipValue.

**Commit:**

```bash
git add src/game/fleet/ && git commit -m "feat: add fleet management functions"
```

---

### Task 6.2: Route Manager

**Files:**

- Create: `src/game/routes/RouteManager.ts`
- Test: `src/game/routes/__tests__/RouteManager.test.ts`

Functions: createRoute (origin, destination, cargo type), deleteRoute, assignShipToRoute, unassignShip, calculateDistance (using galaxy positions), calculateTripsPerTurn, estimateRouteRevenue, estimateRouteCosts.

**Commit:**

```bash
git add src/game/routes/ && git commit -m "feat: add route management and estimation functions"
```

---

## Phase 7: Events & Storyteller

### Task 7.1: Event Definitions

**Files:**

- Create: `src/game/events/EventDefinitions.ts`

Define ~20 event templates across all 4 categories. Each has name, description, category, duration, effects, and optional choices.

**Commit:**

```bash
git add src/game/events/ && git commit -m "feat: define 20 event templates across all categories"
```

---

### Task 7.2: Storyteller & Event Engine

**Files:**

- Create: `src/game/events/Storyteller.ts`
- Create: `src/game/events/EventEngine.ts`
- Test: `src/game/events/__tests__/Storyteller.test.ts`

Storyteller: calculates player health score from cash/assets/trend, adjusts headwind bias. EventEngine: selects 1-3 events per turn using weighted random (biased by storyteller), instantiates events with concrete targets (picks affected planets/routes), applies event effects to game state, ticks down event durations.

**Commit:**

```bash
git add src/game/events/ && git commit -m "feat: add storyteller rubber-banding and event engine"
```

---

## Phase 8: Simulation Engine

### Task 8.1: Turn Simulator

**Files:**

- Create: `src/game/simulation/TurnSimulator.ts`
- Test: `src/game/simulation/__tests__/TurnSimulator.test.ts`

The core simulation loop for one turn. Steps:

1. For each active route with assigned ships, calculate trips, revenue, fuel costs
2. Handle breakdowns (reliability check per ship)
3. Update saturation on destination planets
4. Deduct maintenance costs for all ships
5. Process loan interest
6. Age fleet (condition decay)
7. Run market updater
8. Run event engine (fire events, apply effects)
9. Update storyteller
10. Check bankruptcy condition
11. Produce TurnResult
12. Advance turn counter

Tests: revenue calculation correct, fuel costs correct, saturation increases with deliveries, bankruptcy triggers, event effects apply.

**Commit:**

```bash
git add src/game/simulation/ && git commit -m "feat: add turn simulation engine"
```

---

### Task 8.2: Score Calculator

**Files:**

- Create: `src/game/scoring/ScoreCalculator.ts`
- Test: `src/game/scoring/__tests__/ScoreCalculator.test.ts`

Calculate score from: net worth (cash + ship values - loans), reputation, total cargo delivered across all turns, route network size. Save high scores to localStorage.

**Commit:**

```bash
git add src/game/scoring/ && git commit -m "feat: add score calculation and high score persistence"
```

---

## Phase 9: Game Scenes

### Task 9.1: MainMenuScene

**Files:**

- Create: `src/scenes/MainMenuScene.ts`

Title screen with: game title, New Game button, Continue button (disabled if no save), Settings button. Sci-fi styled using Panel, Button, Label components.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add main menu scene"
```

---

### Task 9.2: GalaxySetupScene

**Files:**

- Create: `src/scenes/GalaxySetupScene.ts`

Seed input (random or custom), company name input, pick starting system from 3 options (show system info on selection). "Launch" button runs NewGameSetup and transitions to game.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add galaxy setup / new game scene"
```

---

### Task 9.3: GameHUDScene

**Files:**

- Create: `src/scenes/GameHUDScene.ts`

Persistent overlay: top bar with company name, cash display, turn counter (e.g., "Q3 Year 2"), phase indicator. Navigation buttons along one edge: Map, Fleet, Routes, Finance, Market. "End Turn" button (only visible in planning phase).

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add persistent game HUD scene"
```

---

### Task 9.4: GalaxyMapScene

**Files:**

- Create: `src/scenes/GalaxyMapScene.ts`

Render galaxy: sectors as semi-transparent colored regions, systems as star dots with labels, active routes as lines between systems. Click system → transition to SystemMapScene. Sector names displayed.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add galaxy map scene with sector and system rendering"
```

---

### Task 9.5: SystemMapScene

**Files:**

- Create: `src/scenes/SystemMapScene.ts`

Render system detail: central star, orbiting planets as circles with labels. Planet type indicated by color. Click planet → show PlanetDetailScene (as modal/panel). Back button returns to galaxy map. Show intra-system route lines.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add system map scene with planet detail drill-down"
```

---

### Task 9.6: PlanetDetailScene

**Files:**

- Create: `src/scenes/PlanetDetailScene.ts`

Panel showing: planet name, type, population. DataTable of cargo types with columns: cargo, supply, demand, price, trend, saturation. Passenger volume indicator. "Create Route To/From" button.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add planet detail scene with market data table"
```

---

### Task 9.7: FleetScene

**Files:**

- Create: `src/scenes/FleetScene.ts`

DataTable listing all ships: name, class, cargo cap, pax cap, speed, condition, assigned route, maintenance cost. Buttons: Buy Ship (opens ship market modal), Sell Ship, Overhaul. Ship market modal shows all ship classes with stats and Buy button (disabled if too expensive).

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add fleet management scene with ship buying/selling"
```

---

### Task 9.8: RoutesScene

**Files:**

- Create: `src/scenes/RoutesScene.ts`

DataTable of active routes: origin, destination, distance, assigned ships, cargo type, estimated revenue, estimated cost, est. profit. Buttons: Create Route (dropdown/search for origin + destination), Delete Route, Assign Ship. Create route flow: pick origin planet → pick destination planet → pick cargo type → confirm.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add route management scene with creation workflow"
```

---

### Task 9.9: FinanceScene

**Files:**

- Create: `src/scenes/FinanceScene.ts`

TabGroup with tabs: P&L (last turn and cumulative), Balance Sheet (cash, ship values, loans, net worth), Loans (active loans, take new loan, repay). Historical P&L as simple bar/line chart using Phaser graphics primitives.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add finance scene with P&L, balance sheet, and loans"
```

---

### Task 9.10: MarketScene

**Files:**

- Create: `src/scenes/MarketScene.ts`

Galaxy-wide market overview. DataTable: planet name, type, then columns for each cargo type showing price + trend arrow. Sort by any column. Color-code prices (green = high demand/good price, red = saturated). Fuel price display with trend.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add galaxy market overview scene"
```

---

### Task 9.11: SimPlaybackScene

**Files:**

- Create: `src/scenes/SimPlaybackScene.ts`

Animates one turn: show galaxy map with ships moving along routes (simple dots/arrows). Event popups slide in as they fire. Running revenue/cost ticker. Speed controls (1x, 2x, 4x, skip). When sim completes, auto-transition to review phase.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add simulation playback scene with animation and events"
```

---

### Task 9.12: TurnReportScene

**Files:**

- Create: `src/scenes/TurnReportScene.ts`

Review screen: P&L summary for the turn, route performance table, news digest (events that fired with descriptions), market changes highlighted (biggest movers). "Continue to Next Turn" button → transitions back to planning phase (or game over screen).

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add turn report / review scene"
```

---

### Task 9.13: GameOverScene

**Files:**

- Create: `src/scenes/GameOverScene.ts`

Shows: win/lose message, final score breakdown, high score table, "Play Again" and "Main Menu" buttons.

**Commit:**

```bash
git add src/scenes/ && git commit -m "feat: add game over scene with score and high scores"
```

---

## Phase 10: Save/Load & Integration

### Task 10.1: Save/Load System

**Files:**

- Create: `src/game/SaveManager.ts`
- Test: `src/game/__tests__/SaveManager.test.ts`

Auto-save to localStorage at end of each turn. Manual save slot (1 slot for MVP). Load restores full GameState. Test: save → load round-trip preserves all data.

**Commit:**

```bash
git add src/game/ && git commit -m "feat: add save/load system with localStorage persistence"
```

---

### Task 10.2: Scene Wiring & Game Loop Integration

**Files:**

- Modify: `src/main.ts`
- Modify: `src/scenes/BootScene.ts`

Register all scenes in the game config. Wire the full flow: Boot → Main Menu → Setup → Planning (HUD + Map) → Sim → Review → Planning loop. Ensure phase transitions in GameStore trigger correct scene switches.

**Commit:**

```bash
git add src/ && git commit -m "feat: wire all scenes into complete game loop"
```

---

### Task 10.3: End-to-End Playtest & Balance Pass

Manual testing: play through 5+ turns, verify economy doesn't collapse or inflate too fast, events fire and affect gameplay, bankruptcy is possible but not inevitable, routes are profitable but not trivially so. Adjust constants in `constants.ts` as needed.

**Commit:**

```bash
git add src/ && git commit -m "fix: balance pass on economy, pricing, and event frequency"
```

---

## Phase 11: Polish

### Task 11.1: Keyboard Shortcuts & Quality of Life

Add: ESC to close modals/go back, number keys for nav tabs, spacebar for End Turn confirmation. Tooltip on hover for ship stats, planet info, price explanations.

**Commit:**

```bash
git add src/ && git commit -m "feat: add keyboard shortcuts and tooltip polish"
```

---

### Task 11.2: Visual Polish

Add: animated transitions between scenes (fade), pulsing indicators for profitable routes, color-coded trend arrows, blinking warnings for low cash/condition. Starfield background on galaxy map.

**Commit:**

```bash
git add src/ && git commit -m "feat: add visual polish, animations, and starfield background"
```

---

## Dependency Graph

```
Phase 1 (Scaffold)
  └── Phase 2 (Core: RNG, Events, Types, Store)
       ├── Phase 3 (UI Components)
       │    └── Phase 9 (All Scenes)
       │         └── Phase 10 (Integration)
       │              └── Phase 11 (Polish)
       ├── Phase 4 (Galaxy Gen)
       │    └── Phase 5 (Economy)
       │         └── Phase 6 (Fleet & Routes)
       │              └── Phase 7 (Events & Storyteller)
       │                   └── Phase 8 (Simulation Engine)
       │                        └── Phase 9 (Scenes need sim data)
```

Phases 3-4 can run in parallel. Phases 5-8 are sequential. Phase 9 requires both tracks. Phases 10-11 are sequential at the end.
