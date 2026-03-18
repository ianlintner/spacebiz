import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import { BootScene } from "./scenes/BootScene";

const config = createGameConfig([BootScene]);
new Phaser.Game(config);
