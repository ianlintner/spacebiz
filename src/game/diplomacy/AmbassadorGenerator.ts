import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  Ambassador,
  AmbassadorPersonality,
  AICompany,
  Empire,
  PortraitCategory,
} from "../../data/types.ts";
import { AMBASSADOR_PORTRAITS } from "../../data/ambassadorPortraits.ts";

const FIRST_NAMES = [
  "Alra",
  "Brent",
  "Caius",
  "Doru",
  "Elin",
  "Faro",
  "Galen",
  "Hess",
  "Ilo",
  "Jarn",
  "Kael",
  "Lyra",
  "Mira",
  "Noct",
  "Oso",
  "Pell",
  "Quin",
  "Rho",
];
const SURNAMES = [
  "Vex",
  "Korr",
  "Sallow",
  "Ridge",
  "Pell",
  "Drey",
  "Halloran",
  "Iskren",
  "Marsh",
  "Onaga",
  "Strel",
  "Volk",
];

const PERSONALITIES: readonly AmbassadorPersonality[] = [
  "formal",
  "mercenary",
  "suspicious",
  "warm",
];

/**
 * Pick a portrait id whose `category` matches the faction's. The catalog
 * has 12 entries (4 personalities × 3 categories), so within each category
 * subset there's exactly one portrait per personality. We pick a category-
 * matching portrait and inherit its personality so the visual matches the
 * dialog tone.
 *
 * If no portrait matches the category (catalog incomplete), fall back to
 * any portrait — category mismatch is preferable to crashing on a missing
 * texture.
 */
function pickPortraitForCategory(
  rng: SeededRNG,
  category: PortraitCategory,
): { portraitId: string; personality: AmbassadorPersonality } {
  const matching = AMBASSADOR_PORTRAITS.filter((p) => p.category === category);
  const pool = matching.length > 0 ? matching : AMBASSADOR_PORTRAITS;
  const def = rng.pick([...pool]);
  return { portraitId: def.id, personality: def.personality };
}

function makeAmbassador(
  rng: SeededRNG,
  category: PortraitCategory,
): Ambassador {
  const first = rng.pick([...FIRST_NAMES]);
  const last = rng.pick([...SURNAMES]);
  const { portraitId, personality } = pickPortraitForCategory(rng, category);
  return {
    name: `${first} ${last}`,
    portrait: { portraitId, category },
    personality,
  };
}

export function generateAmbassadors(
  rng: SeededRNG,
  empires: readonly Empire[],
  rivals: readonly AICompany[],
): {
  empireAmbassadors: Record<string, Ambassador>;
  rivalLiaisons: Record<string, Ambassador>;
} {
  const empireAmbassadors: Record<string, Ambassador> = {};
  const rivalLiaisons: Record<string, Ambassador> = {};
  // Ambassadors share the faction's portrait category (alien empires get
  // alien-presenting ambassadors, etc). The portrait id is picked from the
  // category-matched subset of the catalog, and the ambassador's
  // personality is inherited from the chosen portrait so visual + tone
  // stay aligned. Personality variety across the cast comes from the mix
  // of factions × the (category × personality) combinations the pool
  // exposes (currently 12 entries: 4 personalities × 3 categories).
  for (const e of empires) {
    empireAmbassadors[e.id] = makeAmbassador(rng, e.leaderPortrait.category);
  }
  for (const r of rivals) {
    rivalLiaisons[r.id] = makeAmbassador(rng, r.ceoPortrait.category);
  }
  return { empireAmbassadors, rivalLiaisons };
}

// Re-exported so callers/tests can iterate the personality union without
// importing from the types module directly.
export { PERSONALITIES };
