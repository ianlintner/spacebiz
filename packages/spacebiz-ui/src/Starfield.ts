import * as Phaser from "phaser";
import { lerpColor, getTheme } from "./Theme.ts";
import { addTwinkleTween, registerAmbientCleanup } from "./AmbientFX.ts";

export interface StarfieldLayerConfig {
  count: number;
  scrollFactor: number;
  minAlpha: number;
  maxAlpha: number;
  minScale: number;
  maxScale: number;
  tints: number[];
  hazeAlpha?: number;
  hazeScale?: number;
}

export interface StarfieldWorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface StarfieldConfig {
  count?: number; // default 120
  drift?: boolean; // default true — slow parallax drift
  depth?: number; // default -100
  /** Staggered alpha twinkle on ~35 % of stars. Default true. */
  twinkle?: boolean;
  /** Slow tint colour-cycle on ~15 % of white stars. Default true. */
  shimmer?: boolean;
  width?: number;
  height?: number;
  centerX?: number;
  centerY?: number;
  worldBounds?: StarfieldWorldBounds;
  minZoom?: number;
  overscan?: number;
  edgeFeather?: number;
  haze?: boolean;
  layers?: StarfieldLayerConfig[];
}

/**
 * Handle returned from {@link createStarfield} so consumers (most usefully
 * scenes that reflow on resize) can re-fit the field to a new viewport
 * without owning the underlying objects directly.
 *
 * `setSize` is implemented as teardown + rebuild because stars are placed
 * with a fixed random seed at construction time; reflowing each star in
 * place would require remembering its normalised position and re-deriving
 * its drift tween targets, which costs more code than the few ms saved.
 * Mirrors the StandingsGraph reflow precedent.
 */
export interface StarfieldHandle {
  setSize: (width: number, height: number) => void;
  destroy: () => void;
}

const DEFAULT_LAYERS: StarfieldLayerConfig[] = [
  {
    count: 110,
    scrollFactor: 0.06,
    minAlpha: 0.14,
    maxAlpha: 0.38,
    minScale: 0.28,
    maxScale: 0.58,
    tints: [0xffffff, 0xffffff, 0xbfd8ff],
    hazeAlpha: 0.028,
    hazeScale: 3.2,
  },
  {
    count: 80,
    scrollFactor: 0.16,
    minAlpha: 0.2,
    maxAlpha: 0.52,
    minScale: 0.38,
    maxScale: 0.8,
    tints: [0xffffff, 0xffffff, 0xaaccff, 0xffffcc],
    hazeAlpha: 0.022,
    hazeScale: 2.4,
  },
  {
    count: 46,
    scrollFactor: 0.3,
    minAlpha: 0.28,
    maxAlpha: 0.68,
    minScale: 0.55,
    maxScale: 1.1,
    tints: [0xffffff, 0xaaccff, 0xffffcc],
    hazeAlpha: 0.014,
    hazeScale: 1.7,
  },
];

