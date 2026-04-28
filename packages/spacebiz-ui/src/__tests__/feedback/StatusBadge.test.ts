import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockRectangle,
  type MockText,
  type MockGameObject,
} from "./_phaserMock.ts";
import { StatusBadge } from "../../StatusBadge.ts";
import { getTheme } from "../../Theme.ts";

interface BadgeShape extends MockGameObject {
  list: MockGameObject[];
  badgeWidth: number;
  badgeHeight: number;
  update(
    text: string,
    variant?: "info" | "success" | "warning" | "danger" | "neutral",
  ): BadgeShape;
  destroy(fromScene?: boolean): void;
}

function getBg(badge: BadgeShape): MockRectangle {
  return badge.list[0] as MockRectangle;
}
function getLabel(badge: BadgeShape): MockText {
  return badge.list[1] as MockText;
}

describe("StatusBadge", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
  });

  it("defaults to the neutral variant when none is supplied", () => {
    const theme = getTheme();
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "Idle",
    }) as unknown as BadgeShape;
    const bg = getBg(badge);
    expect(bg.fillColor).toBe(theme.colors.panelBg);
  });

  it("maps each variant to its expected background color", () => {
    const theme = getTheme();
    const cases: Array<
      ["info" | "success" | "warning" | "danger" | "neutral", number]
    > = [
      ["success", 0x003322],
      ["warning", 0x332200],
      ["danger", 0x330011],
      ["info", 0x002233],
      ["neutral", theme.colors.panelBg],
    ];
    for (const [variant, expected] of cases) {
      const badge = new StatusBadge(scene as never, {
        x: 0,
        y: 0,
        text: "X",
        variant,
      }) as unknown as BadgeShape;
      expect(getBg(badge).fillColor).toBe(expected);
    }
  });

  it("respects bgColor and textColor overrides", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "Custom",
      variant: "info",
      bgColor: 0x123456,
      textColor: 0x789abc,
    }) as unknown as BadgeShape;
    expect(getBg(badge).fillColor).toBe(0x123456);
  });

  it("renders the supplied label text", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "Hello",
    }) as unknown as BadgeShape;
    expect(getLabel(badge).text).toBe("Hello");
  });

  it("update(text) replaces the label and keeps the variant", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "First",
      variant: "info",
    }) as unknown as BadgeShape;
    const initialBg = getBg(badge).fillColor;
    badge.update("Second");
    expect(getLabel(badge).text).toBe("Second");
    expect(getBg(badge).fillColor).toBe(initialBg);
  });

  it("update(text, variant) swaps the variant colors", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "x",
      variant: "info",
    }) as unknown as BadgeShape;
    expect(getBg(badge).fillColor).toBe(0x002233);
    badge.update("x", "danger");
    expect(getBg(badge).fillColor).toBe(0x330011);
  });

  it("does NOT start a pulse tween by default", () => {
    new StatusBadge(scene as never, { x: 0, y: 0, text: "x" });
    expect(scene.tweens._all.length).toBe(0);
  });

  it("starts a pulse tween when pulse: true is set", () => {
    new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "x",
      pulse: true,
    });
    expect(scene.tweens._all.length).toBe(1);
    const tween = scene.tweens._all[0]!;
    expect(tween.config.yoyo).toBe(true);
    expect(tween.config.repeat).toBe(-1);
  });

  it("destroy() stops the pulse tween if one was started", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "x",
      pulse: true,
    }) as unknown as BadgeShape;
    const tween = scene.tweens._all[0]!;
    badge.destroy();
    expect(tween.destroyed).toBe(true);
  });

  it("badgeWidth and badgeHeight reflect the underlying bg rectangle", () => {
    const badge = new StatusBadge(scene as never, {
      x: 0,
      y: 0,
      text: "Wide label",
    }) as unknown as BadgeShape;
    expect(badge.badgeWidth).toBe(getBg(badge).width);
    expect(badge.badgeHeight).toBe(getBg(badge).height);
  });
});
