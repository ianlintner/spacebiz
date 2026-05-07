import * as Phaser from "phaser";
import { TECH_GRAPH } from "../data/constants.ts";
import { getTheme, colorToString } from "@spacebiz/ui";
import { effectiveCost } from "../game/tech/TechTree.ts";
import type { TechState } from "../data/types.ts";

export interface TechQueueRowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  onRemove: (index: number) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export interface TechQueueRowState {
  queue: string[];
  researchPoints: number;
  purchaseCount: Record<string, number>;
}

const TILE_SIZE = 52;
const TILE_GAP = 6;

export class TechQueueRow extends Phaser.GameObjects.Container {
  private config: TechQueueRowConfig;
  private contentGroup: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: TechQueueRowConfig) {
    super(scene, config.x, config.y);
    this.config = config;
    scene.add.existing(this);

    this.contentGroup = new Phaser.GameObjects.Container(scene, 0, 0);
    scene.add.existing(this.contentGroup);
    this.add(this.contentGroup);
  }

  setQueueState(state: TechQueueRowState): this {
    // Destroy previous content
    this.contentGroup.removeAll(true);

    const theme = getTheme();

    if (state.queue.length === 0) {
      const emptyText = this.scene.add
        .text(
          this.config.width / 2,
          this.config.height / 2,
          "No research queued — select a technology to begin",
          {
            fontSize: "12px",
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(0.5, 0.5);
      this.contentGroup.add(emptyText);
      return this;
    }

    state.queue.forEach((techId, index) => {
      const tech = TECH_GRAPH.find((n) => n.id === techId);
      if (!tech) return;

      const tileX = index * (TILE_SIZE + TILE_GAP);
      const isActive = index === 0;
      const cost = effectiveCost(techId, {
        purchaseCount: state.purchaseCount,
      } as TechState);
      const progress =
        isActive && cost > 0 ? Math.min(state.researchPoints / cost, 1) : 0;

      // Tile background
      const bg = this.scene.add.graphics();
      bg.fillStyle(isActive ? 0x334466 : 0x222233, 0.9);
      bg.fillRoundedRect(tileX, 0, TILE_SIZE, TILE_SIZE, 6);
      bg.lineStyle(1, isActive ? 0x6688cc : 0x445566, 1);
      bg.strokeRoundedRect(tileX, 0, TILE_SIZE, TILE_SIZE, 6);

      // Progress bar (first tile only)
      if (isActive && progress > 0) {
        bg.fillStyle(0x4488ff, 0.5);
        bg.fillRect(tileX, TILE_SIZE - 4, TILE_SIZE * progress, 4);
      }

      // Icon
      const icon = this.scene.add
        .text(tileX + TILE_SIZE / 2, 14, tech.icon, {
          fontSize: "16px",
          fontFamily: theme.fonts.body.family,
        })
        .setOrigin(0.5, 0.5);

      // Name (truncated)
      const shortName =
        tech.name.length > 9 ? tech.name.slice(0, 8) + "…" : tech.name;
      const nameText = this.scene.add
        .text(tileX + TILE_SIZE / 2, 30, shortName, {
          fontSize: "7px",
          fontFamily: theme.fonts.body.family,
          color: "#ccccdd",
        })
        .setOrigin(0.5, 0);

      // Cost badge
      const costText = this.scene.add
        .text(tileX + TILE_SIZE - 2, TILE_SIZE - 2, `${cost}RP`, {
          fontSize: "7px",
          fontFamily: theme.fonts.body.family,
          color: isActive ? "#88aaff" : "#6677aa",
        })
        .setOrigin(1, 1);

      // Remove button (✕)
      const removeBtn = this.scene.add
        .text(tileX + TILE_SIZE - 2, 2, "✕", {
          fontSize: "9px",
          fontFamily: theme.fonts.body.family,
          color: "#aa4444",
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.config.onRemove(index));

      this.contentGroup.add([bg, icon, nameText, costText, removeBtn]);

      // Reorder buttons (if multiple items)
      if (state.queue.length > 1) {
        if (index > 0) {
          const leftBtn = this.scene.add
            .text(tileX + 2, TILE_SIZE / 2, "◀", {
              fontSize: "8px",
              fontFamily: theme.fonts.body.family,
              color: "#8888aa",
            })
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerup", () => this.config.onReorder(index, index - 1));
          this.contentGroup.add(leftBtn);
        }
        if (index < state.queue.length - 1) {
          const rightBtn = this.scene.add
            .text(tileX + TILE_SIZE - 2, TILE_SIZE / 2, "▶", {
              fontSize: "8px",
              fontFamily: theme.fonts.body.family,
              color: "#8888aa",
            })
            .setOrigin(1, 0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerup", () => this.config.onReorder(index, index + 1));
          this.contentGroup.add(rightBtn);
        }
      }
    });

    return this;
  }
}
