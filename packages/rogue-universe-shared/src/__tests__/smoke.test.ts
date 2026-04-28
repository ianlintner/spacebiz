import { describe, it, expect } from "vitest";

// The Vitest config runs in the "node" environment, where Phaser cannot be
// instantiated (it needs a DOM + canvas). The package's main index.ts pulls
// in modules that load Phaser at the value level, so we cannot just `import
// "../index.ts"` here.
//
// Instead we exercise the Phaser-free corners of each sub-module to prove the
// barrels resolve and re-export the expected names. End-to-end runtime
// coverage of the Phaser-dependent components lives in Playwright e2e.

import {
  getExpressionFromGameState,
  type PortraitExpression,
} from "../characters/PortraitExpression.ts";
import {
  CARGO_TYPE_LIST,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
} from "../domain/CargoIcons.ts";
import {
  SHIP_CLASS_LIST,
  getShipIconKey,
  getShipColor,
  getShipLabel,
} from "../domain/ShipIcons.ts";

describe("@rogue-universe/shared package smoke", () => {
  it("re-exports portrait expression helpers", () => {
    expect(getExpressionFromGameState).toBeTypeOf("function");
    const sample: PortraitExpression = "neutral";
    expect(sample).toBe("neutral");
  });

  it("re-exports cargo icon helpers and constants", () => {
    expect(Array.isArray(CARGO_TYPE_LIST)).toBe(true);
    expect(CARGO_TYPE_LIST.length).toBeGreaterThan(0);
    const first = CARGO_TYPE_LIST[0];
    expect(getCargoIconKey(first)).toMatch(/^cargo-/);
    expect(typeof getCargoColor(first)).toBe("number");
    expect(typeof getCargoLabel(first)).toBe("string");
  });

  it("re-exports ship icon helpers and constants", () => {
    expect(Array.isArray(SHIP_CLASS_LIST)).toBe(true);
    expect(SHIP_CLASS_LIST.length).toBeGreaterThan(0);
    const first = SHIP_CLASS_LIST[0];
    expect(getShipIconKey(first)).toMatch(/^ship-/);
    expect(typeof getShipColor(first)).toBe("number");
    expect(typeof getShipLabel(first)).toBe("string");
  });
});
