import type { SeededRNG } from "../../utils/SeededRNG.ts";
import type {
  Ambassador,
  AmbassadorPersonality,
  AICompany,
  Empire,
  PortraitCategory,
} from "../../data/types.ts";

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
const PORTRAIT_IDS = [
  "amb-01",
  "amb-02",
  "amb-03",
  "amb-04",
  "amb-05",
  "amb-06",
  "amb-07",
  "amb-08",
];

function makeAmbassador(
  rng: SeededRNG,
  category: PortraitCategory,
): Ambassador {
  const first = rng.pick([...FIRST_NAMES]);
  const last = rng.pick([...SURNAMES]);
  return {
    name: `${first} ${last}`,
    portrait: { portraitId: rng.pick([...PORTRAIT_IDS]), category },
    personality: rng.pick([...PERSONALITIES]),
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
  // Ambassadors share the empire's leader portrait category (alien empires
  // get alien-presenting ambassadors, etc). The portrait *id* is sampled
  // from a separate pool so the ambassador is visually distinct from the
  // ruler — only the species/category lineage is inherited.
  for (const e of empires) {
    empireAmbassadors[e.id] = makeAmbassador(rng, e.leaderPortrait.category);
  }
  for (const r of rivals) {
    rivalLiaisons[r.id] = makeAmbassador(rng, r.ceoPortrait.category);
  }
  return { empireAmbassadors, rivalLiaisons };
}
