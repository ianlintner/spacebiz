import type { ActiveRoute, StarSystem, Empire, DiplomaticRelation } from "../../data/types.ts";
import { getReputationTariffMultiplier } from "../reputation/ReputationEffects.ts";

/**
 * Calculate the tariff cost for a route if it crosses empire borders.
 * Tariff = revenue × destination empire's tariffRate (only if origin and
 * destination are in different empires).
 * Optionally applies a reputation-based surcharge for low-rep players.
 */
export function calculateTariff(
  route: ActiveRoute,
  revenue: number,
  ownerEmpireId: string,
  systems: StarSystem[],
  empires: Empire[],
  reputation?: number,
  diplomaticRelations?: DiplomaticRelation[],
): number {
  const originPlanetSystemId = findSystemForPlanet(
    route.originPlanetId,
    systems,
  );
  const destPlanetSystemId = findSystemForPlanet(
    route.destinationPlanetId,
    systems,
  );

  if (!originPlanetSystemId || !destPlanetSystemId) return 0;

  const originSystem = systems.find((s) => s.id === originPlanetSystemId);
  const destSystem = systems.find((s) => s.id === destPlanetSystemId);

  if (!originSystem || !destSystem) return 0;

  // Same empire — no tariff
  if (originSystem.empireId === destSystem.empireId) return 0;

  // Find the destination empire's tariff rate
  // If the owner is in the dest empire, use the origin empire's tariff instead
  const crossingEmpireId =
    destSystem.empireId === ownerEmpireId
      ? originSystem.empireId
      : destSystem.empireId;

  const crossingEmpire = empires.find((e) => e.id === crossingEmpireId);
  if (!crossingEmpire) return 0;

  const baseTariff = revenue * crossingEmpire.tariffRate;

  // Apply reputation-based tariff surcharge for non-allied empires
  let repMult = 1.0;
  if (reputation !== undefined) {
    // Find the diplomatic status between owner's empire and the crossing empire
    let diplomaticStatus = 'peace';
    if (diplomaticRelations) {
      const relation = diplomaticRelations.find(
        (r) =>
          (r.empireA === ownerEmpireId && r.empireB === crossingEmpireId) ||
          (r.empireB === ownerEmpireId && r.empireA === crossingEmpireId),
      );
      if (relation) diplomaticStatus = relation.status;
    }
    repMult = getReputationTariffMultiplier(reputation, diplomaticStatus);
  }

  return Math.round(baseTariff * repMult * 100) / 100;
}

/**
 * Check if a route crosses empire borders.
 */
export function isInterEmpireRoute(
  originPlanetId: string,
  destPlanetId: string,
  systems: StarSystem[],
  planets: Array<{ id: string; systemId: string }>,
): boolean {
  const originPlanet = planets.find((p) => p.id === originPlanetId);
  const destPlanet = planets.find((p) => p.id === destPlanetId);
  if (!originPlanet || !destPlanet) return false;

  const originSystem = systems.find((s) => s.id === originPlanet.systemId);
  const destSystem = systems.find((s) => s.id === destPlanet.systemId);
  if (!originSystem || !destSystem) return false;

  return originSystem.empireId !== destSystem.empireId;
}

/**
 * Get the empire ID for a planet (via its system).
 */
export function getEmpireForPlanet(
  planetId: string,
  systems: StarSystem[],
  planets: Array<{ id: string; systemId: string }>,
): string | null {
  const planet = planets.find((p) => p.id === planetId);
  if (!planet) return null;
  const system = systems.find((s) => s.id === planet.systemId);
  return system?.empireId ?? null;
}

// Planet IDs encode system info: "planet-{sectorIdx}-{sysIdx}-{planetIdx}"
// Extract system ID from planet ID
function findSystemForPlanet(
  planetId: string,
  systems: StarSystem[],
): string | null {
  // Planet IDs: planet-{si}-{syi}-{pi} → system ID: system-{si}-{syi}
  const parts = planetId.split("-");
  if (parts.length >= 4 && parts[0] === "planet") {
    const systemId = `system-${parts[1]}-${parts[2]}`;
    const found = systems.find((s) => s.id === systemId);
    if (found) return found.id;
  }

  // Fallback: search all systems (AI route IDs may differ)
  // This shouldn't happen with current ID scheme, but safe fallback
  return systems[0]?.id ?? null;
}