function resolveBounds(
  scene: Phaser.Scene,
  config?: StarfieldConfig,
): { centerX: number; centerY: number; width: number; height: number } {
  if (config?.worldBounds) {
    const { minX, maxX, minY, maxY } = config.worldBounds;
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  const width = config?.width ?? scene.scale.width;
  const height = config?.height ?? scene.scale.height;
  return {
    centerX: config?.centerX ?? width / 2,
    centerY: config?.centerY ?? height / 2,
    width,
    height,
  };
}

function getEdgeFade(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  spreadW: number,
  spreadH: number,
  feather: number,
): number {
  const nx = Math.abs((x - centerX) / Math.max(1, spreadW * 0.5));
  const ny = Math.abs((y - centerY) / Math.max(1, spreadH * 0.5));
  const edge = Math.max(nx, ny);
  const featherStart = Math.max(0.1, 1 - feather);
  if (edge <= featherStart) return 1;
  return Phaser.Math.Clamp(
    (1 - edge) / Math.max(0.001, 1 - featherStart),
    0,
    1,
  );
}

export function createStarfield(
  scene: Phaser.Scene,
  config?: StarfieldConfig,
): StarfieldHandle {
  // Track everything we add so setSize / destroy can tear it down cleanly.
  const containers: Phaser.GameObjects.Container[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  let destroyed = false;

  const build = (cfg: StarfieldConfig | undefined): void => {
    const drift = cfg?.drift ?? true;
    const depth = cfg?.depth ?? -100;
    const twinkle = cfg?.twinkle ?? true;
    const shimmer = cfg?.shimmer ?? true;
    const haze = cfg?.haze ?? true;
    const minZoom = Math.max(0.1, cfg?.minZoom ?? 1);
    const overscan = cfg?.overscan ?? 320;
    const edgeFeather = Phaser.Math.Clamp(cfg?.edgeFeather ?? 0.2, 0.05, 0.45);
    const layers = cfg?.layers ?? DEFAULT_LAYERS;

    const theme = getTheme();
    const { ambient } = theme;
    const bounds = resolveBounds(scene, cfg);
    const visibleW = scene.scale.width / minZoom;
    const visibleH = scene.scale.height / minZoom;

    for (const layer of layers) {
      // Each layer is a top-level scene object so setScrollFactor creates real parallax.
      // Nesting layers inside a parent Container breaks scrollFactor — Phaser ignores it
      // for Container children.
      const layerContainer = scene.add.container(0, 0);
      layerContainer.setScrollFactor(layer.scrollFactor);
      layerContainer.setDepth(depth);
      containers.push(layerContainer);

      const layerOverscanX =
        visibleW * (0.85 + (1 - layer.scrollFactor) * 1.65) + overscan;
      const layerOverscanY =
        visibleH * (0.85 + (1 - layer.scrollFactor) * 1.65) + overscan;
      const spreadW = bounds.width + layerOverscanX * 2;
      const spreadH = bounds.height + layerOverscanY * 2;

      if (
        haze &&
        layer.hazeAlpha &&
        layer.hazeScale &&
        scene.textures.exists("glow-dot")
      ) {
        const hazeCount = layer.scrollFactor < 0.2 ? 3 : 2;
        for (let i = 0; i < hazeCount; i++) {
          const hazeTint = layer.tints[i % layer.tints.length] ?? 0xffffff;
          const hazeX =
            bounds.centerX + (Math.random() - 0.5) * bounds.width * 0.65;
          const hazeY =
            bounds.centerY + (Math.random() - 0.5) * bounds.height * 0.65;
          const hazeSprite = scene.add
            .image(hazeX, hazeY, "glow-dot")
            .setTint(hazeTint)
            .setAlpha(layer.hazeAlpha * (0.7 + Math.random() * 0.5))
            .setScale(
              (Math.max(bounds.width, bounds.height) / 64) * layer.hazeScale,
            )
            .setBlendMode(Phaser.BlendModes.ADD);
          layerContainer.add(hazeSprite);
        }
      }

      for (let i = 0; i < layer.count; i++) {
        const x = bounds.centerX + (Math.random() - 0.5) * spreadW;
        const y = bounds.centerY + (Math.random() - 0.5) * spreadH;
        const edgeFade = getEdgeFade(
          x,
          y,
          bounds.centerX,
          bounds.centerY,
          spreadW,
          spreadH,
          edgeFeather,
        );
        const alphaRange = layer.maxAlpha - layer.minAlpha;
        const baseAlpha =
          (layer.minAlpha + Math.random() * alphaRange) *
          (0.3 + edgeFade * 0.7);
        const scale =
          layer.minScale + Math.random() * (layer.maxScale - layer.minScale);

        const star = scene.add
          .image(x, y, "glow-dot")
          .setAlpha(baseAlpha)
          .setScale(scale);

        const tint =
          layer.tints[Math.floor(Math.random() * layer.tints.length)] ??
          0xffffff;
        const isWhiteStar = tint === 0xffffff;
        if (tint !== 0xffffff) {
          star.setTint(tint);
        }

        layerContainer.add(star);

        if (drift) {
          const driftX =
            (-2 + Math.random() * 4) * (0.8 + layer.scrollFactor * 0.6);
          const driftY =
            (-2 + Math.random() * 4) * (0.8 + layer.scrollFactor * 0.6);
          const duration = 7000 + Math.random() * 9000;
          const tween = scene.tweens.add({
            targets: star,
            x: x + driftX,
            y: y + driftY,
            duration,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          tweens.push(tween);
        }

        if (twinkle && Math.random() > 0.65) {
          const tw = addTwinkleTween(scene, star, {
            minAlpha: Math.max(0.03, baseAlpha * 0.28),
            maxAlpha: Math.min(0.95, baseAlpha * 1.55),
            minDuration: ambient.starTwinkleDurationMin,
            maxDuration: ambient.starTwinkleDurationMax,
            delay: Math.random() * ambient.starTwinkleDurationMax,
          });
          tweens.push(tw);
        }

        if (shimmer && isWhiteStar && Math.random() > 0.84) {
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
          tweens.push(tw);
        }
      }
    }

    // Register cleanup so perpetual tweens stop cleanly on scene shutdown
    if (tweens.length > 0) {
      registerAmbientCleanup(scene, tweens);
    }
  };

  const teardown = (): void => {
    for (const tw of tweens) {
      tw.stop();
    }
    tweens.length = 0;
    for (const c of containers) {
      c.destroy();
    }
    containers.length = 0;
  };

  build(config);

  return {
    setSize: (width: number, height: number): void => {
      if (destroyed) return;
      // Reflow strategy: destroy and rebuild with the new bounds. Stars are
      // randomly placed, so regenerating with the same config produces a
      // visually equivalent field at the new size. Cheaper in code than
      // remembering each star's normalised position + drift origin.
      teardown();
      // Drop centerX/centerY from the original config so resolveBounds can
      // re-derive them from the new width/height — keeping the old centres
      // would offset the field against the resized viewport.
      const next: StarfieldConfig = { ...(config ?? {}), width, height };
      next.centerX = undefined;
      next.centerY = undefined;
      build(next);
    },
    destroy: (): void => {
      if (destroyed) return;
      destroyed = true;
      teardown();
    },
  };
}
