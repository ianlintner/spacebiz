import type {
  AICompany,
  Charter,
  CharterAuction,
  CharterBid,
  Empire,
  GameState,
} from "../../data/types.ts";
import {
  DEFAULT_AUCTION_TERM_TURNS,
  PLAYER_COMPANY_ID,
} from "../../data/constants.ts";
import { getEmpireRep } from "../reputation/ReputationEffects.ts";
import { getEmpirePool, grantCharter } from "./CharterManager.ts";

/**
 * Charter auctions. Triggered exclusively by turmoil events
 * (empire_succession, diplomatic_crisis end, signPeace, etc.) — never on a
 * regular cadence. Auctions are sealed-bid, single-slot, and resolve in the
 * same turn they spawn unless `durationTurns > 1`.
 *
 * All functions here are pure; callers apply returned partial state.
 */

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

/**
 * The minimum bid an empire will entertain. Acts as a reserve price so
 * empires don't give slots away during low-activity moments.
 *
 * Foreign slots are dramatically more valuable (bigger margins, fewer
 * substitutes), so the floor scales accordingly.
 */
export function calculateMinBid(
  empire: Empire,
  pool: "domestic" | "foreign",
): number {
  const base = pool === "foreign" ? 25_000 : 6_000;
  // Tariff-heavy empires charge more upfront; protectionists demand a premium.
  const tariffMul = 1 + (empire.tariffRate ?? 0);
  return Math.round(base * tariffMul);
}

// ---------------------------------------------------------------------------
// Auction lifecycle
// ---------------------------------------------------------------------------

export interface StartAuctionArgs {
  empireId: string;
  pool: "domestic" | "foreign";
  durationTurns?: number;
  termTurns?: number;
  triggerReason?: string;
}

export interface StartAuctionResult {
  auction: CharterAuction | null;
  /** Reason a start failed; null on success. */
  error: null | "no-open-slot" | "unknown-empire";
  /** New activeAuctions list (caller updates state.activeAuctions). */
  activeAuctions: CharterAuction[];
  /** Updated empires with the slot reserved (decremented while auction open). */
  empires: Empire[];
}

/**
 * Open an auction. Reserves one slot from the empire's pool while the
 * auction is open so it cannot be granted by a separate path (contract).
 * If the auction is cancelled, the slot is returned via `cancelAuction`.
 */
export function startAuction(
  state: GameState,
  args: StartAuctionArgs,
): StartAuctionResult {
  const empire = state.galaxy.empires.find((e) => e.id === args.empireId);
  if (!empire) {
    return {
      auction: null,
      error: "unknown-empire",
      activeAuctions: state.activeAuctions ?? [],
      empires: state.galaxy.empires,
    };
  }
  const pool = getEmpirePool(empire);
  const openField = args.pool === "foreign" ? "foreignOpen" : "domesticOpen";
  if (pool[openField] <= 0) {
    return {
      auction: null,
      error: "no-open-slot",
      activeAuctions: state.activeAuctions ?? [],
      empires: state.galaxy.empires,
    };
  }
  const empires = state.galaxy.empires.map((e) =>
    e.id === args.empireId
      ? { ...e, routeSlotPool: { ...pool, [openField]: pool[openField] - 1 } }
      : e,
  );
  const auction: CharterAuction = {
    id: `auction-${args.empireId}-${args.pool}-${state.turn}-${randomSuffix()}`,
    empireId: args.empireId,
    pool: args.pool,
    startedTurn: state.turn,
    durationTurns: Math.max(1, args.durationTurns ?? 1),
    termTurns: args.termTurns ?? DEFAULT_AUCTION_TERM_TURNS,
    bids: [],
    status: "open",
    triggerReason: args.triggerReason,
  };
  return {
    auction,
    error: null,
    activeAuctions: [...(state.activeAuctions ?? []), auction],
    empires,
  };
}

export interface SubmitBidResult {
  activeAuctions: CharterAuction[];
  /** Cash deducted from the bidder; caller subtracts this from the holder's cash. */
  escrow: number;
  /** Reason a bid was rejected; null on success. */
  error:
    | null
    | "auction-not-found"
    | "auction-closed"
    | "below-min-bid"
    | "duplicate-bidder";
}

