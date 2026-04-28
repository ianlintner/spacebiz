/**
 * Pure logic for the Stepper component, extracted so it can be unit-tested
 * without loading Phaser (which depends on `window` and won't run in the
 * node-environment Vitest config).
 */

/** Initial delay before hold-to-repeat starts firing (ms). */
export const HOLD_REPEAT_INITIAL_DELAY = 400;
/** Starting interval between repeats (ms). Slowest tick. */
export const HOLD_REPEAT_START_INTERVAL = 150;
/** Floor on repeat interval after acceleration (ms). */
export const HOLD_REPEAT_MIN_INTERVAL = 30;
/** Multiplicative acceleration factor applied each repeat tick. */
export const HOLD_REPEAT_ACCEL = 0.85;

export const STEPPER_TIMING = {
  initialDelay: HOLD_REPEAT_INITIAL_DELAY,
  startInterval: HOLD_REPEAT_START_INTERVAL,
  minInterval: HOLD_REPEAT_MIN_INTERVAL,
  accel: HOLD_REPEAT_ACCEL,
} as const;

export function clampStepperValue(
  value: number,
  min: number,
  max: number,
): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function nextRepeatInterval(current: number): number {
  const next = current * HOLD_REPEAT_ACCEL;
  return next < HOLD_REPEAT_MIN_INTERVAL ? HOLD_REPEAT_MIN_INTERVAL : next;
}
