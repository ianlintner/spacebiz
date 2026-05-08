import * as Phaser from "phaser";

// Lazy-cache module for generated radial-gradient star textures used by
// GalaxyView2D. Mirrors the gradient profile of GalaxyView3D's
// createRadialGradientTexture (128×128, alpha stops at 0/0.4/1) so the
// Phaser-only renderer matches the Three.js star halo look.

const STAR_TEXTURE_PREFIX = "galaxy2d:starGlow:";
const TEXTURE_SIZE = 128;

/**
 * Lazy-creates a radial-gradient star texture in Phaser's TextureManager.
 * Returns the texture key. Safe to call repeatedly with the same color —
 * subsequent calls find the existing texture by key.
 *
 * Gradient profile matches GalaxyView3D's createRadialGradientTexture:
 *   r=0    : rgba(c, 1)
 *   r=0.4  : rgba(c, 0.4)
 *   r=1    : rgba(c, 0)
 */
export function getStarGlowTexture(scene: Phaser.Scene, color: number): string {
  const key = STAR_TEXTURE_PREFIX + color.toString(16).padStart(6, "0");
  if (scene.textures.exists(key)) return key;

  const tex = scene.textures.createCanvas(key, TEXTURE_SIZE, TEXTURE_SIZE);
  if (!tex) {
    // Fallback: TextureManager refused to allocate (extremely rare). Caller
    // can still pass the key to setTexture; Phaser will render the default
    // missing-texture placeholder rather than crash.
    return key;
  }
  const ctx = tex.getContext();
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const half = TEXTURE_SIZE / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.4)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  tex.refresh();
  return key;
}

/**
 * Remove all generated textures created by this module from the
 * TextureManager. Call from GalaxyView2D.destroy() to avoid leaking
 * across scene re-entries.
 */
export function disposeAllGlowTextures(scene: Phaser.Scene): void {
  const keys = scene.textures.getTextureKeys();
  for (const key of keys) {
    if (key.startsWith(STAR_TEXTURE_PREFIX)) {
      scene.textures.remove(key);
    }
  }
}
