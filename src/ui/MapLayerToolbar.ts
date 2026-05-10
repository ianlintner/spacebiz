import * as Phaser from "phaser";
import { getLayout, getTheme, colorToString } from "@spacebiz/ui";
import type { LayoutMetrics } from "@spacebiz/ui";
import { mapLayerController } from "../game/map/MapLayerController.ts";
import {
  LAYER_GROUPS,
  GROUP_LABELS,
  GROUP_ICON_INDICES,
} from "../game/map/MapLayerRegistry.ts";
import type { LayerGroup, LayerId } from "../game/map/MapLayerRegistry.ts";

const BTN_SIZE = 40;
const BTN_GAP = 4;
const TOOLBAR_TOP_OFFSET = 70;
const DRAWER_WIDTH = 200;
const DRAWER_ROW_HEIGHT = 36;
const DRAWER_PADDING = 8;
const ICON_SIZE = 24;
const DRAWER_ICON_SIZE = 28;
const BTN_DEPTH = 9000;
const DRAWER_DEPTH = 9100;
const TOOLTIP_DEPTH = 9500;

interface GroupBtn {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  hit: Phaser.GameObjects.Zone;
  group: LayerGroup;
}

export class MapLayerToolbar {
  private readonly scene: Phaser.Scene;
  private buttons: GroupBtn[] = [];
  private drawer: Phaser.GameObjects.Container | null = null;
  private openGroup: LayerGroup | null = null;
  private escKey: Phaser.Input.Keyboard.Key | null = null;
  private readonly onChangeListener: () => void;
  private readonly onPointerdown: (ptr: Phaser.Input.Pointer) => void;

