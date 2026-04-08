import type { GameState, TurnResult } from "../../data/types.ts";
import { BASE_FUEL_PRICE } from "../../data/constants.ts";

// ── Types ──────────────────────────────────────────────────────

export type SimLogLevel = "summary" | "standard" | "verbose";

export interface SimulationConfig {
  seed: number;
  gameSize: "small" | "medium" | "large";
  galaxyShape: "spiral" | "elliptical" | "ring" | "irregular";
  companyCount: number;
  maxTurns: number;
  logLevel: SimLogLevel;
}

export interface CompanyTurnLog {
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
  breakdowns: number;
  bankrupt: boolean;
}

export interface SimWarning {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
  context: Record<string, unknown>;
}

export interface TurnLog {
  turn: number;
  economy: {
    fuelPrice: number;
    avgCargoPrice: number;
    totalMarketVolume: number;
  };
  companies: CompanyTurnLog[];
  events: { name: string; category: string }[];
  warnings: SimWarning[];
}

export interface EconomySnapshot {
  finalFuelPrice: number;
  avgFuelPrice: number;
  peakFuelPrice: number;
  finalAvgCargoPrice: number;
}

export interface SimulationSummary {
  winner: { name: string; score: number; netWorth: number } | null;
  rankings: {
    name: string;
    score: number;
    netWorth: number;
    fleetSize: number;
    routeCount: number;
  }[];
  bankruptcies: { name: string; turn: number }[];
  economySnapshot: EconomySnapshot;
  eventCounts: Record<string, number>;
  totalTurns: number;
  warningCounts: Record<string, number>;
}

export interface SimulationResult {
  config: SimulationConfig;
  turnLogs: TurnLog[];
  summary: SimulationSummary;
  wallTimeMs: number;
}

// ── Logger ─────────────────────────────────────────────────────

export class SimulationLogger {
  private turnLogs: TurnLog[] = [];
  private bankruptcyLog: { name: string; turn: number }[] = [];
  private previousCash: Map<string, number> = new Map();
  private previousFleetIds: Map<string, Set<string>> = new Map();
  private previousRouteIds: Map<string, Set<string>> = new Map();
  private firstTurnAvgCargoPrice: number | null = null;
  private noRouteTurnCounts: Map<string, number> = new Map();

  constructor(_config: SimulationConfig) {
    // config reserved for future use (e.g. log-level filtering)
    void _config;
  }

  logTurn(state: GameState, turnResult: TurnResult): TurnLog {
    const economy = this.buildEconomyMetrics(state);
    const companies = this.buildCompanyLogs(state, turnResult);
    const warnings = this.detectWarnings(state, turnResult.turn);

    if (this.firstTurnAvgCargoPrice === null) {
      this.firstTurnAvgCargoPrice = economy.avgCargoPrice;
    }

    // Track bankruptcies
    for (const company of state.aiCompanies) {
      if (company.bankrupt) {
        const already = this.bankruptcyLog.some((b) => b.name === company.name);
        if (!already) {
          this.bankruptcyLog.push({
            name: company.name,
            turn: turnResult.turn,
          });
        }
      }
    }

    // Update previous cash for next turn's delta calculation
    for (const company of state.aiCompanies) {
      this.previousCash.set(company.id, company.cash);
      this.previousFleetIds.set(
        company.id,
        new Set(company.fleet.map((s) => s.id)),
      );
      this.previousRouteIds.set(
        company.id,
        new Set(company.activeRoutes.map((r) => r.id)),
      );
    }

    const events = state.activeEvents.map((e) => ({
      name: e.name,
      category: e.category,
    }));

    const turnLog: TurnLog = {
      turn: turnResult.turn,
      economy,
      companies,
      events,
      warnings,
    };

    this.turnLogs.push(turnLog);
    return turnLog;
  }

