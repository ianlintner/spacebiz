import type { AINarrativeTemplate } from "../../data/types.ts";

/**
 * Pure-flavor AI narrative beats. AI competitors do not see modals — the
 * storyteller picks one of these per cadence beat, applies the effect to the
 * AI's state, and surfaces the headline through the existing News Digest /
 * Rival Snapshot panels in TurnReportScene.
 *
 * Each entry is intentionally short and templated; the design is "lots of
 * cheap text variety" rather than rich branching.
 *
 * Token substitution: {company} → AI company name, {empire} → AI's empire.
 */
export const AI_NARRATIVE_TEMPLATES: AINarrativeTemplate[] = [
  // ── Boons (favorable to AI — used to buff trailing AI competitors) ──────
  {
    id: "boon_govt_contract",
    headline: "{company} lands a quiet government supply contract",
    tooltip: "+8% revenue for 2 turns",
    effect: { revenueMultiplier: 1.08, duration: 2 },
    flavor: "boon",
    weight: 5,
  },
  {
    id: "boon_fuel_hedge",
    headline: "{company} hedges fuel futures ahead of a price spike",
    tooltip: "-6% maintenance for 2 turns",
    effect: { maintenanceMultiplier: 0.94, duration: 2 },
    flavor: "boon",
    weight: 4,
  },
  {
    id: "boon_pr_win",
    headline: "{company} wins {empire} Trader of the Quarter",
    tooltip: "+5 reputation",
    effect: { reputationDelta: 5, duration: 1 },
    flavor: "boon",
    weight: 3,
  },
  {
    id: "boon_investor_round",
    headline: "{company} closes a fresh investor round",
    tooltip: "+§4,000 cash injection",
    effect: { cashDelta: 4000, duration: 1 },
    flavor: "boon",
    weight: 4,
  },
  {
    id: "boon_route_optimization",
    headline: "{company} announces route optimization breakthrough",
    tooltip: "+5% revenue for 3 turns",
    effect: { revenueMultiplier: 1.05, duration: 3 },
    flavor: "boon",
    weight: 4,
  },

  // ── Banes (unfavorable to AI — used to drag dominant AI back) ───────────
  {
    id: "bane_audit_scandal",
    headline: "{company} hit by a regulatory audit on {empire} books",
    tooltip: "-§3,000 fine, -3 reputation",
    effect: { cashDelta: -3000, reputationDelta: -3, duration: 1 },
    flavor: "bane",
    weight: 4,
  },
  {
    id: "bane_strike_action",
    headline: "{company} crews stage a 48-hour walkout",
    tooltip: "-10% revenue for 2 turns",
    effect: { revenueMultiplier: 0.9, duration: 2 },
    flavor: "bane",
    weight: 4,
  },
  {
    id: "bane_pirate_loss",
    headline: "{company} loses cargo to a pirate raid in {empire} space",
    tooltip: "-§2,500 + 3% maintenance hike for 2 turns",
    effect: {
      cashDelta: -2500,
      maintenanceMultiplier: 1.03,
      duration: 2,
    },
    flavor: "bane",
    weight: 4,
  },
  {
    id: "bane_breakdowns",
    headline: "Mechanical breakdowns plague {company} mainline ships",
    tooltip: "+8% maintenance for 2 turns",
    effect: { maintenanceMultiplier: 1.08, duration: 2 },
    flavor: "bane",
    weight: 3,
  },
  {
    id: "bane_pr_misstep",
    headline: "{company} executive scandal dominates the news cycle",
    tooltip: "-4 reputation",
    effect: { reputationDelta: -4, duration: 1 },
    flavor: "bane",
    weight: 3,
  },
];
