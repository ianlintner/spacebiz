import {
  ShipClass,
  type ShipTemplate,
  PlanetType,
  CargoType,
  TechBranch,
  HyperlaneDensity,
  HubRoomType,
  type Technology,
  type HubRoomDefinition,
  type NavTabId,
  type RouteScope,
} from "./types";

// ── Save Version ───────────────────────────────────────────────
/** Increment when GameState shape changes in a save-incompatible way */
export const SAVE_VERSION = 10;

// ── Action Points ──────────────────────────────────────────────
export const ACTION_POINTS_PER_TURN = 2;

// ── Route Market ───────────────────────────────────────────────
/** Number of route market entries generated per turn, by game preset */
export const ROUTE_MARKET_SIZE: Record<string, number> = {
  quick: 8,
  standard: 10,
  epic: 12,
};
/** AP cost to scout a route market entry (reveals exact profit) */
export const SCOUT_COST_AP = 1;
/** Cash cost to scout a route market entry */
export const SCOUT_COST_CASH = 500;
/** How many turns a route market entry remains available */
export const ROUTE_MARKET_ENTRY_DURATION = 3;

export const STARTING_CASH = 200000;
export const MAX_TURNS = 20;
export const BASE_FUEL_PRICE = 10;
export const MAX_LOAN_AMOUNT = 500000;
export const LOAN_INTEREST_RATE_MIN = 0.05;
export const LOAN_INTEREST_RATE_MAX = 0.08;
export const SATURATION_DECAY_RATE = 0.08;
export const SATURATION_PRICE_IMPACT = 0.8;
export const CONDITION_DECAY_MIN = 2;
export const CONDITION_DECAY_MAX = 5;
export const OVERHAUL_COST_RATIO = 0.3;
export const OVERHAUL_RESTORE_CONDITION = 90;
export const BREAKDOWN_THRESHOLD = 50;
export const TURN_DURATION = 100;
/** Hard cap on trips per turn to prevent intra-system routes from being exploited */
export const MAX_TRIPS_PER_TURN = 10;
// Local (intra-system) route slot pool — separate from main route slots.
// @deprecated Use BASE_SYSTEM_ROUTE_SLOTS — kept as alias for older fixtures.
export const LOCAL_ROUTE_SLOTS = 2;
/**
 * @deprecated Replaced by SCOPE_DEMAND_MULTIPLIERS, which applies a per-cargo
 * scope multiplier instead of a flat 50% cap on intra-system revenue. Kept
 * exported so legacy fixtures still compile, but no longer used in revenue
 * calculations.
 */
export const LOCAL_ROUTE_REVENUE_CAP = 0.5;
/** @deprecated alias of LOCAL_ROUTE_REVENUE_CAP — replaced by scope multipliers. */
export const INTRA_SYSTEM_REVENUE_MULTIPLIER = LOCAL_ROUTE_REVENUE_CAP;
// Longer routes command higher freight rates (per distance unit, capped)
export const DISTANCE_PREMIUM_RATE = 0.0015;
export const DISTANCE_PREMIUM_CAP = 0.5;

// ── Route Scope Slot Pools ─────────────────────────────────────
//
// Routes are classified by scope (see `getRouteScope` in RouteManager.ts) and
// each scope draws from its own slot pool. Each pool grows through a different
// in-game mechanic so the player has distinct paths to expansion:
//
//   • System  — fixed (training-wheel tier; no growth path).
//   • Empire  — grows via Logistics tech and Hub Ore Processing (engineering).
//   • Galactic — grows via empire unlocks (diplomacy/contracts).
//
// Mid- and long-range slots are intentionally weighted higher than system
// slots so the meta-game pulls toward longer hauls. See SCOPE_DEMAND_MULTIPLIERS
// for the matching revenue curves.

/** Intra-system slot pool (origin and destination share a star system). */
export const BASE_SYSTEM_ROUTE_SLOTS = 2;
/** Intra-empire interstellar slot pool. Backed by `routeSlots` on GameState. */
export const BASE_EMPIRE_ROUTE_SLOTS = 3;
/**
 * Inter-empire (galactic) slot pool. Bumped to 3 in the alpha rebalance so the
 * highest-margin tier starts with real capacity instead of feeling rationed.
 * Each subsequent empire unlock adds another slot here (see ContractManager).
 */
export const BASE_GALACTIC_ROUTE_SLOTS = 3;

// ── Charter system (Phase 2) ─────────────────────────────────────────
//
// Empires own pools of route charters that companies (player + AI) lease
// to operate routes. The legacy player-side slot caps above are no longer
// the gating resource; charters are. Pool sizes per empire are derived
// from `EmpirePolicyStance` (open/regulated/isolationist).

/** Default route slot pool sizes by empire policy stance. */
export const DEFAULT_EMPIRE_POOL_BY_STANCE: Record<
  "isolationist" | "regulated" | "open",
  { domesticTotal: number; foreignTotal: number }
> = {
  isolationist: { domesticTotal: 8, foreignTotal: 1 },
  regulated: { domesticTotal: 6, foreignTotal: 2 },
  open: { domesticTotal: 4, foreignTotal: 4 },
};

/** Player's free starter charters granted at game start (intra-system, in home empire). */
export const STARTER_CHARTERS_AT_HOME = 2;

/** Per-turn upkeep paid by holders of permanent charters. */
export const BASE_DOMESTIC_UPKEEP = 800;
export const BASE_FOREIGN_UPKEEP = 2500;

/** Default lease length for fixed-term (auction-won) charters. */
export const DEFAULT_AUCTION_TERM_TURNS = 8;

/** Player company id used by charter holderId fields. */
export const PLAYER_COMPANY_ID = "player";

// ── Future seam: Ship-Class × Scope haul-band system ───────────
//
// Planned for a follow-up pass (Aerobiz-inspired): each ship class will have
// an "optimal haul band" matching one or two scopes, with efficiency falling
// off sharply outside that band. The intent is to make ship procurement a
// tactical choice keyed to which slot pool the player is filling.
//
// When that lands, expect:
//
//   1. A `RECOMMENDED_SHIP_CLASSES_BY_SCOPE: Record<RouteScope, ShipClass[]>`
//      table next to SCOPE_DEMAND_MULTIPLIERS, surfaced as tooltips on the
//      route slot HUD and the ship purchase panel.
//   2. A per-class `optimalHaulBand: { min: number; max: number }` field on
//      ShipTemplate, with revenue/fuel modifiers when distance falls outside.
//   3. The route market generator and route opportunity scanner switching
//      ship-pick logic to weight this band, replacing today's pure
//      profit-per-turn ranking.
//
// For this pass the seam is data-only (the comment + the three slot pools);
// nothing consumes the haul-band concept yet.

