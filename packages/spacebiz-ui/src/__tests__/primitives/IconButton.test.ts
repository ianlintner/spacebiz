import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { IconButton } from "../../IconButton.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("IconButtonScene");
});

function makeIconButton(
  overrides: Partial<{
    size: number;
    label: string;
    active: boolean;
    disabled: boolean;
    icon: string;
  }> = {},
) {
  const onClick = vi.fn();
  const btn = new IconButton(scene as unknown as Phaser.Scene, {
    x: 5,
    y: 6,
    icon: overrides.icon ?? "icon-fleet",
    onClick,
    ...overrides,
  });
  return { btn, onClick };
}

describe("IconButton construction", () => {
  it("creates a container at the configured position", () => {
    const { btn } = makeIconButton();
    expect(btn.x).toBe(5);
    expect(btn.y).toBe(6);
  });

  it("uses default 40px square size when none specified", () => {
    const { btn } = makeIconButton();
    const icon = (btn as unknown as { iconImage: { x: number; y: number } })
      .iconImage;
    expect(icon.x).toBe(20);
    expect(icon.y).toBe(20);
  });

  it("respects an explicit size override", () => {
    const { btn } = makeIconButton({ size: 64 });
    const icon = (btn as unknown as { iconImage: { x: number; y: number } })
      .iconImage;
    expect(icon.x).toBe(32);
    expect(icon.y).toBe(32);
  });

  it("renders a label text node when label is provided", () => {
    const { btn } = makeIconButton({ label: "Fleet" });
    const lbl = (btn as unknown as { labelText: { text: string } | null })
      .labelText;
    expect(lbl).not.toBeNull();
    expect(lbl?.text).toBe("Fleet");
  });

  it("omits the label text node when no label is provided", () => {
    const { btn } = makeIconButton();
    expect((btn as unknown as { labelText: unknown }).labelText).toBeNull();
  });
});

describe("IconButton click handler", () => {
  it("invokes onClick on hit-zone pointerdown when enabled", () => {
    const { btn, onClick } = makeIconButton();
    const hitZone = (
      btn as unknown as { list: Array<{ emit?: (e: string) => void }> }
    ).list.at(-1);
    hitZone?.emit?.("pointerdown");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not register pointer listeners when disabled", () => {
    const { btn, onClick } = makeIconButton({ disabled: true });
    const hitZone = (
      btn as unknown as {
        list: Array<{
          emit?: (e: string) => void;
          listenerCount?: (e: string) => number;
        }>;
      }
    ).list.at(-1);
    expect(hitZone?.listenerCount?.("pointerdown") ?? 0).toBe(0);
    hitZone?.emit?.("pointerdown");
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton.setActiveState", () => {
  it("returns the instance for chaining", () => {
    const { btn } = makeIconButton();
    expect(btn.setActiveState(true)).toBe(btn);
    expect(btn.setActiveState(false)).toBe(btn);
  });

  it("toggles the active indicator alpha", () => {
    const { btn } = makeIconButton();
    const indicator = (btn as unknown as { activeIndicator: { alpha: number } })
      .activeIndicator;
    btn.setActiveState(true);
    expect(indicator.alpha).toBeGreaterThan(0);
    btn.setActiveState(false);
    expect(indicator.alpha).toBe(0);
  });
});

describe("IconButton hover state (icon swap path)", () => {
  it("emits hover/out without throwing and the icon stays valid", () => {
    const { btn } = makeIconButton({ label: "Map" });
    const hitZone = (
      btn as unknown as { list: Array<{ emit?: (e: string) => void }> }
    ).list.at(-1);
    expect(() => {
      hitZone?.emit?.("pointerover");
      hitZone?.emit?.("pointerout");
    }).not.toThrow();
    expect((btn as unknown as { iconImage: unknown }).iconImage).toBeDefined();
  });
});
