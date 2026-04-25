import * as Phaser from "phaser";
import { StyleguideBootScene } from "./scenes/StyleguideBootScene.ts";
import { StyleguideScene } from "./scenes/StyleguideScene.ts";
import { getLayout } from "@spacebiz/ui";

const L = getLayout();
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: L.gameWidth,
  height: L.gameHeight,
  parent: document.body,
  backgroundColor: "#0a0a12",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [StyleguideBootScene, StyleguideScene],
};

const game = new Phaser.Game(config);
(window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;
