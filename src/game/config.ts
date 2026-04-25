import * as Phaser from "phaser";
import { updateLayout } from "@spacebiz/ui";
import { calculateGameSize, BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH } from "./calculateGameSize.ts";

export { calculateGameSize, BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH };

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  const size = calculateGameSize();
  updateLayout(size.width, size.height);

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
  };
}
