import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  draggable?: boolean;
  showGlow?: boolean;
}

export class Panel extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.NineSlice;
  protected glowLayer: Phaser.GameObjects.NineSlice | null = null;
  protected titleBar: Phaser.GameObjects.Container | null = null;
  private titleBg: Phaser.GameObjects.Rectangle | null = null;
  private titleAccentLine: Phaser.GameObjects.Rectangle | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  protected contentY: number;
  protected panelWidth: number;
  protected panelHeight: number;
  private idleGlowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.panelWidth = config.width;
    this.panelHeight = config.height;

    const showGlow = config.showGlow ?? true;

    // Glow layer (rendered behind the background)
    if (showGlow) {
      const glowW = theme.glow.width;
      this.glowLayer = scene.add
        .nineslice(
          -glowW,
          -glowW,
          "panel-glow",
          undefined,
          config.width + glowW * 2,
          config.height + glowW * 2,
          10,
          10,
          10,
          10,
        )
        .setOrigin(0, 0)
        .setAlpha(theme.glow.alpha);
      this.add(this.glowLayer);
    }

    // Background
    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        config.height,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0);
    this.add(this.bg);

    this.contentY = theme.spacing.sm;

    // Title bar
    if (config.title) {
      const titleBg = scene.add
        .rectangle(
          0,
          0,
          config.width,
          theme.panel.titleHeight,
          theme.color.surface.raised,
        )
        .setOrigin(0, 0);

      // 1px accent-colored line at the bottom of the title bar
      const titleAccentLine = scene.add
        .rectangle(
          0,
          theme.panel.titleHeight - 1,
          config.width,
          1,
          theme.color.accent.primary,
        )
        .setOrigin(0, 0)
        .setAlpha(0.7);

      const titleText = scene.add.text(
        theme.spacing.md,
        theme.spacing.sm,
        config.title,
        {
          fontSize: `${theme.fonts.heading.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.color.accent.primary),
          wordWrap: { width: config.width - theme.spacing.md * 3 },
        },
      );

      this.titleBg = titleBg;
      this.titleAccentLine = titleAccentLine;
      this.titleText = titleText;
      this.titleBar = scene.add.container(0, 0, [
        titleBg,
        titleAccentLine,
        titleText,
      ]);
      this.add(this.titleBar);
      this.contentY = theme.panel.titleHeight + theme.spacing.sm;
    }

    // Draggable
    if (config.draggable) {
      const hitArea = this.titleBar ?? this.bg;
      (hitArea as Phaser.GameObjects.GameObject).setInteractive({
        draggable: true,
      });
      scene.input.setDraggable(hitArea as Phaser.GameObjects.GameObject);
      hitArea.on(
        "drag",
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          this.x += dragX;
          this.y += dragY;
        },
      );
    }

    // Begin idle glow breathing for panels with a visible glow layer
    if (showGlow) {
      this.startIdleGlow();
    }

    scene.add.existing(this);
  }

  /**
   * Redraws the background and title bar to match the current
   * `panelWidth` / `panelHeight`. Called by `setSize()` after updating
   * the stored dimensions.
   */
  private redraw(): void {
    const theme = getTheme();

    // Resize background nineslice in-place (no new object created)
    this.bg.setSize(this.panelWidth, this.panelHeight);

    // Resize glow layer if present
    if (this.glowLayer) {
      const glowW = theme.glow.width;
      this.glowLayer.setSize(
        this.panelWidth + glowW * 2,
        this.panelHeight + glowW * 2,
      );
    }

    // Resize title bar children if present
    if (this.titleText) {
      this.titleBg!.setSize(this.panelWidth, theme.panel.titleHeight);
      this.titleAccentLine!.setSize(this.panelWidth, 1);
      this.titleText.setWordWrapWidth(this.panelWidth - theme.spacing.md * 3);
    }
  }

  /**
   * Resize the panel and immediately reflow its visual elements.
   * After this call `getContentArea()` reflects the new dimensions.
   */
  public setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.panelWidth = width;
    this.panelHeight = height;
    this.redraw();
    return this;
  }

  getContentY(): number {
    return this.contentY;
  }

  getContentArea(): { x: number; y: number; width: number; height: number } {
    const theme = getTheme();
    return {
      x: theme.spacing.sm,
      y: this.contentY,
      width: this.panelWidth - theme.spacing.sm * 2,
      height: this.panelHeight - this.contentY - theme.spacing.sm,
    };
  }

  /** Begin a continuous ambient glow pulse. Auto-called when showGlow is true. */
  private startIdleGlow(): void {
    if (!this.glowLayer) return;
    if (this.idleGlowTween) {
      this.idleGlowTween.stop();
      this.idleGlowTween = null;
    }
    const theme = getTheme();
    this.idleGlowTween = this.scene.tweens.add({
      targets: this.glowLayer,
      alpha: { from: theme.glow.pulseMin, to: theme.glow.pulseMax },
      duration: theme.ambient.panelIdlePulseDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setActive(active: boolean): this {
    super.setActive(active);
    if (!this.glowLayer) return this;
    // Halt idle pulse to avoid conflicting with the focus transition
    if (this.idleGlowTween) {
      this.idleGlowTween.stop();
      this.idleGlowTween = null;
    }
    const theme = getTheme();
    this.scene.tweens.add({
      targets: this.glowLayer,
      alpha: active ? theme.glow.activeAlpha : theme.glow.alpha,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        // Resume ambient breathing after returning to idle state
        if (!active) {
          this.scene.time.delayedCall(200, () => this.startIdleGlow());
        }
      },
    });
    return this;
  }
}
