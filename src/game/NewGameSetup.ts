import { SeededRNG } from "../utils/SeededRNG.ts";
import { generateGalaxy } from "../generation/GalaxyGenerator.ts";
import { initializeMarkets } from "../generation/MarketInitializer.ts";
import { ShipClass } from "../data/types.ts";
import type {
  GameState,
  Ship,
  StarSystem,
  StorytellerState,
} from "../data/types.ts";
import { initAdviserState } from "./adviser/AdviserEngine.ts";
import { SHIP_TEMPLATES, STARTING_CASH, MAX_TURNS } from "../data/constants.ts";

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
  rng: SeededRNG,
): StarSystem[] {
  if (systems.length <= 3) {
    return [...systems];
  }

  // Try to pick systems from different sectors
  const sectorIds = [...new Set(systems.map((s) => s.sectorId))];
  const selected: StarSystem[] = [];

  if (sectorIds.length >= 3) {
    // Pick one system from each of 3 different sectors
    const shuffledSectors = rng.shuffle([...sectorIds]);
    for (let i = 0; i < 3; i++) {
      const sectorSystems = systems.filter(
        (s) => s.sectorId === shuffledSectors[i],
      );
      selected.push(rng.pick(sectorSystems));
    }
  } else {
    // Not enough sectors, pick diverse systems
    const shuffled = rng.shuffle([...systems]);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      selected.push(shuffled[i]);
    }
  }

  return selected;
}

export function createNewGame(
  seed: number,
  companyName: string = "Star Freight Corp",
): NewGameResult {
  const rng = new SeededRNG(seed);

  // Generate galaxy
  const galaxyData = generateGalaxy(seed);

  // Initialize markets (use a new RNG derived from the seed so market
  // generation doesn't depend on galaxy generation RNG state)
  const marketRng = new SeededRNG(seed + 1);
  const market = initializeMarkets(galaxyData, marketRng);

  // Create starting fleet
  const fleet: Ship[] = [
    createShipFromTemplate(ShipClass.CargoShuttle, "ship-0"),
    createShipFromTemplate(ShipClass.PassengerShuttle, "ship-1"),
  ];

  // Initialize storyteller
  const storyteller: StorytellerState = {
    playerHealthScore: 50,
    headwindBias: 0,
    turnsInDebt: 0,
    consecutiveProfitTurns: 0,
  };

  // Select starting system options
  const startingSystemOptions = selectStartingSystems(galaxyData.systems, rng);

  const state: GameState = {
    seed,
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName,
    galaxy: {
      sectors: galaxyData.sectors,
      systems: galaxyData.systems,
      planets: galaxyData.planets,
    },
    fleet,
    activeRoutes: [],
    market,
    activeEvents: [],
    history: [],
    storyteller,
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
  };

  return { state, startingSystemOptions };
}
