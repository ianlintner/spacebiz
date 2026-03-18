import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

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

  constructor(scene: Phaser.Scene, config: DataTableConfig) {
    super(scene, config.x, config.y);
    this.tableConfig = config;
    this.columns = config.columns;

    this.headerContainer = scene.add.container(0, 0);
    this.add(this.headerContainer);

    this.bodyContainer = scene.add.container(0, this.headerHeight);
    this.add(this.bodyContainer);

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

    // Scroll input
    const scrollHit = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(scrollHit);
    scrollHit.on(
      "wheel",
      (_p: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY + dz * 0.5,
          0,
          this.maxScroll,
        );
        this.bodyContainer.y = this.headerHeight - this.scrollY;
      },
    );

    this.renderHeader();
    scene.add.existing(this);
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
          .setInteractive({ useHandCursor: true });
        hitArea.on("pointerup", () => {
          if (this.sortKey === col.key) {
            this.sortAsc = !this.sortAsc;
          } else {
            this.sortKey = col.key;
            this.sortAsc = true;
          }
          this.renderBody();
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
    this.renderBody();
  }

  private renderBody(): void {
    const theme = getTheme();
    this.bodyContainer.removeAll(true);
    this.bodyContainer.y = this.headerHeight;

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
      const bgColor =
        i % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd;
      const rowBg = this.scene.add
        .rectangle(0, y, this.tableConfig.width, this.rowHeight, bgColor)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      rowBg.on("pointerover", () => rowBg.setFillStyle(theme.colors.rowHover));
      rowBg.on("pointerout", () => rowBg.setFillStyle(bgColor));
      rowBg.on("pointerup", () => {
        this.tableConfig.onRowSelect?.(i, row);
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
}
