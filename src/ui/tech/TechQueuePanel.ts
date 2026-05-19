import * as Phaser from "phaser";
import { TECH_GRAPH } from "../../data/constants.ts";
import { colorToString, getBranchColor, getTheme } from "@spacebiz/ui";
import { effectiveCost } from "../../game/tech/TechTree.ts";
import type { TechState } from "../../data/types.ts";

export interface TechQueuePanelConfig {
  x: number;
  y: number;
  width: number;
  visibleSlots?: number;
  onRemove: (index: number) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export interface TechQueuePanelState {
  queue: string[];
  researchPoints: number;
  purchaseCount: Record<string, number>;
}

export const SLOT_HEIGHT = 44;
export const SLOT_GAP = 6;
export const HEADER_HEIGHT = 22;

export class TechQueuePanel extends Phaser.GameObjects.Container {
  private cfg: TechQueuePanelConfig;
  private visibleSlots: number;
  private slotGroup!: Phaser.GameObjects.Container;
  private header!: Phaser.GameObjects.Text;
  private currentState: TechQueuePanelState | null = null;

  constructor(scene: Phaser.Scene, config: TechQueuePanelConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    this.visibleSlots = config.visibleSlots ?? 4;
    scene.add.existing(this);

    const theme = getTheme();
    this.header = scene.add.text(0, 0, "📋 Queue · 0 / 4", {
      fontSize: "10px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      fontStyle: "bold",
    });
    this.add(this.header);

    this.slotGroup = new Phaser.GameObjects.Container(scene, 0, HEADER_HEIGHT);
    scene.add.existing(this.slotGroup);
    this.add(this.slotGroup);
  }

  setQueueState(state: TechQueuePanelState): this {
    this.currentState = state;
    this.slotGroup.removeAll(true);
    this.header.setText(
      `📋 Queue · ${state.queue.length} / ${this.visibleSlots}`,
    );

    const theme = getTheme();
    const slotsToRender = Math.min(state.queue.length, this.visibleSlots);

    for (let i = 0; i < this.visibleSlots; i++) {
      const y = i * (SLOT_HEIGHT + SLOT_GAP);
      if (i < slotsToRender) {
        this.renderFilledSlot(i, state.queue[i], state, y, theme);
      } else {
        this.renderEmptySlot(i, y, theme);
      }
    }

    if (state.queue.length > this.visibleSlots) {
      const moreText = this.scene.add.text(
        0,
        this.visibleSlots * (SLOT_HEIGHT + SLOT_GAP),
        `+ ${state.queue.length - this.visibleSlots} more queued`,
        {
          fontSize: "9px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      this.slotGroup.add(moreText);
    }

    return this;
  }

  resize(width: number): this {
    this.cfg.width = width;
    if (this.currentState) this.setQueueState(this.currentState);
    return this;
  }

  getSlotCount(): number {
    return this.currentState?.queue.length ?? 0;
  }

  // Test helpers — exposed so unit tests don't need to simulate pointer events.
  triggerRemove(index: number): void {
    this.cfg.onRemove(index);
  }
  triggerReorder(fromIdx: number, toIdx: number): void {
    this.cfg.onReorder(fromIdx, toIdx);
  }

  getPanelHeight(): number {
    return HEADER_HEIGHT + this.visibleSlots * (SLOT_HEIGHT + SLOT_GAP) + 12;
  }

  private renderFilledSlot(
    index: number,
    techId: string,
    state: TechQueuePanelState,
    y: number,
    theme: ReturnType<typeof getTheme>,
  ): void {
    const tech = TECH_GRAPH.find((t) => t.id === techId);
    if (!tech) return;
    const isActive = index === 0;
    const cost = effectiveCost(techId, {
      purchaseCount: state.purchaseCount,
    } as TechState);
    const branchColor = getBranchColor(tech.branch);

    const bg = this.scene.add.graphics();
    bg.fillStyle(isActive ? 0x1f2c46 : 0x141c2e, 1);
    bg.fillRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);
    bg.lineStyle(1, isActive ? branchColor : 0x2c3a55, 1);
    bg.strokeRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);

    if (isActive && cost > 0) {
      const progress = Math.min(state.researchPoints / cost, 1);
      bg.fillStyle(branchColor, 0.35);
      bg.fillRect(0, y + SLOT_HEIGHT - 3, this.cfg.width * progress, 3);
    }

    const grip = this.scene.add
      .text(8, y + SLOT_HEIGHT / 2, "⋮⋮", {
        fontSize: "12px",
        fontFamily: theme.fonts.body.family,
        color: "#5c6c8a",
      })
      .setOrigin(0, 0.5);

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(branchColor, 0.18);
    iconBg.fillRoundedRect(22, y + 10, 24, 24, 5);
    iconBg.lineStyle(1, branchColor, 0.5);
    iconBg.strokeRoundedRect(22, y + 10, 24, 24, 5);

    const icon = this.scene.add
      .text(34, y + 22, tech.icon, {
        fontSize: "14px",
        fontFamily: theme.fonts.body.family,
      })
      .setOrigin(0.5, 0.5);

    const slotNum = this.scene.add.text(50, y + 8, `#${index + 1}`, {
      fontSize: "8px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
    });

    const name = this.scene.add.text(50, y + 18, tech.name, {
      fontSize: "11px",
      fontFamily: theme.fonts.body.family,
      color: "#ffffff",
      wordWrap: { width: this.cfg.width - 90 },
    });

    const costLabel = this.scene.add
      .text(this.cfg.width - 24, y + 12, `${cost} RP`, {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: isActive ? colorToString(branchColor) : "#6677aa",
      })
      .setOrigin(1, 0);

    const removeBtn = this.scene.add
      .text(this.cfg.width - 8, y + 4, "✕", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: "#aa4444",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    removeBtn.on("pointerover", () => removeBtn.setColor("#ff7777"));
    removeBtn.on("pointerout", () => removeBtn.setColor("#aa4444"));
    removeBtn.on("pointerup", () => this.cfg.onRemove(index));

    this.slotGroup.add([
      bg,
      grip,
      iconBg,
      icon,
      slotNum,
      name,
      costLabel,
      removeBtn,
    ]);

    if (index > 0) {
      const up = this.scene.add
        .text(this.cfg.width - 8, y + 20, "▲", {
          fontSize: "8px",
          fontFamily: theme.fonts.body.family,
          color: "#88a",
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      up.on("pointerup", () => this.cfg.onReorder(index, index - 1));
      this.slotGroup.add(up);
    }
    if (index < (this.currentState?.queue.length ?? 0) - 1) {
      const down = this.scene.add
        .text(this.cfg.width - 8, y + 30, "▼", {
          fontSize: "8px",
          fontFamily: theme.fonts.body.family,
          color: "#88a",
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      down.on("pointerup", () => this.cfg.onReorder(index, index + 1));
      this.slotGroup.add(down);
    }
  }

  private renderEmptySlot(
    _index: number,
    y: number,
    theme: ReturnType<typeof getTheme>,
  ): void {
    const bg = this.scene.add.graphics();
    bg.lineStyle(1, 0x2c3a55, 0.6);
    bg.strokeRoundedRect(0, y, this.cfg.width, SLOT_HEIGHT, 6);
    const label = this.scene.add
      .text(this.cfg.width / 2, y + SLOT_HEIGHT / 2, "+ Empty slot", {
        fontSize: "10px",
        fontFamily: theme.fonts.body.family,
        color: "#56678a",
      })
      .setOrigin(0.5, 0.5);
    this.slotGroup.add([bg, label]);
  }
}
