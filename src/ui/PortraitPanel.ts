import Phaser from "phaser";
import { Panel } from "./Panel.ts";
import { Label } from "./Label.ts";
import { getTheme } from "./Theme.ts";
import { drawPortrait } from "./PortraitGenerator.ts";
import type {
  PortraitType,
  PortraitData,
  AlienRole,
} from "./PortraitGenerator.ts";
import { getLayout } from "./Layout.ts";
import type { Planet, Ship, StarSystem, GameEvent } from "../data/types.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";

export interface PortraitPanelConfig {
  x: number;
  y: number;
  width?: number; // default SIDEBAR_WIDTH
  height?: number; // default CONTENT_HEIGHT
}

export class PortraitPanel extends Phaser.GameObjects.Container {
  private panel: Panel;
  private portraitGraphics: Phaser.GameObjects.Graphics;
  private nameLabel: Label;
  private statLabels: Label[];
  private portraitWidth: number;
  private portraitHeight: number;
  private panelWidth: number;

  // portrait area = top 55% of content area
  // name + stats = bottom 45%

  constructor(scene: Phaser.Scene, config: PortraitPanelConfig) {
    super(scene, config.x, config.y);

    const theme = getTheme();
    const L = getLayout();
    this.panelWidth = config.width ?? L.sidebarWidth;
    const panelHeight = config.height ?? L.contentHeight;

    this.portraitWidth = this.panelWidth - theme.spacing.sm * 2;
    this.portraitHeight = Math.floor(panelHeight * 0.55);
    this.statLabels = [];

    // Glass-styled panel background
    this.panel = new Panel(scene, {
      x: 0,
      y: 0,
      width: this.panelWidth,
      height: panelHeight,
    });
    // Panel adds itself to the scene display list; re-parent into this container
    scene.children.remove(this.panel);
    this.add(this.panel);

    // Graphics object for portrait area
    this.portraitGraphics = scene.add.graphics();
    this.portraitGraphics.setPosition(theme.spacing.sm, theme.spacing.sm);
    this.add(this.portraitGraphics);

    // Geometry mask to clip portrait within panel bounds
    const maskShape = scene.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(
      config.x + theme.spacing.sm,
      config.y + theme.spacing.sm,
      this.portraitWidth,
      this.portraitHeight,
    );
    const mask = new Phaser.Display.Masks.GeometryMask(scene, maskShape);
    this.portraitGraphics.setMask(mask);

    // Name label — below portrait area, centered, heading + accent
    const nameLabelY =
      theme.spacing.sm + this.portraitHeight + theme.spacing.md;
    this.nameLabel = new Label(scene, {
      x: this.panelWidth / 2,
      y: nameLabelY,
      text: "",
      style: "heading",
      color: theme.colors.accent,
      maxWidth: this.panelWidth - theme.spacing.md * 2,
    });
    this.nameLabel.setOrigin(0.5, 0);
    // Re-parent label into this container
    scene.children.remove(this.nameLabel);
    this.add(this.nameLabel);

    // Clip all content (stats, name, portrait) to panel bounds
    const clipShape = scene.make.graphics({});
    clipShape.fillStyle(0xffffff, 1);
    clipShape.fillRect(config.x, config.y, this.panelWidth, panelHeight);
    this.setMask(clipShape.createGeometryMask());

    scene.add.existing(this);
  }

  /** Update the portrait display with new data. */
  updatePortrait(
    type: PortraitType,
    seed: number,
    name: string,
    stats: Array<{ label: string; value: string }>,
    data?: PortraitData,
  ): void {
    const theme = getTheme();

    // Clear and redraw portrait
    this.portraitGraphics.clear();
    drawPortrait(
      this.portraitGraphics,
      type,
      this.portraitWidth,
      this.portraitHeight,
      seed,
      data,
    );

    // Update name
    this.nameLabel.setText(name);
    this.nameLabel.setLabelColor(theme.colors.accent);

    // Clear old stat rows
    this.clearStatRows();

    // Create new stat rows
    this.createStatRows(stats);
  }

  /** Convenience: show a planet portrait with relevant stats. */
  showPlanet(planet: Planet, seed?: number): void {
    const s = seed ?? hashString(planet.id);
    this.updatePortrait(
      "planet",
      s,
      planet.name,
      [
        { label: "Type", value: planet.type },
        { label: "Population", value: formatNumber(planet.population) },
      ],
      { planetType: planet.type },
    );
  }

  /** Convenience: show a ship portrait with relevant stats. */
  showShip(ship: Ship): void {
    const template = SHIP_TEMPLATES[ship.class];
    this.updatePortrait(
      "ship",
      hashString(ship.id),
      ship.name,
      [
        { label: "Class", value: template.name },
        { label: "Cargo", value: String(ship.cargoCapacity) },
        { label: "Speed", value: String(ship.speed) },
        { label: "Condition", value: `${ship.condition}%` },
      ],
      { shipClass: ship.class },
    );
  }

  /** Convenience: show a star system portrait. */
  showSystem(system: StarSystem, planetCount: number): void {
    this.updatePortrait(
      "system",
      hashString(system.id),
      system.name,
      [{ label: "Planets", value: String(planetCount) }],
      { starColor: system.starColor, planetCount },
    );
  }

  /** Convenience: show an event portrait. */
  showEvent(event: GameEvent): void {
    this.updatePortrait(
      "event",
      hashString(event.id),
      event.name,
      [
        { label: "Category", value: event.category },
        { label: "Duration", value: `${event.duration} turns` },
      ],
      { eventCategory: event.category },
    );
  }

  /** Convenience: show an alien portrait for future contact/advisor UI. */
  showAlien(
    name: string,
    role: AlienRole,
    stats: Array<{ label: string; value: string }> = [],
    seed = hashString(`${role}:${name}`),
  ): void {
    this.updatePortrait("alien", seed, name, stats, { alienRole: role });
  }

  /** Clear all portrait visuals. */
  clear(): void {
    this.portraitGraphics.clear();
    this.nameLabel.setText("");
    this.clearStatRows();
  }

  private createStatRows(stats: Array<{ label: string; value: string }>): void {
    const theme = getTheme();
    const startY =
      theme.spacing.sm +
      this.portraitHeight +
      theme.spacing.md +
      theme.fonts.heading.size +
      theme.spacing.md;
    const rowSpacing = 24;
    const leftX = theme.spacing.md;
    const rightX = this.panelWidth - theme.spacing.md;

    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const rowY = startY + i * rowSpacing;

      // Label (left-aligned, caption style, textDim)
      const labelObj = new Label(this.scene, {
        x: leftX,
        y: rowY,
        text: stat.label,
        style: "caption",
        color: theme.colors.textDim,
      });
      this.scene.children.remove(labelObj);
      this.add(labelObj);
      this.statLabels.push(labelObj);

      // Value (right-aligned, caption style, text/accent color)
      const valueObj = new Label(this.scene, {
        x: rightX,
        y: rowY,
        text: stat.value,
        style: "caption",
        color: theme.colors.text,
      });
      valueObj.setOrigin(1, 0);
      this.scene.children.remove(valueObj);
      this.add(valueObj);
      this.statLabels.push(valueObj);
    }
  }

  private clearStatRows(): void {
    for (const label of this.statLabels) {
      label.destroy();
    }
    this.statLabels = [];
  }
}

/** Simple string hash for deterministic seeds. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

/** Format large numbers with K/M suffixes. */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
