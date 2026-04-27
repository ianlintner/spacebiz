import type { GameState } from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";
import { SeededRNG as SeededRNGCtor } from "../../utils/SeededRNG.ts";

/**
 * Galactic Market — synthetic stock ticker.
 *
 * Symbols are derived deterministically from current game state (player + AI
 * companies + a fixed pool of flavor brands). Prices are recomputed each turn
 * from a per-company seed so the player sees a consistent walk over time.
 *
 * Nothing here mutates GameState: the ticker is a pure projection.
 */

export interface StockQuote {
  symbol: string;
  price: number;
  /** Cycle-over-cycle delta as a fraction (e.g. 0.034 = +3.4%). */
  changePct: number;
  /** Optional descriptive line; consumers may format their own. */
  context: string;
}

const FLAVOR_BRANDS: Array<{ symbol: string; baseName: string }> = [
  { symbol: "VOID", baseName: "Voidsong Holdings" },
  { symbol: "CYGN", baseName: "Cygnus Bonded Couriers" },
  { symbol: "IONX", baseName: "Ionix Drive Systems" },
  { symbol: "ORBT", baseName: "Orbit Mutual Insurance" },
  { symbol: "TRAN", baseName: "Trans-Sector Logistics" },
  { symbol: "AURA", baseName: "Aurum Refining Co" },
  { symbol: "BRIT", baseName: "Britomart Synth-Goods" },
  { symbol: "DELP", baseName: "Delphi Ratings" },
  { symbol: "EXOT", baseName: "Exotech Materials" },
  { symbol: "GLDN", baseName: "Golden Path Realty" },
  { symbol: "HALO", baseName: "Halo Hospitality Group" },
  { symbol: "JNTR", baseName: "Janitor Industries (yes)" },
  { symbol: "KETU", baseName: "Ketu Bioworks" },
  { symbol: "LMNS", baseName: "Lumens Power" },
  { symbol: "MARG", baseName: "Margery & Sons Brokers" },
  { symbol: "NABL", baseName: "Nabla Asset Mgmt" },
  { symbol: "PSCH", baseName: "Psyche Media Co" },
  { symbol: "QSAR", baseName: "Quasar Capital" },
  { symbol: "SPCX", baseName: "Spice Exchange Trust" },
  { symbol: "TWNL", baseName: "Tween-light Industries" },
];

function makeSymbolFromName(name: string, fallbackSeed: number): string {
  const letters = name
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 4);
  if (letters.length >= 3) {
    return letters.length === 4 ? letters : letters + "X";
  }
  // Synthetic fallback: deterministic from seed.
  const alpha = "ABCDEFGHJKLMNPRSTVWXYZ";
  const r = new SeededRNGCtor(fallbackSeed);
  let out = "";
  for (let i = 0; i < 4; i++) out += alpha[r.nextInt(0, alpha.length - 1)];
  return out;
}

export interface StockEntry {
  symbol: string;
  /** Display name (company or brand). */
  name: string;
  /** Whether this symbol tracks a real AI company (true) or flavor brand (false). */
  realCompany: boolean;
  /** Cash anchor — used to derive a plausible base price. Optional for flavor brands. */
  anchorCash?: number;
}

/**
 * Build the static-for-this-turn stock list. Order is stable across turns so
 * the same symbol points to the same company.
 */
export function buildStockList(state: GameState): StockEntry[] {
  const entries: StockEntry[] = [];

  // Player company
  entries.push({
    symbol: makeSymbolFromName(state.companyName, state.seed),
    name: state.companyName,
    realCompany: true,
    anchorCash: state.cash,
  });

  // AI rivals
  for (const ai of state.aiCompanies) {
    if (ai.bankrupt) continue;
    const sym = makeSymbolFromName(ai.name, state.seed + ai.id.length);
    if (entries.find((e) => e.symbol === sym)) continue;
    entries.push({
      symbol: sym,
      name: ai.name,
      realCompany: true,
      anchorCash: ai.cash,
    });
  }

  // Flavor brands rounding it out to a meaty board.
  for (const fb of FLAVOR_BRANDS) {
    if (entries.find((e) => e.symbol === fb.symbol)) continue;
    entries.push({ symbol: fb.symbol, name: fb.baseName, realCompany: false });
  }

  return entries;
}

/**
 * Compute a per-turn quote for a single stock. Deterministic given (seed, turn, symbol).
 * Real companies anchor near (cash / 100K); flavor brands oscillate around 50–500 cr.
 */
export function quoteStock(
  entry: StockEntry,
  seed: number,
  turn: number,
): StockQuote {
  // Hash symbol into the seed so different symbols walk independently.
  let h = 5381;
  for (let i = 0; i < entry.symbol.length; i++) {
    h = ((h << 5) + h + entry.symbol.charCodeAt(i)) | 0;
  }
  const rng = new SeededRNGCtor((seed * 31 + turn * 17 + h) | 0);

  let basePrice: number;
  if (entry.realCompany && entry.anchorCash !== undefined) {
    basePrice = Math.max(1, Math.round(entry.anchorCash / 100));
  } else {
    basePrice = rng.nextInt(40, 480);
  }

  // Daily walk: roll a return between -8% and +8%, with rare blowouts.
  const blowout = rng.next() < 0.04;
  const ret = blowout ? rng.nextFloat(-0.25, 0.25) : rng.nextFloat(-0.08, 0.08);
  const price = Math.max(1, Math.round(basePrice * (1 + ret) * 100) / 100);
  const changePct = ret;

  const context = describeMove(entry, changePct, rng);

  return {
    symbol: entry.symbol,
    price,
    changePct,
    context,
  };
}

const POSITIVE_REASONS = [
  "on contract win",
  "on guidance raise",
  "after route expansion",
  "on regulatory greenlight",
  "after analyst upgrade",
  "on dividend boost",
  "on patent grant",
  "after merger talks leak",
  "on insider buying",
  "after benchmark inclusion",
];

const NEGATIVE_REASONS = [
  "on guidance miss",
  "after fleet incident",
  "on regulator scrutiny",
  "after analyst downgrade",
  "on customer loss",
  "after CEO departure",
  "on profit warning",
  "after lawsuit filed",
  "on insider selling",
  "after benchmark removal",
];

const FLAT_REASONS = [
  "on light volume",
  "ahead of earnings",
  "after sector reshuffle",
  "on no specific news",
  "after technical session",
];

function describeMove(
  entry: StockEntry,
  changePct: number,
  rng: SeededRNG,
): string {
  const pct = (changePct * 100).toFixed(1);
  const sign = changePct >= 0 ? "+" : "";
  if (Math.abs(changePct) < 0.01) {
    return `${entry.symbol} flat at ${entry.realCompany ? entry.name : "trading desk"} ${rng.pick(FLAT_REASONS)}`;
  }
  const reason =
    changePct >= 0 ? rng.pick(POSITIVE_REASONS) : rng.pick(NEGATIVE_REASONS);
  return `${entry.symbol} ${sign}${pct}% ${reason}`;
}

/**
 * Convenience: build the stock list and quote each entry for the given turn.
 */
export function quoteAllStocks(
  state: GameState,
  seed: number,
  turn: number,
): StockQuote[] {
  const list = buildStockList(state);
  return list.map((e) => quoteStock(e, seed, turn));
}
