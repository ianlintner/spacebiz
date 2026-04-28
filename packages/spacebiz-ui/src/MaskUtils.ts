import * as Phaser from "phaser";

/**
 * Apply a clipping geometry mask to a GameObject.
 *
 * Phaser 4 + WebGL: the only supported geometry mask path is the filter-based
 * mask via `gameObject.filters.internal.addMask(maskShape)`. The legacy
 * `setMask(maskShape.createGeometryMask())` API logs a deprecation warning
 * and silently no-ops under WebGL. Phaser's own type docs warn:
 *   "GeometryMask is only supported in the Canvas Renderer. If you want to
 *    use geometry to mask objects in WebGL, see FilterList#addMask."
 *
 * Important Phaser 4 detail: `target.filters` is a *getter* that returns
 * `null` until `target.enableFilters()` has been called. Without that call,
 * `target.filters?.internal?.addMask` is always falsy and you fall through
 * to the deprecated `setMask` path. `enableFilters()` lazily allocates a
 * filter camera + `{ internal, external }` FilterList pair (see
 * Phaser src/gameobjects/components/Filters.js). It's idempotent (early-
 * returns if `filterCamera` is already set) and a no-op under non-WebGL
 * renderers, so it's safe to call before every mask application.
 *
 * The filter mask renders the target (and, for Containers, the entire
 * container subtree) into a render texture, then composites only the masked
 * region. This means it DOES propagate clipping to Container children — a
 * previous fix in this file mistakenly believed otherwise and routed
 * Containers to the no-op `setMask` path, which caused DataTable rows to
 * escape the table on scroll.
 */
export function applyClippingMask(
  target: Phaser.GameObjects.GameObject,
  maskShape: Phaser.GameObjects.Graphics,
): void {
  // Phaser 4 WebGL filter mask path. Must call enableFilters() first to
  // allocate the filter camera; otherwise `target.filters` is null.
  // viewTransform: 'world' so maskShape.setPosition(matrix.tx, matrix.ty)
  // (called from preupdate sync) is interpreted in world coords.
  const t = target as unknown as {
    enableFilters?: () => unknown;
    filters?: {
      internal?: {
        addMask?: (
          mask: Phaser.GameObjects.Graphics,
          invert?: boolean,
          viewCamera?: Phaser.Cameras.Scene2D.Camera,
          viewTransform?: "local" | "world",
          scaleFactor?: number,
        ) => unknown;
      };
    };
  };

  if (typeof t.enableFilters === "function") {
    t.enableFilters();
  }

  if (t.filters?.internal?.addMask) {
    t.filters.internal.addMask(maskShape, false, undefined, "world");
    return;
  }

  // Last-resort fallback (only reachable on non-WebGL renderers, e.g. unit
  // tests under the headless canvas mock). Under WebGL this path emits a
  // deprecation warning and no-ops, so we deliberately don't take it when
  // the filter API is reachable.
  const legacy = target as unknown as {
    setMask?: (mask: Phaser.Display.Masks.GeometryMask) => unknown;
  };
  if (typeof legacy.setMask === "function") {
    legacy.setMask(maskShape.createGeometryMask());
  }
}
