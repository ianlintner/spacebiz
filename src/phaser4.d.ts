// Phaser 4 runtime APIs not yet reflected in the bundled type definitions.
// Augmenting via declare module keeps call sites clean — no `as any` needed.

declare module "phaser" {
  namespace GameObjects {
    interface GameObject {
      /**
       * Phaser 4 filter pipeline.  Provides masks, glow, and other WebGL
       * post-process effects.  Use `internal.addMask()` instead of the
       * deprecated `setMask()` / `createGeometryMask()` APIs.
       */
      filters?: {
        internal: {
          /** Accepts any game object as the mask shape (Arc, Graphics, etc.). */
          addMask(mask: GameObject): void;
        };
      };
    }

    interface RenderTexture {
      /**
       * Flush pending draw commands to the texture.  Must be called after
       * `draw()` and before `saveTexture()` in Phaser 4.
       */
      render(): this;
    }
  }
}
