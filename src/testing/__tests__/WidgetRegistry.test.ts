import { describe, it, expect, beforeEach } from "vitest";
import { WidgetRegistry } from "../WidgetRegistry";
import type * as Phaser from "phaser";

/**
 * Minimal scene stub. WidgetRegistry only reads `scene.events` (for lifecycle),
 * `scene.sys.isActive()`/`isVisible()` (for list filtering), and `scene.scene.key`
 * (for reporting). No real Phaser needed.
 */
function makeScene(key: string, active = true): Phaser.Scene {
  const listeners = new Map<string, Array<() => void>>();
  const events = {
    once(event: string, fn: () => void): void {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    emit(event: string): void {
      const list = listeners.get(event) ?? [];
      for (const fn of list) fn();
      listeners.delete(event);
    },
  };
  return {
    scene: { key },
    sys: {
      isActive: () => active,
      isVisible: () => active,
    },
    events,
  } as unknown as Phaser.Scene;
}

describe("WidgetRegistry", () => {
  let reg: WidgetRegistry;
  beforeEach(() => {
    reg = new WidgetRegistry();
  });

  it("registers and finds a widget by testId", () => {
    const scene = makeScene("FooScene");
    const invoke = () => {};
    reg.hook({
      testId: "btn-do-thing",
      kind: "button",
      label: "Do Thing",
      scene,
      invoke,
      isEnabled: () => true,
      isVisible: () => true,
    });
    const found = reg.find("btn-do-thing");
    expect(found).not.toBeNull();
    expect(found?.registration.label).toBe("Do Thing");
    expect(reg.list()).toHaveLength(1);
  });

  it("invokes the widget callback via its registration", () => {
    const scene = makeScene("FooScene");
    let called = 0;
    reg.hook({
      testId: "btn-x",
      kind: "button",
      label: "X",
      scene,
      invoke: () => {
        called++;
      },
      isEnabled: () => true,
      isVisible: () => true,
    });
    reg.find("btn-x")?.registration.invoke();
    expect(called).toBe(1);
  });

  it("disambiguates duplicate testIds with numeric suffix", () => {
    const scene = makeScene("FooScene");
    const common = {
      testId: "btn-accept",
      kind: "button" as const,
      label: "Accept",
      scene,
      invoke: () => {},
      isEnabled: () => true,
      isVisible: () => true,
    };
    reg.hook(common);
    reg.hook(common);
    reg.hook(common);
    const ids = reg.list().map((e) => e.testId);
    expect(ids).toEqual(["btn-accept", "btn-accept-2", "btn-accept-3"]);
  });

  it("filters list by substring against id, label, and scene", () => {
    const s1 = makeScene("Alpha");
    const s2 = makeScene("Beta");
    const baseline = {
      kind: "button" as const,
      invoke: () => {},
      isEnabled: () => true,
      isVisible: () => true,
    };
    reg.hook({ ...baseline, testId: "btn-buy", label: "Buy Ship", scene: s1 });
    reg.hook({ ...baseline, testId: "btn-end-turn", label: "End Turn", scene: s2 });
    expect(reg.list("buy").map((e) => e.testId)).toEqual(["btn-buy"]);
    expect(reg.list("Beta").map((e) => e.testId)).toEqual(["btn-end-turn"]);
    expect(reg.list("end")).toHaveLength(1);
  });

  it("excludes widgets in inactive scenes from list()", () => {
    const active = makeScene("Alive", true);
    const inactive = makeScene("Dead", false);
    const baseline = {
      kind: "button" as const,
      invoke: () => {},
      isEnabled: () => true,
      isVisible: () => true,
    };
    reg.hook({ ...baseline, testId: "btn-a", label: "A", scene: active });
    reg.hook({ ...baseline, testId: "btn-b", label: "B", scene: inactive });
    const ids = reg.list().map((e) => e.testId);
    expect(ids).toEqual(["btn-a"]);
  });

  it("unregister() removes the entry", () => {
    const scene = makeScene("FooScene");
    const unregister = reg.hook({
      testId: "btn-x",
      kind: "button",
      label: "X",
      scene,
      invoke: () => {},
      isEnabled: () => true,
      isVisible: () => true,
    });
    expect(reg.list()).toHaveLength(1);
    unregister();
    expect(reg.list()).toHaveLength(0);
  });

  it("drops all entries when the scene shuts down", () => {
    const scene = makeScene("FooScene");
    reg.hook({
      testId: "btn-x",
      kind: "button",
      label: "X",
      scene,
      invoke: () => {},
      isEnabled: () => true,
      isVisible: () => true,
    });
    expect(reg.list()).toHaveLength(1);
    (scene.events as unknown as { emit: (e: string) => void }).emit("shutdown");
    expect(reg.list()).toHaveLength(0);
  });
});
