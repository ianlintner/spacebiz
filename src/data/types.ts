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
/**
 * State inputs that scale a dilemma option's success%. Each option declares
 * which inputs apply; SuccessFormula sums their contributions on top of
 * `baseSuccess` to produce a final success% in [10, 100].
 */
export type OptionScalingTag =
  | "fleetCondition"
  | "fleetSize"
  | "tech"
  | "rep"
  | "cash";

export interface ChoiceOption {
  id: string;
  label: string;
  outcomeDescription: string;
  effects: EventEffect[];
  requiresAp?: number;
  requiresReputation?: number;
  requiresCash?: number;
  /**
   * Dilemma-only fields. When present, this option behaves as a dilemma branch:
   * effect magnitudes are scaled by `successPercent / 100` at resolve-time, and
   * the UI surfaces the scaling chips/contribution breakdown.
   */
  baseSuccess?: number;
  scalingTags?: OptionScalingTag[];
  /** Tech ids that, if researched, contribute extra success% on top of the "tech" tag. */
  scalingTechIds?: string[];
  /** Computed at fire-time and frozen on the ChoiceEvent (see ChoiceEvent.optionSuccess). */
}

// ── Dilemma template (authoring-side) ─────────────────────────
export type DilemmaCategory =
  | "diplomatic"
  | "operational"
  | "financial"
  | "narrative"
  | "opportunity";

export interface DilemmaTemplate {
  id: string;
  category: DilemmaCategory;
  prompt: string;
  options: ChoiceOption[];
  /** Selection weighting */
  weight: number;
  headwindWeight: number;
  tailwindWeight: number;
  /** Optional eligibility predicate evaluated against GameState; defaults to always-eligible. */
  eligibility?: "anyTime" | "midGame" | "lateGame";
  /**
   * Pre-generated banner illustration key, loaded by BootScene from
   * `public/dilemmas/<imageKey>.png`. When undefined, the DilemmaScene
   * renders a category-tinted placeholder instead.
   */
  imageKey?: string;
}

// ── AI narrative event (no choice — pure buff/debuff text) ────
export interface AINarrativeEffect {
  /** Affects AI cash directly when applied. */
  cashDelta?: number;
  /** Multiplier applied to AI revenue this turn (1 = no change). Stored on AICompany.activeNarrativeEffects and consumed by the AI route step. */
  revenueMultiplier?: number;
  /** Multiplier applied to AI maintenance costs this turn. */
  maintenanceMultiplier?: number;
  /** Reputation delta applied immediately. */
  reputationDelta?: number;
  /** Number of turns the multiplier effects persist (cashDelta and reputationDelta apply once on fire). */
  duration: number;
}

export interface AINarrativeTemplate {
  id: string;
  /** Headline for the news digest, with {company} and {empire} tokens substituted at fire-time. */
  headline: string;
  /** Short tooltip describing the mechanical effect. */
  tooltip: string;
  effect: AINarrativeEffect;
  /** "boon" → favorable for the AI (used to buff trailing AI), "bane" → unfavorable. */
  flavor: "boon" | "bane";
  weight: number;
}

