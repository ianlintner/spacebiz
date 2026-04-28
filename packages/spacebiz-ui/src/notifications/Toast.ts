import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastConfig {
  message: string;
  kind?: ToastKind;
  /** Auto-dismiss after this many ms. Defaults to 3000. Use 0 for sticky. */
  durationMs?: number;
  /** Maximum width before the message wraps. Defaults to 320. */
  width?: number;
  onDismiss?: () => void;
}

const PADDING_X = 14;
const PADDING_Y = 10;
const SLIDE_DURATION = 220;

/**
 * Single transient corner notification. Slides in from the right edge,
 * auto-dismisses after `durationMs`, and can be dismissed by clicking.
 *
 * Toasts are normally created and laid out by `ToastManager`; instantiate
 * directly only for one-off cases.
 */
export class Toast extends Phaser.GameObjects.Container {
  readonly toastWidth: number;
  readonly toastHeight: number;
  readonly kind: ToastKind;
  private dismissed = false;
  private autoTimer: Phaser.Time.TimerEvent | null = null;
  private readonly onDismissFn?: () => void;

  constructor(scene: Phaser.Scene, config: ToastConfig) {
    super(scene, 0, 0);
    const theme = getTheme();
    const kind = config.kind ?? "info";
    this.kind = kind;
    this.onDismissFn = config.onDismiss;

    const maxWidth = config.width ?? 320;
    const innerWidth = maxWidth - PADDING_X * 2;

    const fg = kindForeground(theme, kind);
    // All kinds share the panel background; the accent strip + border signal kind.
    const bg = theme.colors.panelBg;

    const text = scene.add.text(PADDING_X, PADDING_Y, config.message, {
      fontFamily: theme.fonts.body.family,
      fontSize: `${theme.fonts.body.size}px`,
      color: colorToString(theme.colors.text),
      wordWrap: { width: innerWidth },
    });

    const measuredWidth = Math.min(maxWidth, text.width + PADDING_X * 2);
    const measuredHeight = text.height + PADDING_Y * 2;

    this.toastWidth = measuredWidth;
    this.toastHeight = measuredHeight;

    const background = scene.add
      .rectangle(0, 0, measuredWidth, measuredHeight, bg, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, fg, 0.85);

    // Left accent strip — kind indicator.
    const accent = scene.add
      .rectangle(0, 0, 4, measuredHeight, fg, 1)
      .setOrigin(0, 0);

    background.setInteractive({ useHandCursor: true });
    background.on("pointerup", () => this.dismiss());

    this.add([background, accent, text]);
    scene.add.existing(this);

    const duration = config.durationMs ?? 3000;
    if (duration > 0) {
      this.autoTimer = scene.time.delayedCall(duration, () => this.dismiss());
    }
  }

  /**
   * Animate the toast to the given top-right anchor. Called by the manager.
   * `targetX` is the right edge to align the toast's right side to.
   */
  slideTo(targetX: number, targetY: number, animate: boolean): void {
    const finalX = targetX - this.toastWidth;
    if (!animate || !this.scene) {
      this.setPosition(finalX, targetY);
      return;
    }
    this.scene.tweens.add({
      targets: this,
      x: finalX,
      y: targetY,
      duration: SLIDE_DURATION,
      ease: "Cubic.easeOut",
    });
  }

  /** Dismiss this toast. Idempotent. */
  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    this.autoTimer?.remove(false);
    this.autoTimer = null;
    this.onDismissFn?.();
    if (!this.scene) {
      this.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: SLIDE_DURATION,
      ease: "Cubic.easeIn",
      onComplete: () => this.destroy(),
    });
  }

  isDismissed(): boolean {
    return this.dismissed;
  }
}

function kindForeground(
  theme: ReturnType<typeof getTheme>,
  kind: ToastKind,
): number {
  switch (kind) {
    case "success":
      return theme.colors.profit;
    case "warning":
      return theme.colors.warning;
    case "error":
      return theme.colors.loss;
    case "info":
    default:
      return theme.colors.accent;
  }
}
