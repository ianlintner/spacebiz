import type { GameState } from "../../data/types.ts";
import type { SeededRNG } from "../../utils/SeededRNG.ts";

/**
 * Token substitution for flavor templates.
 *
 * Recognized tokens:
 *   {empire} {empire2}   distinct empires
 *   {company} {rival}    AI company name (rival = alias)
 *   {ceo} {ceo2}         distinct CEO names
 *   {planet} {planet2}   distinct planet names
 *   {port}               alias for {planet} (matches Storyteller)
 *   {system}             star system
 *   {sector}             sector
 *   {stock}              4-letter ticker symbol
 *   {percent}            % delta, sign template-controlled by surrounding text
 *   {credits}            "1.2M cr" / "340K cr"
 *   {tonnage}            "240 tonnes" / "1,800 tonnes"
 *   {n}                  small int 2..9
 *   {n2}                 medium int 10..99
 *   {adj}                curated sci-fi adjective
 *   {commodity}          curated cargo / luxury good
 *
 * Unknown tokens are left in place so authoring typos are visible during dev
 * without crashing the panel.
 */

const ADJECTIVES = [
  "rogue",
  "mostly-harmless",
  "deuterium-soaked",
  "sub-warp",
  "cantankerous",
  "recently-defrosted",
  "improbably-cheerful",
  "moderately-sentient",
  "freshly-laundered",
  "unionized",
  "recently-reclassified",
  "cryo-preserved",
  "post-singularity",
  "barely-licensed",
  "long-suffering",
  "definitely-not-pirated",
  "tax-deductible",
  "vaguely-illegal",
  "thoroughly-lawyered",
  "slightly-haunted",
];

const COMMODITIES = [
  "spice",
  "deuterium",
  "tritium",
  "cryo-pearls",
  "void-honey",
  "babel fish stock",
  "regolith caviar",
  "nano-glass",
  "kelpfiber",
  "dark matter futures",
  "improbability dust",
  "antimatter beads",
  "geo-printed silk",
  "synth-mahogany",
  "ferrofluid",
  "neutronium ingots",
  "psy-amber",
  "cup-of-tea analogue",
  "tritanium plate",
  "compressed boredom",
];

const STOCK_SUFFIXES = ["X", "C", "V", "T", "G", "Q"];

interface TokenContext {
  state: GameState;
  rng: SeededRNG;
  /** Per-call cache so {empire} and {empire2} pick different values. */
  bound: Map<string, string>;
}

function pickEmpireName(ctx: TokenContext, key: string): string {
  const empires = ctx.state.galaxy.empires;
  if (empires.length === 0) return "the council";
  const used = new Set(ctx.bound.values());
  const candidates = empires.filter((e) => !used.has(e.name));
  const pool = candidates.length > 0 ? candidates : empires;
  const name = ctx.rng.pick(pool).name;
  ctx.bound.set(key, name);
  return name;
}

function pickCompanyName(ctx: TokenContext, key: string): string {
  const live = ctx.state.aiCompanies.filter((c) => !c.bankrupt);
  if (live.length === 0) return ctx.state.companyName;
  const used = new Set(ctx.bound.values());
  const candidates = live.filter((c) => !used.has(c.name));
  const pool = candidates.length > 0 ? candidates : live;
  const name = ctx.rng.pick(pool).name;
  ctx.bound.set(key, name);
  return name;
}

function pickCeoName(ctx: TokenContext, key: string): string {
  const live = ctx.state.aiCompanies.filter((c) => !c.bankrupt);
  if (live.length === 0) return ctx.state.ceoName;
  const used = new Set(ctx.bound.values());
  const candidates = live.filter((c) => !used.has(c.ceoName));
  const pool = candidates.length > 0 ? candidates : live;
  const name = ctx.rng.pick(pool).ceoName;
  ctx.bound.set(key, name);
  return name;
}

function pickPlanetName(ctx: TokenContext, key: string): string {
  const planets = ctx.state.galaxy.planets;
  if (planets.length === 0) return "the spaceport";
  const used = new Set(ctx.bound.values());
  const candidates = planets.filter((p) => !used.has(p.name));
  const pool = candidates.length > 0 ? candidates : planets;
  const name = ctx.rng.pick(pool).name;
  ctx.bound.set(key, name);
  return name;
}

