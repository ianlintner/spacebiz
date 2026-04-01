import Phaser from "phaser";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { Panel } from "../ui/Panel.ts";
import { getTheme } from "../ui/Theme.ts";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  HUD_TOP_BAR_HEIGHT,
  HUD_BOTTOM_BAR_HEIGHT,
} from "../ui/Layout.ts";
import { gameStore } from "../data/GameStore.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

function formatCash(amount: number): string {
  return "\u00A7" + amount.toLocaleString();
}

export class GameHUDScene extends Phaser.Scene {
  private companyLabel!: Label;
  private turnLabel!: Label;
  private cashLabel!: Label;
  private phaseLabel!: Label;
  private endTurnButton!: Button;
  private activeContentScene = "GalaxyMapScene";
  private previousCash = 0;
  private navIndicators = new Map<string, Phaser.GameObjects.Rectangle>();
  private audioPanelObjects: Phaser.GameObjects.GameObject[] = [];
  private audioPanelOpen = false;
  private musicVolumeValueLabel: Label | null = null;
  private sfxVolumeValueLabel: Label | null = null;
  private reducedUiSfxValueLabel: Label | null = null;

  private stateListener = (_data: unknown) => {
    this.updateHUD();
  };

  constructor() {
    super({ key: "GameHUDScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const audio = getAudioDirector();

    this.previousCash = state.cash;
    audio.setMusicState("planning");
    audio.setPlanningSubstate("galaxy");

    // ── Top Bar ──────────────────────────────────────────────
    this.add
      .nineslice(
        0,
        0,
        "hud-bar-bg",
        undefined,
        GAME_WIDTH,
        HUD_TOP_BAR_HEIGHT,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.92);

    // Company name (left-aligned)
    this.companyLabel = new Label(this, {
      x: 20,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: state.companyName,
      style: "body",
    });
    this.companyLabel.setOrigin(0, 0.5);

    // Turn display (centered)
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel = new Label(this, {
      x: GAME_WIDTH / 2,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: `Q${quarter} Year ${year}`,
      style: "value",
    });
    this.turnLabel.setOrigin(0.5, 0.5);

    // Cash display (right-aligned, green/red conditional)
    this.cashLabel = new Label(this, {
      x: GAME_WIDTH - 20,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: formatCash(state.cash),
      style: "value",
      color: state.cash >= 0 ? theme.colors.profit : theme.colors.loss,
    });
    this.cashLabel.setOrigin(1, 0.5);

    // ── Navigation Buttons (horizontal row below top bar) ───
    const navItems = [
      { label: "Map", scene: "GalaxyMapScene" },
      { label: "Fleet", scene: "FleetScene" },
      { label: "Routes", scene: "RoutesScene" },
      { label: "Finance", scene: "FinanceScene" },
      { label: "Market", scene: "MarketScene" },
    ];

    const navBtnWidth = 100;
    const navBtnHeight = 32;
    const navSpacing = 8;
    const totalNavWidth =
      navItems.length * navBtnWidth + (navItems.length - 1) * navSpacing;
    const navStartX = (GAME_WIDTH - totalNavWidth) / 2;
    const navY = HUD_TOP_BAR_HEIGHT + 4;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      const btnX = navStartX + i * (navBtnWidth + navSpacing);

      new Button(this, {
        x: btnX,
        y: navY,
        width: navBtnWidth,
        height: navBtnHeight,
        label: item.label,
        onClick: () => {
          this.switchContentScene(item.scene);
        },
      });

      // Active indicator: accent-colored bar (3px tall) below button
      const indicator = this.add
        .rectangle(
          btnX + navBtnWidth / 2,
          navY + navBtnHeight + 2,
          navBtnWidth,
          3,
          theme.colors.accent,
        )
        .setOrigin(0.5, 0);
      indicator.setVisible(item.scene === this.activeContentScene);
      this.navIndicators.set(item.scene, indicator);
    }

    new Button(this, {
      x: GAME_WIDTH - 96,
      y: navY,
      width: 80,
      height: navBtnHeight,
      label: "Audio",
      onClick: () => {
        this.toggleAudioPanel();
      },
    });

    // ── Bottom Bar ───────────────────────────────────────────
    const bottomBarY = GAME_HEIGHT - HUD_BOTTOM_BAR_HEIGHT;

    this.add
      .nineslice(
        0,
        bottomBarY,
        "hud-bar-bg",
        undefined,
        GAME_WIDTH,
        HUD_BOTTOM_BAR_HEIGHT,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.88);

    // Phase indicator (left side of bottom bar)
    this.phaseLabel = new Label(this, {
      x: 20,
      y: GAME_HEIGHT - HUD_BOTTOM_BAR_HEIGHT / 2,
      text: `Phase: ${state.phase}`,
      style: "caption",
    });
    this.phaseLabel.setOrigin(0, 0.5);

    // End Turn button (centered in bottom bar)
    const endTurnW = 160;
    this.endTurnButton = new Button(this, {
      x: GAME_WIDTH / 2 - endTurnW / 2,
      y: bottomBarY + 6,
      width: endTurnW,
      height: 40,
      label: "End Turn",
      onClick: () => {
        this.switchContentScene("SimPlaybackScene");
      },
    });
    this.endTurnButton.setVisible(state.phase === "planning");

    // ── State Subscription ───────────────────────────────────
    gameStore.on("stateChanged", this.stateListener);

    this.events.once("shutdown", () => {
      gameStore.off("stateChanged", this.stateListener);
      this.destroyAudioPanel();
    });

    // Launch default content scene and ensure HUD renders on top
    this.scene.launch("GalaxyMapScene");
    this.activeContentScene = "GalaxyMapScene";
    this.scene.bringToTop();
  }

  private updateHUD(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const audio = getAudioDirector();

    this.companyLabel.setText(state.companyName);

    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel.setText(`Q${quarter} Year ${year}`);

    // Cash display with flash effect on change
    const newCash = state.cash;
    this.cashLabel.setText(formatCash(newCash));
    this.cashLabel.setLabelColor(
      newCash >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    if (newCash !== this.previousCash) {
      audio.sfx(newCash > this.previousCash ? "ui_confirm" : "ui_error");
      const flashTint =
        newCash > this.previousCash ? theme.colors.profit : theme.colors.loss;
      this.cashLabel.setTint(flashTint);
      this.tweens.add({
        targets: this.cashLabel,
        alpha: { from: 1, to: 0.5 },
        duration: 150,
        yoyo: true,
        onComplete: () => {
          this.cashLabel.clearTint();
        },
      });
      this.previousCash = newCash;
    }

    this.phaseLabel.setText(`Phase: ${state.phase}`);
    this.endTurnButton.setVisible(state.phase === "planning");
  }

  /**
   * Central method for all content scene transitions. Content scenes
   * must use this instead of calling scene.start() directly.
   * Access from any scene: (this.scene.get("GameHUDScene") as GameHUDScene).switchContentScene(name)
   */
  switchContentScene(sceneName: string, data?: object): void {
    const audio = getAudioDirector();

    // Stop overlay scenes that might be stacked on top
    const overlayScenes = ["PlanetDetailScene"];
    for (const key of overlayScenes) {
      if (this.scene.isActive(key)) {
        this.scene.stop(key);
      }
    }

    if (sceneName === this.activeContentScene) return;

    if (sceneName === "SimPlaybackScene") {
      audio.setMusicState("sim");
      audio.sfx("ui_end_turn");
    } else if (sceneName === "TurnReportScene") {
      audio.setMusicState("report");
      audio.sfx("ui_confirm");
    } else {
      audio.setMusicState("planning");
      switch (sceneName) {
        case "GalaxyMapScene":
          audio.setPlanningSubstate("galaxy");
          break;
        case "FleetScene":
          audio.setPlanningSubstate("fleet");
          break;
        case "RoutesScene":
          audio.setPlanningSubstate("routes");
          break;
        case "MarketScene":
          audio.setPlanningSubstate("market");
          break;
        case "FinanceScene":
          audio.setPlanningSubstate("finance");
          break;
      }
    }

    // Stop current content scene (check it's actually running)
    if (
      this.scene.isActive(this.activeContentScene) ||
      this.scene.isPaused(this.activeContentScene)
    ) {
      this.scene.stop(this.activeContentScene);
    }

    // Launch new content scene
    this.scene.launch(sceneName, data);

    // Update active indicators
    for (const [scene, indicator] of this.navIndicators) {
      indicator.setVisible(scene === sceneName);
    }

    this.activeContentScene = sceneName;
    this.scene.bringToTop();
  }

  private toggleAudioPanel(): void {
    if (this.audioPanelOpen) {
      this.destroyAudioPanel();
      return;
    }

    this.openAudioPanel();
  }

  private openAudioPanel(): void {
    if (this.audioPanelOpen) return;

    const audio = getAudioDirector();
    const settings = audio.getSettings();

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35)
      .setOrigin(0, 0)
      .setInteractive();
    overlay.on("pointerup", () => {
      this.destroyAudioPanel();
      audio.sfx("ui_modal_close");
    });

    const panelW = 420;
    const panelH = 260;
    const panelX = Math.floor((GAME_WIDTH - panelW) / 2);
    const panelY = Math.floor((GAME_HEIGHT - panelH) / 2);
    const panel = new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Audio Settings",
    });

