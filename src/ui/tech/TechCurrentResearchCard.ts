import * as Phaser from "phaser";
import { getTheme, colorToString, getBranchColor } from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import { effectiveCost, calculateRPPerTurn } from "../../game/tech/TechTree.ts";
import type { GameState } from "../../data/types.ts";

export interface TechCurrentResearchCardConfig {
  x: number;
  y: number;
  width: number;
}

export class TechCurrentResearchCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private bg!: Phaser.GameObjects.Graphics;
  private iconText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private progressTrack!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private metaText!: Phaser.GameObjects.Text;
  private emptyText!: Phaser.GameObjects.Text;
  private cardHeight = 92;

  constructor(scene: Phaser.Scene, config: TechCurrentResearchCardConfig) {
    super(scene, config.x, config.y);
    this.cardWidth = config.width;
    scene.add.existing(this);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    const theme = getTheme();
    this.iconText = scene.add
      .text(20, 20, "", {
        fontSize: "22px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5);
    this.add(this.iconText);

    this.nameText = scene.add.text(38, 10, "", {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.add(this.nameText);

    this.subText = scene.add.text(38, 26, "", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.subText);

    this.progressTrack = scene.add
      .rectangle(10, 58, this.cardWidth - 20, 6, 0x1e2a40, 1)
      .setOrigin(0, 0.5);
    this.add(this.progressTrack);

    this.progressFill = scene.add
      .rectangle(10, 58, 0, 6, 0x6ccfff, 1)
      .setOrigin(0, 0.5);
    this.add(this.progressFill);

    this.metaText = scene.add.text(10, 68, "", {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.metaText);

    this.emptyText = scene.add.text(10, 30, "", {
      fontSize: "11px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });
    this.add(this.emptyText);

    this.redrawBg();
  }

  setCardState(state: GameState): this {
    const tech = state.tech;
    const headId = tech.queue[0] ?? null;
    const node = headId ? TECH_GRAPH.find((n) => n.id === headId) : null;
    const theme = getTheme();

    if (!node) {
      this.iconText.setVisible(false);
      this.nameText.setVisible(false);
      this.subText.setVisible(false);
      this.progressTrack.setVisible(false);
      this.progressFill.setVisible(false);
      this.metaText.setVisible(false);
      this.emptyText
        .setText("⚙ No research queued — select a tech to begin")
        .setVisible(true);
      return this;
    }

    this.emptyText.setVisible(false);
    this.iconText.setText(node.icon).setVisible(true);
    this.nameText.setText(node.name).setVisible(true);
    this.subText
      .setText(`${branchLabel(node.branch)} · Tier ${node.tier}`)
      .setColor(colorToString(getBranchColor(node.branch)))
      .setVisible(true);

    const cost = effectiveCost(node.id, tech);
    const rpPerTurn = calculateRPPerTurn(state);
    const progress = cost > 0 ? Math.min(tech.researchPoints / cost, 1) : 0;
    const turnsLeft =
      rpPerTurn > 0
        ? Math.ceil((cost - tech.researchPoints) / rpPerTurn)
        : Infinity;

    this.progressTrack.setVisible(true);
    this.progressFill
      .setVisible(true)
      .setSize((this.cardWidth - 20) * progress, 6);

    this.metaText
      .setText(
        `${tech.researchPoints} / ${cost} RP · +${rpPerTurn} RP/turn · ~${
          isFinite(turnsLeft) ? Math.max(0, turnsLeft) : "—"
        } turns`,
      )
      .setColor(colorToString(theme.colors.textDim))
      .setVisible(true);

    return this;
  }

  resize(width: number): this {
    this.cardWidth = width;
    this.progressTrack.setSize(width - 20, 6);
    this.redrawBg();
    return this;
  }

  private redrawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x121a2c, 0.95);
    this.bg.fillRoundedRect(0, 0, this.cardWidth, this.cardHeight, 8);
    this.bg.lineStyle(1, 0x2c3a55, 1);
    this.bg.strokeRoundedRect(0, 0, this.cardWidth, this.cardHeight, 8);
  }

  getCardHeight(): number {
    return this.cardHeight;
  }
}

function branchLabel(branchId: string): string {
  return branchId.charAt(0).toUpperCase() + branchId.slice(1);
}
