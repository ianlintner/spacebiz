import type { Contract, GameState } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NegotiationChoice = "standard" | "haggle" | "early_completion";

export interface NegotiationOption {
  choice: NegotiationChoice;
  label: string;
  description: string;
  rewardMultiplier: number;
  depositMultiplier: number;
  /** >1 = more time, <1 = less time (tighter deadline) */
  deadlineMultiplier: number;
  /** For haggle: chance negotiation succeeds vs fails (1.0 = always succeeds) */
  successChance: number;
  /** Minimum reputation score required to see this option */
  requiresReputation?: number;
}

export interface NegotiationResult {
  success: boolean;
  appliedMultipliers: {
    reward: number;
    deposit: number;
    deadlineTurns: number;
  };
  message: string;
}

// ---------------------------------------------------------------------------
// Option Definitions
// ---------------------------------------------------------------------------

const STANDARD_OPTION: NegotiationOption = {
  choice: "standard",
  label: "Standard Terms",
  description: "Accept the contract as offered. No changes to terms.",
  rewardMultiplier: 1.0,
  depositMultiplier: 1.0,
  deadlineMultiplier: 1.0,
  successChance: 1.0,
};

const HAGGLE_OPTION: NegotiationOption = {
  choice: "haggle",
  label: "Haggle (60% success)",
  description:
    "Push for a 30% higher reward, but the empire tightens the deadline by 10%. " +
    "On failure, reward drops 10% — they're annoyed.",
  rewardMultiplier: 1.3,
  depositMultiplier: 1.0,
  deadlineMultiplier: 0.9,
  successChance: 0.6,
  requiresReputation: 25,
};

const EARLY_COMPLETION_OPTION: NegotiationOption = {
  choice: "early_completion",
  label: "Early Completion Bonus",
  description:
    "Commit to a 30% tighter deadline for a 50% reward bonus. Deposit is also 50% higher.",
  rewardMultiplier: 1.5,
  depositMultiplier: 1.5,
  deadlineMultiplier: 0.7,
  successChance: 1.0,
  requiresReputation: 50,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the negotiation options available to the player for this contract.
 * Options gated behind requiresReputation are filtered based on player reputation.
 */
export function getNegotiationOptions(
  _contract: Contract,
  state: GameState,
): NegotiationOption[] {
  const options: NegotiationOption[] = [STANDARD_OPTION];

  if (
    HAGGLE_OPTION.requiresReputation === undefined ||
    state.reputation >= HAGGLE_OPTION.requiresReputation
  ) {
    options.push(HAGGLE_OPTION);
  }

  if (
    EARLY_COMPLETION_OPTION.requiresReputation === undefined ||
    state.reputation >= EARLY_COMPLETION_OPTION.requiresReputation
  ) {
    options.push(EARLY_COMPLETION_OPTION);
  }

  return options;
}

/**
 * Apply a negotiation choice to a contract before accepting it.
 *
 * For "haggle": uses SeededRNG to determine success or failure.
 *   - Success: 1.3× reward, 0.9× deadline
 *   - Failure: 0.9× reward (empire annoyed), unchanged deadline
 *
 * Returns the modified contract and a result describing what happened.
 */
export function applyNegotiation(
  contract: Contract,
  choice: NegotiationChoice,
  state: GameState,
  rng: SeededRNG,
): { negotiatedContract: Contract; result: NegotiationResult } {
  const option = resolveOption(choice);

  // Determine effective multipliers (haggle can fail)
  let rewardMult = option.rewardMultiplier;
  let depositMult = option.depositMultiplier;
  let deadlineMult = option.deadlineMultiplier;
  let success = true;
  let message: string;

  if (choice === "haggle") {
    // Validate the player still meets reputation gate (state can change between
    // scene open and confirm)
    const repRequired = option.requiresReputation ?? 0;
    if (state.reputation < repRequired) {
      // Silently fall back to standard if reputation no longer qualifies
      rewardMult = 1.0;
      depositMult = 1.0;
      deadlineMult = 1.0;
      message = "Your reputation is too low to haggle. Standard terms applied.";
    } else {
      const roll = rng.next();
      success = roll < option.successChance;
      if (success) {
        // Reward 1.3×, deadline 0.9×
        message =
          "Negotiation succeeded! The empire agreed to better terms, but tightened the deadline.";
      } else {
        // Empire annoyed: reward 0.9×, deadline unchanged
        rewardMult = 0.9;
        depositMult = 1.0;
        deadlineMult = 1.0;
        message =
          "Negotiation failed — the empire is annoyed. Reward reduced by 10%.";
      }
    }
  } else if (choice === "early_completion") {
    const repRequired = option.requiresReputation ?? 0;
    if (state.reputation < repRequired) {
      rewardMult = 1.0;
      depositMult = 1.0;
      deadlineMult = 1.0;
      message =
        "Your reputation is too low for an early-completion bonus. Standard terms applied.";
    } else {
      message =
        "Early completion bonus applied! Tighter deadline, higher deposit, bigger reward.";
    }
  } else {
    // standard
    message = "Standard terms accepted.";
  }

  // Compute new values — minimum 1 turn remaining, minimum 0 for cash values
  const newRewardCash = Math.max(
    0,
    Math.round(contract.rewardCash * rewardMult),
  );
  const newDepositPaid = Math.max(
    0,
    Math.round(contract.depositPaid * depositMult),
  );
  const newTurnsRemaining = Math.max(
    1,
    Math.round(contract.turnsRemaining * deadlineMult),
  );
  const newDurationTurns = Math.max(
    1,
    Math.round(contract.durationTurns * deadlineMult),
  );

  const negotiatedContract: Contract = {
    ...contract,
    rewardCash: newRewardCash,
    depositPaid: newDepositPaid,
    turnsRemaining: newTurnsRemaining,
    durationTurns: newDurationTurns,
  };

  const result: NegotiationResult = {
    success,
    appliedMultipliers: {
      reward: rewardMult,
      deposit: depositMult,
      deadlineTurns: deadlineMult,
    },
    message,
  };

  return { negotiatedContract, result };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function resolveOption(choice: NegotiationChoice): NegotiationOption {
  switch (choice) {
    case "standard":
      return STANDARD_OPTION;
    case "haggle":
      return HAGGLE_OPTION;
    case "early_completion":
      return EARLY_COMPLETION_OPTION;
  }
}
