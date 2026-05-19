import { describe, it, expect } from "vitest";
import {
  getCommitmentCount,
  getNextCommitmentCost,
  canCommitToBranch,
  commitToBranch,
  isBranchCommitted,
} from "../BranchCommitment.ts";
import type { TechState } from "../../../data/types.ts";

function emptyTechState(): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
    committedBranches: [],
  };
}

describe("BranchCommitment", () => {
  describe("getCommitmentCount", () => {
    it("returns 0 for fresh state", () => {
      expect(getCommitmentCount(emptyTechState())).toBe(0);
    });

    it("counts committed branches", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering"],
      };
      expect(getCommitmentCount(tech)).toBe(2);
    });
  });

  describe("getNextCommitmentCost", () => {
    it("returns 50000 for the 1st commitment", () => {
      expect(getNextCommitmentCost(emptyTechState())).toBe(50_000);
    });

    it("returns 150000 for the 2nd commitment", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics"],
      };
      expect(getNextCommitmentCost(tech)).toBe(150_000);
    });

    it("returns 400000 for the 3rd commitment", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering"],
      };
      expect(getNextCommitmentCost(tech)).toBe(400_000);
    });

    it("returns null when cap reached", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics", "engineering", "fleet"],
      };
      expect(getNextCommitmentCost(tech)).toBeNull();
    });
  });

  describe("canCommitToBranch", () => {
    it("requires the branch's mastery node to be researched", () => {
      const tech = emptyTechState();
      const result = canCommitToBranch("logistics", tech, 1_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/mastery/i);
      }
    });

    it("requires sufficient cash", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = canCommitToBranch("logistics", tech, 10_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/insufficient|cash/i);
      }
    });

    it("rejects double-commit to same branch", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
        committedBranches: ["logistics"],
      };
      const result = canCommitToBranch("logistics", tech, 1_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/already/i);
      }
    });

    it("rejects when cap reached", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["fleet_cap"],
        purchaseCount: { fleet_cap: 1 },
        committedBranches: ["logistics", "engineering", "intelligence"],
      };
      const result = canCommitToBranch("fleet", tech, 10_000_000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/cap|limit|3/i);
      }
    });

    it("accepts a valid commit", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = canCommitToBranch("logistics", tech, 100_000);
      expect(result.ok).toBe(true);
    });
  });

  describe("commitToBranch", () => {
    it("appends the branch and deducts cost", () => {
      const tech: TechState = {
        ...emptyTechState(),
        completedTechIds: ["logistics_cap"],
        purchaseCount: { logistics_cap: 1 },
      };
      const result = commitToBranch("logistics", tech, 200_000);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.tech.committedBranches).toContain("logistics");
        expect(result.newCash).toBe(150_000);
      }
    });

    it("returns null when commit is invalid", () => {
      const tech = emptyTechState();
      const result = commitToBranch("logistics", tech, 0);
      expect(result).toBeNull();
    });
  });

  describe("isBranchCommitted", () => {
    it("returns true when committed", () => {
      const tech: TechState = {
        ...emptyTechState(),
        committedBranches: ["logistics"],
      };
      expect(isBranchCommitted("logistics", tech)).toBe(true);
    });

    it("returns false when not committed", () => {
      const tech = emptyTechState();
      expect(isBranchCommitted("logistics", tech)).toBe(false);
    });
  });
});
