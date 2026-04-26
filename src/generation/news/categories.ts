import type { TickerCategory } from "./types.ts";

export interface CategoryMeta {
  /** Three- or four-letter badge shown on each ticker line. */
  badge: string;
  /** Human label for legends or tooltips. */
  label: string;
  /** Theme color name (resolved to hex by consumer); falls back to text. */
  toneColor: "accent" | "profit" | "loss" | "warning" | "text" | "textDim";
}

/**
 * Registry covering all 23 categories (20 flavor + 3 structural).
 * Flavor categories use textDim tone so they recede behind real headlines.
 */
export const CATEGORY_META: Record<TickerCategory, CategoryMeta> = {
  // Structural
  headline: { badge: "TOP", label: "Headlines", toneColor: "accent" },
  leader: { badge: "LDR", label: "Leaderboard", toneColor: "warning" },
  stock: { badge: "MKT", label: "Markets", toneColor: "text" },

  // Flavor — twenty pools
  politics: { badge: "POL", label: "Politics", toneColor: "text" },
  corporate: { badge: "BIZ", label: "Corporate", toneColor: "text" },
  market_mover: { badge: "FIN", label: "Finance", toneColor: "text" },
  crime: { badge: "CRM", label: "Crime", toneColor: "text" },
  science: { badge: "SCI", label: "Science & Tech", toneColor: "text" },
  sports: { badge: "SPT", label: "Sports", toneColor: "textDim" },
  celebrity: { badge: "ENT", label: "Entertainment", toneColor: "textDim" },
  cosmic_weather: { badge: "WTH", label: "Cosmic Weather", toneColor: "text" },
  local: { badge: "LOC", label: "Local", toneColor: "textDim" },
  health: { badge: "HLT", label: "Health", toneColor: "textDim" },
  religion: { badge: "PHI", label: "Religion & Philosophy", toneColor: "textDim" },
  blotter: { badge: "BLT", label: "Crime Blotter", toneColor: "textDim" },
  food: { badge: "FUD", label: "Food & Cuisine", toneColor: "textDim" },
  realestate: { badge: "RE", label: "Real Estate", toneColor: "textDim" },
  travel: { badge: "TRV", label: "Travel", toneColor: "textDim" },
  fashion: { badge: "FSH", label: "Fashion", toneColor: "textDim" },
  academia: { badge: "EDU", label: "Academia", toneColor: "textDim" },
  xenobiology: { badge: "XBI", label: "Xenobiology", toneColor: "textDim" },
  obituary: { badge: "OBI", label: "Obituaries", toneColor: "textDim" },
  homage: { badge: "???", label: "Galactic Trivia", toneColor: "textDim" },
};

/** All twenty flavor categories, in canonical order (used by tests + feed balance). */
export const FLAVOR_CATEGORIES: TickerCategory[] = [
  "politics",
  "corporate",
  "market_mover",
  "crime",
  "science",
  "sports",
  "celebrity",
  "cosmic_weather",
  "local",
  "health",
  "religion",
  "blotter",
  "food",
  "realestate",
  "travel",
  "fashion",
  "academia",
  "xenobiology",
  "obituary",
  "homage",
];
