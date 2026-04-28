import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockText,
} from "./_phaserMock.ts";
import { FloatingText } from "../../FloatingText.ts";

describe("FloatingText", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
  });

  it("spawns a Text game object at the requested position", () => {
    new FloatingText(scene as never, 100, 200, "+§500", 0x00ff88);
    const texts = scene.children.list.filter(
      (c) => (c as MockText).type === "Text",
    ) as MockText[];
    expect(texts.length).toBe(1);
    const txt = texts[0]!;
    expect(txt.x).toBe(100);
    expect(txt.y).toBe(200);
    expect(txt.text).toBe("+§500");
    expect(txt.depth).toBe(1000);
    // Starts invisible (alpha 0) — pop-in tween fades it up.
    expect(txt.alpha).toBe(0);
  });

  it("creates a pop-in tween then chains a settle tween that destroys the text", () => {
    new FloatingText(scene as never, 0, 0, "x", 0xffffff);
    const texts = scene.children.list.filter(
      (c) => (c as MockText).type === "Text",
    ) as MockText[];
    const txt = texts[0]!;

    expect(scene.tweens._all.length).toBe(1);
    // Complete the pop tween — chains the settle tween.
    scene.tweens._all[0]!.complete();
    expect(scene.tweens._all.length).toBe(2);
    expect(txt.destroyed).toBe(false);

    // Complete the settle tween — must destroy the text.
    scene.tweens._all[1]!.complete();
    expect(txt.destroyed).toBe(true);
  });

  it("respects the riseDistance and driftX config when scheduling the settle tween", () => {
    new FloatingText(scene as never, 100, 200, "x", 0xffffff, {
      riseDistance: 80,
      driftX: 25,
    });
    scene.tweens._all[0]!.complete();
    const settle = scene.tweens._all[1]!;
    expect(settle.config.x).toBe(100 + 25);
    expect(settle.config.y).toBe(200 - 80);
  });

  it("scales pop intensity higher when bounce is enabled (default)", () => {
    new FloatingText(scene as never, 0, 0, "x", 0xffffff, { bounce: true });
    const popA = scene.tweens._all[0]!;
    expect(popA.config.scaleX).toBe(1.35);

    const scene2 = createMockScene();
    new FloatingText(scene2 as never, 0, 0, "x", 0xffffff, { bounce: false });
    const popB = scene2.tweens._all[0]!;
    expect(popB.config.scaleX).toBe(1.1);
  });

  it("respects custom duration in the settle tween", () => {
    new FloatingText(scene as never, 0, 0, "x", 0xffffff, { duration: 2000 });
    const popDuration = scene.tweens._all[0]!.config.duration as number;
    scene.tweens._all[0]!.complete();
    const settleDuration = scene.tweens._all[1]!.config.duration as number;
    expect(popDuration + settleDuration).toBe(2000);
  });

  it("supports the four documented size keys without throwing", () => {
    for (const size of ["small", "medium", "large", "huge"] as const) {
      new FloatingText(scene as never, 0, 0, "n", 0xffffff, { size });
    }
    const texts = scene.children.list.filter(
      (c) => (c as MockText).type === "Text",
    );
    expect(texts.length).toBe(4);
  });
});
