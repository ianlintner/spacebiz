import Phaser from "phaser";

export interface SceneUiLayerOptions {
  key?: string;
}

export interface SceneUiOverlayOptions {
  alpha?: number;
  color?: number;
  closeOnPointerUp?: boolean;
  onPointerUp?: () => void;
}

export class SceneUiDirector {
  private keyedLayers = new Map<string, SceneUiLayer>();
  private anonymousLayers = new Set<SceneUiLayer>();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.scene.events.once("shutdown", () => this.destroy());
  }

  openLayer(options: SceneUiLayerOptions = {}): SceneUiLayer {
    const { key } = options;
    if (key) {
      this.keyedLayers.get(key)?.destroy();
    }

    const layer = new SceneUiLayer(this.scene, this, key);
    if (key) {
      this.keyedLayers.set(key, layer);
    } else {
      this.anonymousLayers.add(layer);
    }
    return layer;
  }

  closeAll(): void {
    const layers = [
      ...this.keyedLayers.values(),
      ...this.anonymousLayers.values(),
    ];
    for (const layer of layers) {
      layer.destroy();
    }
  }

  destroy(): void {
    this.closeAll();
    this.keyedLayers.clear();
    this.anonymousLayers.clear();
  }

  unregister(layer: SceneUiLayer): void {
    if (layer.key) {
      if (this.keyedLayers.get(layer.key) === layer) {
        this.keyedLayers.delete(layer.key);
      }
      return;
    }

    this.anonymousLayers.delete(layer);
  }
}

export class SceneUiLayer {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private isDestroyed = false;
  public readonly key?: string;
  private scene: Phaser.Scene;
  private director: SceneUiDirector;

  constructor(scene: Phaser.Scene, director: SceneUiDirector, key?: string) {
    this.scene = scene;
    this.director = director;
    this.key = key;
  }

  track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  trackMany<T extends Phaser.GameObjects.GameObject>(...objects: T[]): T[] {
    for (const object of objects) {
      this.track(object);
    }
    return objects;
  }

  createOverlay(
    options: SceneUiOverlayOptions = {},
  ): Phaser.GameObjects.Rectangle {
    const camera = this.scene.cameras.main;
    const overlay = this.scene.add
      .rectangle(
        0,
        0,
        camera.width,
        camera.height,
        options.color ?? 0x000000,
        options.alpha ?? 0.6,
      )
      .setOrigin(0, 0)
      .setInteractive();

    overlay.on("pointerup", () => {
      options.onPointerUp?.();
      if (options.closeOnPointerUp) {
        this.destroy();
      }
    });

    return this.track(overlay);
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    for (const object of [...this.objects].reverse()) {
      if (object.scene) {
        object.destroy();
      }
    }
    this.objects = [];
    this.director.unregister(this);
  }
}
