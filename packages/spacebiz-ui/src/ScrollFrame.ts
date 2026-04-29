import * as Phaser from "phaser";
import { applyClippingMask } from "./MaskUtils.ts";

export interface ScrollFrameConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional padding inside the frame, applied to the content viewport. */
  padding?: number;
  /** Wheel sensitivity. 0.5 matches the legacy DataTable feel. */
  wheelSpeed?: number;
}

/**
 * Single-purpose scrollable viewport. Holds one Container child, clips it via
 * Phaser 4's filter mask, and scrolls vertically on mouse wheel.
 *
 * The deliberate choice here is to be the **only** scrollable container in the
 * hierarchy. By making children content-sized (no internal scroll, no internal
 * mask), we collapse the nested-mask-on-nested-Container pathology that
 * required `clipRowsToViewport` defenses inside DataTable.
 *
 * Mask handling mirrors the path established in PR #213: filter mask via
 * `filters.internal.addMask(maskShape, false, undefined, "world")`, with the
 * mask shape repositioned each preupdate to the frame viewport's world
 * transform. No Phaser-3 `setMask`/`createGeometryMask` fallback needed since
 * we target Phaser 4 only.
 */
export class ScrollFrame extends Phaser.GameObjects.Container {
  private viewportWidth: number;
  private viewportHeight: number;
  private padding: number;
  private wheelSpeed: number;
  private contentLayer: Phaser.GameObjects.Container;
  private maskShape: Phaser.GameObjects.Graphics;
  private contentChild: Phaser.GameObjects.Container | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private wheelHitArea: Phaser.GameObjects.Rectangle;
  private canvasWheelHandler: ((e: WheelEvent) => void) | null = null;
  private destroyed = false;
  private maskSyncBound: () => void;

  constructor(scene: Phaser.Scene, config: ScrollFrameConfig) {
    super(scene, config.x, config.y);
    this.viewportWidth = config.width;
    this.viewportHeight = config.height;
    this.padding = config.padding ?? 0;
    this.wheelSpeed = config.wheelSpeed ?? 0.5;

    // Invisible hit-area that intercepts wheel events. Mirrors the legacy
    // DataTable canvas-wheel approach so scrolling works inside nested tabs
    // and panels regardless of Phaser scene-stacking quirks.
    this.wheelHitArea = scene.add
      .rectangle(0, 0, this.viewportWidth, this.viewportHeight, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive(
        new Phaser.Geom.Rectangle(
          0,
          0,
          this.viewportWidth,
          this.viewportHeight,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
    this.wheelHitArea.setData("consumesWheel", true);
    this.add(this.wheelHitArea);

    this.contentLayer = scene.add.container(this.padding, this.padding);
    this.add(this.contentLayer);

    this.maskShape = scene.make.graphics({});
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(
      0,
      0,
      this.viewportWidth - this.padding * 2,
      this.viewportHeight - this.padding * 2,
    );
    applyClippingMask(this.contentLayer, this.maskShape);
    this.syncMaskPosition();

    this.maskSyncBound = () => this.syncMaskPosition();
    this.scene.events.on("preupdate", this.maskSyncBound, this);

    this.setupCanvasWheelListener();

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.destroyed = true;
      this.scene.events.off("preupdate", this.maskSyncBound, this);
      if (this.canvasWheelHandler) {
        this.scene.game.canvas.removeEventListener(
          "wheel",
          this.canvasWheelHandler,
        );
        this.canvasWheelHandler = null;
      }
    });

    scene.add.existing(this);
  }

  /**
   * Adopt a Container child as the scrollable content. Removes any prior
   * content. The child's natural `y` is reset; its rendered position inside
   * the frame is computed by ScrollFrame's scroll offset.
   *
   * Auto-wires two optional events on the child:
   *   - `contentResize { height }` → triggers `recomputeBounds()`
   *   - `scrollIntoView { top, height }` → triggers `scrollIntoView(top, height)`
   * DataTable in `contentSized` mode emits both. Children that don't emit
   * them simply never trigger the listeners — no harm done.
   */
  setContent(child: Phaser.GameObjects.Container): void {
    if (this.contentChild && this.contentChild !== child) {
      this.contentLayer.remove(this.contentChild, false);
    }
    this.contentChild = child;
    child.setPosition(0, 0);
    this.contentLayer.add(child);
    child.on("contentResize", () => this.recomputeBounds());
    child.on("scrollIntoView", (range: { top: number; height: number }) =>
      this.scrollIntoView(range.top, range.height),
    );
    this.recomputeBounds();
  }

  /**
   * Recompute scroll bounds from the current content. Call after the content
   * Container's height changes (e.g. DataTable.setRows added or removed rows).
   */
  recomputeBounds(): void {
    const measured = this.measureContentHeight();
    const visibleH = this.viewportHeight - this.padding * 2;
    this.maxScroll = Math.max(0, measured - visibleH);
    if (this.scrollY > this.maxScroll) {
      this.scrollTo(this.maxScroll);
    }
    this.syncContentScrollOffset();
    this.syncMaskPosition();
  }

  /** Set scroll offset (clamped to [0, maxScroll]). */
  scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.contentLayer.y = this.padding - this.scrollY;
    this.syncContentScrollOffset();
    this.syncMaskPosition();
  }

