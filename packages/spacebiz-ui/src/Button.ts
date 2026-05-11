import * as Phaser from "phaser";
import { getTheme, colorToString, lerpColor } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";
import { autoButtonWidth, fitTextWithEllipsis } from "./TextMetrics.ts";
import { registerWidget, slugifyLabel } from "./WidgetHooks.ts";
import {
  FocusManager,
  createFocusRing,
  type Focusable,
} from "./foundation/FocusManager.ts";

export interface ButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /**
   * Stable id for QA automation / LLM console drivers. When omitted, the id
   * is derived from the label (e.g. "Build Route" -> "btn-build-route"). Only
   * effective when the testing fa\u00e7ade (`src/testing`) is loaded; otherwise
   * the registration call is a no-op.
   */
  testId?: string;
  /**
   * When true and no explicit `width` is provided, the button will
   * automatically size itself to fit the label text exactly.
   * Defaults to false for backward compatibility.
   */
  autoWidth?: boolean;
  /**
   * Horizontal padding in pixels added to each side of the label when
   * computing auto width. Ignored when an explicit `width` is given.
   * Defaults to 20px per side.
   */
  paddingX?: number;
  /**
   * When true and the label text is wider than the button, the label is
   * truncated with a trailing "…". Useful for fixed-width buttons.
   * Defaults to false.
   */
  ellipsis?: boolean;
  /**
   * Override the default font size (theme.fonts.body.size) for the button label.
   */
  fontSize?: number;
}

type BtnState = "normal" | "hover" | "pressed" | "disabled";

export class Button extends Phaser.GameObjects.Container implements Focusable {
  private bg: Phaser.GameObjects.Graphics;
  private _btnState: BtnState = "normal";
  private label: Phaser.GameObjects.Text;
  private accentLine: Phaser.GameObjects.Rectangle;
  private focusRing: Phaser.GameObjects.Rectangle | null = null;
  private hitZone: Phaser.GameObjects.Zone | null = null;
  private widthPx: number;
  private heightPx: number;
  private isDisabled: boolean;
  private isFocused = false;
  private onClickFn: () => void;
  private idleShimmerTween: Phaser.Tweens.Tween | null = null;
  private focusManager: FocusManager | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  private readonly hitPaddingX = 10;
  private readonly hitPaddingY = 8;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    const fontSize = config.fontSize ?? theme.button.fontSize;

    // Determine width: explicit > autoWidth measured > minWidth fallback
    let width: number;
    if (config.width !== undefined) {
      width = config.width;
    } else if (config.autoWidth) {
      width = autoButtonWidth(
        scene,
        config.label,
        theme.fonts.body.family,
        fontSize,
        theme.button.minWidth,
        config.paddingX ?? 20,
      );
    } else {
      width = theme.button.minWidth;
    }

    const height = config.height ?? theme.button.height;
    this.widthPx = width;
    this.heightPx = height;
    this.isDisabled = config.disabled ?? false;
    this.onClickFn = config.onClick;
    this.setSize(width, height);

    this.hitZone = scene.add
      .zone(
        config.x + width / 2,
        config.y + height / 2,
        width + this.hitPaddingX * 2,
        height + this.hitPaddingY * 2,
      )
      .setOrigin(0.5);

    this.syncHitZonePosition();

    this.bg = scene.add.graphics();

    // Optionally truncate label with ellipsis when it overflows fixed width
    const displayLabel =
      config.ellipsis === true
        ? fitTextWithEllipsis(
            scene,
            config.label,
            width - (config.paddingX ?? 20) * 2,
            theme.fonts.body.family,
            fontSize,
          )
        : config.label;

    const textColor = this.isDisabled
      ? colorToString(theme.color.text.muted)
      : colorToString(theme.color.text.primary);
    this.label = scene.add
      .text(width / 2, height / 2, displayLabel, {
        fontSize: `${fontSize}px`,
        fontFamily: theme.fonts.body.family,
        color: textColor,
      })
      .setOrigin(0.5);

    // Bottom accent line
    this.accentLine = scene.add
      .rectangle(2, height - 1, width - 4, 1, theme.color.accent.primary)
      .setOrigin(0, 0)
      .setAlpha(this.isDisabled ? 0.25 : 0.4);

    // Focus ring — drawn behind everything else, hidden until focused.
    this.focusRing = createFocusRing(scene, width, height);
    this.add([this.focusRing, this.bg, this.accentLine, this.label]);
    this.drawBg(this.isDisabled ? "disabled" : "normal");

    if (!this.isDisabled) {
      this.setupInteractive();
    }

    scene.add.existing(this);

