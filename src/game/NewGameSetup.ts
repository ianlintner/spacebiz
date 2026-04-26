import { SeededRNG } from "../utils/SeededRNG.ts";
import { generateGalaxy } from "../generation/GalaxyGenerator.ts";
import { initializeMarkets } from "../generation/MarketInitializer.ts";
import { ShipClass, AIPersonality, GalaxyShape } from "../data/types.ts";
import type {
  GameState,
  Ship,
  StarSystem,
  StorytellerState,
  AICompany,
  ActiveRoute,
  GalaxyShape as GalaxyShapeT,
  TechState,
} from "../data/types.ts";
import { initAdviserState } from "./adviser/AdviserEngine.ts";
import {
  SHIP_TEMPLATES,
  GAME_LENGTH_PRESETS,
  AI_STARTING_CASH,
  BASE_ROUTE_SLOTS,
  HOME_EMPIRE_BONUS_SLOTS,
  SAVE_VERSION,
  ACTION_POINTS_PER_TURN,
  LOCAL_ROUTE_SLOTS,
} from "../data/constants.ts";
import type { GamePreset } from "../data/constants.ts";
import { findAdjacentEmpires } from "./empire/EmpireAccessManager.ts";
import { generateEmpireTradePolicies } from "./empire/EmpirePolicyGenerator.ts";
import { generateCEOName, pickRandomPortrait } from "../data/portraits.ts";
import {
  initializeDiplomacy,
  initializeBorderPorts,
} from "./empire/DiplomacyManager.ts";
import {
  createEmptyHub,
  selectRunRoomTypes,
  initializeHubWithTerminal,
} from "./hub/HubManager.ts";

export interface NewGameResult {
  state: GameState;
  startingSystemOptions: StarSystem[];
}

function createShipFromTemplate(shipClass: ShipClass, id: string): Ship {
  const template = SHIP_TEMPLATES[shipClass];
  return {
    id,
    name: template.name,
    class: template.class,
    cargoCapacity: template.cargoCapacity,
    passengerCapacity: template.passengerCapacity,
    speed: template.speed,
    fuelEfficiency: template.fuelEfficiency,
    reliability: template.baseReliability,
    age: 0,
    condition: 100,
    purchaseCost: template.purchaseCost,
    maintenanceCost: template.baseMaintenance,
    assignedRouteId: null,
  };
}

function selectStartingSystems(
  systems: StarSystem[],
  planets: { systemId: string }[],
  rng: SeededRNG,
): StarSystem[] {
  if (systems.length <= 3) {
    return [...systems];
  }

  // Count planets per system — starter options should feel substantial, so
  // we prefer systems with ≥2 planets for at least 2 of the 3 options.
  const planetCount = new Map<string, number>();
  for (const p of planets) {
    planetCount.set(p.systemId, (planetCount.get(p.systemId) ?? 0) + 1);
  }
  const richSystems = systems.filter((s) => (planetCount.get(s.id) ?? 0) >= 2);
  const pickRichFrom = (pool: StarSystem[]): StarSystem | null => {
    const rich = pool.filter((s) => (planetCount.get(s.id) ?? 0) >= 2);
    if (rich.length === 0) return null;
    return rng.pick(rich);
  };

  const empireIds = [...new Set(systems.map((s) => s.empireId))];
  const selected: StarSystem[] = [];

  if (empireIds.length >= 3) {
    // Pick one system from each of 3 different empires; for the first 2,
    // prefer a ≥2-planet system when that empire has one, so starter cards
    // don't all show "Planets: 1".
    const shuffledEmpires = rng.shuffle([...empireIds]);
    for (let i = 0; i < 3; i++) {
      const empireSystems = systems.filter(
        (s) => s.empireId === shuffledEmpires[i],
      );
      const preferRich = i < 2; // first two slots prefer rich systems
      const candidate = preferRich ? pickRichFrom(empireSystems) : null;
      selected.push(candidate ?? rng.pick(empireSystems));
    }
  } else if (richSystems.length >= 2) {
    // Few empires: pick 2 rich systems + 1 random different one.
    const shuffledRich = rng.shuffle([...richSystems]);
    selected.push(shuffledRich[0], shuffledRich[1]);
    const remaining = systems.filter((s) => !selected.includes(s));
    if (remaining.length > 0) {
      selected.push(rng.pick(remaining));
    } else if (shuffledRich.length > 2) {
      selected.push(shuffledRich[2]);
    }
  } else {
    // Not enough empires or rich systems, fall back to random diverse picks
    const shuffled = rng.shuffle([...systems]);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      selected.push(shuffled[i]);
    }
  }

  return selected;
}

// ── AI Company Names ─────────────────────────────────────────

