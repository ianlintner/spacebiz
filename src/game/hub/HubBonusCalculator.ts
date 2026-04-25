import type { StationHub, HubBonusEffect, Hyperlane } from "../../data/types";
import { HUB_ROOM_DEFINITIONS, HUB_RADIUS_FALLOFF } from "../../data/constants";
import { getHyperlaneNeighbors } from "./HubManager";

// ── Internal helpers ────────────────────────────────────────

/** Collect all bonus effects from built rooms, optionally filtered by effect type */
function collectEffects(
  hub: StationHub,
  effectType?: HubBonusEffect["type"],
): HubBonusEffect[] {
  const effects: HubBonusEffect[] = [];
  for (const room of hub.rooms) {
    const def = HUB_ROOM_DEFINITIONS[room.type];
    for (const e of def.bonusEffects) {
      if (!effectType || e.type === effectType) {
        effects.push(e);
      }
    }
  }
  return effects;
}

/** Sum bonus values for a specific effect type across all rooms */
function sumEffect(
  hub: StationHub,
  effectType: HubBonusEffect["type"],
): number {
  let total = 0;
  for (const effect of collectEffects(hub, effectType)) {
    total += effect.value;
  }
  return total;
}

/**
 * Get the radius multiplier for a system relative to the hub.
 * Returns 1.0 for hub system, HUB_RADIUS_FALLOFF for 1-hop neighbors, 0 otherwise.
 */
function getRadiusMultiplier(
  hubSystemId: string,
  targetSystemId: string,
  hyperlanes: Hyperlane[],
): number {
  if (hubSystemId === targetSystemId) return 1.0;
  const neighbors = getHyperlaneNeighbors(hubSystemId, hyperlanes);
  if (neighbors.includes(targetSystemId)) return HUB_RADIUS_FALLOFF;
  return 0;
}

/**
 * Check if any built room provides a specific effect type.
 */
function hasEffect(
  hub: StationHub,
  effectType: HubBonusEffect["type"],
): boolean {
  return hub.rooms.some((r) => {
    const def = HUB_ROOM_DEFINITIONS[r.type];
    return def.bonusEffects.some((e) => e.type === effectType);
  });
}

// ── Empire-wide multipliers (apply to all routes / activity) ──

/** License fee multiplier: 1.0 base, reduced by Trade Office */
export function getLicenseFeeMultiplier(hub: StationHub | null): number {
  if (!hub) return 1.0;
  return 1.0 + sumEffect(hub, "modifyLicenseFee");
}

/** Revenue multiplier: 1.0 base, boosted by Market Exchange */
export function getRevenueMultiplier(hub: StationHub | null): number {
  if (!hub) return 1.0;
  return 1.0 + sumEffect(hub, "modifyRevenue");
}

/** Tariff multiplier: 1.0 base, reduced by Customs Bureau */
export function getTariffMultiplier(hub: StationHub | null): number {
  if (!hub) return 1.0;
  return 1.0 + sumEffect(hub, "modifyTariff");
}

/** Extra route slots from Freight Terminal */
export function getRouteSlotBonus(hub: StationHub | null): number {
  if (!hub) return 0;
  return sumEffect(hub, "addRouteSlots");
}

/** Extra RP per turn from Research Lab */
export function getRPBonus(hub: StationHub | null): number {
  if (!hub) return 0;
  return sumEffect(hub, "addRPPerTurn");
}

// ── Local + radius multipliers (depend on system proximity) ──

/** Passenger revenue multiplier for a specific system */
export function getPassengerRevenueMultiplier(
  hub: StationHub | null,
  systemId: string,
  hyperlanes: Hyperlane[],
): number {
  if (!hub) return 1.0;
  if (!hasEffect(hub, "modifyPassengerRevenue")) return 1.0;
  const radius = getRadiusMultiplier(hub.systemId, systemId, hyperlanes);
  if (radius === 0) return 1.0;
  const bonus = sumEffect(hub, "modifyPassengerRevenue");
  return 1.0 + bonus * radius;
}

/** Fuel cost multiplier for a route passing through specific systems */
export function getFuelMultiplier(
  hub: StationHub | null,
  routeSystemIds: string[],
  hyperlanes: Hyperlane[],
): number {
  if (!hub) return 1.0;
  if (!hasEffect(hub, "modifyFuel")) return 1.0;
  // Check if any system on the route is in hub radius
  let bestRadius = 0;
  for (const sysId of routeSystemIds) {
    const r = getRadiusMultiplier(hub.systemId, sysId, hyperlanes);
    if (r > bestRadius) bestRadius = r;
  }
  if (bestRadius === 0) return 1.0;
  const bonus = sumEffect(hub, "modifyFuel");
  return 1.0 + bonus * bestRadius;
}

/** Saturation impact multiplier for a specific system */
export function getSaturationMultiplier(
  hub: StationHub | null,
  systemId: string,
  hyperlanes: Hyperlane[],
): number {
  if (!hub) return 1.0;
  if (!hasEffect(hub, "modifySaturation")) return 1.0;
  const radius = getRadiusMultiplier(hub.systemId, systemId, hyperlanes);
  if (radius === 0) return 1.0;
  const bonus = sumEffect(hub, "modifySaturation");
  return 1.0 + bonus * radius;
}

// ── Local-only bonuses (hub system only) ────────────────────

/** Repair per turn bonus for ships at a specific system */
export function getRepairBonus(
  hub: StationHub | null,
  systemId: string,
): number {
  if (!hub) return 0;
  if (systemId !== hub.systemId) return 0;
  return sumEffect(hub, "addRepairPerTurn");
}

// ── AI debuffs ──────────────────────────────────────────────

/** AI revenue debuff from Security Office (negative = reduction) */
export function getAIRevenueDebuff(hub: StationHub | null): number {
  if (!hub) return 0;
  return sumEffect(hub, "modifyAIRevenue");
}

/** AI maintenance increase from Security Office (positive = increase) */
export function getAIMaintenanceDebuff(hub: StationHub | null): number {
  if (!hub) return 0;
  return sumEffect(hub, "modifyAIMaintenance");
}
