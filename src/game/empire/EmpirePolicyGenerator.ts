import { TradePolicyType, CargoType } from "../../data/types.ts";
import type {
  EmpireTradePolicyEntry,
  Empire,
  Planet,
  StarSystem,
  CargoType as CargoTypeT,
} from "../../data/types.ts";
import { PLANET_CARGO_PROFILES } from "../../data/constants.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Trade Policy Generation
// ---------------------------------------------------------------------------

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

/**
 * Produce the trade-policy map for every empire in the galaxy.
 * Policies are weighted: 40% open, 25% import-ban, 20% export-ban, 15% protectionist.
 */
export function generateEmpireTradePolicies(
  empires: Empire[],
  systems: StarSystem[],
  planets: Planet[],
  rng: SeededRNG,
): Record<string, EmpireTradePolicyEntry> {
  const policies: Record<string, EmpireTradePolicyEntry> = {};

  for (const empire of empires) {
    const roll = rng.next();
    let policyType: EmpireTradePolicyEntry["policy"];
    if (roll < 0.4) policyType = TradePolicyType.OpenTrade;
    else if (roll < 0.65) policyType = TradePolicyType.ImportBan;
    else if (roll < 0.85) policyType = TradePolicyType.ExportBan;
    else policyType = TradePolicyType.Protectionist;

    const empirePlanets = getEmpirePlanets(empire.id, systems, planets);
    const produces = getEmpireProduces(empirePlanets);
    const demands = getEmpireDemands(empirePlanets);

    let bannedImports: CargoTypeT[] = [];
    let bannedExports: CargoTypeT[] = [];
    let tariffSurcharge = 0;

    switch (policyType) {
      case TradePolicyType.ImportBan: {
        // Ban 1-2 cargo types the empire demands (protect local industry)
        const banCount = rng.nextInt(1, 2);
        bannedImports = pickBanTargets(rng, demands, banCount);
        break;
      }
      case TradePolicyType.ExportBan: {
        // Ban 1-2 cargo types the empire produces (strategic goods)
        const banCount = rng.nextInt(1, 2);
        bannedExports = pickBanTargets(rng, produces, banCount);
        break;
      }
      case TradePolicyType.Protectionist: {
        // Import ban on 2 types + 50% tariff surcharge
        bannedImports = pickBanTargets(rng, demands, 2);
        tariffSurcharge = 0.5;
        break;
      }
      default:
        // openTrade — no restrictions
        break;
    }

    policies[empire.id] = {
      policy: policyType,
      bannedImports,
      bannedExports,
      tariffSurcharge,
    };
  }

  return policies;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEmpirePlanets(
  empireId: string,
  systems: StarSystem[],
  planets: Planet[],
): Planet[] {
  const empireSystems = new Set(
    systems.filter((s) => s.empireId === empireId).map((s) => s.id),
  );
  return planets.filter((p) => empireSystems.has(p.systemId));
}

function getEmpireProduces(empirePlanets: Planet[]): CargoTypeT[] {
  const produced = new Set<CargoTypeT>();
  for (const planet of empirePlanets) {
    const profile = PLANET_CARGO_PROFILES[planet.type];
    for (const cargo of profile.produces) produced.add(cargo);
  }
  return [...produced];
}

function getEmpireDemands(empirePlanets: Planet[]): CargoTypeT[] {
  const demanded = new Set<CargoTypeT>();
  for (const planet of empirePlanets) {
    const profile = PLANET_CARGO_PROFILES[planet.type];
    for (const cargo of profile.demands) demanded.add(cargo);
  }
  return [...demanded];
}

function pickBanTargets(
  rng: SeededRNG,
  candidates: CargoTypeT[],
  count: number,
): CargoTypeT[] {
  if (candidates.length === 0) {
    // Fallback: pick from all cargo types excluding passengers
    const fallback = ALL_CARGO_TYPES.filter((c) => c !== CargoType.Passengers);
    return rng.shuffle([...fallback]).slice(0, count);
  }
  // Never ban passengers
  const eligible = candidates.filter((c) => c !== CargoType.Passengers);
  if (eligible.length === 0) return [];
  return rng.shuffle([...eligible]).slice(0, Math.min(count, eligible.length));
}
