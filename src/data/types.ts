export type GamePhase = "planning" | "simulation" | "review";

// ── Action Points ──────────────────────────────────────────────
export interface ActionPoints {
  current: number;
  max: number;
}

// ── Captain types ──────────────────────────────────────────────
export type CaptainTrait =
  | "Cautious"
  | "Reckless"
  | "Opportunist"
  | "Loyal"
  | "Mercenary";

export interface Captain {
  id: string;
  shipId: string;
  name: string;
  trait: CaptainTrait;
  veteranTurns: number;
  /** Turn of the last captain event for this captain */
  lastEventTurn: number;
}

// ── Route Market types ─────────────────────────────────────────
export type RouteRiskTag =
  | "pirate_activity"
  | "war_zone"
  | "embargo_risk"
  | "high_saturation"
  | "volatile_market"
  | "long_distance"
  | "low_competition"
  | "passenger_route";

export interface RouteMarketEntry {
  id: string;
  originPlanetId: string;
  destinationPlanetId: string;
  cargoType: CargoType;
  /** Estimated profit range shown before scouting */
  estimatedProfitMin: number;
  estimatedProfitMax: number;
  /** Exact profit revealed only after scouting */
  exactProfitPerTurn: number | null;
  riskTags: RouteRiskTag[];
  scouted: boolean;
  expiresOnTurn: number;
  /** AI company id if claimed, null if unclaimed */
  claimedByAiId: string | null;
}

// ── Choice Event types ─────────────────────────────────────────
export interface ChoiceOption {
  id: string;
  label: string;
  outcomeDescription: string;
  effects: EventEffect[];
  requiresAp?: number;
  requiresReputation?: number;
  requiresCash?: number;
}

export interface ChoiceEvent {
  id: string;
  eventId: string;
  prompt: string;
  options: ChoiceOption[];
  /** For chained events — the chain identifier */
  chainId?: string;
  /** Position in the chain (0-based) */
  chainStep?: number;
  turnCreated: number;
}

// ── Event Chain types ──────────────────────────────────────────
export type EventChainId =
  | "pirate_campaign"
  | "diplomatic_crisis"
  | "plague"
  | "fuel_crisis"
  | "black_market_scandal"
  | "empire_succession";

export interface EventChainState {
  chainId: EventChainId;
  currentStep: number;
  totalSteps: number;
  startTurn: number;
  data: Record<string, string | number | boolean>;
}

// ── Turn Brief types ───────────────────────────────────────────
export type TurnBriefCategory =
  | "choice_event"
  | "contract"
  | "research"
  | "captain"
  | "warning"
  | "opportunity";

export type TurnBriefUrgency = "critical" | "high" | "medium" | "low";

export interface TurnBriefCard {
  id: string;
  category: TurnBriefCategory;
  urgency: TurnBriefUrgency;
  title: string;
  summary: string;
  action: "resolve" | "dismiss";
  /** Reference id for the linked entity (event id, contract id, etc.) */
  linkedId?: string;
}

// ── Research Event types ───────────────────────────────────────
export interface ResearchEvent {
  id: string;
  techId: string;
  prompt: string;
  options: ChoiceOption[];
  turnCreated: number;
}

// ── Nav Tab types ──────────────────────────────────────────────
export type NavTabId =
  | "map"
  | "routes"
  | "fleet"
  | "contracts"
  | "market"
  | "research"
  | "finance"
  | "empires"
  | "rivals"
  | "hub";

// ── Reputation Tier ────────────────────────────────────────────
export type ReputationTier =
  | "notorious"   // < 25
  | "unknown"     // 25–49
  | "respected"   // 50–74
  | "renowned"    // 75–89
  | "legendary";  // 90+
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

/** @deprecated Use GamePreset from constants.ts instead */
export type GameSize = "quick" | "standard" | "epic";

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

export const DiplomaticStatus = {
  War: "war",
  ColdWar: "coldWar",
  Peace: "peace",
  TradePact: "tradePact",
  Alliance: "alliance",
} as const;
export type DiplomaticStatus =
  (typeof DiplomaticStatus)[keyof typeof DiplomaticStatus];

export const BorderPortStatus = {
  Open: "open",
  Closed: "closed",
  Restricted: "restricted",
} as const;
export type BorderPortStatus =
  (typeof BorderPortStatus)[keyof typeof BorderPortStatus];

export const HyperlaneDensity = {
  Low: "low",
  Medium: "medium",
  High: "high",
} as const;
export type HyperlaneDensity =
  (typeof HyperlaneDensity)[keyof typeof HyperlaneDensity];

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

// ── Hub Station types ──────────────────────────────────────

