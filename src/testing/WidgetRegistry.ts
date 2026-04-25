import type * as Phaser from "phaser";
import type {
  WidgetRegistration,
  WidgetHookFn,
} from "../../packages/spacebiz-ui/src/WidgetHooks.ts";
import type { TestIdEntry } from "./types.ts";

interface Entry {
  id: string;
  registration: WidgetRegistration;
}

export class WidgetRegistry {
  private byScene = new Map<Phaser.Scene, Entry[]>();
  private sceneListeners = new WeakSet<Phaser.Scene>();

  /** The hook passed to `setWidgetHook(...)`. Returns an unregister fn. */
  readonly hook: WidgetHookFn = (reg) => {
    const list = this.byScene.get(reg.scene) ?? [];
    const id = this.disambiguate(list, reg.testId);
    const entry: Entry = { id, registration: reg };
    list.push(entry);
    this.byScene.set(reg.scene, list);
    this.bindSceneLifecycle(reg.scene);
    return () => this.remove(reg.scene, entry);
  };

  private disambiguate(list: Entry[], baseId: string): string {
    if (!list.some((e) => e.id === baseId)) return baseId;
    let n = 2;
    while (list.some((e) => e.id === `${baseId}-${n}`)) n++;
    return `${baseId}-${n}`;
  }

  private remove(scene: Phaser.Scene, entry: Entry): void {
    const list = this.byScene.get(scene);
    if (!list) return;
    const i = list.indexOf(entry);
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this.byScene.delete(scene);
  }

  private bindSceneLifecycle(scene: Phaser.Scene): void {
    if (this.sceneListeners.has(scene)) return;
    this.sceneListeners.add(scene);
    const drop = (): void => {
      this.byScene.delete(scene);
    };
    scene.events.once("shutdown", drop);
    scene.events.once("destroy", drop);
  }

  /** Returns only widgets in currently active scenes. */
  list(filter?: string): TestIdEntry[] {
    const out: TestIdEntry[] = [];
    for (const [scene, entries] of this.byScene) {
      if (!isSceneActive(scene)) continue;
      for (const entry of entries) {
        const reg = entry.registration;
        const item: TestIdEntry = {
          testId: entry.id,
          label: reg.label,
          kind: reg.kind,
          scene: scene.scene.key,
          enabled: reg.isEnabled(),
          visible: reg.isVisible(),
        };
        if (!filter || matchesFilter(item, filter)) {
          out.push(item);
        }
      }
    }
    return out;
  }

  find(testId: string): (Entry & { scene: Phaser.Scene }) | null {
    for (const [scene, entries] of this.byScene) {
      if (!isSceneActive(scene)) continue;
      for (const entry of entries) {
        if (entry.id === testId) return { ...entry, scene };
      }
    }
    return null;
  }

  /** Drop every entry; used in tests. */
  clear(): void {
    this.byScene.clear();
  }
}

function isSceneActive(scene: Phaser.Scene): boolean {
  const sys = scene.sys;
  if (!sys) return false;
  return sys.isActive() || sys.isVisible();
}

function matchesFilter(entry: TestIdEntry, filter: string): boolean {
  const f = filter.toLowerCase();
  return (
    entry.testId.toLowerCase().includes(f) ||
    entry.label.toLowerCase().includes(f) ||
    entry.scene.toLowerCase().includes(f)
  );
}

export const widgetRegistry = new WidgetRegistry();
