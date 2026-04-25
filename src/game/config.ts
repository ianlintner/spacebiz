import Phaser from "phaser";
import { BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH, updateLayout } from "@spacebiz/ui";

export { BASE_HEIGHT, MIN_WIDTH, MAX_WIDTH };

/** Calculate a virtual game size that fills the screen at the current aspect ratio. */
export function calculateGameSize(): { width: number; height: number } {
  const screenW = window.innerWidth || 1280;
  const screenH = window.innerHeight || 720;
  const ratio = screenW / screenH;

  if (ratio >= 1) {
    // Landscape: fixed height, variable width
    const w = Math.round(BASE_HEIGHT * ratio);
    return {
      width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)),
      height: BASE_HEIGHT,
    };
  }
  // Portrait: fixed width at MIN_WIDTH, variable height
  const h = Math.round(MIN_WIDTH / ratio);
  return {
    width: MIN_WIDTH,
    height: Math.min(h, 1600),
  };
}

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
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}
