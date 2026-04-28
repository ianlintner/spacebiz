import { describe, it, expect } from "vitest";
import type {
  AICompany,
  Charter,
  CharterAuction,
  Empire,
  GameState,
} from "../../../data/types.ts";
import { PLAYER_COMPANY_ID } from "../../../data/constants.ts";
import {
  aiAuctionBid,
  calculateMinBid,
  resolveAuction,
  startAuction,
  submitBid,
} from "../CharterAuction.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEmpire(
  id: string,
  policyStance: "isolationist" | "regulated" | "open" = "regulated",
  tariffRate = 0.1,
): Empire {
  const totals =
    policyStance === "open"
      ? { d: 4, f: 4 }
      : policyStance === "isolationist"
        ? { d: 8, f: 1 }
        : { d: 6, f: 2 };
  return {
    id,
    name: id.toUpperCase(),
    color: 0,
    tariffRate,
    disposition: "neutral",
    homeSystemId: `${id}-home`,
    leaderName: "L",
    leaderPortrait: { portraitId: "p", category: "human" },
    routeSlotPool: {
      policyStance,
      domesticTotal: totals.d,
      foreignTotal: totals.f,
      domesticOpen: totals.d,
      foreignOpen: totals.f,
    },
  };
}

function makeAI(
  id: string,
  empireId: string,
  opts: Partial<AICompany> = {},
): AICompany {
  return {
    id,
    name: id,
    empireId,
    cash: 200_000,
    fleet: [],
    activeRoutes: [],
    reputation: 55,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "AI",
    ceoPortrait: { portraitId: "p", category: "human" },
    ...opts,
  };
}

