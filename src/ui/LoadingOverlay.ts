/**
 * LoadingOverlay — lightweight overlay shown during on-demand asset loads.
 *
 * Displayed as a semi-transparent veil over the current scene with a
 * pulsing label and a thin progress bar, matching the game's visual theme.
 *
 * Usage (promise-based):
 *
 *   import { withLoadingOverlay } from "../ui/LoadingOverlay.ts";
 *
 *   const key = await withLoadingOverlay(
 *     this,                                   // Phaser.Scene
 *     portraitLoader.ensureCeoPortrait(this, id),  // the Promise to wait on
 *     { label: "Loading portrait…" },         // optional options
 *   );
 *
 * Or show/hide manually:
 *
 *   const overlay = LoadingOverlay.show(scene, { label: "Loading…" });
 *   await somePromise;
 *   overlay.hide();
 */

import type * as Phaser from "phaser";

export interface LoadingOverlayOptions {
  /** Text shown below the bar. Defaults to "Loading…" */
  label?: string;
  /** Depth of the overlay container. Defaults to 9000. */
  depth?: number;
}

export class LoadingOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly barW: number;
  private readonly barX: number;
  private readonly barY: number;
  private pulse = 0;
  private updateEvent: Phaser.Time.TimerEvent | null = null;

  private constructor(scene: Phaser.Scene, opts: LoadingOverlayOptions) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const depth = opts.depth ?? 9000;

    // Semi-transparent veil
    const veil = scene.add.graphics();
    veil.fillStyle(0x010810, 0.72);
    veil.fillRect(0, 0, W, H);

    // Label
    this.label = scene.add
      .text(W / 2, H / 2 - 16, opts.label ?? "Loading…", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#3a8ab4",
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // Bar track + fill
    const trackW = Math.min(240, W * 0.4);
    const trackH = 3;
    this.barW = trackW;
    this.barX = W / 2 - trackW / 2;
    this.barY = H / 2 + 4;

    const track = scene.add.graphics();
    track.fillStyle(0x0d2033, 1);
    track.fillRect(this.barX - 1, this.barY - 1, trackW + 2, trackH + 2);

    this.bar = scene.add.graphics();

    this.container = scene.add
      .container(0, 0, [veil, this.label, track, this.bar])
      .setDepth(depth);

    // Animate the bar as an indeterminate shimmer
    this.updateEvent = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: this.tick,
      callbackScope: this,
    });

    this.tick();
  }

  private tick(): void {
    this.pulse = (this.pulse + 0.025) % 1;
    const filled = 0.3 + 0.5 * Math.abs(Math.sin(this.pulse * Math.PI * 2));
    const offset = this.pulse * (this.barW * (1 - filled));

    this.bar.clear();
    this.bar.fillStyle(0x3a8ab4, 0.7);
    this.bar.fillRect(
      this.barX + offset,
      this.barY,
      Math.floor(this.barW * filled),
      3,
    );
    // Bright leading edge
    this.bar.fillStyle(0x7eb8d4, 1);
    this.bar.fillRect(
      this.barX + offset + Math.floor(this.barW * filled) - 2,
      this.barY,
      2,
      3,
    );
  }

  /** Update the overlay label text while visible. */
  setLabel(text: string): void {
    this.label.setText(text);
  }

  /** Remove the overlay from the scene. */
  hide(): void {
    if (this.updateEvent) {
      this.updateEvent.destroy();
      this.updateEvent = null;
    }
    this.container.destroy();
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Show a loading overlay on the scene. Returns an instance with a `.hide()`
   * method you call when done.
   */
  static show(scene: Phaser.Scene, opts: LoadingOverlayOptions = {}): LoadingOverlay {
    return new LoadingOverlay(scene, opts);
  }
}

/**
 * Convenience wrapper: shows the overlay, awaits the promise, hides it, then
 * returns the resolved value. Re-throws if the promise rejects.
 *
 *   const key = await withLoadingOverlay(this, portraitLoader.ensureCeoPortrait(this, id));
 */
export async function withLoadingOverlay<T>(
  scene: Phaser.Scene,
  promise: Promise<T>,
  opts: LoadingOverlayOptions = {},
): Promise<T> {
  const overlay = LoadingOverlay.show(scene, opts);
  try {
    return await promise;
  } finally {
    overlay.hide();
  }
}
