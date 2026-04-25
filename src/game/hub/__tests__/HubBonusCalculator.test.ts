import { describe, it, expect } from "vitest";
import {
  getLicenseFeeMultiplier,
  getRevenueMultiplier,
  getTariffMultiplier,
  getRouteSlotBonus,
  getRPBonus,
  getPassengerRevenueMultiplier,
  getFuelMultiplier,
  getSaturationMultiplier,
  getRepairBonus,
  getAIRevenueDebuff,
  getAIMaintenanceDebuff,
} from "../HubBonusCalculator.ts";
import { HubRoomType } from "../../../data/types.ts";
import type { StationHub, Hyperlane } from "../../../data/types.ts";

// ── Factories ───────────────────────────────────────────────

const ALL_ROOM_TYPES = Object.values(HubRoomType);

function makeHub(overrides: Partial<StationHub> = {}): StationHub {
  return {
    level: 0,
    rooms: [],
    systemId: "sys-1",
    empireId: "emp-1",
    availableRoomTypes: ALL_ROOM_TYPES,
    ...overrides,
  };
}

function makeHyperlanes(): Hyperlane[] {
  return [
    { id: "hl-1", systemA: "sys-1", systemB: "sys-2", distance: 5 },
    { id: "hl-2", systemA: "sys-1", systemB: "sys-3", distance: 8 },
    { id: "hl-3", systemA: "sys-2", systemB: "sys-4", distance: 6 },
  ];
}

// ── Empire-wide bonus tests ─────────────────────────────────

describe("getLicenseFeeMultiplier", () => {
  it("returns 1.0 with no hub", () => {
    expect(getLicenseFeeMultiplier(null)).toBe(1.0);
  });

  it("returns 1.0 with empty hub", () => {
    expect(getLicenseFeeMultiplier(makeHub())).toBe(1.0);
  });

  it("returns 0.85 with Trade Office", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 }],
    });
    expect(getLicenseFeeMultiplier(hub)).toBeCloseTo(0.85);
  });
});

describe("getRevenueMultiplier", () => {
  it("returns 1.0 with no hub", () => {
    expect(getRevenueMultiplier(null)).toBe(1.0);
  });

  it("returns 1.05 with Market Exchange", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.MarketExchange, gridX: 0, gridY: 0 },
      ],
    });
    expect(getRevenueMultiplier(hub)).toBeCloseTo(1.05);
  });
});

describe("getTariffMultiplier", () => {
  it("returns 0.8 with Customs Bureau", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.CustomsBureau, gridX: 0, gridY: 0 },
      ],
    });
    expect(getTariffMultiplier(hub)).toBeCloseTo(0.8);
  });
});

describe("getRouteSlotBonus", () => {
  it("returns 0 with no hub", () => {
    expect(getRouteSlotBonus(null)).toBe(0);
  });

  it("returns 1 with Ore Processing", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.OreProcessing, gridX: 0, gridY: 0 },
      ],
    });
    expect(getRouteSlotBonus(hub)).toBe(1);
  });
});

describe("getRPBonus", () => {
  it("returns 1 with Research Lab", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.ResearchLab, gridX: 0, gridY: 0 }],
    });
    expect(getRPBonus(hub)).toBe(1);
  });
});

// ── Local + radius bonus tests ──────────────────────────────

describe("getPassengerRevenueMultiplier", () => {
  const hyperlanes = makeHyperlanes();

  it("returns 1.0 without Passenger Lounge", () => {
    expect(getPassengerRevenueMultiplier(makeHub(), "sys-1", hyperlanes)).toBe(
      1.0,
    );
  });

  it("returns full bonus at hub system", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.PassengerLounge, gridX: 0, gridY: 0 },
      ],
    });
    expect(getPassengerRevenueMultiplier(hub, "sys-1", hyperlanes)).toBeCloseTo(
      1.25,
    );
  });

  it("returns half bonus at 1-hop neighbor", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.PassengerLounge, gridX: 0, gridY: 0 },
      ],
    });
    expect(getPassengerRevenueMultiplier(hub, "sys-2", hyperlanes)).toBeCloseTo(
      1.125,
    );
  });

  it("returns 1.0 for distant system", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.PassengerLounge, gridX: 0, gridY: 0 },
      ],
    });
    expect(getPassengerRevenueMultiplier(hub, "sys-4", hyperlanes)).toBeCloseTo(
      1.0,
    );
  });
});

