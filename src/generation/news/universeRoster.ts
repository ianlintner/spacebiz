import type {
  UniverseRoster,
  SportsTeam,
  Musician,
  Celebrity,
  Pundit,
  CrimeFigure,
  MilitaryOfficer,
  MusicGenre,
  RosterHistoryEntry,
} from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

/**
 * Minimal galaxy shape required by the roster seeder. The full game
 * `GameState["galaxy"]` value satisfies this, but tests can pass a tiny
 * fixture with only the fields used here.
 */
export interface GalaxyStateLike {
  planets: ReadonlyArray<{ name: string }>;
  empires?: ReadonlyArray<{ name: string }>;
}

// ---------------------------------------------------------------------------
// Name pools — alien sci-fi register, themed per archetype
// ---------------------------------------------------------------------------

const TEAM_PREFIXES = [
  "Vortex",
  "Cygnus",
  "Halcyon",
  "Pulsar",
  "Nebula",
  "Drift",
  "Orbit",
  "Tidal",
  "Iron",
  "Solar",
  "Twilight",
  "Quasar",
  "Comet",
  "Verge",
  "Stellar",
  "Voidline",
];

const TEAM_SUFFIXES = [
  "Nomads",
  "Comets",
  "Reapers",
  "Drifters",
  "Saints",
  "Wreckers",
  "Sentries",
  "Aces",
  "Runners",
  "Vagrants",
  "Marauders",
  "Talons",
  "Wolves",
  "Hawks",
  "Outlaws",
  "Heralds",
];

const MUSICIAN_FIRST = [
  "Drix",
  "Kira",
  "Vael",
  "Loom",
  "Sable",
  "Halix",
  "Mira",
  "Cygne",
  "Thurr",
  "Veska",
  "Orin",
  "Nyx",
  "Korrin",
  "Pyx",
  "Solen",
  "Tessa",
];

const MUSICIAN_LAST = [
  "Vael",
  "Onn",
  "Roxx",
  "Marlow",
  "Drevin",
  "Halqar",
  "Sett",
  "Brann",
  "Voss",
  "Quell",
  "Mire",
  "Pyre",
];

const MUSIC_GENRES: MusicGenre[] = [
  "void_jazz",
  "hyperpop",
  "drone_folk",
  "synthpulse",
  "death_ambient",
  "celestial_pop",
];

const ALBUM_TITLES = [
  "Hollow Constellations",
  "Dust & Diamond",
  "Slow Light Catastrophe",
  "Twin Moon Hymnal",
  "Saltpaper Saints",
  "After Apogee",
  "Kindling Stars",
  "Soft Mutiny",
  "Pale Empyrean",
  "Argent Reverie",
  "Static Choir",
  "Murmur of Empires",
];

const CELEB_FIRST = [
  "Brix",
  "Ondra",
  "Kessa",
  "Voryn",
  "Lana",
  "Sivix",
  "Tarek",
  "Quill",
  "Mavix",
  "Dela",
  "Joren",
  "Fenix",
];

const CELEB_LAST = [
  "Morvaan",
  "Halcyx",
  "Drev",
  "Selnis",
  "Karne",
  "Vexx",
  "Tyron",
  "Ovan",
  "Crest",
  "Brell",
  "Thane",
  "Solaire",
];

const CELEB_ROLES = [
  "holovid star",
  "socialite",
  "reality host",
  "celebrity chef",
  "influencer",
  "former captain turned commentator",
];

const CELEB_PROJECTS = [
  "the holovid 'Crown of Ash'",
  "the variety show 'Late Light'",
  "a perfume line called Astrum",
  "a tell-all memoir",
  "a holo-documentary about dust pirates",
  "a luxury restaurant chain",
];

const PUNDIT_FIRST = [
  "Kalen",
  "Mox",
  "Thessa",
  "Roven",
  "Aeloria",
  "Brann",
  "Lorr",
  "Petra",
  "Yvex",
  "Demir",
];

const PUNDIT_LAST = [
  "Vrede",
  "Collat",
  "Marquand",
  "Harrow",
  "Senn",
  "Ostrik",
  "Briel",
  "Korr",
  "Vance",
];

const PUNDIT_QUOTES = [
  "'A tariff is just a polite way of saying war.'",
  "'Every star has its own kind of corruption.'",
  "'Trust the data, distrust the dataset.'",
  "'The Empire never sleeps. It just naps strategically.'",
  "'When freight slows, civilizations stumble.'",
];

const CRIME_NAMES = [
  "The Pale Meridian",
  "Vrek Sonn",
  "The Quiet Hand",
  "Marra Cael",
  "Ironwidow Cartel",
  "Halix Ovo",
  "The Slow Knife",
  "Sevek Drun",
];

const MILITARY_FIRST = [
  "Harken",
  "Veska",
  "Oren",
  "Drelle",
  "Jorra",
  "Sevix",
  "Krein",
  "Maxen",
  "Tarrow",
];

