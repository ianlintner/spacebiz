/**
 * PortraitLoader — on-demand portrait texture loading for Phaser scenes.
 *
 * CEO and Empire Leader portrait images are large and numerous (100 + 20).
 * Rather than preloading all of them at boot, this service fetches individual
 * portraits only when they are about to be displayed.
 *
 * Usage:
 *   import { portraitLoader } from "../game/PortraitLoader.ts";
 *
 *   // In a scene method (async):
 *   const key = await portraitLoader.ensureCeoPortrait(this, ceoId);
 *   image.setTexture(key);
 *
 * The service is a singleton that survives across scene transitions.
 * Once a texture is loaded into Phaser's texture manager it stays there
 * for the lifetime of the game instance.
 */

import type * as Phaser from "phaser";
import {
  CEO_PORTRAITS,
  getPortraitTextureKey,
  getPortraitAssetUrls,
} from "../data/portraits.ts";
import {
  EMPIRE_LEADER_PORTRAITS,
  getLeaderTextureKey,
  getLeaderAssetUrls,
} from "../data/empireLeaderPortraits.ts";
import {
  AMBASSADOR_PORTRAITS,
  getAmbassadorTextureKey,
  getAmbassadorAssetUrls,
} from "../data/ambassadorPortraits.ts";

/** Placeholder texture key used while a portrait is loading. */
export const PORTRAIT_PLACEHOLDER_KEY = "panel-bg";

class PortraitLoader {
  /** Keys that are fully loaded into Phaser's TextureManager. */
  private readonly loaded = new Set<string>();

  /**
   * Promises keyed by texture key for in-flight loads.
   * Concurrent callers waiting on the same key share one promise.
   */
  private readonly inFlight = new Map<string, Promise<string>>();

  // ── CEO portraits ────────────────────────────────────────────────────────

  /**
   * Ensure a CEO portrait texture is loaded. Returns the texture key once
   * the image is in Phaser's TextureManager and ready to use.
   */
  ensureCeoPortrait(scene: Phaser.Scene, ceoId: string): Promise<string> {
    const key = getPortraitTextureKey(ceoId);
    return this.ensureKey(scene, key, () => {
      const def = CEO_PORTRAITS.find((p) => p.id === ceoId);
      if (!def)
        return Promise.reject(new Error(`Unknown CEO portrait: ${ceoId}`));
      return Promise.resolve(getPortraitAssetUrls(def));
    });
  }

  /**
   * Pre-warm a batch of CEO portraits (e.g. all rival CEOs at game start).
   * Fires and forgets — errors per-portrait are suppressed so one bad image
   * doesn't block the rest.
   */
  preloadCeoPortraits(
    scene: Phaser.Scene,
    ids: readonly string[],
  ): Promise<void> {
    return Promise.all(
      ids.map((id) =>
        this.ensureCeoPortrait(scene, id).catch(() => {
          // Individual load failure doesn't block others
        }),
      ),
    ).then(() => undefined);
  }

  // ── Empire Leader portraits ──────────────────────────────────────────────

  /**
   * Ensure an Empire Leader portrait texture is loaded. Returns the texture
   * key once ready.
   */
  ensureLeaderPortrait(scene: Phaser.Scene, leaderId: string): Promise<string> {
    const key = getLeaderTextureKey(leaderId);
    return this.ensureKey(scene, key, () => {
      const def = EMPIRE_LEADER_PORTRAITS.find((p) => p.id === leaderId);
      if (!def)
        return Promise.reject(
          new Error(`Unknown leader portrait: ${leaderId}`),
        );
      return Promise.resolve(getLeaderAssetUrls(def));
    });
  }

  /**
   * Pre-warm a batch of leader portraits.
   */
  preloadLeaderPortraits(
    scene: Phaser.Scene,
    ids: readonly string[],
  ): Promise<void> {
    return Promise.all(
      ids.map((id) =>
        this.ensureLeaderPortrait(scene, id).catch(() => undefined),
      ),
    ).then(() => undefined);
  }

  // ── Ambassador / Liaison portraits ───────────────────────────────────────

