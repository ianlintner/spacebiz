import { describe, it, expect } from "vitest";
import { updateStorytellerState } from "../Storyteller.ts";
import { ShipClass } from "../../../data/types.ts";
import type { Ship, StorytellerState } from "../../../data/types.ts";
import { STARTING_CASH } from "../../../data/constants.ts";

function makeShip(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Test Ship",
    class: ShipClass.CargoShuttle,
    cargoCapacity: 80,
    passengerCapacity: 0,
    speed: 4,
    fuelEfficiency: 0.8,
    reliability: 92,
    age: 0,
    condition: 100,
    purchaseCost: 40000,
    maintenanceCost: 2000,
    assignedRouteId: null,
    ...overrides,
  };
}

const INITIAL_STATE: StorytellerState = {
  playerHealthScore: 50,
  headwindBias: 0,
  turnsInDebt: 0,
  consecutiveProfitTurns: 0,
  turnsSinceLastDecision: 0,
};

describe("Storyteller", () => {
  describe("updateStorytellerState", () => {
    it("high cash produces a high health score", () => {
      const fleet = [makeShip(), makeShip({ id: "ship-2" })];
      const result = updateStorytellerState(
        INITIAL_STATE,
        STARTING_CASH * 2,
        fleet,
        10000,
      );
      // cash=2x(40pts) + 2 ships(4pts) + 0.5x profit target(20pts) = 64
      expect(result.playerHealthScore).toBeGreaterThanOrEqual(60);
    });

    it("low cash produces a low health score", () => {
      const fleet = [makeShip()];
      const result = updateStorytellerState(INITIAL_STATE, 100, fleet, -5000);
      expect(result.playerHealthScore).toBeLessThanOrEqual(30);
    });

    it("zero cash and no fleet produces minimal health score", () => {
      const result = updateStorytellerState(INITIAL_STATE, 0, [], -10000);
      expect(result.playerHealthScore).toBeLessThanOrEqual(15);
    });

    it("positive profit increments consecutiveProfitTurns", () => {
      const state: StorytellerState = {
        ...INITIAL_STATE,
        consecutiveProfitTurns: 3,
      };
      const result = updateStorytellerState(
        state,
        STARTING_CASH,
        [makeShip()],
        5000,
      );
      expect(result.consecutiveProfitTurns).toBe(4);
    });

    it("negative profit resets consecutiveProfitTurns to 0", () => {
      const state: StorytellerState = {
        ...INITIAL_STATE,
        consecutiveProfitTurns: 5,
      };
      const result = updateStorytellerState(
        state,
        STARTING_CASH,
        [makeShip()],
        -1000,
      );
      expect(result.consecutiveProfitTurns).toBe(0);
    });

    it("negative cash increments turnsInDebt", () => {
      const state: StorytellerState = {
        ...INITIAL_STATE,
        turnsInDebt: 2,
      };
      const result = updateStorytellerState(state, -5000, [makeShip()], -1000);
      expect(result.turnsInDebt).toBe(3);
    });

    it("positive cash resets turnsInDebt to 0", () => {
      const state: StorytellerState = {
        ...INITIAL_STATE,
        turnsInDebt: 4,
      };
      const result = updateStorytellerState(state, 50000, [makeShip()], 1000);
      expect(result.turnsInDebt).toBe(0);
    });

    it("headwind bias is positive when health > 60", () => {
      const fleet = Array.from({ length: 5 }, (_, i) =>
        makeShip({ id: `ship-${i}` }),
      );
      const result = updateStorytellerState(
        INITIAL_STATE,
        STARTING_CASH * 2,
        fleet,
        30000,
      );
      expect(result.playerHealthScore).toBeGreaterThan(60);
      expect(result.headwindBias).toBeGreaterThan(0);
    });

    it("headwind bias is negative when health < 40", () => {
      const result = updateStorytellerState(INITIAL_STATE, 100, [], -5000);
      expect(result.playerHealthScore).toBeLessThan(40);
      expect(result.headwindBias).toBeLessThan(0);
    });

    it("headwind bias is near zero when health is between 40 and 60", () => {
      // Moderate cash, moderate fleet, moderate profit
      const fleet = [makeShip(), makeShip({ id: "ship-2" })];
      const result = updateStorytellerState(
        INITIAL_STATE,
        STARTING_CASH * 0.5,
        fleet,
        0,
      );
      // This should be in or near the neutral zone
      expect(Math.abs(result.headwindBias)).toBeLessThanOrEqual(0.5);
    });
  });
});
