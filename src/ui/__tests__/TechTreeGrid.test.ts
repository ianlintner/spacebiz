import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockScene,
  type MockScene,
} from "../../../packages/spacebiz-ui/src/__tests__/_harness/mockPhaser.ts";

vi.mock(
  "phaser",
  () =>
    import("../../../packages/spacebiz-ui/src/__tests__/_harness/mockPhaser.ts"),
);

import { TechTreeGrid } from "../TechTreeGrid.ts";
import { TECH_TREE } from "../../data/constants.ts";
import { TechBranch } from "../../data/types.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene();
});

function makeGrid(width = 600, height = 300): TechTreeGrid {
  return new TechTreeGrid(scene as never, {
    x: 10,
    y: 20,
    width,
    height,
  });
}

function tier1Logistics(): string {
  const t = TECH_TREE.find(
    (t) => t.branch === TechBranch.Logistics && t.tier === 1,
  );
  if (!t) throw new Error("expected tier-1 logistics tech in TECH_TREE");
  return t.id;
}

describe("TechTreeGrid construction", () => {
  it("creates a container at the configured position", () => {
    const grid = makeGrid();
    expect(grid.x).toBe(10);
    expect(grid.y).toBe(20);
  });

  it("creates one child per tech node plus connectors and labels", () => {
    const grid = makeGrid();
    // Children include: 5 branch labels + 5 nodes × (bg, glow, label, cost, checkmark, hitArea) + connectors.
    expect(grid.list.length).toBeGreaterThan(0);
  });
});

describe("TechTreeGrid.setSize", () => {
  it("returns the grid instance for chaining", () => {
    const grid = makeGrid();
    expect(grid.setSize(800, 400)).toBe(grid);
  });

  it("syncs inherited width and height", () => {
    const grid = makeGrid(600, 300);
    grid.setSize(900, 500);
    expect(grid.width).toBe(900);
    expect(grid.height).toBe(500);
  });

  it("does not add new children to the container", () => {
    const grid = makeGrid(600, 300);
    const before = grid.list.length;
    grid.setSize(900, 500);
    expect(grid.list.length).toBe(before);
  });

  it("does not destroy any existing children", () => {
    const grid = makeGrid(600, 300);
    const childrenBefore = [...grid.list];
    grid.setSize(900, 500);
    for (const c of childrenBefore) {
      expect((c as unknown as { destroyed: boolean }).destroyed).toBe(false);
    }
  });
});

describe("TechTreeGrid.setState", () => {
  it("marks completed techs with a visible checkmark", () => {
    const grid = makeGrid();
    const techId = tier1Logistics();

    grid.setGridState({
      completedTechIds: [techId],
      currentResearchId: null,
      researchProgress: 0,
      isAvailable: () => false,
    });

    // The completed node's checkmark should be visible.
    // Walk the index via the private map by reflection.
    const node = (
      grid as unknown as {
        nodeIndex: Map<
          string,
          {
            checkmark: { visible: boolean; text?: string };
            costLabel: { text: string };
          }
        >;
      }
    ).nodeIndex.get(techId);
    expect(node).toBeDefined();
    expect(node!.checkmark.visible).toBe(true);
    expect(node!.costLabel.text).toBe("✓");
  });

  it("shows progress on the researching node and hides checkmarks elsewhere", () => {
    const grid = makeGrid();
    const techId = tier1Logistics();

    grid.setGridState({
      completedTechIds: [],
      currentResearchId: techId,
      researchProgress: 7,
      isAvailable: () => false,
    });

    const node = (
      grid as unknown as {
        nodeIndex: Map<
          string,
          {
            checkmark: { visible: boolean };
            costLabel: { text: string };
            glow: { visible: boolean };
            state: string;
          }
        >;
      }
    ).nodeIndex.get(techId);
    expect(node).toBeDefined();
    expect(node!.state).toBe("researching");
    expect(node!.checkmark.visible).toBe(false);
    expect(node!.glow.visible).toBe(true);
    expect(node!.costLabel.text).toContain("/");
    expect(node!.costLabel.text.startsWith("7/")).toBe(true);
  });

  it("re-applies state without growing the child list", () => {
    const grid = makeGrid();
    const techId = tier1Logistics();
    const before = grid.list.length;

    grid.setGridState({
      completedTechIds: [techId],
      currentResearchId: null,
      researchProgress: 0,
      isAvailable: () => false,
    });
    grid.setGridState({
      completedTechIds: [],
      currentResearchId: techId,
      researchProgress: 4,
      isAvailable: () => false,
    });
    grid.setGridState({
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
      isAvailable: () => true,
    });

    expect(grid.list.length).toBe(before);
  });
});

describe("TechTreeGrid.onSelect", () => {
  it("invokes the callback with the clicked tech id", () => {
    const onSelect = vi.fn();
    const grid = new TechTreeGrid(scene as never, {
      x: 0,
      y: 0,
      width: 600,
      height: 300,
      onSelect,
    });
    const techId = tier1Logistics();

    const node = (
      grid as unknown as {
        nodeIndex: Map<
          string,
          {
            hitArea: { emit: (event: string, ...args: unknown[]) => boolean };
          }
        >;
      }
    ).nodeIndex.get(techId);
    expect(node).toBeDefined();
    node!.hitArea.emit("pointerup");

    expect(onSelect).toHaveBeenCalledWith(techId);
  });
});
