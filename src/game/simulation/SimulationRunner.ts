import { SeededRNG } from "../../utils/SeededRNG.ts";
import { GameEventEmitter } from "../../utils/EventEmitter.ts";
import { createNewGame } from "../NewGameSetup.ts";
import { simulateTurn } from "./TurnSimulator.ts";
import { convertToFullAIState } from "./AIPlayerAdapter.ts";
import { GalaxyShape } from "../../data/types.ts";
import type { GameState, GalaxyShape as GalaxyShapeT } from "../../data/types.ts";
import { GAME_LENGTH_PRESETS } from "../../data/constants.ts";
import type { GamePreset } from "../../data/constants.ts";
import { rankCompanies } from "../scoring/ScoreCalculator.ts";
import { SimulationLogger } from "./SimulationLogger.ts";
import type {
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  EconomySnapshot,
  TurnLog,
} from "./SimulationLogger.ts";

// ── Re-export types consumers need ─────────────────────────────

export type { SimulationConfig, SimulationResult, SimulationSummary, TurnLog };

// ── Galaxy-shape mapping ────────────────────────────────────────

const GALAXY_SHAPE_MAP: Record<string, GalaxyShapeT> = {
  spiral: GalaxyShape.Spiral,
  elliptical: GalaxyShape.Elliptical,
  ring: GalaxyShape.Ring,
  irregular: GalaxyShape.Irregular,
};

// ── SimulationRunner ───────────────────────────────────────────

export interface SimulationProgress {
  turn: number;
  maxTurns: number;
  state: GameState;
  turnLog: TurnLog;
  rngState: number;
}

/**
 * Headless simulation runner for AI-only games.
 *
 * Runs the full game loop without any Phaser dependency.
 * Emits progress events so UI or tests can observe turn-by-turn state.
 *
 * Usage:
 * ```ts
 * const runner = new SimulationRunner();
 * runner.on("turnComplete", (data) => { ... });
 * const result = runner.run(config);
 * ```
 */
export class SimulationRunner extends GameEventEmitter {
  private aborted = false;

  /**
   * Run a full AI-only simulation to completion.
   *
   * @returns SimulationResult with all turn logs, summary, and timing data.
   */
  run(config: SimulationConfig): SimulationResult {
    const startTime = performance.now();
    this.aborted = false;

    // Resolve game preset & shape
    const gamePreset = (config.gameSize as GamePreset) in GAME_LENGTH_PRESETS
      ? (config.gameSize as GamePreset)
      : "standard";
    const galaxyShape =
      GALAXY_SHAPE_MAP[config.galaxyShape] ?? GalaxyShape.Spiral;

    // Determine max turns — config override or from game preset
    const presetConfig = GAME_LENGTH_PRESETS[gamePreset];
    const maxTurns =
      config.maxTurns > 0 ? config.maxTurns : presetConfig.maxTurns;

    // Create a new game and convert to full-AI mode
    const { state: baseState } = createNewGame(
      config.seed,
      "AI Sandbox Corp",
      gamePreset,
      galaxyShape,
    );

    let state: GameState = {
      ...convertToFullAIState(baseState),
      maxTurns,
    };

    // Adjust company count if requested (trim excess AI companies)
    if (
      config.companyCount > 0 &&
      config.companyCount < state.aiCompanies.length
    ) {
      state = {
        ...state,
        aiCompanies: state.aiCompanies.slice(0, config.companyCount),
      };
    }

    // Initialize logger
    const logger = new SimulationLogger(config);

    // Create RNG with the same seed used for the game
    const rng = new SeededRNG(config.seed + 100);

    // ── Main simulation loop ─────────────────────────────────

    while (!state.gameOver && !this.aborted) {
      const prevTurn = state.turn;

      // Run one turn through the existing pure simulation function
      state = simulateTurn(state, rng);

      // The turn result is the last item in history (simulateTurn appends it)
      const turnResult = state.history[state.history.length - 1];
      if (!turnResult) break;

      // Log the turn
      const turnLog = logger.logTurn(state, turnResult);

      // Emit progress event
      const progress: SimulationProgress = {
        turn: prevTurn,
        maxTurns: state.maxTurns,
        state,
        turnLog,
        rngState: rng.getState(),
      };
      this.emit("turnComplete", progress);
    }

    // ── Build final summary ──────────────────────────────────

    const turnLogs = logger.getTurnLogs();
    const summary = this.buildSummary(state, turnLogs, logger);
    const wallTimeMs = performance.now() - startTime;

    const result: SimulationResult = {
      config,
      turnLogs,
      summary,
      wallTimeMs,
    };

    this.emit("simulationComplete", result);
    return result;
  }

