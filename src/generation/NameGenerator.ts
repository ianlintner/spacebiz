import type { SeededRNG } from "../utils/SeededRNG.ts";

// Syllable pools for sci-fi name generation

const SECTOR_FIRST_WORDS = [
  "Arcturus",
  "Novara",
  "Orion",
  "Cygnus",
  "Vega",
  "Antares",
  "Zenith",
  "Helios",
  "Nebula",
  "Solaris",
  "Draconis",
  "Aethon",
  "Umbra",
  "Kronos",
  "Celestia",
  "Elysium",
  "Tempest",
  "Obsidian",
  "Crimson",
  "Azure",
  "Phantom",
  "Radiant",
  "Astral",
  "Void",
  "Stellar",
];

const SECTOR_SECOND_WORDS = [
  "Reach",
  "Expanse",
  "Rift",
  "Frontier",
  "Dominion",
  "Corridor",
  "Nebula",
  "Traverse",
  "Void",
  "Cluster",
  "Passage",
  "Drift",
  "Veil",
  "Arc",
  "Abyss",
  "Marches",
  "Edge",
  "Depths",
  "Haven",
  "Wastes",
];

const SYSTEM_PREFIXES = [
  "Zeph",
  "Kalt",
  "Ven",
  "Thar",
  "Xen",
  "Rho",
  "Ald",
  "Cyr",
  "Dra",
  "Eph",
  "Gal",
  "Hel",
  "Ith",
  "Jor",
  "Kel",
  "Lyr",
  "Myr",
  "Nyx",
  "Oph",
  "Pol",
  "Sar",
  "Tel",
  "Ulr",
  "Val",
  "Zan",
  "Ber",
  "Cor",
  "Del",
  "Fer",
  "Gor",
];

const SYSTEM_ROOTS = [
  "an",
  "os",
  "ar",
  "en",
  "ir",
  "al",
  "un",
  "or",
  "el",
  "ax",
  "on",
  "is",
  "as",
  "ur",
  "eth",
  "ix",
  "ov",
  "em",
  "ad",
  "ith",
];

const SYSTEM_SUFFIXES = [
  "ia",
  "us",
  "os",
  "is",
  "on",
  "ar",
  "ex",
  "ion",
  "a",
  "um",
  "ius",
  "or",
  "as",
  "ux",
  "ath",
  "iel",
  "an",
  "es",
  "al",
  "eon",
];

const PLANET_PREFIXES = [
  "Vex",
  "Kra",
  "Tho",
  "Zel",
  "Myr",
  "Pax",
  "Gor",
  "Nol",
  "Syn",
  "Ryn",
  "Hex",
  "Bor",
  "Cal",
  "Dur",
  "Fen",
  "Gax",
  "Hov",
  "Ixo",
  "Jyn",
  "Kov",
  "Lum",
  "Nar",
  "Oth",
  "Qar",
  "Sev",
  "Tal",
  "Ura",
  "Wex",
  "Yol",
  "Zar",
];

const PLANET_SUFFIXES = [
  "",
  "on",
  "ar",
  "is",
  "os",
  "ex",
  "a",
  "an",
  "or",
  "us",
];

const PLANET_MODIFIERS = ["Prime", "Major", "Minor", "Alpha", "Beta", "Gamma"];

export class NameGenerator {
  private rng: SeededRNG;
  private usedNames: Set<string> = new Set();

  constructor(rng: SeededRNG) {
    this.rng = rng;
  }

  generateSectorName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const first = this.rng.pick(SECTOR_FIRST_WORDS);
      const second = this.rng.pick(SECTOR_SECOND_WORDS);
      const name = `${first} ${second}`;
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    // Fallback: append a number
    const first = this.rng.pick(SECTOR_FIRST_WORDS);
    const second = this.rng.pick(SECTOR_SECOND_WORDS);
    const num = this.rng.nextInt(1, 999);
    const name = `${first} ${second} ${num}`;
    this.usedNames.add(name);
    return name;
  }

  generateSystemName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const prefix = this.rng.pick(SYSTEM_PREFIXES);
      const root = this.rng.pick(SYSTEM_ROOTS);
      const suffix = this.rng.pick(SYSTEM_SUFFIXES);
      const name = `${prefix}${root}${suffix}`;
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    const prefix = this.rng.pick(SYSTEM_PREFIXES);
    const num = this.rng.nextInt(1, 999);
    const name = `${prefix}-${num}`;
    this.usedNames.add(name);
    return name;
  }

  generatePlanetName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const prefix = this.rng.pick(PLANET_PREFIXES);
      const suffix = this.rng.pick(PLANET_SUFFIXES);
      let name: string;

      // 30% chance of a number suffix like "Vex-4"
      // 20% chance of a modifier like "Tharon Prime"
      // 50% chance of plain name like "Kragos"
      const roll = this.rng.next();
      if (roll < 0.3) {
        const num = this.rng.nextInt(1, 9);
        name = `${prefix}${suffix}-${num}`;
      } else if (roll < 0.5) {
        const modifier = this.rng.pick(PLANET_MODIFIERS);
        name = `${prefix}${suffix} ${modifier}`;
      } else {
        name = `${prefix}${suffix}`;
      }

      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    const prefix = this.rng.pick(PLANET_PREFIXES);
    const num = this.rng.nextInt(10, 999);
    const name = `${prefix}-${num}`;
    this.usedNames.add(name);
    return name;
  }

  /** Reset the set of used names (useful between independent generation runs). */
  reset(): void {
    this.usedNames.clear();
  }
}
