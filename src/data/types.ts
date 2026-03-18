export type GamePhase = "planning" | "simulation" | "review";
export type Trend = "rising" | "stable" | "falling";

export const CargoType = {
  Passengers: "passengers",
  RawMaterials: "rawMaterials",
  Food: "food",
  Technology: "technology",
  Luxury: "luxury",
  Hazmat: "hazmat",
  Medical: "medical",
} as const;
export type CargoType = (typeof CargoType)[keyof typeof CargoType];

export const PlanetType = {
  Terran: "terran",
  Industrial: "industrial",
  Mining: "mining",
  Agricultural: "agricultural",
  HubStation: "hubStation",
  Resort: "resort",
  Research: "research",
} as const;
export type PlanetType = (typeof PlanetType)[keyof typeof PlanetType];

export const ShipClass = {
  CargoShuttle: "cargoShuttle",
  PassengerShuttle: "passengerShuttle",
  MixedHauler: "mixedHauler",
  FastCourier: "fastCourier",
  BulkFreighter: "bulkFreighter",
  StarLiner: "starLiner",
  MegaHauler: "megaHauler",
  LuxuryLiner: "luxuryLiner",
} as const;
export type ShipClass = (typeof ShipClass)[keyof typeof ShipClass];

export const EventCategory = {
  Market: "market",
  Hazard: "hazard",
  Opportunity: "opportunity",
  Flavor: "flavor",
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
}

export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  x: number;
  y: number;
  starColor: number;
}

export interface Planet {
  id: string;
  name: string;
  systemId: string;
  type: PlanetType;
  x: number;
  y: number;
  population: number;
}

export interface CargoMarketEntry {
  baseSupply: number;
  baseDemand: number;
  currentPrice: number;
  saturation: number;
  trend: Trend;
  trendMomentum: number;
  eventModifier: number;
}

export type PlanetMarket = Record<CargoType, CargoMarketEntry>;

export interface MarketState {
  fuelPrice: number;
  fuelTrend: Trend;
  planetMarkets: Record<string, PlanetMarket>;
}

export interface ShipTemplate {
  class: ShipClass;
  name: string;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  baseReliability: number;
  purchaseCost: number;
  baseMaintenance: number;
}

export interface Ship {
  id: string;
  name: string;
  class: ShipClass;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  reliability: number;
  age: number;
  condition: number;
  purchaseCost: number;
  maintenanceCost: number;
  assignedRouteId: string | null;
}

export interface ActiveRoute {
  id: string;
  originPlanetId: string;
  destinationPlanetId: string;
  distance: number;
  assignedShipIds: string[];
  cargoType: CargoType | null;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  duration: number;
  effects: EventEffect[];
  requiresChoice?: boolean;
  choices?: EventChoice[];
}

export interface EventEffect {
  type:
    | "modifyPrice"
    | "blockRoute"
    | "modifySpeed"
    | "modifyDemand"
    | "modifyCash"
    | "modifyReputation"
    | "blockPassengers";
  targetId?: string;
  cargoType?: CargoType;
  value: number;
}

export interface EventChoice {
  label: string;
  effects: EventEffect[];
}

export interface Loan {
  id: string;
  principal: number;
  interestRate: number;
  remainingBalance: number;
  turnTaken: number;
}

export interface TurnResult {
  turn: number;
  revenue: number;
  fuelCosts: number;
  maintenanceCosts: number;
  loanPayments: number;
  otherCosts: number;
  netProfit: number;
  cashAtEnd: number;
  cargoDelivered: Record<CargoType, number>;
  passengersTransported: number;
  eventsOccurred: string[];
  routePerformance: RoutePerformance[];
}

export interface RoutePerformance {
  routeId: string;
  trips: number;
  revenue: number;
  fuelCost: number;
  cargoMoved: number;
  passengersMoved: number;
  breakdowns: number;
}

export interface StorytellerState {
  playerHealthScore: number;
  headwindBias: number;
  turnsInDebt: number;
  consecutiveProfitTurns: number;
}

export interface GameState {
  seed: number;
  turn: number;
  maxTurns: number;
  phase: GamePhase;
  cash: number;
  loans: Loan[];
  reputation: number;
  companyName: string;
  galaxy: {
    sectors: Sector[];
    systems: StarSystem[];
    planets: Planet[];
  };
  fleet: Ship[];
  activeRoutes: ActiveRoute[];
  market: MarketState;
  activeEvents: GameEvent[];
  history: TurnResult[];
  storyteller: StorytellerState;
  score: number;
  gameOver: boolean;
  gameOverReason: string | null;
}
