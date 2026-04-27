import type {
  GameState,
  TurnResult,
  AICompany,
  Empire,
  Planet,
  StarSystem,
  Sector,
  GameEvent,
} from "../../../data/types.ts";

/**
 * Minimal GameState/TurnResult builders for ticker tests.
 * Cast through `unknown` because we only populate the fields the news layer touches.
 */

export function makeEmpire(id: string, name: string): Empire {
  return {
    id,
    name,
    color: 0x00ff88,
    leaderName: `Leader of ${name}`,
    leaderPortrait: { seed: 0, role: "leader" },
    tariffRate: 0,
    disposition: 0,
  } as unknown as Empire;
}

export function makePlanet(id: string, name: string, systemId: string): Planet {
  return {
    id,
    name,
    systemId,
    type: 0 as unknown as Planet["type"],
    population: 100_000,
    x: 0,
    y: 0,
  } as unknown as Planet;
}

export function makeSystem(
  id: string,
  name: string,
  sectorId: string,
): StarSystem {
  return {
    id,
    name,
    sectorId,
    empireId: "emp-1",
    x: 0,
    y: 0,
    starColor: 0xffffff,
  } as unknown as StarSystem;
}

export function makeSector(id: string, name: string): Sector {
  return { id, name } as unknown as Sector;
}

export function makeCompany(
  id: string,
  name: string,
  ceoName: string,
  cash: number,
): AICompany {
  return {
    id,
    name,
    empireId: "emp-1",
    cash,
    fleet: [],
    activeRoutes: [],
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "balanced" as unknown as AICompany["personality"],
    bankrupt: false,
    ceoName,
    ceoPortrait: {
      seed: 0,
      role: "ceo",
    } as unknown as AICompany["ceoPortrait"],
  } as unknown as AICompany;
}

export interface FixtureOptions {
  seed?: number;
  turn?: number;
  cash?: number;
  empires?: Empire[];
  planets?: Planet[];
  systems?: StarSystem[];
  sectors?: Sector[];
  aiCompanies?: AICompany[];
  activeEvents?: Array<
    Pick<GameEvent, "id" | "name" | "description"> & Partial<GameEvent>
  >;
}

export function makeFixtureState(opts: FixtureOptions = {}): GameState {
  const empires = opts.empires ?? [
    makeEmpire("emp-1", "Centauri Concord"),
    makeEmpire("emp-2", "Hegemony of Vex"),
    makeEmpire("emp-3", "Free Worlds Federation"),
  ];
  const sectors = opts.sectors ?? [
    makeSector("sec-1", "Corona Reach"),
    makeSector("sec-2", "Outer Spiral"),
  ];
  const systems = opts.systems ?? [
    makeSystem("sys-1", "Sol Prime", "sec-1"),
    makeSystem("sys-2", "Zephanos", "sec-1"),
  ];
  const planets = opts.planets ?? [
    makePlanet("p-1", "New Terra", "sys-1"),
    makePlanet("p-2", "Ironhold", "sys-1"),
    makePlanet("p-3", "Tiamat", "sys-2"),
  ];
  const aiCompanies = opts.aiCompanies ?? [
    makeCompany("ai-1", "Voidsong Holdings", "Magda Pell", 80_000),
    makeCompany("ai-2", "Cygnus Bonded", "Vance Orro", 60_000),
    makeCompany("ai-3", "Trans-Sector Logistics", "Lin Aubrey", 40_000),
  ];

  return {
    seed: opts.seed ?? 42,
    turn: opts.turn ?? 1,
    cash: opts.cash ?? 100_000,
    companyName: "Player Freight Co",
    ceoName: "You",
    galaxy: { sectors, empires, systems, planets },
    aiCompanies,
    activeEvents: opts.activeEvents ?? [],
  } as unknown as GameState;
}

export function makeFixtureTurnResult(
  overrides: Partial<TurnResult> = {},
): TurnResult {
  return {
    turn: 1,
    revenue: 50_000,
    fuelCosts: 8_000,
    maintenanceCosts: 4_000,
    loanPayments: 0,
    tariffCosts: 0,
    otherCosts: 0,
    netProfit: 38_000,
    cashAtEnd: 138_000,
    cargoDelivered: {} as TurnResult["cargoDelivered"],
    passengersTransported: 0,
    eventsOccurred: [],
    routePerformance: [],
    aiSummaries: [],
    ...overrides,
  } as TurnResult;
}
