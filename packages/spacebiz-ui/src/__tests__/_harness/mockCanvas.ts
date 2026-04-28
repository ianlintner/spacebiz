/**
 * Canvas polyfill installer for Vitest.
 *
 * Phaser 4's text/texture pipeline calls into `HTMLCanvasElement.getContext`
 * during construction (e.g. measuring text bounds, rasterizing glyphs). jsdom
 * ships canvas elements but no 2D context, so we install a real implementation
 * via @napi-rs/canvas when available. If the optional dependency is missing we
 * fall back to a math-free stub that returns plausible no-op shapes — enough
 * for tests that never inspect actual pixels.
 */

type CanvasModule = {
  createCanvas: (width: number, height: number) => unknown;
};

let originalGetContext:
  | ((this: HTMLCanvasElement, ...args: unknown[]) => unknown)
  | undefined;
let originalImageSrc: PropertyDescriptor | undefined;
let installed = false;

function tryLoadNapiCanvas(): CanvasModule | null {
  try {
    // Indirect require so bundlers / static analysers don't try to resolve it.
    // The optional native module is CJS-only on some platforms, so a dynamic
    // require obtained via the Function constructor is the portable shim.
    const req = new Function("return require")() as (
      id: string,
    ) => CanvasModule;
    return req("@napi-rs/canvas");
  } catch {
    return null;
  }
}

function buildStubContext(): CanvasRenderingContext2D {
  // Minimal 2D-context stub: enough surface area for Phaser's text measurer.
  // Returned values are deterministic placeholders, never inspected for
  // correctness — tests that need real glyph metrics should ensure
  // @napi-rs/canvas is installed.
  const noop = () => undefined;
  const ctx = {
    canvas: undefined as unknown as HTMLCanvasElement,
    fillStyle: "#000",
    strokeStyle: "#000",
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    measureText: (text: string) => ({
      width: text.length * 6,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 6,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
    }),
    fillText: noop,
    strokeText: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    clip: noop,
    isPointInPath: () => false,
    isPointInStroke: () => false,
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

/**
 * Install a 2D canvas implementation on globalThis.HTMLCanvasElement.prototype.
 * Safe to call multiple times — subsequent calls are no-ops until restored.
 */
export function installCanvasMock(): void {
  if (installed) return;
  if (typeof HTMLCanvasElement === "undefined") {
    // No DOM in this test environment; nothing to patch.
    return;
  }
  const napi = tryLoadNapiCanvas();
  originalGetContext = HTMLCanvasElement.prototype.getContext as
    | ((this: HTMLCanvasElement, ...args: unknown[]) => unknown)
    | undefined;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ...rest: unknown[]
  ): unknown {
    if (contextId !== "2d") {
      // WebGL / bitmaprenderer not supported in headless tests.
      return null;
    }
    if (napi) {
      const real = napi.createCanvas(
        this.width || 1,
        this.height || 1,
      ) as unknown as { getContext: (id: string) => unknown };
      const ctx = real.getContext("2d");
      return ctx;
    }
    void rest;
    return buildStubContext();
  } as typeof HTMLCanvasElement.prototype.getContext;

  // jsdom's HTMLImageElement never fires onload for data: URIs, which
  // strands Phaser's TextureManager (it base64-decodes default/missing/white
  // textures during boot and waits for them before emitting READY). Patch
  // the `src` setter to dispatch a synthetic load on the next microtask so
  // boot completes.
  if (typeof HTMLImageElement !== "undefined") {
    const proto = HTMLImageElement.prototype as unknown as object;
    originalImageSrc =
      Object.getOwnPropertyDescriptor(proto, "src") ?? undefined;
    Object.defineProperty(proto, "src", {
      configurable: true,
      enumerable: true,
      get(this: HTMLImageElement): string {
        return (this as unknown as { _src?: string })._src ?? "";
      },
      set(this: HTMLImageElement, value: string): void {
        (this as unknown as { _src?: string })._src = value;
        queueMicrotask(() => {
          this.onload?.(new Event("load"));
          this.dispatchEvent(new Event("load"));
        });
      },
    });
  }
  installed = true;
}

/** Restore the original `getContext` (or remove the polyfill entirely). */
export function restoreCanvasMock(): void {
  if (!installed) return;
  if (typeof HTMLCanvasElement === "undefined") return;
  if (originalGetContext) {
    HTMLCanvasElement.prototype.getContext =
      originalGetContext as typeof HTMLCanvasElement.prototype.getContext;
  } else {
    // jsdom always defines getContext, but guard for hand-built environments.
    delete (
      HTMLCanvasElement.prototype as unknown as {
        getContext?: unknown;
      }
    ).getContext;
  }
  originalGetContext = undefined;

  if (typeof HTMLImageElement !== "undefined") {
    const proto = HTMLImageElement.prototype as unknown as object;
    if (originalImageSrc) {
      Object.defineProperty(proto, "src", originalImageSrc);
    } else {
      delete (proto as unknown as { src?: unknown }).src;
    }
    originalImageSrc = undefined;
  }
  installed = false;
}
