import type { GameState, TurnResult } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import type { TickerItem, TickerCategory } from "./types.ts";
import { FLAVOR_CATEGORIES } from "./categories.ts";
import { ALL_FLAVOR_TEMPLATES, getTemplatesForCategory } from "./flavorTemplates.ts";
import { substituteTickerTokens } from "./tokens.ts";
import { quoteAllStocks, type StockQuote } from "./stockTicker.ts";

/**
 * Mix the per-turn news ticker. Output is fully deterministic given (seed, turn).
 *
 * Composition (target ~22 items):
 *   • 3-5 headline items from real game events / narrative beats
 *   • up to 4 leader rankings (top companies by cash)
 *   • 5 stock movers (largest absolute moves)
 *   • 8-12 flavor items, drawn from a balanced subset of categories
 */
export interface FeedOptions {
  /** Cap of total items returned. Default 22. */
  maxItems?: number;
  /** Cap of items per flavor category in one feed. Default 3. */
  perCategoryCap?: number;
  /** Number of distinct flavor categories to draw from. Default 6. */
  flavorCategoryCount?: number;
}

export function generateTickerFeed(
  state: GameState,
  turnResult: TurnResult,
  opts: FeedOptions = {},
): TickerItem[] {
  const maxItems = opts.maxItems ?? 22;
  const perCategoryCap = opts.perCategoryCap ?? 3;
  const flavorCategoryCount = opts.flavorCategoryCount ?? 6;

  const rng = new SeededRNG(((state.seed * 31) | 0) + turnResult.turn);
  const items: TickerItem[] = [];

  // ── 1) Headlines from real events ──────────────────────────────
  for (const eventName of turnResult.eventsOccurred.slice(0, 5)) {
    const matched = state.activeEvents.find((e) => e.name === eventName);
    items.push({
      category: "headline",
      text: matched ? `${eventName} — ${matched.description}` : eventName,
      priority: 100,
    });
  }

  for (const ai of turnResult.aiSummaries) {
    if (ai.narrativeBeat && items.length < maxItems) {
      items.push({
        category: "headline",
        text: `${ai.companyName}: ${ai.narrativeBeat.headline}`,
        priority: 95,
      });
    }
  }

  // ── 2) Leader rankings ────────────────────────────────────────
  type Leader = { name: string; cash: number; isPlayer: boolean };
  const leaders: Leader[] = [
    { name: state.companyName, cash: state.cash, isPlayer: true },
    ...state.aiCompanies
      .filter((c) => !c.bankrupt)
      .map<Leader>((c) => ({ name: c.name, cash: c.cash, isPlayer: false })),
  ]
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 4);

  for (let i = 0; i < leaders.length; i++) {
    const l = leaders[i];
    const rank = i + 1;
    const lead = i === 0 ? "leads" : i === leaders.length - 1 ? "trails" : "holds";
    items.push({
      category: "leader",
      text: `#${rank} ${l.name} ${lead} the field at ${formatCash(l.cash)}${l.isPlayer ? " (you)" : ""}`,
      priority: 80 - i,
    });
  }

  // ── 3) Stock movers ───────────────────────────────────────────
  const allQuotes: StockQuote[] = quoteAllStocks(state, state.seed, turnResult.turn);
  const sortedByMove = allQuotes
    .slice()
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  for (const q of sortedByMove.slice(0, 5)) {
    items.push({
      category: "stock",
      text: q.context + ` — last ${q.price.toFixed(2)} cr`,
      priority: 60,
      color: q.changePct >= 0 ? COLOR_PROFIT : COLOR_LOSS,
    });
  }

  // ── 4) Flavor news ────────────────────────────────────────────
  const remaining = Math.max(0, maxItems - items.length);
  if (remaining > 0) {
    const chosenCategories = chooseFlavorCategories(rng, flavorCategoryCount);
    const usedTemplates = new Set<string>();
    let drawn = 0;
    let safety = 0;

    while (drawn < remaining && safety < remaining * 6) {
      safety++;
      const cat = chosenCategories[drawn % chosenCategories.length];
      const inCategorySoFar = items.filter((i) => i.category === cat).length;
      if (inCategorySoFar >= perCategoryCap) continue;

      const pool = getTemplatesForCategory(cat);
      if (pool.length === 0) continue;
      const tmpl = pool[rng.nextInt(0, pool.length - 1)];
      if (usedTemplates.has(tmpl.template)) continue;
      usedTemplates.add(tmpl.template);

      items.push({
        category: cat,
        text: substituteTickerTokens(tmpl.template, state, rng),
        priority: 20 + (5 - (drawn % 5)),
      });
      drawn++;
    }
  }

  // Sort by priority desc; stable.
  return items
    .map((it, idx) => ({ it, idx }))
    .sort((a, b) => b.it.priority - a.it.priority || a.idx - b.idx)
    .map((x) => x.it)
    .slice(0, maxItems);
}

function chooseFlavorCategories(
  rng: SeededRNG,
  count: number,
): TickerCategory[] {
  const all = FLAVOR_CATEGORIES.slice();
  // Bias: lower the chance of homage so it feels rarer / more delightful.
  // Do this by giving each category an equal weight except homage at 0.4.
  const weights = all.map((c) => (c === "homage" ? 0.4 : 1));
  const picked: TickerCategory[] = [];
  for (let i = 0; i < count && all.length > 0; i++) {
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = rng.nextFloat(0, total);
    let idx = 0;
    while (idx < weights.length - 1 && roll > weights[idx]) {
      roll -= weights[idx];
      idx++;
    }
    picked.push(all[idx]);
    all.splice(idx, 1);
    weights.splice(idx, 1);
  }
  return picked;
}

const COLOR_PROFIT = 0x00ff88;
const COLOR_LOSS = 0xff6666;

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "§" + abs.toLocaleString("en-US");
}

/** Exposed for tests — total flavor template count. */
export function totalTemplates(): number {
  return ALL_FLAVOR_TEMPLATES.length;
}
