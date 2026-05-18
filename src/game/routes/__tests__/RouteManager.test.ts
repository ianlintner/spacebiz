/**
 * RouteManager tests — capacity-focused route functions
 *
 * Tests hull-mark gating (canOpenRoute), scope capacity costs
 * (getCapacityCostForScope), and scope classification (getRouteScope).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  canOpenRoute,
  getRouteScope,
  getScopeDemandMultiplier,
  _clearRouteManagerCaches,
} from "../RouteManager.ts";
import { getCapacityCostForScope } from "../../fleet/CapacityManager.ts";
import type {
  ActiveRoute,
  Planet,
  StarSystem,
  Sector,
} from "../../../data/types.ts";
import { CargoType, RouteScope, PlanetBiome } from "../../../data/types.ts";
import { CAPACITY_COST_BY_SCOPE } from "../../../data/constants.ts";

// ---------------------------------------------------------------------------
// Minimal galaxy fixture: 2 empires, 3 systems, 4 planets
// sys-1, sys-2 → emp-1; sys-3 → emp-2
// planet-a, planet-a2 in sys-1 (same system → system scope)
// planet-b in sys-2 (same empire as sys-1, different system → empire scope)
// planet-c in sys-3 (different empire → galactic scope)
// ---------------------------------------------------------------------------

const sectors: Sector[] = [
  { id: "sec-1", name: "Core Sector", x: 0, y: 0, color: 0xffffff },
];

const systems: StarSystem[] = [
  {
    id: "sys-1",
    name: "Alpha",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 0,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-2",
    name: "Beta",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 100,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-3",
    name: "Gamma",
    sectorId: "sec-1",
    empireId: "emp-2",
    x: 200,
    y: 0,
    starColor: 0xffcc00,
  },
];

const planets: Planet[] = [
  {
    id: "planet-a",
    name: "Alpha I",
    systemId: "sys-1",
    type: "frontier",
    x: 0,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-a2",
    name: "Alpha II",
    systemId: "sys-1",
    type: "techWorld",
    x: 5,
    y: 5,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-b",
    name: "Beta I",
    systemId: "sys-2",
    type: "agricultural",
    x: 100,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-c",
    name: "Gamma I",
    systemId: "sys-3",
    type: "techWorld",
    x: 200,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
];

const galaxy = {
  sectors,
  empires: [] as import("../../../data/types.ts").Empire[],
  systems,
  planets,
};

function makeRoute(
  origin: string,
  dest: string,
  id = `route-${origin}-${dest}`,
): ActiveRoute {
  return {
    id,
    originPlanetId: origin,
    destinationPlanetId: dest,
    distance: 50,
    cargoType: CargoType.Food,
  };
}

beforeEach(() => {
  _clearRouteManagerCaches();
});

// ---------------------------------------------------------------------------
// canOpenRoute — hull mark gating
// ---------------------------------------------------------------------------

describe("canOpenRoute — hull mark gates", () => {
  it("blocks empire scope at hull Mk I (requires Mk II)", () => {
    expect(canOpenRoute(RouteScope.Empire, 1)).toBe(false);
  });

  it("allows empire scope at hull Mk II", () => {
    expect(canOpenRoute(RouteScope.Empire, 2)).toBe(true);
  });

  it("allows empire scope at hull Mk III+", () => {
    expect(canOpenRoute(RouteScope.Empire, 3)).toBe(true);
    expect(canOpenRoute(RouteScope.Empire, 4)).toBe(true);
    expect(canOpenRoute(RouteScope.Empire, 5)).toBe(true);
  });

  it("blocks galactic scope at hull Mk I", () => {
    expect(canOpenRoute(RouteScope.Galactic, 1)).toBe(false);
  });

  it("blocks galactic scope at hull Mk II", () => {
    expect(canOpenRoute(RouteScope.Galactic, 2)).toBe(false);
  });

  it("allows galactic scope at hull Mk III", () => {
    expect(canOpenRoute(RouteScope.Galactic, 3)).toBe(true);
  });

  it("allows galactic scope at hull Mk IV and V", () => {
    expect(canOpenRoute(RouteScope.Galactic, 4)).toBe(true);
    expect(canOpenRoute(RouteScope.Galactic, 5)).toBe(true);
  });

  it("always allows system scope at any hull mark (starts at Mk I)", () => {
    for (let mark = 1; mark <= 5; mark++) {
      expect(canOpenRoute(RouteScope.System, mark)).toBe(true);
    }
  });

  it("minimum hull by scope is system=1, empire=2, galactic=3", () => {
    expect(canOpenRoute(RouteScope.System, 1)).toBe(true);
    expect(canOpenRoute(RouteScope.Empire, 1)).toBe(false);
    expect(canOpenRoute(RouteScope.Empire, 2)).toBe(true);
    expect(canOpenRoute(RouteScope.Galactic, 2)).toBe(false);
    expect(canOpenRoute(RouteScope.Galactic, 3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCapacityCostForScope — capacity units per route
// ---------------------------------------------------------------------------

describe("getCapacityCostForScope — capacity units consumed", () => {
  it("returns 1 for system scope", () => {
    expect(getCapacityCostForScope(RouteScope.System)).toBe(1);
  });

  it("returns 2 for empire scope", () => {
    expect(getCapacityCostForScope(RouteScope.Empire)).toBe(2);
  });

  it("returns 3 for galactic scope", () => {
    expect(getCapacityCostForScope(RouteScope.Galactic)).toBe(3);
  });

  it("capacity costs match CAPACITY_COST_BY_SCOPE constants", () => {
    expect(getCapacityCostForScope(RouteScope.System)).toBe(
      CAPACITY_COST_BY_SCOPE[RouteScope.System],
    );
    expect(getCapacityCostForScope(RouteScope.Empire)).toBe(
      CAPACITY_COST_BY_SCOPE[RouteScope.Empire],
    );
    expect(getCapacityCostForScope(RouteScope.Galactic)).toBe(
      CAPACITY_COST_BY_SCOPE[RouteScope.Galactic],
    );
  });

  it("galactic costs 3× system scope and 1.5× empire scope", () => {
    const sys = getCapacityCostForScope(RouteScope.System);
    const emp = getCapacityCostForScope(RouteScope.Empire);
    const gal = getCapacityCostForScope(RouteScope.Galactic);
    expect(gal).toBe(sys * 3);
    expect(gal).toBe((emp * 3) / 2);
  });
});

// ---------------------------------------------------------------------------
// getRouteScope — scope derivation from galaxy state
// ---------------------------------------------------------------------------

describe("getRouteScope — scope classification", () => {
  it("same-system route → system scope", () => {
    const state = { galaxy };
    expect(getRouteScope(makeRoute("planet-a", "planet-a2"), state)).toBe(
      RouteScope.System,
    );
  });

  it("cross-system same-empire route → empire scope", () => {
    const state = { galaxy };
    expect(getRouteScope(makeRoute("planet-a", "planet-b"), state)).toBe(
      RouteScope.Empire,
    );
  });

  it("cross-empire route → galactic scope", () => {
    const state = { galaxy };
    expect(getRouteScope(makeRoute("planet-b", "planet-c"), state)).toBe(
      RouteScope.Galactic,
    );
  });

  it("reverse cross-empire route is also galactic scope", () => {
    const state = { galaxy };
    expect(getRouteScope(makeRoute("planet-c", "planet-b"), state)).toBe(
      RouteScope.Galactic,
    );
  });

  it("falls back to empire scope for unknown planet IDs", () => {
    const state = { galaxy };
    expect(
      getRouteScope(makeRoute("planet-unknown-x", "planet-unknown-y"), state),
    ).toBe(RouteScope.Empire);
  });
});

// ---------------------------------------------------------------------------
// getScopeDemandMultiplier — revenue multipliers by cargo and scope
// ---------------------------------------------------------------------------

describe("getScopeDemandMultiplier — cargo-type-aware multipliers", () => {
  it("raw materials system scope = 1.2 (short-haul bulk bonus)", () => {
    expect(
      getScopeDemandMultiplier(CargoType.RawMaterials, RouteScope.System),
    ).toBeCloseTo(1.2, 2);
  });

  it("raw materials empire scope = 1.0 (neutral baseline)", () => {
    expect(
      getScopeDemandMultiplier(CargoType.RawMaterials, RouteScope.Empire),
    ).toBeCloseTo(1.0, 2);
  });

  it("raw materials galactic scope < 1.0 (long-haul bulk penalty)", () => {
    expect(
      getScopeDemandMultiplier(CargoType.RawMaterials, RouteScope.Galactic),
    ).toBeLessThan(1.0);
  });

  it("luxury galactic scope > 1.0 (long-haul premium goods bonus)", () => {
    expect(
      getScopeDemandMultiplier(CargoType.Luxury, RouteScope.Galactic),
    ).toBeGreaterThan(1.0);
  });

  it("every cargo has empire=1.0 (standard anchor)", () => {
    for (const cargo of Object.values(CargoType)) {
      expect(getScopeDemandMultiplier(cargo, RouteScope.Empire)).toBeCloseTo(
        1.0,
        2,
      );
    }
  });

  it("premium cargo (luxury, technology) favors galactic over system", () => {
    for (const cargo of [CargoType.Luxury, CargoType.Technology]) {
      const sys = getScopeDemandMultiplier(cargo, RouteScope.System);
      const gal = getScopeDemandMultiplier(cargo, RouteScope.Galactic);
      expect(gal).toBeGreaterThan(sys);
    }
  });

  it("bulk cargo (raw materials, food) favors system over galactic", () => {
    for (const cargo of [CargoType.RawMaterials, CargoType.Food]) {
      const sys = getScopeDemandMultiplier(cargo, RouteScope.System);
      const gal = getScopeDemandMultiplier(cargo, RouteScope.Galactic);
      expect(sys).toBeGreaterThan(gal);
    }
  });
});