function makeState(opts: {
  empires: Empire[];
  aiCompanies?: AICompany[];
  charters?: Charter[];
  activeAuctions?: CharterAuction[];
  empireReputation?: Record<string, number>;
  cash?: number;
  turn?: number;
}): GameState {
  return {
    turn: opts.turn ?? 5,
    cash: opts.cash ?? 100_000,
    galaxy: {
      sectors: [],
      empires: opts.empires,
      systems: [],
      planets: [],
    },
    aiCompanies: opts.aiCompanies ?? [],
    charters: opts.charters ?? [],
    activeAuctions: opts.activeAuctions ?? [],
    empireReputation: opts.empireReputation ?? {},
    reputation: 50,
  } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// calculateMinBid
// ---------------------------------------------------------------------------

describe("calculateMinBid", () => {
  it("foreign minimum is materially higher than domestic", () => {
    const e = makeEmpire("solaris", "regulated", 0);
    expect(calculateMinBid(e, "foreign")).toBeGreaterThan(
      calculateMinBid(e, "domestic") * 3,
    );
  });

  it("scales with tariff rate", () => {
    const cheap = makeEmpire("a", "regulated", 0);
    const pricey = makeEmpire("b", "regulated", 0.4);
    expect(calculateMinBid(pricey, "foreign")).toBeGreaterThan(
      calculateMinBid(cheap, "foreign"),
    );
  });
});

// ---------------------------------------------------------------------------
// startAuction
// ---------------------------------------------------------------------------

describe("startAuction", () => {
  it("opens an auction and reserves the slot from the empire pool", () => {
    const state = makeState({ empires: [makeEmpire("solaris")] });
    const result = startAuction(state, {
      empireId: "solaris",
      pool: "foreign",
      triggerReason: "diplomatic_crisis_end",
    });
    expect(result.error).toBeNull();
    expect(result.auction?.status).toBe("open");
    expect(result.auction?.triggerReason).toBe("diplomatic_crisis_end");
    expect(result.empires[0].routeSlotPool?.foreignOpen).toBe(1);
  });

  it("rejects when the empire has no open slots in the requested pool", () => {
    const empire = makeEmpire("solaris");
    const drained: Empire = {
      ...empire,
      routeSlotPool: { ...empire.routeSlotPool!, foreignOpen: 0 },
    };
    const state = makeState({ empires: [drained] });
    const result = startAuction(state, {
      empireId: "solaris",
      pool: "foreign",
    });
    expect(result.error).toBe("no-open-slot");
    expect(result.auction).toBeNull();
  });

  it("rejects unknown empires", () => {
    const state = makeState({ empires: [] });
    const result = startAuction(state, { empireId: "nope", pool: "domestic" });
    expect(result.error).toBe("unknown-empire");
  });
});

// ---------------------------------------------------------------------------
// submitBid
// ---------------------------------------------------------------------------

describe("submitBid", () => {
  function setup() {
    const state0 = makeState({ empires: [makeEmpire("solaris")] });
    const start = startAuction(state0, {
      empireId: "solaris",
      pool: "foreign",
    });
    return {
      state: {
        ...state0,
        activeAuctions: start.activeAuctions,
        galaxy: { ...state0.galaxy, empires: start.empires },
      } as GameState,
      auctionId: start.auction!.id,
    };
  }

  it("accepts a valid bid above the minimum", () => {
    const { state, auctionId } = setup();
    const minBid = calculateMinBid(state.galaxy.empires[0], "foreign");
    const r = submitBid(state, auctionId, {
      bidderId: PLAYER_COMPANY_ID,
      amount: minBid + 1000,
      ai: false,
    });
    expect(r.error).toBeNull();
    expect(r.escrow).toBe(minBid + 1000);
    expect(r.activeAuctions[0].bids).toHaveLength(1);
  });

  it("rejects bids below the minimum", () => {
    const { state, auctionId } = setup();
    const r = submitBid(state, auctionId, {
      bidderId: PLAYER_COMPANY_ID,
      amount: 1,
      ai: false,
    });
    expect(r.error).toBe("below-min-bid");
  });

  it("rejects duplicate bids from the same bidder", () => {
    const { state, auctionId } = setup();
    const minBid = calculateMinBid(state.galaxy.empires[0], "foreign");
    const r1 = submitBid(state, auctionId, {
      bidderId: PLAYER_COMPANY_ID,
      amount: minBid + 1000,
      ai: false,
    });
    const state2 = { ...state, activeAuctions: r1.activeAuctions };
    const r2 = submitBid(state2, auctionId, {
      bidderId: PLAYER_COMPANY_ID,
      amount: minBid + 5000,
      ai: false,
    });
    expect(r2.error).toBe("duplicate-bidder");
  });

  it("rejects unknown auction ids", () => {
    const { state } = setup();
    const r = submitBid(state, "ghost", {
      bidderId: PLAYER_COMPANY_ID,
      amount: 100_000,
      ai: false,
    });
    expect(r.error).toBe("auction-not-found");
  });
});

// ---------------------------------------------------------------------------
// resolveAuction
// ---------------------------------------------------------------------------

describe("resolveAuction", () => {
  it("highest bidder wins and receives a fixed-term charter", () => {
    const ai = makeAI("ai-1", "solaris", { cash: 500_000 });
    let state = makeState({
      empires: [makeEmpire("solaris")],
      aiCompanies: [ai],
    });
    const start = startAuction(state, {
      empireId: "solaris",
      pool: "foreign",
    });
    state = {
      ...state,
      activeAuctions: start.activeAuctions,
      galaxy: { ...state.galaxy, empires: start.empires },
    };
    const auctionId = start.auction!.id;

    state = applyBid(state, auctionId, PLAYER_COMPANY_ID, 100_000);
    state = applyBid(state, auctionId, "ai-1", 60_000);

    const r = resolveAuction(state, auctionId);
    expect(r.winnerId).toBe(PLAYER_COMPANY_ID);
    expect(r.playerCharters).toHaveLength(1);
    expect(r.playerCharters[0].term.kind).toBe("fixedTerm");
    if (r.playerCharters[0].term.kind === "fixedTerm") {
      expect(r.playerCharters[0].term.expiresOnTurn).toBe(
        state.turn + r.termTurns,
      );
    }
    // The losing AI bid is refunded.
    expect(r.aiCompanies[0].cash).toBe(500_000 + 60_000);
    // The winning auction stays in the list, marked resolved.
    const resolved = r.activeAuctions.find((a) => a.id === auctionId);
    expect(resolved?.status).toBe("resolved");
  });

  it("cancels and returns the slot when no bids were submitted", () => {
    let state = makeState({ empires: [makeEmpire("solaris")] });
    const start = startAuction(state, {
      empireId: "solaris",
      pool: "domestic",
    });
    state = {
      ...state,
      activeAuctions: start.activeAuctions,
      galaxy: { ...state.galaxy, empires: start.empires },
    };
    const auctionId = start.auction!.id;
    expect(state.galaxy.empires[0].routeSlotPool?.domesticOpen).toBe(5);

    const r = resolveAuction(state, auctionId);
    expect(r.winnerId).toBeNull();
    expect(r.activeAuctions[0].status).toBe("cancelled");
    expect(r.empires[0].routeSlotPool?.domesticOpen).toBe(6);
  });

  it("breaks ties by per-empire reputation", () => {
    const aiHi = makeAI("ai-hi", "solaris", { reputation: 80 });
    const aiLo = makeAI("ai-lo", "solaris", { reputation: 20 });
    let state = makeState({
      empires: [makeEmpire("solaris")],
      aiCompanies: [aiHi, aiLo],
    });
    const start = startAuction(state, {
      empireId: "solaris",
      pool: "domestic",
    });
    state = {
      ...state,
      activeAuctions: start.activeAuctions,
      galaxy: { ...state.galaxy, empires: start.empires },
    };
    const auctionId = start.auction!.id;
    const minBid = calculateMinBid(state.galaxy.empires[0], "domestic");
    state = applyBid(state, auctionId, "ai-hi", minBid + 100);
    state = applyBid(state, auctionId, "ai-lo", minBid + 100);

    const r = resolveAuction(state, auctionId);
    expect(r.winnerId).toBe("ai-hi");
  });

  it("refunds the player's losing bid", () => {
    const ai = makeAI("ai-1", "solaris", { cash: 1_000_000 });
    let state = makeState({
      empires: [makeEmpire("solaris")],
      aiCompanies: [ai],
    });
    const start = startAuction(state, { empireId: "solaris", pool: "foreign" });
    state = {
      ...state,
      activeAuctions: start.activeAuctions,
      galaxy: { ...state.galaxy, empires: start.empires },
    };
    const auctionId = start.auction!.id;
    state = applyBid(state, auctionId, PLAYER_COMPANY_ID, 60_000);
    state = applyBid(state, auctionId, "ai-1", 200_000);

    const r = resolveAuction(state, auctionId);
    expect(r.winnerId).toBe("ai-1");
    expect(r.playerRefund).toBe(60_000);
  });
});

function applyBid(
  state: GameState,
  auctionId: string,
  bidderId: string,
  amount: number,
): GameState {
  const r = submitBid(state, auctionId, {
    bidderId,
    amount,
    ai: bidderId !== PLAYER_COMPANY_ID,
  });
  return { ...state, activeAuctions: r.activeAuctions } as GameState;
}

// ---------------------------------------------------------------------------
// aiAuctionBid heuristic
// ---------------------------------------------------------------------------

describe("aiAuctionBid", () => {
  function buildAuction(
    empireId: string,
    pool: "domestic" | "foreign",
  ): CharterAuction {
    return {
      id: "auction-x",
      empireId,
      pool,
      startedTurn: 1,
      durationTurns: 1,
      termTurns: 8,
      bids: [],
      status: "open",
    };
  }

  it("returns null when AI is below cash floor", () => {
    const ai = makeAI("a", "solaris", { cash: 1000 });
    const state = makeState({
      empires: [makeEmpire("solaris")],
      aiCompanies: [ai],
    });
    expect(
      aiAuctionBid(state, ai, buildAuction("solaris", "foreign")),
    ).toBeNull();
  });

  it("bids more in home empire than abroad", () => {
    const ai = makeAI("a", "solaris", { cash: 500_000 });
    const state = makeState({
      empires: [makeEmpire("solaris"), makeEmpire("vex")],
      aiCompanies: [ai],
    });
    const home = aiAuctionBid(state, ai, buildAuction("solaris", "domestic"));
    const abroad = aiAuctionBid(state, ai, buildAuction("vex", "domestic"));
    expect(home).not.toBeNull();
    expect(abroad).not.toBeNull();
    expect(home!).toBeGreaterThan(abroad!);
  });

  it("aggressive personality bids materially higher than steady", () => {
    const aiAgg = makeAI("agg", "solaris", {
      cash: 500_000,
      personality: "aggressiveExpander",
    });
    const aiSteady = makeAI("steady", "solaris", {
      cash: 500_000,
      personality: "steadyHauler",
    });
    const state = makeState({
      empires: [makeEmpire("solaris")],
      aiCompanies: [aiAgg, aiSteady],
    });
    const auction = buildAuction("solaris", "foreign");
    const aBid = aiAuctionBid(state, aiAgg, auction);
    const sBid = aiAuctionBid(state, aiSteady, auction);
    expect(aBid!).toBeGreaterThan(sBid!);
  });

  it("cherry picker abstains from non-home, non-foreign deals", () => {
    const ai = makeAI("cp", "solaris", {
      cash: 500_000,
      personality: "cherryPicker",
    });
    const state = makeState({
      empires: [makeEmpire("solaris"), makeEmpire("vex")],
      aiCompanies: [ai],
    });
    expect(aiAuctionBid(state, ai, buildAuction("vex", "domestic"))).toBeNull();
    expect(
      aiAuctionBid(state, ai, buildAuction("vex", "foreign")),
    ).not.toBeNull();
    expect(
      aiAuctionBid(state, ai, buildAuction("solaris", "domestic")),
    ).not.toBeNull();
  });
});
