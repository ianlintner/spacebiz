# AI Sandbox Simulation Mode — Design & Implementation Plan

**Date:** 2026-04-08  
**Status:** Approved for implementation  
**Scope:** Full AI-only simulation mode with headless engine, structured logging, in-game sandbox viewer, and integration test harness

---

## 1. Executive Summary

Add an **AI Sandbox Mode** where all companies are AI-controlled, enabling:

- **Players** to spectate full AI-vs-AI simulations as entertainment
- **Developers** to run headless simulations for QA, balance testing, and behavioral analysis
- **CI/automated tests** to run integration playtests with structured JSON output

The core game logic (`TurnSimulator`, `AISimulator`, economy, fleet, events, etc.) is already pure-function based, meaning headless execution requires minimal refactoring. The main work is:

1. A headless simulation runner that loops turns without Phaser
2. A structured logging/telemetry system
3. An in-game Sandbox Viewer scene with playback controls
4. Integration test harness using Vitest

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Entry Points                                │
├──────────────┬──────────────────┬───────────────────────────────┤
│ In-Game UI   │ Headless CLI     │ Vitest Integration Tests      │
│ (Phaser)     │ (Node)           │ (Node)                        │
├──────────────┴──────────────────┴───────────────────────────────┤
│                 SimulationRunner                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • createNewGame() → initial state                       │   │
│  │ • runTurn(state, rng) → { nextState, turnLog }          │   │
│  │ • runFullSimulation(config) → SimulationResult          │   │
│  │ • Emits events: turnComplete, simulationComplete, error │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│              ┌──────────┴──────────┐                            │
│              │   SimulationLogger  │                            │
│              │  (structured JSON)  │                            │
│              └─────────────────────┘                            │
├─────────────────────────────────────────────────────────────────┤
│              Existing Pure Game Logic                            │
│  TurnSimulator · AISimulator · Economy · Fleet · Events · Tech  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 SimulationRunner (`src/game/simulation/SimulationRunner.ts`)

The core orchestrator that runs AI-only games without any Phaser dependency.

```typescript
interface SimulationConfig {
  seed: string;
  gameSize: "small" | "medium" | "large";
  galaxyShape: "spiral" | "elliptical" | "ring" | "irregular";
  companyCount?: number; // override default AI count
  maxTurns?: number; // override default max turns
  speedLimit?: number; // max turns-per-second (0 = unlimited)
  enableDetailedLogging?: boolean;
  logLevel?: "summary" | "standard" | "verbose";
}

interface SimulationResult {
  config: SimulationConfig;
  finalState: GameState;
  turnLogs: TurnLog[];
  summary: SimulationSummary;
  duration: { turns: number; wallTimeMs: number };
}

interface SimulationSummary {
  winner: { name: string; score: number; netWorth: number } | null;
  rankings: CompanyRanking[];
  bankruptcies: { name: string; turn: number }[];
  economySnapshot: EconomySnapshot;
  eventStats: Record<string, number>;
  totalTurns: number;
}
```

**Key design decisions:**

- No Phaser imports — runs in Node.js or browser
- Uses `EventEmitter` from `src/utils/EventEmitter.ts` for turn-by-turn progress
- Reuses `createNewGame()` for initialization but patches state so `playerEmpireId` maps to an AI company (no human player)
- Calls `simulateTurn()` in a loop, collecting structured logs each turn
- All AI companies get the same slot/route mechanics the player gets (minus manual route selection — AI handles this)

### 3.2 SimulationLogger (`src/game/simulation/SimulationLogger.ts`)

Structured logging system producing machine-readable output for developer analysis.

```typescript
interface TurnLog {
  turn: number;
  timestamp: number;
  phase: "pre" | "simulation" | "post";

  // Economy state snapshot
  economy: {
    fuelPrice: number;
    avgCargoPrice: Record<string, number>;
    totalMarketVolume: number;
  };

  // Per-company metrics
  companies: CompanyTurnLog[];

  // Events that fired
  events: { id: string; name: string; category: string; targets: string[] }[];

  // Market changes
  marketDelta: {
    planetId: string;
    cargo: string;
    priceDelta: number;
    saturationDelta: number;
  }[];

  // Anomalies / warnings for dev attention
  warnings: SimWarning[];
}

interface CompanyTurnLog {
  id: string;
  name: string;
  personality: string;
  cash: number;
  cashDelta: number;
  revenue: number;
  costs: {
    fuel: number;
    maintenance: number;
    tariffs: number;
    licenses: number;
  };
  fleetSize: number;
  routeCount: number;
  shipsPurchased: string[];
  routesOpened: { origin: string; dest: string; cargo: string }[];
  routesClosed: string[];
  breakdowns: number;
  bankrupt: boolean;
  score: number;
}

interface SimWarning {
  level: "info" | "warn" | "error";
  code: string; // e.g., "ECONOMY_DEFLATION", "AI_STUCK_NO_ROUTES"
  message: string;
  context: Record<string, unknown>;
}
```

**Warning codes for dev/AI assistant analysis:**