    // Register with the scene's FocusManager so Tab can reach this button.
    this.focusManager = FocusManager.forScene(scene);
    this.focusManager.register(this);
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    scene.input.keyboard?.on("keydown", this.keyHandler);

    const unregister = registerWidget({
      testId: config.testId ?? slugifyLabel(config.label, "button"),
      kind: "button",
      label: config.label,
      scene,
      invoke: () => {
        if (!this.isDisabled && this.visible) {
          this.onClickFn();
        }
      },
      isEnabled: () => !this.isDisabled,
      isVisible: () => this.visible,
    });
    if (unregister) {
      this.once("destroy", unregister);
    }
  }

  private startIdleShimmer(): void {
    if (this.idleShimmerTween) {
      this.idleShimmerTween.stop();
      this.idleShimmerTween = null;
    }
    const theme = getTheme();
    this.idleShimmerTween = this.scene.tweens.add({
      targets: this.accentLine,
      alpha: { from: 0.3, to: 0.5 },
      duration: theme.ambient.buttonIdleShimmerDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private setupInteractive(): void {
    if (!this.hitZone) return;

    this.hitZone.off("pointerover");
    this.hitZone.off("pointerout");
    this.hitZone.off("pointerdown");
    this.hitZone.off("pointerup");
    this.hitZone.off("pointerupoutside");

    this.startIdleShimmer();
    this.hitZone.setInteractive({ useHandCursor: true });
    if (this.hitZone.input) {
      this.hitZone.input.cursor = "pointer";
    }
    this.hitZone.on("pointerover", () => {
      playUiSfx("ui_hover");
      // Pause idle shimmer so the hover brightening is clean
      if (this.idleShimmerTween) {
        this.idleShimmerTween.stop();
        this.idleShimmerTween = null;
      }
      this.drawBg("hover");
      this.scene.tweens.add({
        targets: this.accentLine,
        alpha: 0.8,
        duration: 150,
        ease: "Power2",
      });
    });
    this.hitZone.on("pointerout", () => {
      this.drawBg("normal");
      this.scene.tweens.add({
        targets: this.accentLine,
        alpha: 0.4,
        duration: 150,
        ease: "Power2",
        onComplete: () => this.startIdleShimmer(),
      });
    });
    this.hitZone.on("pointerdown", () => this.drawBg("pressed"));
    this.hitZone.on("pointerup", () => {
      this.drawBg("hover");
      playUiSfx("ui_click_primary");
      this.onClickFn();
    });
    this.hitZone.on("pointerupoutside", () => {
      this.drawBg("normal");
    });
  }

  private drawBg(state: BtnState): void {
    this._btnState = state;
    const theme = getTheme();
    const w = this.widthPx;
    const h = this.heightPx;

    this.bg.clear();
    // Track dimensions on the Graphics object so tests and layout code can
    // read bg.width / bg.height the same way they did with the NineSlice bg.
    (this.bg as unknown as { width: number }).width = w;
    (this.bg as unknown as { height: number }).height = h;

    let fillColor: number;
    let fillAlpha: number;
    let borderColor: number;
    let borderAlpha: number;

    switch (state) {
      case "hover":
        fillColor = theme.colors.buttonHover;
        fillAlpha = 0.98;
        borderColor = lerpColor(
          theme.colors.panelBorder,
          theme.colors.accent,
          0.4,
        );
        borderAlpha = 0.9;
        break;
      case "pressed":
        fillColor = theme.colors.buttonPressed;
        fillAlpha = 1.0;
        borderColor = theme.colors.panelBorder;
        borderAlpha = 0.5;
        break;
      case "disabled":
        fillColor = theme.colors.buttonDisabled;
        fillAlpha = 0.75;
        borderColor = theme.colors.panelBorder;
        borderAlpha = 0.3;
        break;
      default:
        fillColor = theme.colors.buttonBg;
        fillAlpha = 0.95;
        borderColor = theme.colors.panelBorder;
        borderAlpha = 0.75;
    }

    this.bg.fillStyle(fillColor, fillAlpha);
    this.bg.fillRect(0, 0, w, h);

    // Subtle 1px top-edge highlight adds gentle depth
    if (state !== "pressed" && state !== "disabled") {
      this.bg.fillStyle(0xffffff, 0.05);
      this.bg.fillRect(2, 1, w - 4, 1);
    }

    this.bg.lineStyle(
      theme.shape.control.borderWidth,
      borderColor,
      borderAlpha,
    );
    this.bg.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    const theme = getTheme();
    if (!this.hitZone) return;
    if (disabled) {
      if (this.idleShimmerTween) {
        this.idleShimmerTween.stop();
        this.idleShimmerTween = null;
      }
      this.drawBg("disabled");
      this.hitZone.disableInteractive();
      this.label.setColor(colorToString(theme.color.text.muted));
      this.accentLine.setAlpha(0.25);
      // Disabled buttons cannot be focused; drop focus if we had it.
      if (this.isFocused) {
        this.focusManager?.setFocus(null);
      }
    } else {
      this.drawBg("normal");
      this.setupInteractive();
      this.label.setColor(colorToString(theme.color.text.primary));
      this.accentLine.setAlpha(0.4);
    }
  }

  // ── Focusable ────────────────────────────────────────────────────────────

  /** Programmatically focus or blur this button. */
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
    return !this.isDisabled && this.visible && this.active;
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isFocused || this.isDisabled || !this.visible) return;
    if (event.code === "Enter" || event.code === "Space") {
      playUiSfx("ui_click_primary");
      this.onClickFn();
      event.preventDefault();
    }
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  /**
   * Visually toggle the button's "selected" state for use in button groups
   * (e.g. preset pickers, tabs). When highlighted, the button uses the
   * hover texture and a brighter accent line so the current selection is
   * visible at a glance.
   *
   * NOTE: Phaser's `GameObject.setActive` sets an `active: boolean` flag
   * with no visual effect; we override it with the same signature so
   * existing call sites `btn.setActive(true)` light up as expected.
   */
  override setActive(value: boolean): this {
    super.setActive(value);
    if (this.isDisabled) return this;
    const theme = getTheme();
    if (value) {
      // Stop the idle shimmer — selected state shouldn't pulse.
      if (this.idleShimmerTween) {
        this.idleShimmerTween.stop();
        this.idleShimmerTween = null;
      }
      this.drawBg("hover");
      this.accentLine.setAlpha(1);
      this.accentLine.setFillStyle(theme.color.accent.primary);
      this.label.setColor(colorToString(theme.color.accent.primary));
    } else {
      this.drawBg("normal");
      this.accentLine.setAlpha(0.4);
      this.accentLine.setFillStyle(theme.color.accent.primary);
      this.label.setColor(colorToString(theme.color.text.primary));
      this.startIdleShimmer();
    }
    return this;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    this.hitZone?.setDepth(value);
    return this;
  }

  override setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    this.syncHitZonePosition();
    return this;
  }

  /**
   * Resize the button's background, accent line, and hit zone in place,
   * and re-anchor the label to the new center.
   *
   * Note: this is the layout-driven escape hatch for `autoWidth: true`
   * buttons that need to flex with their container. Buttons measured to
   * their label at construction time still own their `widthPx`; calling
   * `setSize` overrides that.
   */
  override setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.widthPx = width;
    this.heightPx = height;
    // Children are constructed after the super.setSize() call in the
    // constructor; guard so the initial sizing call doesn't crash.
    if (this.bg) this.drawBg(this._btnState);
    if (this.accentLine) {
      this.accentLine.setPosition(2, height - 1);
      this.accentLine.setSize(width - 4, 1);
    }
    this.label?.setPosition(width / 2, height / 2);
    this.focusRing?.setSize(width, height);
    if (this.hitZone) {
      this.hitZone.setSize(
        width + this.hitPaddingX * 2,
        height + this.hitPaddingY * 2,
      );
      this.syncHitZonePosition();
    }
    return this;
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    if (!this.hitZone) {
      return this;
    }
    if (value && !this.isDisabled) {
      this.hitZone.setActive(true);
      this.hitZone.setInteractive({ useHandCursor: true });
      if (this.hitZone.input) {
        this.hitZone.input.cursor = "pointer";
      }
    } else {
      this.hitZone.disableInteractive();
      this.hitZone.setActive(false);
    }
    return this;
  }

  override destroy(fromScene?: boolean): void {
    if (this.idleShimmerTween) {
      this.idleShimmerTween.stop();
      this.idleShimmerTween = null;
    }
    if (this.keyHandler && this.scene) {
      this.scene.input.keyboard?.off("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.focusManager?.unregister(this);
    this.focusManager = null;
    this.hitZone?.destroy();
    this.hitZone = null;
    super.destroy(fromScene);
  }

  /**
   * Keep the scene-level hitZone aligned with the button's world position,
   * accounting for any parent container transforms (e.g. scroll offset).
   */
  private syncHitZonePosition(): void {
    if (!this.hitZone) return;
    const m = this.getWorldTransformMatrix();
    this.hitZone.setPosition(m.tx + this.widthPx / 2, m.ty + this.heightPx / 2);
  }

  preUpdate(): void {
    this.syncHitZonePosition();
  }
}
