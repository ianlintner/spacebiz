import type { TickerCategory } from "./types.ts";

export type NewscasterType =
  | "anchor"
  | "science"
  | "finance"
  | "fashion"
  | "field";

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
};

export const NEWSCASTER_BY_CATEGORY: Record<TickerCategory, NewscasterType> = {
  // Structural
  headline: "anchor",
  leader: "anchor",
  stock: "finance",
  // Flavor
  politics: "anchor",
  corporate: "finance",
  market_mover: "finance",
  crime: "field",
  science: "science",
  sports: "field",
  celebrity: "fashion",
  cosmic_weather: "science",
  local: "field",
  health: "science",
  religion: "anchor",
  blotter: "field",
  food: "fashion",
  realestate: "finance",
  travel: "field",
  fashion: "fashion",
  academia: "science",
  xenobiology: "science",
  obituary: "anchor",
  homage: "anchor",
};

export function getNewscasterForCategory(cat: TickerCategory): NewscasterDef {
  const type = NEWSCASTER_BY_CATEGORY[cat];
  return NEWSCASTER_DEFS[type];
}
