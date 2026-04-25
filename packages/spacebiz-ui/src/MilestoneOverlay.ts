/**
 * MilestoneOverlay — full-screen "dopamine burst" announcements.
 *
 * Shows for a moment then auto-dismisses. Used for:
 *   - Profitable turns ("PROFITABLE!")
 *   - Profit streaks ("🔥 5-TURN STREAK!")
 *   - Record profits ("NEW RECORD!")
 *   - Bankruptcy warnings ("BANKRUPTCY WARNING")
 *   - Big losses ("HEAVY LOSSES")
 *
 * Usage:
 *   MilestoneOverlay.show(scene, "profit_streak", "🔥 4-Turn Streak!", "Keep it up!");
 */
import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { fitFontSize } from "./TextMetrics.ts";

export type MilestoneType =
  | "big_profit"
  | "profit_streak"
  | "record_profit"
  | "loss_warning"
  | "bankruptcy_warning"
  | "event_opportunity"
  | "event_hazard"
  | "sim_complete";

const TYPE_COLORS: Record<
  MilestoneType,
  { bg: number; text: number; glow: number }
> = {
  big_profit: { bg: 0x003322, text: 0x00ff88, glow: 0x00ff88 },
  profit_streak: { bg: 0x1a1100, text: 0xffcc00, glow: 0xffcc00 },
  record_profit: { bg: 0x001133, text: 0x00ccff, glow: 0x00ccff },
  loss_warning: { bg: 0x220000, text: 0xff6600, glow: 0xff4400 },
  bankruptcy_warning: { bg: 0x330000, text: 0xff2222, glow: 0xff0000 },
  event_opportunity: { bg: 0x001133, text: 0x00ccff, glow: 0x0088ff },
  event_hazard: { bg: 0x221100, text: 0xff8800, glow: 0xff4400 },
  sim_complete: { bg: 0x001122, text: 0x00ffcc, glow: 0x00ffcc },
};

export class MilestoneOverlay {
  static show(
    scene: Phaser.Scene,
    type: MilestoneType,
    headline: string,
    subtext?: string,
    onComplete?: () => void,
    options?: { holdDuration?: number },
  ): void {
    const theme = getTheme();
    const colors = TYPE_COLORS[type];
    const cam = scene.cameras.main;
    // Account for camera zoom — scrollFactor(0) ignores scroll but not zoom
    const GAME_WIDTH = cam.width / cam.zoom;
    const GAME_HEIGHT = cam.height / cam.zoom;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const depth = 900;

    // Full-screen dim overlay
    const overlay = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setAlpha(0)
      .setScrollFactor(0);

    // Center banner background
    const bannerH = subtext ? 150 : 120;
    const bannerW = Math.min(GAME_WIDTH - 60, 740);

    // Fully opaque dark backing so nothing bleeds through
    const bannerBacking = scene.add
      .rectangle(cx, cy, bannerW + 6, bannerH + 6, 0x000000, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1)
      .setAlpha(0)
      .setScrollFactor(0);

    const banner = scene.add
      .rectangle(cx, cy, bannerW, bannerH, colors.bg, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1)
      .setAlpha(0)
      .setScrollFactor(0);

    // Inner glow / vignette around the banner edges
    const innerGlow = scene.add
      .graphics()
      .setDepth(depth + 1)
      .setAlpha(0)
      .setScrollFactor(0);
    innerGlow.lineStyle(8, colors.glow, 0.15);
    innerGlow.strokeRect(
      cx - bannerW / 2 + 4,
      cy - bannerH / 2 + 4,
      bannerW - 8,
      bannerH - 8,
    );

    // Glow border
    const border = scene.add
      .graphics()
      .setDepth(depth + 1)
      .setScrollFactor(0);
    const drawBorder = (alpha: number) => {
      border.clear();
      border.lineStyle(2, colors.glow, alpha);
      border.strokeRect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH);
    };
    drawBorder(0);

    // Headline text — pick the largest font size that fits the banner
    const headlineFontSize = fitFontSize(
      scene,
      headline,
      theme.fonts.heading.family,
      bannerW - 48,
      [54, 44, 34, 26, 20],
    );
    const headlineTxt = scene.add
      .text(cx, cy - (subtext ? 28 : 0), headline, {
        fontSize: `${headlineFontSize}px`,
        fontFamily: theme.fonts.heading.family,
        fontStyle: "bold",
        color: colorToString(colors.text),
        stroke: "#000000",
        strokeThickness: 5,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: colorToString(colors.glow),
          blur: 12,
          fill: true,
        },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2)
      .setAlpha(0)
      .setScale(0.5)
      .setScrollFactor(0);

    // Subtext
    let subtextObj: Phaser.GameObjects.Text | null = null;
    if (subtext) {
      subtextObj = scene.add
        .text(cx, cy + 32, subtext, {
          fontSize: `${theme.fonts.body.size + 2}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
          stroke: "#000000",
          strokeThickness: 3,
          padding: { x: 8, y: 4 },
          backgroundColor: "rgba(0,0,0,0.5)",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(depth + 2)
        .setAlpha(0)
        .setScrollFactor(0);
    }

    // Shimmer particles — 8 radial dots bursting outward
    const shimmerDots: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 10; i++) {
      const dot = scene.add
        .circle(cx, cy, 4, colors.glow, 0)
        .setDepth(depth + 1)
        .setScrollFactor(0);
      shimmerDots.push(dot);
    }

    // ── Animation sequence ──────────────────────────────────
    // Phase 1: slam in (150ms)
    scene.tweens.add({
      targets: overlay,
      alpha: 0.75,
      duration: 120,
      ease: "Linear",
    });
    scene.tweens.add({
      targets: bannerBacking,
      alpha: 1,
      duration: 100,
      ease: "Linear",
    });
    scene.tweens.add({
      targets: banner,
      alpha: 0.95,
      duration: 120,
      ease: "Linear",
    });
    scene.tweens.add({
      targets: innerGlow,
      alpha: 1,
      duration: 200,
      ease: "Linear",
    });
    scene.tweens.add({
      targets: headlineTxt,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 220,
      ease: "Back.easeOut",
      onComplete: () => {
        // draw bright border at peak
        drawBorder(0.9);
        // Phase 2: shimmer burst
        shimmerDots.forEach((dot, i) => {
          const angle = (i / shimmerDots.length) * Math.PI * 2;
          const radius = bannerW * 0.55;
          scene.tweens.add({
            targets: dot,
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            alpha: { from: 0.8, to: 0 },
            duration: 500,
            ease: "Cubic.easeOut",
          });
        });
      },
    });

    if (subtextObj) {
      scene.tweens.add({
        targets: subtextObj,
        alpha: 1,
        duration: 250,
        delay: 180,
        ease: "Linear",
      });
    }

    // Phase 3: hold then fade out
    const holdDuration = options?.holdDuration ?? 1400;
    const fadeOutDuration = 380;
    const allObjects: Phaser.GameObjects.GameObject[] = [
      overlay,
      bannerBacking,
      banner,
      innerGlow,
      border,
      headlineTxt,
      ...shimmerDots,
    ];
    if (subtextObj) allObjects.push(subtextObj);

    scene.time.delayedCall(holdDuration, () => {
      scene.tweens.add({
        targets: allObjects,
        alpha: 0,
        duration: fadeOutDuration,
        ease: "Linear",
        onComplete: () => {
          for (const obj of allObjects) {
            obj.destroy();
          }
          onComplete?.();
        },
      });
    });
  }
}
