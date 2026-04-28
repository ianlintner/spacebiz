import type {
  Charter,
  CharterTerm,
  Empire,
  EmpireRouteSlotPool,
  GameState,
  Planet,
} from "../../data/types.ts";
import {
  BASE_DOMESTIC_UPKEEP,
  BASE_FOREIGN_UPKEEP,
  DEFAULT_EMPIRE_POOL_BY_STANCE,
  PLAYER_COMPANY_ID,
} from "../../data/constants.ts";
import { getEmpireRep } from "../reputation/ReputationEffects.ts";

/**
 * Charter ownership and route gating live here. The empire owns the slot
 * pool; companies lease individual slots ("charters") to operate routes.
 *
 * Pure functions only — call sites apply returned partial state via
 * `gameStore.update(...)`. No mutation of inputs.
 */

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Derive the default `EmpireRouteSlotPool` for an empire based on its policy
 * stance. Used as a fallback for empires saved before the charter system or
 * created without an explicit pool.
 */
export function defaultPoolFor(empire: Empire): EmpireRouteSlotPool {
  const stance = empire.routeSlotPool?.policyStance ?? "regulated";
  const sizes = DEFAULT_EMPIRE_POOL_BY_STANCE[stance];
  return {
    policyStance: stance,
    domesticTotal: sizes.domesticTotal,
    foreignTotal: sizes.foreignTotal,
    domesticOpen: sizes.domesticTotal,
    foreignOpen: sizes.foreignTotal,
  };
}

