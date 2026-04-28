// Shared types for layout primitives. Pure types — safe to import from tests
// without dragging in Phaser.

import type { LayoutMetrics } from "../Layout.ts";

export type HAlign = "left" | "center" | "right" | "stretch";
export type VAlign = "top" | "center" | "bottom" | "stretch";
export type Justify =
  | "start"
  | "center"
  | "end"
  | "space-between"
  | "space-around";

export type AnchorPosition =
  | "topLeft"
  | "top"
  | "topRight"
  | "left"
  | "center"
  | "right"
  | "bottomLeft"
  | "bottom"
  | "bottomRight";

export type AnchorFill = "horizontal" | "vertical" | "both";

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Resizable {
  onLayout(metrics: LayoutMetrics): void;
}

export interface SizerChildOptions {
  /**
   * Flex weight. When > 0 along the main axis, the child grows to share
   * remaining free space proportionally to its weight.
   */
  flex?: number;
  /** Cross-axis alignment override for this child. */
  align?: HAlign | VAlign;
  /** Per-side padding around this child within the cell. */
  padding?: number | Partial<Insets>;
}

export interface GridChildOptions {
  colspan?: number;
  rowspan?: number;
  /** Per-cell horizontal alignment override. */
  hAlign?: HAlign;
  /** Per-cell vertical alignment override. */
  vAlign?: VAlign;
}

export interface MeasuredChild {
  /** Natural (display) width. */
  width: number;
  /** Natural (display) height. */
  height: number;
  flex?: number;
}

export function normalizeInsets(value: number | Partial<Insets>): Insets {
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }
  return {
    top: value.top ?? 0,
    right: value.right ?? 0,
    bottom: value.bottom ?? 0,
    left: value.left ?? 0,
  };
}