    const content = panel.getContentArea();
    const row1Y = panelY + content.y + 8;
    const row2Y = row1Y + 62;
    const row3Y = row2Y + 62;

    const musicLabel = new Label(this, {
      x: panelX + content.x,
      y: row1Y,
      text: "Music Volume",
      style: "body",
    });

    this.musicVolumeValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row1Y,
      text: `${Math.round(settings.musicVolume * 100)}%`,
      style: "value",
    });
    this.musicVolumeValueLabel.setOrigin(1, 0);

    const decMusicBtn = new Button(this, {
      x: panelX + content.x,
      y: row1Y + 26,
      width: 46,
      height: 32,
      label: "-",
      onClick: () => {
        const current = audio.getSettings().musicVolume;
        audio.setMusicVolume(current - 0.1);
        this.refreshAudioPanelValues();
      },
    });

    const incMusicBtn = new Button(this, {
      x: panelX + content.x + 54,
      y: row1Y + 26,
      width: 46,
      height: 32,
      label: "+",
      onClick: () => {
        const current = audio.getSettings().musicVolume;
        audio.setMusicVolume(current + 0.1);
        this.refreshAudioPanelValues();
      },
    });

    const sfxLabel = new Label(this, {
      x: panelX + content.x,
      y: row2Y,
      text: "SFX Volume",
      style: "body",
    });

    this.sfxVolumeValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row2Y,
      text: `${Math.round(settings.sfxVolume * 100)}%`,
      style: "value",
    });
    this.sfxVolumeValueLabel.setOrigin(1, 0);

    const decSfxBtn = new Button(this, {
      x: panelX + content.x,
      y: row2Y + 26,
      width: 46,
      height: 32,
      label: "-",
      onClick: () => {
        const current = audio.getSettings().sfxVolume;
        audio.setSfxVolume(current - 0.1);
        this.refreshAudioPanelValues();
        audio.sfx("ui_click_secondary");
      },
    });

    const incSfxBtn = new Button(this, {
      x: panelX + content.x + 54,
      y: row2Y + 26,
      width: 46,
      height: 32,
      label: "+",
      onClick: () => {
        const current = audio.getSettings().sfxVolume;
        audio.setSfxVolume(current + 0.1);
        this.refreshAudioPanelValues();
        audio.sfx("ui_click_secondary");
      },
    });

    const reducedLabel = new Label(this, {
      x: panelX + content.x,
      y: row3Y,
      text: "Reduced UI SFX",
      style: "body",
    });

    this.reducedUiSfxValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row3Y,
      text: settings.reducedUiSfx ? "On" : "Off",
      style: "value",
    });
    this.reducedUiSfxValueLabel.setOrigin(1, 0);

    const toggleReducedBtn = new Button(this, {
      x: panelX + content.x,
      y: row3Y + 26,
      width: 100,
      height: 32,
      label: "Toggle",
      onClick: () => {
        const current = audio.getSettings().reducedUiSfx;
        audio.setReducedUiSfx(!current);
        this.refreshAudioPanelValues();
        audio.sfx("ui_confirm");
      },
    });

    const closeBtn = new Button(this, {
      x: panelX + panelW - content.x - 110,
      y: panelY + panelH - 44,
      width: 110,
      height: 32,
      label: "Close",
      onClick: () => {
        this.destroyAudioPanel();
        audio.sfx("ui_modal_close");
      },
    });

    this.audioPanelObjects = [
      overlay,
      panel,
      musicLabel,
      decMusicBtn,
      incMusicBtn,
      sfxLabel,
      decSfxBtn,
      incSfxBtn,
      reducedLabel,
      toggleReducedBtn,
      closeBtn,
    ];

    if (this.musicVolumeValueLabel) {
      this.audioPanelObjects.push(this.musicVolumeValueLabel);
    }
    if (this.sfxVolumeValueLabel) {
      this.audioPanelObjects.push(this.sfxVolumeValueLabel);
    }
    if (this.reducedUiSfxValueLabel) {
      this.audioPanelObjects.push(this.reducedUiSfxValueLabel);
    }

    this.audioPanelOpen = true;
    audio.sfx("ui_modal_open");
  }

  private refreshAudioPanelValues(): void {
    if (!this.audioPanelOpen) return;
    const settings = getAudioDirector().getSettings();

    this.musicVolumeValueLabel?.setText(
      `${Math.round(settings.musicVolume * 100)}%`,
    );
    this.sfxVolumeValueLabel?.setText(
      `${Math.round(settings.sfxVolume * 100)}%`,
    );
    this.reducedUiSfxValueLabel?.setText(settings.reducedUiSfx ? "On" : "Off");
  }

  private destroyAudioPanel(): void {
    for (const obj of this.audioPanelObjects) {
      if (obj.active) {
        obj.destroy();
      }
    }
    this.audioPanelObjects = [];
    this.musicVolumeValueLabel = null;
    this.sfxVolumeValueLabel = null;
    this.reducedUiSfxValueLabel = null;
    this.audioPanelOpen = false;
  }
}