export const AI_COMPANY_NAME_PREFIXES = [
  "Nova",
  "Stellar",
  "Deep",
  "Cosmic",
  "Astral",
  "Quantum",
  "Nebula",
  "Void",
  "Apex",
  "Prime",
];

export const AI_COMPANY_NAME_SUFFIXES = [
  "Freight Lines",
  "Logistics",
  "Haulers",
  "Transport Co.",
  "Shipping Corp",
  "Cargo Ltd.",
  "Express",
  "Trading Guild",
  "Fleet Services",
  "Star Carriers",
];

export const AI_PERSONALITIES: (typeof AIPersonality)[keyof typeof AIPersonality][] =
  [
    AIPersonality.AggressiveExpander,
    AIPersonality.SteadyHauler,
    AIPersonality.CherryPicker,
  ];

function createAICompanies(
  empireIds: string[],
  count: number,
  playerEmpireId: string,
  rng: SeededRNG,
): AICompany[] {
  const companies: AICompany[] = [];
  const usedNames = new Set<string>();

  // Allocate 1 AI per empire (excluding player's empire first)
  const availableEmpires = empireIds.filter((id) => id !== playerEmpireId);
  // If we need more AI than non-player empires, allow player empire too
  const empireQueue = [...availableEmpires];
  while (empireQueue.length < count) {
    // Round-robin fill — add all empires again
    for (const eid of empireIds) {
      if (empireQueue.length >= count) break;
      empireQueue.push(eid);
    }
  }

  // Prefer a unique prefix per company — previously two rivals could share
  // the prefix ("Prime Freight Lines" + "Prime Express") and read as the
  // same company in compact feeds that only show the first word or two.
  // Shuffle a pool so prefixes are consumed without replacement. Fall back
  // to the old prefix+suffix dedupe only when the prefix pool is empty.
  const prefixPool = [...AI_COMPANY_NAME_PREFIXES];
  rng.shuffle(prefixPool);

  for (let i = 0; i < count; i++) {
    let name: string;
    if (prefixPool.length > 0) {
      const prefix = prefixPool.pop() as string;
      const suffix = rng.pick(AI_COMPANY_NAME_SUFFIXES);
      name = `${prefix} ${suffix}`;
      // Extremely rare — same prefix+suffix pulled twice because prefix
      // pool is disjoint — but guard anyway.
      if (usedNames.has(name)) {
        name = `${prefix} ${suffix} ${i + 1}`;
      }
    } else {
      do {
        const prefix = rng.pick(AI_COMPANY_NAME_PREFIXES);
        const suffix = rng.pick(AI_COMPANY_NAME_SUFFIXES);
        name = `${prefix} ${suffix}`;
      } while (usedNames.has(name));
    }
    usedNames.add(name);

    const empireId = empireQueue[i];
    const personality = AI_PERSONALITIES[i % AI_PERSONALITIES.length];

    // AI companies start with one CargoShuttle so they can open routes immediately
    const starterTemplate = SHIP_TEMPLATES[ShipClass.CargoShuttle];
    const starterShip: Ship = {
      id: `ai-${i}-ship-0`,
      name: starterTemplate.name,
      class: starterTemplate.class,
      cargoCapacity: starterTemplate.cargoCapacity,
      passengerCapacity: starterTemplate.passengerCapacity,
      speed: starterTemplate.speed,
      fuelEfficiency: starterTemplate.fuelEfficiency,
      reliability: starterTemplate.baseReliability,
      age: 0,
      condition: 100,
      purchaseCost: starterTemplate.purchaseCost,
      maintenanceCost: starterTemplate.baseMaintenance,
      assignedRouteId: null,
    };
    const aiFleet: Ship[] = [starterShip];

    const company: AICompany = {
      id: `ai-${i}`,
      name,
      empireId,
      cash: AI_STARTING_CASH - starterTemplate.purchaseCost,
      fleet: aiFleet,
      activeRoutes: [] as ActiveRoute[],
      reputation: 50,
      totalCargoDelivered: 0,
      personality,
      bankrupt: false,
      ceoName: generateCEOName(rng),
      ceoPortrait: pickRandomPortrait(rng),
    };

    companies.push(company);
  }

  return companies;
}

