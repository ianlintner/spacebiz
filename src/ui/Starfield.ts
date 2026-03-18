import Phaser from "phaser";

export interface StarfieldConfig {
  count?: number; // default 120
  drift?: boolean; // default true — slow parallax drift
  depth?: number; // default -100
}

export function createStarfield(
  scene: Phaser.Scene,
  config?: StarfieldConfig,
): Phaser.GameObjects.Container {
  const count = config?.count ?? 120;
  const drift = config?.drift ?? true;
  const depth = config?.depth ?? -100;

  const container = scene.add.container(0, 0);
  container.setDepth(depth);

  for (let i = 0; i < count; i++) {
    const x = Math.random() * 1280;
    const y = Math.random() * 720;
    const alpha = 0.15 + Math.random() * 0.55; // 0.15 to 0.7
    const scale = 0.3 + Math.random() * 0.7; // 0.3 to 1.0

    const star = scene.add
      .image(x, y, "glow-dot")
      .setAlpha(alpha)
      .setScale(scale);

    // Slight color variation — most white, some blue-ish, some yellow-ish
    const colorRoll = Math.random();
    if (colorRoll > 0.85) star.setTint(0xaaccff); // blue
    else if (colorRoll > 0.7) star.setTint(0xffffcc); // yellow

    container.add(star);

    if (drift) {
      const driftX = -3 + Math.random() * 6;
      const driftY = -3 + Math.random() * 6;
      const duration = 8000 + Math.random() * 7000; // 8-15s
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
  }

  return container;
}
