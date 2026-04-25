import { describe, it, expect } from "vitest";
import {
  createEmptyHub,
  selectRunRoomTypes,
  getAvailableSlots,
  getHubUpkeep,
  canBuildRoom,
  buildRoom,
  demolishRoom,
  upgradeHub,
  getHyperlaneNeighbors,
  isSystemInHubRadius,
  isTerminalRoom,
  initializeHubWithTerminal,
  getTerminalUpgrade,
  upgradeTerminal,
} from "../HubManager.ts";
import { HubRoomType } from "../../../data/types.ts";
import type { StationHub, TechState, Hyperlane } from "../../../data/types.ts";
import {
  HUB_LEVEL_SLOTS,
  HUB_ROOM_DEFINITIONS,
  HUB_STARTER_ROOMS,
  HUB_TECH_GATED_ROOMS,
} from "../../../data/constants.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";

// ── Factories ───────────────────────────────────────────────

const ALL_ROOM_TYPES: HubRoomType[] = Object.values(HubRoomType);

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

function makeTech(completedTechIds: string[] = []): TechState {
  return {
    researchPoints: 0,
    completedTechIds,
    currentResearchId: null,
    researchProgress: 0,
  };
}

function makeHyperlanes(): Hyperlane[] {
  return [
    { id: "hl-1", systemA: "sys-1", systemB: "sys-2", distance: 5 },
    { id: "hl-2", systemA: "sys-1", systemB: "sys-3", distance: 8 },
    { id: "hl-3", systemA: "sys-2", systemB: "sys-4", distance: 6 },
  ];
}

// ── Tests ───────────────────────────────────────────────────

describe("createEmptyHub", () => {
  it("creates a level 0 hub with no rooms", () => {
    const hub = createEmptyHub("sys-1", "emp-1", ALL_ROOM_TYPES);
    expect(hub.level).toBe(0);
    expect(hub.rooms).toEqual([]);
    expect(hub.systemId).toBe("sys-1");
    expect(hub.empireId).toBe("emp-1");
    expect(hub.availableRoomTypes).toEqual(ALL_ROOM_TYPES);
  });
});

describe("selectRunRoomTypes", () => {
  it("always includes starter rooms", () => {
    const rng = new SeededRNG(42);
    const types = selectRunRoomTypes(rng);
    for (const starter of HUB_STARTER_ROOMS) {
      expect(types).toContain(starter);
    }
  });

  it("selects a fixed number of tech-gated rooms", () => {
    const rng = new SeededRNG(42);
    const types = selectRunRoomTypes(rng);
    const techRooms = types.filter((t) => !HUB_STARTER_ROOMS.includes(t));
    expect(techRooms.length).toBe(6); // HUB_TECH_ROOMS_PER_RUN
  });

  it("is deterministic with same seed", () => {
    const a = selectRunRoomTypes(new SeededRNG(123));
    const b = selectRunRoomTypes(new SeededRNG(123));
    expect(a).toEqual(b);
  });

  it("varies with different seeds", () => {
    const a = selectRunRoomTypes(new SeededRNG(1));
    const b = selectRunRoomTypes(new SeededRNG(999));
    // Starters are the same, but tech rooms likely differ
    const aTech = a.filter((t) => !HUB_STARTER_ROOMS.includes(t));
    const bTech = b.filter((t) => !HUB_STARTER_ROOMS.includes(t));
    // Very unlikely to be identical with different seeds on 8-choose-6
    expect(aTech).not.toEqual(bTech);
  });

  it("only selects from the tech-gated pool", () => {
    const rng = new SeededRNG(55);
    const types = selectRunRoomTypes(rng);
    const techRooms = types.filter((t) => !HUB_STARTER_ROOMS.includes(t));
    for (const r of techRooms) {
      expect(HUB_TECH_GATED_ROOMS).toContain(r);
    }
  });
});

describe("getAvailableSlots", () => {
  it("returns full slots for empty hub", () => {
    const hub = makeHub();
    expect(getAvailableSlots(hub)).toBe(HUB_LEVEL_SLOTS[0]);
  });

  it("decreases as rooms are added", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 }],
    });
    expect(getAvailableSlots(hub)).toBe(HUB_LEVEL_SLOTS[0] - 1);
  });
});

