import { describe, it, expect, afterEach } from "vitest";
import * as Phaser from "phaser";
import { mountComponent } from "../../../packages/spacebiz-ui/src/__tests__/_harness/mountComponent.ts";
import type { MountedComponent } from "../../../packages/spacebiz-ui/src/__tests__/_harness/mountComponent.ts";
import { SceneUiDirector } from "@spacebiz/ui";
import { RouteBuilderPanel } from "../RouteBuilderPanel.ts";

interface ProbeShape {
  panelWidth: number;
  panelHeight: number;
  panel: {
    setSize: (w: number, h: number) => unknown;
    width: number;
    height: number;
  };
  confirmButton: Phaser.GameObjects.Container;
  cancelButton: Phaser.GameObjects.Container;
  closeButton: Phaser.GameObjects.Container;
  hintValue: Phaser.GameObjects.Container;
  titleValue: Phaser.GameObjects.Container;
  setSize: (w: number, h: number) => ProbeShape;
}

/**
 * RouteBuilderPanel.setSize tests. Boots a real headless Phaser scene per
 * test and constructs the panel with the default gameStore state (which
 * includes a galaxy with planets, so route-builder construction succeeds).
 *
 * Mirrors the shape of `Panel.setSize` tests in spacebiz-ui: dimensions
 * update, children reposition, no new objects materialize.
 */
describe("RouteBuilderPanel.setSize", () => {
  let mounted: MountedComponent<RouteBuilderPanel> | undefined;

  afterEach(() => {
    mounted?.destroy();
    mounted = undefined;
  });

  async function mount(): Promise<ProbeShape> {
    mounted = await mountComponent((scene) => {
      const ui = new SceneUiDirector(scene);
      const layer = ui.openLayer({ key: "route-builder-test" });
      return new RouteBuilderPanel(scene, layer, { ui });
    });
    return mounted.component as unknown as ProbeShape;
  }

  it("returns the panel instance for chaining", async () => {
    const panel = await mount();
    expect(panel.setSize(700, 500)).toBe(panel);
  }, 15000);

  it("updates the stored panelWidth and panelHeight", async () => {
    const panel = await mount();
    panel.setSize(700, 500);
    expect(panel.panelWidth).toBe(700);
    expect(panel.panelHeight).toBe(500);
  }, 15000);

  it("delegates the size update to the inner Panel", async () => {
    const panel = await mount();
    panel.setSize(700, 500);
    expect(panel.panel.width).toBe(700);
    expect(panel.panel.height).toBe(500);
  }, 15000);

  it("repositions the bottom-row action buttons relative to the new panel height", async () => {
    const panel = await mount();
    const before = panel.confirmButton.y;
    panel.setSize(panel.panelWidth, panel.panelHeight + 200);
    const after = panel.confirmButton.y;
    expect(after - before).toBe(200);
  }, 15000);

  it("repositions the cancel button along the new right edge", async () => {
    const panel = await mount();
    const before = panel.cancelButton.x;
    panel.setSize(panel.panelWidth + 100, panel.panelHeight);
    const after = panel.cancelButton.x;
    expect(after - before).toBe(100);
  }, 15000);

  it("repositions the close button to the new top-right corner", async () => {
    const panel = await mount();
    const before = panel.closeButton.x;
    panel.setSize(panel.panelWidth + 80, panel.panelHeight);
    const after = panel.closeButton.x;
    expect(after - before).toBe(80);
  }, 15000);
});
