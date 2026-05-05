import { describe, it, expect, afterEach } from "vitest";
import { mountComponent } from "../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import type { MountedComponent } from "../../../packages/spacebiz-ui/src/__tests__/_harness/index.ts";
import { GalaxySidebarPanel } from "../GalaxySidebarPanel.ts";
import type { GalaxySidebarData } from "../GalaxySidebarPanel.ts";

function makeData(
  overrides: Partial<GalaxySidebarData> = {},
): GalaxySidebarData {
  return {
    systemCount: 12,
    empireCount: 3,
    hyperlaneCount: 18,
    playerEmpireName: "Player Empire",
    empires: [
      {
        id: "e1",
        name: "Solaris",
        color: 0xff0000,
        systemCount: 5,
        tariffRate: 0.12,
        accessible: true,
      },
      {
        id: "e2",
        name: "Drax",
        color: 0x00ff00,
        systemCount: 4,
        tariffRate: 0.18,
        accessible: false,
      },
      {
        id: "e3",
        name: "Zenthari",
        color: 0x0000ff,
        systemCount: 3,
        tariffRate: 0.05,
        accessible: true,
      },
    ],
    ...overrides,
  };
}

describe("GalaxySidebarPanel", () => {
  let mounted: MountedComponent<GalaxySidebarPanel> | undefined;

  afterEach(() => {
    mounted?.destroy();
    mounted = undefined;
  });

  it("populates stat lines and one row per empire when setData is called", async () => {
    mounted = await mountComponent(
      (scene) =>
        new GalaxySidebarPanel(scene, { x: 0, y: 0, width: 240, height: 600 }),
    );
    const panel = mounted.component;
    panel.setSidebarData(makeData());

    // The container holds: bg + title + 4 stat labels + empires header
    // + (1 swatch + 1 text) per visible empire row.
    const childCount = panel.list.length;
    // 1 (bg) + 1 (title) + 4 (stats) + 1 (empires header) = 7 chrome
    // 3 empires * 3 row objects (swatch + nameText + statsText) = 9 dynamic
    expect(childCount).toBe(7 + 9);
  }, 15000);

  it("setSize re-flows the row clamp so a small height shows fewer rows", async () => {
    mounted = await mountComponent(
      (scene) =>
        new GalaxySidebarPanel(scene, { x: 0, y: 0, width: 240, height: 600 }),
    );
    const panel = mounted.component;
    panel.setSidebarData(makeData());
    const fullChildCount = panel.list.length;

    // Shrink to a height that only fits one or two empire rows.
    panel.setSize(240, 160);
    const shrunkChildCount = panel.list.length;

    expect(shrunkChildCount).toBeLessThan(fullChildCount);
  }, 15000);

  it("setData replaces previous empire rows in place", async () => {
    mounted = await mountComponent(
      (scene) =>
        new GalaxySidebarPanel(scene, { x: 0, y: 0, width: 240, height: 600 }),
    );
    const panel = mounted.component;
    panel.setSidebarData(makeData());
    const beforeCount = panel.list.length;

    // Replace with a single-empire dataset.
    panel.setSidebarData(
      makeData({
        empireCount: 1,
        empires: [
          {
            id: "e1",
            name: "Solo",
            color: 0xffffff,
            systemCount: 12,
            tariffRate: 0.1,
            accessible: true,
          },
        ],
      }),
    );
    const afterCount = panel.list.length;

    expect(afterCount).toBeLessThan(beforeCount);
    // 7 chrome + 3 dynamic for the single row (swatch + nameText + statsText) = 10
    expect(afterCount).toBe(10);
  }, 15000);

  it("setSize updates the background rectangle dimensions", async () => {
    mounted = await mountComponent(
      (scene) =>
        new GalaxySidebarPanel(scene, { x: 0, y: 0, width: 240, height: 600 }),
    );
    const panel = mounted.component;
    panel.setSize(320, 400);
    const bg = panel.list[0] as unknown as { width: number; height: number };
    expect(bg.width).toBe(320);
    expect(bg.height).toBe(400);
  }, 15000);
});
