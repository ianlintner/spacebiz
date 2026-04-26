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
    if (existing) return existing;

    const promise = getUrls().then(
      (urls) =>
        new Promise<string>((resolve, reject) => {
          // Use the scene's loader for this single file. We call load.start()
          // ourselves so we don't interfere with any currently-running bulk load.
          scene.load.image(key, urls);

          scene.load.once("complete", () => {
            this.loaded.add(key);
            this.inFlight.delete(key);
            resolve(key);
          });

          scene.load.once("loaderror", (file: { key: string }) => {
            if (file.key === key) {
              this.inFlight.delete(key);
              reject(new Error(`Failed to load portrait texture: ${key}`));
            }
          });

          // Kick off the loader (no-op if it's already running; Phaser queues the file)
          scene.load.start();
        }),
    );

    this.inFlight.set(key, promise);
    return promise;
  }
}

/** Singleton instance — shared across all scenes. */
export const portraitLoader = new PortraitLoader();
