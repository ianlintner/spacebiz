import type {
  DialogueVariant,
  DilemmaCategory,
  SpeakerMood,
  SpeakerRef,
} from "../../data/types.ts";
import {
  getNewscasterForCategory,
  NEWSCASTER_DEFS,
  type NewscasterType,
} from "../../generation/news/newscasters.ts";
import type { TickerCategory } from "../../generation/news/types.ts";

/**
 * Adviser archetype — mirrors NEWSCASTER_DEFS shape but for the multi-mood
 * adviser portraits at `public/portraits/adviser/<id>-<mood>.webp`.
 *
 * Existing portraits on disk: ceres9, chen, flux, krthul, mehta, nyx, okari,
 * raxis, rex, sable, tanaka, verne, voss, xel — each with four moods
 * (standby, analyzing, alert, success).
 */
export interface AdviserDef {
  id: string;
  name: string;
  title: string;
  accentColor: number;
  /** Texture key stem; full key resolved via `adviserPortraitKey(id, mood)`. */
  portraitStem: string;
}

export const ADVISER_DEFS: Record<string, AdviserDef> = {
  rex: {
    id: "rex",
    name: "Rex",
    title: "Chief Adviser",
    accentColor: 0xc8a464,
    portraitStem: "rex",
  },
  chen: {
    id: "chen",
    name: "Dr. Chen",
    title: "Chief Financial Officer",
    accentColor: 0xffd700,
    portraitStem: "chen",
  },
  voss: {
    id: "voss",
    name: "Cmdr. Voss",
    title: "Chief Engineer",
    accentColor: 0xff8844,
    portraitStem: "voss",
  },
  xel: {
    id: "xel",
    name: "Ambassador Xel",
    title: "Foreign Liaison",
    accentColor: 0x4488ff,
    portraitStem: "xel",
  },
  verne: {
    id: "verne",
    name: "Verne",
    title: "Frontier Scout",
    accentColor: 0x44ffaa,
    portraitStem: "verne",
  },
  ceres9: {
    id: "ceres9",
    name: "CERES-9",
    title: "Logistics Intelligence",
    accentColor: 0x00ffcc,
    portraitStem: "ceres9",
  },
  flux: {
    id: "flux",
    name: "Flux",
    title: "Market Analyst",
    accentColor: 0xff66aa,
    portraitStem: "flux",
  },
  krthul: {
    id: "krthul",
    name: "Krthul",
    title: "Operations Specialist",
    accentColor: 0xcc4444,
    portraitStem: "krthul",
  },
  mehta: {
    id: "mehta",
    name: "Mehta",
    title: "Tech Strategist",
    accentColor: 0x88ff44,
    portraitStem: "mehta",
  },
  nyx: {
    id: "nyx",
    name: "Nyx",
    title: "Intelligence Officer",
    accentColor: 0xaa88ff,
    portraitStem: "nyx",
  },
  okari: {
    id: "okari",
    name: "Okari",
    title: "Crew Liaison",
    accentColor: 0xff44cc,
    portraitStem: "okari",
  },
  raxis: {
    id: "raxis",
    name: "Raxis",
    title: "Risk Assessor",
    accentColor: 0xff4444,
    portraitStem: "raxis",
  },
  sable: {
    id: "sable",
    name: "Sable",
    title: "Strategic Counsel",
    accentColor: 0xffaa00,
    portraitStem: "sable",
  },
  tanaka: {
    id: "tanaka",
    name: "Tanaka",
    title: "Logistics Director",
    accentColor: 0x4488ff,
    portraitStem: "tanaka",
  },
};

/**
 * Default speaker archetype per dilemma category. Templates may override via
 * `DilemmaTemplate.speakerArchetype`.
 */
export const DILEMMA_SPEAKER_BY_CATEGORY: Record<DilemmaCategory, string> = {
  operational: "voss",
  diplomatic: "xel",
  financial: "chen",
  narrative: "rex",
  opportunity: "verne",
};

/**
 * Default modal variant per dilemma category. Templates may override.
 */
export function defaultVariantForCategory(
  category: DilemmaCategory | undefined,
): DialogueVariant {
  switch (category) {
    case "diplomatic":
      return "news";
    case "financial":
      return "memo";
    case "operational":
    case "narrative":
    case "opportunity":
    default:
      return "standard";
  }
}

/**
 * Resolve the texture key for an adviser portrait variant. Matches the
 * filenames under `public/portraits/adviser/<stem>-<mood>.webp`.
 */
export function adviserPortraitKey(
  archetypeId: string,
  mood: SpeakerMood,
): string {
  const def = ADVISER_DEFS[archetypeId];
  const stem = def?.portraitStem ?? archetypeId;
  return `adviser-${stem}-${mood}`;
}

/**
 * Resolve the texture key for a newscaster portrait. Reuses
 * `NEWSCASTER_DEFS[type].portraitKey` directly (single-mood pool).
 */
export function newscasterPortraitKey(archetypeId: string): string {
  const def = NEWSCASTER_DEFS[archetypeId as NewscasterType];
  return def?.portraitKey ?? `newscaster-${archetypeId}`;
}

export function speakerPortraitKey(ref: SpeakerRef): string {
  if (ref.pool === "newscaster") return newscasterPortraitKey(ref.archetypeId);
  return adviserPortraitKey(ref.archetypeId, ref.mood);
}

export function speakerDisplayName(ref: SpeakerRef): string {
  if (ref.pool === "newscaster") {
    const def = NEWSCASTER_DEFS[ref.archetypeId as NewscasterType];
    return def?.name ?? ref.archetypeId;
  }
  return ADVISER_DEFS[ref.archetypeId]?.name ?? ref.archetypeId;
}

export function speakerDisplayTitle(ref: SpeakerRef): string {
  if (ref.pool === "newscaster") {
    const def = NEWSCASTER_DEFS[ref.archetypeId as NewscasterType];
    return def?.title ?? "Correspondent";
  }
  return ADVISER_DEFS[ref.archetypeId]?.title ?? "Adviser";
}

export function speakerAccentColor(ref: SpeakerRef): number {
  if (ref.pool === "newscaster") {
    const def = NEWSCASTER_DEFS[ref.archetypeId as NewscasterType];
    return def?.accentColor ?? 0x4488ff;
  }
  return ADVISER_DEFS[ref.archetypeId]?.accentColor ?? 0xc8a464;
}

/**
 * Build a speaker ref for a dilemma. `mood` is "standby" for intro/choice
 * stages and outcome-driven for result stages.
 */
export function dilemmaSpeaker(
  category: DilemmaCategory | undefined,
  mood: SpeakerMood,
  archetypeOverride?: string,
): SpeakerRef {
  const archetypeId =
    archetypeOverride ??
    (category ? DILEMMA_SPEAKER_BY_CATEGORY[category] : "rex");
  return { archetypeId, pool: "adviser", mood };
}

/**
 * Build a speaker ref for a news-variant dialogue, keyed off the ticker
 * category. Newscasters are single-mood — the mood field is unused but kept
 * for the unified SpeakerRef shape.
 */
export function newsSpeakerFor(
  tickerCategory: TickerCategory,
  mood: SpeakerMood = "standby",
): SpeakerRef {
  const def = getNewscasterForCategory(tickerCategory);
  return { archetypeId: def.type, pool: "newscaster", mood };
}
