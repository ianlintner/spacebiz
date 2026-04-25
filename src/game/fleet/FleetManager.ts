import type { Ship, ShipClass } from "../../data/types.ts";
import {
  SHIP_TEMPLATES,
  OVERHAUL_COST_RATIO,
  OVERHAUL_RESTORE_CONDITION,
  CONDITION_DECAY_MIN,
  CONDITION_DECAY_MAX,
  FLEET_OVERHEAD_THRESHOLD,
  FLEET_OVERHEAD_PER_SHIP,
} from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

/**
 * Create a new ship from a template.
 * Returns the new ship and its purchase cost.
 */
export function buyShip(
  shipClass: ShipClass,
  _fleet: Ship[],
): { ship: Ship; cost: number } {
  const template = SHIP_TEMPLATES[shipClass];

  const ship: Ship = {
    id: generateShipId(),
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

  return { ship, cost: template.purchaseCost };
}

/**
 * Sell a ship. Returns updated fleet (without the ship) and the sale price (depreciated).
 */
export function sellShip(
  shipId: string,
  fleet: Ship[],
): { updatedFleet: Ship[]; salePrice: number } {
  const ship = fleet.find((s) => s.id === shipId);
  if (!ship) {
    throw new Error(`Ship not found: ${shipId}`);
  }

  const salePrice = calculateShipValue(ship);
  const updatedFleet = fleet.filter((s) => s.id !== shipId);

  return { updatedFleet, salePrice };
}

/**
 * Restore a ship's condition to OVERHAUL_RESTORE_CONDITION (90%).
 * Cost is OVERHAUL_COST_RATIO (30%) of purchase price.
 */
export function overhaulShip(
  shipId: string,
  fleet: Ship[],
): { updatedFleet: Ship[]; cost: number } {
  const ship = fleet.find((s) => s.id === shipId);
  if (!ship) {
    throw new Error(`Ship not found: ${shipId}`);
  }

  const cost = ship.purchaseCost * OVERHAUL_COST_RATIO;
  const updatedFleet = fleet.map((s) =>
    s.id === shipId ? { ...s, condition: OVERHAUL_RESTORE_CONDITION } : s,
  );

  return { updatedFleet, cost };
}

/**
 * Per-turn aging: decrease condition by 2-5% (random), increase age by 1.
 * Condition cannot go below 0.
 */
export function ageFleet(fleet: Ship[], rng: SeededRNG): Ship[] {
  return fleet.map((ship) => {
    const decay = rng.nextInt(CONDITION_DECAY_MIN, CONDITION_DECAY_MAX);
    const newCondition = Math.max(0, ship.condition - decay);
    return {
      ...ship,
      age: ship.age + 1,
      condition: newCondition,
    };
  });
}

/**
 * Calculate total maintenance cost for the entire fleet.
 * Each ship's cost: baseMaintenance * (1 + age * 0.01)
 * Fleet overhead applied when fleet exceeds FLEET_OVERHEAD_THRESHOLD ships.
 */
export function calculateMaintenanceCosts(fleet: Ship[]): number {
  const baseCost = fleet.reduce((total, ship) => {
    const ageFactor = 1 + ship.age * 0.01;
    return total + ship.maintenanceCost * ageFactor;
  }, 0);
  const overheadRate = calculateFleetOverhead(fleet.length);
  return baseCost * (1 + overheadRate);
}

/**
 * Calculate the fleet overhead multiplier.
 * 0% for fleets ≤ threshold, +5% per ship above threshold.
 */
export function calculateFleetOverhead(fleetSize: number): number {
  return Math.max(
    0,
    (fleetSize - FLEET_OVERHEAD_THRESHOLD) * FLEET_OVERHEAD_PER_SHIP,
  );
}

/**
 * Calculate current value of a ship (for selling).
 * value = purchaseCost * (condition/100) * (1 - age * 0.05)
 * Minimum: 10% of purchaseCost
 */
export function calculateShipValue(ship: Ship): number {
  const conditionFactor = ship.condition / 100;
  const ageFactor = 1 - ship.age * 0.05;
  const rawValue = ship.purchaseCost * conditionFactor * ageFactor;
  const minValue = ship.purchaseCost * 0.1;
  return Math.max(minValue, Math.round(rawValue));
}

/**
 * Generate a unique ship ID.
 */
function generateShipId(): string {
  return `ship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
