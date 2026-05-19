import * as Phaser from "phaser";
import { colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { MAX_COMMITMENTS } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";

export interface TechCommitmentBadgeConfig {
  x: number;
  y: number;
  width: number;
}

const BRANCH_LABELS: Record<string, string> = {
  logistics: "Logistics",
  engineering: "Engineering",
  intelligence: "Intelligence",
  crisis: "Crisis",
  diplomacy: "Diplomacy",
  fleet: "Fleet",
};

export class TechCommitmentBadge extends Phaser.GameObjects.Container {
  private badgeWidth: number;
  private bg!: Phaser.GameObjects.Graphics;
  private headerText!: Phaser.GameObjects.Text;
  private branchListText!: Phaser.GameObjects.Text;
  private currentState: TechState | null = null;
  private cardHeight = 38;

  constructor(scene: Phaser.Scene, config: TechCommitmentBadgeConfig) {
    super(scene, config.x, config.y);
    this.badgeWidth = config.width;
    scene.add.existing(this);

    const theme = getTheme();
    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.headerText = scene.add.text(8, 6, "Commitments  ·  0 / 3", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      fontStyle: "bold",
    });
    this.add(this.headerText);

    this.branchListText = scene.add.text(8, 20, "", {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.text),
    });
    this.add(this.branchListText);

    this.redrawBg();
  }

  setBadgeState(tech: TechState): this {
    this.currentState = tech;
    const n = tech.committedBranches.length;
    this.headerText.setText(`Commitments  ·  ${n} / ${MAX_COMMITMENTS}`);
    const labels = this.getCommittedBranchLabels();
    if (labels.length === 0) {
      this.branchListText.setText("— none yet —");
      this.branchListText.setColor(colorToString(getTheme().colors.textDim));
    } else {
      this.branchListText.setText(labels.join(" · "));
      // Tint by first committed branch for visual flavour
      this.branchListText.setColor(
        colorToString(getBranchColor(tech.committedBranches[0])),
      );
    }
    return this;
  }

  getDisplayText(): string {
    return this.headerText.text;
  }

  getCommittedBranchLabels(): string[] {
    if (!this.currentState) return [];
    return this.currentState.committedBranches.map(
      (b) => BRANCH_LABELS[b] ?? b,
    );
  }

  resize(width: number): this {
    this.badgeWidth = width;
    this.redrawBg();
    return this;
  }

  getBadgeHeight(): number {
    return this.cardHeight;
  }

  private redrawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(0x121a2c, 0.95);
    this.bg.fillRoundedRect(0, 0, this.badgeWidth, this.cardHeight, 6);
    this.bg.lineStyle(1, 0x2c3a55, 1);
    this.bg.strokeRoundedRect(0, 0, this.badgeWidth, this.cardHeight, 6);
  }
}
