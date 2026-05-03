import { describe, it, expect } from "vitest";
import { SimulationRunner } from "../SimulationRunner.ts";
import type {
  SimulationConfig,
  SimulationResult,
} from "../SimulationLogger.ts";

// ---------------------------------------------------------------------------
// Configuration matrix — vary seeds, sizes, company counts, shapes
// ---------------------------------------------------------------------------

const SEEDS = [42, 100, 256];
const SIZES: SimulationConfig["gameSize"][] = ["quick", "standard", "epic"];
const COMPANY_COUNTS = [4, 8];
const SHAPES: SimulationConfig["galaxyShape"][] = [
  "spiral",
  "elliptical",
  "ring",
  "irregular",
];

// Run full turn counts per preset to see endgame dynamics
const MAX_TURNS_BY_SIZE: Record<string, number> = {
  quick: 10,
  standard: 16,
  epic: 24,
};

function makeConfig(
  seed: number,
  size: SimulationConfig["gameSize"],
  companies: number,
  shape: SimulationConfig["galaxyShape"],
): SimulationConfig {
  return {
    seed,
    gameSize: size,
    galaxyShape: shape,
    companyCount: companies,
    maxTurns: MAX_TURNS_BY_SIZE[size],
    logLevel: "standard",
  };
}

// ---------------------------------------------------------------------------
// Data structures for aggregation
// ---------------------------------------------------------------------------

interface RunSummary {
  seed: number;
  size: string;
  shape: string;
  companyCount: number;
  totalTurns: number;
  wallTimeMs: number;
  winnerName: string;
  winnerScore: number;
  winnerNetWorth: number;
  rankings: {
    name: string;
    score: number;
    netWorth: number;
    fleetSize: number;
    routeCount: number;
  }[];
  bankruptcyCount: number;
  bankruptcyTurns: number[];
  finalFuelPrice: number;
  avgFuelPrice: number;
  peakFuelPrice: number;
  finalAvgCargoPrice: number;
  eventCounts: Record<string, number>;
  warningCounts: Record<string, number>;
  // Per-company trajectory data (turn 1, mid, final)
  companyTrajectories: {
    name: string;
    personality: string;
    cashStart: number;
    cashMid: number;
    cashEnd: number;
    peakCash: number;
    peakFleet: number;
    peakRoutes: number;
    totalRevenue: number;
    totalBreakdowns: number;
    turnsBankrupt: number;
  }[];
  // Economy trajectory
  economyTrajectory: {
    turn: number;
    fuelPrice: number;
    avgCargoPrice: number;
    totalMarketVolume: number;
  }[];
  // Diplomacy trajectory
  diplomacyTrajectory: {
    turn: number;
    wars: number;
    coldWars: number;
    peaces: number;
    tradePacts: number;
    alliances: number;
    openPorts: number;
    closedPorts: number;
  }[];
  scoreSpread: number; // max - min score among non-bankrupt
  giniCoefficient: number; // wealth inequality
}

function calculateGini(values: number[]): number {
  const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n <= 1) return 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return sumDiff / (2 * n * n * mean);
}