/**
 * Submit a single sealed bid. The same bidder cannot submit twice in the
 * same auction — they can only outbid themselves via a new auction.
 */
export function submitBid(
  state: GameState,
  auctionId: string,
  bid: CharterBid,
): SubmitBidResult {
  const auctions = state.activeAuctions ?? [];
  const auction = auctions.find((a) => a.id === auctionId);
  if (!auction) {
    return {
      activeAuctions: auctions,
      escrow: 0,
      error: "auction-not-found",
    };
  }
  if (auction.status !== "open") {
    return { activeAuctions: auctions, escrow: 0, error: "auction-closed" };
  }
  const empire = state.galaxy.empires.find((e) => e.id === auction.empireId);
  if (empire && bid.amount < calculateMinBid(empire, auction.pool)) {
    return { activeAuctions: auctions, escrow: 0, error: "below-min-bid" };
  }
  if (auction.bids.some((b) => b.bidderId === bid.bidderId)) {
    return {
      activeAuctions: auctions,
      escrow: 0,
      error: "duplicate-bidder",
    };
  }
  return {
    activeAuctions: auctions.map((a) =>
      a.id === auctionId ? { ...a, bids: [...a.bids, bid] } : a,
    ),
    escrow: bid.amount,
    error: null,
  };
}

export interface ResolveAuctionResult {
  /** Updated auction list (with this auction marked resolved). */
  activeAuctions: CharterAuction[];
  /** Updated empires (charter granted = pool stays decremented; nobody bid = slot returns). */
  empires: Empire[];
  /** Updated player charters; empty if AI won or nobody bid. */
  playerCharters: Charter[];
  /** Updated AI companies (winner gets the charter, losers get refunds). */
  aiCompanies: AICompany[];
  /** Cash to credit to the player (if player lost / no winner). */
  playerRefund: number;
  /** Winner id; null if no eligible bids. */
  winnerId: string | null;
  /** Term in turns the granted charter will last. */
  termTurns: number;
}

/**
 * Resolve an open auction. Highest bid wins; ties broken by per-empire
 * reputation (player rep is from `state.empireReputation`, AI reputation
 * from `AICompany.reputation`). The winner gets a fixed-term charter that
 * expires `termTurns` turns from now. Losers get their bid escrow refunded.
 *
 * If no eligible bids, the auction is cancelled and the slot returns to
 * the empire pool.
 */
export function resolveAuction(
  state: GameState,
  auctionId: string,
): ResolveAuctionResult {
  const auctions = state.activeAuctions ?? [];
  const auction = auctions.find((a) => a.id === auctionId);
  if (!auction || auction.status !== "open") {
    return passThrough(state, auctions);
  }
  if (auction.bids.length === 0) {
    return cancelOpenAuction(state, auctions, auction);
  }

  // Pick the winner: highest amount, tiebreak by empire reputation.
  const winner = pickWinner(state, auction);

  // Refund losing bids.
  let playerRefund = 0;
  let aiCompanies = state.aiCompanies;
  for (const bid of auction.bids) {
    if (bid.bidderId === winner.bidderId) continue;
    if (bid.bidderId === PLAYER_COMPANY_ID) {
      playerRefund += bid.amount;
    } else {
      aiCompanies = aiCompanies.map((ai) =>
        ai.id === bid.bidderId ? { ...ai, cash: ai.cash + bid.amount } : ai,
      );
    }
  }

  // Grant the charter (slot is already decremented via startAuction).
  // Use grantCharter to keep the issuance path uniform, but undo its
  // pool decrement since startAuction already handled it.
  const grantResult = grantCharter(
    {
      ...state,
      aiCompanies,
      activeAuctions: auctions,
    },
    {
      empireId: auction.empireId,
      pool: auction.pool,
      holderId: winner.bidderId,
      term: {
        kind: "fixedTerm",
        expiresOnTurn: state.turn + auction.termTurns,
      },
      source: { auctionId: auction.id },
    },
  );

  // grantCharter decremented the pool again; restore it once.
  const empires = grantResult.empires.map((e) => {
    if (e.id !== auction.empireId) return e;
    const pool = getEmpirePool(e);
    const openField =
      auction.pool === "foreign" ? "foreignOpen" : "domesticOpen";
    const totalField =
      auction.pool === "foreign" ? "foreignTotal" : "domesticTotal";
    const next = Math.min(pool[totalField], pool[openField] + 1);
    return { ...e, routeSlotPool: { ...pool, [openField]: next } };
  });

  return {
    activeAuctions: auctions.map((a) =>
      a.id === auctionId
        ? { ...a, status: "resolved", winnerId: winner.bidderId }
        : a,
    ),
    empires,
    playerCharters: grantResult.playerCharters,
    aiCompanies: grantResult.aiCompanies,
    playerRefund,
    winnerId: winner.bidderId,
    termTurns: auction.termTurns,
  };
}

