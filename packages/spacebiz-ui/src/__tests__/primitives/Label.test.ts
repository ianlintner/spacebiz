import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { Label } from "../../Label.ts";
import { getTheme, colorToString } from "../../Theme.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("LabelScene");
});

describe("Label construction", () => {
  it("renders text at the configured position", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 5,
      y: 7,
      text: "Hello",
    });
    expect(lbl.x).toBe(5);
    expect(lbl.y).toBe(7);
    expect((lbl as unknown as { text: string }).text).toBe("Hello");
  });

  it("applies the body font style by default", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Body",
    });
    const theme = getTheme();
    const style = (
      lbl as unknown as { style: { fontSize?: string; fontFamily?: string } }
    ).style;
    expect(style.fontSize).toBe(`${theme.fonts.body.size}px`);
    expect(style.fontFamily).toBe(theme.fonts.body.family);
  });

  it("uses the heading style when style='heading' is requested", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Title",
      style: "heading",
    });
    const theme = getTheme();
    const style = (lbl as unknown as { style: { fontSize?: string } }).style;
    expect(style.fontSize).toBe(`${theme.fonts.heading.size}px`);
  });

  it("uses the caption style when style='caption' is requested", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Tiny",
      style: "caption",
    });
    const theme = getTheme();
    const style = (lbl as unknown as { style: { fontSize?: string } }).style;
    expect(style.fontSize).toBe(`${theme.fonts.caption.size}px`);
  });

  it("applies a custom color when provided", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Tinted",
      color: 0xff00aa,
    });
    const style = (lbl as unknown as { style: { color?: string } }).style;
    expect(style.color).toBe(colorToString(0xff00aa));
  });

  it("includes wordWrap when maxWidth is set", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Long text",
      maxWidth: 120,
    });
    const style = (
      lbl as unknown as { style: { wordWrap?: { width: number } } }
    ).style;
    expect(style.wordWrap?.width).toBe(120);
  });
});

describe("Label.setLabelColor", () => {
  it("returns the label instance for chaining", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "X",
    });
    expect(lbl.setLabelColor(0x123456)).toBe(lbl);
  });
});

describe("Label.setGlow", () => {
  it("returns the label instance for chaining (enable + disable)", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Glowy",
    });
    expect(lbl.setGlow(true)).toBe(lbl);
    expect(lbl.setGlow(false)).toBe(lbl);
  });
});

describe("Label.setSize", () => {
  it("returns the label instance for chaining", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Hello",
    });
    expect(lbl.setSize(200, 40)).toBe(lbl);
  });

  it("syncs inherited width and height", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Hello",
    });
    lbl.setSize(250, 60);
    expect(lbl.width).toBe(250);
    expect(lbl.height).toBe(60);
  });

  it("updates the wordWrap width so long text reflows in the new bounds", () => {
    const lbl = new Label(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      text: "Long",
      maxWidth: 100,
    });
    lbl.setSize(300, 40);
    expect((lbl as unknown as { wordWrapWidth: number }).wordWrapWidth).toBe(
      300,
    );
  });
});
