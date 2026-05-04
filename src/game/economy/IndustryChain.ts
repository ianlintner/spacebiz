import type {
  Planet,
  ActiveRoute,
  PlanetType,
  CargoType,
} from "../../data/types.ts";
import {
  PLANET_INDUSTRY_INPUT,
  PLANET_CARGO_PROFILES,
} from "../../data/constants.ts";

export function getInputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_INDUSTRY_INPUT[planetType] ?? null;
}

// NOTE: returns only the primary output (produces[0]). Secondary outputs (e.g. Mining's Hazmat)
// are not boosted. Safe today because no multi-output planet has an industry input requirement.
export function getOutputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_CARGO_PROFILES[planetType]?.produces[0] ?? null;
}

/**
 * Returns the set of producer planet IDs whose industry input is active this
 * turn. A producer's input is active when any non-paused route delivers the
 * required input cargo to any planet in the same system as the producer.
 */
export function getActiveProducers(
  planets: Planet[],
  allRoutes: ActiveRoute[],
): Set<string> {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  const activeRoutes = allRoutes.filter((r) => !r.paused);

  const activeProducers = new Set<string>();

  for (const planet of planets) {
    const inputCargo = getInputCargo(planet.type);
    if (inputCargo === null) continue;

    const hasInputRoute = activeRoutes.some(
      (r) =>
        r.cargoType === inputCargo &&
        planetById.get(r.destinationPlanetId)?.systemId === planet.systemId,
    );

    if (hasInputRoute) {
      activeProducers.add(planet.id);
    }
  }

  return activeProducers;
}
