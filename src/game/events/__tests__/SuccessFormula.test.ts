import { describe, it, expect } from "vitest";
import {
  computeOptionSuccess,
  SUCCESS_FLOOR,
  SUCCESS_CEILING,
} from "../SuccessFormula.ts";
import { ShipClass } from "../../../data/types.ts";
import type { ChoiceOption, GameState, Ship } from "../../../data/types.ts";
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

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    cash: STARTING_CASH,
    fleet: [makeShip()],
    reputation: 50,
    tech: { researchPoints: 0, completedTechIds: [] },
    ...overrides,
  } as unknown as GameState;
}

describe("SuccessFormula.computeOptionSuccess", () => {
  it("clamps below the floor", () => {
    const option: ChoiceOption = {
      id: "x",
      label: "Bad option",
      outcomeDescription: "",
      effects: [],
      baseSuccess: 0,
      scalingTags: [],
    };
    expect(computeOptionSuccess(makeState(), option)).toBe(SUCCESS_FLOOR);
  });

  it("clamps to the ceiling", () => {
    const option: ChoiceOption = {
      id: "x",
      label: "Great option",
      outcomeDescription: "",
      effects: [],
      baseSuccess: 200,
      scalingTags: [],
    };
    expect(computeOptionSuccess(makeState(), option)).toBe(SUCCESS_CEILING);
  });

  it("rewards high fleet condition", () => {
    const goodFleet = [makeShip({ condition: 100 })];
    const badFleet = [makeShip({ condition: 0 })];
    const option: ChoiceOption = {
      id: "x",
      label: "x",
      outcomeDescription: "",
      effects: [],
      baseSuccess: 50,
      scalingTags: ["fleetCondition"],
    };
    const goodPct = computeOptionSuccess(
      makeState({ fleet: goodFleet }),
      option,
    );
    const badPct = computeOptionSuccess(makeState({ fleet: badFleet }), option);
    expect(goodPct).toBeGreaterThan(badPct);
  });

  it("rewards larger fleets with diminishing returns", () => {
    const small = makeState({ fleet: [makeShip()] });
    const big = makeState({
      fleet: [
        makeShip({ id: "1" }),
        makeShip({ id: "2" }),
        makeShip({ id: "3" }),
        makeShip({ id: "4" }),
        makeShip({ id: "5" }),
      ],
    });
    const option: ChoiceOption = {
      id: "x",
      label: "x",
      outcomeDescription: "",
      effects: [],
      baseSuccess: 30,
      scalingTags: ["fleetSize"],
    };
    expect(computeOptionSuccess(big, option)).toBeGreaterThan(
      computeOptionSuccess(small, option),
    );
  });
});