- `AI_STUCK_NO_ROUTES` — AI company has ships but opened no routes for 5+ turns
- `AI_STUCK_NO_PURCHASES` — AI has excess cash but isn't buying ships
- `ECONOMY_DEFLATION` — Average prices dropped >30% from baseline
- `ECONOMY_INFLATION` — Average prices rose >50% from baseline
- `ALL_ROUTES_SAME_DEST` — Multiple AIs converging on same planet (market death spiral)
- `MASS_BANKRUPTCY` — >50% of companies bankrupt
- `BALANCE_OUTLIER` — One company has >60% of total economy wealth
- `EVENT_STORM` — 3+ negative events in consecutive turns
- `FUEL_CRISIS` — Fuel price >140% of base for 3+ turns

### 3.3 AI Player Adapter (`src/game/simulation/AIPlayerAdapter.ts`)

Wraps the existing AI logic to also handle the "player" slot in AI-only mode.

```typescript
/**
 * In sandbox mode, the player empire becomes AI-controlled.
 * This adapter creates an AICompany entry for the player empire
 * and runs it through the same AI decision loop.
 */
function createPlayerAICompany(state: GameState): AICompany;
function convertToFullAIState(state: GameState): GameState;
```

This avoids modifying `TurnSimulator.simulateTurn()` — instead, we pre-process the state so the "player" routes/fleet are managed by an AI company entry, then the existing player route simulation calculates revenue normally.

### 3.4 In-Game Sandbox Scene (`src/scenes/AISandboxScene.ts`)

A Phaser scene accessible from the Main Menu that visualizes AI-only simulations.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  AI SANDBOX SIMULATION       Turn 23/80    [1x][2x][Max] │
├──────────────┬───────────────────────────────────────────┤
│              │  Galaxy Mini-View                         │
│  Company     │  (simplified galaxy map with dots/lines)  │
│  Rankings    │                                           │
│  (live       ├───────────────────────────────────────────┤
│  DataTable)  │  Turn Activity Feed                       │
│              │  (scrollable event/action log)            │
│              │                                           │
├──────────────┼───────────────────────────────────────────┤
│  Economy     │  Company Detail (selected company)        │
│  Indicators  │  Fleet, Routes, Cash history sparkline    │
└──────────────┴───────────────────────────────────────────┘
│  [Pause] [Step] [Resume] [Speed ▾] [Export Log] [Back]  │
└──────────────────────────────────────────────────────────┘
```

**Features:**

- **Live rankings table**: Company name, cash, fleet, routes, score — updates each turn
- **Galaxy mini-view**: Simplified dot-and-line galaxy showing route activity
- **Activity feed**: Scrollable list of turn events (route opened, ship bought, bankruptcy, events)
- **Speed controls**: Pause / Step (1 turn) / Resume / Speed (1x, 2x, 4x, Max)
- **Export Log**: Download full simulation log as JSON
- **Company detail panel**: Click a company row to see its fleet, routes, cash history

### 3.5 Sandbox Setup Flow

**From Main Menu** → New "Sandbox" button → **SandboxSetupScene**:

```
┌─────────────────────────────────────────┐
│  AI SANDBOX — Configuration             │
│                                         │
│  Seed: [abc123]  [🎲 Randomize]        │
│                                         │
│  Size:  [Small] [Medium] [Large]        │
│  Shape: [Spiral] [Elliptical] [Ring]    │
│                                         │
│  AI Companies: [4] [6] [8] [10]         │
│                                         │
│  Speed: [Normal] [Fast] [Instant]       │
│                                         │
│  Log Level: [Summary] [Standard] [Verbose]│
│                                         │
│        [▶ Launch Simulation]            │
│        [← Back to Menu]                 │
└─────────────────────────────────────────┘
```

### 3.6 Integration Test Harness (`src/game/simulation/__tests__/SimulationRunner.test.ts`)

Vitest tests that run full or partial simulations headlessly:

```typescript
describe("SimulationRunner", () => {
  it("completes a full small game without errors");
  it("all AI companies make at least one route by turn 10");
  it("at least one company survives to end game");
  it("economy does not deflate below 50% baseline");
  it("no warnings with code MASS_BANKRUPTCY in small game");
  it("deterministic: same seed produces same result");
  it("performance: 80-turn medium game completes in <2s");
});

describe("AI Behavioral Tests", () => {
  it("AggressiveExpander expands faster than SteadyHauler");
  it("CherryPicker targets higher-value routes");
  it("bankrupt companies do not continue acting");
  it("AI respects route slot limits");
  it("AI saturation affects market prices over time");
});

