/**
 * Clamp `value` to `[min, max]` and round to the nearest `step`. Step rounding
 * is anchored to `min` so a slider with min=10/step=5 produces 10, 15, 20…
 * regardless of the input.
 */
export function quantizeSliderValue(
  value: number,
  min: number,
  max: number,
  step?: number,
): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (!step || step <= 0) return clamped;
  const steps = Math.round((clamped - min) / step);
  const snapped = min + steps * step;
  return Math.min(max, Math.max(min, snapped));
}
