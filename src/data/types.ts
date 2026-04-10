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
  Empire: "empire",
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const GameSize = {
  Small: "small",
  Medium: "medium",
  Large: "large",
} as const;
export type GameSize = (typeof GameSize)[keyof typeof GameSize];

export const GalaxyShape = {
  Spiral: "spiral",
  Elliptical: "elliptical",
  Ring: "ring",
  Irregular: "irregular",
} as const;
export type GalaxyShape = (typeof GalaxyShape)[keyof typeof GalaxyShape];

export const EmpireDisposition = {
  Friendly: "friendly",
  Neutral: "neutral",
  Hostile: "hostile",
} as const;
export type EmpireDisposition =
  (typeof EmpireDisposition)[keyof typeof EmpireDisposition];

export const AIPersonality = {
  AggressiveExpander: "aggressiveExpander",
  SteadyHauler: "steadyHauler",
  CherryPicker: "cherryPicker",
} as const;
export type AIPersonality = (typeof AIPersonality)[keyof typeof AIPersonality];

export const ContractType = {
  EmpireUnlock: "empireUnlock",
  PassengerFerry: "passengerFerry",
  EmergencySupply: "emergencySupply",
  TradeAlliance: "tradeAlliance",
  ResearchCourier: "researchCourier",
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const ContractStatus = {
  Available: "available",
  Active: "active",
  Completed: "completed",
  Failed: "failed",
  Expired: "expired",
} as const;
export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const TradePolicyType = {
  OpenTrade: "openTrade",
  ImportBan: "importBan",
  ExportBan: "exportBan",
  Protectionist: "protectionist",
} as const;
export type TradePolicyType =
  (typeof TradePolicyType)[keyof typeof TradePolicyType];

export const TechBranch = {
  Logistics: "logistics",
  Diplomacy: "diplomacy",
  Engineering: "engineering",
  Intelligence: "intelligence",
  Crisis: "crisis",
} as const;
export type TechBranch = (typeof TechBranch)[keyof typeof TechBranch];

export interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
}

export interface Empire {
  id: string;
  name: string;
  color: number;
  tariffRate: number;
  disposition: EmpireDisposition;
  homeSystemId: string;
  leaderName: string;
  leaderPortrait: CharacterPortrait;
}

export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  empireId: string;
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
    | "blockPassengers"
    | "groundEmpireRoutes"
    | "blockImport"
    | "removeBans"
    | "modifyTariff";
  targetId?: string;
  cargoType?: CargoType;
  value: number;
  empireId?: string;
  empireId2?: string;
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
  tariffCosts: number;
  otherCosts: number;
  netProfit: number;
  cashAtEnd: number;
  cargoDelivered: Record<CargoType, number>;
  passengersTransported: number;
  eventsOccurred: string[];
  routePerformance: RoutePerformance[];
  aiSummaries: AITurnSummary[];
}

