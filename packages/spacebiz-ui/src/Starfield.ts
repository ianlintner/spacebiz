import Phaser from "phaser";
import { lerpColor, getTheme } from "./Theme.ts";
import { addTwinkleTween, registerAmbientCleanup } from "./AmbientFX.ts";

export interface StarfieldConfig {
  count?: number; // default 120
  drift?: boolean; // default true — slow parallax drift
  depth?: number; // default -100
  /** Staggered alpha twinkle on ~35 % of stars. Default true. */
  twinkle?: boolean;
  /** Slow tint colour-cycle on ~15 % of white stars. Default true. */
  shimmer?: boolean;
}

export function createStarfield(
  scene: Phaser.Scene,
  config?: StarfieldConfig,
): Phaser.GameObjects.Container {
  const count = config?.count ?? 120;
  const drift = config?.drift ?? true;
  const depth = config?.depth ?? -100;
  const twinkle = config?.twinkle ?? true;
  const shimmer = config?.shimmer ?? true;

  const theme = getTheme();
  const { ambient } = theme;

  const container = scene.add.container(0, 0);
  container.setDepth(depth);

  // Ambient tweens that need explicit cleanup on scene shutdown
  const ambientTweens: Phaser.Tweens.Tween[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * 1280;
    const y = Math.random() * 720;
    const baseAlpha = 0.15 + Math.random() * 0.55; // 0.15 – 0.7
    const scale = 0.3 + Math.random() * 0.7; // 0.3 – 1.0

    const star = scene.add
      .image(x, y, "glow-dot")
      .setAlpha(baseAlpha)
      .setScale(scale);

    // Colour variation — most white, some blue, some yellow
    const colorRoll = Math.random();
    let isWhiteStar = true;
    if (colorRoll > 0.85) {
      star.setTint(0xaaccff); // blue
      isWhiteStar = false;
    } else if (colorRoll > 0.7) {
      star.setTint(0xffffcc); // yellow
      isWhiteStar = false;
    }

    container.add(star);

    // ── Layer 1: positional drift (unchanged behaviour) ───────────────────
    if (drift) {
      const driftX = -3 + Math.random() * 6;
      const driftY = -3 + Math.random() * 6;
      const duration = 8000 + Math.random() * 7000; // 8 – 15 s
      scene.tweens.add({
        targets: star,
        x: x + driftX,
        y: y + driftY,
        duration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // ── Layer 2: staggered twinkle on ~35 % of stars ───────────────────────
    if (twinkle && Math.random() > 0.65) {
      const tw = addTwinkleTween(scene, star, {
        minAlpha: Math.max(0.05, baseAlpha * 0.3),
        maxAlpha: Math.min(0.95, baseAlpha * 1.65),
        minDuration: ambient.starTwinkleDurationMin,
        maxDuration: ambient.starTwinkleDurationMax,
        // Random stagger offset so pulses stay desynchronised
        delay: Math.random() * ambient.starTwinkleDurationMax,
      });
      ambientTweens.push(tw);
    }

    // ── Layer 3: slow tint shimmer on ~15 % of white stars ────────────────
    if (shimmer && isWhiteStar && Math.random() > 0.85) {
      const shimmerObj = { t: 0 };
      const dur = ambient.starShimmerDuration + Math.random() * 4000;
      const tw = scene.tweens.add({
        targets: shimmerObj,
        t: 1,
        duration: dur,
        delay: Math.random() * dur,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          star.setTint(lerpColor(0xffffff, 0xaaccff, shimmerObj.t));
        },
      });
      ambientTweens.push(tw);
    }
  }

  // Register cleanup so perpetual tweens stop cleanly on scene shutdown
  if (ambientTweens.length > 0) {
    registerAmbientCleanup(scene, ambientTweens);
  }

  return container;
}