function extractRunSummary(result: SimulationResult): RunSummary {
  const { config, summary, turnLogs, wallTimeMs } = result;

  // Company trajectories
  const companyTrajectories = summary.rankings.map((r) => {
    const companyTurns = turnLogs
      .map((tl) => tl.companies.find((c) => c.name === r.name)!)
      .filter(Boolean);

    const cashValues = companyTurns.map((c) => c.cash);
    const midIdx = Math.floor(companyTurns.length / 2);

    return {
      name: r.name,
      personality: companyTurns[0]?.personality ?? "unknown",
      cashStart: cashValues[0] ?? 0,
      cashMid: cashValues[midIdx] ?? 0,
      cashEnd: cashValues[cashValues.length - 1] ?? 0,
      peakCash: Math.max(...cashValues, 0),
      peakFleet: Math.max(...companyTurns.map((c) => c.fleetSize), 0),
      peakRoutes: Math.max(...companyTurns.map((c) => c.routeCount), 0),
      totalRevenue: companyTurns.reduce((s, c) => s + c.revenue, 0),
      totalBreakdowns: companyTurns.reduce((s, c) => s + c.breakdowns, 0),
      turnsBankrupt: companyTurns.filter((c) => c.bankrupt).length,
    };
  });

  // Economy trajectory (sample every 5 turns)
  const economyTrajectory = turnLogs
    .filter((_, i) => i % 5 === 0 || i === turnLogs.length - 1)
    .map((tl) => ({
      turn: tl.turn,
      fuelPrice: tl.economy.fuelPrice,
      avgCargoPrice: tl.economy.avgCargoPrice,
      totalMarketVolume: tl.economy.totalMarketVolume,
    }));

  // Diplomacy trajectory (sample every 5 turns)
  const diplomacyTrajectory = turnLogs
    .filter((_, i) => i % 5 === 0 || i === turnLogs.length - 1)
    .map((tl) => ({
      turn: tl.turn,
      wars: tl.diplomacy.wars,
      coldWars: tl.diplomacy.coldWars,
      peaces: tl.diplomacy.peaces,
      tradePacts: tl.diplomacy.tradePacts,
      alliances: tl.diplomacy.alliances,
      openPorts: tl.diplomacy.openBorderPorts,
      closedPorts: tl.diplomacy.closedBorderPorts,
    }));

  const nonBankruptScores = summary.rankings
    .filter((r) => !summary.bankruptcies.some((b) => b.name === r.name))
    .map((r) => r.score);

  const scoreSpread =
    nonBankruptScores.length > 1
      ? Math.max(...nonBankruptScores) - Math.min(...nonBankruptScores)
      : 0;

  const cashValues = summary.rankings.map((r) => r.netWorth);
  const giniCoefficient = calculateGini(cashValues);

  return {
    seed: config.seed,
    size: config.gameSize,
    shape: config.galaxyShape,
    companyCount: config.companyCount,
    totalTurns: summary.totalTurns,
    wallTimeMs,
    winnerName: summary.winner?.name ?? "N/A",
    winnerScore: summary.winner?.score ?? 0,
    winnerNetWorth: summary.winner?.netWorth ?? 0,
    rankings: summary.rankings,
    bankruptcyCount: summary.bankruptcies.length,
    bankruptcyTurns: summary.bankruptcies.map((b) => b.turn),
    finalFuelPrice: summary.economySnapshot.finalFuelPrice,
    avgFuelPrice: summary.economySnapshot.avgFuelPrice,
    peakFuelPrice: summary.economySnapshot.peakFuelPrice,
    finalAvgCargoPrice: summary.economySnapshot.finalAvgCargoPrice,
    eventCounts: summary.eventCounts,
    warningCounts: summary.warningCounts,
    companyTrajectories,
    economyTrajectory,
    diplomacyTrajectory,
    scoreSpread,
    giniCoefficient,
  };
}

// ---------------------------------------------------------------------------
// Aggregation & analysis
// ---------------------------------------------------------------------------

interface AggregateAnalysis {
  totalRuns: number;
  avgWallTimeMs: number;
  // Personality win rates
  personalityWinRate: Record<
    string,
    { wins: number; total: number; rate: number }
  >;
  // Personality avg score
  personalityAvgScore: Record<
    string,
    { total: number; count: number; avg: number }
  >;
  // Personality bankruptcy rate
  personalityBankruptcyRate: Record<
    string,
    { bankruptcies: number; total: number; rate: number }
  >;
  // By game size
  bySizeStats: Record<
    string,
    {
      runs: number;
      avgBankruptcies: number;
      avgScoreSpread: number;
      avgGini: number;
      avgWinnerScore: number;
      avgFuelPrice: number;
      avgCargoPrice: number;
    }
  >;
  // By shape
  byShapeStats: Record<
    string,
    {
      runs: number;
      avgBankruptcies: number;
      avgGini: number;
    }
  >;
  // Event frequency
  eventFrequency: Record<string, number>;
  // Warning frequency
  warningFrequency: Record<string, number>;
  // Economy health
  economyStats: {
    avgFinalFuelPrice: number;
    avgPeakFuelPrice: number;
    avgFinalCargoPrice: number;
    fuelPriceVariance: number;
  };
  // Diplomacy health
  diplomacyStats: {
    avgFinalWars: number;
    avgFinalPeaces: number;
    avgFinalTradePacts: number;
    avgFinalAlliances: number;
    avgOpenPorts: number;
    avgClosedPorts: number;
  };
  // Balance issues
  balanceIssues: string[];
}

