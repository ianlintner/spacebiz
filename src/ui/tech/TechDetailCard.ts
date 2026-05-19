import * as Phaser from "phaser";
import { Button, colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";
import { effectiveCost, isTechAvailable } from "../../game/tech/TechTree.ts";

export interface TechDetailCardConfig {
  x: number;
  y: number;
  width: number;
  onAction: (techId: string) => void;
}

export class TechDetailCard extends Phaser.GameObjects.Container {
  private cardWidth: number;
  private cardHeight = 168;
  private bg!: Phaser.GameObjects.Graphics;
  private placeholder!: Phaser.GameObjects.Text;
  private icon!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private branchChip!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private prereqText!: Phaser.GameObjects.Text;
  private button!: Button;
  private selectedTechId: string | null = null;
  private onAction: (techId: string) => void;

  constructor(scene: Phaser.Scene, config: TechDetailCardConfig) {
    super(scene, config.x, config.y);
    this.cardWidth = config.width;
    this.onAction = config.onAction;
    scene.add.existing(this);

    const theme = getTheme();

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.placeholder = scene.add
      .text(
        this.cardWidth / 2,
        this.cardHeight / 2,
        "Select a tech on the graph to see details",
        {
          fontSize: "11px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
          align: "center",
          wordWrap: { width: this.cardWidth - 20 },
        },
      )
      .setOrigin(0.5, 0.5);
    this.add(this.placeholder);

    this.icon = scene.add
      .text(20, 18, "", {
        fontSize: "22px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.icon);

    this.nameText = scene.add
      .text(38, 8, "", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setVisible(false);
    this.add(this.nameText);

    this.branchChip = scene.add
      .text(38, 26, "", {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: "#ffffff",
        padding: { left: 4, right: 4, top: 1, bottom: 1 },
      })
      .setVisible(false);
    this.add(this.branchChip);

    this.statusText = scene.add
      .text(this.cardWidth - 10, 12, "", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(1, 0)
      .setVisible(false);
    this.add(this.statusText);

    this.descText = scene.add
      .text(10, 50, "", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: this.cardWidth - 20 },
      })
      .setVisible(false);
    this.add(this.descText);

    this.costText = scene.add
      .text(10, 100, "", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: "#fcd96f",
      })
      .setVisible(false);
    this.add(this.costText);

    this.prereqText = scene.add
      .text(10, 118, "", {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
        wordWrap: { width: this.cardWidth - 20 },
      })
      .setVisible(false);
    this.add(this.prereqText);

    this.button = new Button(scene, {
      x: this.cardWidth / 2,
      y: this.cardHeight - 18,
      width: this.cardWidth - 20,
      label: "Unlock",
      disabled: true,
      onClick: () => {
        if (this.selectedTechId) this.onAction(this.selectedTechId);
      },
    });
    this.add(this.button);
    this.button.setVisible(false);

    this.redrawBg();
  }

  setSelection(techId: string | null, tech: TechState): this {
    this.selectedTechId = techId;
    const node = techId ? TECH_GRAPH.find((n) => n.id === techId) : null;
    if (!node) {
      this.placeholder.setVisible(true);
      this.icon.setVisible(false);
      this.nameText.setVisible(false);
      this.branchChip.setVisible(false);
      this.statusText.setVisible(false);
      this.descText.setVisible(false);
      this.costText.setVisible(false);
      this.prereqText.setVisible(false);
      this.button.setVisible(false);
      return this;
    }

    this.placeholder.setVisible(false);

    const branchColor = getBranchColor(node.branch);
    const isCompleted =
      (tech.purchaseCount[node.id] ?? 0) >= 1 && !node.repeatable;
    const isResearching = tech.queue[0] === node.id;
    const isQueued = tech.queue.includes(node.id);
    const available = isTechAvailable(node.id, tech);
    const cost = effectiveCost(node.id, tech);
    const canAfford = tech.researchPoints >= cost;

    let statusLabel: string;
    let statusColor: number;
    if (isCompleted) {
      statusLabel = "✓ Completed";
      statusColor = 0x9cffb0;
    } else if (isResearching) {
      statusLabel = "⚙ Researching";
      statusColor = 0xfcd96f;
    } else if (isQueued) {
      statusLabel = "📋 In Queue";
      statusColor = 0xffaa66;
    } else if (available) {
      statusLabel = canAfford ? "★ Available" : "★ Available (unaffordable)";
      statusColor = canAfford ? branchColor : 0x8888aa;
    } else {
      statusLabel = "🔒 Locked";
      statusColor = 0x777788;
    }

    this.icon.setText(node.icon).setVisible(true);
    this.nameText.setText(node.name).setVisible(true);
    this.branchChip
      .setText(` ${branchLabel(node.branch)} · T${node.tier} `)
      .setBackgroundColor(colorToString(branchColor))
      .setVisible(true);
    this.statusText
      .setText(statusLabel)
      .setColor(colorToString(statusColor))
      .setVisible(true);
    this.descText.setText(node.description).setVisible(true);

    const ownedSuffix = node.repeatable
      ? ` · Owned ×${tech.purchaseCount[node.id] ?? 0}`
      : "";
    this.costText.setText(`Cost: ${cost} RP${ownedSuffix}`).setVisible(true);

    if (!available && !isCompleted && !isQueued) {
      const neighborNames = node.edges
        .map((id) => TECH_GRAPH.find((n) => n.id === id)?.name)
        .filter((n): n is string => !!n)
        .slice(0, 2);
      this.prereqText
        .setText(
          neighborNames.length ? `Requires: ${neighborNames.join(" or ")}` : "",
        )
        .setVisible(neighborNames.length > 0);
    } else {
      this.prereqText.setVisible(false);
    }

    // Button state
    let label = "Select a technology";
    let disabled = true;
    if (isCompleted) {
      label = "Maxed out";
    } else if (isResearching) {
      label = "Already researching";
    } else if (isQueued) {
      label = `In queue · #${tech.queue.indexOf(node.id) + 1}`;
    } else if (!available) {
      label = "Locked — research a prerequisite";
    } else if (canAfford) {
      label = `Unlock — ${cost} RP`;
      disabled = false;
    } else {
      label = `Queue — ${cost} RP`;
      disabled = false;
    }
    this.button.setLabel(label);
    this.button.setDisabled(disabled);
    this.button.setVisible(true);

    return this;
  }

  resize(width: number): this {
    this.cardWidth = width;
    this.placeholder.setPosition(width / 2, this.cardHeight / 2);
    this.placeholder.setWordWrapWidth(width - 20);
    this.descText.setWordWrapWidth(width - 20);
    this.prereqText.setWordWrapWidth(width - 20);
    this.statusText.setX(width - 10);
    this.button.setPosition(width / 2, this.cardHeight - 18);
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
