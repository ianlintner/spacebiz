import * as Phaser from "phaser";

/**
 * Apply a clipping geometry mask to a GameObject.
 *
 * Phaser 4 + WebGL: the only supported geometry mask path is the filter-based
 * mask via `gameObject.filters.internal.addMask(maskShape)`. The legacy
 * `setMask(maskShape.createGeometryMask())` API only works on the Canvas
 * Renderer in Phaser 4 (it silently no-ops under WebGL). Phaser's own type
 * docs warn:
 *   "GeometryMask is only supported in the Canvas Renderer. If you want to
 *    use geometry to mask objects in WebGL, see FilterList#addMask."
 *
 * The filter mask renders the target (and, for Containers, the entire
 * container subtree) into a render texture, then composites only the masked
 * region. This means it DOES propagate clipping to Container children — a
 * previous fix in this file mistakenly believed otherwise and routed
 * Containers to the no-op `setMask` path, which caused DataTable rows to
 * escape the table on scroll.
 *
 * Callers that need rock-solid clipping for scrolling content should also
 * implement viewport-based row visibility (see DataTable.clipRowsToViewport)
 * as belt-and-suspenders, since filter masks can be defeated by transform
 * staleness in nested containers.
 */
export function applyClippingMask(
  target: Phaser.GameObjects.GameObject,
  maskShape: Phaser.GameObjects.Graphics,
): void {
  // Phaser 4 WebGL filter mask path — works for Containers and renderables.
  // Use viewTransform: 'world' so maskShape.setPosition(matrix.tx, matrix.ty)
  // (called from preupdate sync) is interpreted in world coords.
  const filters = (
    target as unknown as {
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
    }
  ).filters;
  if (filters?.internal?.addMask) {
    filters.internal.addMask(maskShape, false, undefined, "world");
    return;
  }

  // Phaser 3 fallback (only useful during dev when node_modules lags).
  const t = target as unknown as {
    setMask?: (mask: Phaser.Display.Masks.GeometryMask) => unknown;
  };
  if (typeof t.setMask === "function") {
    t.setMask(maskShape.createGeometryMask());
  }
}
