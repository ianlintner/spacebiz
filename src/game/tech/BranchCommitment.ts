import type { TechState } from "../../data/types.ts";
import {
  COMMITMENT_COSTS,
  MAX_COMMITMENTS,
  TECH_GRAPH,
} from "../../data/constants.ts";

export interface CommitResult {
  tech: TechState;
  newCash: number;
}

export type CanCommitResult = { ok: true } | { ok: false; reason: string };

export function getCommitmentCount(tech: TechState): number {
  return tech.committedBranches.length;
}

export function isBranchCommitted(branchId: string, tech: TechState): boolean {
  return tech.committedBranches.includes(branchId);
}

/**
 * Returns the §-cash cost of the next commitment, or null if the player is
 * already at the cap.
 */
export function getNextCommitmentCost(tech: TechState): number | null {
  const count = getCommitmentCount(tech);
  if (count >= MAX_COMMITMENTS) return null;
  return COMMITMENT_COSTS[count];
}

/**
 * Returns the tech ID of the T2 "Mastery" cap node for the given branch.
 * Looks for a tech in TECH_GRAPH where branch matches AND id ends with
 * "_cap" or "_mastery".
 */
function getMasteryNodeId(branchId: string): string | null {
  const node = TECH_GRAPH.find(
    (n) =>
      n.branch === branchId &&
      (n.id.endsWith("_cap") || n.id.endsWith("_mastery")),
  );
  return node?.id ?? null;
}

export function canCommitToBranch(
  branchId: string,
  tech: TechState,
  cash: number,
): CanCommitResult {
  if (isBranchCommitted(branchId, tech)) {
    return { ok: false, reason: "Already committed to this branch" };
  }
  if (getCommitmentCount(tech) >= MAX_COMMITMENTS) {
    return {
      ok: false,
      reason: `Commitment cap reached (max ${MAX_COMMITMENTS})`,
    };
  }
  const masteryId = getMasteryNodeId(branchId);
  if (!masteryId || (tech.purchaseCount[masteryId] ?? 0) === 0) {
    return {
      ok: false,
      reason: "Research the branch's Mastery node first",
    };
  }
  const cost = getNextCommitmentCost(tech);
  if (cost === null) {
    return { ok: false, reason: "Commitment cap reached" };
  }
  if (cash < cost) {
    return {
      ok: false,
      reason: `Insufficient cash (need §${cost.toLocaleString("en-US")})`,
    };
  }
  return { ok: true };
}

/**
 * Apply a commitment. Returns the updated tech state + new cash balance, or
 * null if the commit is invalid. Caller is responsible for writing the
 * result back to gameStore.
 */
export function commitToBranch(
  branchId: string,
  tech: TechState,
  cash: number,
): CommitResult | null {
  const check = canCommitToBranch(branchId, tech, cash);
  if (!check.ok) return null;
  const cost = getNextCommitmentCost(tech);
  if (cost === null) return null;
  return {
    tech: {
      ...tech,
      committedBranches: [...tech.committedBranches, branchId],
    },
    newCash: cash - cost,
  };
}
