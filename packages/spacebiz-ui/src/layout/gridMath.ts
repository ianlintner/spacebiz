// Pure 2D grid layout math for GridSizer.

export interface GridChildSpec {
  width: number;
  height: number;
  colspan: number;
  rowspan: number;
}

export interface GridInput {
  columns: number;
  rows?: number;
  columnGap: number;
  rowGap: number;
  children: GridChildSpec[];
}

export interface GridCellPlacement {
  col: number;
  row: number;
  colspan: number;
  rowspan: number;
}

export interface GridResult {
  /** Final col/row of each child, parallel to input.children. */
  placements: GridCellPlacement[];
  /** Width of each column. */
  columnWidths: number[];
  /** Height of each row. */
  rowHeights: number[];
  /** Total grid width including gaps. */
  totalWidth: number;
  /** Total grid height including gaps. */
  totalHeight: number;
}

export function placeGrid(input: GridInput): GridResult {
  const { columns, columnGap, rowGap, children } = input;
  const colCount = Math.max(1, columns);

  // First pass: assign each child a (col, row) honoring colspan/rowspan with
  // a left-to-right, top-to-bottom scan that skips occupied cells.
  const occupied: boolean[][] = [];
  const placements: GridCellPlacement[] = [];

  function isFree(col: number, row: number, cs: number, rs: number): boolean {
    if (col + cs > colCount) return false;
    for (let r = row; r < row + rs; r++) {
      for (let c = col; c < col + cs; c++) {
        if (occupied[r] && occupied[r][c]) return false;
      }
    }
    return true;
  }

  function ensureRow(r: number): void {
    while (occupied.length <= r) {
      occupied.push(new Array<boolean>(colCount).fill(false));
    }
  }

  function markOccupied(
    col: number,
    row: number,
    cs: number,
    rs: number,
  ): void {
    for (let r = row; r < row + rs; r++) {
      ensureRow(r);
      for (let c = col; c < col + cs; c++) {
        occupied[r][c] = true;
      }
    }
  }

  let cursorRow = 0;
  let cursorCol = 0;
  for (const child of children) {
    const cs = Math.max(1, Math.min(child.colspan, colCount));
    const rs = Math.max(1, child.rowspan);
    while (true) {
      ensureRow(cursorRow);
      if (isFree(cursorCol, cursorRow, cs, rs)) {
        placements.push({
          col: cursorCol,
          row: cursorRow,
          colspan: cs,
          rowspan: rs,
        });
        markOccupied(cursorCol, cursorRow, cs, rs);
        cursorCol += cs;
        if (cursorCol >= colCount) {
          cursorCol = 0;
          cursorRow += 1;
        }
        break;
      }
      cursorCol += 1;
      if (cursorCol >= colCount) {
        cursorCol = 0;
        cursorRow += 1;
      }
    }
  }

  const rowCount = Math.max(input.rows ?? 0, occupied.length);

  // Second pass: derive column widths and row heights from children.
  // For spans, distribute the natural size evenly across spanned tracks
  // (simple but predictable; matches Rex behavior closely enough).
  const columnWidths = new Array<number>(colCount).fill(0);
  const rowHeights = new Array<number>(rowCount).fill(0);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const place = placements[i];
    const wPer = child.width / place.colspan;
    const hPer = child.height / place.rowspan;
    for (let c = place.col; c < place.col + place.colspan; c++) {
      if (wPer > columnWidths[c]) columnWidths[c] = wPer;
    }
    for (let r = place.row; r < place.row + place.rowspan; r++) {
      if (hPer > rowHeights[r]) rowHeights[r] = hPer;
    }
  }

  const totalWidth =
    columnWidths.reduce((a, b) => a + b, 0) +
    columnGap * Math.max(0, colCount - 1);
  const totalHeight =
    rowHeights.reduce((a, b) => a + b, 0) + rowGap * Math.max(0, rowCount - 1);

  return { placements, columnWidths, rowHeights, totalWidth, totalHeight };
}

export function trackOffset(
  tracks: number[],
  gap: number,
  index: number,
): number {
  let offset = 0;
  for (let i = 0; i < index; i++) offset += tracks[i] + gap;
  return offset;
}

export function spanSize(
  tracks: number[],
  gap: number,
  start: number,
  span: number,
): number {
  let size = 0;
  for (let i = start; i < start + span; i++) size += tracks[i];
  size += gap * Math.max(0, span - 1);
  return size;
}