  private detectWarnings(state: GameState, _turn: number): SimWarning[] {
    const warnings: SimWarning[] = [];

    // AI_STUCK_NO_ROUTES: AI has ships but no routes and cash > 50k for 5+ turns
    for (const company of state.aiCompanies) {
      if (company.bankrupt) {
        this.noRouteTurnCounts.delete(company.id);
        continue;
      }

      if (
        company.fleet.length > 0 &&
        company.activeRoutes.length === 0 &&
        company.cash > 50000
      ) {
        const count = (this.noRouteTurnCounts.get(company.id) ?? 0) + 1;
        this.noRouteTurnCounts.set(company.id, count);

        if (count >= 5) {
          warnings.push({
            level: "warn",
            code: "AI_STUCK_NO_ROUTES",
            message: `${company.name} has ${company.fleet.length} ships but 0 routes for ${count} turns`,
            context: {
              companyId: company.id,
              companyName: company.name,
              fleetSize: company.fleet.length,
              cash: company.cash,
              turnsStuck: count,
            },
          });
        }
      } else {
        this.noRouteTurnCounts.set(company.id, 0);
      }
    }

    // Economy warnings based on cargo price history
    const avgCargoPrice = this.buildEconomyMetrics(state).avgCargoPrice;
    const baseline = this.firstTurnAvgCargoPrice ?? avgCargoPrice;

    if (baseline > 0 && avgCargoPrice < baseline * 0.7) {
      warnings.push({
        level: "warn",
        code: "ECONOMY_DEFLATION",
        message: `Average cargo price ${avgCargoPrice.toFixed(1)} is below 70% of baseline ${baseline.toFixed(1)}`,
        context: { avgCargoPrice, baseline, ratio: avgCargoPrice / baseline },
      });
    }

    if (baseline > 0 && avgCargoPrice > baseline * 1.5) {
      warnings.push({
        level: "warn",
        code: "ECONOMY_INFLATION",
        message: `Average cargo price ${avgCargoPrice.toFixed(1)} exceeds 150% of baseline ${baseline.toFixed(1)}`,
        context: { avgCargoPrice, baseline, ratio: avgCargoPrice / baseline },
      });
    }

    // MASS_BANKRUPTCY: >50% of companies bankrupt
    const totalCompanies = state.aiCompanies.length;
    const bankruptCount = state.aiCompanies.filter((c) => c.bankrupt).length;
    if (totalCompanies > 0 && bankruptCount / totalCompanies > 0.5) {
      warnings.push({
        level: "error",
        code: "MASS_BANKRUPTCY",
        message: `${bankruptCount}/${totalCompanies} companies are bankrupt`,
        context: {
          bankruptCount,
          totalCompanies,
          ratio: bankruptCount / totalCompanies,
        },
      });
    }

    // BALANCE_OUTLIER: one company > 60% of total cash
    const totalCash = state.aiCompanies.reduce((sum, c) => sum + c.cash, 0);
    if (totalCash > 0) {
      for (const company of state.aiCompanies) {
        if (company.cash / totalCash > 0.6) {
          warnings.push({
            level: "warn",
            code: "BALANCE_OUTLIER",
            message: `${company.name} holds ${((company.cash / totalCash) * 100).toFixed(1)}% of total economy cash`,
            context: {
              companyId: company.id,
              companyName: company.name,
              companyCash: company.cash,
              totalCash,
              ratio: company.cash / totalCash,
            },
          });
        }
      }
    }

    // FUEL_CRISIS: fuel price > 140% of base
    if (state.market.fuelPrice > BASE_FUEL_PRICE * 1.4) {
      warnings.push({
        level: "warn",
        code: "FUEL_CRISIS",
        message: `Fuel price ${state.market.fuelPrice.toFixed(1)} exceeds 140% of base (${BASE_FUEL_PRICE})`,
        context: {
          fuelPrice: state.market.fuelPrice,
          baseFuelPrice: BASE_FUEL_PRICE,
          ratio: state.market.fuelPrice / BASE_FUEL_PRICE,
        },
      });
    }

    return warnings;
  }

  private buildEconomyMetrics(state: GameState): TurnLog["economy"] {
    const fuelPrice = state.market.fuelPrice;

    let totalPrice = 0;
    let priceCount = 0;
    let totalVolume = 0;

    const planetMarkets = state.market.planetMarkets;
    for (const planetId of Object.keys(planetMarkets)) {
      const market = planetMarkets[planetId];
      for (const cargoKey of Object.keys(market) as Array<
        keyof typeof market
      >) {
        const entry = market[cargoKey];
        totalPrice += entry.currentPrice;
        priceCount += 1;
        totalVolume += entry.baseDemand + entry.baseSupply;
      }
    }

    return {
      fuelPrice,
      avgCargoPrice: priceCount > 0 ? totalPrice / priceCount : 0,
      totalMarketVolume: totalVolume,
    };
  }

  private buildCompanyLogs(
    state: GameState,
    turnResult: TurnResult,
  ): CompanyTurnLog[] {
    const summaryMap = new Map(
      turnResult.aiSummaries.map((s) => [s.companyId, s]),
    );

    return state.aiCompanies.map((company) => {
      const summary = summaryMap.get(company.id);
      const prevCash = this.previousCash.get(company.id) ?? company.cash;

      // Estimate costs from route performance data
      let totalFuel = 0;
      let totalBreakdowns = 0;
      for (const rp of turnResult.routePerformance) {
        // Route performance includes all routes; we can't distinguish per-company
        // from the global list, so we use summary-level data when available
        totalFuel += rp.fuelCost;
        totalBreakdowns += rp.breakdowns;
      }

      const revenue = summary?.revenue ?? 0;
      const cashDelta = company.cash - prevCash;

      // Detect new ships by comparing fleet IDs to previous turn
      const prevFleet =
        this.previousFleetIds.get(company.id) ?? new Set<string>();
      const newShips = company.fleet
        .filter((s) => !prevFleet.has(s.id))
        .map((s) => s.name);

      // Detect new routes by comparing route IDs to previous turn
      const prevRoutes =
        this.previousRouteIds.get(company.id) ?? new Set<string>();
      const newRoutes = company.activeRoutes
        .filter((r) => !prevRoutes.has(r.id))
        .map((r) => ({
          origin: r.originPlanetId,
          dest: r.destinationPlanetId,
          cargo: r.cargoType ?? "unknown",
        }));

      return {
        id: company.id,
        name: company.name,
        personality: company.personality,
        cash: company.cash,
        cashDelta,
        revenue,
        costs: {
          fuel: 0, // per-company fuel not available from summaries
          maintenance: 0,
          tariffs: 0,
          licenses: 0,
        },
        fleetSize: company.fleet.length,
        routeCount: company.activeRoutes.length,
        shipsPurchased: newShips,
        routesOpened: newRoutes,
        breakdowns: 0,
        bankrupt: company.bankrupt,
      };
    });
  }

  getTurnLogs(): TurnLog[] {
    return [...this.turnLogs];
  }

  getBankruptcyLog(): { name: string; turn: number }[] {
    return [...this.bankruptcyLog];
  }
}
