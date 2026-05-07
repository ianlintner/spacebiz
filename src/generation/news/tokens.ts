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
  const roster = state.universeRoster;

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
      // ── Roster tokens (universeRoster-backed) ────────────────────
      case "team": {
        if (!roster?.sportsTeams?.length) return match;
        if (ctx.bound.has("team")) return ctx.bound.get("team")!;
        const team =
          roster.sportsTeams[ctx.rng.nextInt(0, roster.sportsTeams.length - 1)];
        ctx.bound.set("team", team.name);
        ctx.bound.set("__team_id", team.id);
        if (team.lastResult)
          ctx.bound.set("__team_last_result", team.lastResult);
        return team.name;
      }
      case "team2": {
        if (!roster?.sportsTeams?.length) return match;
        if (ctx.bound.has("team2")) return ctx.bound.get("team2")!;
        const taken = ctx.bound.get("__team_id");
        const pool = roster.sportsTeams.filter((t) => t.id !== taken);
        if (!pool.length) return match;
        const team = pool[ctx.rng.nextInt(0, pool.length - 1)];
        ctx.bound.set("team2", team.name);
        return team.name;
      }
      case "last_result": {
        return ctx.bound.get("__team_last_result") ?? "took the field";
      }
      case "musician": {
        if (!roster?.musicians?.length) return match;
        if (ctx.bound.has("musician")) return ctx.bound.get("musician")!;
        const m =
          roster.musicians[ctx.rng.nextInt(0, roster.musicians.length - 1)];
        ctx.bound.set("musician", m.name);
        ctx.bound.set("__musician_id", m.id);
        if (m.controversyDesc)
          ctx.bound.set("__controversy", m.controversyDesc);
        if (m.currentAlbum) ctx.bound.set("__album", m.currentAlbum);
        ctx.bound.set("__genre", m.genre);
        return m.name;
      }
      case "album": {
        return ctx.bound.get("__album") ?? "their latest record";
      }
      case "genre": {
        return ctx.bound.get("__genre") ?? "void-jazz";
      }
      case "controversy": {
        return ctx.bound.get("__controversy") ?? "an unspecified incident";
      }
      case "celeb": {
        if (!roster?.celebrities?.length) return match;
        if (ctx.bound.has("celeb")) return ctx.bound.get("celeb")!;
        const c =
          roster.celebrities[ctx.rng.nextInt(0, roster.celebrities.length - 1)];
        ctx.bound.set("celeb", c.name);
        return c.name;
      }
      case "pundit": {
        if (!roster?.pundits?.length) return match;
        if (ctx.bound.has("pundit")) return ctx.bound.get("pundit")!;
        const p = roster.pundits[ctx.rng.nextInt(0, roster.pundits.length - 1)];
        ctx.bound.set("pundit", p.name);
        return p.name;
      }
      case "crime_figure": {
        if (!roster?.crimeFigures?.length) return match;
        const active = roster.crimeFigures.filter((c) => c.active);
        if (!active.length) return roster.crimeFigures[0].name;
        if (ctx.bound.has("crime_figure"))
          return ctx.bound.get("crime_figure")!;
        const cf = active[ctx.rng.nextInt(0, active.length - 1)];
        ctx.bound.set("crime_figure", cf.name);
        return cf.name;
      }
      case "officer": {
        if (!roster?.militaryOfficers?.length) return match;
        if (ctx.bound.has("officer")) return ctx.bound.get("officer")!;
        const o =
          roster.militaryOfficers[
            ctx.rng.nextInt(0, roster.militaryOfficers.length - 1)
          ];
        ctx.bound.set("officer", o.name);
        ctx.bound.set("__rank", o.rank);
        return o.name;
      }
      case "rank": {
        if (ctx.bound.has("__rank")) return ctx.bound.get("__rank")!;
        if (!roster?.militaryOfficers?.length) return match;
        const o =
          roster.militaryOfficers[
            ctx.rng.nextInt(0, roster.militaryOfficers.length - 1)
          ];
        ctx.bound.set("__rank", o.rank);
        return o.rank;
      }
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
  // Roster tokens (universeRoster-backed)
  "team",
  "team2",
  "last_result",
  "musician",
  "album",
  "genre",
  "controversy",
  "celeb",
  "pundit",
  "crime_figure",
  "officer",
  "rank",
] as const;
