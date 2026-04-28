/**
 * Pure layout math for Toolbar, factored into its own module so unit tests
 * can import it without pulling in Phaser.
 */

export interface ToolbarLayoutItemSpec {
  /** Item width in px after sizing. */
  width: number;
  /** Item left offset within the toolbar. */
  x: number;
  /** Group index this item belongs to. */
  groupIndex: number;
}

export interface ToolbarLayoutResult {
  items: ToolbarLayoutItemSpec[];
  /** X positions where vertical dividers should be drawn (between groups). */
  dividerXs: number[];
  /** Total width of the rendered toolbar. */
  totalWidth: number;
}

/**
 * Compute item placements + divider positions given each item's intrinsic
 * width.
 */
export function layoutToolbar(
  groups: ReadonlyArray<{ widths: ReadonlyArray<number> }>,
  itemGap: number,
  groupGap: number,
): ToolbarLayoutResult {
  const items: ToolbarLayoutItemSpec[] = [];
  const dividerXs: number[] = [];
  let cursor = 0;
  groups.forEach((g, gi) => {
    if (gi > 0) {
      const dividerX = cursor + groupGap / 2;
      dividerXs.push(dividerX);
      cursor += groupGap;
    }
    g.widths.forEach((w, ii) => {
      if (ii > 0) cursor += itemGap;
      items.push({ width: w, x: cursor, groupIndex: gi });
      cursor += w;
    });
  });
  return { items, dividerXs, totalWidth: cursor };
}
