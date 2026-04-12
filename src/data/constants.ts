import {
  ShipClass,
  type ShipTemplate,
  PlanetType,
  CargoType,
  GameSize,
  TechBranch,
  HyperlaneDensity,
  HubRoomType,
  type Technology,
  type HubRoomDefinition,
} from "./types";

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
  { keepRatio: number; maxConn: number }
> = {
  [HyperlaneDensity.Low]: { keepRatio: 0.45, maxConn: 3 },
  [HyperlaneDensity.Medium]: { keepRatio: 0.6, maxConn: 4 },
  [HyperlaneDensity.High]: { keepRatio: 0.75, maxConn: 5 },
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

// ── Game Size Presets ──────────────────────────────────────────

export interface GameSizeConfig {
  maxTurns: number;
  empireCount: number;
  systemsPerEmpireMin: number;
  systemsPerEmpireMax: number;
  planetsPerSystemMin: number;
  planetsPerSystemMax: number;
  aiCompanyCount: number;
  startingCash: number;
  startingShips: number;
  /** Map coordinate bounds scale factor (1.0 = base 2400×1600) */
  mapScale: number;
}

export const GAME_SIZE_CONFIGS: Record<GameSize, GameSizeConfig> = {
  [GameSize.Small]: {
    maxTurns: 60,
    empireCount: 8,
    systemsPerEmpireMin: 6,
    systemsPerEmpireMax: 8,
    planetsPerSystemMin: 1,
    planetsPerSystemMax: 3,
    aiCompanyCount: 4,
    startingCash: 250000,
    startingShips: 0,
    mapScale: 1.0,
  },
  [GameSize.Medium]: {
    maxTurns: 80,
    empireCount: 10,
    systemsPerEmpireMin: 7,
    systemsPerEmpireMax: 9,
    planetsPerSystemMin: 1,
    planetsPerSystemMax: 4,
    aiCompanyCount: 6,
    startingCash: 300000,
    startingShips: 0,
    mapScale: 1.3,
  },
  [GameSize.Large]: {
    maxTurns: 100,
    empireCount: 12,
    systemsPerEmpireMin: 8,
    systemsPerEmpireMax: 10,
    planetsPerSystemMin: 1,
    planetsPerSystemMax: 4,
    aiCompanyCount: 8,
    startingCash: 350000,
    startingShips: 0,
    mapScale: 1.6,
  },
};

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
};

export const PLANET_CARGO_PROFILES: Record<
  PlanetType,
  { produces: CargoType[]; demands: CargoType[] }
> = {
  [PlanetType.Terran]: {
    produces: [CargoType.Technology, CargoType.Luxury],
    demands: [CargoType.Food, CargoType.RawMaterials],
  },
  [PlanetType.Industrial]: {
    produces: [CargoType.Technology],
    demands: [CargoType.RawMaterials, CargoType.Food],
  },
  [PlanetType.Mining]: {
    produces: [CargoType.RawMaterials, CargoType.Hazmat],
    demands: [CargoType.Technology, CargoType.Food, CargoType.Medical],
  },
  [PlanetType.Agricultural]: {
    produces: [CargoType.Food],
    demands: [CargoType.Technology, CargoType.Luxury],
  },
  [PlanetType.HubStation]: {
    produces: [],
    demands: [
      CargoType.Food,
      CargoType.Technology,
      CargoType.Luxury,
      CargoType.Medical,
    ],
  },
  [PlanetType.Resort]: {
    produces: [CargoType.Luxury],
    demands: [CargoType.Food, CargoType.Medical],
  },
  [PlanetType.Research]: {
    produces: [CargoType.Medical, CargoType.Technology],
    demands: [CargoType.Food, CargoType.RawMaterials, CargoType.Luxury],
  },
};

export const PLANET_PASSENGER_VOLUME: Record<PlanetType, number> = {
  [PlanetType.Terran]: 80,
  [PlanetType.Industrial]: 50,
  [PlanetType.Mining]: 20,
  [PlanetType.Agricultural]: 20,
  [PlanetType.HubStation]: 100,
  [PlanetType.Resort]: 80,
  [PlanetType.Research]: 15,
};

