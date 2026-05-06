import type { TickerCategory } from "./types.ts";

export type NewscasterType =
  | "anchor"
  | "anchor_b"
  | "anchor_c"
  | "anchor_d"
  | "science"
  | "finance"
  | "fashion"
  | "field"
  | "weather"
  | "paparazzi"
  | "sports"
  | "investigator"
  | "explorer";

export interface NewscasterDef {
  type: NewscasterType;
  name: string;
  title: string;
  channel: string;
  /** Texture key used in Phaser after portrait preload. */
  portraitKey: string;
  /** Accent color (hex int) for dialog header. */
  accentColor: number;
}

export const NEWSCASTER_DEFS: Record<NewscasterType, NewscasterDef> = {
  anchor: {
    type: "anchor",
    name: "Stellara Vex",
    title: "Lead Anchor",
    channel: "Galactic News Network",
    portraitKey: "newscaster-anchor",
    accentColor: 0x4488ff,
  },
  anchor_b: {
    type: "anchor_b",
    name: "Vaxis Morn",
    title: "Senior Correspondent",
    channel: "Galactic News Network",
    portraitKey: "newscaster-anchor-b",
    accentColor: 0x88ccff,
  },
  anchor_c: {
    type: "anchor_c",
    name: "The Presence",
    title: "Omnibus Anchor",
    channel: "Galactic News Network",
    portraitKey: "newscaster-anchor-c",
    accentColor: 0xccff88,
  },
  anchor_d: {
    type: "anchor_d",
    name: "Crixx Velaan",
    title: "Night Desk Anchor",
    channel: "Galactic News Network",
    portraitKey: "newscaster-anchor-d",
    accentColor: 0xaa88ff,
  },
  science: {
    type: "science",
    name: "Dr. Krill Vexx",
    title: "Science & Tech Correspondent",
    channel: "GNN Science Desk",
    portraitKey: "newscaster-science",
    accentColor: 0x44ffcc,
  },
  finance: {
    type: "finance",
    name: "Sterling Hawkes",
    title: "Markets Analyst",
    channel: "GNN Markets Desk",
    portraitKey: "newscaster-finance",
    accentColor: 0xffd700,
  },
  fashion: {
    type: "fashion",
    name: "CHIC-9",
    title: "Style & Culture Correspondent",
    channel: "GNN Lifestyle Desk",
    portraitKey: "newscaster-fashion",
    accentColor: 0xff44cc,
  },
  field: {
    type: "field",
    name: "Grix Vander",
    title: "Field Reporter",
    channel: "GNN Field Bureau",
    portraitKey: "newscaster-field",
    accentColor: 0xff8844,
  },
  weather: {
    type: "weather",
    name: "Syx-7 Vermis",
    title: "Space Weather & Crisis Reporter",
    channel: "GNN Storm Watch",
    portraitKey: "newscaster-weather",
    accentColor: 0xff4444,
  },
  paparazzi: {
    type: "paparazzi",
    name: "Blix Snarr",
    title: "Entertainment & Culture Correspondent",
    channel: "GNN Spotlight",
    portraitKey: "newscaster-paparazzi",
    accentColor: 0xff88ff,
  },
  sports: {
    type: "sports",
    name: "Krag Ironstone",
    title: "Sports Desk Anchor",
    channel: "GNN Sports",
    portraitKey: "newscaster-sports",
    accentColor: 0xff6600,
  },
  investigator: {
    type: "investigator",
    name: "Mira Tendrax",
    title: "Investigative Correspondent",
    channel: "GNN Investigations",
    portraitKey: "newscaster-investigator",
    accentColor: 0xcc4444,
  },
  explorer: {
    type: "explorer",
    name: "Prof. Lumis Thane",
    title: "Deep Space & Xenobiology Correspondent",
    channel: "GNN Discovery Desk",
    portraitKey: "newscaster-explorer",
    accentColor: 0x44ffaa,
  },
};

export const NEWSCASTER_BY_CATEGORY: Record<TickerCategory, NewscasterType> = {
  // Structural
  headline: "anchor",
  leader: "anchor_b",
  stock: "finance",
  // Flavor
  politics: "investigator",
  corporate: "finance",
  market_mover: "finance",
  crime: "investigator",
  science: "science",
  sports: "sports",
  celebrity: "paparazzi",
  cosmic_weather: "weather",
  local: "field",
  health: "explorer",
  religion: "anchor_c",
  blotter: "investigator",
  food: "paparazzi",
  realestate: "finance",
  travel: "field",
  fashion: "fashion",
  academia: "explorer",
  xenobiology: "explorer",
  obituary: "anchor_d",
  homage: "anchor_b",
};

export function getNewscasterForCategory(cat: TickerCategory): NewscasterDef {
  const type = NEWSCASTER_BY_CATEGORY[cat];
  return NEWSCASTER_DEFS[type];
}
