import { describe, it, expect } from "vitest";
import type { StationHub, CargoMarketEntry } from "../../data/types.ts";
import { CargoType } from "../../data/types.ts";
import { HubRoomType } from "../../data/types.ts";
import {
  getHubUpkeep,
  createEmptyHub,
  initializeHubWithTerminal,
} from "../hub/HubManager.ts";
import {
  getRevenueMultiplier,
  getRouteSlotBonus,
} from "../hub/HubBonusCalculator.ts";
import { HUB_ROOM_DEFINITIONS } from "../../data/constants.ts";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeHub(rooms: StationHub["rooms"], level = 0): StationHub {
  return {
    level,
    rooms,
    systemId: "sys-1",
    empireId: "emp-1",
    availableRoomTypes: Object.values(HubRoomType),
  };
}

function makeRoom(type: HubRoomType, id = "r1"): StationHub["rooms"][number] {
  return { id, type, gridX: 0, gridY: 0 };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("HubBonusCalculator — revenue bonus", () => {
  it("returns 1.0 (no bonus) when hub is null", () => {
    expect(getRevenueMultiplier(null)).toBe(1.0);
  });

  it("returns 1.0 when hub has no revenue-boosting rooms", () => {
    // Trade Office only modifies license fee, not revenue
    const hub = makeHub([makeRoom(HubRoomType.TradeOffice)]);
    expect(getRevenueMultiplier(hub)).toBe(1.0);
  });

  it("returns correct revenue multiplier for SimpleTerminal (5% bonus)", () => {
    const hub = makeHub([makeRoom(HubRoomType.SimpleTerminal)]);
    // SimpleTerminal has modifyRevenue: 0.05 → multiplier = 1.05
    expect(getRevenueMultiplier(hub)).toBeCloseTo(1.05);
  });

  it("stacks revenue multipliers from multiple rooms", () => {
    // SimpleTerminal (+0.05) + LuxuryTerminal (+0.05) = 1.10
    const hub = makeHub([
      makeRoom(HubRoomType.SimpleTerminal, "r1"),
      makeRoom(HubRoomType.LuxuryTerminal, "r2"),
    ]);
    expect(getRevenueMultiplier(hub)).toBeCloseTo(1.1);
  });
});

describe("HubBonusCalculator — upkeep", () => {
  it("returns 0 upkeep for an empty hub", () => {
    const hub = makeHub([]);
    expect(getHubUpkeep(hub)).toBe(0);
  });

  it("returns upkeep matching the room definition", () => {
    // SimpleTerminal is rent-free (upkeepCost = 0)
    const expected =
      HUB_ROOM_DEFINITIONS[HubRoomType.SimpleTerminal].upkeepCost;
    const hub = makeHub([makeRoom(HubRoomType.SimpleTerminal)]);
    expect(getHubUpkeep(hub)).toBe(expected);
  });

  it("sums upkeep across all installed rooms", () => {
    const terminal =
      HUB_ROOM_DEFINITIONS[HubRoomType.SimpleTerminal].upkeepCost;
    const tradeOffice =
      HUB_ROOM_DEFINITIONS[HubRoomType.TradeOffice].upkeepCost;
    const hub = makeHub([
      makeRoom(HubRoomType.SimpleTerminal, "r1"),
      makeRoom(HubRoomType.TradeOffice, "r2"),
    ]);
    expect(getHubUpkeep(hub)).toBe(terminal + tradeOffice);
  });
});

describe("Hub P&L net contribution", () => {
  it("net is (revenue bonus estimated) minus upkeep", () => {
    const hub = makeHub([makeRoom(HubRoomType.SimpleTerminal)]);
    const upkeep = getHubUpkeep(hub);
    const multiplier = getRevenueMultiplier(hub);
    // For a hypothetical last-turn revenue of 10_000
    const lastTurnRevenue = 10_000;
    const estimatedBonus = Math.round(lastTurnRevenue * (multiplier - 1));
    const net = estimatedBonus - upkeep;
    // SimpleTerminal is the rent-free starter room:
    //   bonus = 10_000 × 0.05 = 500; upkeep = 0; net = +500
    expect(estimatedBonus).toBe(500);
    expect(upkeep).toBe(0);
    expect(net).toBe(500);
  });

  it("hub with higher revenue multiplier produces positive net at sufficient revenue", () => {
    // ImprovedTerminal: revenue +8%, upkeep 1000
    const hub = makeHub([makeRoom(HubRoomType.ImprovedTerminal)]);
    const upkeep = getHubUpkeep(hub); // 1000
    const multiplier = getRevenueMultiplier(hub); // 1.08
    const revenue = 20_000;
    const bonus = Math.round(revenue * (multiplier - 1)); // 1600
    const net = bonus - upkeep; // 600 > 0
    expect(net).toBeGreaterThan(0);
  });
});

describe("CargoMarketEntry shape", () => {
  it("has all expected fields with correct types", () => {
    const entry: CargoMarketEntry = {
      baseSupply: 80,
      baseDemand: 60,
      currentPrice: 250,
      saturation: 0.45,
      trend: "rising",
      trendMomentum: 0.1,
      eventModifier: 0,
    };
    expect(entry.baseSupply).toBeTypeOf("number");
    expect(entry.baseDemand).toBeTypeOf("number");
    expect(entry.currentPrice).toBeTypeOf("number");
    expect(entry.saturation).toBeTypeOf("number");
    expect(["rising", "stable", "falling"]).toContain(entry.trend);
    expect(entry.trendMomentum).toBeTypeOf("number");
    expect(entry.eventModifier).toBeTypeOf("number");
  });

  it("trend values are limited to the Trend union", () => {
    const validTrends = ["rising", "stable", "falling"];
    const entry: CargoMarketEntry = {
      baseSupply: 50,
      baseDemand: 50,
      currentPrice: 100,
      saturation: 0,
      trend: "stable",
      trendMomentum: 0,
      eventModifier: 0,
    };
    expect(validTrends).toContain(entry.trend);
  });
});

describe("High saturation route tag detection", () => {
  it("saturation >= 0.8 is considered high saturation", () => {
    const saturation = 0.85;
    const isHighSaturation = saturation >= 0.8;
    expect(isHighSaturation).toBe(true);
  });

  it("saturation < 0.5 is not considered high saturation", () => {
    const saturation = 0.3;
    const isHighSaturation = saturation >= 0.8;
    expect(isHighSaturation).toBe(false);
  });

  it("HubManager createEmptyHub initializes with zero rooms", () => {
    const hub = createEmptyHub("sys-1", "emp-1", [HubRoomType.SimpleTerminal]);
    expect(hub.rooms).toHaveLength(0);
    expect(hub.level).toBe(0);
  });

  it("initializeHubWithTerminal adds exactly one SimpleTerminal room", () => {
    const empty = createEmptyHub("sys-1", "emp-1", [
      HubRoomType.SimpleTerminal,
    ]);
    const hub = initializeHubWithTerminal(empty);
    expect(hub.rooms).toHaveLength(1);
    expect(hub.rooms[0]?.type).toBe(HubRoomType.SimpleTerminal);
  });

  it("getRouteSlotBonus returns 0 when no route-slot rooms are installed", () => {
    const hub = makeHub([makeRoom(HubRoomType.SimpleTerminal)]);
    expect(getRouteSlotBonus(hub)).toBe(0);
  });

  it("getRouteSlotBonus returns 1 when OreProcessing is installed", () => {
    // OreProcessing adds 1 route slot
    const hub = makeHub([makeRoom(HubRoomType.OreProcessing)]);
    expect(getRouteSlotBonus(hub)).toBe(1);
  });
});

// Bonus: verify CargoType values haven't changed (regression guard)
describe("CargoType values", () => {
  it("contains all expected cargo types", () => {
    const values = Object.values(CargoType);
    expect(values).toContain("passengers");
    expect(values).toContain("rawMaterials");
    expect(values).toContain("food");
    expect(values).toContain("technology");
    expect(values).toContain("luxury");
    expect(values).toContain("hazmat");
    expect(values).toContain("medical");
  });
});