// ── Per-Cargo Scope Demand Multipliers ─────────────────────────
//
// Replaces the old flat `INTRA_SYSTEM_REVENUE_MULTIPLIER` (0.5 across all
// cargo) with a per-cargo curve that encodes "what people pay extra for, by
// distance":
//
//   • Heavy / bulk cargo (rawMaterials, food, hazmat) keeps its old ~0.5
//     value at system scope (heavy goods *are* the local meta) and rises
//     above 1 within an empire — nobody hauls iron ore across the galaxy.
//   • Luxury and technology are heavily punished locally (down to 0.20×) and
//     strongly rewarded galactically (up to 1.7×) — scarcity pricing for
//     exotic goods.
//   • Passengers favor inter-empire travel (1.3×) but punish intra-system
//     "shuttle to the next moon" routes (0.30×).
//
// CALIBRATION NOTES (post-PR#69 simulation): the trips-per-turn cap (10) plus
// short system distances meant any system multiplier above ~0.5 made local
// routes net more profitable than the old flat cap. System values are tuned
// down across the board — heavy goods stay near 0.5 (parity with old), while
// luxury/tech drop to 0.20–0.25 so the meta pulls toward longer hauls. Slot
// pool sizing (system 2 / empire 4 / galactic 3) provides the secondary
// dampener — even when per-slot revenue is similar, total network capacity
// is heavily weighted toward empire+galactic.
//
// The number is a multiplier on revenue for that cargo on that scope, applied
// after price × capacity × trips and the distance premium.
export const SCOPE_DEMAND_MULTIPLIERS: Record<
  CargoType,
  Record<RouteScope, number>
> = {
  [CargoType.Passengers]: { system: 0.3, empire: 1.0, galactic: 1.3 },
  [CargoType.RawMaterials]: { system: 0.5, empire: 1.1, galactic: 0.4 },
  [CargoType.Food]: { system: 0.5, empire: 1.1, galactic: 0.4 },
  [CargoType.Technology]: { system: 0.25, empire: 1.0, galactic: 1.5 },
  [CargoType.Luxury]: { system: 0.2, empire: 0.9, galactic: 1.7 },
  [CargoType.Hazmat]: { system: 0.5, empire: 1.1, galactic: 0.4 },
  [CargoType.Medical]: { system: 0.3, empire: 1.0, galactic: 1.2 },
};

/** Target distribution of route market entries across scopes per generation. */
export const ROUTE_MARKET_SCOPE_QUOTA: Record<RouteScope, number> = {
  system: 0.2,
  empire: 0.4,
  galactic: 0.4,
};

// ── Route License Fees ─────────────────────────────────────────

export const BASE_LICENSE_FEE = 5000;
export const LICENSE_FEE_DISTANCE_DIVISOR = 100;
export const LICENSE_FEE_ROUTE_ESCALATION = 0.25;

// ── Fleet Overhead ─────────────────────────────────────────────

/** Ships below this count incur no fleet overhead */
export const FLEET_OVERHEAD_THRESHOLD = 4;
/** Per-ship overhead rate above the threshold */
export const FLEET_OVERHEAD_PER_SHIP = 0.05;

// ── Route Slots ────────────────────────────────────────────────

export const BASE_ROUTE_SLOTS = 3;
export const HOME_EMPIRE_BONUS_SLOTS = 1;
/**
 * @deprecated Slot bonuses are now declared per-contract via
 * `Contract.rewardSlotBonus`. This constant is kept for back-compat with
 * fixtures that still reference it; new code should not read it.
 */
export const SLOT_PER_EMPIRE_UNLOCK = 1;

// ── Empire Access ──────────────────────────────────────────────

export const STARTING_ADJACENT_EMPIRES = 2;

// ── Contracts ──────────────────────────────────────────────────

export const MAX_AVAILABLE_CONTRACTS = 4;
export const CONTRACT_FAILURE_REP_PENALTY = -7;
export const CONTRACT_FAILURE_COOLDOWN_TURNS = 3;
export const CONTRACT_UNASSIGNED_SHIP_LIMIT = 2;

// ── Tech Tree ──────────────────────────────────────────────────

export const BASE_RP_PER_TURN = 1;
export const RP_DIVERSITY_THRESHOLD = 4;
export const RP_RESEARCH_PLANET_BONUS = 0.5;

// ── Mothball ───────────────────────────────────────────────────

export const MOTHBALL_FEE_RATIO = 0.5;

// ── Inter-empire Trade ─────────────────────────────────────────

export const BASE_CARGO_TYPES_PER_PAIR = 1;
// ── Hyperlane Config ───────────────────────────────────────

/** Maximum hyperlane connections any single system can have */
export const HYPERLANE_MAX_CONNECTIONS = 5;
/** Minimum connections to keep from Delaunay triangulation */
export const HYPERLANE_MIN_CONNECTIONS = 2;
/** Maximum ships assignable to a single route */
export const MAX_SHIPS_PER_ROUTE = 5;

/** Density presets — fraction of Delaunay edges to keep */
export const HYPERLANE_DENSITY_CONFIGS: Record<
  HyperlaneDensity,
  { keepRatio: number; maxConn: number; chokepoints: number }
> = {
  [HyperlaneDensity.Low]: { keepRatio: 0.45, maxConn: 3, chokepoints: 1 },
  [HyperlaneDensity.Medium]: { keepRatio: 0.6, maxConn: 4, chokepoints: 2 },
  [HyperlaneDensity.High]: { keepRatio: 0.75, maxConn: 5, chokepoints: 3 },
};

/** Shape-specific edge bias when pruning (fraction favoring along-shape edges) */
export const HYPERLANE_SHAPE_BIAS = {
  spiral: 0.7,
  elliptical: 0.5,
  ring: 0.8,
  irregular: 0.4,
} as const;

// ── Diplomacy Config ───────────────────────────────────────

/** Turns of war before ceasefire can occur */
export const WAR_MIN_DURATION = 4;
/** Maximum turns a war can last before forced ceasefire */
export const WAR_MAX_DURATION = 8;
/** Turns of peace required before trade pact can be proposed */
export const TRADE_PACT_PEACE_REQUIREMENT = 3;
/** Turns of trade pact required before alliance can form */
export const ALLIANCE_PACT_REQUIREMENT = 5;
/** Chance per turn that relations drift (improve or degrade) */
export const DIPLOMACY_DRIFT_CHANCE = 0.08;
/** Per-turn chance of war between cold-war empires */
export const COLD_WAR_ESCALATION_CHANCE = 0.015;

/** Open border ports by diplomatic status */
export const BORDER_PORTS_BY_STATUS = {
  war: 0,
  coldWar: 0,
  peace: 1,
  tradePact: -1, // -1 means all
  alliance: -1, // -1 means all
} as const;

/** Tariff multiplier by diplomatic status (applied on top of empire base tariff) */
export const TARIFF_DIPLOMATIC_MULTIPLIER = {
  war: 0, // no trade
  coldWar: 1.5, // 50% surcharge
  peace: 1.0,
  tradePact: 0.5, // 50% discount
  alliance: 0, // free
} as const;
// ── AI Slot Progression ────────────────────────────────────────

export const AI_SLOT_GROWTH_INTERVAL = 10;
export const AI_EMPIRE_UNLOCK_INTERVAL = 12;

// ── Game Length Presets ────────────────────────────────────────

export type GamePreset = "quick" | "standard" | "epic";

