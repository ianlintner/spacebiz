import { describe, expect, it } from "vitest";
import { CargoType } from "../../data/types.ts";
import {
  CARGO_VALUES,
  getCargoAtIndex,
  getInitialCargoIndex,
} from "../routeBuilderHelpers.ts";

describe("routeBuilderHelpers", () => {
  describe("CARGO_VALUES", () => {
    it("contains every CargoType in declaration order", () => {
      expect(CARGO_VALUES).toEqual([
        CargoType.Passengers,
        CargoType.RawMaterials,
        CargoType.Food,
        CargoType.Technology,
        CargoType.Luxury,
        CargoType.Hazmat,
        CargoType.Medical,
      ]);
    });
  });

  describe("getInitialCargoIndex", () => {
    it("returns 0 when no initial cargo type is provided", () => {
      expect(getInitialCargoIndex(undefined)).toBe(0);
    });

    // Regression test for the bug where selecting Technology or Luxury in the
    // route finder filter and then opening the Custom Route modal would default
    // to Passengers. Root cause: the modal initialized cargoIndex without
    // mapping initialCargoType, so non-passenger types weren't preserved.
    it("preserves Technology selection through the index round-trip", () => {
      const idx = getInitialCargoIndex(CargoType.Technology);
      expect(idx).toBeGreaterThan(0);
      expect(getCargoAtIndex(idx)).toBe(CargoType.Technology);
    });

    it("preserves Luxury selection through the index round-trip", () => {
      const idx = getInitialCargoIndex(CargoType.Luxury);
      expect(idx).toBeGreaterThan(0);
      expect(getCargoAtIndex(idx)).toBe(CargoType.Luxury);
    });

    it("round-trips every cargo type", () => {
      for (const cargo of CARGO_VALUES) {
        const idx = getInitialCargoIndex(cargo);
        expect(getCargoAtIndex(idx)).toBe(cargo);
      }
    });
  });

  describe("getCargoAtIndex", () => {
    it("returns the cargo at a valid index", () => {
      expect(getCargoAtIndex(0)).toBe(CargoType.Passengers);
    });

    it("throws (instead of silently defaulting to Passengers) on out-of-range index", () => {
      expect(() => getCargoAtIndex(-1)).toThrow(/Invalid cargoIndex/);
      expect(() => getCargoAtIndex(CARGO_VALUES.length)).toThrow(
        /Invalid cargoIndex/,
      );
    });
  });
});
