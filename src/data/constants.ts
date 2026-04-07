import {
  ShipClass,
  type ShipTemplate,
  PlanetType,
  CargoType,
  GameSize,
} from "./types";

export const STARTING_CASH = 200000;
export const MAX_TURNS = 20;
export const BASE_FUEL_PRICE = 10;
export const MAX_LOAN_AMOUNT = 500000;
export const LOAN_INTEREST_RATE_MIN = 0.05;
export const LOAN_INTEREST_RATE_MAX = 0.08;
export const SATURATION_DECAY_RATE = 0.15;
export const SATURATION_PRICE_IMPACT = 0.6;
export const CONDITION_DECAY_MIN = 2;
export const CONDITION_DECAY_MAX = 5;
export const OVERHAUL_COST_RATIO = 0.3;
export const OVERHAUL_RESTORE_CONDITION = 90;
export const BREAKDOWN_THRESHOLD = 50;
export const TURN_DURATION = 100;

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
    startingCash: 300000,
    startingShips: 2,
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
    startingCash: 350000,
    startingShips: 2,
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
    startingCash: 400000,
    startingShips: 3,
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
export const AI_BUY_THRESHOLD_MULTIPLIER = 2; // buy when cash > 2× cheapest ship
export const AI_MAX_ROUTES = 8; // cap routes to keep AI manageable

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
    fuelEfficiency: 1.8,
    baseReliability: 85,
    purchaseCost: 80000,
    baseMaintenance: 5000,
  },
  [ShipClass.BulkFreighter]: {
    class: ShipClass.BulkFreighter,
    name: "Bulk Freighter",
    cargoCapacity: 300,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 0.6,
    baseReliability: 94,
    purchaseCost: 150000,
    baseMaintenance: 6000,
  },
  [ShipClass.StarLiner]: {
    class: ShipClass.StarLiner,
    name: "Star Liner",
    cargoCapacity: 0,
    passengerCapacity: 200,
    speed: 6,
    fuelEfficiency: 1.4,
    baseReliability: 88,
    purchaseCost: 250000,
    baseMaintenance: 10000,
  },
  [ShipClass.MegaHauler]: {
    class: ShipClass.MegaHauler,
    name: "Mega Hauler",
    cargoCapacity: 800,
    passengerCapacity: 0,
    speed: 2,
    fuelEfficiency: 0.5,
    baseReliability: 90,
    purchaseCost: 500000,
    baseMaintenance: 15000,
  },
  [ShipClass.LuxuryLiner]: {
    class: ShipClass.LuxuryLiner,
    name: "Luxury Liner",
    cargoCapacity: 20,
    passengerCapacity: 150,
    speed: 7,
    fuelEfficiency: 1.6,
    baseReliability: 86,
    purchaseCost: 600000,
    baseMaintenance: 20000,
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
  [CargoType.Passengers]: 50,
  [CargoType.RawMaterials]: 15,
  [CargoType.Food]: 20,
  [CargoType.Technology]: 45,
  [CargoType.Luxury]: 60,
  [CargoType.Hazmat]: 35,
  [CargoType.Medical]: 55,
};