describe("getHubUpkeep", () => {
  it("returns 0 for empty hub", () => {
    expect(getHubUpkeep(makeHub())).toBe(0);
  });

  it("sums room upkeep costs", () => {
    const hub = makeHub({
      rooms: [
        { id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 },
        { id: "r2", type: HubRoomType.PassengerLounge, gridX: 1, gridY: 0 },
      ],
    });
    const expected =
      HUB_ROOM_DEFINITIONS[HubRoomType.TradeOffice].upkeepCost +
      HUB_ROOM_DEFINITIONS[HubRoomType.PassengerLounge].upkeepCost;
    expect(getHubUpkeep(hub)).toBe(expected);
  });
});

describe("canBuildRoom", () => {
  it("allows building when all conditions met", () => {
    const hub = makeHub();
    const result = canBuildRoom(hub, HubRoomType.TradeOffice, [], 100000);
    expect(result.canBuild).toBe(true);
  });

  it("rejects unavailable room type", () => {
    const hub = makeHub({ availableRoomTypes: [HubRoomType.TradeOffice] });
    const result = canBuildRoom(hub, HubRoomType.FuelDepot, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("not available");
  });

  it("rejects when tech requirement not met", () => {
    const hub = makeHub();
    const result = canBuildRoom(hub, HubRoomType.OreProcessing, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("tech");
  });

  it("allows when tech requirement met", () => {
    const hub = makeHub();
    const result = canBuildRoom(
      hub,
      HubRoomType.OreProcessing,
      ["logistics_1"],
      100000,
    );
    expect(result.canBuild).toBe(true);
  });

  it("rejects when room limit reached", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 }],
    });
    // Trade Office has limit 1
    const result = canBuildRoom(hub, HubRoomType.TradeOffice, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("Limit");
  });

  it("rejects when no slots available", () => {
    // Fill all 4 slots at level 0
    const rooms = Array.from({ length: HUB_LEVEL_SLOTS[0] }, (_, i) => ({
      id: `r${i}`,
      type: HubRoomType.RepairBay as HubRoomType,
      gridX: i,
      gridY: 0,
    }));
    const hub = makeHub({ rooms });
    const result = canBuildRoom(hub, HubRoomType.TradeOffice, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("slots");
  });

  it("rejects when insufficient cash", () => {
    const hub = makeHub();
    const result = canBuildRoom(hub, HubRoomType.TradeOffice, [], 5);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("cash");
  });
});

describe("buildRoom", () => {
  it("places a room and returns cost", () => {
    const hub = makeHub();
    const tech = makeTech();
    const result = buildRoom(hub, HubRoomType.TradeOffice, 0, 0, 100000, tech);
    expect(result).not.toBeNull();
    expect(result!.hub.rooms).toHaveLength(1);
    expect(result!.hub.rooms[0].type).toBe(HubRoomType.TradeOffice);
    expect(result!.hub.rooms[0].gridX).toBe(0);
    expect(result!.hub.rooms[0].gridY).toBe(0);
    expect(result!.cost).toBe(
      HUB_ROOM_DEFINITIONS[HubRoomType.TradeOffice].buildCost,
    );
  });

  it("rejects out-of-bounds grid position", () => {
    const hub = makeHub();
    const tech = makeTech();
    expect(
      buildRoom(hub, HubRoomType.TradeOffice, -1, 0, 100000, tech),
    ).toBeNull();
    expect(
      buildRoom(hub, HubRoomType.TradeOffice, 6, 0, 100000, tech),
    ).toBeNull();
    expect(
      buildRoom(hub, HubRoomType.TradeOffice, 0, -1, 100000, tech),
    ).toBeNull();
    expect(
      buildRoom(hub, HubRoomType.TradeOffice, 0, 4, 100000, tech),
    ).toBeNull();
  });

  it("rejects occupied grid cell", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 2, gridY: 1 }],
    });
    const tech = makeTech();
    const result = buildRoom(
      hub,
      HubRoomType.PassengerLounge,
      2,
      1,
      100000,
      tech,
    );
    expect(result).toBeNull();
  });

  it("does not mutate original hub", () => {
    const hub = makeHub();
    const tech = makeTech();
    const result = buildRoom(hub, HubRoomType.TradeOffice, 0, 0, 100000, tech);
    expect(hub.rooms).toHaveLength(0);
    expect(result!.hub.rooms).toHaveLength(1);
  });
});

