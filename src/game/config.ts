import * as Phaser from "phaser";
import { updateLayout } from "@spacebiz/ui";
import {
  calculateGameSize,
  BASE_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH,
} from "./calculateGameSize.ts";

export { calculateGameSize, BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH };

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  const size = calculateGameSize();
  updateLayout(size.width, size.height);

  const dpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;

  // Phaser 4 dropped `resolution` from the public GameConfig types, but the
  // field is still surfaced via spread cast so future Phaser 4.x versions (or
  // forks) that re-introduce it pick it up — and so the intent stays visible
  // even if the engine ignores it today.
  return {
    type: Phaser.AUTO,
    width: size.width,
    height: size.height,
    parent: "game-container",
    backgroundColor: "#0a0a1a",
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
    // Enable preserveDrawingBuffer in dev so canvas.toDataURL() works for
    // PR-screenshot capture from the Claude Preview MCP. Costs an extra
    // buffer copy per frame, so we keep it off in production builds.
    render: import.meta.env.DEV ? { preserveDrawingBuffer: true } : undefined,
    ...({ resolution: dpr } as unknown as Phaser.Types.Core.GameConfig),
  };
}