  private rightEdge = 0;
  private topY = 0;
  private tooltip: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.onChangeListener = () => this.refreshButtons();
    this.onPointerdown = (ptr) => this.handleScenePointerdown(ptr);
    mapLayerController.on("change", this.onChangeListener);
    this.scene.input.on("pointerdown", this.onPointerdown);
    this.build();
  }

  reposition(L: LayoutMetrics): void {
    this.rightEdge = L.mainContentLeft + L.mainContentWidth - 4;
    this.topY = L.contentTop + TOOLBAR_TOP_OFFSET;
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const btnX = this.rightEdge - BTN_SIZE;
      const btnY = this.topY + i * (BTN_SIZE + BTN_GAP);
      btn.bg.setPosition(btnX, btnY);
      btn.icon.setPosition(btnX + BTN_SIZE / 2, btnY + BTN_SIZE / 2);
      btn.hit.setPosition(btnX, btnY);
    }
    if (this.openGroup !== null) this.closeDrawer();
  }

  destroy(): void {
    mapLayerController.off("change", this.onChangeListener);
    this.scene.input.off("pointerdown", this.onPointerdown);
    for (const btn of this.buttons) {
      btn.bg.destroy();
      btn.icon.destroy();
      btn.hit.destroy();
    }
    this.buttons = [];
    this.drawer?.destroy();
    this.drawer = null;
    this.tooltip?.destroy();
    this.tooltip = null;
    this.escKey?.destroy();
    this.escKey = null;
  }

  setVisible(visible: boolean): void {
    if (!visible) {
      this.closeDrawer();
      this.hideTooltip();
    }
    for (const btn of this.buttons) {
      btn.bg.setVisible(visible);
      btn.icon.setVisible(visible);
      btn.hit.setVisible(visible);
    }
  }

  private showTooltip(text: string, x: number, y: number): void {
    const theme = getTheme();
    if (!this.tooltip) {
      this.tooltip = this.scene.add
        .text(x, y, text, {
          fontSize: "11px",
          fontFamily: "monospace",
          color: colorToString(theme.colors.text),
          backgroundColor: colorToString(theme.colors.panelBg),
          padding: { x: 6, y: 3 },
        })
        .setDepth(TOOLTIP_DEPTH)
        .setOrigin(1, 0.5);
    } else {
      this.tooltip.setText(text).setPosition(x, y).setVisible(true);
    }
  }

  private hideTooltip(): void {
    this.tooltip?.setVisible(false);
  }

  private build(): void {
    const L = getLayout();
    this.rightEdge = L.mainContentLeft + L.mainContentWidth - 4;
    this.topY = L.contentTop + TOOLBAR_TOP_OFFSET;

    for (let i = 0; i < LAYER_GROUPS.length; i++) {
      this.buildGroupButton(i, LAYER_GROUPS[i]);
    }

    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC,
      );
      this.escKey.on("down", () => this.closeDrawer());
    }

    this.refreshButtons();
  }

  private buildGroupButton(idx: number, group: LayerGroup): void {
    const theme = getTheme();
    const btnX = this.rightEdge - BTN_SIZE;
    const btnY = this.topY + idx * (BTN_SIZE + BTN_GAP);

    const bg = this.scene.add
      .rectangle(btnX, btnY, BTN_SIZE, BTN_SIZE, theme.colors.panelBg, 0.9)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.7)
      .setOrigin(0, 0)
      .setDepth(BTN_DEPTH);

    const icon = this.scene.add
      .image(btnX + BTN_SIZE / 2, btnY + BTN_SIZE / 2, "ui-icons")
      .setFrame(GROUP_ICON_INDICES[group])
      .setDisplaySize(ICON_SIZE, ICON_SIZE)
      .setTint(theme.colors.accent)
      .setDepth(BTN_DEPTH + 1);

    const hit = this.scene.add
      .zone(btnX, btnY, BTN_SIZE, BTN_SIZE)
      .setOrigin(0, 0)
      .setDepth(BTN_DEPTH + 2)
      .setInteractive({ cursor: "pointer", useHandCursor: true })
      .setName(`btn-layer-group-${group}`);

    hit.on("pointerover", () => {
      bg.setStrokeStyle(1, theme.colors.accent, 0.9);
      this.showTooltip(GROUP_LABELS[group], btnX - 4, btnY + BTN_SIZE / 2);
    });
    hit.on("pointerout", () => {
      bg.setStrokeStyle(1, theme.colors.panelBorder, 0.7);
      this.hideTooltip();
    });
    hit.on("pointerup", () => {
      this.hideTooltip();
      if (this.openGroup === group) {
        this.closeDrawer();
      } else {
        this.openDrawer(group);
      }
    });

    this.buttons.push({ bg, icon, hit, group });
  }

  private openDrawer(group: LayerGroup): void {
    if (this.drawer) this.closeDrawer();
    this.openGroup = group;

    const theme = getTheme();
    const layers = mapLayerController.getLayersByGroup(group);
    const drawerH = DRAWER_PADDING * 2 + layers.length * DRAWER_ROW_HEIGHT;

    const groupIdx = LAYER_GROUPS.indexOf(group);
    const btnY = this.topY + groupIdx * (BTN_SIZE + BTN_GAP);
    const drawerX = this.rightEdge - BTN_SIZE - DRAWER_WIDTH;
    const drawerY = btnY;

    const container = this.scene.add.container(drawerX, drawerY);
    container.setDepth(DRAWER_DEPTH);
    this.drawer = container;

    const panelBg = this.scene.add
      .rectangle(0, 0, DRAWER_WIDTH, drawerH, theme.colors.panelBg, 0.93)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.85)
      .setOrigin(0, 0);
    container.add(panelBg);

    for (let i = 0; i < layers.length; i++) {
      this.buildDrawerRow(container, layers[i].id, i);
    }

    container.setAlpha(0);
    container.x = drawerX + 12;
    this.scene.tweens.add({
      targets: container,
      x: drawerX,
      alpha: 1,
      duration: 100,
      ease: "Power2Out",
    });

    this.refreshButtons();
  }

  private buildDrawerRow(
    container: Phaser.GameObjects.Container,
    layerId: LayerId,
    rowIdx: number,
  ): void {
    const theme = getTheme();
    const layer = mapLayerController.getLayer(layerId);
    const on = mapLayerController.isVisible(layerId);
    const rowY = DRAWER_PADDING + rowIdx * DRAWER_ROW_HEIGHT;

    const rowIcon = this.scene.add
      .image(
        DRAWER_PADDING + DRAWER_ICON_SIZE / 2,
        rowY + DRAWER_ROW_HEIGHT / 2,
        "ui-icons",
      )
      .setFrame(layer.iconIndex)
      .setDisplaySize(DRAWER_ICON_SIZE, DRAWER_ICON_SIZE)
      .setTint(on ? theme.colors.accent : theme.colors.textDim);

    const rowLabel = this.scene.add
      .text(
        DRAWER_PADDING + DRAWER_ICON_SIZE + 8,
        rowY + DRAWER_ROW_HEIGHT / 2,
        layer.label.toUpperCase(),
        {
          fontSize: "11px",
          fontFamily: "monospace",
          color: colorToString(on ? theme.colors.text : theme.colors.textDim),
        },
      )
      .setOrigin(0, 0.5);

    const checkmark = this.scene.add
      .text(DRAWER_WIDTH - DRAWER_PADDING, rowY + DRAWER_ROW_HEIGHT / 2, "✓", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(1, 0.5)
      .setAlpha(on ? 1 : 0);

    const rowHit = this.scene.add
      .zone(0, rowY, DRAWER_WIDTH, DRAWER_ROW_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive({ cursor: "pointer", useHandCursor: true });

    rowHit.on(
      "pointerup",
      (
        _ptr: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        mapLayerController.toggle(layerId);
        const nowOn = mapLayerController.isVisible(layerId);
        rowIcon.setTint(nowOn ? theme.colors.accent : theme.colors.textDim);
        rowLabel.setColor(
          colorToString(nowOn ? theme.colors.text : theme.colors.textDim),
        );
        checkmark.setAlpha(nowOn ? 1 : 0);
        this.refreshButtons();
      },
    );

    container.add([rowIcon, rowLabel, checkmark, rowHit]);
  }

  private closeDrawer(): void {
    if (!this.drawer) return;
    const drawer = this.drawer;
    this.scene.tweens.add({
      targets: drawer,
      alpha: 0,
      x: drawer.x + 12,
      duration: 100,
      ease: "Power2Out",
      onComplete: () => drawer.destroy(),
    });
    this.drawer = null;
    this.openGroup = null;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    const theme = getTheme();
    for (const btn of this.buttons) {
      const layers = mapLayerController.getLayersByGroup(btn.group);
      const anyOn = layers.some((l) => mapLayerController.isVisible(l.id));
      const isOpen = this.openGroup === btn.group;
      btn.icon.setTint(
        isOpen
          ? theme.colors.warning
          : anyOn
            ? theme.colors.accent
            : theme.colors.textDim,
      );
    }
  }

  private handleScenePointerdown(ptr: Phaser.Input.Pointer): void {
    if (this.openGroup === null || !this.drawer) return;

    const groupIdx = LAYER_GROUPS.indexOf(this.openGroup);
    const btnX = this.rightEdge - BTN_SIZE;
    const btnY = this.topY + groupIdx * (BTN_SIZE + BTN_GAP);
    const drawerX = this.rightEdge - BTN_SIZE - DRAWER_WIDTH;
    const layers = mapLayerController.getLayersByGroup(this.openGroup);
    const drawerH = DRAWER_PADDING * 2 + layers.length * DRAWER_ROW_HEIGHT;

    const inDrawer =
      ptr.x >= drawerX &&
      ptr.x <= drawerX + DRAWER_WIDTH &&
      ptr.y >= btnY &&
      ptr.y <= btnY + drawerH;

    const inToolbar =
      ptr.x >= btnX &&
      ptr.x <= btnX + BTN_SIZE &&
      ptr.y >= this.topY &&
      ptr.y <= this.topY + LAYER_GROUPS.length * (BTN_SIZE + BTN_GAP);

    if (!inDrawer && !inToolbar) {
      this.closeDrawer();
    }
  }
}