  /**
   * Ensure an Ambassador (or Rival Liaison) portrait texture is loaded.
   * The same pool serves both empire ambassadors and rival liaisons since
   * the portrait pool is keyed by `(personality, category)`, not by
   * faction type.
   */
  ensureAmbassadorPortrait(
    scene: Phaser.Scene,
    portraitId: string,
  ): Promise<string> {
    const key = getAmbassadorTextureKey(portraitId);
    return this.ensureKey(scene, key, () => {
      const def = AMBASSADOR_PORTRAITS.find((p) => p.id === portraitId);
      if (!def)
        return Promise.reject(
          new Error(`Unknown ambassador portrait: ${portraitId}`),
        );
      return Promise.resolve(getAmbassadorAssetUrls(def));
    });
  }

  /** Pre-warm a batch of ambassador portraits. */
  preloadAmbassadorPortraits(
    scene: Phaser.Scene,
    ids: readonly string[],
  ): Promise<void> {
    return Promise.all(
      ids.map((id) =>
        this.ensureAmbassadorPortrait(scene, id).catch(() => undefined),
      ),
    ).then(() => undefined);
  }

  // ── Generic Rex adviser helper (moods loaded at boot, but keep parity) ───

  /**
   * Check if a texture key is already loaded (instant, sync).
   * Useful for optimistic checks before going async.
   */
  isLoaded(key: string): boolean {
    return this.loaded.has(key);
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /**
   * Core deduplication logic.
   *
   * 1. Already in TextureManager → resolve immediately.
   * 2. In-flight load → return the existing promise.
   * 3. Otherwise start a new Phaser loader for this single asset.
   */
  private ensureKey(
    scene: Phaser.Scene,
    key: string,
    getUrls: () => Promise<[string, string]>,
  ): Promise<string> {
    // Fast path — already loaded (also survives scene restarts because Phaser
    // TextureManager persists for the Game instance lifetime).
    if (scene.textures.exists(key)) {
      this.loaded.add(key);
      return Promise.resolve(key);
    }

    if (this.loaded.has(key)) {
      // Loaded in a previous session but TextureManager was reset (rare).
      // Fall through to re-load.
      this.loaded.delete(key);
    }

    // Deduplicate concurrent requests
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }
    const promise = getUrls().then(
      (urls) =>
        new Promise<string>((resolve, reject) => {
          // Fetch the image manually instead of using the Phaser loader.
          // This avoids issues with loader state during scene creation.
          fetchImageAndAddToTextures(key, urls, scene.textures)
            .then(() => {
              this.loaded.add(key);
              this.inFlight.delete(key);
              // Verify texture exists before resolving promise to ensure it's
              // fully committed to the TextureManager (fixes timing race conditions)
              if (!scene.textures.exists(key)) {
                // Give the texture manager a tick to process
                setTimeout(() => {
                  if (scene.textures.exists(key)) {
                    resolve(key);
                  } else {
                    reject(
                      new Error(
                        `Texture "${key}" still not in manager after retry`,
                      ),
                    );
                  }
                }, 16); // ~one frame at 60fps
              } else {
                resolve(key);
              }
            })
            .catch((err) => {
              this.inFlight.delete(key);
              reject(err);
            });
        }),
    );

    this.inFlight.set(key, promise);
    return promise;
  }
}

/** Try to fetch and add an image texture, trying URLs in order until one succeeds. */
async function fetchImageAndAddToTextures(
  key: string,
  urls: readonly string[],
  textures: Phaser.Textures.TextureManager,
): Promise<void> {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} loading ${url}`);
        continue;
      }

      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);

      // Create an HTMLImageElement and load from the data URL
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(dataUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(dataUrl);
          reject(new Error(`Failed to decode image from ${url}`));
        };
        img.src = dataUrl;
      });

      // Create a canvas texture from the loaded image
      const canvasTexture = textures.createCanvas(key, img.width, img.height);
      if (!canvasTexture) {
        throw new Error(
          `Failed to create canvas texture for "${key}" (${img.width}x${img.height})`,
        );
      }

      const ctx = canvasTexture.getContext();
      ctx.drawImage(img, 0, 0);
      canvasTexture.refresh();

      // Verify texture was added to the texture manager
      if (!textures.exists(key)) {
        throw new Error(
          `Texture "${key}" was not added to TextureManager after refresh`,
        );
      }
      return; // Success — stop trying other URLs
    } catch (err) {
      lastError =
        err instanceof Error
          ? err
          : new Error(`Failed to fetch ${url}: ${String(err)}`);
      // Continue to the next URL
    }
  }

  // All URLs failed
  const finalError =
    lastError ?? new Error(`No URLs provided for portrait texture: ${key}`);
  throw finalError;
}

/** Singleton instance — shared across all scenes. */
export const portraitLoader = new PortraitLoader();
