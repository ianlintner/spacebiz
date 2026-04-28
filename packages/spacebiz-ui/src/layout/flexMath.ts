// Pure flex layout math, used by HSizer / VSizer. No Phaser imports — fully
// unit-testable.

import type { Justify, MeasuredChild } from "./types.ts";

export interface FlexInput {
  containerSize: number;
  gap: number;
  justify: Justify;
  children: MeasuredChild[];
  /** Natural-content size of each child along the main axis. */
  mainSizes: number[];
}

export interface FlexResult {
  /** Final size assigned to each child along the main axis. */
  sizes: number[];
  /** Top-left position of each child along the main axis. */
  positions: number[];
  /** Total content size after layout (sum of sizes + gaps). */
  totalSize: number;
}

export function computeFlex(input: FlexInput): FlexResult {
  const { containerSize, gap, justify, children, mainSizes } = input;
  const n = children.length;
  if (n === 0) {
    return { sizes: [], positions: [], totalSize: 0 };
  }

  const sizes = mainSizes.slice();
  const totalGap = gap * Math.max(0, n - 1);
  const naturalTotal = sizes.reduce((a, b) => a + b, 0) + totalGap;

  const totalFlex = children.reduce((acc, c) => acc + (c.flex ?? 0), 0);
  if (totalFlex > 0 && containerSize > naturalTotal) {
    const free = containerSize - naturalTotal;
    for (let i = 0; i < n; i++) {
      const f = children[i].flex ?? 0;
      if (f > 0) sizes[i] += (free * f) / totalFlex;
    }
  }

  const usedSize = sizes.reduce((a, b) => a + b, 0) + totalGap;
  const positions = new Array<number>(n);

  // When flex absorbed the free space, justification is implicitly "start".
  const effectiveJustify = totalFlex > 0 ? "start" : justify;
  const free = Math.max(0, containerSize - usedSize);

  let cursor = 0;
  let extraGap = 0;

  switch (effectiveJustify) {
    case "start":
      cursor = 0;
      break;
    case "center":
      cursor = free / 2;
      break;
    case "end":
      cursor = free;
      break;
    case "space-between":
      cursor = 0;
      extraGap = n > 1 ? free / (n - 1) : 0;
      break;
    case "space-around":
      extraGap = n > 0 ? free / n : 0;
      cursor = extraGap / 2;
      break;
  }

  for (let i = 0; i < n; i++) {
    positions[i] = cursor;
    cursor += sizes[i] + gap + extraGap;
  }

  return { sizes, positions, totalSize: usedSize + (n - 1) * extraGap };
}

export function alignCross(
  childSize: number,
  containerSize: number,
  align: "start" | "center" | "end" | "stretch",
): { offset: number; size: number } {
  if (align === "stretch") {
    return { offset: 0, size: containerSize };
  }
  if (align === "center") {
    return { offset: (containerSize - childSize) / 2, size: childSize };
  }
  if (align === "end") {
    return { offset: containerSize - childSize, size: childSize };
  }
  return { offset: 0, size: childSize };
}