/** Active narrative effect attached to an AICompany, ticks down each turn. */
export interface ActiveAINarrativeEffect extends AINarrativeEffect {
  templateId: string;
  headline: string;
  remainingTurns: number;
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
  /**
   * Dilemma-only: success% per option, frozen at fire-time. Keys are option ids.
   * When present, the resolver scales effect magnitudes by these values.
   */
  optionSuccess?: Record<string, number>;
  /** Source dilemma template id, if generated from a DilemmaTemplate. */
  dilemmaId?: string;
  /** Dilemma category, surfaced for UI grouping/iconography. */
  category?: DilemmaCategory;
  /** Banner image key (matches a Phaser texture key loaded in BootScene). */
  imageKey?: string;
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
  | "notorious" // < 25
  | "unknown" // 25–49
  | "respected" // 50–74
  | "renowned" // 75–89
  | "legendary"; // 90+
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

/**
 * Three-tier route scope. Determines which slot pool a route consumes and which
 * per-cargo demand multiplier applies to its revenue.
 *
 * - `system`   — origin and destination share a star system (intra-system).
 * - `empire`   — different systems, same empire (intra-empire interstellar).
 * - `galactic` — origin and destination empires differ (inter-empire trade).
 */
export const RouteScope = {
  System: "system",
  Empire: "empire",
  Galactic: "galactic",
} as const;
export type RouteScope = (typeof RouteScope)[keyof typeof RouteScope];

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
  Tug: "tug",
  RefrigeratedHauler: "refrigeratedHauler",
  ArmoredFreighter: "armoredFreighter",
  DiplomaticYacht: "diplomaticYacht",
  ColonyShip: "colonyShip",
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

/**
 * An empire's stance toward foreign trade — drives default pool sizes,
 * how many slots open per turn, and how often turmoil events trigger
 * auctions. Distinct from `EmpireDisposition`, which tracks personality.
 */
export type EmpirePolicyStance = "isolationist" | "regulated" | "open";

/**
 * Pool of route charters an empire offers. Domestic = routes wholly within
 * the empire; foreign = routes that cross the empire's border. `*Total` is
 * the absolute capacity; `*Open` is the count currently available for grant
 * (decremented when leased, incremented on forfeiture).
 */
export interface EmpireRouteSlotPool {
  domesticTotal: number;
  foreignTotal: number;
  domesticOpen: number;
  foreignOpen: number;
  policyStance: EmpirePolicyStance;
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
  /**
   * Route charter pool offered by this empire. Optional for backwards
   * compatibility with v6 saves and existing empire fixtures — callers
   * should treat `undefined` as a default pool derived from disposition.
   */
  routeSlotPool?: EmpireRouteSlotPool;
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
  // 3D orbital params (system-local coordinates). Optional so existing test
  // fixtures and pre-3D save files keep working; runtime planets generated
  // by GalaxyGenerator always populate these. Read via getOrbitalParams() in
  // src/game/system/OrbitalMechanics.ts to get safe defaults.
  orbitRadius?: number;
  orbitPeriodQuarters?: number;
  orbitPhase?: number;
  orbitInclination?: number;
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
  /**
   * If true, the route is paused: the simulator skips revenue and fuel for
   * this route while the slot and license fee remain. Players resume from the
   * Edit Route panel. Default falsy (active) for backwards compatibility with
   * older saves.
   */
  paused?: boolean;
  /**
   * The charter underwriting this route. Optional for backwards compatibility
   * with v6 saves and pre-charter routes; new routes (post-Phase 2) will
   * always have a charter id.
   */
  charterId?: string;
}

/**
 * Term of a charter. Permanent charters carry recurring per-turn upkeep and
 * are the reward for trust-building (contract grants, starter charters).
 * Fixed-term charters carry no upkeep but expire on a specific turn — they
 * are the reward for opportunism (turmoil-event auctions).
 */
export type CharterTerm =
  | { kind: "permanent"; upkeepPerTurn: number }
  | { kind: "fixedTerm"; expiresOnTurn: number };

/**
 * A bid submitted into an open charter auction. Cash is escrowed at submit
 * time; losing bids are refunded when the auction resolves.
 */
export interface CharterBid {
  bidderId: string;
  amount: number;
  /** True for AI-generated bids; helps the UI flag visible competition. */
  ai: boolean;
}

/**
 * A turmoil-event-spawned auction for one charter slot. Players + AI submit
 * sealed bids during the planning phase of `startedTurn`; the auction
 * resolves at the end of that turn (or after `durationTurns` if multi-turn).
 * Highest bid wins; ties broken by per-empire reputation.
 */
export interface CharterAuction {
  id: string;
  empireId: string;
  pool: "domestic" | "foreign";
  startedTurn: number;
  durationTurns: number;
  termTurns: number;
  bids: CharterBid[];
  status: "open" | "resolved" | "cancelled";
  /** Set when status === "resolved". */
  winnerId?: string;
  /** The narrative trigger — useful for UI copy. */
  triggerReason?: string;
}

/**
 * A lease on one slot from an empire's route slot pool. A holder must own
 * a matching charter (empire + pool) to operate a route through that empire.
 * Forfeited charters return their slot to the empire pool and forfeit any
 * `ActiveRoute` linked via `charterId`.
 */
export interface Charter {
  id: string;
  empireId: string;
  pool: "domestic" | "foreign";
  /** Player company id ("player") or `AICompany.id`. */
  holderId: string;
  grantedTurn: number;
  term: CharterTerm;
  /** Set when granted via contract reward. */
  sourceContractId?: string;
  /** Set when won at a turmoil-event auction. */
  sourceAuctionId?: string;
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
  surface?: "modal" | "digest";
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
  /** Storyteller-fired narrative beat for this AI this turn, if any. Surfaced through News Digest / Rival Snapshot panels. */
  narrativeBeat?: {
    templateId: string;
    headline: string;
    tooltip: string;
    flavor: "boon" | "bane";
  };
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
  /**
   * Turns since the storyteller last fired a dilemma at the player.
   * Optional for backward-compatibility with saves and older test fixtures —
   * consumers default to a high value (no recent dilemma) when missing.
   */
  turnsSinceLastDilemma?: number;
  /**
   * Decaying sum of recent effect magnitudes — high values suppress new
   * dilemmas ("no piling on"). Optional with default 0.
   */
  recentIntensity?: number;
  /**
   * Pacing mode. v1 ships only "steady"; future variants are described purely
   * by their curve shape ("breather" = longer downtime, "variance" = wider
   * magnitude spread).
   */
  mode?: "steady" | "breather" | "variance";
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
  /** Active storyteller-fired narrative effects (buffs/debuffs) ticking down each turn. */
  activeNarrativeEffects?: ActiveAINarrativeEffect[];
  /** Charters held by this AI company. Optional for v6-save compat. */
  charters?: Charter[];
}

// ── Contract types ─────────────────────────────────────────

/**
 * Permanent slot-pool bonus granted on contract completion. Each contract type
 * targets at most one scope; see ContractGenerator.makeXxx for which type
 * grants which scope. Stored as part of the contract so the reward is visible
 * to the player at acceptance time, not surprise-applied at completion.
 */
export interface ContractSlotReward {
  scope: RouteScope;
  amount: number;
}

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
  /**
   * Optional slot-pool bonus paid out on completion. Empire-unlock and
   * trade-alliance contracts grow the galactic pool; passenger-ferry grows the
   * empire pool. Older saves (v6) without this field treat it as null.
   *
   * @deprecated Phase 2/3: superseded by `rewardCharter`. Existing contracts
   * still grant slot bonuses on completion until the legacy player-side slot
   * fields are removed.
   */
  rewardSlotBonus?: ContractSlotReward | null;
  /**
   * Permanent charter granted on completion. The charter is held by whoever
   * accepted the contract (player or `aiCompanyId`). Term is always permanent
   * with upkeep computed from the empire and pool at grant time.
   */
  rewardCharter?: {
    empireId: string;
    pool: "domestic" | "foreign";
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

// ────────────────────────────── Diplomacy ──────────────────────────────────

export type StandingTag =
  | { kind: "OweFavor"; expiresOnTurn: number }
  | { kind: "RecentlyGifted"; expiresOnTurn: number }
  | {
      kind: "SuspectedSpy";
      suspectId: "player" | string;
      expiresOnTurn: number;
    }
  | {
      kind: "NonCompete";
      protectedEmpireIds: readonly string[];
      expiresOnTurn: number;
    }
  | {
      kind: "LeakedIntel";
      lens: "cash" | "topContractByValue" | "topEmpireStanding";
      value: string;
      expiresOnTurn: number;
    };

export type AmbassadorPersonality =
  | "formal"
  | "mercenary"
  | "suspicious"
  | "warm";

export interface Ambassador {
  name: string;
  portrait: CharacterPortrait;
  personality: AmbassadorPersonality;
}

export type DiplomacyActionKind =
  | "giftEmpire"
  | "giftRival"
  | "lobbyFor"
  | "lobbyAgainst"
  | "proposeNonCompete"
  | "surveil";

export type SurveilLens = "cash" | "topContractByValue" | "topEmpireStanding";

export interface QueuedDiplomacyAction {
  id: string;
  kind: DiplomacyActionKind;
  targetId: string;
  subjectId?: string;
  subjectIdSecondary?: string;
  surveilLens?: SurveilLens;
  cashCost: number;
}

export interface DiplomacyState {
  empireStanding: Record<string, number>;
  rivalStanding: Record<string, number>;
  /** Per-empire view of each rival (for lobby targeting). */
  crossEmpireRivalStanding: Record<string, Record<string, number>>;
  empireTags: Record<string, readonly StandingTag[]>;
  rivalTags: Record<string, readonly StandingTag[]>;
  empireAmbassadors: Record<string, Ambassador>;
  rivalLiaisons: Record<string, Ambassador>;
  cooldowns: Record<string, number>;
  queuedActions: readonly QueuedDiplomacyAction[];
  actionsResolvedThisTurn: number;
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
  /** Empire-tier route slot pool — intra-empire interstellar routes consume this. */
  routeSlots: number;
  /** System-tier route slot pool — intra-system routes consume this. */
  localRouteSlots: number;
  /**
   * Galactic-tier route slot pool — inter-empire (cross-empire) routes consume
   * this. Optional for backwards compatibility with v6 saves; defaults to
   * BASE_GALACTIC_ROUTE_SLOTS when missing.
   */
  galacticRouteSlots?: number;
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

  /**
   * Active charters held by the player (and historically). AI companies hold
   * their own charters on `AICompany.charters`. Optional for v6-save compat.
   */
  charters?: Charter[];

  /**
   * Open and recently-resolved charter auctions. Resolved entries stay in
   * the array for one turn so the turn report can reference them. Optional
   * for v6-save compat.
   */
  activeAuctions?: CharterAuction[];

  diplomacy: DiplomacyState;
}
