/**
 * Galactic News Ticker — types.
 *
 * The 20 flavor categories plus three "structural" categories (headline, leader, stock)
 * that come from real game state rather than templated pools.
 */
export type TickerCategory =
  // Structural — sourced from real game state
  | "headline"
  | "leader"
  | "stock"
  // Twenty original flavor pools
  | "politics"
  | "corporate"
  | "market_mover"
  | "crime"
  | "science"
  | "sports"
  | "celebrity"
  | "cosmic_weather"
  | "local"
  | "health"
  | "religion"
  | "blotter"
  | "food"
  | "realestate"
  | "travel"
  | "fashion"
  | "academia"
  | "xenobiology"
  | "obituary"
  | "homage"
  // Six new flavor pools (2026-05 expansion)
  | "anomaly"
  | "music"
  | "discovery"
  | "gossip"
  | "military"
  | "propaganda";

export type StoryDepth = "short" | "medium" | "long";

export interface TickerItem {
  category: TickerCategory;
  text: string;
  /** Higher number = appears earlier in panel. headline=100, leader=80, stock=60, flavor=20-40. */
  priority: number;
  /** Optional color override (e.g., stock up/down). RGB hex int, theme-token compatible. */
  color?: number;
  /** Optional rendered story body (longer narrative shown in the news-variant DialogueModal). */
  story?: string;
  /** Story depth hint used for UI badges (e.g., [DEVELOPING] for "long"). */
  storyDepth?: StoryDepth;
}

export interface FlavorTemplate {
  category: TickerCategory;
  template: string;
  /** Selection weight, default 1. Use lower weights to make a homage rarer. */
  weight?: number;
  /** 1-3 story body variants; one is picked at render time. Tokens supported same as `template`. */
  story?: string[];
  /** Override default depth for this category. */
  storyDepth?: StoryDepth;
}

/** Default story depth by category — used by feed/scene when template omits storyDepth. */
export const CATEGORY_STORY_DEPTH: Record<TickerCategory, StoryDepth> = {
  // Structural — no story rendered
  headline: "short",
  leader: "short",
  stock: "short",
  // Short
  blotter: "short",
  obituary: "short",
  food: "short",
  fashion: "short",
  gossip: "short",
  // Medium
  sports: "medium",
  music: "medium",
  celebrity: "medium",
  crime: "medium",
  politics: "medium",
  corporate: "medium",
  propaganda: "medium",
  military: "medium",
  local: "medium",
  health: "medium",
  religion: "medium",
  realestate: "medium",
  travel: "medium",
  academia: "medium",
  market_mover: "medium",
  homage: "medium",
  // Long
  anomaly: "long",
  discovery: "long",
  science: "long",
  cosmic_weather: "long",
  xenobiology: "long",
};
