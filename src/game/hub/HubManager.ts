import type {
  StationHub,
  HubRoom,
  HubRoomType,
  HubRoomDefinition,
  TechState,
  Hyperlane,
} from "../../data/types";
import {
  HUB_UPGRADE_COSTS,
  HUB_LEVEL_SLOTS,
  HUB_MAX_LEVEL,
  HUB_GRID_DECKS,
  HUB_GRID_SLOTS_PER_DECK,
  HUB_ROOM_DEFINITIONS,
  HUB_DEMOLISH_REFUND_RATIO,
  HUB_STARTER_ROOMS,
  HUB_TECH_GATED_ROOMS,
  HUB_TECH_ROOMS_PER_RUN,
  TERMINAL_ROOM_TYPES,
  HUB_UPGRADE_ONLY_ROOMS,
  SIMPLE_TERMINAL_UPGRADES,
} from "../../data/constants";
import type { SeededRNG } from "../../utils/SeededRNG";

/** Create a fresh Level 0 hub with no rooms */
export function createEmptyHub(
  systemId: string,
  empireId: string,
  availableRoomTypes: HubRoomType[],
): StationHub {
  return {
    level: 0,
    rooms: [],
    systemId,
    empireId,
    availableRoomTypes,
  };
}

/** Select room types available for this run (starters + random tech-gated) */
export function selectRunRoomTypes(rng: SeededRNG): HubRoomType[] {
  const techPool = [...HUB_TECH_GATED_ROOMS];
  rng.shuffle(techPool);
  const selected = techPool.slice(0, HUB_TECH_ROOMS_PER_RUN);
  return [...HUB_STARTER_ROOMS, ...selected];
}

/** Get the number of available grid slots at the hub's current level */
export function getAvailableSlots(hub: StationHub): number {
  return HUB_LEVEL_SLOTS[hub.level] - hub.rooms.length;
}

/** Get total upkeep cost for all rooms in the hub */
export function getHubUpkeep(hub: StationHub): number {
  let total = 0;
  for (const room of hub.rooms) {
    const def = HUB_ROOM_DEFINITIONS[room.type];
    total += def.upkeepCost;
  }
  return total;
}

/** Check if a grid cell is occupied */
function isGridCellOccupied(
  hub: StationHub,
  gridX: number,
  gridY: number,
): boolean {
  return hub.rooms.some((r) => r.gridX === gridX && r.gridY === gridY);
}

/** Validation result for room placement */
export interface CanBuildResult {
  canBuild: boolean;
  reason: string;
}

/** Check whether a room type can be built (ignoring grid position) */
export function canBuildRoom(
  hub: StationHub,
  roomType: HubRoomType,
  completedTechIds: string[],
  cash: number,
): CanBuildResult {
  const def = HUB_ROOM_DEFINITIONS[roomType];

  // Upgrade-only rooms cannot be built directly
  if (HUB_UPGRADE_ONLY_ROOMS.includes(roomType)) {
    return { canBuild: false, reason: "Upgrade only" };
  }

  if (!hub.availableRoomTypes.includes(roomType)) {
    return { canBuild: false, reason: "Room not available this run" };
  }

  if (def.techRequirement && !completedTechIds.includes(def.techRequirement)) {
    return { canBuild: false, reason: `Requires tech: ${def.techRequirement}` };
  }

  const existingCount = hub.rooms.filter((r) => r.type === roomType).length;
  if (existingCount >= def.limit) {
    return { canBuild: false, reason: `Limit reached (${def.limit})` };
  }

  if (getAvailableSlots(hub) <= 0) {
    return { canBuild: false, reason: "No available slots — upgrade hub" };
  }

  if (cash < def.buildCost) {
    return {
      canBuild: false,
      reason: `Not enough cash (need ${def.buildCost})`,
    };
  }

  return { canBuild: true, reason: "OK" };
}

