import { describe, it, expect, vi, afterEach } from "vitest";
import * as Phaser from "phaser";
import { mountComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import type { MountedComponent } from "../../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import {
  TechQueuePanel,
  SLOT_HEIGHT,
  SLOT_GAP,
  HEADER_HEIGHT,
} from "../TechQueuePanel.ts";
import type { TechQueuePanelConfig } from "../TechQueuePanel.ts";

// ─── Layout constant sanity checks ────────────────────────────────────────────

describe("TechQueuePanel layout constants", () => {
  it("SLOT_HEIGHT is 44", () => {
    expect(SLOT_HEIGHT).toBe(44);
  });

  it("SLOT_GAP is 6", () => {
    expect(SLOT_GAP).toBe(6);
  });

  it("HEADER_HEIGHT is 22", () => {
    expect(HEADER_HEIGHT).toBe(22);
  });

  it("4 visible slots fit in a 300px tall panel area", () => {
    const visibleSlots = 4;
    const panelContentHeight = visibleSlots * (SLOT_HEIGHT + SLOT_GAP);
    expect(panelContentHeight).toBeLessThanOrEqual(300);
  });
});

// ─── Behavioral tests via mountComponent harness ──────────────────────────────

describe("TechQueuePanel (headless Phaser)", () => {
  let mounted: MountedComponent<TechQueuePanel> | undefined;

  afterEach(() => {
    mounted?.destroy();
    mounted = undefined;
  });

  function makePanel(
    scene: Phaser.Scene,
    overrides: Partial<TechQueuePanelConfig> = {},
  ): TechQueuePanel {
    return new TechQueuePanel(scene, {
      x: 0,
      y: 0,
      width: 200,
      visibleSlots: 4,
      onRemove: () => {},
      onReorder: () => {},
      ...overrides,
    });
  }

  // Behavior 1: empty queue → getSlotCount() === 0
  it("getSlotCount returns 0 for an empty queue", async () => {
    mounted = await mountComponent((scene) => makePanel(scene));
    const panel = mounted.component;
    panel.setQueueState({ queue: [], researchPoints: 0, purchaseCount: {} });
    expect(panel.getSlotCount()).toBe(0);
  }, 15000);

  // Behavior 2: two-item queue → getSlotCount() === 2
  it("getSlotCount returns 2 for a two-item queue", async () => {
    mounted = await mountComponent((scene) => makePanel(scene));
    const panel = mounted.component;
    panel.setQueueState({
      queue: ["logistics_hub", "logistics_2a"],
      researchPoints: 0,
      purchaseCount: {},
    });
    expect(panel.getSlotCount()).toBe(2);
  }, 15000);

  // Behavior 3: triggerRemove calls onRemove with the correct index
  it("triggerRemove calls onRemove with the supplied index", async () => {
    const onRemove = vi.fn();
    mounted = await mountComponent((scene) => makePanel(scene, { onRemove }));
    const panel = mounted.component;
    panel.setQueueState({
      queue: ["logistics_hub", "logistics_2a"],
      researchPoints: 0,
      purchaseCount: {},
    });
    panel.triggerRemove(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  }, 15000);

  // Behavior 4: triggerReorder calls onReorder with (fromIdx, toIdx)
  it("triggerReorder calls onReorder with (fromIdx, toIdx)", async () => {
    const onReorder = vi.fn();
    mounted = await mountComponent((scene) => makePanel(scene, { onReorder }));
    const panel = mounted.component;
    panel.setQueueState({
      queue: ["logistics_hub", "logistics_2a", "trading_post"],
      researchPoints: 0,
      purchaseCount: {},
    });
    panel.triggerReorder(2, 1);
    expect(onReorder).toHaveBeenCalledWith(2, 1);
  }, 15000);
});
