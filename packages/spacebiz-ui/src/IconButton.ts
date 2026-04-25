import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";

export interface IconButtonConfig {
  x: number;
  y: number;
  /** Texture key for the icon image (e.g. "icon-map", "icon-fleet"). */
  icon: string;
  /** Size of the button in pixels (square). Default 40. */
  size?: number;
  /** Tooltip-style label shown next to the icon. */
  label?: string;
  /** Called when clicked. */
  onClick: () => void;
  /** Tint color applied to the icon at rest (default: textDim). */
  tint?: number;
  /** Tint color applied when hovered (default: accent). */
  hoverTint?: number;
  /** If true, shows active/selected state. */
  active?: boolean;
  disabled?: boolean;
}

/**
 * A compact icon-only (or icon + label) button used for nav sidebars,
 * toolbar actions, and quick-access controls. Smaller and sleeker than
 * the full Button, matches the HUD navigation style.
 */
export class IconButton extends Phaser.GameObjects.Container {
  private bgRect: Phaser.GameObjects.Rectangle;
  private iconImage: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text | null = null;
  private activeIndicator: Phaser.GameObjects.Rectangle;
  private isActive: boolean;
  private isDisabled: boolean;

  constructor(scene: Phaser.Scene, config: IconButtonConfig) {
    const btnSize = config.size ?? 40;
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.isActive = config.active ?? false;
    this.isDisabled = config.disabled ?? false;

    const restTint = config.tint ?? theme.colors.textDim;
    const hoverTint = config.hoverTint ?? theme.colors.accent;

    // Background
    this.bgRect = scene.add
      .rectangle(0, 0, btnSize, btnSize, theme.colors.panelBg, 0)
      .setOrigin(0, 0);
    this.add(this.bgRect);

    // Icon
    this.iconImage = scene.add
      .image(btnSize / 2, btnSize / 2, config.icon)
      .setOrigin(0.5)
      .setTint(this.isActive ? hoverTint : restTint);
    if (this.isDisabled) this.iconImage.setAlpha(0.35);
    this.add(this.iconImage);

    // Active indicator (left accent bar)
    this.activeIndicator = scene.add
      .rectangle(0, 0, 3, btnSize, theme.colors.accent, this.isActive ? 0.8 : 0)
      .setOrigin(0, 0);
    this.add(this.activeIndicator);

    // Optional label to the right of icon
    if (config.label) {
      this.labelText = scene.add
        .text(btnSize + 6, btnSize / 2, config.label, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(
            this.isActive ? theme.colors.accent : theme.colors.textDim,
          ),
        })
        .setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    // Hit zone
    const hitWidth = config.label
      ? btnSize + 6 + (this.labelText?.width ?? 0) + 8
      : btnSize;
    const hitZone = scene.add
      .zone(hitWidth / 2, btnSize / 2, hitWidth, btnSize)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: !this.isDisabled });
    this.add(hitZone);

    if (!this.isDisabled) {
      hitZone.on("pointerover", () => {
        this.bgRect.setAlpha(0.3);
        this.bgRect.setFillStyle(theme.colors.rowHover, 0.3);
        this.iconImage.setTint(hoverTint);
        if (this.labelText)
          this.labelText.setColor(colorToString(theme.colors.accent));
        playUiSfx("ui_hover");
      });

      hitZone.on("pointerout", () => {
        this.bgRect.setAlpha(0);
        this.iconImage.setTint(this.isActive ? hoverTint : restTint);
        if (this.labelText) {
          this.labelText.setColor(
            colorToString(
              this.isActive ? theme.colors.accent : theme.colors.textDim,
            ),
          );
        }
      });

      hitZone.on("pointerdown", () => {
        playUiSfx("ui_click_primary");
        config.onClick();
      });
    }

    scene.add.existing(this);
  }

  /** Update the active/selected state visually. */
  setActiveState(active: boolean): this {
    const theme = getTheme();
    this.isActive = active;
    this.activeIndicator.setAlpha(active ? 0.8 : 0);
    this.iconImage.setTint(active ? theme.colors.accent : theme.colors.textDim);
    if (this.labelText) {
      this.labelText.setColor(
        colorToString(active ? theme.colors.accent : theme.colors.textDim),
      );
    }
    return this;
  }
}
