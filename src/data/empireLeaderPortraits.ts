import type { CharacterPortrait, PortraitCategory } from "./types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export type LeaderArchetype =
  | "emperor"
  | "hiveMind"
  | "technocrat"
  | "warlord"
  | "plutarch"
  | "council"
  | "prophet"
  | "overseer";

export interface EmpireLeaderDefinition {
  id: string;
  filename: string;
  label: string;
  category: PortraitCategory;
  species: string;
  archetype: LeaderArchetype;
  bio: string;
  appearance: string;
}

export const EMPIRE_LEADER_PORTRAITS: EmpireLeaderDefinition[] = [
  // ── Emperors / Sovereigns ──────────────────────────────────────────────
  {
    id: "leader-01",
    filename: "leader-01.png",
    label: "Emperor Drakon",
    category: "human",
    species: "Human",
    archetype: "emperor",
    bio: "Hereditary ruler of the Terran core worlds, commands loyalty through ancient dynastic traditions and an iron fist.",
    appearance:
      "stern older male, ornate golden crown with embedded jewels, deep scarlet imperial robes with fur collar, sharp cheekbones, grey beard trimmed to a point, cybernetic monocle, commanding presence",
  },
  {
    id: "leader-02",
    filename: "leader-02.png",
    label: "Empress Vasara",
    category: "alien",
    species: "Reptilian",
    archetype: "emperor",
    bio: "Scale-born sovereign who unified the warring clutch-states. Rules from a volcanic throne-world with ruthless efficiency.",
    appearance:
      "tall reptilian female with emerald and gold scales, slitted amber eyes, ornate bone-and-metal crown fused to skull ridges, flowing crimson cape over chitinous battle armor, forked tongue visible",
  },
  // ── Hive Minds ─────────────────────────────────────────────────────────
  {
    id: "leader-03",
    filename: "leader-03.png",
    label: "The Convergence",
    category: "alien",
    species: "Insectoid",
    archetype: "hiveMind",
    bio: "A collective consciousness spanning billions of linked mantid drones. Speaks with one voice through a bio-relay avatar.",
    appearance:
      "massive insectoid with iridescent chitin in violet and black, compound eyes glowing pale green, neural filaments connecting to unseen hive-mass, elaborate mandible crown, bioluminescent throat sac",
  },
  {
    id: "leader-04",
    filename: "leader-04.png",
    label: "Mycelial Overmind",
    category: "alien",
    species: "Fungal",
    archetype: "hiveMind",
    bio: "Planet-spanning fungal network that achieved sapience. Each fruiting body is a temporary face for negotiations.",
    appearance:
      "mushroom-like being with a massive bioluminescent cap in purple and teal, mycelium tendrils forming a beard, spore clouds drifting from gills, multiple small eyes embedded in the cap surface, bark-like skin",
  },
  // ── Technocrats ────────────────────────────────────────────────────────
  {
    id: "leader-05",
    filename: "leader-05.png",
    label: "Archon Prime-7",
    category: "cyborg",
    species: "Cyborg",
    archetype: "technocrat",
    bio: "Elected by algorithm, this post-human administrator optimizes resource allocation across three star systems.",
    appearance:
      "sleek cyborg with chrome skull-plate and exposed circuitry, one organic eye (blue) and one holographic eye (orange), data-streams projected from temple ports, minimalist white tunic with circuit-trace patterns",
  },
  {
    id: "leader-06",
    filename: "leader-06.png",
    label: "Director Synthex",
    category: "cyborg",
    species: "Android",
    archetype: "technocrat",
    bio: "Fully synthetic intelligence elected by a techno-democracy. Runs governance through millions of parallel simulations.",
    appearance:
      "polished white android faceplate with glowing blue LED eye-strips, no mouth but a holographic voice emitter, geometric head design, thin chrome shoulders, a holographic data-crown hovering above the head",
  },
  // ── Warlords ───────────────────────────────────────────────────────────
  {
    id: "leader-07",
    filename: "leader-07.png",
    label: "Warmaster Kael",
    category: "human",
    species: "Human",
    archetype: "warlord",
    bio: "Rose from the arena pits to command the largest mercenary fleet in the sector. Respects only strength.",
    appearance:
      "massive scarred male, shaved head with tribal tattoos and neural implants, heavy power armor with trophies, glowing red cybernetic left arm, broken nose, fierce brown eyes, war paint streaks",
  },
  {
    id: "leader-08",
    filename: "leader-08.png",
    label: "Broodmother Skrix",
    category: "alien",
    species: "Insectoid",
    archetype: "warlord",
    bio: "Commands swarm-fleets through pheromone broadcasts. Every conquest feeds the brood.",
    appearance:
      "towering beetle-like alien with black and crimson chitin, serrated mandibles dripping ichor, compound eyes burning red, six armored limbs, bio-organic weapons grafted to forelimbs, battle-scarred carapace",
  },
  // ── Plutarchs ──────────────────────────────────────────────────────────
  {
    id: "leader-09",
    filename: "leader-09.png",
    label: "Grand Financier Luxan",
    category: "human",
    species: "Human",
    archetype: "plutarch",
    bio: "Controls the sector's largest banking consortium. Bought a star system and renamed it after themselves.",
    appearance:
      "immaculately dressed elder with silver hair slicked back, golden augmented eyes, tailored black suit with platinum filigree, holographic stock tickers orbiting, gemstone-set collar pins, smug expression",
  },
  {
    id: "leader-10",
    filename: "leader-10.png",
    label: "Guildmaster Opaline",
    category: "alien",
    species: "Crystalline",
    archetype: "plutarch",
    bio: "Living crystal being who runs the Prismatic Trade Guild. Measures value in photon-wavelengths.",
    appearance:
      "humanoid figure of translucent crystal in opalescent whites and pinks, faceted gem-like eyes refracting light into rainbows, small crystal growths forming a crown, light emanating from within, elaborate jeweled mantle",
  },
  // ── Council Leaders ────────────────────────────────────────────────────
  {
    id: "leader-11",
    filename: "leader-11.png",
    label: "Speaker Aelith",
    category: "alien",
    species: "Avian",
    archetype: "council",
    bio: "Elected spokesperson of the Avian Parliament. Represents hundreds of squabbling flocks through eloquent diplomacy.",
    appearance:
      "elegant bird-like alien with iridescent blue and gold plumage, keen raptor eyes, slender beak, ornate feathered ceremonial mantle, diplomatic sash across chest, three-fingered taloned hands clasped formally",
  },
  {
    id: "leader-12",
    filename: "leader-12.png",
    label: "Delegate Consortium",
    category: "alien",
    species: "Cephalopod",
    archetype: "council",
    bio: "Three cephalopod beings sharing one cybernetic link who vote as one. Consensus is their constitution.",
    appearance:
      "three tentacle-faced aliens merged at the base, translucent aqua skin with bioluminescent blue spots, multiple eyes, each face slightly different size, shared chrome neural collar connecting all three, deep-sea coloring",
  },
  // ── Prophets / Mystics ─────────────────────────────────────────────────
  {
    id: "leader-13",
    filename: "leader-13.png",
    label: "Oracle Zetharion",
    category: "alien",
    species: "Ethereal",
    archetype: "prophet",
    bio: "Claims to commune with hyperspace itself. Followers believe their predictions are infallible.",
    appearance:
      "ghostly translucent being glowing from within, wispy tendrils trailing upward like smoke, ancient ethereal face with hollow glowing white eyes, surrounded by floating runic symbols, robes made of condensed starlight",
  },
  {
    id: "leader-14",
    filename: "leader-14.png",
    label: "High Shaman Rootweave",
    category: "alien",
    species: "Plant",
    archetype: "prophet",
    bio: "Ancient tree-being who leads through visions received from the cosmic mycelial network.",
    appearance:
      "ancient tree-like being with gnarled bark skin in deep brown and green, leaf-hair in autumn colors, bioluminescent sap veins pulsing teal, wooden face with wise knot-hole eyes, moss-covered ceremonial staff",
  },
  // ── Overseers ──────────────────────────────────────────────────────────
  {
    id: "leader-15",
    filename: "leader-15.png",
    label: "Overseer Vanguard",
    category: "cyborg",
    species: "Cyborg",
    archetype: "overseer",
    bio: "Military-industrial governor who maintains order through networked surveillance drones and orbital platforms.",
    appearance:
      "heavily augmented humanoid, half face chrome with a red scanner eye, military grey uniform with rank insignia, shoulder-mounted drone perched, neural uplink cables trailing from the back of the skull, stern expression",
  },
  {
    id: "leader-16",
    filename: "leader-16.png",
    label: "Matriarch Ursane",
    category: "alien",
    species: "Ursine",
    archetype: "overseer",
    bio: "Leads the Ursine Clans through a balance of brute strength and surprising cunning. Protects her systems fiercely.",
    appearance:
      "massive bear-like alien with thick silver-white fur, small wise golden eyes, ornate battle-worn armor with clan sigils, imposing tusks, heavy clawed hands resting on a war-hammer, fur adorned with beads and feathers",
  },
  {
    id: "leader-17",
    filename: "leader-17.png",
    label: "Regent Solaxis",
    category: "alien",
    species: "Energy",
    archetype: "emperor",
    bio: "A being of pure solar plasma who rules from the corona of a star. Communication requires specialized shielding.",
    appearance:
      "luminous humanoid figure made of crackling golden plasma, corona-like hair of pure fire, eyes like twin white dwarf stars, solar flares forming a regal cape, energy tendrils for arms, blindingly bright core",
  },
  {
    id: "leader-18",
    filename: "leader-18.png",
    label: "Admiral Ferroclade",
    category: "alien",
    species: "Silicon",
    archetype: "warlord",
    bio: "Living mineral admiral who commands a fleet of hollowed-out asteroids. Thinks in geological time but strikes like lightning.",
    appearance:
      "massive rocky humanoid with iron-grey stone skin, glowing magma veins, crystal growths forming epaulettes, obsidian eyes, geological striations visible across face, small gemstone clusters as rank badges",
  },
  {
    id: "leader-19",
    filename: "leader-19.png",
    label: "Shapelord Mirrax",
    category: "alien",
    species: "Shapeshifter",
    archetype: "council",
    bio: "Represents the Morphic Consensus, a society where identity is fluid. Takes a different form for each diplomatic meeting.",
    appearance:
      "alien mid-transformation, left side humanoid right side amorphous, mercurial quicksilver skin, features partially morphed, multiple overlapping faces visible beneath surface, unsettling beauty, chrome-like sheen",
  },
  {
    id: "leader-20",
    filename: "leader-20.png",
    label: "Primus Felinar",
    category: "alien",
    species: "Feline",
    archetype: "plutarch",
    bio: "Sleek predator-aristocrat who runs the most exclusive trade cartel through charm and retractable claws.",
    appearance:
      "elegant cat-like alien with sleek midnight-blue fur, large reflective golden eyes, pointed ears adorned with gold rings, ornamental jeweled collar, silk merchant robes, predatory grace, long whiskers",
  },
];

