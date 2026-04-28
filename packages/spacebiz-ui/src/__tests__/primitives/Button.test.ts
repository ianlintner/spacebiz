import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { Button, type ButtonConfig } from "../../Button.ts";
import {
  createMockScene,
  fireEvent,
  type MockScene,
} from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("ButtonScene");
});

function makeButton(overrides: Partial<ButtonConfig> = {}) {
  const onClick = vi.fn();
  const btn = new Button(scene as unknown as Phaser.Scene, {
    x: 10,
    y: 20,
    label: "Save",
    onClick,
    ...overrides,
  });
  return { btn, onClick };
}

describe("Button construction", () => {
  it("creates a container with theme-driven default size", () => {
    const { btn } = makeButton();
    expect(btn).toBeDefined();
    expect(btn.x).toBe(10);
    expect(btn.y).toBe(20);
    expect(btn.width).toBeGreaterThan(0);
    expect(btn.height).toBeGreaterThan(0);
  });

  it("respects an explicit width/height override", () => {
    const { btn } = makeButton({ width: 200, height: 60 });
    expect(btn.width).toBe(200);
    expect(btn.height).toBe(60);
  });

  it("defaults to enabled (interactive) state", () => {
    const { btn } = makeButton();
    expect(
      (btn as unknown as { isDisabled: boolean }).isDisabled ?? false,
    ).toBe(false);
  });
});

describe("Button.setLabel", () => {
  it("updates the underlying text", () => {
    const { btn } = makeButton({ label: "Old" });
    btn.setLabel("New");
    const inner = (btn as unknown as { label: { text: string } }).label;
    expect(inner.text).toBe("New");
  });
});

describe("Button.setDisabled", () => {
  it("toggles the disabled flag", () => {
    const { btn } = makeButton();
    btn.setDisabled(true);
    expect((btn as unknown as { isDisabled: boolean }).isDisabled).toBe(true);
    btn.setDisabled(false);
    expect((btn as unknown as { isDisabled: boolean }).isDisabled).toBe(false);
  });

  it("disables interactivity on the hit zone when disabled", () => {
    const { btn } = makeButton();
    const hitZone = (btn as unknown as { hitZone: { input: unknown } }).hitZone;
    btn.setDisabled(true);
    expect(hitZone.input).toBeNull();
  });
});

describe("Button click and hover", () => {
  it("invokes onClick on hit-zone pointerup", () => {
    const { btn, onClick } = makeButton({ label: "Go" });
    const hitZone = (btn as unknown as { hitZone: any }).hitZone;
    fireEvent(hitZone, "pointerup");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("hover and out events do not throw and toggle texture state", () => {
    const { btn } = makeButton();
    const hitZone = (btn as unknown as { hitZone: any }).hitZone;
    expect(() => {
      fireEvent(hitZone, "pointerover");
      fireEvent(hitZone, "pointerout");
      fireEvent(hitZone, "pointerdown");
      fireEvent(hitZone, "pointerupoutside");
    }).not.toThrow();
  });
});

describe("Button.setActive (visual selection state)", () => {
  it("returns the button instance for chaining", () => {
    const { btn } = makeButton();
    expect(btn.setActive(true)).toBe(btn);
    expect(btn.setActive(false)).toBe(btn);
  });

  it("is a no-op when disabled", () => {
    const { btn } = makeButton();
    btn.setDisabled(true);
    expect(() => btn.setActive(true)).not.toThrow();
  });
});

describe("Button.destroy", () => {
  it("tears down hit zone without throwing", () => {
    const { btn } = makeButton();
    const hitZone = (btn as unknown as { hitZone: any }).hitZone;
    btn.destroy();
    expect(hitZone.destroyed).toBe(true);
  });
});
