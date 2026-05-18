import { SeededRNG } from "../utils/SeededRNG.ts";
import { createContext } from "@lexiconlang/core";
import { megacorpName } from "@lexiconlang/scifi";
import { generateGalaxy } from "../generation/GalaxyGenerator.ts";
import { initializeMarkets } from "../generation/MarketInitializer.ts";
import { AIPersonality, GalaxyShape } from "../data/types.ts";
import type {
  GameState,
  Planet,
  StarSystem,
  StorytellerState,
  AICompany,
  ActiveRoute,
  Charter,
  DiplomacyState,
  Empire,
  GalaxyShape as GalaxyShapeT,
  TechState,
} from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { initAdviserState } from "./adviser/AdviserEngine.ts";
import {
  GAME_LENGTH_PRESETS,
  AI_STARTING_CASH,
  BASE_ROUTE_SLOTS,
  HOME_EMPIRE_BONUS_SLOTS,
  SAVE_VERSION,
  ACTION_POINTS_PER_TURN,
  LOCAL_ROUTE_SLOTS,
  BASE_GALACTIC_ROUTE_SLOTS,
  STARTER_CHARTERS_AT_HOME,
  PLAYER_COMPANY_ID,
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
import { generateAmbassadors } from "./diplomacy/AmbassadorGenerator.ts";
import { generateContracts } from "./contracts/ContractGenerator.ts";
import { seedUniverseRoster } from "../generation/news/universeRoster.ts";

// Namespaces the roster RNG stream away from galaxy/market seeds so reseeding
// the roster never perturbs other deterministic systems.
const ROSTER_SEED_OFFSET = 0x517a33;

export interface NewGameResult {
  state: GameState;
  startingSystemOptions: StarSystem[];
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

export const AI_COMPANY_NAME_PREFIXES: string[] = [];

export const AI_COMPANY_NAME_SUFFIXES: string[] = [];

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
  systems: StarSystem[],
  planets: Planet[],
  seed: number,
): AICompany[] {
  const companies: AICompany[] = [];
  const usedNames = new Set<string>();
  const compCtx = createContext({ seed: `sft-companies-${seed}` });

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

  for (let i = 0; i < count; i++) {
    let name: string;
    let nameAttempt = 0;
    do {
      name = megacorpName.generate(
        compCtx.child(`company:${i}:${nameAttempt}`),
      );
      nameAttempt++;
    } while (usedNames.has(name) && nameAttempt < 50);
    usedNames.add(name);

    const empireId = empireQueue[i];
    const personality = AI_PERSONALITIES[i % AI_PERSONALITIES.length];

    const empireSystems = systems.filter((s) => s.empireId === empireId);
    const empireSystemId =
      empireSystems[i % Math.max(1, empireSystems.length)]?.id;
    const homeworldPlanetId = planets.find(
      (p) => p.systemId === empireSystemId,
    )?.id;

    const company: AICompany = {
      id: `ai-${i}`,
      name,
      empireId,
      cash: AI_STARTING_CASH,
      activeRoutes: [] as ActiveRoute[],
      reputation: 50,
      totalCargoDelivered: 0,
      personality,
      bankrupt: false,
      ceoName: generateCEOName(rng),
      ceoPortrait: pickRandomPortrait(rng),
      homeworldPlanetId,
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
    galaxyData.systems,
    galaxyData.planets,
    seed,
  );

  // Player homeworld: first planet in the default starting system.
  const playerHomeworldPlanetId = galaxyData.planets.find(
    (p) => p.systemId === (startingSystemOptions[0]?.id ?? ""),
  )?.id;

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
    purchaseCount: {},
    queue: [],
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

  // Phase 7: Grant the player's starter charters in their home empire.
  // These are permanent, free (zero upkeep) — training-wheel slots that
  // can never be forfeited for non-payment. Seeded so saves are reproducible.
  const charterRng = new SeededRNG(seed + 7);
  const homeEmpire = galaxyData.empires.find((e) => e.id === playerEmpireId);
  const playerCharters: Charter[] = [];
  if (homeEmpire?.routeSlotPool) {
    const granted = Math.min(
      STARTER_CHARTERS_AT_HOME,
      homeEmpire.routeSlotPool.domesticOpen,
    );
    for (let i = 0; i < granted; i++) {
      playerCharters.push({
        id: `charter-starter-${i}-${charterRng.nextInt(0, 1_000_000)}`,
        empireId: playerEmpireId,
        pool: "domestic",
        holderId: PLAYER_COMPANY_ID,
        grantedTurn: 1,
        term: { kind: "permanent", upkeepPerTurn: 0 },
      });
    }
    homeEmpire.routeSlotPool = {
      ...homeEmpire.routeSlotPool,
      domesticOpen: homeEmpire.routeSlotPool.domesticOpen - granted,
    };
  }

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

  // Wave 1 diplomacy: seed ambassadors per empire and liaisons per AI rival,
  // plus neutral (50) per-rival standing. Empire-side standing continues to
  // live on `state.empireReputation` and is not duplicated here.
  const diplomacyAmbassadorRng = new SeededRNG(seed + 5);
  const { empireAmbassadors, rivalLiaisons } = generateAmbassadors(
    diplomacyAmbassadorRng,
    galaxyData.empires,
    aiCompanies,
  );
  const rivalStanding: Record<string, number> = Object.fromEntries(
    aiCompanies.map((c) => [c.id, 50]),
  );
  const diplomacy: DiplomacyState = {
    ...EMPTY_DIPLOMACY_STATE,
    rivalStanding,
    empireAmbassadors,
    rivalLiaisons,
  };

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
    galacticRouteSlots: BASE_GALACTIC_ROUTE_SLOTS,
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
    unlockedNavTabs: ["map", "routes", "finance"],
    reputationTier: "unknown",
    empireReputation: Object.fromEntries(
      galaxyData.empires.map((e: Empire) => [e.id, 50]),
    ),
    charters: playerCharters,
    diplomacy,
    homeworldPlanetId: playerHomeworldPlanetId,
    universeRoster: {
      sportsTeams: [],
      musicians: [],
      celebrities: [],
      pundits: [],
      crimeFigures: [],
      militaryOfficers: [],
    },
    rosterHistory: [],
  };

  const contracts = generateContracts(state, rng);

  // Seed the universe roster from the finalized galaxy. Uses a distinct seed
  // namespace so changes here don't affect galaxy/market RNG streams.
  const rosterRng = new SeededRNG(seed + ROSTER_SEED_OFFSET);
  const universeRoster = seedUniverseRoster(rosterRng, state.galaxy);

  return {
    state: { ...state, contracts, universeRoster },
    startingSystemOptions,
  };
}
