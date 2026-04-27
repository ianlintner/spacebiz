import * as Phaser from "phaser";
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
import type {
  Planet,
  Ship,
  StarSystem,
  GameEvent,
  AICompany,
  Empire,
} from "../data/types.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import { getPlanetPortraitTextureKey } from "../data/planetPortraits.ts";
import { getPortraitTextureKey } from "../data/portraits.ts";
import { getLeaderTextureKey } from "../data/empireLeaderPortraits.ts";
import { portraitLoader } from "../game/PortraitLoader.ts";
import { applyClippingMask } from "@spacebiz/ui";

function fitImageContain(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number,
): void {
  const srcW = Math.max(1, image.width);
  const srcH = Math.max(1, image.height);
  const scale = Math.min(maxWidth / srcW, maxHeight / srcH);
  image.setDisplaySize(srcW * scale, srcH * scale);
}

export interface PortraitPanelConfig {
  x: number;
  y: number;
  width?: number; // default SIDEBAR_WIDTH
  height?: number; // default CONTENT_HEIGHT
}

export class PortraitPanel extends Phaser.GameObjects.Container {
  private panel: Panel;
  private portraitGraphics: Phaser.GameObjects.Graphics;
  private portraitMaskShape!: Phaser.GameObjects.Graphics;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private nameLabel: Label;
  private statLabels: Label[];
  private portraitWidth: number;
  private portraitHeight: number;
  private panelWidth: number;
  private panelHeight: number;
  private statRowSpacing: number;

  // Portrait image area + name/stats area share the panel height. Ratio is
  // tuned so a 9-stat list (RoutesScene route opportunity) still fits at the
  // smallest sidebar height (~454px when a 158px minimap is reserved).

