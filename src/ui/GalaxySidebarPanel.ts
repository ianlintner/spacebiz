import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";

/**
 * Per-empire row data consumed by {@link GalaxySidebarPanel}. The host scene
 * derives this from `GameState.galaxy.empires` (plus `isEmpireAccessible` and
 * a per-empire system count) so the widget itself stays free of game-state
 * imports.
 */
export interface GalaxySidebarEmpireRow {
  id: string;
  name: string;
  color: number;
  systemCount: number;
  /** Tariff rate as a fraction (e.g. 0.12 for 12 %). */
  tariffRate: number;
  accessible: boolean;
}

export interface GalaxySidebarData {
  systemCount: number;
  empireCount: number;
  hyperlaneCount: number;
  /** Player empire display name; falls back to "—" when unknown. */
  playerEmpireName: string;
  /** Sorted empires (host scene controls the sort order). */
  empires: GalaxySidebarEmpireRow[];
}

export interface GalaxySidebarPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HEADER_OFFSET_Y = 12;
const STATS_OFFSET_Y = 38;
const STAT_LINE_HEIGHT = 16;
const STATS_TO_EMPIRES_GAP = 8;
const EMPIRES_HEADER_TO_ROWS_GAP = 20;
const EMPIRE_ROW_HEIGHT = 32;
const ROW_BOTTOM_PADDING = 24;
const ROW_LABEL_X = 28;
const SWATCH_X = 12;
const SWATCH_SIZE = 10;

/**
 * Sidebar widget for {@link GalaxyMapScene}. Owns its own layout so the host
 * scene can call `setSize()` on resize without rebuilding the world (the
 * previous teardown path).
 *
 * The widget renders relative to its container origin (top-left at 0,0) — the
 * host scene positions it via `setPosition`. `setSidebarData()` re-populates
 * the empire roster while keeping the panel chrome (background + headers) in
 * place; `setSize()` reflows everything in place against the new bounds.
 *
 * The setter is named `setSidebarData` (not `setData`) to avoid clashing with
 * Phaser's built-in `Container.setData(key, value)` from its DataManager.
 */
export class GalaxySidebarPanel extends Phaser.GameObjects.Container {
  private panelHeight: number;
  private currentData: GalaxySidebarData | null = null;

  private bg: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private statLabels: Phaser.GameObjects.Text[] = [];
  private empiresHeader: Phaser.GameObjects.Text;

  // Replaced wholesale by renderEmpireRows() — sized by data length and
  // height-clamped, so the count varies between calls.
  private empireRowObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, config: GalaxySidebarPanelConfig) {
    super(scene, config.x, config.y);
    this.panelHeight = config.height;

    const theme = getTheme();

    this.bg = scene.add
      .rectangle(0, 0, config.width, config.height, theme.colors.panelBg, 0.55)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.4)
      .setOrigin(0, 0);
    this.add(this.bg);

    this.titleText = scene.add.text(
      SWATCH_X,
      HEADER_OFFSET_Y,
      "Galaxy Overview",
      {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      },
    );
    this.add(this.titleText);

    // Stat label slots are kept fixed so setSidebarData() can call setText()
    // instead of recreating them on every state tick.
    for (let i = 0; i < 4; i++) {
      const t = scene.add.text(
        SWATCH_X,
        STATS_OFFSET_Y + i * STAT_LINE_HEIGHT,
        "",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        },
      );
      this.statLabels.push(t);
      this.add(t);
    }

    this.empiresHeader = scene.add.text(
      SWATCH_X,
      this.empiresHeaderY(),
      "EMPIRES",
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accent),
      },
    );
    this.add(this.empiresHeader);

    scene.add.existing(this);
  }

  override setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.panelHeight = height;
    this.bg.setSize(width, height);
    this.empiresHeader.setPosition(SWATCH_X, this.empiresHeaderY());
    // Re-flow the empire roster against the new height (per-row count is
    // height-clamped so resizing can show or hide rows).
    if (this.currentData) {
      this.renderEmpireRows(this.currentData);
    }
    return this;
  }

  /** Populate the panel with the latest galaxy state. */
  setSidebarData(data: GalaxySidebarData): this {
    this.currentData = data;
    const stats = [
      `Systems: ${data.systemCount}`,
      `Empires: ${data.empireCount}`,
      `Hyperlanes: ${data.hyperlaneCount}`,
      `Player Empire: ${data.playerEmpireName}`,
    ];
    for (let i = 0; i < this.statLabels.length; i++) {
      this.statLabels[i].setText(stats[i] ?? "");
    }
    this.renderEmpireRows(data);
    return this;
  }

  private empiresHeaderY(): number {
    return (
      STATS_OFFSET_Y +
      this.statLabels.length * STAT_LINE_HEIGHT +
      STATS_TO_EMPIRES_GAP
    );
  }

  private renderEmpireRows(data: GalaxySidebarData): void {
    for (const o of this.empireRowObjects) o.destroy();
    this.empireRowObjects = [];

    const theme = getTheme();
    const startY = this.empiresHeaderY() + EMPIRES_HEADER_TO_ROWS_GAP;
    const maxY = this.panelHeight - ROW_BOTTOM_PADDING;
    let cy = startY;

    for (const emp of data.empires) {
      if (cy > maxY) break;

      const swatch = this.scene.add
        .rectangle(SWATCH_X, cy + 6, SWATCH_SIZE, SWATCH_SIZE, emp.color)
        .setOrigin(0, 0.5);
      this.add(swatch);
      this.empireRowObjects.push(swatch);

      const lockSuffix = emp.accessible ? "" : " 🔒";
      const text = this.scene.add
        .text(
          ROW_LABEL_X,
          cy,
          `${emp.name}${lockSuffix}\n${emp.systemCount} systems · ${Math.round(emp.tariffRate * 100)}% tariff`,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(
              emp.accessible ? theme.colors.text : theme.colors.textDim,
            ),
          },
        )
        .setAlpha(emp.accessible ? 1 : 0.6);
      this.add(text);
      this.empireRowObjects.push(text);

      cy += EMPIRE_ROW_HEIGHT;
    }
  }
}
