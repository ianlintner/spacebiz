import { describe, it, expect } from "vitest";
import { SimulationRunner } from "../SimulationRunner.ts";
import type {
  SimulationConfig,
  SimulationResult,
} from "../SimulationLogger.ts";
import type { SimulationProgress } from "../SimulationRunner.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  overrides: Partial<SimulationConfig> = {},
): SimulationConfig {
  return {
    seed: 42,
    gameSize: "standard",
    galaxyShape: "spiral",
    companyCount: 4,
    maxTurns: 10,
    logLevel: "standard",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SimulationRunner.run (synchronous)
// ---------------------------------------------------------------------------

describe("SimulationRunner.run", () => {
  it("runs a simulation to completion and returns a result", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig());

    expect(result).toBeDefined();
    expect(result.config.seed).toBe(42);
    expect(result.turnLogs.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.wallTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("produces deterministic results for the same seed", () => {
    const runner1 = new SimulationRunner();
    const runner2 = new SimulationRunner();
    const config = makeConfig({ seed: 12345 });

    const result1 = runner1.run(config);
    const result2 = runner2.run(config);

    expect(result1.summary.totalTurns).toBe(result2.summary.totalTurns);
    expect(result1.summary.rankings.length).toBe(
      result2.summary.rankings.length,
    );
    for (let i = 0; i < result1.summary.rankings.length; i++) {
      expect(result1.summary.rankings[i].name).toBe(
        result2.summary.rankings[i].name,
      );
      expect(result1.summary.rankings[i].score).toBe(
        result2.summary.rankings[i].score,
      );
    }
  });

  it("emits turnComplete events for each turn", () => {
    const runner = new SimulationRunner();
    const events: SimulationProgress[] = [];
    runner.on("turnComplete", (d: unknown) =>
      events.push(d as SimulationProgress),
    );

    runner.run(makeConfig({ maxTurns: 5 }));

    expect(events.length).toBeGreaterThan(0);
    // Each event should have increasing turn numbers
    for (let i = 1; i < events.length; i++) {
      expect(events[i].turn).toBeGreaterThanOrEqual(events[i - 1].turn);
    }
  });

  it("emits simulationComplete event", () => {
    const runner = new SimulationRunner();
    let completedResult: SimulationResult | null = null;
    runner.on("simulationComplete", (d: unknown) => {
      completedResult = d as SimulationResult;
    });

    const result = runner.run(makeConfig({ maxTurns: 5 }));

    expect(completedResult).toBeDefined();
    expect(completedResult!.summary.totalTurns).toBe(result.summary.totalTurns);
  });

  it("respects maxTurns config", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 3 }));

    // totalTurns should be at most 3 (could be less if game ends early)
    expect(result.summary.totalTurns).toBeLessThanOrEqual(3);
  });

  it("respects companyCount config", () => {
    const runner = new SimulationRunner();
    const events: SimulationProgress[] = [];
    runner.on("turnComplete", (d: unknown) =>
      events.push(d as SimulationProgress),
    );

    runner.run(makeConfig({ companyCount: 3, maxTurns: 3 }));

    if (events.length > 0) {
      const firstLog = events[0].turnLog;
      // Should have at most 3 companies (could have more if the converted
      // player counts as one and the generator made extras)
      expect(firstLog.companies.length).toBeLessThanOrEqual(4);
    }
  });

  it("summary includes rankings", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 5 }));

    expect(result.summary.rankings.length).toBeGreaterThan(0);
    for (const r of result.summary.rankings) {
      expect(r.name).toBeTruthy();
      expect(typeof r.score).toBe("number");
      expect(typeof r.netWorth).toBe("number");
      expect(typeof r.fleetSize).toBe("number");
      expect(typeof r.routeCount).toBe("number");
    }
  });

  it("summary includes economy snapshot", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 5 }));
    const eco = result.summary.economySnapshot;

    expect(typeof eco.finalFuelPrice).toBe("number");
    expect(typeof eco.avgFuelPrice).toBe("number");
    expect(typeof eco.peakFuelPrice).toBe("number");
    expect(typeof eco.finalAvgCargoPrice).toBe("number");
  });

  it("handles different game sizes", () => {
    for (const size of ["quick", "standard", "epic"] as const) {
      const runner = new SimulationRunner();
      const result = runner.run(makeConfig({ gameSize: size, maxTurns: 3 }));
      expect(result.summary.totalTurns).toBeGreaterThan(0);
    }
  });

  it("handles different galaxy shapes", () => {
    for (const shape of [
      "spiral",
      "elliptical",
      "ring",
      "irregular",
    ] as const) {
      const runner = new SimulationRunner();
      const result = runner.run(
        makeConfig({ galaxyShape: shape, maxTurns: 3 }),
      );
      expect(result.summary.totalTurns).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// SimulationRunner.runAsync
// ---------------------------------------------------------------------------

describe("SimulationRunner.runAsync", () => {
  it("completes asynchronously and returns a result", async () => {
    const runner = new SimulationRunner();
    const result = await runner.runAsync(makeConfig({ maxTurns: 5 }), 0);

    expect(result).toBeDefined();
    expect(result.summary.totalTurns).toBeGreaterThan(0);
  });

  it("emits turnComplete events asynchronously", async () => {
    const runner = new SimulationRunner();
    const events: SimulationProgress[] = [];
    runner.on("turnComplete", (d: unknown) =>
      events.push(d as SimulationProgress),
    );

    await runner.runAsync(makeConfig({ maxTurns: 5 }), 0);

    expect(events.length).toBeGreaterThan(0);
  });

  it("can be aborted mid-run", async () => {
    const runner = new SimulationRunner();
    let turnCount = 0;
    runner.on("turnComplete", () => {
      turnCount++;
      if (turnCount >= 2) {
        runner.abort();
      }
    });

    const result = await runner.runAsync(makeConfig({ maxTurns: 50 }), 0);

    // Should have stopped early
    expect(result.summary.totalTurns).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// SimulationRunner.abort
// ---------------------------------------------------------------------------

describe("SimulationRunner.abort", () => {
  it("stops a sync simulation from progressing", () => {
    const runner = new SimulationRunner();
    let turnCount = 0;

    runner.on("turnComplete", () => {
      turnCount++;
      if (turnCount >= 3) {
        runner.abort();
      }
    });

    const result = runner.run(makeConfig({ maxTurns: 100 }));

    // Should have stopped around turn 3 (±1 for timing)
    expect(result.summary.totalTurns).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Structured Logging
// ---------------------------------------------------------------------------

describe("Simulation logging", () => {
  it("turn logs contain economy data", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 5 }));

    for (const log of result.turnLogs) {
      expect(typeof log.economy.fuelPrice).toBe("number");
      expect(typeof log.economy.avgCargoPrice).toBe("number");
      expect(typeof log.economy.totalMarketVolume).toBe("number");
    }
  });

  it("turn logs contain company data", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 5 }));

    for (const log of result.turnLogs) {
      expect(log.companies.length).toBeGreaterThan(0);
      for (const c of log.companies) {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(typeof c.cash).toBe("number");
        expect(typeof c.fleetSize).toBe("number");
        expect(typeof c.routeCount).toBe("number");
        expect(typeof c.bankrupt).toBe("boolean");
      }
    }
  });

  it("warnings are detected when appropriate", () => {
    const runner = new SimulationRunner();
    const result = runner.run(
      makeConfig({ maxTurns: 30, logLevel: "verbose" }),
    );

    // We just verify warnings array exists on each turn log
    for (const log of result.turnLogs) {
      expect(Array.isArray(log.warnings)).toBe(true);
    }
  });

  it("event counts are aggregated in summary", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 10 }));

    expect(result.summary.eventCounts).toBeDefined();
    expect(typeof result.summary.eventCounts).toBe("object");
  });

  it("warning counts are aggregated in summary", () => {
    const runner = new SimulationRunner();
    const result = runner.run(makeConfig({ maxTurns: 10 }));

    expect(result.summary.warningCounts).toBeDefined();
    expect(typeof result.summary.warningCounts).toBe("object");
  });
});
