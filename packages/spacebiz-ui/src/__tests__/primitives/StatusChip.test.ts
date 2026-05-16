import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { StatusChip } from "../../StatusChip.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("ChipScene");
});

describe("StatusChip construction", () => {
  it("places the container at the configured position", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 50,
      y: 80,
      value: "12",
    });
    expect(chip.x).toBe(50);
    expect(chip.y).toBe(80);
  });

  it("adds bg + value child when no label is given (2 children)", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "§1,200",
    });
    expect(chip.list.length).toBe(2);
  });

  it("adds bg + labelText + valueText when label is given (3 children)", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      label: "Ships",
      value: "8",
    });
    expect(chip.list.length).toBe(3);
  });
});

describe("StatusChip.setValue", () => {
  it("updates the value text and returns the chip for chaining", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "old",
    });
    const result = chip.setValue("new");
    expect(result).toBe(chip);
    const internal = chip as unknown as {
      valueText: { text: string };
    };
    expect(internal.valueText.text).toBe("new");
  });
});

describe("StatusChip.setLabel", () => {
  it("updates the label text when a label was configured", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      label: "Ships",
      value: "8",
    });
    chip.setLabel("Fleet");
    const internal = chip as unknown as {
      labelText: { text: string } | null;
    };
    expect(internal.labelText?.text).toBe("Fleet");
  });

  it("is a no-op when no label was configured", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "8",
    });
    expect(() => chip.setLabel("anything")).not.toThrow();
  });
});

describe("StatusChip.setVariant", () => {
  it("returns the chip for chaining", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "8",
    });
    expect(chip.setVariant("danger")).toBe(chip);
  });

  it("applies each variant without throwing", () => {
    const variants = [
      "default",
      "warn",
      "danger",
      "success",
      "accent",
    ] as const;
    for (const v of variants) {
      const chip = new StatusChip(scene as unknown as Phaser.Scene, {
        x: 0,
        y: 0,
        value: "x",
        variant: v,
      });
      expect(() => chip.setVariant(v)).not.toThrow();
    }
  });
});

describe("StatusChip.setSize", () => {
  it("returns the chip for chaining and updates stored dimensions", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "x",
    });
    expect(chip.setSize(200, 32)).toBe(chip);
    const internal = chip as unknown as {
      chipWidth: number;
      chipHeight: number;
    };
    expect(internal.chipWidth).toBe(200);
    expect(internal.chipHeight).toBe(32);
  });
});
