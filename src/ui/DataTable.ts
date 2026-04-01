import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

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

  constructor(scene: Phaser.Scene, config: DataTableConfig) {
    super(scene, config.x, config.y);
    this.tableConfig = config;
    this.columns = config.columns;

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
        this.handleWheel(dz);
      },
    );
    this.add(this.wheelHitArea);

    // Mask for body scrolling
    const maskShape = scene.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      config.x,
      config.y + this.headerHeight,
      config.width,
      config.height - this.headerHeight,
    );
    const mask = maskShape.createGeometryMask();
    this.bodyContainer.setMask(mask);

    this.renderHeader();
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
      .setAlpha(0.4);
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
        if (hitArea.input) {
          hitArea.input.cursor = "pointer";
        }
        hitArea.on("pointerdown", () => {
          hitArea.setAlpha(0.75);
        });
        hitArea.on("pointerup", () => {
          hitArea.setAlpha(1);
          getAudioDirector().sfx("ui_tab_switch");
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
    this.selectedRowIndex = -1;
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

    sortedRows.forEach((row, i) => {
      const y = i * this.rowHeight;
      const bgColor = i % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd;
      const rowBg = this.scene.add
        .rectangle(0, y, this.tableConfig.width, this.rowHeight, bgColor)
        .setOrigin(0, 0)
        .setAlpha(0.85)
        .setInteractive(
          new Phaser.Geom.Rectangle(
            0,
            0,
            this.tableConfig.width,
            this.rowHeight,
          ),
          Phaser.Geom.Rectangle.Contains,
        );
      if (rowBg.input) {
        rowBg.input.cursor = "pointer";
      }

      rowBg.on("pointerover", () => rowBg.setFillStyle(theme.colors.rowHover));
      rowBg.on("pointerout", () => {
        rowBg.setAlpha(0.85);
        rowBg.setFillStyle(bgColor);
      });
      rowBg.on("pointerdown", () => {
        rowBg.setAlpha(0.72);
      });
      rowBg.on("pointerup", () => {
        rowBg.setAlpha(0.85);
        getAudioDirector().sfx("ui_row_select");
        this.selectRow(i, y);
        this.tableConfig.onRowSelect?.(i, row);
      });
      rowBg.on("pointerupoutside", () => {
        rowBg.setAlpha(0.85);
      });

      this.bodyContainer.add(rowBg);

      let x = 0;
      for (const col of this.columns) {
        const raw = row[col.key];
        const display = col.format ? col.format(raw) : String(raw ?? "");
        const color = col.colorFn ? col.colorFn(raw) : theme.colors.text;

        const text = this.scene.add.text(x + 8, y + 8, display, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(color ?? theme.colors.text),
        });

        if (col.align === "right") {
          text.setOrigin(1, 0).setX(x + col.width - 8);
        } else if (col.align === "center") {
          text.setOrigin(0.5, 0).setX(x + col.width / 2);
        }

        this.bodyContainer.add(text);
        x += col.width;
      }
    });

    this.maxScroll = Math.max(
      0,
      sortedRows.length * this.rowHeight -
        (this.tableConfig.height - this.headerHeight),
    );
  }

  private selectRow(rowIndex: number, rowY: number): void {
    const theme = getTheme();

    // Remove previous indicator
    if (this.selectedRowIndicator) {
      this.selectedRowIndicator.destroy();
      this.selectedRowIndicator = null;
    }

    this.selectedRowIndex = rowIndex;

    // Draw a 3px wide accent-colored rectangle on the left edge of the selected row
    this.selectedRowIndicator = this.scene.add
      .rectangle(0, rowY, 3, this.rowHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.8);
    this.bodyContainer.add(this.selectedRowIndicator);
  }

  getSelectedRowIndex(): number {
    return this.selectedRowIndex;
  }
}
