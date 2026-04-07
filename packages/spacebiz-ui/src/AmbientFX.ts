/**
 * Reusable ambient animation helpers.
 *
 * All helpers return the created Tween so callers can stop it manually.
 * Use registerAmbientCleanup() to auto-stop a batch of tweens on scene shutdown.
 */
import Phaser from "phaser";

// ─── Config interfaces ─────────────────────────────────────────────────────

export interface PulseConfig {
  minAlpha: number;
  maxAlpha: number;
  /** One half-cycle duration in ms (full in/out is 2× this). */
  duration: number;
  ease?: string;
  delay?: number;
}

export interface TwinkleConfig {
  minAlpha: number;
  maxAlpha: number;
  minDuration: number;
  maxDuration: number;
  /** Random delay up to maxDuration when omitted. */
  delay?: number;
}

export interface FloatConfig {
  /** Horizontal drift offset in pixels (yoyo). Positive = right. */
  dx: number;
  /** Vertical drift offset in pixels (yoyo). Negative = up. */
  dy: number;
  duration: number;
  ease?: string;
  delay?: number;
}

// ─── Tween helpers ─────────────────────────────────────────────────────────

/**
 * Infinite alpha pulse — yoyo, repeat -1.
 * Snaps to minAlpha on start then cycles to maxAlpha and back.
 */
export function addPulseTween(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: PulseConfig,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    alpha: { from: config.minAlpha, to: config.maxAlpha },
    duration: config.duration,
    delay: config.delay ?? 0,
    yoyo: true,
    repeat: -1,
    ease: config.ease ?? "Sine.easeInOut",
  });
}

/**
 * Staggered twinkle — random duration and optional random delay per star.
 * Each star gets a unique cycle length so pulses stay desynchronised.
 */
export function addTwinkleTween(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: TwinkleConfig,
): Phaser.Tweens.Tween {
  const duration =
    config.minDuration +
    Math.random() * (config.maxDuration - config.minDuration);
  const delay = config.delay ?? Math.random() * duration;
  return scene.tweens.add({
    targets: target,
    alpha: { from: config.minAlpha, to: config.maxAlpha },
    duration,
    delay,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

/**
 * Gentle positional float — yoyo, repeat -1.
 * Target moves dx/dy pixels away from its current position and back.
 */
export function addFloatTween(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  config: FloatConfig,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    x: `+=${config.dx}`,
    y: `+=${config.dy}`,
    duration: config.duration,
    delay: config.delay ?? 0,
    yoyo: true,
    repeat: -1,
    ease: config.ease ?? "Sine.easeInOut",
  });
}

/**
 * Smooth continuous rotation — full 360° per durationMs, repeat -1, Linear ease.
 * Clockwise by default (positive rotation direction in Phaser 3).
 */
export function addRotateTween(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  durationMs: number,
  clockwise = true,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    rotation: clockwise ? Math.PI * 2 : -Math.PI * 2,
    duration: durationMs,
    repeat: -1,
    ease: "Linear",
  });
}

// ─── Lifecycle helpers ──────────────────────────────────────────────────────

/**
 * Register a list of tweens to be stopped when the scene shuts down.
 * Safe to call multiple times per scene — each call binds its own listener.
 */
export function registerAmbientCleanup(
  scene: Phaser.Scene,
  tweens: Phaser.Tweens.Tween[],
): void {
  scene.events.once("shutdown", () => {
    for (const tween of tweens) {
      if (tween && tween.isPlaying()) {
        tween.stop();
      }
    }
  });
}

// ─── Screen flash ───────────────────────────────────────────────────────────

/**
 * Briefly flash the whole screen with a solid color then fade back out.
 * @param color   Hex color (e.g. 0x00ff88 for profit green, 0xff4444 for loss red)
 * @param peakAlpha  Maximum overlay opacity (0–1). 0.35 is a good default.
 * @param duration   Full flash duration in ms (rise + fall). Default 600ms.
 */
export function flashScreen(
  scene: Phaser.Scene,
  color: number,
  peakAlpha = 0.35,
  duration = 600,
): void {
  const cam = scene.cameras.main;
  const flash = scene.add
    .rectangle(0, 0, cam.width, cam.height, color, 0)
    .setOrigin(0, 0)
    .setDepth(950);

  scene.tweens.add({
    targets: flash,
    alpha: peakAlpha,
    duration: duration * 0.25,
    ease: "Linear",
    yoyo: true,
    onComplete: () => flash.destroy(),
  });
}