function analyzeRuns(runs: RunSummary[]): AggregateAnalysis {
  const totalRuns = runs.length;
  const avgWallTimeMs = runs.reduce((s, r) => s + r.wallTimeMs, 0) / totalRuns;

  // Personality stats
  const personalityWins: Record<string, number> = {};
  const personalityTotal: Record<string, number> = {};
  const personalityScoreSum: Record<string, number> = {};
  const personalityScoreCount: Record<string, number> = {};
  const personalityBankruptcies: Record<string, number> = {};

  for (const run of runs) {
    for (const ct of run.companyTrajectories) {
      const p = ct.personality;
      personalityTotal[p] = (personalityTotal[p] ?? 0) + 1;
      personalityScoreSum[p] =
        (personalityScoreSum[p] ?? 0) +
        (run.rankings.find((r) => r.name === ct.name)?.score ?? 0);
      personalityScoreCount[p] = (personalityScoreCount[p] ?? 0) + 1;
      if (ct.turnsBankrupt > 0) {
        personalityBankruptcies[p] = (personalityBankruptcies[p] ?? 0) + 1;
      }
    }
    // Winner personality
    const winner = run.companyTrajectories.find(
      (ct) => ct.name === run.winnerName,
    );
    if (winner) {
      personalityWins[winner.personality] =
        (personalityWins[winner.personality] ?? 0) + 1;
    }
  }

  const allPersonalities = [...new Set(Object.keys(personalityTotal))];

  const personalityWinRate: Record<
    string,
    { wins: number; total: number; rate: number }
  > = {};
  const personalityAvgScore: Record<
    string,
    { total: number; count: number; avg: number }
  > = {};
  const personalityBankruptcyRate: Record<
    string,
    { bankruptcies: number; total: number; rate: number }
  > = {};

  for (const p of allPersonalities) {
    const wins = personalityWins[p] ?? 0;
    const total = personalityTotal[p] ?? 1;
    personalityWinRate[p] = { wins, total, rate: wins / totalRuns };

    const scoreTotal = personalityScoreSum[p] ?? 0;
    const scoreCount = personalityScoreCount[p] ?? 1;
    personalityAvgScore[p] = {
      total: scoreTotal,
      count: scoreCount,
      avg: scoreTotal / scoreCount,
    };

    const bankruptcies = personalityBankruptcies[p] ?? 0;
    personalityBankruptcyRate[p] = {
      bankruptcies,
      total,
      rate: bankruptcies / total,
    };
  }

  // By size stats
  const bySizeStats: Record<
    string,
    {
      runs: number;
      avgBankruptcies: number;
      avgScoreSpread: number;
      avgGini: number;
      avgWinnerScore: number;
      avgFuelPrice: number;
      avgCargoPrice: number;
    }
  > = {};
  for (const size of SIZES) {
    const sizeRuns = runs.filter((r) => r.size === size);
    if (sizeRuns.length === 0) continue;
    bySizeStats[size] = {
      runs: sizeRuns.length,
      avgBankruptcies:
        sizeRuns.reduce((s, r) => s + r.bankruptcyCount, 0) / sizeRuns.length,
      avgScoreSpread:
        sizeRuns.reduce((s, r) => s + r.scoreSpread, 0) / sizeRuns.length,
      avgGini:
        sizeRuns.reduce((s, r) => s + r.giniCoefficient, 0) / sizeRuns.length,
      avgWinnerScore:
        sizeRuns.reduce((s, r) => s + r.winnerScore, 0) / sizeRuns.length,
      avgFuelPrice:
        sizeRuns.reduce((s, r) => s + r.avgFuelPrice, 0) / sizeRuns.length,
      avgCargoPrice:
        sizeRuns.reduce((s, r) => s + r.finalAvgCargoPrice, 0) /
        sizeRuns.length,
    };
  }

  // By shape stats
  const byShapeStats: Record<
    string,
    { runs: number; avgBankruptcies: number; avgGini: number }
  > = {};
  for (const shape of SHAPES) {
    const shapeRuns = runs.filter((r) => r.shape === shape);
    if (shapeRuns.length === 0) continue;
    byShapeStats[shape] = {
      runs: shapeRuns.length,
      avgBankruptcies:
        shapeRuns.reduce((s, r) => s + r.bankruptcyCount, 0) / shapeRuns.length,
      avgGini:
        shapeRuns.reduce((s, r) => s + r.giniCoefficient, 0) / shapeRuns.length,
    };
  }

  // Event frequency
  const eventFrequency: Record<string, number> = {};
  for (const run of runs) {
    for (const [evt, count] of Object.entries(run.eventCounts)) {
      eventFrequency[evt] = (eventFrequency[evt] ?? 0) + count;
    }
  }

  // Warning frequency
  const warningFrequency: Record<string, number> = {};
  for (const run of runs) {
    for (const [warn, count] of Object.entries(run.warningCounts)) {
      warningFrequency[warn] = (warningFrequency[warn] ?? 0) + count;
    }
  }

  // Economy stats
  const fuelPrices = runs.map((r) => r.finalFuelPrice);
  const avgFinalFuelPrice = fuelPrices.reduce((a, b) => a + b, 0) / totalRuns;
  const fuelPriceVariance =
    fuelPrices.reduce((s, p) => s + (p - avgFinalFuelPrice) ** 2, 0) /
    totalRuns;

  const economyStats = {
    avgFinalFuelPrice,
    avgPeakFuelPrice: runs.reduce((s, r) => s + r.peakFuelPrice, 0) / totalRuns,
    avgFinalCargoPrice:
      runs.reduce((s, r) => s + r.finalAvgCargoPrice, 0) / totalRuns,
    fuelPriceVariance,
  };

  // Detect balance issues
  const balanceIssues: string[] = [];

  // Check if one personality dominates
  for (const p of allPersonalities) {
    const wr = personalityWinRate[p];
    if (wr && wr.rate > 0.5 && totalRuns >= 5) {
      balanceIssues.push(
        `DOMINANT_PERSONALITY: ${p} wins ${(wr.rate * 100).toFixed(1)}% of games (${wr.wins}/${totalRuns})`,
      );
    }
    const br = personalityBankruptcyRate[p];
    if (br && br.rate > 0.4) {
      balanceIssues.push(
        `HIGH_BANKRUPTCY: ${p} goes bankrupt ${(br.rate * 100).toFixed(1)}% of the time (${br.bankruptcies}/${br.total})`,
      );
    }
  }

  // High Gini = extreme wealth inequality
  const overallAvgGini =
    runs.reduce((s, r) => s + r.giniCoefficient, 0) / totalRuns;
  if (overallAvgGini > 0.5) {
    balanceIssues.push(
      `HIGH_INEQUALITY: Average Gini coefficient ${overallAvgGini.toFixed(3)} indicates extreme wealth concentration`,
    );
  }

  // Mass bankruptcy
  const avgBankruptcies =
    runs.reduce((s, r) => s + r.bankruptcyCount, 0) / totalRuns;
  if (avgBankruptcies > 2) {
    balanceIssues.push(
      `MASS_BANKRUPTCY: Average ${avgBankruptcies.toFixed(1)} bankruptcies per game`,
    );
  }

  // Economy deflation
  if (economyStats.avgFinalCargoPrice < 15) {
    balanceIssues.push(
      `ECONOMY_DEFLATION: Average final cargo price ${economyStats.avgFinalCargoPrice.toFixed(1)} is very low`,
    );
  }

  // AI stuck warnings
  const stuckCount = warningFrequency["AI_STUCK_NO_ROUTES"] ?? 0;
  if (stuckCount > totalRuns * 2) {
    balanceIssues.push(
      `AI_STUCK: AI_STUCK_NO_ROUTES warning fired ${stuckCount} times across ${totalRuns} runs`,
    );
  }

  // Diplomacy stats from trajectory snapshots
  const diplomacyStats = {
    avgFinalWars: 0,
    avgFinalPeaces: 0,
    avgFinalTradePacts: 0,
    avgFinalAlliances: 0,
    avgOpenPorts: 0,
    avgClosedPorts: 0,
  };
  const runsWithDiplomacy = runs.filter(
    (r) => r.diplomacyTrajectory.length > 0,
  );
  if (runsWithDiplomacy.length > 0) {
    for (const run of runsWithDiplomacy) {
      const last = run.diplomacyTrajectory[run.diplomacyTrajectory.length - 1];
      diplomacyStats.avgFinalWars += last.wars;
      diplomacyStats.avgFinalPeaces += last.peaces;
      diplomacyStats.avgFinalTradePacts += last.tradePacts;
      diplomacyStats.avgFinalAlliances += last.alliances;
      diplomacyStats.avgOpenPorts += last.openPorts;
      diplomacyStats.avgClosedPorts += last.closedPorts;
    }
    const n = runsWithDiplomacy.length;
    diplomacyStats.avgFinalWars /= n;
    diplomacyStats.avgFinalPeaces /= n;
    diplomacyStats.avgFinalTradePacts /= n;
    diplomacyStats.avgFinalAlliances /= n;
    diplomacyStats.avgOpenPorts /= n;
    diplomacyStats.avgClosedPorts /= n;
  }

  // Excessive wars check
  const warWarnings = warningFrequency["WAR_OUTBREAK"] ?? 0;
  if (warWarnings > totalRuns * 30) {
    balanceIssues.push(
      `EXCESSIVE_WARS: WAR_OUTBREAK fired ${warWarnings} times across ${totalRuns} runs (${(warWarnings / totalRuns).toFixed(1)} per game)`,
    );
  }

  return {
    totalRuns,
    avgWallTimeMs,
    personalityWinRate,
    personalityAvgScore,
    personalityBankruptcyRate,
    bySizeStats,
    byShapeStats,
    eventFrequency,
    warningFrequency,
    economyStats,
    diplomacyStats,
    balanceIssues,
  };
}