function pickWinner(state: GameState, auction: CharterAuction): CharterBid {
  const sorted = [...auction.bids].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    // Tiebreak by per-empire reputation.
    const repA = repFor(state, a.bidderId, auction.empireId);
    const repB = repFor(state, b.bidderId, auction.empireId);
    return repB - repA;
  });
  return sorted[0];
}

function repFor(state: GameState, bidderId: string, empireId: string): number {
  if (bidderId === PLAYER_COMPANY_ID) return getEmpireRep(state, empireId);
  return state.aiCompanies.find((ai) => ai.id === bidderId)?.reputation ?? 50;
}

function cancelOpenAuction(
  state: GameState,
  auctions: CharterAuction[],
  auction: CharterAuction,
): ResolveAuctionResult {
  const empires = state.galaxy.empires.map((e) => {
    if (e.id !== auction.empireId) return e;
    const pool = getEmpirePool(e);
    const openField =
      auction.pool === "foreign" ? "foreignOpen" : "domesticOpen";
    const totalField =
      auction.pool === "foreign" ? "foreignTotal" : "domesticTotal";
    return {
      ...e,
      routeSlotPool: {
        ...pool,
        [openField]: Math.min(pool[totalField], pool[openField] + 1),
      },
    };
  });
  return {
    activeAuctions: auctions.map((a) =>
      a.id === auction.id ? { ...a, status: "cancelled" } : a,
    ),
    empires,
    playerCharters: state.charters ?? [],
    aiCompanies: state.aiCompanies,
    playerRefund: 0,
    winnerId: null,
    termTurns: auction.termTurns,
  };
}

function passThrough(
  state: GameState,
  auctions: CharterAuction[],
): ResolveAuctionResult {
  return {
    activeAuctions: auctions,
    empires: state.galaxy.empires,
    playerCharters: state.charters ?? [],
    aiCompanies: state.aiCompanies,
    playerRefund: 0,
    winnerId: null,
    termTurns: 0,
  };
}

// ---------------------------------------------------------------------------
// AI bidding heuristic
// ---------------------------------------------------------------------------

/**
 * Decide whether an AI company bids in a given auction, and how much.
 * Returns null to abstain.
 *
 * Heuristic:
 *   1. Refuse below-floor cash (need 2× minBid as buffer).
 *   2. Bid more aggressively for charters in the AI's home empire.
 *   3. Bid more aggressively for the foreign pool (it's rare/valuable).
 *   4. Cap bid at a fraction of cash to avoid bankrupting the AI.
 *
 * Personality flavors the curve:
 *   - aggressiveExpander: bids hot, up to 30% of cash
 *   - cherryPicker: bids only on foreign + home-empire deals, ~20% of cash
 *   - steadyHauler: bids modestly, ~12% of cash
 */
export function aiAuctionBid(
  state: GameState,
  ai: AICompany,
  auction: CharterAuction,
): number | null {
  const empire = state.galaxy.empires.find((e) => e.id === auction.empireId);
  if (!empire) return null;
  const minBid = calculateMinBid(empire, auction.pool);
  if (ai.cash < minBid * 2) return null;

  const isHomeEmpire = ai.empireId === auction.empireId;
  const isForeign = auction.pool === "foreign";

  let cashFraction: number;
  switch (ai.personality) {
    case "aggressiveExpander":
      cashFraction = 0.3;
      break;
    case "cherryPicker":
      // Skips deals that aren't either home or foreign-pool.
      if (!isHomeEmpire && !isForeign) return null;
      cashFraction = 0.2;
      break;
    default: // steadyHauler + future personalities
      cashFraction = 0.12;
      break;
  }
  // Sweeten home + foreign appetite.
  if (isHomeEmpire) cashFraction *= 1.3;
  if (isForeign) cashFraction *= 1.4;

  const bid = Math.round(ai.cash * cashFraction);
  if (bid < minBid) return null;
  return bid;
}

