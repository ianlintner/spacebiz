import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { Panel } from "../../Panel.ts";
import { getTheme } from "../../Theme.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("PanelScene");
});

describe("Panel construction", () => {
  it("creates a container at the configured position with the configured size", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 30,
      y: 40,
      width: 400,
      height: 300,
    });
    expect(panel.x).toBe(30);
    expect(panel.y).toBe(40);
    const internal = panel as unknown as {
      panelWidth: number;
      panelHeight: number;
    };
    expect(internal.panelWidth).toBe(400);
    expect(internal.panelHeight).toBe(300);
  });

  it("includes a glow layer by default and skips it when showGlow=false", () => {
    const withGlow = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const withoutGlow = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      showGlow: false,
    });
    expect(
      (withGlow as unknown as { glowLayer: unknown }).glowLayer,
    ).not.toBeNull();
    expect(
      (withoutGlow as unknown as { glowLayer: unknown }).glowLayer,
    ).toBeNull();
  });
});

describe("Panel title bar", () => {
  it("omits the title bar when no title is provided", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect((panel as unknown as { titleBar: unknown }).titleBar).toBeNull();
  });

  it("creates a title bar when a title is provided and bumps contentY", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Inventory",
    });
    const theme = getTheme();
    expect((panel as unknown as { titleBar: unknown }).titleBar).not.toBeNull();
    expect(panel.getContentY()).toBe(
      theme.panel.titleHeight + theme.spacing.sm,
    );
  });
});

describe("Panel.getContentArea", () => {
  it("returns positive dimensions inside the panel padding", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
    const area = panel.getContentArea();
    expect(area.x).toBeGreaterThan(0);
    expect(area.y).toBeGreaterThan(0);
    expect(area.width).toBeGreaterThan(0);
    expect(area.width).toBeLessThan(400);
    expect(area.height).toBeGreaterThan(0);
    expect(area.height).toBeLessThan(300);
  });

  it("subtracts the title bar from the content area when titled", () => {
    const untitled = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    }).getContentArea();
    const titled = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      title: "Inventory",
    }).getContentArea();
    expect(titled.height).toBeLessThan(untitled.height);
  });
});

describe("Panel.setActive", () => {
  it("returns the panel instance for chaining", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(panel.setActive(true)).toBe(panel);
    expect(panel.setActive(false)).toBe(panel);
  });

  it("is a no-op when there is no glow layer", () => {
    const panel = new Panel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      showGlow: false,
    });
    expect(() => panel.setActive(true)).not.toThrow();
  });
});