// ---------------------------------------------------------------------------
// Batch simulation test
// ---------------------------------------------------------------------------

describe("Batch AI Simulation Analysis", () => {
  // Use a targeted matrix: all seeds × small + medium (full large takes longer)
  // Also run a subset with varied companies and shapes
  const allRuns: RunSummary[] = [];

  it("runs core simulation matrix (seeds × sizes)", () => {
    for (const seed of SEEDS) {
      for (const size of SIZES) {
        const config = makeConfig(seed, size, 0, "spiral"); // 0 = use default count
        const runner = new SimulationRunner();
        const result = runner.run(config);
        allRuns.push(extractRunSummary(result));
      }
    }
    expect(allRuns.length).toBe(SEEDS.length * SIZES.length);
  }, 120_000);

  it("runs shape variation matrix", () => {
    const startLen = allRuns.length;
    for (const shape of SHAPES) {
      for (const seed of SEEDS.slice(0, 2)) {
        const config = makeConfig(seed, "quick", 0, shape);
        const runner = new SimulationRunner();
        const result = runner.run(config);
        allRuns.push(extractRunSummary(result));
      }
    }
    expect(allRuns.length).toBeGreaterThan(startLen);
  }, 60_000);

  it("runs company count variation matrix", () => {
    const startLen = allRuns.length;
    for (const count of COMPANY_COUNTS) {
      for (const seed of SEEDS.slice(0, 2)) {
        const config = makeConfig(seed, "standard", count, "spiral");
        const runner = new SimulationRunner();
        const result = runner.run(config);
        allRuns.push(extractRunSummary(result));
      }
    }
    expect(allRuns.length).toBeGreaterThan(startLen);
  }, 60_000);

  it("analyzes results and writes report", () => {
    expect(allRuns.length).toBeGreaterThan(0);

    const analysis = analyzeRuns(allRuns);

    // Output report to console (avoid node:fs imports in browser-only tsconfig)
    const report = generateReport(allRuns, analysis);

    console.log("\n" + report);

    // Basic sanity assertions
    expect(analysis.totalRuns).toBeGreaterThan(0);
    expect(analysis.economyStats.avgFinalFuelPrice).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generateReport(
  runs: RunSummary[],
  analysis: AggregateAnalysis,
): string {
  const lines: string[] = [];
  lines.push("# Batch AI Simulation Analysis Report");
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`Total runs: ${analysis.totalRuns}`);
  lines.push(
    `Average wall time: ${analysis.avgWallTimeMs.toFixed(0)}ms per run`,
  );

  // Personality win rates
  lines.push("\n## Personality Win Rates\n");
  lines.push("| Personality | Wins | Rate | Avg Score | Bankruptcy Rate |");
  lines.push("|---|---|---|---|---|");
  for (const [p, wr] of Object.entries(analysis.personalityWinRate)) {
    const avgScore = analysis.personalityAvgScore[p]?.avg ?? 0;
    const br = analysis.personalityBankruptcyRate[p]?.rate ?? 0;
    lines.push(
      `| ${p} | ${wr.wins}/${analysis.totalRuns} | ${(wr.rate * 100).toFixed(1)}% | ${avgScore.toFixed(0)} | ${(br * 100).toFixed(1)}% |`,
    );
  }

  // By game size
  lines.push("\n## Stats by Game Size\n");
  lines.push(
    "| Size | Runs | Avg Bankruptcies | Avg Score Spread | Avg Gini | Avg Winner Score | Avg Fuel | Avg Cargo Price |",
  );
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const [size, stats] of Object.entries(analysis.bySizeStats)) {
    lines.push(
      `| ${size} | ${stats.runs} | ${stats.avgBankruptcies.toFixed(1)} | ${stats.avgScoreSpread.toFixed(0)} | ${stats.avgGini.toFixed(3)} | ${stats.avgWinnerScore.toFixed(0)} | ${stats.avgFuelPrice.toFixed(1)} | ${stats.avgCargoPrice.toFixed(1)} |`,
    );
  }

  // By shape
  lines.push("\n## Stats by Galaxy Shape\n");
  lines.push("| Shape | Runs | Avg Bankruptcies | Avg Gini |");
  lines.push("|---|---|---|---|");
  for (const [shape, stats] of Object.entries(analysis.byShapeStats)) {
    lines.push(
      `| ${shape} | ${stats.runs} | ${stats.avgBankruptcies.toFixed(1)} | ${stats.avgGini.toFixed(3)} |`,
    );
  }

  // Economy
  lines.push("\n## Economy Health\n");
  lines.push(
    `- Avg final fuel price: ${analysis.economyStats.avgFinalFuelPrice.toFixed(2)}`,
  );
  lines.push(
    `- Avg peak fuel price: ${analysis.economyStats.avgPeakFuelPrice.toFixed(2)}`,
  );
  lines.push(
    `- Fuel price variance: ${analysis.economyStats.fuelPriceVariance.toFixed(2)}`,
  );
  lines.push(
    `- Avg final cargo price: ${analysis.economyStats.avgFinalCargoPrice.toFixed(2)}`,
  );

  // Diplomacy
  lines.push("\n## Diplomacy Health\n");
  const ds = analysis.diplomacyStats;
  lines.push(`- Avg final wars: ${ds.avgFinalWars.toFixed(2)}`);
  lines.push(`- Avg final peaces: ${ds.avgFinalPeaces.toFixed(2)}`);
  lines.push(`- Avg final trade pacts: ${ds.avgFinalTradePacts.toFixed(2)}`);
  lines.push(`- Avg final alliances: ${ds.avgFinalAlliances.toFixed(2)}`);
  lines.push(`- Avg open border ports: ${ds.avgOpenPorts.toFixed(1)}`);
  lines.push(`- Avg closed border ports: ${ds.avgClosedPorts.toFixed(1)}`);

  // Top events
  lines.push("\n## Event Frequency (top 15)\n");
  lines.push("| Event | Total Occurrences |");
  lines.push("|---|---|");
  const sortedEvents = Object.entries(analysis.eventFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [evt, count] of sortedEvents) {
    lines.push(`| ${evt} | ${count} |`);
  }

  // Warnings
  lines.push("\n## Warning Frequency\n");
  lines.push("| Warning | Total Count |");
  lines.push("|---|---|");
  const sortedWarnings = Object.entries(analysis.warningFrequency).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [warn, count] of sortedWarnings) {
    lines.push(`| ${warn} | ${count} |`);
  }

  // Balance issues
  lines.push("\n## Detected Balance Issues\n");
  if (analysis.balanceIssues.length === 0) {
    lines.push("No critical balance issues detected.");
  } else {
    for (const issue of analysis.balanceIssues) {
      lines.push(`- **${issue}**`);
    }
  }

  // Sample run details (first 3)
  lines.push("\n## Sample Run Details\n");
  for (const run of runs.slice(0, 3)) {
    lines.push(
      `### Seed ${run.seed}, ${run.size}, ${run.shape}, ${run.companyCount} companies`,
    );
    lines.push(
      `- Winner: ${run.winnerName} (score: ${run.winnerScore.toFixed(0)})`,
    );
    lines.push(`- Bankruptcies: ${run.bankruptcyCount}`);
    lines.push(
      `- Final fuel: ${run.finalFuelPrice.toFixed(2)}, cargo: ${run.finalAvgCargoPrice.toFixed(2)}`,
    );
    lines.push("- Rankings:");
    for (const r of run.rankings) {
      lines.push(
        `  - ${r.name}: score=${r.score.toFixed(0)}, nw=${r.netWorth.toFixed(0)}, fleet=${r.fleetSize}, routes=${r.routeCount}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