describe("demolishRoom", () => {
  it("removes room and returns refund", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 }],
    });
    const result = demolishRoom(hub, "r1");
    expect(result).not.toBeNull();
    expect(result!.hub.rooms).toHaveLength(0);
    expect(result!.refund).toBe(
      Math.floor(HUB_ROOM_DEFINITIONS[HubRoomType.TradeOffice].buildCost * 0.5),
    );
  });

  it("returns null for non-existent room", () => {
    const hub = makeHub();
    expect(demolishRoom(hub, "nonexistent")).toBeNull();
  });

  it("does not mutate original hub", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.TradeOffice, gridX: 0, gridY: 0 }],
    });
    demolishRoom(hub, "r1");
    expect(hub.rooms).toHaveLength(1);
  });
});

describe("upgradeHub", () => {
  it("upgrades hub level and returns cost", () => {
    const hub = makeHub();
    const result = upgradeHub(hub, 50000);
    expect(result).not.toBeNull();
    expect(result!.hub.level).toBe(1);
    expect(result!.cost).toBe(25000);
  });

  it("returns null when at max level", () => {
    const hub = makeHub({ level: 4 });
    expect(upgradeHub(hub, 999999)).toBeNull();
  });

  it("returns null when insufficient cash", () => {
    const hub = makeHub();
    expect(upgradeHub(hub, 100)).toBeNull();
  });

  it("does not mutate original hub", () => {
    const hub = makeHub();
    upgradeHub(hub, 50000);
    expect(hub.level).toBe(0);
  });
});

describe("getHyperlaneNeighbors", () => {
  it("returns connected systems", () => {
    const hyperlanes = makeHyperlanes();
    const neighbors = getHyperlaneNeighbors("sys-1", hyperlanes);
    expect(neighbors).toContain("sys-2");
    expect(neighbors).toContain("sys-3");
    expect(neighbors).not.toContain("sys-4");
  });

  it("works for both directions", () => {
    const hyperlanes = makeHyperlanes();
    const neighbors = getHyperlaneNeighbors("sys-2", hyperlanes);
    expect(neighbors).toContain("sys-1");
    expect(neighbors).toContain("sys-4");
  });
});

describe("isSystemInHubRadius", () => {
  it("returns true for hub system itself", () => {
    expect(isSystemInHubRadius("sys-1", "sys-1", makeHyperlanes())).toBe(true);
  });

  it("returns true for 1-hop neighbors", () => {
    expect(isSystemInHubRadius("sys-1", "sys-2", makeHyperlanes())).toBe(true);
  });

  it("returns false for 2-hop systems", () => {
    expect(isSystemInHubRadius("sys-1", "sys-4", makeHyperlanes())).toBe(false);
  });

  it("returns false for unconnected systems", () => {
    expect(isSystemInHubRadius("sys-1", "sys-99", makeHyperlanes())).toBe(
      false,
    );
  });
});

// ── Terminal Functions ──────────────────────────────────────

describe("isTerminalRoom", () => {
  it("returns true for SimpleTerminal", () => {
    expect(isTerminalRoom(HubRoomType.SimpleTerminal)).toBe(true);
  });

  it("returns true for ImprovedTerminal", () => {
    expect(isTerminalRoom(HubRoomType.ImprovedTerminal)).toBe(true);
  });

  it("returns true for AdvancedTerminal", () => {
    expect(isTerminalRoom(HubRoomType.AdvancedTerminal)).toBe(true);
  });

  it("returns false for non-terminal rooms", () => {
    expect(isTerminalRoom(HubRoomType.TradeOffice)).toBe(false);
    expect(isTerminalRoom(HubRoomType.FuelDepot)).toBe(false);
    expect(isTerminalRoom(HubRoomType.RepairBay)).toBe(false);
  });
});

describe("initializeHubWithTerminal", () => {
  it("adds SimpleTerminal at (0,0)", () => {
    const hub = createEmptyHub("sys-1", "emp-1", ALL_ROOM_TYPES);
    const result = initializeHubWithTerminal(hub);
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].type).toBe(HubRoomType.SimpleTerminal);
    expect(result.rooms[0].gridX).toBe(0);
    expect(result.rooms[0].gridY).toBe(0);
  });

  it("does not mutate original hub", () => {
    const hub = createEmptyHub("sys-1", "emp-1", ALL_ROOM_TYPES);
    initializeHubWithTerminal(hub);
    expect(hub.rooms).toHaveLength(0);
  });
});

