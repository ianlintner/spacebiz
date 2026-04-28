import { describe, it, expect, afterEach } from "vitest";
import { Button } from "../../../Button.ts";
import { mockScene, mountComponent } from "../index.ts";
import type { MountedComponent } from "../index.ts";

describe("test harness", () => {
  describe("mockScene", () => {
    it("returns isolated scenes with a real EventEmitter", () => {
      const a = mockScene();
      const b = mockScene();
      expect(a.events).not.toBe(b.events);
      let fired = 0;
      a.events.on("ping", () => fired++);
      a.events.emit("ping");
      b.events.emit("ping");
      expect(fired).toBe(1);
    });

    it("exposes plausible defaults for scale and cameras", () => {
      const s = mockScene();
      expect(s.scale.width).toBe(1280);
      expect(s.cameras.main.centerX).toBe(640);
    });
  });

  describe("mountComponent", () => {
    let mounted: MountedComponent<Button> | undefined;

    afterEach(() => {
      mounted?.destroy();
      mounted = undefined;
    });

    it("constructs a real Button in a headless Phaser scene", async () => {
      mounted = await mountComponent(
        (scene) =>
          new Button(scene, {
            x: 0,
            y: 0,
            label: "Hi",
            onClick: () => undefined,
          }),
      );
      expect(mounted.component).toBeDefined();
      expect(mounted.scene).toBeDefined();
      // Container holds bg + accent line + label = 3 children (per Button.ts).
      expect(mounted.component.list.length).toBeGreaterThanOrEqual(3);
    }, 15000);

    it("supports setLabel after mount", async () => {
      mounted = await mountComponent(
        (scene) =>
          new Button(scene, {
            x: 0,
            y: 0,
            label: "Original",
            onClick: () => undefined,
          }),
      );
      mounted.component.setLabel("Updated");
      // Reach into the Container's children to find the Text label.
      const textChild = mounted.component.list.find(
        (child) => "text" in (child as unknown as Record<string, unknown>),
      ) as unknown as { text: string } | undefined;
      expect(textChild?.text).toBe("Updated");
    }, 15000);
  });
});
