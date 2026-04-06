import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  format?: (value: unknown) => string;
  colorFn?: (value: unknown) => number | null;
}

export interface DataTableConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  columns: ColumnDef[];
  onRowSelect?: (rowIndex: number, rowData: Record<string, unknown>) => void;
  onRowActivate?: (rowIndex: number, rowData: Record<string, unknown>) => void;
  onCancel?: () => void;
  keyboardNavigation?: boolean;
  autoFocus?: boolean;
  emptyStateText?: string;
  emptyStateHint?: string;
}

export class DataTable extends Phaser.GameObjects.Container {
  private columns: ColumnDef[];
  private rows: Record<string, unknown>[] = [];
  private headerContainer: Phaser.GameObjects.Container;
  private bodyContainer: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private tableConfig: DataTableConfig;
  private rowHeight = 32;
  private headerHeight = 36;
  private sortKey: string | null = null;
  private sortAsc = true;
  private selectedRowIndex = -1;
  private selectedRowIndicator: Phaser.GameObjects.Rectangle | null = null;
  private wheelHitArea: Phaser.GameObjects.Rectangle;
  private maskShape: Phaser.GameObjects.Graphics;
  private renderedRows: Record<string, unknown>[] = [];
  private hasKeyboardFocus = false;
  private readonly keyboardNavigationEnabled: boolean;
  private destroyed = false;

