import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import { BootScene } from "./scenes/BootScene";
import { MainMenuScene } from "./scenes/MainMenuScene.ts";
import { GalaxySetupScene } from "./scenes/GalaxySetupScene.ts";
import { GameHUDScene } from "./scenes/GameHUDScene.ts";

const config = createGameConfig([
  BootScene,
  MainMenuScene,
  GalaxySetupScene,
  GameHUDScene,
]);
new Phaser.Game(config);
