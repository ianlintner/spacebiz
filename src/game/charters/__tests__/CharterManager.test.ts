import { describe, it, expect } from "vitest";
import type {
  AICompany,
  ActiveRoute,
  Charter,
  Empire,
  EmpireRouteSlotPool,
  GameState,
  Planet,
  StarSystem,
} from "../../../data/types.ts";
import {
  PLAYER_COMPANY_ID,
  DEFAULT_EMPIRE_POOL_BY_STANCE,
} from "../../../data/constants.ts";
import {
  classifyRoutePool,
  defaultPoolFor,
  findChartersForRoute,
  forfeitCharter,
  getEmpirePool,
  getHeldCharters,
  getUpkeepDue,
  grantCharter,
  calculateUpkeep,
} from "../CharterManager.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeEmpire(
  id: string,
  pool?: Partial<EmpireRouteSlotPool>,
  tariffRate = 0,
): Empire {
  return {
    id,
    name: id.toUpperCase(),
    color: 0xffffff,
    tariffRate,
    disposition: "neutral",
    homeSystemId: `${id}-home`,
    leaderName: `${id}-leader`,
    leaderPortrait: { portraitId: "p", category: "human" },
    routeSlotPool: pool
      ? {
          policyStance: "regulated",
          domesticTotal: 4,
          foreignTotal: 2,
          domesticOpen: 4,
          foreignOpen: 2,
          ...pool,
        }
      : undefined,
  };
}

function makeSystem(id: string, empireId: string): StarSystem {
  return {
    id,
    name: id,
    sectorId: "s",
    empireId,
    x: 0,
    y: 0,
    starColor: 0,
  };
}

function makePlanet(id: string, systemId: string): Planet {
  return {
    id,
    name: id,
    systemId,
    type: "frontier",
    x: 0,
    y: 0,
    population: 1_000_000,
  };
}

function makeAI(id: string, empireId: string): AICompany {
  return {
    id,
    name: id,
    empireId,
    cash: 100000,
    fleet: [],
    activeRoutes: [],
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "AI",
    ceoPortrait: { portraitId: "p", category: "human" },
  };
}