describe("getTerminalUpgrade", () => {
  it("returns ImprovedTerminal upgrade for SimpleTerminal", () => {
    const upgrade = getTerminalUpgrade(HubRoomType.SimpleTerminal);
    expect(upgrade).not.toBeNull();
    expect(upgrade!.to).toBe(HubRoomType.ImprovedTerminal);
    expect(upgrade!.cost).toBe(15000);
  });

  it("returns AdvancedTerminal upgrade for ImprovedTerminal", () => {
    const upgrade = getTerminalUpgrade(HubRoomType.ImprovedTerminal);
    expect(upgrade).not.toBeNull();
    expect(upgrade!.to).toBe(HubRoomType.AdvancedTerminal);
    expect(upgrade!.cost).toBe(35000);
  });

  it("returns null for AdvancedTerminal (max level)", () => {
    expect(getTerminalUpgrade(HubRoomType.AdvancedTerminal)).toBeNull();
  });

  it("returns null for non-terminal room types", () => {
    expect(getTerminalUpgrade(HubRoomType.TradeOffice)).toBeNull();
    expect(getTerminalUpgrade(HubRoomType.FuelDepot)).toBeNull();
  });
});

describe("upgradeTerminal", () => {
  it("upgrades SimpleTerminal to ImprovedTerminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.SimpleTerminal, gridX: 0, gridY: 0 },
      ],
    });
    const result = upgradeTerminal(hub, "t1", 50000);
    expect(result).not.toBeNull();
    expect(result!.hub.rooms[0].type).toBe(HubRoomType.ImprovedTerminal);
    expect(result!.cost).toBe(15000);
  });

  it("upgrades ImprovedTerminal to AdvancedTerminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.ImprovedTerminal, gridX: 0, gridY: 0 },
      ],
    });
    const result = upgradeTerminal(hub, "t1", 50000);
    expect(result).not.toBeNull();
    expect(result!.hub.rooms[0].type).toBe(HubRoomType.AdvancedTerminal);
    expect(result!.cost).toBe(35000);
  });

  it("returns null for max-level terminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.AdvancedTerminal, gridX: 0, gridY: 0 },
      ],
    });
    expect(upgradeTerminal(hub, "t1", 99999)).toBeNull();
  });

  it("returns null when insufficient cash", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.SimpleTerminal, gridX: 0, gridY: 0 },
      ],
    });
    expect(upgradeTerminal(hub, "t1", 100)).toBeNull();
  });

  it("returns null for non-existent room id", () => {
    const hub = makeHub();
    expect(upgradeTerminal(hub, "nope", 50000)).toBeNull();
  });

  it("does not mutate original hub", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.SimpleTerminal, gridX: 0, gridY: 0 },
      ],
    });
    upgradeTerminal(hub, "t1", 50000);
    expect(hub.rooms[0].type).toBe(HubRoomType.SimpleTerminal);
  });
});

describe("canBuildRoom — upgrade-only rejection", () => {
  it("rejects ImprovedTerminal as upgrade-only", () => {
    const hub = makeHub();
    const result = canBuildRoom(hub, HubRoomType.ImprovedTerminal, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("Upgrade only");
  });

  it("rejects AdvancedTerminal as upgrade-only", () => {
    const hub = makeHub();
    const result = canBuildRoom(hub, HubRoomType.AdvancedTerminal, [], 100000);
    expect(result.canBuild).toBe(false);
    expect(result.reason).toContain("Upgrade only");
  });
});

describe("demolishRoom — terminal protection", () => {
  it("returns null when trying to demolish SimpleTerminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.SimpleTerminal, gridX: 0, gridY: 0 },
      ],
    });
    expect(demolishRoom(hub, "t1")).toBeNull();
  });

  it("returns null when trying to demolish ImprovedTerminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.ImprovedTerminal, gridX: 0, gridY: 0 },
      ],
    });
    expect(demolishRoom(hub, "t1")).toBeNull();
  });

  it("returns null when trying to demolish AdvancedTerminal", () => {
    const hub = makeHub({
      rooms: [
        { id: "t1", type: HubRoomType.AdvancedTerminal, gridX: 0, gridY: 0 },
      ],
    });
    expect(demolishRoom(hub, "t1")).toBeNull();
  });

  it("still allows demolishing non-terminal rooms", () => {
    const hub = makeHub({
      rooms: [{ id: "r1", type: HubRoomType.FuelDepot, gridX: 1, gridY: 0 }],
    });
    const result = demolishRoom(hub, "r1");
    expect(result).not.toBeNull();
    expect(result!.hub.rooms).toHaveLength(0);
  });
});
