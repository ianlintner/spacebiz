import Phaser from "phaser";
import { createGameConfig } from "./game/config.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { MainMenuScene } from "./scenes/MainMenuScene.ts";
import { GalaxySetupScene } from "./scenes/GalaxySetupScene.ts";
import { GameHUDScene } from "./scenes/GameHUDScene.ts";
import { GalaxyMapScene } from "./scenes/GalaxyMapScene.ts";
import { SystemMapScene } from "./scenes/SystemMapScene.ts";
import { PlanetDetailScene } from "./scenes/PlanetDetailScene.ts";
import { FleetScene } from "./scenes/FleetScene.ts";
import { RoutesScene } from "./scenes/RoutesScene.ts";
import { FinanceScene } from "./scenes/FinanceScene.ts";
import { MarketScene } from "./scenes/MarketScene.ts";
import { SimPlaybackScene } from "./scenes/SimPlaybackScene.ts";
import { TurnReportScene } from "./scenes/TurnReportScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";

const config = createGameConfig([
  BootScene,
  MainMenuScene,
  GalaxySetupScene,
  GameHUDScene,
  GalaxyMapScene,
  SystemMapScene,
  PlanetDetailScene,
  FleetScene,
  RoutesScene,
  FinanceScene,
  MarketScene,
  SimPlaybackScene,
  TurnReportScene,
  GameOverScene,
]);
new Phaser.Game(config);
