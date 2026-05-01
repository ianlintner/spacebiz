// Shared resize helper for the 3D view classes (GalaxyView3D, SystemView3D).
// Both views own a WebGLRenderer + PerspectiveCamera pair that needs to stay
// in sync with the host canvas dimensions. The resize math is identical
// between them, so it lives here as a single tested function.
//
// The `updateStyle: false` flag on renderer.setSize is intentional — both
// view classes mirror the Phaser canvas's CSS size via syncCanvasPosition,
// and we don't want Three.js to fight that by writing canvas.style.width /
// canvas.style.height itself.

export interface ResizableRenderer {
  setSize(width: number, height: number, updateStyle?: boolean): void;
}

export interface ResizableCamera {
  aspect: number;
  updateProjectionMatrix(): void;
}

export function applyView3DResize(
  renderer: ResizableRenderer,
  camera: ResizableCamera,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height, false);
  if (height > 0) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}