/** Build a room at a grid position. Returns updated hub and cost, or null on failure. */
export function buildRoom(
  hub: StationHub,
  roomType: HubRoomType,
  gridX: number,
  gridY: number,
  cash: number,
  tech: TechState,
): { hub: StationHub; cost: number } | null {
  if (
    gridX < 0 ||
    gridX >= HUB_GRID_SLOTS_PER_DECK ||
    gridY < 0 ||
    gridY >= HUB_GRID_DECKS
  ) {
    return null;
  }

  if (isGridCellOccupied(hub, gridX, gridY)) {
    return null;
  }

  const check = canBuildRoom(hub, roomType, tech.completedTechIds, cash);
  if (!check.canBuild) return null;

  const def = HUB_ROOM_DEFINITIONS[roomType];
  const newRoom: HubRoom = {
    id: `room_${gridX}_${gridY}_${Date.now()}`,
    type: roomType,
    gridX,
    gridY,
  };

  return {
    hub: {
      ...hub,
      rooms: [...hub.rooms, newRoom],
    },
    cost: def.buildCost,
  };
}

/** Demolish a room by ID. Returns updated hub and refund amount, or null if not found or non-demolishable. */
export function demolishRoom(
  hub: StationHub,
  roomId: string,
): { hub: StationHub; refund: number } | null {
  const room = hub.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  // Terminal rooms cannot be demolished
  if (isTerminalRoom(room.type)) return null;

  const def = HUB_ROOM_DEFINITIONS[room.type];
  return {
    hub: {
      ...hub,
      rooms: hub.rooms.filter((r) => r.id !== roomId),
    },
    refund: Math.floor(def.buildCost * HUB_DEMOLISH_REFUND_RATIO),
  };
}

/** Upgrade hub to the next level. Returns updated hub and cost, or null if max/insufficient cash. */
export function upgradeHub(
  hub: StationHub,
  cash: number,
): { hub: StationHub; cost: number } | null {
  const nextLevel = hub.level + 1;
  if (nextLevel > HUB_MAX_LEVEL) return null;

  const cost = HUB_UPGRADE_COSTS[nextLevel];
  if (cash < cost) return null;

  return {
    hub: { ...hub, level: nextLevel },
    cost,
  };
}

/** Get hyperlane neighbors (systems 1 hop away from a given system) */
export function getHyperlaneNeighbors(
  systemId: string,
  hyperlanes: Hyperlane[],
): string[] {
  const neighbors: string[] = [];
  for (const hl of hyperlanes) {
    if (hl.systemA === systemId) neighbors.push(hl.systemB);
    else if (hl.systemB === systemId) neighbors.push(hl.systemA);
  }
  return neighbors;
}

/** Check whether a target system is the hub system or within 1 hyperlane hop */
export function isSystemInHubRadius(
  hubSystemId: string,
  targetSystemId: string,
  hyperlanes: Hyperlane[],
): boolean {
  if (hubSystemId === targetSystemId) return true;
  return getHyperlaneNeighbors(hubSystemId, hyperlanes).includes(
    targetSystemId,
  );
}

/** Get the room definition for a room type */
export function getRoomDefinition(roomType: HubRoomType): HubRoomDefinition {
  return HUB_ROOM_DEFINITIONS[roomType];
}

/** Check if a room type is a terminal (SimpleTerminal upgrade chain) */
export function isTerminalRoom(roomType: HubRoomType): boolean {
  return TERMINAL_ROOM_TYPES.includes(roomType);
}

/** Pre-build SimpleTerminal at position (0,0) in a fresh hub */
export function initializeHubWithTerminal(hub: StationHub): StationHub {
  const terminalRoom: HubRoom = {
    id: `room_0_0_terminal`,
    type: "simpleTerminal" as HubRoomType,
    gridX: 0,
    gridY: 0,
  };
  return {
    ...hub,
    rooms: [terminalRoom],
  };
}

/** Get the available terminal upgrade for a room, or null if fully upgraded */
export function getTerminalUpgrade(
  roomType: HubRoomType,
): { to: HubRoomType; cost: number } | null {
  const upgrade = SIMPLE_TERMINAL_UPGRADES.find((u) => u.from === roomType);
  return upgrade ? { to: upgrade.to, cost: upgrade.cost } : null;
}

/** Upgrade a terminal room in-place. Returns updated hub and cost, or null on failure. */
export function upgradeTerminal(
  hub: StationHub,
  roomId: string,
  cash: number,
): { hub: StationHub; cost: number } | null {
  const room = hub.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const upgrade = getTerminalUpgrade(room.type);
  if (!upgrade) return null;
  if (cash < upgrade.cost) return null;

  const updatedRooms = hub.rooms.map((r) =>
    r.id === roomId ? { ...r, type: upgrade.to } : r,
  );

  return {
    hub: { ...hub, rooms: updatedRooms },
    cost: upgrade.cost,
  };
}
