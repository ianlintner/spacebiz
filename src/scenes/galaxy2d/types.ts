// Shared value types for the Phaser-only galaxy view layer.
// These are the same shapes the legacy GalaxyView3D exposes — replicated
// here so callers don't need to know which renderer is active.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedScreen {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

export interface ViewportRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
