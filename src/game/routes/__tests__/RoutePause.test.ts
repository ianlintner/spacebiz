import { describe, it, expect } from "vitest";
import { setRoutePaused, setRouteCargo } from "../RouteManager.ts";
import { CargoType } from "../../../data/types.ts";
import type { ActiveRoute } from "../../../data/types.ts";

const baseRoute: ActiveRoute = {
  id: "r1",
  originPlanetId: "p-origin",
  destinationPlanetId: "p-dest",
  distance: 50,
  assignedShipIds: ["s1"],
  cargoType: CargoType.Technology,
};

describe("setRoutePaused", () => {
  it("sets paused=true on the matching route only", () => {
    const routes = [baseRoute, { ...baseRoute, id: "r2" }];
    const result = setRoutePaused("r1", true, routes);
    expect(result.find((r) => r.id === "r1")?.paused).toBe(true);
    expect(result.find((r) => r.id === "r2")?.paused).toBeUndefined();
  });

  it("returns a new array (does not mutate)", () => {
    const routes = [baseRoute];
    const result = setRoutePaused("r1", true, routes);
    expect(result).not.toBe(routes);
    expect(routes[0].paused).toBeUndefined();
  });

  it("can resume by setting paused=false", () => {
    const routes = [{ ...baseRoute, paused: true }];
    const result = setRoutePaused("r1", false, routes);
    expect(result[0].paused).toBe(false);
  });

  it("returns routes unchanged when routeId does not match", () => {
    const routes = [baseRoute];
    const result = setRoutePaused("missing", true, routes);
    expect(result[0].paused).toBeUndefined();
  });
});

describe("setRouteCargo", () => {
  it("updates cargoType on the matching route", () => {
    const routes = [baseRoute];
    const result = setRouteCargo("r1", CargoType.Luxury, routes);
    expect(result[0].cargoType).toBe(CargoType.Luxury);
  });

  it("preserves other fields", () => {
    const routes = [baseRoute];
    const result = setRouteCargo("r1", CargoType.Food, routes);
    expect(result[0].id).toBe(baseRoute.id);
    expect(result[0].assignedShipIds).toEqual(baseRoute.assignedShipIds);
    expect(result[0].distance).toBe(baseRoute.distance);
  });

  it("can clear cargo by passing null", () => {
    const routes = [baseRoute];
    const result = setRouteCargo("r1", null, routes);
    expect(result[0].cargoType).toBeNull();
  });
});
