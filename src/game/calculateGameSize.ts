// Import directly from Layout.ts (not the @spacebiz/ui barrel) so this module
// stays free of Phaser — keeps it cheap to import in unit tests.
import {
  BASE_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH,
} from "../../packages/spacebiz-ui/src/Layout.ts";

export { BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH };

/** Calculate a virtual game size for a given screen aspect ratio.
 *
 * Pure: takes explicit dimensions instead of reading `window` so the result is
 * deterministic and testable. Falls back to window.innerWidth/Height when the
 * caller doesn't pass dimensions.
 */
export function calculateGameSize(
  screenW: number = typeof window !== "undefined"
    ? window.innerWidth || 1280
    : 1280,
  screenH: number = typeof window !== "undefined"
    ? window.innerHeight || 720
    : 720,
): { width: number; height: number } {
  const safeW = screenW > 0 ? screenW : 1280;
  const safeH = screenH > 0 ? screenH : 720;
  const ratio = safeW / safeH;

  if (ratio >= 1) {
    // Landscape: fixed height, variable width
    const w = Math.round(BASE_HEIGHT * ratio);
    return {
      width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)),
      height: BASE_HEIGHT,
    };
  }
  // Portrait: fixed width at MIN_WIDTH, variable height
  const h = Math.round(MIN_WIDTH / ratio);
  return {
    width: MIN_WIDTH,
    height: Math.min(h, 1600),
  };
}