/** Get the Phaser texture key for an empire leader portrait. */
export function getLeaderTextureKey(portraitId: string): string {
  return `portrait-${portraitId}`;
}

/** Get the asset path (relative to public/) for an empire leader portrait. */
export function getLeaderAssetPath(def: EmpireLeaderDefinition): string {
  return `portraits/leaders/${def.filename}`;
}

/**
 * Get [webp, png] URL pair for Phaser's load.image(key, urls) array form.
 * Phaser tries the first URL (WebP) and falls back to the second (PNG).
 */
export function getLeaderAssetUrls(
  def: EmpireLeaderDefinition,
): [string, string] {
  const stem = def.filename.replace(/\.png$/i, "");
  return [`portraits/leaders/${stem}.webp`, `portraits/leaders/${stem}.png`];
}

/** Get an empire leader definition by ID. */
export function getLeaderById(
  portraitId: string,
): EmpireLeaderDefinition | undefined {
  return EMPIRE_LEADER_PORTRAITS.find((p) => p.id === portraitId);
}

/** Pick a random empire leader portrait, optionally filtered by category. */
export function pickRandomLeaderPortrait(
  rng: SeededRNG,
  excludeIds: string[] = [],
  category?: PortraitCategory,
): CharacterPortrait {
  let pool = EMPIRE_LEADER_PORTRAITS.filter((p) => !excludeIds.includes(p.id));
  if (category) {
    pool = pool.filter((p) => p.category === category);
  }
  if (pool.length === 0) {
    pool = [...EMPIRE_LEADER_PORTRAITS];
  }
  const pick = rng.pick(pool);
  return { portraitId: pick.id, category: pick.category };
}
