import { describe, it, expect } from "vitest";
import { createNewGame } from "../NewGameSetup.ts";
import { PlanetType, CargoType } from "../../data/types.ts";
import type { CargoType as CargoTypeT } from "../../data/types.ts";
import { GAME_SIZE_CONFIGS } from "../../data/constants.ts";

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);
const ALL_PLANET_TYPES = Object.values(PlanetType);

describe("NewGameSetup", () => {
  it("returns valid GameState with all fields populated", () => {
    const result = createNewGame(42);
    const { state } = result;

    expect(state.seed).toBe(42);
    expect(state.turn).toBe(1);
    expect(state.maxTurns).toBeGreaterThan(0);
    expect(state.phase).toBe("planning");
    expect(state.cash).toBeGreaterThan(0);
    expect(state.loans).toEqual([]);
    expect(state.reputation).toBe(50);
    expect(state.companyName).toBe("Star Freight Corp");
    expect(state.galaxy).toBeDefined();
    expect(state.galaxy.sectors.length).toBeGreaterThan(0);
    expect(state.galaxy.systems.length).toBeGreaterThan(0);
    expect(state.galaxy.planets.length).toBeGreaterThan(0);
    expect(state.fleet.length).toBe(0);
    expect(state.activeRoutes).toEqual([]);
    expect(state.market).toBeDefined();
    expect(state.activeEvents).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.storyteller).toBeDefined();
    expect(state.score).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.gameOverReason).toBeNull();
  });

  it("starting cash equals config startingCash for default size", () => {
    const result = createNewGame(42);
    expect(result.state.cash).toBe(GAME_SIZE_CONFIGS.small.startingCash);
  });

  it("fleet starts empty (players auto-buy ships)", () => {
    const result = createNewGame(42);
    const { fleet } = result.state;

    expect(fleet.length).toBe(0);
  });

  it("ships have full condition and age 0", () => {
    const result = createNewGame(42);
    for (const ship of result.state.fleet) {
      expect(ship.condition).toBe(100);
      expect(ship.age).toBe(0);
    }
  });

  it("ships have unique IDs", () => {
    const result = createNewGame(42);
    const ids = result.state.fleet.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships have no assigned route", () => {
    const result = createNewGame(42);
    for (const ship of result.state.fleet) {
      expect(ship.assignedRouteId).toBeNull();
    }
  });

  it("galaxy has correct structure", () => {
    const result = createNewGame(42);
    const { galaxy } = result.state;

    // 8 sectors (small map = 8 empires)
    expect(galaxy.sectors.length).toBe(8);

    // 6-8 systems per sector
    for (const sector of galaxy.sectors) {
      const systemsInSector = galaxy.systems.filter(
        (s) => s.sectorId === sector.id,
      );
      expect(systemsInSector.length).toBeGreaterThanOrEqual(6);
      expect(systemsInSector.length).toBeLessThanOrEqual(8);
    }

    // 1-3 planets per system
    for (const system of galaxy.systems) {
      const planetsInSystem = galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      expect(planetsInSystem.length).toBeGreaterThanOrEqual(1);
      expect(planetsInSystem.length).toBeLessThanOrEqual(3);
    }

    // All planet types present
    const typesPresent = new Set(galaxy.planets.map((p) => p.type));
    for (const pt of ALL_PLANET_TYPES) {
      expect(typesPresent.has(pt)).toBe(true);
    }
  });

  it("returns 3 starting system options", () => {
    const result = createNewGame(42);
    expect(result.startingSystemOptions.length).toBe(3);
  });

  it("starting system options are valid systems from the galaxy", () => {
    const result = createNewGame(42);
    const systemIds = new Set(result.state.galaxy.systems.map((s) => s.id));
    for (const option of result.startingSystemOptions) {
      expect(systemIds.has(option.id)).toBe(true);
    }
  });

  it("deterministic for same seed", () => {
    const result1 = createNewGame(42);
    const result2 = createNewGame(42);

    expect(result1.state.galaxy.sectors).toEqual(result2.state.galaxy.sectors);
    expect(result1.state.galaxy.systems).toEqual(result2.state.galaxy.systems);
    expect(result1.state.galaxy.planets).toEqual(result2.state.galaxy.planets);
    expect(result1.state.fleet).toEqual(result2.state.fleet);
    expect(result1.state.cash).toBe(result2.state.cash);
    expect(result1.startingSystemOptions.map((s) => s.id)).toEqual(
      result2.startingSystemOptions.map((s) => s.id),
    );
  });

  it("different seeds produce different results", () => {
    const result1 = createNewGame(42);
    const result2 = createNewGame(999);

    // Planet names should differ
    const names1 = result1.state.galaxy.planets.map((p) => p.name);
    const names2 = result2.state.galaxy.planets.map((p) => p.name);
    expect(names1).not.toEqual(names2);
  });

  it("custom company name is used", () => {
    const result = createNewGame(42, "Galactic Enterprises");
    expect(result.state.companyName).toBe("Galactic Enterprises");
  });

  it("market has entries for every planet", () => {
    const result = createNewGame(42);
    const { planets } = result.state.galaxy;
    const { planetMarkets } = result.state.market;

    for (const planet of planets) {
      expect(planetMarkets[planet.id]).toBeDefined();
      for (const cargoType of ALL_CARGO_TYPES) {
        expect(planetMarkets[planet.id][cargoType]).toBeDefined();
      }
    }
  });

  it("storyteller state is initialized", () => {
    const result = createNewGame(42);
    const { storyteller } = result.state;

    expect(storyteller.playerHealthScore).toBe(50);
    expect(storyteller.headwindBias).toBe(0);
    expect(storyteller.turnsInDebt).toBe(0);
    expect(storyteller.consecutiveProfitTurns).toBe(0);
  });
});