  constructor(scene: Phaser.Scene, config: DataTableConfig) {
    super(scene, config.x, config.y);
    this.tableConfig = config;
    this.columns = config.columns;
    this.keyboardNavigationEnabled = config.keyboardNavigation ?? false;

    this.headerContainer = scene.add.container(0, 0);
    this.add(this.headerContainer);

    this.bodyContainer = scene.add.container(0, this.headerHeight);
    this.add(this.bodyContainer);

    this.wheelHitArea = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, config.width, config.height),
        Phaser.Geom.Rectangle.Contains,
      );
    this.wheelHitArea.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _dx: number,
        _dy: number,
        dz: number,
      ) => {
        this.focus();
        this.handleWheel(dz);
      },
    );
    this.wheelHitArea.on("pointerdown", () => {
      this.focus();
    });
    this.addAt(this.wheelHitArea, 0);
    this.wheelHitArea.setData("consumesWheel", true);

    // Mask for body scrolling
    this.maskShape = scene.make.graphics({});
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(
      0,
      this.headerHeight,
      config.width,
      config.height - this.headerHeight,
    );
    this.maskShape.setPosition(config.x, config.y);
    const mask = this.maskShape.createGeometryMask();
    this.bodyContainer.setMask(mask);

    this.renderHeader();

    if (this.keyboardNavigationEnabled) {
      this.scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
      if (config.autoFocus) {
        this.focus();
      }
    }

    // Sync geometry mask position when inside a parent Container
    this.scene.events.on("preupdate", this.syncMaskPosition, this);

    scene.add.existing(this);
  }

  /** Scroll handler shared by header, rows, and empty-space background */
  private handleWheel(dz: number): void {
    this.scrollY = Phaser.Math.Clamp(
      this.scrollY + dz * 0.5,
      0,
      this.maxScroll,
    );
    this.bodyContainer.y = this.headerHeight - this.scrollY;
  }

  private renderHeader(): void {
    const theme = getTheme();
    this.headerContainer.removeAll(true);

    const bg = this.scene.add
      .rectangle(
        0,
        0,
        this.tableConfig.width,
        this.headerHeight,
        theme.colors.headerBg,
      )
      .setOrigin(0, 0);
    this.headerContainer.add(bg);

    // Accent-colored bottom border line under header
    const headerBorderLine = this.scene.add
      .rectangle(
        0,
        this.headerHeight - 1,
        this.tableConfig.width,
        1,
        theme.colors.accent,
      )
      .setOrigin(0, 0)
      .setAlpha(0.6);
    this.headerContainer.add(headerBorderLine);

    let x = 0;
    for (const col of this.columns) {
      const text = this.scene.add.text(x + 8, 8, col.label, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accent),
      });

      if (col.sortable) {
        const hitArea = this.scene.add
          .rectangle(x, 0, col.width, this.headerHeight, 0x000000, 0)
          .setOrigin(0, 0)
          .setInteractive(
            new Phaser.Geom.Rectangle(0, 0, col.width, this.headerHeight),
            Phaser.Geom.Rectangle.Contains,
          );
        hitArea.setData("consumesWheel", true);
        if (hitArea.input) {
          hitArea.input.cursor = "pointer";
        }
        hitArea.on("pointerdown", () => {
          this.focus();
          hitArea.setAlpha(0.75);
        });
        hitArea.on(
          "wheel",
          (
            _pointer: Phaser.Input.Pointer,
            _dx: number,
            _dy: number,
            dz: number,
          ) => {
            this.handleWheel(dz);
          },
        );
        hitArea.on("pointerup", () => {
          hitArea.setAlpha(1);
          playUiSfx("ui_tab_switch");
          if (this.sortKey === col.key) {
            this.sortAsc = !this.sortAsc;
          } else {
            this.sortKey = col.key;
            this.sortAsc = true;
          }
          this.renderBody();
        });
        hitArea.on("pointerout", () => {
          hitArea.setAlpha(1);
        });
        hitArea.on("pointerupoutside", () => {
          hitArea.setAlpha(1);
        });
        this.headerContainer.add(hitArea);
      }

      this.headerContainer.add(text);
      x += col.width;
    }
  }

  setRows(rows: Record<string, unknown>[]): void {
    this.rows = [...rows];
    this.scrollY = 0;
    if (this.rows.length === 0) {
      this.selectedRowIndex = -1;
    } else if (this.selectedRowIndex >= this.rows.length) {
      this.selectedRowIndex = this.rows.length - 1;
    }
    this.selectedRowIndicator = null;
    this.renderBody();
  }

  private renderBody(): void {
    const theme = getTheme();
    this.bodyContainer.removeAll(true);
    this.bodyContainer.y = this.headerHeight;
    this.selectedRowIndicator = null;

    const sortedRows = [...this.rows];
    if (this.sortKey) {
      const key = this.sortKey;
      const dir = this.sortAsc ? 1 : -1;
      sortedRows.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return -1 * dir;
        if (bVal == null) return 1 * dir;
        const aNum = typeof aVal === "number" ? aVal : String(aVal);
        const bNum = typeof bVal === "number" ? bVal : String(bVal);
        if (aNum < bNum) return -1 * dir;
        if (aNum > bNum) return 1 * dir;
        return 0;
      });
    }

    this.renderedRows = sortedRows;

    if (sortedRows.length === 0) {
      const emptyText =
        this.tableConfig.emptyStateText ?? "No entries available";
      const hintText = this.tableConfig.emptyStateHint;

      const label = this.scene.add
        .text(this.tableConfig.width / 2, 44, emptyText, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
          align: "center",
        })
        .setOrigin(0.5, 0);
      this.bodyContainer.add(label);

      if (hintText) {
        const hint = this.scene.add
          .text(this.tableConfig.width / 2, 70, hintText, {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
            align: "center",
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.9);
        this.bodyContainer.add(hint);
      }

      this.maxScroll = 0;
      return;
    }

    if (this.selectedRowIndex < 0 && this.tableConfig.autoFocus) {
      this.selectedRowIndex = 0;
    }

    let yCursor = 0;

    sortedRows.forEach((row, i) => {
      const rowTop = yCursor;
      const bgColor = i % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd;

      // Build texts first so we can measure wrapped height and size the row correctly.
      const rowTexts: Phaser.GameObjects.Text[] = [];
      let maxTextHeight = theme.fonts.body.size;

      let x = 0;
      for (const col of this.columns) {
        const raw = row[col.key];
        const display = col.format ? col.format(raw) : String(raw ?? "");
        const color = col.colorFn ? col.colorFn(raw) : theme.colors.text;

        const text = this.scene.add.text(x + 8, rowTop + 8, display, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(color ?? theme.colors.text),
          wordWrap: { width: col.width - 16 },
        });

        if (col.align === "right") {
          text.setOrigin(1, 0).setX(x + col.width - 8);
        } else if (col.align === "center") {
          text.setOrigin(0.5, 0).setX(x + col.width / 2);
        }

        maxTextHeight = Math.max(maxTextHeight, text.height);
        rowTexts.push(text);
        x += col.width;
      }

      const rowHeightPx = Math.max(this.rowHeight, maxTextHeight + 14);

      const rowBg = this.scene.add
        .rectangle(0, rowTop, this.tableConfig.width, rowHeightPx, bgColor)
        .setOrigin(0, 0)
        .setAlpha(0.95)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, 0, this.tableConfig.width, rowHeightPx),
          Phaser.Geom.Rectangle.Contains,
        );
      rowBg.setData("consumesWheel", true);
      if (rowBg.input) {
        rowBg.input.cursor = "pointer";
      }

      rowBg.on("pointerover", () => rowBg.setFillStyle(theme.colors.rowHover));
      rowBg.on("pointerout", () => {
        rowBg.setAlpha(0.95);
        rowBg.setFillStyle(bgColor);
      });
      rowBg.on("pointerdown", () => {
        this.focus();
        rowBg.setAlpha(0.72);
      });
      rowBg.on(
        "wheel",
        (
          _pointer: Phaser.Input.Pointer,
          _dx: number,
          _dy: number,
          dz: number,
        ) => {
          this.handleWheel(dz);
        },
      );
      rowBg.on("pointerup", () => {
        rowBg.setAlpha(0.95);
        playUiSfx("ui_row_select");
        this.selectRow(i, rowTop, rowHeightPx, true);
      });
      rowBg.on("pointerupoutside", () => {
        rowBg.setAlpha(0.95);
      });

      this.bodyContainer.add(rowBg);

      for (const text of rowTexts) {
        this.bodyContainer.add(text);
      }

      yCursor += rowHeightPx;
    });

    if (this.selectedRowIndex >= 0) {
      this.restoreSelectedRowIndicator();
    }

    this.maxScroll = Math.max(
      0,
      yCursor - (this.tableConfig.height - this.headerHeight),
    );
  }

  private selectRow(
    rowIndex: number,
    rowY: number,
    rowHeight: number,
    notifySelection = false,
  ): void {
    const theme = getTheme();

    // Remove previous indicator
    if (this.selectedRowIndicator) {
      this.selectedRowIndicator.destroy();
      this.selectedRowIndicator = null;
    }

    this.selectedRowIndex = rowIndex;

    // Draw a 3px wide accent-colored rectangle on the left edge of the selected row
    this.selectedRowIndicator = this.scene.add
      .rectangle(0, rowY, 3, rowHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.8);
    this.bodyContainer.add(this.selectedRowIndicator);

    if (notifySelection) {
      const rowData = this.renderedRows[rowIndex];
      if (rowData) {
        this.tableConfig.onRowSelect?.(rowIndex, rowData);
      }
    }
  }

  private restoreSelectedRowIndicator(): void {
    if (this.selectedRowIndex < 0) return;

    const rowObjects = this.bodyContainer.list.filter(
      (object): object is Phaser.GameObjects.Rectangle =>
        object instanceof Phaser.GameObjects.Rectangle &&
        object.width === this.tableConfig.width,
    );

    const rowBg = rowObjects[this.selectedRowIndex];
    if (!rowBg) return;
    this.selectRow(this.selectedRowIndex, rowBg.y, rowBg.height, false);
  }

  private moveSelection(delta: number): void {
    if (this.renderedRows.length === 0) return;

    const nextIndex = Phaser.Math.Clamp(
      this.selectedRowIndex < 0 ? 0 : this.selectedRowIndex + delta,
      0,
      this.renderedRows.length - 1,
    );

    const rowObjects = this.bodyContainer.list.filter(
      (object): object is Phaser.GameObjects.Rectangle =>
        object instanceof Phaser.GameObjects.Rectangle &&
        object.width === this.tableConfig.width,
    );
    const rowBg = rowObjects[nextIndex];
    if (!rowBg) return;

    this.selectRow(nextIndex, rowBg.y, rowBg.height, true);
    this.ensureRowVisible(nextIndex, rowBg.height);
  }

  private ensureRowVisible(rowIndex: number, rowHeight: number): void {
    const rowTop = this.getRowTop(rowIndex);
    const rowBottom = rowTop + rowHeight;
    const visibleTop = this.scrollY;
    const visibleBottom =
      this.scrollY + (this.tableConfig.height - this.headerHeight);

    if (rowTop < visibleTop) {
      this.scrollY = rowTop;
    } else if (rowBottom > visibleBottom) {
      this.scrollY = rowBottom - (this.tableConfig.height - this.headerHeight);
    }

    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.bodyContainer.y = this.headerHeight - this.scrollY;
  }

  private getRowTop(rowIndex: number): number {
    let rowCursor = 0;
    let currentIndex = 0;

    for (const object of this.bodyContainer.list) {
      if (
        object instanceof Phaser.GameObjects.Rectangle &&
        object.width === this.tableConfig.width
      ) {
        if (currentIndex === rowIndex) {
          return rowCursor;
        }
        rowCursor += object.height;
        currentIndex += 1;
      }
    }

    return 0;
  }

  private focus(): void {
    if (!this.keyboardNavigationEnabled) return;
    this.hasKeyboardFocus = true;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (
      !this.hasKeyboardFocus ||
      !this.visible ||
      this.renderedRows.length === 0
    ) {
      if (this.hasKeyboardFocus && event.code === "Escape") {
        this.tableConfig.onCancel?.();
      }
      return;
    }

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.moveSelection(-1);
        event.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        this.moveSelection(1);
        event.preventDefault();
        break;
      case "Enter":
      case "Space": {
        const rowIndex = this.selectedRowIndex < 0 ? 0 : this.selectedRowIndex;
        const rowData = this.renderedRows[rowIndex];
        if (rowData) {
          this.selectRow(
            rowIndex,
            this.getRowTop(rowIndex),
            this.getRowHeight(rowIndex),
            true,
          );
          this.tableConfig.onRowActivate?.(rowIndex, rowData);
        }
        event.preventDefault();
        break;
      }
      case "Escape":
        this.tableConfig.onCancel?.();
        event.preventDefault();
        break;
    }
  }

  private getRowHeight(rowIndex: number): number {
    let currentIndex = 0;
    for (const object of this.bodyContainer.list) {
      if (
        object instanceof Phaser.GameObjects.Rectangle &&
        object.width === this.tableConfig.width
      ) {
        if (currentIndex === rowIndex) {
          return object.height;
        }
        currentIndex += 1;
      }
    }
    return this.rowHeight;
  }

  getSelectedRowIndex(): number {
    return this.selectedRowIndex;
  }

  private syncMaskPosition(): void {
    if (this.destroyed) return;
    const matrix = this.getWorldTransformMatrix();
    this.maskShape.setPosition(matrix.tx, matrix.ty);
  }

  destroy(fromScene?: boolean): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off("preupdate", this.syncMaskPosition, this);
    if (this.keyboardNavigationEnabled) {
      this.scene.input.keyboard?.off("keydown", this.handleKeyDown, this);
    }
    this.maskShape.destroy();
    super.destroy(fromScene);
  }
}