export function createNewGame(
  seed: number,
  companyName: string = "Star Freight Corp",
  gamePreset: GamePreset = "standard",
  galaxyShape: GalaxyShapeT = GalaxyShape.Spiral,
): NewGameResult {
  const rng = new SeededRNG(seed);

  const config = GAME_LENGTH_PRESETS[gamePreset];

  // Generate galaxy with empires
  const galaxyData = generateGalaxy(seed, gamePreset, galaxyShape);

  // Initialize markets (use a new RNG derived from the seed so market
  // generation doesn't depend on galaxy generation RNG state)
  const marketRng = new SeededRNG(seed + 1);
  const market = initializeMarkets(galaxyData, marketRng);

  // Create starting fleet
  const startingShips: Ship[] = [];
  for (let i = 0; i < config.startingShips; i++) {
    const shipClass =
      i === 0
        ? ShipClass.CargoShuttle
        : i === 1
          ? ShipClass.PassengerShuttle
          : ShipClass.MixedHauler;
    startingShips.push(createShipFromTemplate(shipClass, `ship-${i}`));
  }

  // Initialize storyteller. `turnsSinceLastDilemma` starts high so the first
  // dilemma can fire as soon as the player has cleared the early-game ramp.
  const storyteller: StorytellerState = {
    playerHealthScore: 50,
    headwindBias: 0,
    turnsInDebt: 0,
    consecutiveProfitTurns: 0,
    turnsSinceLastDecision: 0,
    turnsSinceLastDilemma: 999,
    recentIntensity: 0,
    mode: "steady",
  };

  // Select starting system options
  const startingSystemOptions = selectStartingSystems(
    galaxyData.systems,
    galaxyData.planets,
    rng,
  );

  // Default player empire to that of first starting system option
  const playerEmpireId =
    startingSystemOptions.length > 0
      ? startingSystemOptions[0].empireId
      : (galaxyData.empires[0]?.id ?? "");

  // Create AI companies
  const empireIds = galaxyData.empires.map((e) => e.id);
  const aiCompanies = createAICompanies(
    empireIds,
    config.aiCompanyCount,
    playerEmpireId,
    rng,
  );

  // Phase 3: Empire access — home + N adjacent empires
  const adjacentEmpires = findAdjacentEmpires(
    playerEmpireId,
    galaxyData.empires,
    galaxyData.systems,
  );
  const unlockedEmpireIds = [playerEmpireId, ...adjacentEmpires];

  // Phase 3: Generate trade policies
  const policyRng = new SeededRNG(seed + 2);
  const empireTradePolicies = generateEmpireTradePolicies(
    galaxyData.empires,
    galaxyData.systems,
    galaxyData.planets,
    policyRng,
  );

  // Phase 3: Initial tech state
  const tech: TechState = {
    researchPoints: 0,
    completedTechIds: [],
    currentResearchId: null,
    researchProgress: 0,
  };

  // Phase 4: Initialize diplomacy & border ports
  const diplomacyRng = new SeededRNG(seed + 3);
  const diplomaticRelations = initializeDiplomacy(
    galaxyData.empires,
    galaxyData.systems,
    galaxyData.hyperlanes,
  );
  const borderPorts = initializeBorderPorts(
    galaxyData.hyperlanes,
    galaxyData.systems,
    diplomaticRelations,
    diplomacyRng,
  );

  // Phase 5: Initialize station hub at the default starting system
  const hubRng = new SeededRNG(seed + 4);
  const availableRoomTypes = selectRunRoomTypes(hubRng);
  const defaultStartingSystem = startingSystemOptions[0];
  const stationHub = defaultStartingSystem
    ? initializeHubWithTerminal(
        createEmptyHub(
          defaultStartingSystem.id,
          defaultStartingSystem.empireId,
          availableRoomTypes,
        ),
      )
    : null;

  const state: GameState = {
    seed,
    turn: 1,
    maxTurns: config.maxTurns,
    phase: "planning",
    gameSize: gamePreset,
    galaxyShape,
    cash: config.startingCash,
    loans: [],
    reputation: 50,
    companyName,
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    playerEmpireId,
    galaxy: {
      sectors: galaxyData.sectors,
      empires: galaxyData.empires,
      systems: galaxyData.systems,
      planets: galaxyData.planets,
    },
    hyperlanes: galaxyData.hyperlanes,
    borderPorts,
    diplomaticRelations,
    hyperlaneDensity: "medium",
    fleet: startingShips,
    activeRoutes: [],
    market,
    aiCompanies,
    activeEvents: [],
    history: [],
    storyteller,
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: BASE_ROUTE_SLOTS + HOME_EMPIRE_BONUS_SLOTS,
    localRouteSlots: LOCAL_ROUTE_SLOTS,
    unlockedEmpireIds,
    contracts: [],
    tech,
    empireTradePolicies,
    interEmpireCargoLocks: [],
    stationHub,
    // Phase 6: Interaction Overhaul
    saveVersion: SAVE_VERSION,
    actionPoints: {
      current: ACTION_POINTS_PER_TURN,
      max: ACTION_POINTS_PER_TURN,
    },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
  };

  return { state, startingSystemOptions };
}
