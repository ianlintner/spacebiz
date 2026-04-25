import type {
  ChoiceOption,
  GameState,
  OptionScalingTag,
} from "../../data/types.ts";
import { STARTING_CASH } from "../../data/constants.ts";

/**
 * Per-tag contributions to a dilemma option's success%. Each tag returns a
 * signed delta in success-percentage points (NOT a fraction) — the formula
 * sums tag deltas on top of `baseSuccess` and clamps to [10, 100].
 *
 * Floor at 10 ensures every option always succeeds (per design: % scales
 * outcome quality, never produces failure branches). Ceiling at 100 because
 * percentages.
 */
export const SUCCESS_FLOOR = 10;
export const SUCCESS_CEILING = 100;

interface ContributionInput {
  state: GameState;
  option: ChoiceOption;
}

type TagContributor = (input: ContributionInput) => number;

const tagContributors: Record<OptionScalingTag, TagContributor> = {
  fleetCondition: ({ state }) => {
    if (state.fleet.length === 0) return -10;
    const avg =
      state.fleet.reduce((sum, s) => sum + s.condition, 0) / state.fleet.length;
    // condition is 0-100; map to ±20 around 50.
    return ((avg - 50) / 50) * 20;
  },
  fleetSize: ({ state }) => {
    // Diminishing returns: log2(n+1) * 6, clamped at 30.
    const raw = Math.log2(state.fleet.length + 1) * 6;
    return Math.min(30, raw);
  },
  tech: ({ state, option }) => {
    const completed = state.tech?.completedTechIds ?? [];
    if (option.scalingTechIds && option.scalingTechIds.length > 0) {
      const matches = option.scalingTechIds.filter((t) =>
        completed.includes(t),
      ).length;
      return matches * 15;
    }
    // Generic tech contribution: small bump per tech researched, capped at 30.
    return Math.min(30, completed.length * 3);
  },
  rep: ({ state }) => {
    // Reputation 0-100, centered at 50, contributing ±20.
    return ((state.reputation - 50) / 50) * 20;
  },
  cash: ({ state }) => {
    // Cash relative to starting cash; saturates at +20 once player has 2x starting cash.
    const ratio = Math.max(0, state.cash) / Math.max(1, STARTING_CASH);
    return Math.min(20, ratio * 10);
  },
};

interface SuccessBreakdown {
  baseSuccess: number;
  contributions: Array<{ tag: OptionScalingTag; delta: number }>;
  total: number;
}

export function computeSuccessBreakdown(
  state: GameState,
  option: ChoiceOption,
): SuccessBreakdown {
  const baseSuccess = option.baseSuccess ?? 50;
  const tags = option.scalingTags ?? [];
  const contributions = tags.map((tag) => ({
    tag,
    delta: Math.round(tagContributors[tag]({ state, option })),
  }));
  const sum = contributions.reduce((s, c) => s + c.delta, 0);
  const total = Math.max(
    SUCCESS_FLOOR,
    Math.min(SUCCESS_CEILING, baseSuccess + sum),
  );
  return { baseSuccess, contributions, total };
}

/**
 * Compute a single success% for an option. Convenience wrapper.
 */
export function computeOptionSuccess(
  state: GameState,
  option: ChoiceOption,
): number {
  return computeSuccessBreakdown(state, option).total;
}

/**
 * Human-readable label for a scaling tag. Used in the dilemma UI chips.
 */
export function tagLabel(tag: OptionScalingTag): string {
  switch (tag) {
    case "fleetCondition":
      return "Fleet Condition";
    case "fleetSize":
      return "Fleet Size";
    case "tech":
      return "Technology";
    case "rep":
      return "Reputation";
    case "cash":
      return "Cash Reserves";
  }
}