  /**
   * Abort a running simulation (for UI "stop" button).
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Run simulation asynchronously, yielding control between turns.
   * This prevents blocking the UI thread during in-game playback.
   */
  async runAsync(
    config: SimulationConfig,
    turnDelay: number = 0,
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    this.aborted = false;

    const gamePreset = (config.gameSize as GamePreset) in GAME_LENGTH_PRESETS
      ? (config.gameSize as GamePreset)
      : "standard";
    const galaxyShape =
      GALAXY_SHAPE_MAP[config.galaxyShape] ?? GalaxyShape.Spiral;
    const presetConfig = GAME_LENGTH_PRESETS[gamePreset];
    const maxTurns =
      config.maxTurns > 0 ? config.maxTurns : presetConfig.maxTurns;

    const { state: baseState } = createNewGame(
      config.seed,
      "AI Sandbox Corp",
      gamePreset,
      galaxyShape,
    );

    let state: GameState = {
      ...convertToFullAIState(baseState),
      maxTurns,
    };

    if (
      config.companyCount > 0 &&
      config.companyCount < state.aiCompanies.length
    ) {
      state = {
        ...state,
        aiCompanies: state.aiCompanies.slice(0, config.companyCount),
      };
    }

    const logger = new SimulationLogger(config);
    const rng = new SeededRNG(config.seed + 100);

    while (!state.gameOver && !this.aborted) {
      const prevTurn = state.turn;

      state = simulateTurn(state, rng);

      const turnResult = state.history[state.history.length - 1];
      if (!turnResult) break;

      const turnLog = logger.logTurn(state, turnResult);

      const progress: SimulationProgress = {
        turn: prevTurn,
        maxTurns: state.maxTurns,
        state,
        turnLog,
        rngState: rng.getState(),
      };
      this.emit("turnComplete", progress);

      // Yield control to the event loop
      if (turnDelay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, turnDelay));
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    const turnLogs = logger.getTurnLogs();
    const summary = this.buildSummary(state, turnLogs, logger);
    const wallTimeMs = performance.now() - startTime;

    const result: SimulationResult = {
      config,
      turnLogs,
      summary,
      wallTimeMs,
    };

    this.emit("simulationComplete", result);
    return result;
  }

  /**
   * Resume a previously-saved simulation from a known state.
   * The RNG is restored from the saved internal state so outcomes
   * remain deterministic.  Pre-existing turnLogs are prepended to
   * the final result so charts / summary cover the full run.
   */
  async resumeAsync(
    config: SimulationConfig,
    savedState: GameState,
    rngState: number,
    previousTurnLogs: TurnLog[],
    turnDelay: number = 0,
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    this.aborted = false;

    let state = savedState;
    const logger = new SimulationLogger(config);
    const rng = new SeededRNG(rngState);

    while (!state.gameOver && !this.aborted) {
      const prevTurn = state.turn;

      state = simulateTurn(state, rng);

      const turnResult = state.history[state.history.length - 1];
      if (!turnResult) break;

      const turnLog = logger.logTurn(state, turnResult);

      const progress: SimulationProgress = {
        turn: prevTurn,
        maxTurns: state.maxTurns,
        state,
        turnLog,
        rngState: rng.getState(),
      };
      this.emit("turnComplete", progress);

      if (turnDelay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, turnDelay));
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    // Merge previous turn logs with newly-generated ones
    const newTurnLogs = logger.getTurnLogs();
    const allTurnLogs = [...previousTurnLogs, ...newTurnLogs];
    const summary = this.buildSummary(state, allTurnLogs, logger);
    const wallTimeMs = performance.now() - startTime;

    const result: SimulationResult = {
      config,
      turnLogs: allTurnLogs,
      summary,
      wallTimeMs,
    };

    this.emit("simulationComplete", result);
    return result;
  }

  // ── Private helpers ────────────────────────────────────────

  private buildSummary(
    state: GameState,
    turnLogs: TurnLog[],
    logger: SimulationLogger,
  ): SimulationSummary {
    // Rankings from the scoring system
    const companyRankings = rankCompanies(state);

    const rankings = companyRankings.map((r) => ({
      name: r.name,
      score: r.score,
      netWorth: r.netWorth,
      fleetSize: r.fleetSize,
      routeCount: r.routeCount,
    }));

    const winner =
      rankings.length > 0
        ? {
            name: rankings[0].name,
            score: rankings[0].score,
            netWorth: rankings[0].netWorth,
          }
        : null;

    // Economy snapshot
    const economySnapshot = this.buildEconomySnapshot(turnLogs);

    // Event counts across all turns
    const eventCounts: Record<string, number> = {};
    for (const log of turnLogs) {
      for (const evt of log.events) {
        eventCounts[evt.name] = (eventCounts[evt.name] ?? 0) + 1;
      }
    }

    // Warning counts across all turns
    const warningCounts: Record<string, number> = {};
    for (const log of turnLogs) {
      for (const w of log.warnings) {
        warningCounts[w.code] = (warningCounts[w.code] ?? 0) + 1;
      }
    }

    return {
      winner,
      rankings,
      bankruptcies: logger.getBankruptcyLog(),
      economySnapshot,
      eventCounts,
      totalTurns: state.turn - 1,
      warningCounts,
    };
  }

  private buildEconomySnapshot(turnLogs: TurnLog[]): EconomySnapshot {
    if (turnLogs.length === 0) {
      return {
        finalFuelPrice: 0,
        avgFuelPrice: 0,
        peakFuelPrice: 0,
        finalAvgCargoPrice: 0,
      };
    }

    let totalFuelPrice = 0;
    let peakFuelPrice = 0;

    for (const log of turnLogs) {
      totalFuelPrice += log.economy.fuelPrice;
      if (log.economy.fuelPrice > peakFuelPrice) {
        peakFuelPrice = log.economy.fuelPrice;
      }
    }

    const lastLog = turnLogs[turnLogs.length - 1];
    return {
      finalFuelPrice: lastLog.economy.fuelPrice,
      avgFuelPrice: totalFuelPrice / turnLogs.length,
      peakFuelPrice,
      finalAvgCargoPrice: lastLog.economy.avgCargoPrice,
    };
  }
}