export const HubRoomType = {
  SimpleTerminal: "simpleTerminal",
  ImprovedTerminal: "improvedTerminal",
  AdvancedTerminal: "advancedTerminal",
  TradeOffice: "tradeOffice",
  PassengerLounge: "passengerLounge",
  OreProcessing: "oreProcessing",
  FoodTerminal: "foodTerminal",
  TechTerminal: "techTerminal",
  LuxuryTerminal: "luxuryTerminal",
  HazmatTerminal: "hazmatTerminal",
  MedicalTerminal: "medicalTerminal",
  FuelDepot: "fuelDepot",
  MarketExchange: "marketExchange",
  CustomsBureau: "customsBureau",
  RepairBay: "repairBay",
  ResearchLab: "researchLab",
  CargoWarehouse: "cargoWarehouse",
  SecurityOffice: "securityOffice",
} as const;
export type HubRoomType = (typeof HubRoomType)[keyof typeof HubRoomType];

export type HubBonusScope = "empire" | "local" | "localRadius";

export interface HubBonusEffect {
  type:
    | "modifyLicenseFee"
    | "modifyPassengerRevenue"
    | "addRouteSlots"
    | "modifyFuel"
    | "modifyRevenue"
    | "modifyTariff"
    | "addRepairPerTurn"
    | "addRPPerTurn"
    | "modifySaturation"
    | "modifyAIRevenue"
    | "modifyAIMaintenance";
  value: number;
}

export interface HubRoomDefinition {
  type: HubRoomType;
  name: string;
  description: string;
  icon: string;
  buildCost: number;
  upkeepCost: number;
  limit: number;
  techRequirement: string | null;
  bonusScope: HubBonusScope;
  bonusEffects: HubBonusEffect[];
}

export interface HubRoom {
  id: string;
  type: HubRoomType;
  gridX: number;
  gridY: number;
}

export interface StationHub {
  level: number;
  rooms: HubRoom[];
  systemId: string;
  empireId: string;
  availableRoomTypes: HubRoomType[];
}

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
  /** Captain assigned to this ship, if any */
  captainId?: string;
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
    | "modifyTariff"
    | "closeBorders"
    | "openBorders"
    | "declareWar"
    | "signPeace"
    | "formAlliance"
    | "formTradePact"
    | "degradeRelation";
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
  /** Turns since the player last made a meaningful decision (choice event) */
  turnsSinceLastDecision: number;
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

// ── AI Hub State ───────────────────────────────────────────

export interface AIHubState {
  tier: number; // 0–3
  bonusRevenueMultiplier: number; // e.g. 1.05 at tier 1
  bonusFuelMultiplier: number; // e.g. 0.95 at tier 1
  bonusMaintenanceMultiplier: number; // e.g. 0.97
  lastUpgradeTurn: number;
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
  /** AI tech research state (Wave 3) */
  techState?: TechState;
  /** AI abstract hub state (Wave 3) */
  aiHub?: AIHubState;
  /** Number of contracts this AI has completed (Wave 3) */
  contractsCompleted?: number;
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
  /** AI company id that accepted this contract (Wave 3) */
  aiCompanyId?: string;
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

// ── Hyperlane types ────────────────────────────────────────

export interface Hyperlane {
  id: string;
  systemA: string;
  systemB: string;
  distance: number;
}

export interface BorderPort {
  id: string;
  empireId: string;
  hyperlaneId: string;
  systemId: string;
  status: BorderPortStatus;
}

export interface DiplomaticRelation {
  empireA: string;
  empireB: string;
  status: DiplomaticStatus;
  turnsInCurrentStatus: number;
}

export interface DiplomaticIncident {
  turn: number;
  description: string;
  empireA: string;
  empireB: string;
}

export interface HyperlanePath {
  segments: Hyperlane[];
  totalDistance: number;
  systems: string[];
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
  /** Separate pool of local (intra-system) route slots — starts at 2 */
  localRouteSlots: number;
  unlockedEmpireIds: string[];
  contracts: Contract[];
  tech: TechState;
  empireTradePolicies: Record<string, EmpireTradePolicyEntry>;
  interEmpireCargoLocks: InterEmpireCargoLock[];

  // Phase 4: Hyperlane & Diplomacy
  hyperlanes?: Hyperlane[];
  borderPorts?: BorderPort[];
  diplomaticRelations?: DiplomaticRelation[];
  hyperlaneDensity?: HyperlaneDensity;

  // Phase 5: Hub Station
  stationHub: StationHub | null;

  // Phase 6: Interaction Overhaul
  /** Save file version — used to detect incompatible saves */
  saveVersion: number;
  /** Action points for the current turn */
  actionPoints: ActionPoints;
  /** Cards shown in the turn brief panel at planning phase start */
  turnBrief: TurnBriefCard[];
  /** Pending choice events awaiting player decision */
  pendingChoiceEvents: ChoiceEvent[];
  /** Active event chains */
  activeEventChains: EventChainState[];
  /** Captain roster — one per ship */
  captains: Captain[];
  /** Curated route market entries for the current turn */
  routeMarket: RouteMarketEntry[];
  /** Active research events awaiting player decision */
  researchEvents: ResearchEvent[];
  /** Which nav tabs have been unlocked (progressive reveal) */
  unlockedNavTabs: NavTabId[];
  /** Derived reputation tier */
  reputationTier: ReputationTier;
}
