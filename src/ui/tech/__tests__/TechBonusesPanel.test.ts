import { describe, it, expect, afterEach } from "vitest";
import * as Phaser from "phaser";
import { mountComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import type { MountedComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import { TechBonusesPanel } from "../TechBonusesPanel.ts";
import type { TechBonusesPanelConfig } from "../TechBonusesPanel.ts";
import type { TechState } from "../../../data/types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Behavioral tests via mountComponent harness ──────────────────────────────

describe("TechBonusesPanel (headless Phaser)", () => {
  let mounted: MountedComponent<TechBonusesPanel> | undefined;

  afterEach(() => {
    mounted?.destroy();
    mounted = undefined;
  });

  function makePanel(
    scene: Phaser.Scene,
    overrides: Partial<TechBonusesPanelConfig> = {},
  ): TechBonusesPanel {
    return new TechBonusesPanel(scene, {
      x: 0,
      y: 0,
      width: 320,
      height: 400,
      ...overrides,
    });
  }

  // Behavior 1: empty state → getCardCount() === 0
  it("getCardCount returns 0 for an empty tech state", async () => {
    mounted = await mountComponent((scene) => makePanel(scene));
    const panel = mounted.component;
    panel.setBonusesState(emptyTechState());
    expect(panel.getCardCount()).toBe(0);
  }, 15000);

  // Behavior 2: two purchased techs with distinct effects → getCardCount() === 2
  it("getCardCount returns 2 when two distinct-effect techs are purchased", async () => {
    mounted = await mountComponent((scene) => makePanel(scene));
    const panel = mounted.component;
    // logistics_hub → addRouteSlots +1
    // logistics_2b  → modifyRevenue +10%
    panel.setBonusesState({
      ...emptyTechState(),
      purchaseCount: { logistics_hub: 1, logistics_2b: 1 },
    });
    expect(panel.getCardCount()).toBe(2);
  }, 15000);
});
