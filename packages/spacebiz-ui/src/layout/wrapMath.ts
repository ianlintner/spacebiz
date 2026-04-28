// Pure wrap layout math for FixWidthSizer.

export interface WrapChildSpec {
  width: number;
  height: number;
}

export interface WrapInput {
  containerWidth: number;
  columnGap: number;
  rowGap: number;
  children: WrapChildSpec[];
  /** Horizontal alignment of each row's content. */
  hAlign?: "start" | "center" | "end";
}

export interface WrapResult {
  positions: Array<{ x: number; y: number }>;
  totalWidth: number;
  totalHeight: number;
  /** Index ranges per row, useful for tests/debugging. */
  rows: Array<{ start: number; end: number; width: number; height: number }>;
}

export function computeWrap(input: WrapInput): WrapResult {
  const {
    containerWidth,
    columnGap,
    rowGap,
    children,
    hAlign = "start",
  } = input;

  const positions: Array<{ x: number; y: number }> = [];
  const rows: WrapResult["rows"] = [];

  if (children.length === 0) {
    return { positions, totalWidth: 0, totalHeight: 0, rows };
  }

  let rowStart = 0;
  let rowWidth = 0;
  let rowHeight = 0;
  let cursorY = 0;
  let widestRow = 0;

  function flushRow(end: number): void {
    const rowItemCount = end - rowStart;
    const totalGap = columnGap * Math.max(0, rowItemCount - 1);
    const contentWidth = rowWidth + totalGap;
    let xOffset = 0;
    if (hAlign === "center") {
      xOffset = Math.max(0, (containerWidth - contentWidth) / 2);
    } else if (hAlign === "end") {
      xOffset = Math.max(0, containerWidth - contentWidth);
    }

    let cursorX = xOffset;
    for (let i = rowStart; i < end; i++) {
      positions[i] = { x: cursorX, y: cursorY };
      cursorX += children[i].width + columnGap;
    }
    rows.push({
      start: rowStart,
      end,
      width: contentWidth,
      height: rowHeight,
    });
    if (contentWidth > widestRow) widestRow = contentWidth;
    cursorY += rowHeight + rowGap;
    rowStart = end;
    rowWidth = 0;
    rowHeight = 0;
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const itemsInRow = i - rowStart;
    const projected = rowWidth + child.width + (itemsInRow > 0 ? columnGap : 0);

    if (itemsInRow > 0 && projected > containerWidth) {
      flushRow(i);
    }

    rowWidth += child.width;
    if (child.height > rowHeight) rowHeight = child.height;
  }
  flushRow(children.length);

  // cursorY now sits one rowGap past the last row's bottom edge.
  const totalHeight = Math.max(0, cursorY - rowGap);
  return { positions, totalWidth: widestRow, totalHeight, rows };
}
