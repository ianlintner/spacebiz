import type { GameState } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import type { TickerItem, TickerCategory } from "./types.ts";
import { getTemplatesForCategory } from "./flavorTemplates.ts";
import { substituteTickerTokens } from "./tokens.ts";

/**
 * Opening ticker feed shown before the first turn completes.
 *
 * Leads with the player's company founding announcement, then fills the
 * crawl with galaxy-flavored color items so the universe feels alive
 * from the very first second.
 */
export function generateOpeningFeed(state: GameState): TickerItem[] {
  const rng = new SeededRNG((state.seed * 53 + 7) | 0);

  const empire = state.galaxy.empires.find(
    (e) => e.id === state.playerEmpireId,
  );
  const empireName = empire?.name ?? "the frontier";

  const items: TickerItem[] = [];

  // ── Founding headline ──────────────────────────────────────────
  items.push({
    category: "headline",
    text: `${state.ceoName} founds ${state.companyName} in ${empireName} — a new freight carrier clears docking clearance`,
    priority: 100,
  });

  // ── Corporate registration color item ─────────────────────────
  items.push({
    category: "corporate",
    text: `${state.companyName} files articles of incorporation; CEO ${state.ceoName} promises to "connect the stars, one shipment at a time"`,
    priority: 90,
  });

  // ── Galaxy-flavor color items ──────────────────────────────────
  // Pick a fixed mix of vivid categories to seed the crawl with life.
  const galaxyCategories: TickerCategory[] = [
    "politics",
    "cosmic_weather",
    "science",
    "market_mover",
    "xenobiology",
    "local",
    "crime",
  ];

  for (const cat of galaxyCategories) {
    const pool = getTemplatesForCategory(cat);
    if (pool.length === 0) continue;
    const tmpl = pool[rng.nextInt(0, pool.length - 1)];
    items.push({
      category: cat,
      text: substituteTickerTokens(tmpl.template, state, rng),
      priority: 30,
    });
  }

  return items;
}