export interface GamePresetConfig {
  id: GamePreset;
  label: string;
  maxTurns: number;
  empireCount: number;
  systemsPerEmpireMin: number;
  systemsPerEmpireMax: number;
  planetsPerSystemMin: number;
  planetsPerSystemMax: number;
  aiCompanyCount: number;
  startingCash: number;
  startingShips: number;
  mapScale: number;
  /** Base RP per turn (slightly faster in shorter games) */
  baseRpPerTurn: number;
  /** How often AI companies get replaced after bankruptcy */
  aiReplacementDelay: number;
}

export const GAME_LENGTH_PRESETS: Record<GamePreset, GamePresetConfig> = {
  quick: {
    id: "quick",
    label: "Quick (25 turns)",
    maxTurns: 25,
    empireCount: 6,
    systemsPerEmpireMin: 18,
    systemsPerEmpireMax: 24,
    // Many systems are barren navigation nodes (0 planets). Average ~1.7
    // planets per system with the weighted distribution in GalaxyGenerator.
    planetsPerSystemMin: 0,
    planetsPerSystemMax: 3,
    aiCompanyCount: 3,
    startingCash: 250000,
    startingShips: 0,
    mapScale: 0.8,
    baseRpPerTurn: 2,
    aiReplacementDelay: 2,
  },
  standard: {
    id: "standard",
    label: "Standard (45 turns)",
    maxTurns: 45,
    empireCount: 8,
    systemsPerEmpireMin: 30,
    systemsPerEmpireMax: 40,
    planetsPerSystemMin: 0,
    planetsPerSystemMax: 3,
    aiCompanyCount: 4,
    startingCash: 275000,
    startingShips: 0,
    mapScale: 1.0,
    baseRpPerTurn: 1,
    aiReplacementDelay: 3,
  },
  epic: {
    id: "epic",
    label: "Epic (80 turns)",
    maxTurns: 80,
    empireCount: 12,
    systemsPerEmpireMin: 38,
    systemsPerEmpireMax: 50,
    planetsPerSystemMin: 0,
    planetsPerSystemMax: 4,
    aiCompanyCount: 6,
    startingCash: 300000,
    startingShips: 0,
    mapScale: 1.4,
    baseRpPerTurn: 1,
    aiReplacementDelay: 3,
  },
};

// ── Nav Unlock Rules ───────────────────────────────────────────

/** Tabs visible from turn 1 with no prerequisites */
export const NAV_ALWAYS_VISIBLE: NavTabId[] = [
  "map",
  "routes",
  "fleet",
  "finance",
];

/** Rules that unlock nav tabs progressively */
export const NAV_UNLOCK_RULES: Array<{
  tabId: NavTabId;
  description: string;
  /** Turn >= this unlocks the tab (if set) */
  minTurn?: number;
  /** State trigger key — checked in NavUnlocks.ts */
  trigger?: "first_contract_offer" | "second_empire_unlock" | "hub_available";
}> = [
  { tabId: "research", description: "Unlocks on turn 3", minTurn: 3 },
  {
    tabId: "contracts",
    description: "Unlocks when first contract is offered",
    trigger: "first_contract_offer",
  },
  {
    tabId: "empires",
    description: "Unlocks after 2nd empire unlock",
    trigger: "second_empire_unlock",
  },
  { tabId: "rivals", description: "Unlocks on turn 5", minTurn: 5 },
  { tabId: "hub", description: "Unlocks on turn 5", minTurn: 5 },
  { tabId: "market", description: "Unlocks on turn 5", minTurn: 5 },
];

// ── Game Size Configs (legacy alias — backed by GAME_LENGTH_PRESETS) ─────────

/** @deprecated Use GAME_LENGTH_PRESETS instead */
export type GameSizeConfig = GamePresetConfig;

/** @deprecated Use GAME_LENGTH_PRESETS instead */
export const GAME_SIZE_CONFIGS: Record<GamePreset, GamePresetConfig> =
  GAME_LENGTH_PRESETS;

// ── Empire Tariff Ranges ───────────────────────────────────────

export const TARIFF_FRIENDLY_MIN = 0.05;
export const TARIFF_FRIENDLY_MAX = 0.08;
export const TARIFF_NEUTRAL_MIN = 0.1;
export const TARIFF_NEUTRAL_MAX = 0.15;
export const TARIFF_HOSTILE_MIN = 0.15;
export const TARIFF_HOSTILE_MAX = 0.2;

// ── AI Constants ───────────────────────────────────────────────

export const AI_STARTING_CASH = 200000;
export const AI_BUY_THRESHOLD_MULTIPLIER = 1.5; // buy when cash > 1.5× cheapest ship
export const AI_MAX_ROUTES = 12; // cap routes per AI company
export const AI_MAX_FLEET = 15; // cap fleet size per AI company
export const AI_MAX_PURCHASES_PER_TURN = 2; // max ships bought per turn
export const AI_OVERHAUL_CONDITION = 60; // overhaul ships below this condition
export const AI_MAX_SHIP_SPEND_RATIO = 0.4; // SteadyHauler won't spend more than 40% cash on one ship
export const AI_REPLACEMENT_DELAY = 3; // turns after bankruptcy before a replacement company spawns
export const AI_REPLACEMENT_CASH_RATIO = 0.75; // replacement companies start with 75% of normal starting cash