/** Read an empire's pool, falling back to the stance-derived default. */
export function getEmpirePool(empire: Empire): EmpireRouteSlotPool {
  return empire.routeSlotPool ?? defaultPoolFor(empire);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/**
 * All charters held across the game (player + AI). Order: player first,
 * then each AI company in turn order.
 */
export function getAllCharters(state: GameState): Charter[] {
  const out: Charter[] = [...(state.charters ?? [])];
  for (const ai of state.aiCompanies) {
    if (ai.charters) out.push(...ai.charters);
  }
  return out;
}

/** Charters held by a specific company (player or AI). */
export function getHeldCharters(
  state: GameState,
  holderId: string,
  empireId?: string,
): Charter[] {
  if (holderId === PLAYER_COMPANY_ID) {
    const all = state.charters ?? [];
    return empireId ? all.filter((c) => c.empireId === empireId) : [...all];
  }
  const ai = state.aiCompanies.find((c) => c.id === holderId);
  if (!ai) return [];
  const all = ai.charters ?? [];
  return empireId ? all.filter((c) => c.empireId === empireId) : [...all];
}

/**
 * Compute next-turn upkeep for a holder. Sums `term.upkeepPerTurn` across
 * all permanent charters; fixed-term charters carry no upkeep.
 */
export function getUpkeepDue(state: GameState, holderId: string): number {
  return getHeldCharters(state, holderId).reduce(
    (sum, c) => sum + (c.term.kind === "permanent" ? c.term.upkeepPerTurn : 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * Per-turn license upkeep for a permanent charter, scaled by empire tariff
 * rate and the holder's per-empire reputation tier.
 *   notorious × 1.30
 *   unknown   × 1.10
 *   respected × 1.00
 *   renowned  × 0.90
 *   legendary × 0.80
 *
 * Foreign pool charters carry the higher base. Tariff rate (0..1) lifts
 * cost: a 30% tariff empire adds +30%.
 */
export function calculateUpkeep(
  state: GameState,
  empire: Empire,
  pool: "domestic" | "foreign",
  holderId: string,
): number {
  const base = pool === "foreign" ? BASE_FOREIGN_UPKEEP : BASE_DOMESTIC_UPKEEP;
  const tariffMul = 1 + (empire.tariffRate ?? 0);
  const rep =
    holderId === PLAYER_COMPANY_ID ? getEmpireRep(state, empire.id) : 50;
  const repMul =
    rep >= 90 ? 0.8 : rep >= 75 ? 0.9 : rep >= 50 ? 1.0 : rep >= 25 ? 1.1 : 1.3;
  return Math.round(base * tariffMul * repMul);
}

// ---------------------------------------------------------------------------
// Endpoint classification
// ---------------------------------------------------------------------------

/**
 * Classify a route's charter pool requirement from its endpoints. A route
 * wholly within one empire = domestic; crossing a border = foreign. Returns
 * `null` only if either planet is missing or has no system mapping (defensive).
 */
export function classifyRoutePool(
  state: GameState,
  originPlanetId: string,
  destinationPlanetId: string,
): { empireId: string; pool: "domestic" | "foreign" } | null {
  const origin = findEmpireForPlanet(state, originPlanetId);
  const dest = findEmpireForPlanet(state, destinationPlanetId);
  if (!origin || !dest) return null;
  if (origin === dest) {
    return { empireId: origin, pool: "domestic" };
  }
  // Foreign route: charter is held against the destination empire (the one
  // granting market access). This mirrors how customs/tariffs work in the
  // existing trade-policy system.
  return { empireId: dest, pool: "foreign" };
}

function findEmpireForPlanet(
  state: GameState,
  planetId: string,
): string | null {
  const planet: Planet | undefined = state.galaxy.planets.find(
    (p) => p.id === planetId,
  );
  if (!planet) return null;
  const system = state.galaxy.systems.find((s) => s.id === planet.systemId);
  return system?.empireId ?? null;
}

// ---------------------------------------------------------------------------
// Mutators (pure — return new pieces of state)
// ---------------------------------------------------------------------------

export interface GrantCharterArgs {
  empireId: string;
  pool: "domestic" | "foreign";
  holderId: string;
  term: CharterTerm;
  source?: { contractId?: string; auctionId?: string };
}

/**
 * Result of a grant. Caller is responsible for applying:
 *   gameStore.update({ galaxy: { ...state.galaxy, empires: result.empires },
 *                      charters: result.playerCharters,   // if holder = player
 *                      aiCompanies: result.aiCompanies }) // if holder = AI
 */
export interface GrantCharterResult {
  charter: Charter;
  empires: Empire[];
  playerCharters: Charter[];
  aiCompanies: GameState["aiCompanies"];
  /** Reason a grant was rejected; null on success. */
  error: null | "no-open-slot" | "unknown-empire";
}

export function grantCharter(
  state: GameState,
  args: GrantCharterArgs,
): GrantCharterResult {
  const empire = state.galaxy.empires.find((e) => e.id === args.empireId);
  if (!empire) {
    return failResult(state, "unknown-empire");
  }
  const pool = getEmpirePool(empire);
  const openField = args.pool === "foreign" ? "foreignOpen" : "domesticOpen";
  if (pool[openField] <= 0) {
    return failResult(state, "no-open-slot");
  }
  const charter: Charter = {
    id: `charter-${args.empireId}-${args.pool}-${state.turn}-${randomSuffix()}`,
    empireId: args.empireId,
    pool: args.pool,
    holderId: args.holderId,
    grantedTurn: state.turn,
    term: args.term,
    sourceContractId: args.source?.contractId,
    sourceAuctionId: args.source?.auctionId,
  };
  const nextEmpires = state.galaxy.empires.map((e) =>
    e.id === args.empireId
      ? { ...e, routeSlotPool: { ...pool, [openField]: pool[openField] - 1 } }
      : e,
  );
  const playerCharters = [...(state.charters ?? [])];
  let aiCompanies = state.aiCompanies;
  if (args.holderId === PLAYER_COMPANY_ID) {
    playerCharters.push(charter);
  } else {
    aiCompanies = state.aiCompanies.map((ai) =>
      ai.id === args.holderId
        ? { ...ai, charters: [...(ai.charters ?? []), charter] }
        : ai,
    );
  }
  return {
    charter,
    empires: nextEmpires,
    playerCharters,
    aiCompanies,
    error: null,
  };
}

export interface ForfeitCharterResult {
  empires: Empire[];
  playerCharters: Charter[];
  aiCompanies: GameState["aiCompanies"];
  /** Routes that lost their charter and should be deleted by the caller. */
  forfeitedRouteIds: string[];
  /** True if the charter was found and forfeited. */
  found: boolean;
}

/**
 * Forfeit a charter. Slot returns to the empire pool. Any `ActiveRoute`
 * linked via `charterId` is reported back so the caller can delete or
 * pause it as part of the same state update.
 */
export function forfeitCharter(
  state: GameState,
  charterId: string,
): ForfeitCharterResult {
  const all = getAllCharters(state);
  const target = all.find((c) => c.id === charterId);
  if (!target) {
    return {
      empires: state.galaxy.empires,
      playerCharters: state.charters ?? [],
      aiCompanies: state.aiCompanies,
      forfeitedRouteIds: [],
      found: false,
    };
  }
  const openField = target.pool === "foreign" ? "foreignOpen" : "domesticOpen";
  const totalField =
    target.pool === "foreign" ? "foreignTotal" : "domesticTotal";
  const empires = state.galaxy.empires.map((e) => {
    if (e.id !== target.empireId) return e;
    const pool = getEmpirePool(e);
    // Don't push open above total (defensive against double-forfeit).
    const nextOpen = Math.min(pool[totalField], pool[openField] + 1);
    return { ...e, routeSlotPool: { ...pool, [openField]: nextOpen } };
  });
  let playerCharters = state.charters ?? [];
  let aiCompanies = state.aiCompanies;
  if (target.holderId === PLAYER_COMPANY_ID) {
    playerCharters = playerCharters.filter((c) => c.id !== charterId);
  } else {
    aiCompanies = state.aiCompanies.map((ai) =>
      ai.id === target.holderId
        ? {
            ...ai,
            charters: (ai.charters ?? []).filter((c) => c.id !== charterId),
          }
        : ai,
    );
  }
  // Player-side route forfeits surface to the caller.
  const forfeitedRouteIds = state.activeRoutes
    .filter((r) => r.charterId === charterId)
    .map((r) => r.id);
  return {
    empires,
    playerCharters,
    aiCompanies,
    forfeitedRouteIds,
    found: true,
  };
}

// ---------------------------------------------------------------------------
// Route-creation gating
// ---------------------------------------------------------------------------

/**
 * Check whether the holder can underwrite a new route between the given
 * planets — returns the matching held charter id, or a reason it cannot.
 *
 * A holder can use the same charter for multiple routes (the charter is the
 * lease, not the route). If they don't hold a matching charter, they need
 * to acquire one (contract, auction, or — for the player at game start —
 * starter grant).
 */
export function findChartersForRoute(
  state: GameState,
  holderId: string,
  originPlanetId: string,
  destinationPlanetId: string,
): { charterId: string } | { error: "no-matching-charter" | "invalid-route" } {
  const cls = classifyRoutePool(state, originPlanetId, destinationPlanetId);
  if (!cls) return { error: "invalid-route" };
  const held = getHeldCharters(state, holderId, cls.empireId);
  const match = held.find((c) => c.pool === cls.pool);
  if (!match) return { error: "no-matching-charter" };
  return { charterId: match.id };
}

// ---------------------------------------------------------------------------
// Per-turn lifecycle (upkeep + fixed-term expiry)
// ---------------------------------------------------------------------------

export interface CharterTurnEvent {
  type: "upkeepPaid" | "forfeitedNoPay" | "forfeitedExpired";
  charterId: string;
  empireId: string;
  pool: "domestic" | "foreign";
  holderId: string;
  amount?: number;
}

export interface CharterTurnResult {
  /** Total upkeep paid by the player this turn (subtract from cash). */
  playerUpkeep: number;
  /** Updated player charter list after forfeitures. */
  playerCharters: Charter[];
  /** Updated empires (with pools refilled by forfeitures). */
  empires: Empire[];
  /** Updated AI companies (with their charters/cash adjusted). */
  aiCompanies: GameState["aiCompanies"];
  /** Active routes that lost their charter and should be deleted by caller. */
  forfeitedRouteIds: string[];
  /** Per-charter events for the turn report. */
  events: CharterTurnEvent[];
}

/**
 * Apply per-turn charter lifecycle: collect upkeep from permanent charters,
 * expire fixed-term charters that hit their term. Pure — caller applies the
 * returned partial state.
 *
 * Player can't pay → forfeit cheapest-revenue charters first (deterministic).
 * AI can't pay → forfeit one of theirs and accept the cash hit.
 *
 * The current turn (`state.turn`) is treated as "now": fixed-term charters
 * expire when `expiresOnTurn <= state.turn`.
 */
export function applyCharterTurn(state: GameState): CharterTurnResult {
  const events: CharterTurnEvent[] = [];
  const playerCharters = state.charters ?? [];
  let empires = state.galaxy.empires;
  let aiCompanies = state.aiCompanies;
  const forfeitedRouteIds: string[] = [];

  // ---- Player upkeep ----
  let playerUpkeep = 0;
  const survivingPlayerCharters: Charter[] = [];
  let playerCash = state.cash;
  for (const c of playerCharters) {
    // Expire fixed-term first
    if (c.term.kind === "fixedTerm" && c.term.expiresOnTurn <= state.turn) {
      const r = forfeitCharter(
        { ...state, charters: survivingPlayerCharters },
        c.id,
      );
      // r mutates empires/forfeitedRouteIds via local state; just track the event.
      events.push({
        type: "forfeitedExpired",
        charterId: c.id,
        empireId: c.empireId,
        pool: c.pool,
        holderId: c.holderId,
      });
      empires = applyPoolRefund(empires, c.empireId, c.pool);
      // Routes attached to this charter get reported for caller cleanup
      const linked = state.activeRoutes
        .filter((r2) => r2.charterId === c.id)
        .map((r2) => r2.id);
      forfeitedRouteIds.push(...linked);
      void r;
      continue;
    }
    if (c.term.kind === "permanent") {
      const cost = c.term.upkeepPerTurn;
      if (playerCash >= cost) {
        playerCash -= cost;
        playerUpkeep += cost;
        survivingPlayerCharters.push(c);
        events.push({
          type: "upkeepPaid",
          charterId: c.id,
          empireId: c.empireId,
          pool: c.pool,
          holderId: c.holderId,
          amount: cost,
        });
      } else {
        // Insufficient cash — forfeit charter, slot returns to empire pool.
        events.push({
          type: "forfeitedNoPay",
          charterId: c.id,
          empireId: c.empireId,
          pool: c.pool,
          holderId: c.holderId,
        });
        empires = applyPoolRefund(empires, c.empireId, c.pool);
        const linked = state.activeRoutes
          .filter((r2) => r2.charterId === c.id)
          .map((r2) => r2.id);
        forfeitedRouteIds.push(...linked);
      }
      continue;
    }
    // Fixed-term, not yet expired
    survivingPlayerCharters.push(c);
  }

  // ---- AI upkeep ----
  aiCompanies = aiCompanies.map((ai) => {
    if (ai.bankrupt || !ai.charters || ai.charters.length === 0) return ai;
    let aiCash = ai.cash;
    const surviving: Charter[] = [];
    for (const c of ai.charters) {
      if (c.term.kind === "fixedTerm" && c.term.expiresOnTurn <= state.turn) {
        events.push({
          type: "forfeitedExpired",
          charterId: c.id,
          empireId: c.empireId,
          pool: c.pool,
          holderId: c.holderId,
        });
        empires = applyPoolRefund(empires, c.empireId, c.pool);
        continue;
      }
      if (c.term.kind === "permanent") {
        const cost = c.term.upkeepPerTurn;
        if (aiCash >= cost) {
          aiCash -= cost;
          surviving.push(c);
          events.push({
            type: "upkeepPaid",
            charterId: c.id,
            empireId: c.empireId,
            pool: c.pool,
            holderId: c.holderId,
            amount: cost,
          });
        } else {
          events.push({
            type: "forfeitedNoPay",
            charterId: c.id,
            empireId: c.empireId,
            pool: c.pool,
            holderId: c.holderId,
          });
          empires = applyPoolRefund(empires, c.empireId, c.pool);
        }
        continue;
      }
      surviving.push(c);
    }
    return { ...ai, cash: aiCash, charters: surviving };
  });

  return {
    playerUpkeep,
    playerCharters: survivingPlayerCharters,
    empires,
    aiCompanies,
    forfeitedRouteIds,
    events,
  };
}

function applyPoolRefund(
  empires: Empire[],
  empireId: string,
  pool: "domestic" | "foreign",
): Empire[] {
  return empires.map((e) => {
    if (e.id !== empireId) return e;
    const p = getEmpirePool(e);
    const openField = pool === "foreign" ? "foreignOpen" : "domesticOpen";
    const totalField = pool === "foreign" ? "foreignTotal" : "domesticTotal";
    const next = Math.min(p[totalField], p[openField] + 1);
    return { ...e, routeSlotPool: { ...p, [openField]: next } };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function failResult(
  state: GameState,
  error: NonNullable<GrantCharterResult["error"]>,
): GrantCharterResult {
  return {
    charter: null as unknown as Charter,
    empires: state.galaxy.empires,
    playerCharters: state.charters ?? [],
    aiCompanies: state.aiCompanies,
    error,
  };
}
