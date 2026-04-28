// Internal base for HSizer/VSizer/GridSizer/FixWidthSizer. Centralizes the
// child-positioning helpers that need access to Phaser display objects.

import * as Phaser from "phaser";

export interface SizedDisplayObject extends Phaser.GameObjects.GameObject {
  width: number;
  height: number;
  x: number;
  y: number;
  setSize?: (width: number, height: number) => unknown;
  setDisplaySize?: (width: number, height: number) => unknown;
  setOrigin?: (x: number, y?: number) => unknown;
  displayOriginX?: number;
  displayOriginY?: number;
}

export function readChildSize(child: Phaser.GameObjects.GameObject): {
  width: number;
  height: number;
} {
  const c = child as SizedDisplayObject;
  return { width: c.width ?? 0, height: c.height ?? 0 };
}

export function applyChildSize(
  child: Phaser.GameObjects.GameObject,
  width: number,
  height: number,
): void {
  const c = child as SizedDisplayObject;
  if (typeof c.setSize === "function") {
    c.setSize(width, height);
  } else {
    c.width = width;
    c.height = height;
  }
}

export function placeChild(
  child: Phaser.GameObjects.GameObject,
  x: number,
  y: number,
): void {
  const c = child as SizedDisplayObject;
  // Honour displayOrigin when present (Sprites/Images default to 0.5).
  const ox = c.displayOriginX ?? 0;
  const oy = c.displayOriginY ?? 0;
  c.x = x + ox;
  c.y = y + oy;
}