export const SHIP_TEMPLATES: Record<ShipClass, ShipTemplate> = {
  [ShipClass.CargoShuttle]: {
    class: ShipClass.CargoShuttle,
    name: "Cargo Shuttle",
    cargoCapacity: 80,
    passengerCapacity: 0,
    speed: 4,
    fuelEfficiency: 0.8,
    baseReliability: 92,
    purchaseCost: 40000,
    baseMaintenance: 2000,
  },
  [ShipClass.PassengerShuttle]: {
    class: ShipClass.PassengerShuttle,
    name: "Passenger Shuttle",
    cargoCapacity: 0,
    passengerCapacity: 60,
    speed: 5,
    fuelEfficiency: 1.0,
    baseReliability: 90,
    purchaseCost: 55000,
    baseMaintenance: 3000,
  },
  [ShipClass.MixedHauler]: {
    class: ShipClass.MixedHauler,
    name: "Mixed Hauler",
    cargoCapacity: 50,
    passengerCapacity: 30,
    speed: 3,
    fuelEfficiency: 1.2,
    baseReliability: 88,
    purchaseCost: 60000,
    baseMaintenance: 3500,
  },
  [ShipClass.FastCourier]: {
    class: ShipClass.FastCourier,
    name: "Fast Courier",
    cargoCapacity: 30,
    passengerCapacity: 10,
    speed: 8,
    fuelEfficiency: 2.0,
    baseReliability: 85,
    purchaseCost: 80000,
    baseMaintenance: 5000,
  },
  [ShipClass.BulkFreighter]: {
    class: ShipClass.BulkFreighter,
    name: "Bulk Freighter",
    cargoCapacity: 200,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 1.0,
    baseReliability: 94,
    purchaseCost: 180000,
    baseMaintenance: 8000,
  },
  [ShipClass.StarLiner]: {
    class: ShipClass.StarLiner,
    name: "Star Liner",
    cargoCapacity: 0,
    passengerCapacity: 150,
    speed: 6,
    fuelEfficiency: 1.5,
    baseReliability: 88,
    purchaseCost: 280000,
    baseMaintenance: 12000,
  },
  [ShipClass.MegaHauler]: {
    class: ShipClass.MegaHauler,
    name: "Mega Hauler",
    cargoCapacity: 400,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 1.2,
    baseReliability: 90,
    purchaseCost: 500000,
    baseMaintenance: 22000,
  },
  [ShipClass.LuxuryLiner]: {
    class: ShipClass.LuxuryLiner,
    name: "Luxury Liner",
    cargoCapacity: 20,
    passengerCapacity: 120,
    speed: 7,
    fuelEfficiency: 1.8,
    baseReliability: 86,
    purchaseCost: 600000,
    baseMaintenance: 25000,
  },
  [ShipClass.Tug]: {
    class: ShipClass.Tug,
    name: "System Tug",
    cargoCapacity: 20,
    passengerCapacity: 0,
    speed: 3,
    fuelEfficiency: 0.6,
    baseReliability: 95,
    purchaseCost: 15000,
    baseMaintenance: 800,
  },
  [ShipClass.RefrigeratedHauler]: {
    class: ShipClass.RefrigeratedHauler,
    name: "Refrigerated Hauler",
    cargoCapacity: 70,
    passengerCapacity: 0,
    speed: 3,
    fuelEfficiency: 1.1,
    baseReliability: 90,
    purchaseCost: 120000,
    baseMaintenance: 6000,
  },
  [ShipClass.ArmoredFreighter]: {
    class: ShipClass.ArmoredFreighter,
    name: "Armored Freighter",
    cargoCapacity: 150,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 1.4,
    baseReliability: 96,
    purchaseCost: 240000,
    baseMaintenance: 11000,
  },
  [ShipClass.DiplomaticYacht]: {
    class: ShipClass.DiplomaticYacht,
    name: "Diplomatic Yacht",
    cargoCapacity: 15,
    passengerCapacity: 40,
    speed: 7,
    fuelEfficiency: 1.6,
    baseReliability: 93,
    purchaseCost: 200000,
    baseMaintenance: 9000,
  },
  [ShipClass.ColonyShip]: {
    class: ShipClass.ColonyShip,
    name: "Colony Ship",
    cargoCapacity: 120,
    passengerCapacity: 80,
    speed: 2,
    fuelEfficiency: 1.5,
    baseReliability: 91,
    purchaseCost: 350000,
    baseMaintenance: 15000,
  },
};

export const PLANET_PASSENGER_VOLUME: Record<PlanetType, number> = {
  [PlanetType.Agricultural]: 15,
  [PlanetType.Mining]: 15,
  [PlanetType.TechWorld]: 40,
  [PlanetType.Manufacturing]: 50,
  [PlanetType.LuxuryWorld]: 60,
  [PlanetType.CoreWorld]: 100,
  [PlanetType.Frontier]: 25,
};

export const INDUSTRY_INPUT_SUPPLY_MULTIPLIER = 2.0;
export const INDUSTRY_INPUT_DECAY_MULTIPLIER = 1.5;

export const BASE_CARGO_PRICES: Record<CargoType, number> = {
  [CargoType.Passengers]: 65,
  [CargoType.RawMaterials]: 18,
  [CargoType.Food]: 24,
  [CargoType.Technology]: 40,
  [CargoType.Luxury]: 50,
  [CargoType.Hazmat]: 46,
  [CargoType.Medical]: 50,
};

export const PER_CAPITA_DEMAND: Partial<Record<CargoType, number>> = {
  [CargoType.Food]: 1.0,
  [CargoType.Medical]: 0.1,
  [CargoType.Luxury]: 0.2,
  [CargoType.Passengers]: 0.05,
};

export const FOOD_DEFICIT_TURNS_TO_SHRINK = 3;
export const FOOD_SURPLUS_TURNS_TO_GROW = 5;
export const POP_SHRINK_RATE_PER_TURN = 0.02;
export const POP_GROW_RATE_PER_TURN = 0.01;

export const GALAXY_TIERS = {
  quick: {
    systemCount: 300,
    empireCount: 11,
    planetsPerSystem: { min: 1, max: 4 },
  },
  standard: {
    systemCount: 450,
    empireCount: 12,
    planetsPerSystem: { min: 1, max: 4 },
  },
  epic: {
    systemCount: 600,
    empireCount: 14,
    planetsPerSystem: { min: 1, max: 4 },
  },
} as const;

export const REQUIRED_PRODUCER_TYPES: CargoType[] = [
  CargoType.Food,
  CargoType.RawMaterials,
  CargoType.Technology,
  CargoType.Medical,
  CargoType.Luxury,
];

export const SPECIAL_CHARTER_TIER_THRESHOLD = "respected";

// ── Cargo diversity scoring bonus ──────────────────────────────

/** Bonus points per distinct cargo type delivered across all turns */
export const CARGO_DIVERSITY_BONUS = 2000;

// ── Tech Tree Data ─────────────────────────────────────────────

