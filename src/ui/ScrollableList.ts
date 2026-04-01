import Phaser from "phaser";
import { getTheme } from "./Theme.ts";

export interface ScrollableListConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  itemHeight: number;
  onSelect?: (index: number) => void;
}

export class ScrollableList extends Phaser.GameObjects.Container {
  private items: Phaser.GameObjects.Container[] = [];
  private maskGraphics: Phaser.GameObjects.Graphics;
  private contentContainer: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private listConfig: ScrollableListConfig;
  private selectedIndex = -1;
  private scrollTrack: Phaser.GameObjects.Rectangle | null = null;
  private scrollThumb: Phaser.GameObjects.Rectangle | null = null;
  private hoverIndicator: Phaser.GameObjects.Rectangle | null = null;
  private currentHoverContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, config: ScrollableListConfig) {
    super(scene, config.x, config.y);
    this.listConfig = config;

    // Clipping mask
    this.maskGraphics = scene.make.graphics({});
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(config.x, config.y, config.width, config.height);
    const mask = this.maskGraphics.createGeometryMask();

    this.contentContainer = scene.add.container(0, 0);
    this.contentContainer.setMask(mask);
    this.add(this.contentContainer);

    // Scroll via mouse wheel
    const hitArea = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, config.width, config.height),
        Phaser.Geom.Rectangle.Contains,
      );
    this.add(hitArea);

    hitArea.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _dx: number,
        _dy: number,
        dz: number,
      ) => {
        this.scrollBy(dz * 0.5);
      },
    );

    scene.add.existing(this);
  }

  addItem(container: Phaser.GameObjects.Container): void {
    const index = this.items.length;
    const y = index * this.listConfig.itemHeight;
    container.setPosition(0, y);
    this.items.push(container);
    this.contentContainer.add(container);
    this.maxScroll = Math.max(
      0,
      this.items.length * this.listConfig.itemHeight - this.listConfig.height,
    );

    // Make item clickable
    const theme = getTheme();
    const hitBg = this.scene.add
      .rectangle(
        0,
        0,
        this.listConfig.width,
        this.listConfig.itemHeight,
        index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
      )
      .setOrigin(0, 0);

    container.setSize(this.listConfig.width, this.listConfig.itemHeight);
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        0,
        0,
        this.listConfig.width,
        this.listConfig.itemHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    if (container.input) {
      container.input.cursor = "pointer";
    }

    container.on("pointerover", () => {
      hitBg.setFillStyle(theme.colors.rowHover);
      this.showHoverIndicator(container);
    });
    container.on("pointerout", () => {
      hitBg.setAlpha(1);
      hitBg.setFillStyle(
        index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
      );
      this.hideHoverIndicator(container);
    });
    container.on("pointerdown", () => {
      hitBg.setAlpha(0.82);
    });
    container.on("pointerup", () => {
      hitBg.setAlpha(1);
      this.selectedIndex = index;
      this.listConfig.onSelect?.(index);
    });
    container.on("pointerupoutside", () => {
      hitBg.setAlpha(1);
    });

    container.addAt(hitBg, 0);

    // Update scrollbar after adding item
    this.updateScrollbar();
  }

  clearItems(): void {
    this.items.forEach((item) => item.destroy());
    this.items = [];
    this.scrollY = 0;
    this.maxScroll = 0;
    this.hoverIndicator = null;
    this.currentHoverContainer = null;
    this.updateScrollbar();
  }

  private scrollBy(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.contentContainer.y = -this.scrollY;
    this.updateThumbPosition();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  private showHoverIndicator(container: Phaser.GameObjects.Container): void {
    const theme = getTheme();
    // Remove previous hover indicator if on a different container
    if (this.hoverIndicator && this.currentHoverContainer !== container) {
      this.hideHoverIndicator(this.currentHoverContainer!);
    }
    this.hoverIndicator = this.scene.add
      .rectangle(0, 0, 2, this.listConfig.itemHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.7);
    container.add(this.hoverIndicator);
    this.currentHoverContainer = container;
  }

  private hideHoverIndicator(
    container: Phaser.GameObjects.Container | null,
  ): void {
    if (this.hoverIndicator && container === this.currentHoverContainer) {
      this.hoverIndicator.destroy();
      this.hoverIndicator = null;
      this.currentHoverContainer = null;
    }
  }

  private updateScrollbar(): void {
    const theme = getTheme();
    const totalContentHeight = this.items.length * this.listConfig.itemHeight;
    const listHeight = this.listConfig.height;
    const listWidth = this.listConfig.width;

    // Remove existing scrollbar elements
    if (this.scrollTrack) {
      this.scrollTrack.destroy();
      this.scrollTrack = null;
    }
    if (this.scrollThumb) {
      this.scrollThumb.destroy();
      this.scrollThumb = null;
    }

    // Only show scrollbar when content overflows
    if (totalContentHeight <= listHeight) return;

    // Track
    this.scrollTrack = this.scene.add
      .rectangle(listWidth - 4, 0, 4, listHeight, theme.colors.scrollbarTrack)
      .setOrigin(0, 0)
      .setAlpha(0.3);
    this.add(this.scrollTrack);

    // Thumb: proportional height
    const thumbHeight = Math.max(
      20,
      (listHeight / totalContentHeight) * listHeight,
    );
    this.scrollThumb = this.scene.add
      .rectangle(listWidth - 4, 0, 4, thumbHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.5);
    this.add(this.scrollThumb);

    this.updateThumbPosition();
  }

  private updateThumbPosition(): void {
    if (!this.scrollThumb || this.maxScroll <= 0) return;

    const listHeight = this.listConfig.height;
    const totalContentHeight = this.items.length * this.listConfig.itemHeight;
    const thumbHeight = Math.max(
      20,
      (listHeight / totalContentHeight) * listHeight,
    );
    const trackRange = listHeight - thumbHeight;
    const thumbY = (this.scrollY / this.maxScroll) * trackRange;
    this.scrollThumb.setY(thumbY);
  }
}
