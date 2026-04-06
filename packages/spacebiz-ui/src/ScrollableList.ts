import Phaser from "phaser";
import { getTheme } from "./Theme.ts";

export interface ScrollableListConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  itemHeight: number;
  onSelect?: (index: number) => void;
  onConfirm?: (index: number) => void;
  onCancel?: () => void;
  keyboardNavigation?: boolean;
  autoFocus?: boolean;
}

export class ScrollableList extends Phaser.GameObjects.Container {
  private items: Phaser.GameObjects.Container[] = [];
  private itemBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private selectionIndicators: Phaser.GameObjects.Rectangle[] = [];
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
  private wheelCapture: Phaser.GameObjects.Rectangle;
  private hasKeyboardFocus = false;
  private readonly keyboardNavigationEnabled: boolean;
  private destroyed = false;

  constructor(scene: Phaser.Scene, config: ScrollableListConfig) {
    super(scene, config.x, config.y);
    this.listConfig = config;
    this.keyboardNavigationEnabled = config.keyboardNavigation ?? false;

    // Clipping mask
    this.maskGraphics = scene.make.graphics({});
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(0, 0, config.width, config.height);
    this.maskGraphics.setPosition(config.x, config.y);
    const mask = this.maskGraphics.createGeometryMask();

    this.contentContainer = scene.add.container(0, 0);
    this.contentContainer.setMask(mask);
    this.add(this.contentContainer);

    // Wheel capture area (kept behind list content so it doesn't block row clicks)
    this.wheelCapture = scene.add
      .rectangle(0, 0, config.width, config.height, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, config.width, config.height),
        Phaser.Geom.Rectangle.Contains,
      );
    this.addAt(this.wheelCapture, 0);
    this.wheelCapture.setData("consumesWheel", true);