export const TECH_GRAPH: Technology[] = [
  // ── Center ──────────────────────────────────────────────────────────────────
  {
    id: "fuel_efficiency_1",
    name: "Fuel Savings I",
    icon: "🔋",
    branch: TechBranch.Engineering,
    tier: 1,
    rpCost: 4,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 0, radius: 0 },
    edges: [
      "logistics_hub",
      "engineering_hub",
      "intelligence_hub",
      "crisis_hub",
      "diplomacy_hub",
    ],
    description: "−1% fuel costs per purchase",
    effects: [{ type: "modifyFuel", value: -0.01 }],
  },

  // ── Logistics Branch ────────────────────────────────────────────────────────
  {
    id: "logistics_hub",
    name: "Efficient Scheduling",
    icon: "⏱️",
    branch: TechBranch.Logistics,
    tier: 1,
    rpCost: 6,
    position: { angle: 270, radius: 1 },
    edges: ["fuel_efficiency_1", "logistics_2a", "logistics_2b"],
    description: "+1 route slot",
    effects: [{ type: "addRouteSlots", value: 1 }],
  },
  {
    id: "logistics_2a",
    name: "Short Haul Focus",
    icon: "🗺️",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 10,
    position: { angle: 250, radius: 2 },
    edges: ["logistics_hub", "logistics_trips_r", "logistics_3"],
    description: "+1 trip/turn on all routes",
    effects: [{ type: "addTripsPerTurn", value: 1 }],
  },
  {
    id: "logistics_2b",
    name: "Long Haul Network",
    icon: "🌐",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 10,
    position: { angle: 290, radius: 2 },
    edges: ["logistics_hub", "logistics_3"],
    description: "+10% route revenue",
    effects: [{ type: "modifyRevenue", value: 0.1 }],
  },
  {
    id: "logistics_trips_r",
    name: "Route Efficiency I",
    icon: "⚡",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 12,
    repeatable: true,
    repeatCostScale: 1.6,
    position: { angle: 235, radius: 2.6 },
    edges: ["logistics_2a"],
    description: "+0.5 trips/turn on all routes",
    effects: [{ type: "addTripsPerTurn", value: 0.5 }],
  },
  {
    id: "logistics_3",
    name: "Regional Hub Protocols",
    icon: "🏢",
    branch: TechBranch.Logistics,
    tier: 3,
    rpCost: 20,
    position: { angle: 270, radius: 3 },
    edges: ["logistics_2a", "logistics_2b", "logistics_4"],
    description: "+1 route slot, −10% license fees",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyLicenseFee", value: -0.1 },
    ],
  },
  {
    id: "logistics_4",
    name: "Omnipresent Logistics",
    icon: "🌌",
    branch: TechBranch.Logistics,
    tier: 4,
    rpCost: 45,
    position: { angle: 270, radius: 4 },
    edges: ["logistics_3", "logistics_cap"],
    description: "+1 route slot, +10% all revenue",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyRevenue", value: 0.1 },
    ],
  },
  {
    id: "logistics_cap",
    name: "★ Logistics Mastery",
    icon: "🏆",
    branch: TechBranch.Logistics,
    tier: 4,
    rpCost: 60,
    position: { angle: 270, radius: 4.8 },
    edges: ["logistics_4"],
    description: "+2 route slots, −15% license fees, +5% revenue",
    effects: [
      { type: "addRouteSlots", value: 2 },
      { type: "modifyLicenseFee", value: -0.15 },
      { type: "modifyRevenue", value: 0.05 },
    ],
  },

  // ── Engineering Branch ───────────────────────────────────────────────────────
  {
    id: "engineering_hub",
    name: "Workshop",
    icon: "🔧",
    branch: TechBranch.Engineering,
    tier: 1,
    rpCost: 6,
    position: { angle: 342, radius: 1 },
    edges: ["fuel_efficiency_1", "engineering_2a", "engineering_2b"],
    description: "−10% maintenance costs",
    effects: [{ type: "modifyMaintenance", value: -0.1 }],
  },
  {
    id: "engineering_2a",
    name: "Fuel Injection",
    icon: "⛽",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 10,
    position: { angle: 325, radius: 2 },
    edges: ["engineering_hub", "fuel_savings_r", "engineering_3"],
    description: "−10% fuel costs",
    effects: [{ type: "modifyFuel", value: -0.1 }],
  },
  {
    id: "engineering_2b",
    name: "Hull Plating",
    icon: "🛠️",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 10,
    position: { angle: 359, radius: 2 },
    edges: ["engineering_hub", "engineering_overhaul_r", "engineering_3"],
    description: "Ship condition decay −20%",
    effects: [{ type: "modifyConditionDecay", value: -0.2 }],
  },
  {
    id: "fuel_savings_r",
    name: "Fuel Savings II",
    icon: "🔋",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 14,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 310, radius: 2.6 },
    edges: ["engineering_2a"],
    description: "−1% fuel costs per purchase",
    effects: [{ type: "modifyFuel", value: -0.01 }],
  },
  {
    id: "engineering_overhaul_r",
    name: "Efficient Yard I",
    icon: "🏗️",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 16,
    repeatable: true,
    repeatCostScale: 1.6,
    position: { angle: 14, radius: 2.6 },
    edges: ["engineering_2b"],
    description: "−3% overhaul cost per purchase",
    effects: [{ type: "modifyOverhaulCost", value: -0.03 }],
  },
  {
    id: "engineering_3",
    name: "Autonomous Repair",
    icon: "🤖",
    branch: TechBranch.Engineering,
    tier: 3,
    rpCost: 22,
    position: { angle: 342, radius: 3 },
    edges: ["engineering_2a", "engineering_2b", "engineering_4"],
    description: "+3 condition/turn auto-repair",
    effects: [{ type: "addAutoRepair", value: 3 }],
  },
  {
    id: "engineering_4",
    name: "Elite Fleet",
    icon: "🚀",
    branch: TechBranch.Engineering,
    tier: 4,
    rpCost: 45,
    position: { angle: 342, radius: 4 },
    edges: ["engineering_3", "engineering_cap"],
    description: "−20% overhaul cost, ship decay −10%",
    effects: [
      { type: "modifyOverhaulCost", value: -0.2 },
      { type: "modifyConditionDecay", value: -0.1 },
    ],
  },
  {
    id: "engineering_cap",
    name: "★ Engineering Mastery",
    icon: "🏆",
    branch: TechBranch.Engineering,
    tier: 4,
    rpCost: 60,
    position: { angle: 342, radius: 4.8 },
    edges: ["engineering_4"],
    description: "+5 auto-repair/turn, −10% maintenance, −10% fuel",
    effects: [
      { type: "addAutoRepair", value: 5 },
      { type: "modifyMaintenance", value: -0.1 },
      { type: "modifyFuel", value: -0.1 },
    ],
  },

  // ── Intelligence Branch ──────────────────────────────────────────────────────
  {
    id: "intelligence_hub",
    name: "Market Forecasting",
    icon: "📊",
    branch: TechBranch.Intelligence,
    tier: 1,
    rpCost: 6,
    position: { angle: 54, radius: 1 },
    edges: ["fuel_efficiency_1", "intelligence_2a", "intelligence_2b"],
    description: "Trend predictions shown 2 turns ahead",
    effects: [{ type: "addMarketForecast", value: 2 }],
  },
  {
    id: "intelligence_2a",
    name: "Supply Chain Analytics",
    icon: "🔍",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 10,
    position: { angle: 37, radius: 2 },
    edges: ["intelligence_hub", "intelligence_3"],
    description: "Saturation shown numerically, +5% cargo prices",
    effects: [
      { type: "addSaturationDisplay", value: 1 },
      { type: "modifyRevenue", value: 0.05 },
    ],
  },
  {
    id: "intelligence_2b",
    name: "RP Lab I",
    icon: "🧪",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 10,
    repeatable: true,
    repeatCostScale: 1.8,
    position: { angle: 71, radius: 2 },
    edges: ["intelligence_hub", "intelligence_rp_r", "intelligence_3"],
    description: "+1 RP/turn",
    effects: [{ type: "addRPPerTurn", value: 1 }],
  },
  {
    id: "intelligence_rp_r",
    name: "Research Accelerator",
    icon: "🔬",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 18,
    repeatable: true,
    repeatCostScale: 2.0,
    position: { angle: 86, radius: 2.6 },
    edges: ["intelligence_2b"],
    description: "+1 RP/turn",
    effects: [{ type: "addRPPerTurn", value: 1 }],
  },
  {
    id: "intelligence_3",
    name: "Arbitrage Algorithms",
    icon: "💹",
    branch: TechBranch.Intelligence,
    tier: 3,
    rpCost: 22,
    position: { angle: 54, radius: 3 },
    edges: ["intelligence_2a", "intelligence_2b", "intelligence_4"],
    description: "Route finder shows true net profit, −20% saturation impact",
    effects: [{ type: "modifySaturation", value: -0.2 }],
  },
  {
    id: "intelligence_4",
    name: "Market Manipulation",
    icon: "📈",
    branch: TechBranch.Intelligence,
    tier: 4,
    rpCost: 45,
    position: { angle: 54, radius: 4 },
    edges: ["intelligence_3", "intelligence_cap"],
    description: "Reset saturation on 1 planet per 5 turns",
    effects: [{ type: "addMarketReset", value: 5 }],
  },
  {
    id: "intelligence_cap",
    name: "★ Intelligence Mastery",
    icon: "🏆",
    branch: TechBranch.Intelligence,
    tier: 4,
    rpCost: 60,
    position: { angle: 54, radius: 4.8 },
    edges: ["intelligence_4"],
    description: "+2 RP/turn, +10% revenue, −10% saturation",
    effects: [
      { type: "addRPPerTurn", value: 2 },
      { type: "modifyRevenue", value: 0.1 },
      { type: "modifySaturation", value: -0.1 },
    ],
  },

  // ── Crisis Branch ────────────────────────────────────────────────────────────
  {
    id: "crisis_hub",
    name: "Emergency Reserves",
    icon: "🛡️",
    branch: TechBranch.Crisis,
    tier: 1,
    rpCost: 6,
    position: { angle: 126, radius: 1 },
    edges: ["fuel_efficiency_1", "crisis_2a", "crisis_2b"],
    description: "Event costs −15%",
    effects: [{ type: "modifyEventCash", value: -0.15 }],
  },
  {
    id: "crisis_2a",
    name: "Crisis Response",
    icon: "🚨",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    position: { angle: 109, radius: 2 },
    edges: ["crisis_hub", "crisis_reserves_r", "crisis_3"],
    description: "Hazard event duration −1 turn (min 1)",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_2b",
    name: "Political Connections",
    icon: "🏛️",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    position: { angle: 143, radius: 2 },
    edges: ["crisis_hub", "crisis_3"],
    description: "Empire event duration −1, 25% avoid chance",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_reserves_r",
    name: "Cash Cushion I",
    icon: "💰",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 10,
    repeatable: true,
    repeatCostScale: 1.5,
    position: { angle: 94, radius: 2.6 },
    edges: ["crisis_2a"],
    description: "Event cash cost −3% per purchase",
    effects: [{ type: "modifyEventCash", value: -0.03 }],
  },
  {
    id: "crisis_3",
    name: "Galactic Insurance",
    icon: "⛑️",
    branch: TechBranch.Crisis,
    tier: 3,
    rpCost: 22,
    position: { angle: 126, radius: 3 },
    edges: ["crisis_2a", "crisis_2b", "crisis_4"],
    description: "Grounded routes pay 50% mothball refund",
    effects: [{ type: "addMothballRefund", value: 0.5 }],
  },
  {
    id: "crisis_4",
    name: "Unbreakable Operations",
    icon: "⚓",
    branch: TechBranch.Crisis,
    tier: 4,
    rpCost: 45,
    position: { angle: 126, radius: 4 },
    edges: ["crisis_3", "crisis_cap"],
    description: "Breakdowns earn 50% revenue, +1 embargo immunity",
    effects: [
      { type: "addBreakdownRevenue", value: 0.5 },
      { type: "addEmbargoImmunity", value: 1 },
    ],
  },
  {
    id: "crisis_cap",
    name: "★ Crisis Mastery",
    icon: "🏆",
    branch: TechBranch.Crisis,
    tier: 4,
    rpCost: 60,
    position: { angle: 126, radius: 4.8 },
    edges: ["crisis_4"],
    description: "Event costs −20%, event duration −1 more",
    effects: [
      { type: "modifyEventCash", value: -0.2 },
      { type: "modifyEventDuration", value: -1 },
    ],
  },

  // ── Diplomacy Branch ─────────────────────────────────────────────────────────
  {
    id: "diplomacy_hub",
    name: "Cultural Exchange",
    icon: "🤝",
    branch: TechBranch.Diplomacy,
    tier: 1,
    rpCost: 6,
    position: { angle: 198, radius: 1 },
    edges: ["fuel_efficiency_1", "diplomacy_2a", "diplomacy_2b"],
    description: "−10% tariffs on friendly empires",
    effects: [{ type: "modifyTariff", value: -0.1, target: "friendly" }],
  },
  {
    id: "diplomacy_2a",
    name: "Trade Envoys",
    icon: "📜",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 10,
    position: { angle: 181, radius: 2 },
    edges: [
      "diplomacy_hub",
      "diplomacy_food",
      "diplomacy_tech",
      "diplomacy_luxury",
      "diplomacy_3",
    ],
    description: "+1 cargo type per empire pair",
    effects: [{ type: "addCargoTypesPerPair", value: 1 }],
  },
  {
    id: "diplomacy_2b",
    name: "Border Protocols",
    icon: "🛂",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 10,
    position: { angle: 215, radius: 2 },
    edges: ["diplomacy_hub", "diplomacy_relations_r", "diplomacy_3"],
    description: "−15% tariffs on neutral empires",
    effects: [{ type: "modifyTariff", value: -0.15, target: "neutral" }],
  },
  {
    id: "diplomacy_food",
    name: "Food Pact",
    icon: "🍎",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 160, radius: 2.6 },
    edges: ["diplomacy_2a"],
    description: "+20% food revenue",
    effects: [{ type: "modifyRevenue", value: 0.2 }],
  },
  {
    id: "diplomacy_tech",
    name: "Tech Pact",
    icon: "💡",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 175, radius: 2.6 },
    edges: ["diplomacy_2a"],
    description: "+20% tech cargo revenue",
    effects: [{ type: "modifyRevenue", value: 0.2 }],
  },
  {
    id: "diplomacy_luxury",
    name: "Luxury Pact",
    icon: "💎",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    position: { angle: 190, radius: 2.6 },
    edges: ["diplomacy_2a"],
    description: "+20% luxury revenue",
    effects: [{ type: "modifyRevenue", value: 0.2 }],
  },
  {
    id: "diplomacy_relations_r",
    name: "Open Borders I",
    icon: "🕊️",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 12,
    repeatable: true,
    repeatCostScale: 1.6,
    position: { angle: 228, radius: 2.6 },
    edges: ["diplomacy_2b"],
    description: "−5% tariffs on all empires per purchase",
    effects: [{ type: "modifyTariff", value: -0.05, target: "all" }],
  },
  {
    id: "diplomacy_3",
    name: "Galactic Trade Council",
    icon: "🌍",
    branch: TechBranch.Diplomacy,
    tier: 3,
    rpCost: 20,
    position: { angle: 198, radius: 3 },
    edges: ["diplomacy_2a", "diplomacy_2b", "diplomacy_4"],
    description: "−20% tariffs all empires, +1 cargo type/pair",
    effects: [
      { type: "modifyTariff", value: -0.2, target: "all" },
      { type: "addCargoTypesPerPair", value: 1 },
    ],
  },
  {
    id: "diplomacy_4",
    name: "Hegemonic Influence",
    icon: "👑",
    branch: TechBranch.Diplomacy,
    tier: 4,
    rpCost: 45,
    position: { angle: 198, radius: 4 },
    edges: ["diplomacy_3", "diplomacy_cap"],
    description: "Embargo immunity +2, hostile tariffs −25%",
    effects: [
      { type: "addEmbargoImmunity", value: 2 },
      { type: "modifyTariff", value: -0.25, target: "hostile" },
    ],
  },
  {
    id: "diplomacy_cap",
    name: "★ Diplomacy Mastery",
    icon: "🏆",
    branch: TechBranch.Diplomacy,
    tier: 4,
    rpCost: 60,
    position: { angle: 198, radius: 4.8 },
    edges: ["diplomacy_4"],
    description: "−20% all tariffs, +2 cargo types/pair",
    effects: [
      { type: "modifyTariff", value: -0.2, target: "all" },
      { type: "addCargoTypesPerPair", value: 2 },
    ],
  },
];

