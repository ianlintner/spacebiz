import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";

export type TextInputType = "text" | "password" | "number";

export interface TextInputConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  type?: TextInputType;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

/**
 * Single-line text input. Phaser has no native DOM-free text input, so this
 * positions an absolutely-positioned <input> element on top of the canvas
 * synchronized to the component's screen-space rect each frame. The Phaser
 * rectangle/text underneath is a visual fallback that's hidden whenever the
 * DOM overlay is mounted (i.e. always, in browsers).
 */
export class TextInput extends Phaser.GameObjects.Container {
  private bgRect: Phaser.GameObjects.Rectangle;
  private fallbackText: Phaser.GameObjects.Text;
  private domInput: HTMLInputElement | null = null;
  private readonly widthPx: number;
  private readonly heightPx: number;
  private readonly maxLength?: number;
  private readonly onChange?: (value: string) => void;
  private readonly onSubmit?: (value: string) => void;
  private currentValue: string;
  private resizeListener: (() => void) | null = null;
  private scrollListener: (() => void) | null = null;
  private destroyed = false;

  constructor(scene: Phaser.Scene, config: TextInputConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.widthPx = config.width;
    this.heightPx = config.height;
    this.maxLength = config.maxLength;
    this.onChange = config.onChange;
    this.onSubmit = config.onSubmit;
    this.currentValue = config.value ?? "";
    this.setSize(config.width, config.height);

    this.bgRect = scene.add
      .rectangle(0, 0, config.width, config.height, theme.colors.panelBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.7);

    // Fallback text — visible only in headless / non-browser test environments
    // where we can't mount a real DOM input.
    this.fallbackText = scene.add
      .text(8, config.height / 2, this.displayText(config.placeholder), {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(
          this.currentValue ? theme.colors.text : theme.colors.textDim,
        ),
      })
      .setOrigin(0, 0.5);

    this.add([this.bgRect, this.fallbackText]);
    scene.add.existing(this);

    this.tryMountDomInput(config);

    // Tear down the DOM overlay when the scene shuts down or this object
    // is destroyed; teardownDom is idempotent via the `destroyed` guard.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownDom());
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.teardownDom());
  }

  private displayText(placeholder?: string): string {
    if (this.currentValue) return this.currentValue;
    return placeholder ?? "";
  }

  private tryMountDomInput(config: TextInputConfig): void {
    // Only mount when a real DOM is available (skip in node test envs).
    if (typeof document === "undefined") return;

    const theme = getTheme();
    const input = document.createElement("input");
    input.type = config.type ?? "text";
    input.value = this.currentValue;
    if (config.placeholder) input.placeholder = config.placeholder;
    if (this.maxLength !== undefined) input.maxLength = this.maxLength;

    // Theme-driven base styling. Position is computed each frame.
    input.style.position = "absolute";
    input.style.boxSizing = "border-box";
    input.style.margin = "0";
    input.style.padding = "0 8px";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.background = "transparent";
    input.style.color = colorToString(theme.colors.text);
    input.style.fontFamily = theme.fonts.body.family;
    input.style.fontSize = `${theme.fonts.body.size}px`;
    input.style.zIndex = "10";
    input.style.pointerEvents = "auto";

    document.body.appendChild(input);
    this.domInput = input;
    // Hide the fallback text once DOM is mounted; the <input> renders text.
    this.fallbackText.setVisible(false);

    input.addEventListener("input", () => {
      this.currentValue = input.value;
      this.onChange?.(this.currentValue);
    });
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        this.onSubmit?.(this.currentValue);
      }
    });

    // Reposition on resize/scroll (canvas may move or DPR may change).
    this.resizeListener = () => this.syncDomPosition();
    this.scrollListener = () => this.syncDomPosition();
    window.addEventListener("resize", this.resizeListener);
    window.addEventListener("scroll", this.scrollListener, true);

    this.syncDomPosition();
  }

  /**
   * Phaser's preUpdate runs every frame; we use it to keep the DOM input
   * pinned to the container's world position even if the parent moves.
   */
  preUpdate(): void {
    if (this.domInput) this.syncDomPosition();
  }

  private syncDomPosition(): void {
    if (!this.domInput || this.destroyed) return;
    const canvas = this.scene.game.canvas as HTMLCanvasElement | undefined;
    if (!canvas || !canvas.getBoundingClientRect) return;

    const rect = canvas.getBoundingClientRect();
    // Phaser scales the internal resolution to fit the canvas element; map
    // game coordinates to CSS pixels via the displayed canvas size.
    const scaleX = rect.width / this.scene.scale.width;
    const scaleY = rect.height / this.scene.scale.height;

    const m = this.getWorldTransformMatrix();
    const cssLeft = rect.left + m.tx * scaleX;
    const cssTop = rect.top + m.ty * scaleY;
    const cssW = this.widthPx * scaleX;
    const cssH = this.heightPx * scaleY;

    const style = this.domInput.style;
    style.left = `${cssLeft}px`;
    style.top = `${cssTop}px`;
    style.width = `${cssW}px`;
    style.height = `${cssH}px`;
    style.display = this.visible ? "block" : "none";
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    if (this.domInput) {
      this.domInput.style.display = value ? "block" : "none";
    }
    return this;
  }

  getValue(): string {
    return this.currentValue;
  }

  setValue(value: string): void {
    this.currentValue = value;
    if (this.domInput) this.domInput.value = value;
    else this.fallbackText.setText(value);
  }

  focus(): void {
    this.domInput?.focus();
  }

  private teardownDom(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
      this.resizeListener = null;
    }
    if (this.scrollListener) {
      window.removeEventListener("scroll", this.scrollListener, true);
      this.scrollListener = null;
    }
    if (this.domInput && this.domInput.parentNode) {
      this.domInput.parentNode.removeChild(this.domInput);
    }
    this.domInput = null;
  }

  override destroy(fromScene?: boolean): void {
    this.teardownDom();
    super.destroy(fromScene);
  }
}