  constructor(scene: Phaser.Scene, config: PortraitPanelConfig) {
    super(scene, config.x, config.y);

    const theme = getTheme();
    const L = getLayout();
    this.panelWidth = config.width ?? L.sidebarWidth;
    const panelHeight = config.height ?? L.contentHeight;

    this.portraitWidth = this.panelWidth - theme.spacing.sm * 2;
    this.portraitHeight = Math.floor(panelHeight * 0.5);
    this.panelHeight = panelHeight;
    this.statRowSpacing = 20;
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

    // Graphics object for portrait area (procedural fallback)
    this.portraitGraphics = scene.add.graphics();
    this.portraitGraphics.setPosition(theme.spacing.sm, theme.spacing.sm);
    this.add(this.portraitGraphics);

    // Image object for loaded planet portrait textures
    // Created on demand in updatePortrait when a loaded texture is available
    this.portraitImage = null;

    // Geometry mask to clip portrait within panel bounds. Uses applyClippingMask
    // so the legacy Phaser 3 setMask path is reachable when the filters API
    // isn't available (the optional chain alone silently no-ops).
    this.portraitMaskShape = scene.make.graphics({});
    this.portraitMaskShape.fillStyle(0xffffff, 1);
    this.portraitMaskShape.fillRect(
      config.x + theme.spacing.sm,
      config.y + theme.spacing.sm,
      this.portraitWidth,
      this.portraitHeight,
    );
    applyClippingMask(this.portraitGraphics, this.portraitMaskShape);

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

    // Clip all content (stats, name, portrait) to panel bounds. Without this
    // (working) clip mask, long stat lists overflow the panel into the minimap
    // below. Falls back to Phaser 3 setMask when filters isn't available.
    const clipShape = scene.make.graphics({});
    clipShape.fillStyle(0xffffff, 1);
    clipShape.fillRect(config.x, config.y, this.panelWidth, panelHeight);
    applyClippingMask(this, clipShape);

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

    // Try loaded texture first (AI ship portrait, CEO portrait, or planet portrait)
    let usedImage = false;
    const explicitTexKey = data?.textureKey;
    const planetTexKey =
      type === "planet" && data?.planetType
        ? getPlanetPortraitTextureKey(data.planetType)
        : undefined;
    const shipPortraitKey =
      type === "ship" && data?.shipClass
        ? `ship-portrait-${data.shipClass}`
        : undefined;
    const texKey = explicitTexKey ?? planetTexKey ?? shipPortraitKey;
    if (texKey && this.scene.textures.exists(texKey)) {
      this.portraitGraphics.clear();
      this.portraitGraphics.setVisible(false);
      if (!this.portraitImage) {
        this.portraitImage = this.scene.add.image(
          theme.spacing.sm + this.portraitWidth / 2,
          theme.spacing.sm + this.portraitHeight / 2,
          texKey,
        );
        applyClippingMask(this.portraitImage, this.portraitMaskShape);
        this.add(this.portraitImage);
      } else {
        this.portraitImage.setTexture(texKey);
      }
      this.portraitImage.setPosition(
        theme.spacing.sm + this.portraitWidth / 2,
        theme.spacing.sm + this.portraitHeight / 2,
      );
      fitImageContain(
        this.portraitImage,
        this.portraitWidth,
        this.portraitHeight,
      );
      this.portraitImage.setVisible(true);
      usedImage = true;
    }

    if (!usedImage) {
      // Fall back to procedural portrait drawing
      if (this.portraitImage) {
        this.portraitImage.setVisible(false);
      }
      this.portraitGraphics.setVisible(true);
      this.portraitGraphics.clear();
      drawPortrait(
        this.portraitGraphics,
        type,
        this.portraitWidth,
        this.portraitHeight,
        seed,
        data,
      );
    }

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

  /** Convenience: show an AI company CEO portrait with company stats. */
  showCEO(
    company: AICompany,
    stats: Array<{ label: string; value: string }>,
  ): void {
    const texKey = getPortraitTextureKey(company.ceoPortrait.portraitId);
    this.updatePortrait(
      "company",
      hashString(company.id),
      company.ceoName,
      stats,
      { textureKey: texKey },
    );
    // If texture not yet loaded, fetch and refresh
    if (!this.scene.textures.exists(texKey)) {
      portraitLoader
        .ensureCeoPortrait(this.scene, company.ceoPortrait.portraitId)
        .then((key) => {
          // Refresh portrait with loaded texture
          this.updatePortrait(
            "company",
            hashString(company.id),
            company.ceoName,
            stats,
            { textureKey: key },
          );
        })
        .catch(() => {
          /* keep procedural fallback */
        });
    }
  }

  /** Convenience: show an empire leader portrait with empire stats. */
  showEmpireLeader(
    empire: Empire,
    stats: Array<{ label: string; value: string }>,
  ): void {
    const texKey = getLeaderTextureKey(empire.leaderPortrait.portraitId);
    this.updatePortrait(
      "empire",
      hashString(empire.id),
      empire.leaderName,
      stats,
      { textureKey: texKey },
    );
    // If texture not yet loaded, fetch and refresh
    if (!this.scene.textures.exists(texKey)) {
      portraitLoader
        .ensureLeaderPortrait(this.scene, empire.leaderPortrait.portraitId)
        .then((key) => {
          this.updatePortrait(
            "empire",
            hashString(empire.id),
            empire.leaderName,
            stats,
            { textureKey: key },
          );
        })
        .catch(() => {
          /* keep procedural fallback */
        });
    }
  }

  /** Clear all portrait visuals. */
  clear(): void {
    this.portraitGraphics.clear();
    if (this.portraitImage) {
      this.portraitImage.setVisible(false);
    }
    this.nameLabel.setText("");
    this.clearStatRows();
  }

  private createStatRows(stats: Array<{ label: string; value: string }>): void {
    const theme = getTheme();
    const nameLabelBottom =
      theme.spacing.sm +
      this.portraitHeight +
      theme.spacing.md +
      this.nameLabel.height;
    const startY = nameLabelBottom + theme.spacing.sm;
    const rowSpacing = this.statRowSpacing;
    const leftX = theme.spacing.md;
    const rightX = this.panelWidth - theme.spacing.md;
    // Cap how many rows we draw so stats can't extend past the panel into
    // whatever sits below it (e.g. the routes-screen minimap). The clipping
    // mask is the visual safety net; this is the layout-time guard.
    const maxRowsByHeight = Math.max(
      0,
      Math.floor((this.panelHeight - startY - theme.spacing.sm) / rowSpacing),
    );
    const visibleStats = stats.slice(
      0,
      Math.min(stats.length, maxRowsByHeight),
    );

    for (let i = 0; i < visibleStats.length; i++) {
      const stat = visibleStats[i];
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