function makeState(opts: {
  empires: Empire[];
  systems: StarSystem[];
  planets: Planet[];
  aiCompanies?: AICompany[];
  charters?: Charter[];
  empireReputation?: Record<string, number>;
  activeRoutes?: ActiveRoute[];
  turn?: number;
}): GameState {
  return {
    turn: opts.turn ?? 1,
    galaxy: {
      sectors: [],
      empires: opts.empires,
      systems: opts.systems,
      planets: opts.planets,
    },
    aiCompanies: opts.aiCompanies ?? [],
    charters: opts.charters ?? [],
    activeRoutes: opts.activeRoutes ?? [],
    empireReputation: opts.empireReputation ?? {},
    reputation: 50,
  } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// defaultPoolFor / getEmpirePool
// ---------------------------------------------------------------------------

describe("defaultPoolFor", () => {
  it("uses the regulated stance when no pool is set", () => {
    const empire = makeEmpire("solaris");
    const pool = defaultPoolFor(empire);
    expect(pool.policyStance).toBe("regulated");
    expect(pool.domesticTotal).toBe(
      DEFAULT_EMPIRE_POOL_BY_STANCE.regulated.domesticTotal,
    );
    expect(pool.domesticOpen).toBe(pool.domesticTotal);
    expect(pool.foreignOpen).toBe(pool.foreignTotal);
  });

  it("respects an explicit policyStance when present", () => {
    const empire: Empire = {
      ...makeEmpire("vex"),
      routeSlotPool: {
        policyStance: "isolationist",
      } as unknown as EmpireRouteSlotPool,
    };
    const pool = defaultPoolFor(empire);
    expect(pool.policyStance).toBe("isolationist");
    expect(pool.domesticTotal).toBe(
      DEFAULT_EMPIRE_POOL_BY_STANCE.isolationist.domesticTotal,
    );
    expect(pool.foreignTotal).toBe(
      DEFAULT_EMPIRE_POOL_BY_STANCE.isolationist.foreignTotal,
    );
  });
});

describe("getEmpirePool", () => {
  it("returns the explicit pool when present", () => {
    const empire = makeEmpire("solaris", {
      domesticTotal: 7,
      foreignTotal: 3,
      domesticOpen: 5,
      foreignOpen: 1,
    });
    expect(getEmpirePool(empire).domesticTotal).toBe(7);
    expect(getEmpirePool(empire).foreignOpen).toBe(1);
  });

  it("falls back to the default for empires without an explicit pool", () => {
    const empire = makeEmpire("krell");
    expect(getEmpirePool(empire).domesticOpen).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// classifyRoutePool
// ---------------------------------------------------------------------------

describe("classifyRoutePool", () => {
  it("returns domestic when both planets are in the same empire", () => {
    const state = makeState({
      empires: [makeEmpire("solaris")],
      systems: [makeSystem("sys-a", "solaris"), makeSystem("sys-b", "solaris")],
      planets: [makePlanet("p1", "sys-a"), makePlanet("p2", "sys-b")],
    });
    const cls = classifyRoutePool(state, "p1", "p2");
    expect(cls).toEqual({ empireId: "solaris", pool: "domestic" });
  });

  it("returns foreign keyed to destination empire when crossing borders", () => {
    const state = makeState({
      empires: [makeEmpire("solaris"), makeEmpire("vex")],
      systems: [makeSystem("sys-a", "solaris"), makeSystem("sys-b", "vex")],
      planets: [makePlanet("p1", "sys-a"), makePlanet("p2", "sys-b")],
    });
    const cls = classifyRoutePool(state, "p1", "p2");
    expect(cls).toEqual({ empireId: "vex", pool: "foreign" });
  });

  it("returns null when a planet is missing", () => {
    const state = makeState({
      empires: [makeEmpire("solaris")],
      systems: [makeSystem("sys-a", "solaris")],
      planets: [makePlanet("p1", "sys-a")],
    });
    expect(classifyRoutePool(state, "p1", "missing")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// grantCharter
// ---------------------------------------------------------------------------

describe("grantCharter", () => {
  it("grants a permanent player charter and decrements the empire pool", () => {
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 3, domesticTotal: 4 })],
      systems: [],
      planets: [],
    });
    const result = grantCharter(state, {
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    });
    expect(result.error).toBeNull();
    expect(result.playerCharters).toHaveLength(1);
    expect(result.playerCharters[0].pool).toBe("domestic");
    const empire = result.empires.find((e) => e.id === "solaris");
    expect(empire?.routeSlotPool?.domesticOpen).toBe(2);
  });

  it("attaches the contract source when provided", () => {
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 1, domesticTotal: 1 })],
      systems: [],
      planets: [],
    });
    const result = grantCharter(state, {
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      term: { kind: "permanent", upkeepPerTurn: 800 },
      source: { contractId: "contract-42" },
    });
    expect(result.charter.sourceContractId).toBe("contract-42");
    expect(result.charter.sourceAuctionId).toBeUndefined();
  });

  it("rejects when the empire has no open slots", () => {
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 0, domesticTotal: 4 })],
      systems: [],
      planets: [],
    });
    const result = grantCharter(state, {
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    });
    expect(result.error).toBe("no-open-slot");
    expect(result.playerCharters).toHaveLength(0);
  });

  it("rejects when the empire is unknown", () => {
    const state = makeState({ empires: [], systems: [], planets: [] });
    const result = grantCharter(state, {
      empireId: "nope",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    });
    expect(result.error).toBe("unknown-empire");
  });

  it("grants to AI companies and updates their charters list", () => {
    const ai = makeAI("ai-1", "solaris");
    const state = makeState({
      empires: [makeEmpire("solaris", { foreignOpen: 2, foreignTotal: 2 })],
      systems: [],
      planets: [],
      aiCompanies: [ai],
    });
    const result = grantCharter(state, {
      empireId: "solaris",
      pool: "foreign",
      holderId: "ai-1",
      term: { kind: "fixedTerm", expiresOnTurn: 9 },
      source: { auctionId: "auction-3" },
    });
    expect(result.error).toBeNull();
    expect(result.playerCharters).toHaveLength(0);
    const updated = result.aiCompanies.find((c) => c.id === "ai-1");
    expect(updated?.charters).toHaveLength(1);
    expect(updated?.charters?.[0].sourceAuctionId).toBe("auction-3");
  });

  it("does not mutate the input state", () => {
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 4, domesticTotal: 4 })],
      systems: [],
      planets: [],
    });
    const before = JSON.stringify(state);
    grantCharter(state, {
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    });
    expect(JSON.stringify(state)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// forfeitCharter
// ---------------------------------------------------------------------------

describe("forfeitCharter", () => {
  it("returns the slot to the empire pool", () => {
    const charter: Charter = {
      id: "ch-1",
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      grantedTurn: 1,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    };
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 3, domesticTotal: 4 })],
      systems: [],
      planets: [],
      charters: [charter],
    });
    const result = forfeitCharter(state, "ch-1");
    expect(result.found).toBe(true);
    expect(result.playerCharters).toHaveLength(0);
    expect(result.empires[0].routeSlotPool?.domesticOpen).toBe(4);
  });

  it("does not push open above total (defensive double-forfeit)", () => {
    const charter: Charter = {
      id: "ch-1",
      empireId: "solaris",
      pool: "foreign",
      holderId: PLAYER_COMPANY_ID,
      grantedTurn: 1,
      term: { kind: "permanent", upkeepPerTurn: 2500 },
    };
    const state = makeState({
      empires: [makeEmpire("solaris", { foreignOpen: 2, foreignTotal: 2 })],
      systems: [],
      planets: [],
      charters: [charter],
    });
    const result = forfeitCharter(state, "ch-1");
    expect(result.empires[0].routeSlotPool?.foreignOpen).toBe(2);
  });

  it("reports linked active route ids for caller cleanup", () => {
    const charter: Charter = {
      id: "ch-1",
      empireId: "solaris",
      pool: "domestic",
      holderId: PLAYER_COMPANY_ID,
      grantedTurn: 1,
      term: { kind: "permanent", upkeepPerTurn: 800 },
    };
    const state = makeState({
      empires: [makeEmpire("solaris", { domesticOpen: 3, domesticTotal: 4 })],
      systems: [],
      planets: [],
      charters: [charter],
      activeRoutes: [
        {
          id: "route-a",
          originPlanetId: "p1",
          destinationPlanetId: "p2",
          distance: 5,
          assignedShipIds: [],
          cargoType: null,
          charterId: "ch-1",
        },
        {
          id: "route-b",
          originPlanetId: "p3",
          destinationPlanetId: "p4",
          distance: 5,
          assignedShipIds: [],
          cargoType: null,
          charterId: "other",
        },
      ],
    });
    const result = forfeitCharter(state, "ch-1");
    expect(result.forfeitedRouteIds).toEqual(["route-a"]);
  });

  it("returns found=false when charter id is unknown", () => {
    const state = makeState({
      empires: [makeEmpire("solaris")],
      systems: [],
      planets: [],
    });
    const result = forfeitCharter(state, "missing");
    expect(result.found).toBe(false);
    expect(result.forfeitedRouteIds).toEqual([]);
  });

  it("forfeits AI charters and refunds the right pool", () => {
    const charter: Charter = {
      id: "ai-ch-1",
      empireId: "solaris",
      pool: "foreign",
      holderId: "ai-1",
      grantedTurn: 1,
      term: { kind: "fixedTerm", expiresOnTurn: 5 },
    };
    const ai = { ...makeAI("ai-1", "solaris"), charters: [charter] };
    const state = makeState({
      empires: [makeEmpire("solaris", { foreignOpen: 1, foreignTotal: 2 })],
      systems: [],
      planets: [],
      aiCompanies: [ai],
    });
    const result = forfeitCharter(state, "ai-ch-1");
    expect(result.found).toBe(true);
    expect(result.aiCompanies[0].charters).toHaveLength(0);
    expect(result.empires[0].routeSlotPool?.foreignOpen).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// findChartersForRoute
// ---------------------------------------------------------------------------

describe("findChartersForRoute", () => {
  function setupTwoEmpireState(charters: Charter[] = []): GameState {
    return makeState({
      empires: [makeEmpire("solaris"), makeEmpire("vex")],
      systems: [makeSystem("sys-a", "solaris"), makeSystem("sys-b", "vex")],
      planets: [makePlanet("p1", "sys-a"), makePlanet("p2", "sys-b")],
      charters,
    });
  }

  it("returns the matching charter id for a domestic route", () => {
    const state = setupTwoEmpireState([
      {
        id: "ch-1",
        empireId: "solaris",
        pool: "domestic",
        holderId: PLAYER_COMPANY_ID,
        grantedTurn: 1,
        term: { kind: "permanent", upkeepPerTurn: 800 },
      },
    ]);
    const result = findChartersForRoute(state, PLAYER_COMPANY_ID, "p1", "p1");
    expect(result).toEqual({ charterId: "ch-1" });
  });

  it("rejects a foreign route when only a domestic charter is held", () => {
    const state = setupTwoEmpireState([
      {
        id: "ch-1",
        empireId: "vex",
        pool: "domestic",
        holderId: PLAYER_COMPANY_ID,
        grantedTurn: 1,
        term: { kind: "permanent", upkeepPerTurn: 800 },
      },
    ]);
    const result = findChartersForRoute(state, PLAYER_COMPANY_ID, "p1", "p2");
    expect(result).toEqual({ error: "no-matching-charter" });
  });

  it("accepts a foreign route when matching foreign charter is held", () => {
    const state = setupTwoEmpireState([
      {
        id: "ch-fgn",
        empireId: "vex",
        pool: "foreign",
        holderId: PLAYER_COMPANY_ID,
        grantedTurn: 1,
        term: { kind: "fixedTerm", expiresOnTurn: 8 },
      },
    ]);
    const result = findChartersForRoute(state, PLAYER_COMPANY_ID, "p1", "p2");
    expect(result).toEqual({ charterId: "ch-fgn" });
  });

  it("flags invalid routes when an endpoint is missing", () => {
    const state = setupTwoEmpireState();
    const result = findChartersForRoute(
      state,
      PLAYER_COMPANY_ID,
      "p1",
      "ghost",
    );
    expect(result).toEqual({ error: "invalid-route" });
  });
});

// ---------------------------------------------------------------------------
// calculateUpkeep
// ---------------------------------------------------------------------------

describe("calculateUpkeep", () => {
  it("scales by tariff rate", () => {
    const empireZero = makeEmpire("solaris", undefined, 0);
    const empireHi = makeEmpire("krell", undefined, 0.3);
    const state = makeState({
      empires: [empireZero, empireHi],
      systems: [],
      planets: [],
      empireReputation: { solaris: 50, krell: 50 },
    });
    const baseDom = calculateUpkeep(
      state,
      empireZero,
      "domestic",
      PLAYER_COMPANY_ID,
    );
    const hiDom = calculateUpkeep(
      state,
      empireHi,
      "domestic",
      PLAYER_COMPANY_ID,
    );
    expect(hiDom).toBeGreaterThan(baseDom);
    expect(hiDom / baseDom).toBeCloseTo(1.3, 1);
  });

  it("discounts for renowned/legendary reputation", () => {
    const empire = makeEmpire("solaris");
    const stateLow = makeState({
      empires: [empire],
      systems: [],
      planets: [],
      empireReputation: { solaris: 10 },
    });
    const stateHi = makeState({
      empires: [empire],
      systems: [],
      planets: [],
      empireReputation: { solaris: 95 },
    });
    const low = calculateUpkeep(
      stateLow,
      empire,
      "domestic",
      PLAYER_COMPANY_ID,
    );
    const hi = calculateUpkeep(stateHi, empire, "domestic", PLAYER_COMPANY_ID);
    expect(hi).toBeLessThan(low);
  });

  it("foreign upkeep is materially higher than domestic at the same rep/tariff", () => {
    const empire = makeEmpire("solaris");
    const state = makeState({
      empires: [empire],
      systems: [],
      planets: [],
      empireReputation: { solaris: 50 },
    });
    const dom = calculateUpkeep(state, empire, "domestic", PLAYER_COMPANY_ID);
    const fgn = calculateUpkeep(state, empire, "foreign", PLAYER_COMPANY_ID);
    expect(fgn).toBeGreaterThan(dom * 2);
  });
});

// ---------------------------------------------------------------------------
// getHeldCharters / getUpkeepDue
// ---------------------------------------------------------------------------

describe("getHeldCharters", () => {
  it("filters by empire when provided", () => {
    const state = makeState({
      empires: [makeEmpire("solaris"), makeEmpire("vex")],
      systems: [],
      planets: [],
      charters: [
        {
          id: "ch-1",
          empireId: "solaris",
          pool: "domestic",
          holderId: PLAYER_COMPANY_ID,
          grantedTurn: 1,
          term: { kind: "permanent", upkeepPerTurn: 800 },
        },
        {
          id: "ch-2",
          empireId: "vex",
          pool: "foreign",
          holderId: PLAYER_COMPANY_ID,
          grantedTurn: 1,
          term: { kind: "fixedTerm", expiresOnTurn: 5 },
        },
      ],
    });
    expect(getHeldCharters(state, PLAYER_COMPANY_ID)).toHaveLength(2);
    expect(getHeldCharters(state, PLAYER_COMPANY_ID, "vex")).toHaveLength(1);
  });
});

describe("getUpkeepDue", () => {
  it("sums permanent charter upkeep and ignores fixed-term charters", () => {
    const state = makeState({
      empires: [makeEmpire("solaris")],
      systems: [],
      planets: [],
      charters: [
        {
          id: "ch-1",
          empireId: "solaris",
          pool: "domestic",
          holderId: PLAYER_COMPANY_ID,
          grantedTurn: 1,
          term: { kind: "permanent", upkeepPerTurn: 800 },
        },
        {
          id: "ch-2",
          empireId: "solaris",
          pool: "foreign",
          holderId: PLAYER_COMPANY_ID,
          grantedTurn: 1,
          term: { kind: "permanent", upkeepPerTurn: 2500 },
        },
        {
          id: "ch-3",
          empireId: "solaris",
          pool: "foreign",
          holderId: PLAYER_COMPANY_ID,
          grantedTurn: 1,
          term: { kind: "fixedTerm", expiresOnTurn: 8 },
        },
      ],
    });
    expect(getUpkeepDue(state, PLAYER_COMPANY_ID)).toBe(3300);
  });
});