const MILITARY_LAST = [
  "Voss",
  "Calderan",
  "Reth",
  "Kaine",
  "Ostrov",
  "Pyre",
  "Hesker",
  "Vance",
  "Kort",
];

const MILITARY_RANKS = ["Admiral", "Commodore", "Fleet Captain"];

const COMMAND_NAMES = [
  "the dreadnought Iron Vow",
  "the carrier Long Twilight",
  "the strike group Solace",
  "the battleline Argent Pyre",
  "the fleet Cold Tide",
  "the Hammer Squadron",
];

const CONTROVERSIES = [
  "stage walkout at the Halcyon festival",
  "leaked diss track aimed at a rival",
  "tax evasion allegations from three empires",
  "publicly feuding with their own producer",
  "accused of plagiarising a derelict transmission",
  "uninvited from the Galactic Music Awards",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickN<T>(rng: SeededRNG, source: readonly T[], count: number): T[] {
  // Without-replacement sample using the RNG.
  const pool = [...source];
  const out: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = rng.nextInt(0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function makeName(
  rng: SeededRNG,
  first: readonly string[],
  last: readonly string[],
): string {
  return `${first[rng.nextInt(0, first.length - 1)]} ${last[rng.nextInt(0, last.length - 1)]}`;
}

function pickEmpireName(rng: SeededRNG, galaxyState: GalaxyStateLike): string {
  const empires = galaxyState.empires ?? [];
  if (empires.length === 0) return "Independent";
  return empires[rng.nextInt(0, empires.length - 1)].name;
}

function pickControversy(rng: SeededRNG): string {
  return CONTROVERSIES[rng.nextInt(0, CONTROVERSIES.length - 1)];
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export function seedUniverseRoster(
  rng: SeededRNG,
  galaxyState: GalaxyStateLike,
): UniverseRoster {
  const planetNames = galaxyState.planets.map((p) => p.name);

  // 8 sports teams across 2 leagues (4 each)
  const teamPrefixes = pickN(rng, TEAM_PREFIXES, 8);
  const teamSuffixes = pickN(rng, TEAM_SUFFIXES, 8);
  const sportsTeams: SportsTeam[] = teamPrefixes.map((prefix, i) => ({
    id: `team_${i}`,
    name: `${prefix} ${teamSuffixes[i]}`,
    homePort:
      planetNames.length > 0
        ? planetNames[rng.nextInt(0, planetNames.length - 1)]
        : "Unknown Port",
    league: i < 4 ? "Core" : "Rim",
    wins: 0,
    losses: 0,
    streak: 0,
    championship: false,
  }));

  // 6 musicians
  const musicians: Musician[] = [];
  for (let i = 0; i < 6; i++) {
    const onTour = rng.next() < 0.4;
    musicians.push({
      id: `musician_${i}`,
      name: makeName(rng, MUSICIAN_FIRST, MUSICIAN_LAST),
      genre: MUSIC_GENRES[rng.nextInt(0, MUSIC_GENRES.length - 1)],
      currentAlbum: ALBUM_TITLES[rng.nextInt(0, ALBUM_TITLES.length - 1)],
      onTour,
      tourPort:
        onTour && planetNames.length > 0
          ? planetNames[rng.nextInt(0, planetNames.length - 1)]
          : undefined,
      controversyActive: false,
    });
  }

  // 6 celebrities
  const celebrities: Celebrity[] = [];
  for (let i = 0; i < 6; i++) {
    celebrities.push({
      id: `celeb_${i}`,
      name: makeName(rng, CELEB_FIRST, CELEB_LAST),
      role: CELEB_ROLES[rng.nextInt(0, CELEB_ROLES.length - 1)],
      latestProject: CELEB_PROJECTS[rng.nextInt(0, CELEB_PROJECTS.length - 1)],
      scandalActive: false,
    });
  }

  // 4 pundits
  const pundits: Pundit[] = [];
  const slants: Pundit["slant"][] = [
    "pro_empire",
    "skeptic",
    "contrarian",
    "sensationalist",
  ];
  for (let i = 0; i < 4; i++) {
    pundits.push({
      id: `pundit_${i}`,
      name: makeName(rng, PUNDIT_FIRST, PUNDIT_LAST),
      affiliation: pickEmpireName(rng, galaxyState),
      slant: slants[i],
      recentQuote: PUNDIT_QUOTES[rng.nextInt(0, PUNDIT_QUOTES.length - 1)],
    });
  }

  // 3 crime figures
  const crimeNames = pickN(rng, CRIME_NAMES, 3);
  const crimeTypes: CrimeFigure["type"][] = [
    "syndicate",
    "pirate_lord",
    "smuggler",
  ];
  const crimeFigures: CrimeFigure[] = crimeNames.map((name, i) => ({
    id: `crime_${i}`,
    name,
    type: crimeTypes[i],
    active: true,
    lastSighting:
      planetNames.length > 0
        ? planetNames[rng.nextInt(0, planetNames.length - 1)]
        : undefined,
  }));

  // 4 military officers
  const militaryOfficers: MilitaryOfficer[] = [];
  for (let i = 0; i < 4; i++) {
    militaryOfficers.push({
      id: `officer_${i}`,
      name: makeName(rng, MILITARY_FIRST, MILITARY_LAST),
      rank: MILITARY_RANKS[rng.nextInt(0, MILITARY_RANKS.length - 1)],
      empire: pickEmpireName(rng, galaxyState),
      status: "active",
      currentCommand: COMMAND_NAMES[rng.nextInt(0, COMMAND_NAMES.length - 1)],
    });
  }

  return {
    sportsTeams,
    musicians,
    celebrities,
    pundits,
    crimeFigures,
    militaryOfficers,
  };
}

// ---------------------------------------------------------------------------
// Tick — called once per turn during simulation
// ---------------------------------------------------------------------------

const SCORE_LOW = 1;
const SCORE_HIGH = 9;

export function rosterTick(
  roster: UniverseRoster,
  rng: SeededRNG,
  turn: number,
): RosterHistoryEntry[] {
  const history: RosterHistoryEntry[] = [];

  // --- Sports: pair teams, simulate one game per pair --------------------
  const teams = [...roster.sportsTeams];
  // Shuffle pairings deterministically
  for (let i = teams.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  for (let i = 0; i + 1 < teams.length; i += 2) {
    const a = teams[i];
    const b = teams[i + 1];
    const aScore = rng.nextInt(SCORE_LOW, SCORE_HIGH) + Math.max(0, a.streak);
    const bScore = rng.nextInt(SCORE_LOW, SCORE_HIGH) + Math.max(0, b.streak);
    const winner = aScore >= bScore ? a : b;
    const loser = aScore >= bScore ? b : a;
    const winScore = Math.max(aScore, bScore);
    const loseScore = Math.min(aScore, bScore);
    winner.wins += 1;
    loser.losses += 1;
    winner.streak = winner.streak >= 0 ? winner.streak + 1 : 1;
    loser.streak = loser.streak <= 0 ? loser.streak - 1 : -1;
    winner.lastResult = `defeated the ${loser.name} ${winScore}-${loseScore}`;
    loser.lastResult = `lost to the ${winner.name} ${winScore}-${loseScore}`;
    history.push({
      turn,
      entityId: winner.id,
      event: `${winner.name} defeated ${loser.name} ${winScore}-${loseScore}`,
    });
  }

  // --- Championship check (any team reaches 5 wins past losses) ----------
  for (const team of roster.sportsTeams) {
    if (!team.championship && team.wins - team.losses >= 5) {
      team.championship = true;
      history.push({
        turn,
        entityId: team.id,
        event: `${team.name} clinched the ${team.league} League championship`,
      });
    }
  }

  // --- Musicians: tour state + controversies -----------------------------
  for (const m of roster.musicians) {
    // 25% chance to flip tour state per turn
    if (rng.next() < 0.25) {
      m.onTour = !m.onTour;
      if (!m.onTour) {
        m.tourPort = undefined;
      }
    }
    // 10% chance to start/end a controversy
    if (rng.next() < 0.1) {
      m.controversyActive = !m.controversyActive;
      if (m.controversyActive) {
        m.controversyDesc = pickControversy(rng);
        history.push({
          turn,
          entityId: m.id,
          event: `${m.name} embroiled in controversy: ${m.controversyDesc}`,
        });
      } else {
        m.controversyDesc = undefined;
      }
    }
  }

  // --- Celebrities: feuds + scandals -------------------------------------
  for (const c of roster.celebrities) {
    if (rng.next() < 0.08) {
      c.scandalActive = !c.scandalActive;
      if (c.scandalActive) {
        history.push({
          turn,
          entityId: c.id,
          event: `${c.name} caught in a fresh scandal`,
        });
      }
    }
    if (!c.currentFeud && rng.next() < 0.05) {
      const others = roster.celebrities.filter((o) => o.id !== c.id);
      if (others.length > 0) {
        c.currentFeud = others[rng.nextInt(0, others.length - 1)].id;
      }
    } else if (c.currentFeud && rng.next() < 0.15) {
      c.currentFeud = undefined;
    }
  }

  // --- Crime figures: occasional arrest/return ---------------------------
  for (const cf of roster.crimeFigures) {
    if (cf.active && rng.next() < 0.05) {
      cf.active = false;
      history.push({
        turn,
        entityId: cf.id,
        event: `${cf.name} reported arrested by Imperial authorities`,
      });
    } else if (!cf.active && rng.next() < 0.2) {
      cf.active = true;
      history.push({
        turn,
        entityId: cf.id,
        event: `${cf.name} resurfaces in the underworld`,
      });
    }
  }

  // Military officer status is driven by military_buildup chain — no tick here

  return history;
}
