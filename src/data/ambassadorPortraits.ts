import type {
  AmbassadorPersonality,
  CharacterPortrait,
  PortraitCategory,
} from "./types.ts";

/**
 * Static catalog of generated ambassador portraits.
 *
 * Each entry pairs a portrait asset (under `public/portraits/ambassadors/`)
 * with its (personality, category) tags. `AmbassadorGenerator` picks from
 * this list, matching the portrait to the empire's `leaderPortrait.category`
 * (so alien empires get alien-presenting ambassadors) and inheriting the
 * portrait's personality so visual + dialog tone stay aligned.
 *
 * The 12-entry pool covers every (personality × category) combination once
 * — minimum-viable diversity. Rerolls during a single game pick from the
 * matching subset.
 */
export interface AmbassadorPortraitDef {
  readonly id: string;
  readonly filename: string;
  readonly category: PortraitCategory;
  readonly personality: AmbassadorPersonality;
  /** Short prose description of the visible character — for QA + future flavor reuse. */
  readonly appearance: string;
}

export const AMBASSADOR_PORTRAITS: readonly AmbassadorPortraitDef[] = [
  {
    id: "ambassador-01",
    filename: "ambassador-01.png",
    category: "human",
    personality: "formal",
    appearance:
      "middle-aged human male in dark teal collar suit with silver braid, neat grey-streaked hair, datapad in hand, bureaucratic stiffness",
  },
  {
    id: "ambassador-02",
    filename: "ambassador-02.png",
    category: "alien",
    personality: "formal",
    appearance:
      "stiff reptilian diplomat in muted-gold ceremonial robes, emerald scales, slitted amber eyes, rigid ceremonial posture",
  },
  {
    id: "ambassador-03",
    filename: "ambassador-03.png",
    category: "cyborg",
    personality: "formal",
    appearance:
      "half-cyborg administrator with chrome jaw, single blue scanning eye-lens, dark grey civic uniform with silver pinstripes",
  },
  {
    id: "ambassador-04",
    filename: "ambassador-04.png",
    category: "human",
    personality: "mercenary",
    appearance:
      "sly human male trader-emissary in crimson velvet jacket with gold piping, slicked black hair, calculating dark eyes, smug smirk",
  },
  {
    id: "ambassador-05",
    filename: "ambassador-05.png",
    category: "alien",
    personality: "mercenary",
    appearance:
      "mantid-insectoid clerk with iridescent violet chitin, compound green eyes, four forelimbs holding scrolls and abacus, silk merchant sash",
  },
  {
    id: "ambassador-06",
    filename: "ambassador-06.png",
    category: "cyborg",
    personality: "mercenary",
    appearance:
      "chrome-plated negotiator with mirrored face plating, glowing yellow eye-slits, black-and-gold contract robe, ornate filigree",
  },
  {
    id: "ambassador-07",
    filename: "ambassador-07.png",
    category: "human",
    personality: "suspicious",
    appearance:
      "noir-looking human female aide with severe black bob, narrowed steel-grey eyes, charcoal trench-collar coat, watchful posture",
  },
  {
    id: "ambassador-08",
    filename: "ambassador-08.png",
    category: "alien",
    personality: "suspicious",
    appearance:
      "tentacled cephalopod diplomat with deep purple skin, three asymmetric slit-pupil eyes, defensive tentacle posture, dark plum robe",
  },
  {
    id: "ambassador-09",
    filename: "ambassador-09.png",
    category: "cyborg",
    personality: "suspicious",
    appearance:
      "wary cyborg intelligence officer with chrome ocular HUD implants, scarred cheek, charcoal field uniform, vigilant stance",
  },
  {
    id: "ambassador-10",
    filename: "ambassador-10.png",
    category: "human",
    personality: "warm",
    appearance:
      "friendly middle-aged human female merchant with warm brown smile, embroidered earth-tone shawl, silver hoop earrings, welcoming gesture",
  },
  {
    id: "ambassador-11",
    filename: "ambassador-11.png",
    category: "alien",
    personality: "warm",
    appearance:
      "feline alien diplomat with sleek midnight-blue fur, golden eyes, ear-tip gold rings, jeweled collar, soft welcoming smile, peach silk robe",
  },
  {
    id: "ambassador-12",
    filename: "ambassador-12.png",
    category: "cyborg",
    personality: "warm",
    appearance:
      "softer cyborg with mostly-restored organic face, gentle amber augmented eyes, neat brown beard, sage-green civilian tunic, calm welcoming expression",
  },
];

/** Get the Phaser texture key for an ambassador portrait. */
export function getAmbassadorTextureKey(portraitId: string): string {
  return `portrait-${portraitId}`;
}

/**
 * [webp, png] URL pair for Phaser's `load.image(key, urls)` array form.
 * Phaser tries the first URL (WebP) and falls back to the second (PNG).
 */
export function getAmbassadorAssetUrls(
  def: AmbassadorPortraitDef,
): [string, string] {
  const stem = def.filename.replace(/\.png$/i, "");
  return [
    `portraits/ambassadors/${stem}.webp`,
    `portraits/ambassadors/${stem}.png`,
  ];
}

/** Get an ambassador portrait definition by id. */
export function getAmbassadorPortraitById(
  portraitId: string,
): AmbassadorPortraitDef | undefined {
  return AMBASSADOR_PORTRAITS.find((p) => p.id === portraitId);
}

/**
 * Build a `CharacterPortrait` shape for an ambassador definition. Used at
 * generation time so the structured Ambassador record carries the same shape
 * Empires/CEOs use.
 */
export function toCharacterPortrait(
  def: AmbassadorPortraitDef,
): CharacterPortrait {
  return { portraitId: def.id, category: def.category };
}