// ---------------------------------------------------------------------------
// Per-turn driver
// ---------------------------------------------------------------------------

export interface ProcessAuctionsTurnResult {
  /** Updated activeAuctions after AI bidding and resolution. */
  activeAuctions: CharterAuction[];
  /** Updated empires (slot returns / grants applied). */
  empires: Empire[];
  /** Updated player charter list (winners' new charters). */
  playerCharters: Charter[];
  /** Updated AI companies (cash adjusted for bids/refunds, charters updated). */
  aiCompanies: AICompany[];
  /** Cash to credit to the player (refunded losing bids). */
  playerRefund: number;
  /** IDs of auctions that resolved this turn — for turn report. */
  resolvedAuctionIds: string[];
}

/**
 * Per-turn auction driver. Each turn:
 *   1. AI companies submit bids on currently-open auctions they haven't
 *      bid in yet (one bid per AI per auction).
 *   2. Auctions whose bidding window closes this turn resolve.
 *
 * An auction's bidding window closes on `startedTurn + durationTurns - 1`
 * (inclusive). Auctions live one extra turn after resolving so the turn
 * report can reference them; further cleanup happens in a subsequent turn
 * (`pruneResolvedAuctions`).
 *
 * Pure — caller applies returned partial state.
 */
export function processCharterAuctionsTurn(
  state: GameState,
): ProcessAuctionsTurnResult {
  let auctions = state.activeAuctions ?? [];
  let empires = state.galaxy.empires;
  let aiCompanies = state.aiCompanies;
  let playerCharters = state.charters ?? [];
  let playerRefund = 0;
  const resolvedAuctionIds: string[] = [];

  // ---- Step 1: AI bidding on open auctions ----
  for (const auction of auctions) {
    if (auction.status !== "open") continue;
    if (state.turn < auction.startedTurn) continue; // Not yet biddable
    for (const ai of aiCompanies) {
      if (ai.bankrupt) continue;
      if (auction.bids.some((b) => b.bidderId === ai.id)) continue;
      const amount = aiAuctionBid(
        { ...state, galaxy: { ...state.galaxy, empires } },
        ai,
        auction,
      );
      if (amount === null) continue;
      const submit = submitBid(
        { ...state, activeAuctions: auctions },
        auction.id,
        { bidderId: ai.id, amount, ai: true },
      );
      if (submit.error !== null) continue;
      auctions = submit.activeAuctions;
      // Escrow AI cash now; refunded if they lose.
      aiCompanies = aiCompanies.map((c) =>
        c.id === ai.id ? { ...c, cash: c.cash - submit.escrow } : c,
      );
    }
  }

  // ---- Step 2: Resolve auctions whose bidding window closed ----
  for (const auction of auctions) {
    if (auction.status !== "open") continue;
    const lastBidTurn = auction.startedTurn + auction.durationTurns - 1;
    if (state.turn < lastBidTurn) continue;
    const r = resolveAuction(
      {
        ...state,
        activeAuctions: auctions,
        galaxy: { ...state.galaxy, empires },
        aiCompanies,
        charters: playerCharters,
      },
      auction.id,
    );
    auctions = r.activeAuctions;
    empires = r.empires;
    aiCompanies = r.aiCompanies;
    playerCharters = r.playerCharters;
    playerRefund += r.playerRefund;
    resolvedAuctionIds.push(auction.id);
  }

  return {
    activeAuctions: auctions,
    empires,
    playerCharters,
    aiCompanies,
    playerRefund,
    resolvedAuctionIds,
  };
}

/**
 * Drop resolved/cancelled auctions older than `keepFor` turns from the list.
 * Call this at the end of the turn report so the active list doesn't grow
 * unbounded. Default keep-for is 1 turn.
 */
export function pruneResolvedAuctions(
  auctions: CharterAuction[],
  currentTurn: number,
  keepFor = 1,
): CharterAuction[] {
  return auctions.filter((a) => {
    if (a.status === "open") return true;
    return a.startedTurn + a.durationTurns + keepFor > currentTurn;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