// Backwards-compat alias — all existing consumers of TECH_TREE continue to work
export const TECH_TREE = TECH_GRAPH;

export const AI_TECH_STRATEGIES: Record<string, string[]> = {
  aggressiveExpander: [
    "fuel_efficiency_1",
    "logistics_hub",
    "logistics_2a",
    "logistics_2b",
    "logistics_trips_r",
    "logistics_3",
    "logistics_4",
    "logistics_cap",
  ],
  steadyHauler: [
    "fuel_efficiency_1",
    "engineering_hub",
    "engineering_2a",
    "fuel_savings_r",
    "fuel_savings_r",
    "engineering_2b",
    "engineering_3",
    "engineering_4",
  ],
  cherryPicker: [
    "fuel_efficiency_1",
    "intelligence_hub",
    "intelligence_2b",
    "intelligence_2a",
    "intelligence_rp_r",
    "intelligence_3",
    "crisis_hub",
    "crisis_2a",
  ],
};

// ── AI Personality Slot Configs ────────────────────────────────

export const AI_PERSONALITY_SLOTS: Record<
  string,
  { baseSlots: number; maxSlots: number }
> = {
  aggressiveExpander: { baseSlots: 5, maxSlots: 11 },
  steadyHauler: { baseSlots: 4, maxSlots: 8 },
  cherryPicker: { baseSlots: 5, maxSlots: 11 },
};

