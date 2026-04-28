import { describe, it, expect } from "vitest";
import {
  clampStepperValue,
  nextRepeatInterval,
  STEPPER_TIMING,
} from "../stepperLogic.ts";

describe("Stepper helpers", () => {
  describe("clampStepperValue", () => {
    it("returns value when in range", () => {
      expect(clampStepperValue(5, 0, 10)).toBe(5);
    });
    it("clamps below min", () => {
      expect(clampStepperValue(-3, 0, 10)).toBe(0);
    });
    it("clamps above max", () => {
      expect(clampStepperValue(99, 0, 10)).toBe(10);
    });
    it("supports unbounded ranges via -Infinity / +Infinity", () => {
      expect(
        clampStepperValue(
          1e9,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        ),
      ).toBe(1e9);
      expect(
        clampStepperValue(
          -1e9,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
        ),
      ).toBe(-1e9);
    });
  });

  describe("nextRepeatInterval", () => {
    it("accelerates by the configured factor", () => {
      const next = nextRepeatInterval(STEPPER_TIMING.startInterval);
      expect(next).toBeCloseTo(
        STEPPER_TIMING.startInterval * STEPPER_TIMING.accel,
      );
      expect(next).toBeLessThan(STEPPER_TIMING.startInterval);
    });

    it("never goes below the minimum interval", () => {
      let current: number = STEPPER_TIMING.startInterval;
      for (let i = 0; i < 50; i++) {
        current = nextRepeatInterval(current);
      }
      expect(current).toBe(STEPPER_TIMING.minInterval);
    });

    it("clamps a tiny input to the floor in one step", () => {
      expect(nextRepeatInterval(1)).toBe(STEPPER_TIMING.minInterval);
    });
  });

  describe("STEPPER_TIMING constants", () => {
    it("uses a 400ms hold-to-repeat initial delay", () => {
      expect(STEPPER_TIMING.initialDelay).toBe(400);
    });
    it("starts repeating slower than the floor", () => {
      expect(STEPPER_TIMING.startInterval).toBeGreaterThan(
        STEPPER_TIMING.minInterval,
      );
    });
    it("uses an acceleration factor < 1", () => {
      expect(STEPPER_TIMING.accel).toBeLessThan(1);
      expect(STEPPER_TIMING.accel).toBeGreaterThan(0);
    });
  });
});
