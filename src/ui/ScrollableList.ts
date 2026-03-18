import Phaser from "phaser";
import { getTheme } from "./Theme";

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
      .setInteractive();
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
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    hitBg.on("pointerover", () => hitBg.setFillStyle(theme.colors.rowHover));
    hitBg.on("pointerout", () =>
      hitBg.setFillStyle(
        index % 2 === 0 ? theme.colors.rowEven : theme.colors.rowOdd,
      ),
    );
    hitBg.on("pointerup", () => {
      this.selectedIndex = index;
      this.listConfig.onSelect?.(index);
    });

    container.addAt(hitBg, 0);
  }

  clearItems(): void {
    this.items.forEach((item) => item.destroy());
    this.items = [];
    this.scrollY = 0;
    this.maxScroll = 0;
  }

  private scrollBy(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.contentContainer.y = -this.scrollY;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }
}