// ── Hub Station Constants ──────────────────────────────────────

/** Cost to upgrade hub to each level (index = target level) */
export const HUB_UPGRADE_COSTS = [0, 25000, 50000, 100000, 200000] as const;

/** Available grid slots at each hub level */
export const HUB_LEVEL_SLOTS = [4, 8, 12, 18, 24] as const;

/** Max hub level */
export const HUB_MAX_LEVEL = 4;

/** Grid dimensions: decks (rows) × slots per deck (columns) */
export const HUB_GRID_DECKS = 4;
export const HUB_GRID_SLOTS_PER_DECK = 6;

/** Bonus falloff at 1 hyperlane hop from hub system */
export const HUB_RADIUS_FALLOFF = 0.5;

/** Number of tech-gated rooms available per run (plus 2 starters = 8 total) */
export const HUB_TECH_ROOMS_PER_RUN = 6;

/** Refund ratio when demolishing a room */
export const HUB_DEMOLISH_REFUND_RATIO = 0.5;

/** All hub room definitions */
export const HUB_ROOM_DEFINITIONS: Record<HubRoomType, HubRoomDefinition> = {
  [HubRoomType.SimpleTerminal]: {
    type: HubRoomType.SimpleTerminal,
    name: "Simple Terminal",
    description:
      "Core hub module, pre-installed rent-free. Boosts trade and passenger revenue by 5% at hub and neighbors.",
    icon: "📡",
    buildCost: 5000,
    // Rent-free starter: player begins with one SimpleTerminal pre-installed,
    // so charging upkeep on turn 1 surprises the player with a -§500/turn
    // line before they've taken any action. Upkeep kicks in from the first
    // upgrade (Improved Terminal) onward.
    upkeepCost: 0,
    limit: 1,
    techRequirement: null,
    bonusScope: "localRadius",
    bonusEffects: [
      { type: "modifyRevenue", value: 0.05 },
      { type: "modifyPassengerRevenue", value: 0.05 },
    ],
  },
  [HubRoomType.ImprovedTerminal]: {
    type: HubRoomType.ImprovedTerminal,
    name: "Improved Terminal",
    description:
      "Upgraded hub module. Boosts trade and passenger revenue by 8% at hub and neighbors.",
    icon: "📡",
    buildCost: 15000,
    upkeepCost: 1000,
    limit: 1,
    techRequirement: null,
    bonusScope: "localRadius",
    bonusEffects: [
      { type: "modifyRevenue", value: 0.08 },
      { type: "modifyPassengerRevenue", value: 0.08 },
    ],
  },
  [HubRoomType.AdvancedTerminal]: {
    type: HubRoomType.AdvancedTerminal,
    name: "Advanced Terminal",
    description:
      "Top-tier hub module. Boosts trade and passenger revenue by 12% at hub and neighbors.",
    icon: "📡",
    buildCost: 35000,
    upkeepCost: 1500,
    limit: 1,
    techRequirement: null,
    bonusScope: "localRadius",
    bonusEffects: [
      { type: "modifyRevenue", value: 0.12 },
      { type: "modifyPassengerRevenue", value: 0.12 },
    ],
  },
  [HubRoomType.TradeOffice]: {
    type: HubRoomType.TradeOffice,
    name: "Trade Office",
    description: "Reduces license fees across the empire by 15%.",
    icon: "📋",
    buildCost: 10000,
    upkeepCost: 2000,
    limit: 1,
    techRequirement: null,
    bonusScope: "empire",
    bonusEffects: [{ type: "modifyLicenseFee", value: -0.15 }],
  },
  [HubRoomType.PassengerLounge]: {
    type: HubRoomType.PassengerLounge,
    name: "Passenger Lounge",
    description: "Boosts passenger revenue by 25% at hub system and neighbors.",
    icon: "🛋️",
    buildCost: 12000,
    upkeepCost: 2000,
    limit: 1,
    techRequirement: null,
    bonusScope: "localRadius",
    bonusEffects: [{ type: "modifyPassengerRevenue", value: 0.25 }],
  },
  [HubRoomType.OreProcessing]: {
    type: HubRoomType.OreProcessing,
    name: "Ore Processing",
    description:
      "Adds 1 route slot. Reduces saturation impact by 15% at hub and neighbors.",
    icon: "⛏️",
    buildCost: 16000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "logistics_1",
    bonusScope: "localRadius",
    bonusEffects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifySaturation", value: -0.15 },
    ],
  },
  [HubRoomType.FoodTerminal]: {
    type: HubRoomType.FoodTerminal,
    name: "Hydroponics Bay",
    description:
      "Reduces fuel costs by 12% for routes through hub and neighbors.",
    icon: "🌿",
    buildCost: 12000,
    upkeepCost: 1800,
    limit: 1,
    techRequirement: "logistics_1",
    bonusScope: "localRadius",
    bonusEffects: [{ type: "modifyFuel", value: -0.12 }],
  },
  [HubRoomType.TechTerminal]: {
    type: HubRoomType.TechTerminal,
    name: "Data Nexus",
    description:
      "Generates +1 research point per turn from tech cargo analysis.",
    icon: "💾",
    buildCost: 20000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "intelligence_1",
    bonusScope: "empire",
    bonusEffects: [{ type: "addRPPerTurn", value: 1 }],
  },
  [HubRoomType.LuxuryTerminal]: {
    type: HubRoomType.LuxuryTerminal,
    name: "Luxury Arcade",
    description: "Increases trade revenue by 5% on all empire routes.",
    icon: "💎",
    buildCost: 18000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "intelligence_1",
    bonusScope: "empire",
    bonusEffects: [{ type: "modifyRevenue", value: 0.05 }],
  },
  [HubRoomType.HazmatTerminal]: {
    type: HubRoomType.HazmatTerminal,
    name: "Hazmat Containment",
    description:
      "Reduces tariff rates by 12%. Increases AI maintenance costs by 5%.",
    icon: "☢️",
    buildCost: 22000,
    upkeepCost: 3000,
    limit: 1,
    techRequirement: "engineering_1",
    bonusScope: "empire",
    bonusEffects: [
      { type: "modifyTariff", value: -0.12 },
      { type: "modifyAIMaintenance", value: 0.05 },
    ],
  },
  [HubRoomType.MedicalTerminal]: {
    type: HubRoomType.MedicalTerminal,
    name: "Medical Wing",
    description:
      "Ships at hub gain +2 condition/turn. Boosts passenger revenue by 10% at hub and neighbors.",
    icon: "🏥",
    buildCost: 16000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "engineering_1",
    bonusScope: "localRadius",
    bonusEffects: [
      { type: "addRepairPerTurn", value: 2 },
      { type: "modifyPassengerRevenue", value: 0.1 },
    ],
  },
  [HubRoomType.FuelDepot]: {
    type: HubRoomType.FuelDepot,
    name: "Fuel Depot",
    description:
      "Reduces fuel costs by 20% for routes through hub system and neighbors.",
    icon: "⛽",
    buildCost: 15000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "engineering_1",
    bonusScope: "localRadius",
    bonusEffects: [{ type: "modifyFuel", value: -0.2 }],
  },
  [HubRoomType.MarketExchange]: {
    type: HubRoomType.MarketExchange,
    name: "Market Exchange",
    description: "Increases trade revenue by 5% on all empire routes.",
    icon: "📈",
    buildCost: 15000,
    upkeepCost: 2000,
    limit: 1,
    techRequirement: "intelligence_1",
    bonusScope: "empire",
    bonusEffects: [{ type: "modifyRevenue", value: 0.05 }],
  },
  [HubRoomType.CustomsBureau]: {
    type: HubRoomType.CustomsBureau,
    name: "Customs Bureau",
    description: "Reduces tariff rates in the empire by 20%.",
    icon: "🏛️",
    buildCost: 18000,
    upkeepCost: 3000,
    limit: 1,
    techRequirement: "diplomacy_1",
    bonusScope: "empire",
    bonusEffects: [{ type: "modifyTariff", value: -0.2 }],
  },
  [HubRoomType.RepairBay]: {
    type: HubRoomType.RepairBay,
    name: "Repair Bay",
    description:
      "Ships on routes through hub system gain +3 condition per turn.",
    icon: "🔧",
    buildCost: 12000,
    upkeepCost: 1500,
    limit: 2,
    techRequirement: "engineering_2",
    bonusScope: "local",
    bonusEffects: [{ type: "addRepairPerTurn", value: 3 }],
  },
  [HubRoomType.ResearchLab]: {
    type: HubRoomType.ResearchLab,
    name: "Research Lab",
    description: "Generates +1 research point per turn.",
    icon: "🔬",
    buildCost: 20000,
    upkeepCost: 2500,
    limit: 1,
    techRequirement: "intelligence_2",
    bonusScope: "empire",
    bonusEffects: [{ type: "addRPPerTurn", value: 1 }],
  },
  [HubRoomType.CargoWarehouse]: {
    type: HubRoomType.CargoWarehouse,
    name: "Cargo Warehouse",
    description:
      "Reduces saturation impact by 30% at hub system and neighbors.",
    icon: "🏗️",
    buildCost: 10000,
    upkeepCost: 1500,
    limit: 2,
    techRequirement: "logistics_2",
    bonusScope: "localRadius",
    bonusEffects: [{ type: "modifySaturation", value: -0.3 }],
  },
  [HubRoomType.SecurityOffice]: {
    type: HubRoomType.SecurityOffice,
    name: "Security Office",
    description:
      "AI routes in empire earn 15% less revenue. AI maintenance +10%.",
    icon: "🛡️",
    buildCost: 25000,
    upkeepCost: 3500,
    limit: 1,
    techRequirement: "diplomacy_2",
    bonusScope: "empire",
    bonusEffects: [
      { type: "modifyAIRevenue", value: -0.15 },
      { type: "modifyAIMaintenance", value: 0.1 },
    ],
  },
};

