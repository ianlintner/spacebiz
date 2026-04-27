import * as Phaser from "phaser";

/**
 * Apply a clipping geometry mask to a GameObject in a way that works on both
 * Phaser 4 (filter-based mask) and Phaser 3 (legacy `setMask` API).
 *
 * Why: this codebase targets Phaser 4 (`filters?.internal.addMask(...)`), but
 * during dev / CI / installs that lag behind the lockfile, `node_modules`
 * may resolve to Phaser 3.x where `filters` is `undefined` and the optional
 * chain silently no-ops. Without a fallback, masks never apply and content
 * (table rows, portrait stats) renders outside its frame.
 *
 * Container caveat: in Phaser 4 the filter-based mask attached to a Container
 * does not propagate to its child renderables, so DataTable rows escape the
 * frame on scroll. For Containers we fall through to the legacy
 * `setMask(createGeometryMask())` path which still functions in Phaser 4
 * (deprecation warning is acceptable and recognised by the team).
 */
export function applyClippingMask(
  target: Phaser.GameObjects.GameObject,
  maskShape: Phaser.GameObjects.Graphics,
): void {
  const isContainer = target instanceof Phaser.GameObjects.Container;

  // Phaser 4 filter masks don't clip Container children — use the legacy
  // geometry mask path for Containers, which clips descendants correctly.
  if (!isContainer) {
    const filters = (
      target as unknown as {
        filters?: { internal?: { addMask?: (m: unknown) => void } };
      }
    ).filters;
    if (filters?.internal?.addMask) {
      filters.internal.addMask(maskShape);
      return;
    }
  }

  // Phaser 3 / Phaser 4 Container fallback: classic geometry mask
  const t = target as unknown as {
    setMask?: (mask: Phaser.Display.Masks.GeometryMask) => unknown;
  };
  if (typeof t.setMask === "function") {
    t.setMask(maskShape.createGeometryMask());
  }
}
