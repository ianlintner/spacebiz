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
const win = window as unknown as Record<string, unknown>;
win.__PHASER_GAME__ = game;
// Visual-regression hook: e2e tests poll this flag before screenshotting.
// Set by StyleguideScene once create() finishes and the section registry
// (window.__styleguideSections) is populated.
win.__styleguideReady = false;