describe("Simulation Logging", () => {
  it("produces valid TurnLog for each turn");
  it("warnings fire for stuck AI companies");
  it("export JSON is parseable and complete");
});
```

---

## 4. Implementation Plan

### Phase 1: Core Headless Engine (Files: 3 new, 0 modified)

| #   | Task             | File                                      | Description                                                                  |
| --- | ---------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| 1.1 | SimulationLogger | `src/game/simulation/SimulationLogger.ts` | Structured log types + builder that collects per-turn data, detects warnings |
| 1.2 | AIPlayerAdapter  | `src/game/simulation/AIPlayerAdapter.ts`  | Convert player state to AI-controlled, merge back results                    |
| 1.3 | SimulationRunner | `src/game/simulation/SimulationRunner.ts` | Main loop: init game → run turns → collect logs → produce SimulationResult   |

### Phase 2: Structured Logging & Warning Detection (Files: 1 new)

| #   | Task               | File                                        | Description                                                                                |
| --- | ------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 2.1 | SimulationAnalyzer | `src/game/simulation/SimulationAnalyzer.ts` | Post-simulation analysis: rankings, economy stats, behavioral warnings, exportable summary |

### Phase 3: In-Game UI (Files: 3 new, 2 modified)

| #   | Task               | File                              | Description                                                  |
| --- | ------------------ | --------------------------------- | ------------------------------------------------------------ |
| 3.1 | SandboxSetupScene  | `src/scenes/SandboxSetupScene.ts` | Configuration screen for sandbox params                      |
| 3.2 | AISandboxScene     | `src/scenes/AISandboxScene.ts`    | Live simulation viewer with rankings, feed, galaxy mini-view |
| 3.3 | Register scenes    | `src/main.ts`                     | Add SandboxSetupScene + AISandboxScene to scene list         |
| 3.4 | Main menu button   | `src/scenes/MainMenuScene.ts`     | Add "Sandbox" / "AI Simulation" button to main menu          |
| 3.5 | BootScene textures | `src/scenes/BootScene.ts`         | Add any needed icon textures (sandbox icon)                  |

### Phase 4: Integration Tests (Files: 2 new)

| #   | Task                | File                                                     | Description                       |
| --- | ------------------- | -------------------------------------------------------- | --------------------------------- |
| 4.1 | Runner tests        | `src/game/simulation/__tests__/SimulationRunner.test.ts` | Full simulation integration tests |
| 4.2 | AI behavioral tests | `src/game/simulation/__tests__/AIBehavioral.test.ts`     | AI behavior validation tests      |

### Phase 5: Polish & QA

| #   | Task                 | Description                                                    |
| --- | -------------------- | -------------------------------------------------------------- |
| 5.1 | Run `npm run check`  | Ensure typecheck + tests + build all pass                      |
| 5.2 | Balance verification | Run several sandbox simulations, verify no degenerate outcomes |

---

## 5. Detailed Type Exports

New types will be added to `src/data/types.ts`:

```typescript
// Simulation mode types
type SimLogLevel = "summary" | "standard" | "verbose";
type SimSpeed = "normal" | "fast" | "instant";
```

All other types (SimulationConfig, SimulationResult, TurnLog, etc.) are internal to the simulation module and exported from their respective files.

---

## 6. Key Design Decisions

### 6.1 No Modification to TurnSimulator

The existing `simulateTurn()` stays untouched. The AIPlayerAdapter pre-processes state so the player's fleet/routes behave as AI-managed. This avoids introducing bugs in the core game loop.

### 6.2 EventEmitter for Progress

SimulationRunner uses the existing `EventEmitter` utility for turn-by-turn progress events. The in-game scene listens to these events to update the UI. Headless mode ignores them.

### 6.3 Warning System is Heuristic

Simulation warnings are heuristic-based, not blocking. They flag anomalies for developer review. The bar for "warning" is intentionally low to catch edge cases.

### 6.4 Deterministic by Default

Same seed → same simulation result. This is already guaranteed by SeededRNG usage throughout. Tests will verify this property.

### 6.5 No Game Store Dependency

SimulationRunner works directly with GameState objects, not the singleton GameStore. The in-game scene bridges to GameStore only for UI display.

---

## 7. File Dependency Graph

```
SimulationRunner.ts
├── imports NewGameSetup.createNewGame()
├── imports TurnSimulator.simulateTurn()
├── imports AIPlayerAdapter.convertToFullAIState()
├── imports SimulationLogger
├── imports SimulationAnalyzer
├── imports SeededRNG
└── imports types from data/types.ts

AISandboxScene.ts
├── imports SimulationRunner
├── imports UI components (Panel, DataTable, Button, Label, ScrollableList)
├── imports Theme, Layout
└── imports SimulationLogger types

SandboxSetupScene.ts
├── imports UI components (Panel, Button, Label)
├── imports Theme, Layout
├── imports constants (GameSizeConfigs)
└── scene transition → AISandboxScene
```

---

## 8. Execution Assignment

| Phase   | Executor              | Approach                                                                 |
| ------- | --------------------- | ------------------------------------------------------------------------ |
| Phase 1 | Subagent: Core Engine | Build SimulationLogger, AIPlayerAdapter, SimulationRunner                |
| Phase 2 | Subagent: Analyzer    | Build SimulationAnalyzer with warning detection                          |
| Phase 3 | Subagent: UI Scenes   | Build SandboxSetupScene, AISandboxScene, wire into main.ts/MainMenuScene |
| Phase 4 | Subagent: Tests       | Build integration + behavioral tests                                     |
| Phase 5 | Main agent            | Run `npm run check`, fix issues, final verification                      |
