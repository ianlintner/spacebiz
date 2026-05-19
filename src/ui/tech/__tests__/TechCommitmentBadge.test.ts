import { afterEach, describe, expect, it } from "vitest";
import { mountComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import { TechCommitmentBadge } from "../TechCommitmentBadge.ts";
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

let cleanups: Array<() => void> = [];
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("TechCommitmentBadge", () => {
  it("renders '0 / 3' for a fresh tech state", async () => {
    const { component, destroy } = await mountComponent(
      (scene) => new TechCommitmentBadge(scene, { x: 0, y: 0, width: 240 }),
    );
    cleanups.push(destroy);
    component.setBadgeState(emptyTechState());
    expect(component.getDisplayText()).toBe("Commitments  ·  0 / 3");
  }, 15000);

  it("lists committed branches", async () => {
    const { component, destroy } = await mountComponent(
      (scene) => new TechCommitmentBadge(scene, { x: 0, y: 0, width: 240 }),
    );
    cleanups.push(destroy);
    component.setBadgeState({
      ...emptyTechState(),
      committedBranches: ["logistics", "engineering"],
    });
    expect(component.getDisplayText()).toBe("Commitments  ·  2 / 3");
    const branches = component.getCommittedBranchLabels();
    expect(branches).toContain("Logistics");
    expect(branches).toContain("Engineering");
  }, 15000);
});
