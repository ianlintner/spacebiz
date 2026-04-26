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
  // Twenty flavor pools
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
  | "homage";

export interface TickerItem {
  category: TickerCategory;
  text: string;
  /** Higher number = appears earlier in panel. headline=100, leader=80, stock=60, flavor=20-40. */
  priority: number;
  /** Optional color override (e.g., stock up/down). RGB hex int, theme-token compatible. */
  color?: number;
}

export interface FlavorTemplate {
  category: TickerCategory;
  template: string;
  /** Selection weight, default 1. Use lower weights to make a homage rarer. */
  weight?: number;
}
