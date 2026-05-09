import type { Empire, Planet, SpecialId } from "../data/types.ts";
import { SPECIALS } from "../data/specialResources.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export interface SpecialPlacementResult {
  placed: Array<{ specialId: SpecialId; empireId: string; planetId: string }>;
  skipped: SpecialId[];
}

export function placeSpecials(opts: {
  empires: Empire[];
  systems: Array<{
    id: string;
    empireId: string;
    x: number;
    y: number;
    name: string;
  }>;
  planets: Planet[];
  rng: SeededRNG;
}): SpecialPlacementResult {
  const { empires, systems, planets, rng } = opts;
  const placed: SpecialPlacementResult["placed"] = [];
  const skipped: SpecialId[] = [];

  // Build system → empire lookup
  const systemToEmpire = new Map<string, string>();
  for (const sys of systems) {
    systemToEmpire.set(sys.id, sys.empireId);
  }

  // Build empire → system count (for weighting)
  const empireSysCounts = new Map<string, number>();
  for (const emp of empires) {
    empireSysCounts.set(emp.id, 0);
  }
  for (const sys of systems) {
    empireSysCounts.set(
      sys.empireId,
      (empireSysCounts.get(sys.empireId) ?? 0) + 1,
    );
  }

  // Track already-used planets (each planet can hold at most one special)
  const usedPlanets = new Set<string>();

  for (const special of Object.values(SPECIALS)) {
    // Find all candidate planets of the correct parent type
    const candidates = planets.filter(
      (p) => p.type === special.parentPlanetType && !usedPlanets.has(p.id),
    );

    if (candidates.length === 0) {
      skipped.push(special.id);
      continue;
    }

    // Weight candidates by empire territory size
    const weights = candidates.map((p) => {
      const empId = systemToEmpire.get(p.systemId) ?? "";
      return empireSysCounts.get(empId) ?? 1;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Weighted random selection
    let pick = rng.nextFloat(0, totalWeight);
    let chosenIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const chosenPlanet = candidates[chosenIdx];
    const empireId = systemToEmpire.get(chosenPlanet.systemId) ?? empires[0].id;

    // Stamp the planet
    chosenPlanet.specialResource = special.id;
    usedPlanets.add(chosenPlanet.id);

    // Add to empire
    const empire = empires.find((e) => e.id === empireId);
    if (empire) {
      empire.ownedSpecials.push(special.id);
    }

    placed.push({ specialId: special.id, empireId, planetId: chosenPlanet.id });
  }

  return { placed, skipped };
}
