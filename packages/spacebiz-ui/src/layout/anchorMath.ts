// Pure anchor math for the Anchor component.

import type { AnchorFill, AnchorPosition, Insets } from "./types.ts";

export interface AnchorComputeInput {
  parentWidth: number;
  parentHeight: number;
  childWidth: number;
  childHeight: number;
  to: AnchorPosition;
  offset?: { x?: number; y?: number };
  fill?: AnchorFill;
  insets: Insets;
}

export interface AnchorComputeResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeAnchor(input: AnchorComputeInput): AnchorComputeResult {
  const { parentWidth, parentHeight, to, fill, insets } = input;
  const offsetX = input.offset?.x ?? 0;
  const offsetY = input.offset?.y ?? 0;

  const innerLeft = insets.left;
  const innerTop = insets.top;
  const innerRight = parentWidth - insets.right;
  const innerBottom = parentHeight - insets.bottom;
  const innerWidth = Math.max(0, innerRight - innerLeft);
  const innerHeight = Math.max(0, innerBottom - innerTop);

  let width = input.childWidth;
  let height = input.childHeight;

  if (fill === "horizontal" || fill === "both") {
    width = innerWidth;
  }
  if (fill === "vertical" || fill === "both") {
    height = innerHeight;
  }

  let x = innerLeft;
  let y = innerTop;

  switch (to) {
    case "topLeft":
      x = innerLeft;
      y = innerTop;
      break;
    case "top":
      x = innerLeft + (innerWidth - width) / 2;
      y = innerTop;
      break;
    case "topRight":
      x = innerRight - width;
      y = innerTop;
      break;
    case "left":
      x = innerLeft;
      y = innerTop + (innerHeight - height) / 2;
      break;
    case "center":
      x = innerLeft + (innerWidth - width) / 2;
      y = innerTop + (innerHeight - height) / 2;
      break;
    case "right":
      x = innerRight - width;
      y = innerTop + (innerHeight - height) / 2;
      break;
    case "bottomLeft":
      x = innerLeft;
      y = innerBottom - height;
      break;
    case "bottom":
      x = innerLeft + (innerWidth - width) / 2;
      y = innerBottom - height;
      break;
    case "bottomRight":
      x = innerRight - width;
      y = innerBottom - height;
      break;
  }

  return { x: x + offsetX, y: y + offsetY, width, height };
}
