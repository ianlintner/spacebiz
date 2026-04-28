import * as Phaser from "phaser";
import { getTheme } from "../Theme.ts";

export interface SpinnerConfig {
  x: number;
  y: number;
  /** Diameter in pixels. Default 24. */
  size?: number;
  /** Stroke color. Defaults to theme accent. */
  color?: number;
  /** Full rotation duration in ms. Default 900. */
  durationMs?: number;
}

/**
 * Small inline rotating loading indicator. Draws an arc that spins;
 * `start()` (auto-called in constructor) begins the tween, `stop()` halts it,
 * `destroy()` cleans up. Theme-driven default color.
 */
export class Spinner extends Phaser.GameObjects.Container {
  private arc: Phaser.GameObjects.Graphics;
  private tween: Phaser.Tweens.Tween | null = null;
  private readonly diameter: number;
  private readonly strokeColor: number;
  private readonly durationMs: number;
  private spinning = false;

  constructor(scene: Phaser.Scene, config: SpinnerConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.diameter = config.size ?? 24;
    this.strokeColor = config.color ?? theme.colors.accent;
    this.durationMs = config.durationMs ?? 900;

    this.arc = scene.add.graphics();
    this.drawArc();
    this.add(this.arc);
    this.setSize(this.diameter, this.diameter);

    scene.add.existing(this);
    this.start();

    this.once("destroy", () => this.stopTween());
  }

  private drawArc(): void {
    const radius = this.diameter / 2;
    const lineWidth = Math.max(2, Math.round(this.diameter / 8));
    this.arc.clear();
    // Background ring (faint)
    this.arc.lineStyle(lineWidth, this.strokeColor, 0.2);
    this.arc.strokeCircle(0, 0, radius - lineWidth / 2);
    // Foreground arc (3/4 turn)
    this.arc.lineStyle(lineWidth, this.strokeColor, 1);
    this.arc.beginPath();
    this.arc.arc(
      0,
      0,
      radius - lineWidth / 2,
      0,
      Phaser.Math.DegToRad(270),
      false,
    );
    this.arc.strokePath();
  }

  start(): this {
    if (this.spinning) return this;
    this.spinning = true;
    this.arc.setRotation(0);
    this.tween = this.scene.tweens.add({
      targets: this.arc,
      rotation: Math.PI * 2,
      duration: this.durationMs,
      repeat: -1,
      ease: "Linear",
    });
    return this;
  }

  stop(): this {
    this.spinning = false;
    this.stopTween();
    return this;
  }

  isSpinning(): boolean {
    return this.spinning;
  }

  private stopTween(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
  }

  override destroy(fromScene?: boolean): void {
    this.stopTween();
    super.destroy(fromScene);
  }
}