export const BASE_CARGO_PRICES: Record<CargoType, number> = {
  [CargoType.Passengers]: 65,
  [CargoType.RawMaterials]: 18,
  [CargoType.Food]: 24,
  [CargoType.Technology]: 40,
  [CargoType.Luxury]: 50,
  [CargoType.Hazmat]: 46,
  [CargoType.Medical]: 50,
};

// ── Cargo diversity scoring bonus ──────────────────────────────

/** Bonus points per distinct cargo type delivered across all turns */
export const CARGO_DIVERSITY_BONUS = 2000;

// ── Tech Tree Data ─────────────────────────────────────────────

export const TECH_TREE: Technology[] = [
  // Branch 1: Logistics Network
  {
    id: "logistics_1",
    name: "Efficient Scheduling",
    branch: TechBranch.Logistics,
    tier: 1,
    rpCost: 8,
    description: "+1 route slot",
    effects: [{ type: "addRouteSlots", value: 1 }],
  },
  {
    id: "logistics_2",
    name: "Regional Hub Protocols",
    branch: TechBranch.Logistics,
    tier: 2,
    rpCost: 16,
    description: "+1 route slot, −10% license fees",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyLicenseFee", value: -0.1 },
    ],
  },
  {
    id: "logistics_3",
    name: "Galactic Freight Network",
    branch: TechBranch.Logistics,
    tier: 3,
    rpCost: 30,
    description: "+1 route slot, intra-empire routes get +1 trip/turn",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "addTripsPerTurn", value: 1 },
    ],
  },
  {
    id: "logistics_4",
    name: "Omnipresent Logistics",
    branch: TechBranch.Logistics,
    tier: 4,
    rpCost: 50,
    description: "+1 route slot, all routes get +10% revenue",
    effects: [
      { type: "addRouteSlots", value: 1 },
      { type: "modifyRevenue", value: 0.1 },
    ],
  },

  // Branch 2: Diplomacy & Trade
  {
    id: "diplomacy_1",
    name: "Cultural Exchange",
    branch: TechBranch.Diplomacy,
    tier: 1,
    rpCost: 8,
    description: "−20% tariffs on friendly empires",
    effects: [{ type: "modifyTariff", value: -0.2, target: "friendly" }],
  },
  {
    id: "diplomacy_2",
    name: "Trade Envoys",
    branch: TechBranch.Diplomacy,
    tier: 2,
    rpCost: 16,
    description: "Can run 2 cargo types per empire pair (up from 1)",
    effects: [{ type: "addCargoTypesPerPair", value: 1 }],
  },
  {
    id: "diplomacy_3",
    name: "Diplomatic Immunity",
    branch: TechBranch.Diplomacy,
    tier: 3,
    rpCost: 30,
    description:
      "−20% tariffs on neutral empires, immune to 1 embargo per game",
    effects: [
      { type: "modifyTariff", value: -0.2, target: "neutral" },
      { type: "addEmbargoImmunity", value: 1 },
    ],
  },
  {
    id: "diplomacy_4",
    name: "Galactic Trade Authority",
    branch: TechBranch.Diplomacy,
    tier: 4,
    rpCost: 50,
    description:
      "−20% tariffs on hostile empires, 2nd cargo type per pair for all empires",
    effects: [
      { type: "modifyTariff", value: -0.2, target: "hostile" },
      { type: "addCargoTypesPerPair", value: 1 },
    ],
  },

  // Branch 3: Fleet Engineering
  {
    id: "engineering_1",
    name: "Improved Maintenance",
    branch: TechBranch.Engineering,
    tier: 1,
    rpCost: 8,
    description: "−15% maintenance costs",
    effects: [{ type: "modifyMaintenance", value: -0.15 }],
  },
  {
    id: "engineering_2",
    name: "Fuel Injection Systems",
    branch: TechBranch.Engineering,
    tier: 2,
    rpCost: 16,
    description: "−15% fuel costs",
    effects: [{ type: "modifyFuel", value: -0.15 }],
  },
  {
    id: "engineering_3",
    name: "Hull Reinforcement",
    branch: TechBranch.Engineering,
    tier: 3,
    rpCost: 30,
    description: "Ship condition decays 30% slower",
    effects: [{ type: "modifyConditionDecay", value: -0.3 }],
  },
  {
    id: "engineering_4",
    name: "Autonomous Repair Drones",
    branch: TechBranch.Engineering,
    tier: 4,
    rpCost: 50,
    description:
      "Ships auto-repair +3 condition/turn (up to 80), overhaul cost −30%",
    effects: [
      { type: "addAutoRepair", value: 3 },
      { type: "modifyOverhaulCost", value: -0.3 },
    ],
  },

  // Branch 4: Market Intelligence
  {
    id: "intelligence_1",
    name: "Market Forecasting",
    branch: TechBranch.Intelligence,
    tier: 1,
    rpCost: 8,
    description: "Trend predictions shown 2 turns ahead in UI",
    effects: [{ type: "addMarketForecast", value: 2 }],
  },
  {
    id: "intelligence_2",
    name: "Supply Chain Analytics",
    branch: TechBranch.Intelligence,
    tier: 2,
    rpCost: 16,
    description:
      "Saturation shown numerically in route finder, +10% cargo prices",
    effects: [
      { type: "addSaturationDisplay", value: 1 },
      { type: "modifyRevenue", value: 0.1 },
    ],
  },
  {
    id: "intelligence_3",
    name: "Arbitrage Algorithms",
    branch: TechBranch.Intelligence,
    tier: 3,
    rpCost: 30,
    description: "Route finder shows true net profit, −20% saturation impact",
    effects: [{ type: "modifySaturation", value: -0.2 }],
  },
  {
    id: "intelligence_4",
    name: "Market Manipulation",
    branch: TechBranch.Intelligence,
    tier: 4,
    rpCost: 50,
    description: "Once per 5 turns: reset saturation on one planet to 0",
    effects: [{ type: "addMarketReset", value: 5 }],
  },

  // Branch 5: Crisis Management
  {
    id: "crisis_1",
    name: "Emergency Reserves",
    branch: TechBranch.Crisis,
    tier: 1,
    rpCost: 8,
    description: "Events that cost cash reduced by 25%",
    effects: [{ type: "modifyEventCash", value: -0.25 }],
  },
  {
    id: "crisis_2",
    name: "Crisis Response Teams",
    branch: TechBranch.Crisis,
    tier: 2,
    rpCost: 16,
    description: "Hazard events duration −1 turn (min 1)",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_3",
    name: "Political Connections",
    branch: TechBranch.Crisis,
    tier: 3,
    rpCost: 30,
    description:
      "Empire events duration −1 turn, 25% chance to avoid them entirely",
    effects: [{ type: "modifyEventDuration", value: -1 }],
  },
  {
    id: "crisis_4",
    name: "Galactic Insurance",
    branch: TechBranch.Crisis,
    tier: 4,
    rpCost: 50,
    description:
      "Grounded routes pay 50% mothball refund, breakdowns earn 50% revenue",
    effects: [
      { type: "addMothballRefund", value: 0.5 },
      { type: "addBreakdownRevenue", value: 0.5 },
    ],
  },
];

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
  [HubRoomType.FreightTerminal]: {
    type: HubRoomType.FreightTerminal,
    name: "Freight Terminal",
    description: "Adds 1 additional route slot empire-wide.",
    icon: "📦",
    buildCost: 20000,
    upkeepCost: 3000,
    limit: 1,
    techRequirement: "logistics_1",
    bonusScope: "empire",
    bonusEffects: [{ type: "addRouteSlots", value: 1 }],
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
  HubRoomType.TradeOffice,
  HubRoomType.PassengerLounge,
];

/** Room types that require tech and are randomized per run */
export const HUB_TECH_GATED_ROOMS: HubRoomType[] = [
  HubRoomType.FreightTerminal,
  HubRoomType.FuelDepot,
  HubRoomType.MarketExchange,
  HubRoomType.CustomsBureau,
  HubRoomType.RepairBay,
  HubRoomType.ResearchLab,
  HubRoomType.CargoWarehouse,
  HubRoomType.SecurityOffice,
];