  /**
   * Adjust scroll so that a content-coordinate range [top, top+height] is
   * fully visible. No-op if already in view. If above viewport, aligns top.
   * If below, aligns bottom.
   */
  scrollIntoView(top: number, height: number): void {
    const visibleH = this.viewportHeight - this.padding * 2;
    const visibleTop = this.scrollY;
    const visibleBottom = this.scrollY + visibleH;
    if (top < visibleTop) {
      this.scrollTo(top);
    } else if (top + height > visibleBottom) {
      this.scrollTo(top + height - visibleH);
    }
  }

  getViewportHeight(): number {
    return this.viewportHeight - this.padding * 2;
  }

  getMaxScroll(): number {
    return this.maxScroll;
  }

  // ─────────────────────────────────────────────────────────────────────────

  /** Measure content height via Container.getBounds — captures wrapped rows. */
  private measureContentHeight(): number {
    if (!this.contentChild) return 0;
    const candidate = this.contentChild as unknown as {
      contentHeight?: number;
    };
    if (typeof candidate.contentHeight === "number") {
      return candidate.contentHeight;
    }
    const bounds = this.contentChild.getBounds();
    return bounds.height;
  }

  private syncContentScrollOffset(): void {
    const child = this.contentChild as unknown as {
      setViewportScrollY?: (scrollY: number) => void;
    } | null;
    child?.setViewportScrollY?.(this.scrollY);
  }

  private syncMaskPosition(): void {
    if (this.destroyed) return;
    const matrix = this.getWorldTransformMatrix();
    this.maskShape.setPosition(
      matrix.tx + this.padding,
      matrix.ty + this.padding,
    );
  }

  private isVisibleInWorld(): boolean {
    let node: Phaser.GameObjects.Container | undefined = this;
    while (node) {
      if (!node.visible) return false;
      node = node.parentContainer ?? undefined;
    }
    return true;
  }

  private setupCanvasWheelListener(): void {
    const canvas = this.scene.game.canvas;
    this.canvasWheelHandler = (e: WheelEvent) => {
      if (this.destroyed || !this.isVisibleInWorld()) return;
      if (this.maxScroll <= 0) return;

      const rect = canvas.getBoundingClientRect();
      const sx = this.scene.scale.width / rect.width;
      const sy = this.scene.scale.height / rect.height;
      const gameX = (e.clientX - rect.left) * sx;
      const gameY = (e.clientY - rect.top) * sy;

      const matrix = this.getWorldTransformMatrix();
      if (
        gameX >= matrix.tx &&
        gameX <= matrix.tx + this.viewportWidth &&
        gameY >= matrix.ty &&
        gameY <= matrix.ty + this.viewportHeight
      ) {
        this.scrollTo(this.scrollY + e.deltaY * this.wheelSpeed);
      }
    };
    canvas.addEventListener("wheel", this.canvasWheelHandler);
  }
}