export interface AITurnSummary {
  companyId: string;
  companyName: string;
  revenue: number;
  netProfit: number;
  cashAtEnd: number;
  routeCount: number;
  fleetSize: number;
  bankrupt: boolean;
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

// ── Adviser types ──────────────────────────────────────────

export type AdviserMood = "standby" | "analyzing" | "alert" | "success";

export type AdviserMessageContext =
  | "tutorial"
  | "tip"
  | "commentary"
  | "event"
  | "warning"
  | "reveal";

export interface AdviserMessage {
  id: string;
  text: string;
  mood: AdviserMood;
  priority: 1 | 2 | 3;
  context: AdviserMessageContext;
  turnGenerated: number;
}

export type TutorialTrigger =
  | "newGame"
  | "firstRoute"
  | "firstShip"
  | "firstTurnEnd"
  | "firstSimulation"
  | "firstReport"
  | "firstProfit"
  | "firstLoss"
  | "firstContract"
  | "firstResearch"
  | "firstEmpireUnlock"
  | "complete";

export interface AdviserState {
  tutorialStepIndex: number;
  tutorialComplete: boolean;
  tutorialSkipped: boolean;
  pendingMessages: AdviserMessage[];
  shownMessageIds: string[];
  secretRevealed: boolean;
  statsAdviserSaved: number;
  statsAdviserHindered: number;
}

export interface AICompany {
  id: string;
  name: string;
  empireId: string;
  cash: number;
  fleet: Ship[];
  activeRoutes: ActiveRoute[];
  reputation: number;
  totalCargoDelivered: number;
  personality: AIPersonality;
  bankrupt: boolean;
  /** Turn number when this company went bankrupt (undefined if still active) */
  bankruptTurn?: number;
  /** Generation counter — 0 for original companies, incremented for replacements */
  generation?: number;
  ceoName: string;
  ceoPortrait: CharacterPortrait;
}

// ── Contract types ─────────────────────────────────────────

export interface Contract {
  id: string;
  type: ContractType;
  targetEmpireId: string | null;
  originPlanetId: string;
  destinationPlanetId: string;
  cargoType: CargoType;
  durationTurns: number;
  turnsRemaining: number;
  rewardCash: number;
  rewardReputation: number;
  rewardResearchPoints: number;
  rewardTariffReduction: {
    empireA: string;
    empireB: string;
    reduction: number;
  } | null;
  depositPaid: number;
  status: ContractStatus;
  linkedRouteId: string | null;
  turnsWithoutShip: number;
}

// ── Empire trade policy types ──────────────────────────────

export interface EmpireTradePolicyEntry {
  policy: TradePolicyType;
  bannedImports: CargoType[];
  bannedExports: CargoType[];
  tariffSurcharge: number;
}

export interface InterEmpireCargoLock {
  originEmpireId: string;
  destinationEmpireId: string;
  cargoType: CargoType;
  routeId: string;
}

// ── Tech tree types ────────────────────────────────────────

export interface TechEffect {
  type:
    | "addRouteSlots"
    | "modifyLicenseFee"
    | "modifyTariff"
    | "modifyMaintenance"
    | "modifyFuel"
    | "modifyConditionDecay"
    | "modifyRevenue"
    | "addTripsPerTurn"
    | "addCargoTypesPerPair"
    | "modifySaturation"
    | "modifyEventDuration"
    | "modifyEventCash"
    | "addAutoRepair"
    | "modifyOverhaulCost"
    | "addEmbargoImmunity"
    | "addMothballRefund"
    | "addBreakdownRevenue"
    | "addMarketForecast"
    | "addSaturationDisplay"
    | "addMarketReset";
  value: number;
  target?: "friendly" | "neutral" | "hostile" | "all";
}

export interface Technology {
  id: string;
  name: string;
  branch: TechBranch;
  tier: 1 | 2 | 3 | 4;
  rpCost: number;
  description: string;
  effects: TechEffect[];
}

export interface TechState {
  researchPoints: number;
  completedTechIds: string[];
  currentResearchId: string | null;
  researchProgress: number;
}

// ── Character / Portrait types ─────────────────────────────

export const PortraitCategory = {
  Human: "human",
  Alien: "alien",
  Cyborg: "cyborg",
} as const;
export type PortraitCategory =
  (typeof PortraitCategory)[keyof typeof PortraitCategory];

export const CEOTrait = {
  Aggressive: "aggressive",
  Diplomatic: "diplomatic",
  Cunning: "cunning",
  Visionary: "visionary",
  Ruthless: "ruthless",
  Cautious: "cautious",
  Charismatic: "charismatic",
  Eccentric: "eccentric",
  Stoic: "stoic",
  Resourceful: "resourceful",
} as const;
export type CEOTrait = (typeof CEOTrait)[keyof typeof CEOTrait];

export const CEOBackground = {
  Military: "military",
  Merchant: "merchant",
  Scientist: "scientist",
  Pirate: "pirate",
  Noble: "noble",
  Explorer: "explorer",
  Engineer: "engineer",
  Diplomat: "diplomat",
  Smuggler: "smuggler",
  ColonyFounder: "colonyFounder",
} as const;
export type CEOBackground = (typeof CEOBackground)[keyof typeof CEOBackground];

export interface CharacterPortrait {
  portraitId: string;
  category: PortraitCategory;
}

export interface GameState {
  seed: number;
  turn: number;
  maxTurns: number;
  phase: GamePhase;
  gameSize: GameSize;
  galaxyShape: GalaxyShape;
  cash: number;
  loans: Loan[];
  reputation: number;
  companyName: string;
  ceoName: string;
  ceoPortrait: CharacterPortrait;
  playerEmpireId: string;
  galaxy: {
    sectors: Sector[];
    empires: Empire[];
    systems: StarSystem[];
    planets: Planet[];
  };
  fleet: Ship[];
  activeRoutes: ActiveRoute[];
  market: MarketState;
  aiCompanies: AICompany[];
  activeEvents: GameEvent[];
  history: TurnResult[];
  storyteller: StorytellerState;
  adviser: AdviserState;
  score: number;
  gameOver: boolean;
  gameOverReason: string | null;

  // Phase 3: Strategic Depth
  routeSlots: number;
  unlockedEmpireIds: string[];
  contracts: Contract[];
  tech: TechState;
  empireTradePolicies: Record<string, EmpireTradePolicyEntry>;
  interEmpireCargoLocks: InterEmpireCargoLock[];
}