/** Room types that are always available (no tech requirement) */
export const HUB_STARTER_ROOMS: HubRoomType[] = [
  HubRoomType.SimpleTerminal,
  HubRoomType.TradeOffice,
  HubRoomType.PassengerLounge,
];

/** Room types that require tech and are randomized per run */
export const HUB_TECH_GATED_ROOMS: HubRoomType[] = [
  HubRoomType.OreProcessing,
  HubRoomType.FoodTerminal,
  HubRoomType.TechTerminal,
  HubRoomType.LuxuryTerminal,
  HubRoomType.HazmatTerminal,
  HubRoomType.MedicalTerminal,
  HubRoomType.FuelDepot,
  HubRoomType.MarketExchange,
  HubRoomType.CustomsBureau,
  HubRoomType.RepairBay,
  HubRoomType.ResearchLab,
  HubRoomType.CargoWarehouse,
  HubRoomType.SecurityOffice,
];

/** Terminal room types (SimpleTerminal upgrade chain) — cannot be demolished */
export const TERMINAL_ROOM_TYPES: HubRoomType[] = [
  HubRoomType.SimpleTerminal,
  HubRoomType.ImprovedTerminal,
  HubRoomType.AdvancedTerminal,
];

/** Upgrade-only room types — never appear in build palette or room pools */
export const HUB_UPGRADE_ONLY_ROOMS: HubRoomType[] = [
  HubRoomType.ImprovedTerminal,
  HubRoomType.AdvancedTerminal,
];

/** Terminal upgrade path: from → to with cost */
export const SIMPLE_TERMINAL_UPGRADES: Array<{
  from: HubRoomType;
  to: HubRoomType;
  cost: number;
}> = [
  {
    from: HubRoomType.SimpleTerminal,
    to: HubRoomType.ImprovedTerminal,
    cost: 15000,
  },
  {
    from: HubRoomType.ImprovedTerminal,
    to: HubRoomType.AdvancedTerminal,
    cost: 35000,
  },
];
