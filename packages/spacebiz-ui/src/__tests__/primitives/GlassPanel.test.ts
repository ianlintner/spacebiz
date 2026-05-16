import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { GlassPanel } from "../../GlassPanel.ts";
import { getTheme } from "../../Theme.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("GlassPanelScene");
});

describe("GlassPanel construction", () => {
  it("places the container at the configured position", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 10,
      y: 20,
      width: 400,
      height: 300,
    });
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
  });

  it("has no glow layer (list length stays minimal)", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    // Only the bg nineslice is added for untitled panels — no glow entry.
    expect(p.list.length).toBe(1);
  });

  it("adds title label + underline when title is provided", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Fleet Management",
    });
    // bg + titleLabel + titleUnderline = 3 children
    expect(p.list.length).toBe(3);
  });
});

describe("GlassPanel.getContentY", () => {
  it("returns small padding for untitled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const theme = getTheme();
    expect(p.getContentY()).toBe(theme.spacing.sm);
  });

  it("returns title-area height for titled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Finance",
    });
    const theme = getTheme();
    expect(p.getContentY()).toBe(30 + theme.spacing.xs);
  });
});

describe("GlassPanel.getContentArea", () => {
  it("returns positive inset dimensions for untitled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
    const area = p.getContentArea();
    expect(area.x).toBeGreaterThan(0);
    expect(area.y).toBeGreaterThan(0);
    expect(area.width).toBeGreaterThan(0);
    expect(area.width).toBeLessThan(400);
    expect(area.height).toBeGreaterThan(0);
    expect(area.height).toBeLessThan(300);
  });

  it("titled panel has smaller content height than untitled", () => {
    const base = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    }).getContentArea();
    const titled = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      title: "Cargo",
    }).getContentArea();
    expect(titled.height).toBeLessThan(base.height);
  });
});

describe("GlassPanel.setSize", () => {
  it("returns the panel for chaining", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(p.setSize(300, 150)).toBe(p);
  });

  it("updates getContentArea dimensions and syncs width/height", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    p.setSize(400, 300);
    const area = p.getContentArea();
    expect(area.width).toBeGreaterThan(0);
    expect(area.width).toBeLessThan(400);
    expect(p.width).toBe(400);
    expect(p.height).toBe(300);
  });

  it("does not add new children to the container on resize", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const before = p.list.length;
    p.setSize(300, 150);
    expect(p.list.length).toBe(before);
  });
});

describe("GlassPanel.setTitle", () => {
  it("updates the title label text", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Old Title",
    });
    p.setTitle("New Title");
    const internal = p as unknown as { titleLabel: { text: string } | null };
    expect(internal.titleLabel?.text).toBe("New Title");
  });

  it("is a no-op when no title was configured", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(() => p.setTitle("Anything")).not.toThrow();
  });
});
