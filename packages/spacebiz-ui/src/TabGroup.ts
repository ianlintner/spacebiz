import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";
import {
  FocusManager,
  createFocusRing,
  type Focusable,
} from "./foundation/FocusManager.ts";

export interface TabConfig {
  label: string;
  content: Phaser.GameObjects.Container;
}

export interface TabGroupConfig {
  x: number;
  y: number;
  width: number;
  tabHeight?: number;
  tabs: TabConfig[];
  defaultTab?: number;
}

export class TabGroup
  extends Phaser.GameObjects.Container
  implements Focusable
{
  private tabs: TabConfig[];
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private activeIndex: number;
  private tabHeight: number;
  private tabGroupWidth: number;
  private focusRing: Phaser.GameObjects.Rectangle | null = null;
  private isFocused = false;
  private focusManager: FocusManager | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, config: TabGroupConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.tabs = config.tabs;
    this.tabHeight = config.tabHeight ?? theme.button.height;
    this.tabGroupWidth = config.width;
    this.activeIndex = config.defaultTab ?? 0;

    // Create tab buttons
    const tabWidth = config.width / config.tabs.length;

    config.tabs.forEach((tab, index) => {
      const tabBtn = scene.add.container(tabWidth * index, 0);

      const isActive = index === this.activeIndex;

      const bg = scene.add
        .rectangle(
          0,
          0,
          tabWidth,
          this.tabHeight,
          isActive ? theme.colors.panelBg : theme.colors.headerBg,
        )
        .setOrigin(0, 0)
        .setAlpha(isActive ? 1.0 : 0.8)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, 0, tabWidth, this.tabHeight),
          Phaser.Geom.Rectangle.Contains,
        );
      if (bg.input) {
        bg.input.cursor = "pointer";
      }

      const labelText = scene.add
        .text(tabWidth / 2, this.tabHeight / 2, tab.label, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(
            isActive ? theme.colors.accent : theme.colors.textDim,
          ),
          wordWrap: { width: tabWidth - theme.spacing.sm * 2 },
          align: "center",
        })
        .setOrigin(0.5);

      // Glow behind the active indicator (wider, lower alpha)
      const indicatorGlow = scene.add
        .rectangle(
          0,
          this.tabHeight - 3,
          tabWidth,
          3,
          isActive ? theme.colors.accent : theme.colors.panelBorder,
        )
        .setOrigin(0, 0)
        .setAlpha(isActive ? 0.2 : 0);

      // Active indicator line at bottom (now 3px)
      const indicator = scene.add
        .rectangle(
          0,
          this.tabHeight - 3,
          tabWidth,
          3,
          isActive ? theme.colors.accent : theme.colors.panelBorder,
        )
        .setOrigin(0, 0);

      tabBtn.add([bg, labelText, indicatorGlow, indicator]);

      bg.on("pointerover", () => {
        if (index !== this.activeIndex) {
          bg.setFillStyle(theme.colors.buttonHover);
        }
      });
      bg.on("pointerout", () => {
        const active = index === this.activeIndex;
        bg.setFillStyle(active ? theme.colors.panelBg : theme.colors.headerBg);
        bg.setAlpha(active ? 1.0 : 0.6);
      });
      bg.on("pointerdown", () => {
        if (index !== this.activeIndex) {
          bg.setAlpha(0.8);
        }
      });
      bg.on("pointerup", () => {
        if (index !== this.activeIndex) {
          bg.setAlpha(0.6);
        }
        playUiSfx("ui_tab_switch");
        this.setActiveTab(index);
      });
      bg.on("pointerupoutside", () => {
        const active = index === this.activeIndex;
        bg.setAlpha(active ? 1.0 : 0.6);
      });

      this.tabButtons.push(tabBtn);
      this.add(tabBtn);

      // Position content below tabs
      tab.content.setPosition(0, this.tabHeight);
      tab.content.setVisible(index === this.activeIndex);
      this.add(tab.content);
    });

    // Focus ring sized to one tab; repositioned over the active tab.
    this.focusRing = createFocusRing(scene, tabWidth, this.tabHeight);
    this.add(this.focusRing);
    this.positionFocusRing();

    scene.add.existing(this);

    this.focusManager = FocusManager.forScene(scene);
    this.focusManager.register(this);
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    scene.input.keyboard?.on("keydown", this.keyHandler);
  }

  private positionFocusRing(): void {
    if (!this.focusRing) return;
    const tabWidth = this.tabGroupWidth / this.tabs.length;
    const theme = getTheme();
    const ringOffset = theme.focusRing.offset;
    this.focusRing.setPosition(
      tabWidth * this.activeIndex - ringOffset,
      -ringOffset,
    );
  }

  // ── Focusable ────────────────────────────────────────────────────────────

  setFocus(focused: boolean): void {
    if (focused) {
      this.focusManager?.setFocus(this);
    } else if (this.isFocused) {
      this.focusManager?.setFocus(null);
    }
  }

  focus(): void {
    if (this.isFocused) return;
    this.isFocused = true;
    this.focusRing?.setVisible(true);
  }

  blur(): void {
    if (!this.isFocused) return;
    this.isFocused = false;
    this.focusRing?.setVisible(false);
  }

  isFocusable(): boolean {
    return this.visible && this.active && this.tabs.length > 0;
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isFocused || !this.visible) return;
    let target = -1;
    if (event.code === "ArrowRight") {
      target = (this.activeIndex + 1) % this.tabs.length;
    } else if (event.code === "ArrowLeft") {
      target = (this.activeIndex - 1 + this.tabs.length) % this.tabs.length;
    } else if (event.code === "Home") {
      target = 0;
    } else if (event.code === "End") {
      target = this.tabs.length - 1;
    } else {
      return;
    }
    if (target !== this.activeIndex) {
      playUiSfx("ui_tab_switch");
      this.setActiveTab(target);
    }
    event.preventDefault();
  }

  setActiveTab(index: number): void {
    if (index < 0 || index >= this.tabs.length) return;

    // Deactivate previous
    this.updateTabVisuals(this.activeIndex, false);
    this.tabs[this.activeIndex].content.setVisible(false);

    // Activate new
    this.activeIndex = index;
    this.updateTabVisuals(index, true);
    this.tabs[index].content.setVisible(true);
    this.positionFocusRing();
  }

  destroy(fromScene?: boolean): void {
    if (this.keyHandler && this.scene) {
      this.scene.input.keyboard?.off("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.focusManager?.unregister(this);
    this.focusManager = null;
    super.destroy(fromScene);
  }

  private updateTabVisuals(index: number, active: boolean): void {
    const theme = getTheme();
    const tabBtn = this.tabButtons[index];
    const children = tabBtn.getAll() as Phaser.GameObjects.GameObject[];

    // bg is index 0
    const bg = children[0] as Phaser.GameObjects.Rectangle;
    bg.setFillStyle(active ? theme.colors.panelBg : theme.colors.headerBg);
    bg.setAlpha(active ? 1.0 : 0.6);

    // label is index 1
    const label = children[1] as Phaser.GameObjects.Text;
    label.setColor(
      colorToString(active ? theme.colors.accent : theme.colors.textDim),
    );

    // indicatorGlow is index 2
    const indicatorGlow = children[2] as Phaser.GameObjects.Rectangle;
    indicatorGlow.setFillStyle(
      active ? theme.colors.accent : theme.colors.panelBorder,
    );
    indicatorGlow.setAlpha(active ? 0.2 : 0);

    // indicator is index 3
    const indicator = children[3] as Phaser.GameObjects.Rectangle;
    indicator.setFillStyle(
      active ? theme.colors.accent : theme.colors.panelBorder,
    );
  }

  getActiveIndex(): number {
    return this.activeIndex;
  }

  getTabWidth(): number {
    return this.tabGroupWidth;
  }
}