describe("getFuelMultiplier", () => {
  const hyperlanes = makeHyperlanes();

  it("returns 1.0 without Fuel Depot", () => {
    expect(getFuelMultiplier(makeHub(), ["sys-1"], hyperlanes)).toBe(1.0);
  });

  it("gives full reduction when route passes through hub system", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.FuelDepot, gridX: 0, gridY: 0 }],
    });
    expect(getFuelMultiplier(hub, ["sys-1", "sys-4"], hyperlanes)).toBeCloseTo(
      0.8,
    );
  });

  it("gives half reduction when route passes through neighbor only", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.FuelDepot, gridX: 0, gridY: 0 }],
    });
    // sys-2 is neighbor of sys-1; sys-4 is not in radius
    expect(getFuelMultiplier(hub, ["sys-2", "sys-4"], hyperlanes)).toBeCloseTo(
      0.9,
    );
  });

  it("returns 1.0 when no route system is in range", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.FuelDepot, gridX: 0, gridY: 0 }],
    });
    expect(getFuelMultiplier(hub, ["sys-4"], hyperlanes)).toBeCloseTo(1.0);
  });
});

describe("getSaturationMultiplier", () => {
  const hyperlanes = makeHyperlanes();

  it("returns full reduction at hub system with Cargo Warehouse", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.CargoWarehouse, gridX: 0, gridY: 0 },
      ],
    });
    expect(getSaturationMultiplier(hub, "sys-1", hyperlanes)).toBeCloseTo(0.7);
  });

  it("stacks two Cargo Warehouses", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.CargoWarehouse, gridX: 0, gridY: 0 },
        { id: "r2", type: HubRoomType.CargoWarehouse, gridX: 1, gridY: 0 },
      ],
    });
    // Two warehouses: -30% × 2 = -60% → 0.4
    expect(getSaturationMultiplier(hub, "sys-1", hyperlanes)).toBeCloseTo(0.4);
  });
});

// ── Local-only bonus tests ──────────────────────────────────

describe("getRepairBonus", () => {
  it("returns 0 away from hub system", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.RepairBay, gridX: 0, gridY: 0 }],
    });
    expect(getRepairBonus(hub, "sys-2")).toBe(0);
  });

  it("returns +3 at hub system with one Repair Bay", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.RepairBay, gridX: 0, gridY: 0 }],
    });
    expect(getRepairBonus(hub, "sys-1")).toBe(3);
  });

  it("stacks two Repair Bays", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.RepairBay, gridX: 0, gridY: 0 },
        { id: "r2", type: HubRoomType.RepairBay, gridX: 1, gridY: 0 },
      ],
    });
    expect(getRepairBonus(hub, "sys-1")).toBe(6);
  });
});

// ── AI debuff tests ─────────────────────────────────────────

describe("getAIRevenueDebuff", () => {
  it("returns 0 with no hub", () => {
    expect(getAIRevenueDebuff(null)).toBe(0);
  });

  it("returns -0.15 with Security Office", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.SecurityOffice, gridX: 0, gridY: 0 },
      ],
    });
    expect(getAIRevenueDebuff(hub)).toBeCloseTo(-0.15);
  });
});

describe("getAIMaintenanceDebuff", () => {
  it("returns 0.1 with Security Office", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.SecurityOffice, gridX: 0, gridY: 0 },
      ],
    });
    expect(getAIMaintenanceDebuff(hub)).toBeCloseTo(0.1);
  });
});