function pickSystemName(ctx: TokenContext): string {
  const systems = ctx.state.galaxy.systems;
  if (systems.length === 0) return "the inner reach";
  return ctx.rng.pick(systems).name;
}

function pickSectorName(ctx: TokenContext): string {
  const sectors = ctx.state.galaxy.sectors;
  if (sectors.length === 0) return "the Rim";
  return ctx.rng.pick(sectors).name;
}

function pickStock(ctx: TokenContext): string {
  // Synthesize a plausible 4-letter symbol from a company name + suffix.
  const live = ctx.state.aiCompanies.filter((c) => !c.bankrupt);
  if (live.length > 0) {
    const c = ctx.rng.pick(live);
    const letters = c.name
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3);
    const suffix = ctx.rng.pick(STOCK_SUFFIXES);
    if (letters.length >= 3) return letters + suffix;
  }
  // Fallback: random 4-letter symbol.
  const alpha = "ABCDEFGHJKLMNPRSTVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++)
    out += alpha[ctx.rng.nextInt(0, alpha.length - 1)];
  return out;
}

function pickPercent(ctx: TokenContext): string {
  // Bias toward small swings; occasionally headline-grabbing larger ones.
  const roll = ctx.rng.next();
  if (roll < 0.6) return ctx.rng.nextInt(1, 9).toString();
  if (roll < 0.9) return ctx.rng.nextInt(10, 30).toString();
  return ctx.rng.nextInt(35, 90).toString();
}

function pickCredits(ctx: TokenContext): string {
  const magnitude = ctx.rng.nextInt(0, 2);
  if (magnitude === 0) {
    return ctx.rng.nextInt(50, 990) + "K cr";
  }
  if (magnitude === 1) {
    return (ctx.rng.nextInt(11, 99) / 10).toFixed(1) + "M cr";
  }
  return (ctx.rng.nextInt(11, 99) / 10).toFixed(1) + "B cr";
}

function pickTonnage(ctx: TokenContext): string {
  const v = ctx.rng.nextInt(40, 9999);
  return v.toLocaleString("en-US") + " tonnes";
}

/**
 * Substitute all known tokens in a template string. Deterministic for a given
 * (state, rng-state, template).
 */
export function substituteTickerTokens(
  template: string,
  state: GameState,
  rng: SeededRNG,
): string {
  const ctx: TokenContext = { state, rng, bound: new Map() };

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, raw) => {
    const tok = String(raw).toLowerCase();
    switch (tok) {
      case "empire":
        return pickEmpireName(ctx, "empire");
      case "empire2":
        return pickEmpireName(ctx, "empire2");
      case "company":
      case "rival":
        return pickCompanyName(ctx, "company");
      case "ceo":
        return pickCeoName(ctx, "ceo");
      case "ceo2":
        return pickCeoName(ctx, "ceo2");
      case "planet":
      case "port":
        return pickPlanetName(ctx, "planet");
      case "planet2":
        return pickPlanetName(ctx, "planet2");
      case "system":
        return pickSystemName(ctx);
      case "sector":
        return pickSectorName(ctx);
      case "stock":
        return pickStock(ctx);
      case "percent":
        return pickPercent(ctx);
      case "credits":
        return pickCredits(ctx);
      case "tonnage":
        return pickTonnage(ctx);
      case "n":
        return rng.nextInt(2, 9).toString();
      case "n2":
        return rng.nextInt(10, 99).toString();
      case "adj":
        return rng.pick(ADJECTIVES);
      case "commodity":
        return rng.pick(COMMODITIES);
      default:
        return match;
    }
  });
}

/** Exposed for tests — list of token names this engine substitutes. */
export const KNOWN_TOKENS = [
  "empire",
  "empire2",
  "company",
  "rival",
  "ceo",
  "ceo2",
  "planet",
  "planet2",
  "port",
  "system",
  "sector",
  "stock",
  "percent",
  "credits",
  "tonnage",
  "n",
  "n2",
  "adj",
  "commodity",
] as const;
