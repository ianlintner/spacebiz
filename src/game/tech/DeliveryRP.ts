import type { ActiveRoute, CargoType, GameState } from "../../data/types.ts";
import { calculateDistance } from "../routes/RouteManager.ts";
import { getEmpireForPlanet } from "../empire/EmpireAccessManager.ts";

const BASE_RP = 0.15;
const DISTANCE_DIVISOR = 10;
const DISTANCE_MIN = 0.5;
const DISTANCE_MAX = 2.0;
const EMPIRE_MULT_DOMESTIC = 1.0;
const EMPIRE_MULT_INTER = 1.5;

const CARGO_MULT_MAP: Record<CargoType, number> = {
  rawMaterials: 0.7,
  food: 0.7,
  medical: 1.0,
  hazmat: 1.0,
  passengers: 1.0,
  luxury: 1.5,
  technology: 2.0,
};

export function getCargoMult(cargoType: CargoType | null): number {
  if (cargoType === null) return 1.0;
  return CARGO_MULT_MAP[cargoType] ?? 1.0;
}

/**
 * Compute the research-point yield of a single active route for a single
 * turn, given the trips it actually performed. Returns 0 for paused or
 * non-delivering routes.
 *
 * Formula: `baseRP × cargoMult × distanceMult × empireMult × trips` where:
 *   - baseRP        = 0.15
 *   - cargoMult     ∈ [0.7, 2.0] per cargo tier
 *   - distanceMult  = clamp(0.5, 2.0, distance / 10)
 *   - empireMult    = 1.0 domestic, 1.5 inter-empire
 */
export function calculateRouteRP(
  route: ActiveRoute,
  trips: number,
  state: GameState,
): number {
  if (route.paused) return 0;
  if (trips <= 0) return 0;
  if (route.cargoType === null) return 0;

  const origin = state.galaxy.planets.find(
    (p) => p.id === route.originPlanetId,
  );
  const dest = state.galaxy.planets.find(
    (p) => p.id === route.destinationPlanetId,
  );
  if (!origin || !dest) return 0;

  const cargoMult = getCargoMult(route.cargoType);

  const distance = calculateDistance(
    origin,
    dest,
    state.galaxy.systems,
    state.hyperlanes,
    state.borderPorts,
  );
  const distanceMult = Math.min(
    DISTANCE_MAX,
    Math.max(DISTANCE_MIN, distance / DISTANCE_DIVISOR),
  );

  const originEmpire = getEmpireForPlanet(
    origin.id,
    state.galaxy.systems,
    state.galaxy.planets,
  );
  const destEmpire = getEmpireForPlanet(
    dest.id,
    state.galaxy.systems,
    state.galaxy.planets,
  );
  const empireMult =
    originEmpire !== null &&
    destEmpire !== null &&
    originEmpire !== "" &&
    destEmpire !== "" &&
    originEmpire !== destEmpire
      ? EMPIRE_MULT_INTER
      : EMPIRE_MULT_DOMESTIC;

  return BASE_RP * cargoMult * distanceMult * empireMult * trips;
}