    this.wheelCapture.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _dx: number,
        _dy: number,
        dz: number,
      ) => {
        this.focus();
        this.scrollBy(dz * 0.5);
      },
    );
    this.wheelCapture.on("pointerdown", () => {
      this.focus();
    });

    if (this.keyboardNavigationEnabled) {
      this.scene.input.keyboard?.on("keydown", this.handleKeyDown, this);
      if (config.autoFocus) {
        this.focus();
      }
    }

    // Sync geometry mask position when inside a parent Container
    this.scene.events.on("preupdate", this.syncMaskPosition, this);

    scene.add.existing(this);
  }

  addItem(container: Phaser.GameObjects.Container): void {
    const index = this.items.length;
    const y = index * this.listConfig.itemHeight;
    container.setPosition(0, y);

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

    this.items.push(container);
    this.itemBackgrounds.push(hitBg);
    this.contentContainer.add(container);
    this.maxScroll = Math.max(
      0,
      this.items.length * this.listConfig.itemHeight - this.listConfig.height,
    );

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
    container.setData("consumesWheel", true);
    if (container.input) {
      container.input.cursor = "pointer";
    }

    container.on("pointerover", () => {
      this.focus();
      if (this.selectedIndex !== index) {
        hitBg.setFillStyle(theme.colors.rowHover);
      }
      this.showHoverIndicator(container);
    });
    container.on("pointerout", () => {
      hitBg.setAlpha(1);
      if (this.selectedIndex !== index) {
        hitBg.setFillStyle(
          index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
        );
      }
      this.hideHoverIndicator(container);
    });
    container.on("pointerdown", () => {
      this.focus();
      hitBg.setAlpha(0.82);
    });
    container.on(
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
    container.on("pointerup", () => {
      hitBg.setAlpha(1);
      this.selectIndex(index, true);
    });
    container.on("pointerupoutside", () => {
      hitBg.setAlpha(1);
    });

    container.addAt(hitBg, 0);

    const selectionIndicator = this.scene.add
      .rectangle(0, 0, 3, this.listConfig.itemHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.8)
      .setVisible(false);
    container.add(selectionIndicator);
    this.selectionIndicators.push(selectionIndicator);

    // Update scrollbar after adding item
    this.updateScrollbar();

    if (
      this.selectedIndex < 0 &&
      this.listConfig.autoFocus &&
      this.items.length === 1
    ) {
      this.selectIndex(0, false);
    }
  }

  clearItems(): void {
    this.items.forEach((item) => item.destroy());
    this.items = [];
    this.itemBackgrounds = [];
    this.selectionIndicators = [];
    this.scrollY = 0;
    this.maxScroll = 0;
    this.selectedIndex = -1;
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

  private selectIndex(index: number, notifySelection: boolean): void {
    if (index < 0 || index >= this.items.length) return;

    const theme = getTheme();

    for (let i = 0; i < this.itemBackgrounds.length; i++) {
      const bg = this.itemBackgrounds[i];
      const indicator = this.selectionIndicators[i];
      const isSelected = i === index;
      bg.setFillStyle(
        isSelected
          ? theme.colors.rowHover
          : i % 2 === 0
            ? theme.colors.rowEven
            : theme.colors.rowOdd,
      );
      indicator?.setVisible(isSelected);
    }

    this.selectedIndex = index;
    this.ensureItemVisible(index);

    if (notifySelection) {
      this.listConfig.onSelect?.(index);
    }
  }

  private ensureItemVisible(index: number): void {
    const itemTop = index * this.listConfig.itemHeight;
    const itemBottom = itemTop + this.listConfig.itemHeight;
    const visibleTop = this.scrollY;
    const visibleBottom = this.scrollY + this.listConfig.height;

    if (itemTop < visibleTop) {
      this.scrollY = itemTop;
    } else if (itemBottom > visibleBottom) {
      this.scrollY = itemBottom - this.listConfig.height;
    }

    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.contentContainer.y = -this.scrollY;
    this.updateThumbPosition();
  }

  private focus(): void {
    if (!this.keyboardNavigationEnabled) return;
    this.hasKeyboardFocus = true;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.hasKeyboardFocus || !this.visible) return;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        if (this.items.length > 0) {
          const nextIndex = Phaser.Math.Clamp(
            this.selectedIndex < 0 ? 0 : this.selectedIndex - 1,
            0,
            this.items.length - 1,
          );
          this.selectIndex(nextIndex, false);
        }
        event.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        if (this.items.length > 0) {
          const nextIndex = Phaser.Math.Clamp(
            this.selectedIndex < 0 ? 0 : this.selectedIndex + 1,
            0,
            this.items.length - 1,
          );
          this.selectIndex(nextIndex, false);
        }
        event.preventDefault();
        break;
      case "Enter":
      case "Space":
        if (this.selectedIndex >= 0) {
          this.listConfig.onConfirm?.(this.selectedIndex);
          if (!this.listConfig.onConfirm) {
            this.listConfig.onSelect?.(this.selectedIndex);
          }
        }
        event.preventDefault();
        break;
      case "Escape":
        this.listConfig.onCancel?.();
        event.preventDefault();
        break;
    }
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
      .rectangle(listWidth - 6, 0, 6, listHeight, theme.colors.scrollbarTrack)
      .setOrigin(0, 0)
      .setAlpha(0.6);
    this.add(this.scrollTrack);

    // Thumb: proportional height
    const thumbHeight = Math.max(
      20,
      (listHeight / totalContentHeight) * listHeight,
    );
    this.scrollThumb = this.scene.add
      .rectangle(listWidth - 6, 0, 6, thumbHeight, theme.colors.scrollbarThumb)
      .setOrigin(0, 0)
      .setAlpha(0.8);
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

  private syncMaskPosition(): void {
    if (this.destroyed) return;
    const matrix = this.getWorldTransformMatrix();
    this.maskGraphics.setPosition(matrix.tx, matrix.ty);
  }

  destroy(fromScene?: boolean): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off("preupdate", this.syncMaskPosition, this);
    if (this.keyboardNavigationEnabled) {
      this.scene.input.keyboard?.off("keydown", this.handleKeyDown, this);
    }
    this.maskGraphics.destroy();
    super.destroy(fromScene);
  }
}
