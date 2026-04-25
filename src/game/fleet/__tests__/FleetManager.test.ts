import { describe, it, expect } from "vitest";
import {
  buyShip,
  sellShip,
  overhaulShip,
  ageFleet,
  calculateMaintenanceCosts,
  calculateShipValue,
} from "../FleetManager.ts";
import { ShipClass } from "../../../data/types.ts";
import type { Ship } from "../../../data/types.ts";
import {
  SHIP_TEMPLATES,
  OVERHAUL_RESTORE_CONDITION,
  OVERHAUL_COST_RATIO,
} from "../../../data/constants.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";

function makeShip(overrides: Partial<Ship> = {}): Ship {
  const template = SHIP_TEMPLATES[ShipClass.CargoShuttle];
  return {
    id: "ship-test-1",
    name: template.name,
    class: ShipClass.CargoShuttle,
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
    ...overrides,
  };
}

describe("FleetManager", () => {
  describe("buyShip", () => {
    it("creates correct ship from template", () => {
      const fleet: Ship[] = [];
      const result = buyShip(ShipClass.CargoShuttle, fleet);

      expect(result.ship.class).toBe(ShipClass.CargoShuttle);
      expect(result.ship.name).toBe("Cargo Shuttle");
      expect(result.ship.cargoCapacity).toBe(80);
      expect(result.ship.passengerCapacity).toBe(0);
      expect(result.ship.speed).toBe(4);
      expect(result.ship.fuelEfficiency).toBe(0.8);
      expect(result.ship.reliability).toBe(92);
      expect(result.ship.age).toBe(0);
      expect(result.ship.condition).toBe(100);
      expect(result.ship.assignedRouteId).toBeNull();
      expect(result.cost).toBe(40000);
    });

    it("generates unique ship IDs", () => {
      const fleet: Ship[] = [];
      const result1 = buyShip(ShipClass.CargoShuttle, fleet);
      const result2 = buyShip(ShipClass.CargoShuttle, fleet);

      expect(result1.ship.id).toBeTruthy();
      expect(result2.ship.id).toBeTruthy();
      expect(result1.ship.id).not.toBe(result2.ship.id);
    });

    it("creates expensive ships correctly", () => {
      const fleet: Ship[] = [];
      const result = buyShip(ShipClass.MegaHauler, fleet);

      expect(result.ship.class).toBe(ShipClass.MegaHauler);
      expect(result.ship.cargoCapacity).toBe(400);
      expect(result.cost).toBe(500000);
    });
  });

  describe("sellShip", () => {
    it("returns depreciated value and removes ship from fleet", () => {
      const ship = makeShip({ condition: 80, age: 2 });
      const fleet = [ship];

      const result = sellShip(ship.id, fleet);

      expect(result.updatedFleet).toHaveLength(0);
      expect(result.salePrice).toBe(calculateShipValue(ship));
      expect(result.salePrice).toBeLessThan(ship.purchaseCost);
    });

    it("throws error for non-existent ship", () => {
      const fleet = [makeShip()];
      expect(() => sellShip("non-existent", fleet)).toThrow();
    });
  });

  describe("overhaulShip", () => {
    it("restores condition to 90", () => {
      const ship = makeShip({ condition: 50 });
      const fleet = [ship];

      const result = overhaulShip(ship.id, fleet);

      const overhauledShip = result.updatedFleet.find((s) => s.id === ship.id);
      expect(overhauledShip!.condition).toBe(OVERHAUL_RESTORE_CONDITION);
    });

    it("costs 30% of purchase price", () => {
      const ship = makeShip({ condition: 50, purchaseCost: 40000 });
      const fleet = [ship];

      const result = overhaulShip(ship.id, fleet);

      expect(result.cost).toBe(40000 * OVERHAUL_COST_RATIO);
    });

    it("does not affect other ships in fleet", () => {
      const ship1 = makeShip({ id: "ship-1", condition: 50 });
      const ship2 = makeShip({ id: "ship-2", condition: 60 });
      const fleet = [ship1, ship2];

      const result = overhaulShip("ship-1", fleet);

      const otherShip = result.updatedFleet.find((s) => s.id === "ship-2");
      expect(otherShip!.condition).toBe(60);
    });
  });

  describe("ageFleet", () => {
    it("reduces condition by 2-5% and increments age by 1", () => {
      const ship = makeShip({ condition: 100, age: 0 });
      const fleet = [ship];

      const rng = new SeededRNG(42);
      const aged = ageFleet(fleet, rng);

      expect(aged[0].age).toBe(1);
      expect(aged[0].condition).toBeGreaterThanOrEqual(95);
      expect(aged[0].condition).toBeLessThanOrEqual(98);
    });

    it("condition does not go below 0", () => {
      const ship = makeShip({ condition: 2, age: 10 });
      const fleet = [ship];

      const rng = new SeededRNG(42);
      const aged = ageFleet(fleet, rng);

      expect(aged[0].condition).toBeGreaterThanOrEqual(0);
    });

    it("is deterministic for same RNG seed", () => {
      const fleet = [
        makeShip({ id: "ship-1", condition: 100 }),
        makeShip({ id: "ship-2", condition: 80 }),
      ];

      const rng1 = new SeededRNG(42);
      const rng2 = new SeededRNG(42);

      const result1 = ageFleet(fleet, rng1);
      const result2 = ageFleet(fleet, rng2);

      expect(result1).toEqual(result2);
    });
  });

  describe("calculateMaintenanceCosts", () => {
    it("returns base maintenance for age 0 ship", () => {
      const ship = makeShip({ age: 0 });
      const fleet = [ship];

      const cost = calculateMaintenanceCosts(fleet);
      expect(cost).toBe(ship.maintenanceCost);
    });

    it("increases with ship age", () => {
      const youngFleet = [makeShip({ age: 0 })];
      const oldFleet = [makeShip({ age: 10 })];

      const youngCost = calculateMaintenanceCosts(youngFleet);
      const oldCost = calculateMaintenanceCosts(oldFleet);

      expect(oldCost).toBeGreaterThan(youngCost);
    });

    it("sums costs for entire fleet", () => {
      const fleet = [
        makeShip({ id: "ship-1", age: 0, maintenanceCost: 2000 }),
        makeShip({ id: "ship-2", age: 0, maintenanceCost: 3000 }),
      ];

      const cost = calculateMaintenanceCosts(fleet);
      expect(cost).toBe(5000);
    });

    it("applies age factor: baseMaintenance * (1 + age * 0.01)", () => {
      const ship = makeShip({ age: 10, maintenanceCost: 2000 });
      const fleet = [ship];

      const cost = calculateMaintenanceCosts(fleet);
      // 2000 * (1 + 10 * 0.01) = 2000 * 1.1 = 2200
      expect(cost).toBeCloseTo(2200, 0);
    });
  });

  describe("calculateShipValue", () => {
    it("returns full value for new ship in perfect condition", () => {
      const ship = makeShip({ condition: 100, age: 0 });
      const value = calculateShipValue(ship);

      // value = purchaseCost * (100/100) * (1 - 0 * 0.05) = purchaseCost
      expect(value).toBe(ship.purchaseCost);
    });

    it("decreases with age", () => {
      const newShip = makeShip({ condition: 100, age: 0 });
      const oldShip = makeShip({ condition: 100, age: 5 });

      expect(calculateShipValue(oldShip)).toBeLessThan(
        calculateShipValue(newShip),
      );
    });

    it("decreases with condition", () => {
      const goodShip = makeShip({ condition: 100, age: 0 });
      const wornShip = makeShip({ condition: 50, age: 0 });

      expect(calculateShipValue(wornShip)).toBeLessThan(
        calculateShipValue(goodShip),
      );
    });

    it("has minimum value of 10% of purchase cost", () => {
      const terribleShip = makeShip({
        condition: 10,
        age: 20,
        purchaseCost: 40000,
      });

      const value = calculateShipValue(terribleShip);
      expect(value).toBe(4000); // 10% of 40000
    });

    it("value = purchaseCost * (condition/100) * (1 - age * 0.05)", () => {
      const ship = makeShip({
        condition: 80,
        age: 4,
        purchaseCost: 40000,
      });

      const value = calculateShipValue(ship);
      // 40000 * (80/100) * (1 - 4 * 0.05) = 40000 * 0.8 * 0.8 = 25600
      expect(value).toBe(25600);
    });
  });
});
