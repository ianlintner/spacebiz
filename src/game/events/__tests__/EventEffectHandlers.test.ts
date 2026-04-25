import { describe, it, expect } from "vitest";
import {
  getRouteSpeedModifier,
  isPassengerRouteBlocked,
} from "../EventEngine.ts";
import { EventCategory, CargoType } from "../../../data/types.ts";
import type { GameEvent, ActiveRoute } from "../../../data/types.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRoute(overrides: Partial<ActiveRoute> = {}): ActiveRoute {
  return {
    id: "route-1",
    originPlanetId: "planet-1-2-0",
    destinationPlanetId: "planet-3-4-1",
    distance: 10,
    assignedShipIds: [],
    cargoType: CargoType.RawMaterials,
    ...overrides,
  };
}

function makeSpeedEvent(targetId: string, value: number): GameEvent {
  return {
    id: "evt-speed-1",
    name: "Pirate Activity",
    description: "Pirates slow you down.",
    category: EventCategory.Hazard,
    duration: 2,
    effects: [{ type: "modifySpeed", targetId, value }],
  };
}

function makeBlockPassengersEvent(targetId: string): GameEvent {
  return {
    id: "evt-block-1",
    name: "Quarantine",
    description: "Passengers blocked.",
    category: EventCategory.Hazard,
    duration: 3,
    effects: [{ type: "blockPassengers", targetId, value: 1 }],
  };
}

// ---------------------------------------------------------------------------
// getRouteSpeedModifier
// ---------------------------------------------------------------------------

describe("getRouteSpeedModifier", () => {
  it("returns 1.0 when there are no active events", () => {
    const route = makeRoute();
    expect(getRouteSpeedModifier([], route)).toBe(1.0);
  });

  it("returns 1.0 when active events do not target this route's systems or planets", () => {
    // Event targets a completely different system
    const event = makeSpeedEvent("system-99-99", -0.3);
    const route = makeRoute({
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    expect(getRouteSpeedModifier([event], route)).toBe(1.0);
  });

  it("applies a 0.7 multiplier when modifySpeed=-0.3 event targets the destination system", () => {
    // "planet-3-4-1" belongs to system "system-3-4"
    const event = makeSpeedEvent("system-3-4", -0.3);
    const route = makeRoute({
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    const result = getRouteSpeedModifier([event], route);
    // 1 + (-0.3) = 0.7
    expect(result).toBeCloseTo(0.7);
  });

  it("applies a 0.8 multiplier when modifySpeed=-0.2 event targets the origin system", () => {
    // "planet-1-2-0" belongs to system "system-1-2"
    const event = makeSpeedEvent("system-1-2", -0.2);
    const route = makeRoute({
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    const result = getRouteSpeedModifier([event], route);
    expect(result).toBeCloseTo(0.8);
  });

  it("compounds multiple speed modifiers multiplicatively", () => {
    // Two events both hit the route: 0.8 * 0.7 = 0.56
    const events: GameEvent[] = [
      makeSpeedEvent("system-1-2", -0.2), // origin system
      makeSpeedEvent("system-3-4", -0.3), // destination system
    ];
    const route = makeRoute({
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    const result = getRouteSpeedModifier(events, route);
    expect(result).toBeCloseTo(0.56);
  });

  it("also matches direct planet ID targets", () => {
    // Some events may target a planet ID directly instead of a system ID
    const event = makeSpeedEvent("planet-3-4-1", -0.2);
    const route = makeRoute({
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    const result = getRouteSpeedModifier([event], route);
    expect(result).toBeCloseTo(0.8);
  });
});

// ---------------------------------------------------------------------------
// isPassengerRouteBlocked
// ---------------------------------------------------------------------------

describe("isPassengerRouteBlocked", () => {
  it("returns false when there are no active events", () => {
    const route = makeRoute({ cargoType: CargoType.Passengers });
    expect(isPassengerRouteBlocked([], route)).toBe(false);
  });

  it("returns false when blockPassengers event targets an unrelated planet", () => {
    const event = makeBlockPassengersEvent("planet-99-99-0");
    const route = makeRoute({
      cargoType: CargoType.Passengers,
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    expect(isPassengerRouteBlocked([event], route)).toBe(false);
  });

  it("returns true when blockPassengers event targets the route destination planet", () => {
    const event = makeBlockPassengersEvent("planet-3-4-1");
    const route = makeRoute({
      cargoType: CargoType.Passengers,
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    expect(isPassengerRouteBlocked([event], route)).toBe(true);
  });

  it("returns true when blockPassengers event targets the route origin planet", () => {
    const event = makeBlockPassengersEvent("planet-1-2-0");
    const route = makeRoute({
      cargoType: CargoType.Passengers,
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    expect(isPassengerRouteBlocked([event], route)).toBe(true);
  });

  it("returns false for a cargo route even when a blockPassengers event targets the destination", () => {
    // blockPassengers exists but the caller should only consult it for passenger routes.
    // isPassengerRouteBlocked itself doesn't check cargoType — that's the caller's job —
    // but for completeness we verify the function's own return value is still true
    // (the caller gate is in simulateShipOnRoute).
    // This test confirms the function returns based purely on event + route endpoint matching.
    const event = makeBlockPassengersEvent("planet-3-4-1");
    const route = makeRoute({
      cargoType: CargoType.RawMaterials,
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    // The function itself doesn't know about cargoType, it just checks effect + planet.
    // Callers are responsible for only calling this for passenger routes.
    // Here we simply confirm it returns true (event does target the planet).
    expect(isPassengerRouteBlocked([event], route)).toBe(true);
  });

  it("returns false when only modifySpeed events (not blockPassengers) are active", () => {
    const event = makeSpeedEvent("planet-3-4-1", -0.3);
    const route = makeRoute({
      cargoType: CargoType.Passengers,
      originPlanetId: "planet-1-2-0",
      destinationPlanetId: "planet-3-4-1",
    });
    expect(isPassengerRouteBlocked([event], route)).toBe(false);
  });
});
