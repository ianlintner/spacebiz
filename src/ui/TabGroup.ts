import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

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

export class TabGroup extends Phaser.GameObjects.Container {
  private tabs: TabConfig[];
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private activeIndex: number;
  private tabHeight: number;
  private tabGroupWidth: number;

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
        getAudioDirector().sfx("ui_tab_switch");
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

    scene.add.existing(this);
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
