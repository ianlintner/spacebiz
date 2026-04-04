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
  NAV_SIDEBAR_WIDTH,
} from "../ui/Layout.ts";
import { gameStore } from "../data/GameStore.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { Tooltip } from "../ui/Tooltip.ts";

function formatCash(amount: number): string {
  return "\u00A7" + amount.toLocaleString();
}

export class GameHUDScene extends Phaser.Scene {
  private companyLabel!: Label;
  private turnLabel!: Label;
  private cashLabel!: Label;
  private phaseLabel!: Label;
  private bottomTurnInfoLabel!: Label;
  private endTurnButton!: Button;
  private activeContentScene = "GalaxyMapScene";
  private previousCash = 0;
  private navIndicators = new Map<string, Phaser.GameObjects.Rectangle>();
  private navBackgrounds = new Map<string, Phaser.GameObjects.Rectangle>();
  private navIcons = new Map<string, Phaser.GameObjects.Image>();
  private navHitAreas = new Map<string, Phaser.GameObjects.Container>();
  private navTooltip!: Tooltip;
  private audioPanelObjects: Phaser.GameObjects.GameObject[] = [];
  private audioPanelOpen = false;
  private musicVolumeValueLabel: Label | null = null;
  private sfxVolumeValueLabel: Label | null = null;
  private reducedUiSfxValueLabel: Label | null = null;
  private musicStyleValueLabel: Label | null = null;
  private musicTrackValueLabel: Label | null = null;
  private muteValueLabel: Label | null = null;

  private readonly contentSceneKeys = [
    "GalaxyMapScene",
    "SystemMapScene",
    "FleetScene",
    "RoutesScene",
    "FinanceScene",
    "MarketScene",
    "SimPlaybackScene",
    "TurnReportScene",
  ];

  private readonly overlaySceneKeys = ["PlanetDetailScene"];

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

    // ── Left Navigation Sidebar (Paradox-style icon strip) ──
    const navItems = [
      { label: "Map", scene: "GalaxyMapScene", icon: "icon-map" },
      { label: "Fleet", scene: "FleetScene", icon: "icon-fleet" },
      { label: "Routes", scene: "RoutesScene", icon: "icon-routes" },
      { label: "Finance", scene: "FinanceScene", icon: "icon-finance" },
      { label: "Market", scene: "MarketScene", icon: "icon-market" },
    ];

    const navSidebarTop = HUD_TOP_BAR_HEIGHT;
    const navSidebarH =
      GAME_HEIGHT - HUD_TOP_BAR_HEIGHT - HUD_BOTTOM_BAR_HEIGHT;

    // Sidebar background strip
    this.add
      .nineslice(
        0,
        navSidebarTop,
        "hud-bar-bg",
        undefined,
        NAV_SIDEBAR_WIDTH,
        navSidebarH,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.88);

    // Right edge accent line
    this.add
      .rectangle(
        NAV_SIDEBAR_WIDTH - 1,
        navSidebarTop,
        1,
        navSidebarH,
        theme.colors.panelBorder,
      )
      .setOrigin(0, 0)
      .setAlpha(0.6);

    this.navTooltip = new Tooltip(this, { showDelay: 300 });

    const iconBtnSize = 46;
    const iconSpacing = 8;
    const navStartY = navSidebarTop + 12;
    const navCenterX = NAV_SIDEBAR_WIDTH / 2;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      const btnY =
        navStartY + i * (iconBtnSize + iconSpacing) + iconBtnSize / 2;
      const btnContainer = this.add.container(navCenterX, btnY);
      btnContainer.setSize(NAV_SIDEBAR_WIDTH, iconBtnSize + iconSpacing + 4);
      btnContainer.setInteractive(
        new Phaser.Geom.Rectangle(
          -NAV_SIDEBAR_WIDTH / 2,
          -(iconBtnSize + iconSpacing + 4) / 2,
          NAV_SIDEBAR_WIDTH,
          iconBtnSize + iconSpacing + 4,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
      if (btnContainer.input) {
        btnContainer.input.cursor = "pointer";
      }

      // Button background (hover/active states)
      const bg = this.add
        .rectangle(
          0,
          0,
          iconBtnSize + 4,
          iconBtnSize + 4,
          theme.colors.buttonBg,
          0.0,
        )
        .setOrigin(0.5, 0.5);

      // Icon image
      const icon = this.add.image(0, 0, item.icon).setOrigin(0.5, 0.5);

      // Active indicator: left-edge accent bar (3px wide, full button height)
      const indicator = this.add
        .rectangle(-(iconBtnSize / 2), 0, 3, iconBtnSize, theme.colors.accent)
        .setOrigin(0, 0.5)
        .setX(-(iconBtnSize / 2));

      const isActive = item.scene === this.activeContentScene;
      indicator.setVisible(isActive);
      if (isActive) {
        bg.setAlpha(0.3);
        icon.setTint(theme.colors.accent);
      } else {
        icon.setTint(theme.colors.textDim);
      }

      btnContainer.add([bg, icon, indicator]);

      // Tooltip
      this.navTooltip.attachTo(btnContainer, item.label);

      btnContainer.on("pointerover", () => {
        if (item.scene !== this.activeContentScene) {
          getAudioDirector().sfx("ui_hover");
          bg.setAlpha(0.22);
          icon.setTint(theme.colors.text);
        }
      });
      btnContainer.on("pointerout", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.0);
          icon.setTint(theme.colors.textDim);
        }
      });
      btnContainer.on("pointerdown", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.32);
        }
      });
      btnContainer.on("pointerup", () => {
        getAudioDirector().sfx("ui_click_primary");
        this.switchContentScene(item.scene);
      });
      btnContainer.on("pointerupoutside", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.0);
        }
      });

      this.navIndicators.set(item.scene, indicator);
      this.navBackgrounds.set(item.scene, bg);
      this.navIcons.set(item.scene, icon);
      this.navHitAreas.set(item.scene, btnContainer);
    }

    // ── Audio button at bottom of nav sidebar ──
    const audioBtnY = navSidebarTop + navSidebarH - iconBtnSize / 2 - 12;
    const audioContainer = this.add.container(navCenterX, audioBtnY);

    const audioHit = this.add
      .rectangle(
        0,
        0,
        NAV_SIDEBAR_WIDTH,
        iconBtnSize + iconSpacing,
        0x000000,
        0,
      )
      .setOrigin(0.5, 0.5)
      .setInteractive(
        new Phaser.Geom.Rectangle(
          -NAV_SIDEBAR_WIDTH / 2,
          -(iconBtnSize + iconSpacing) / 2,
          NAV_SIDEBAR_WIDTH,
          iconBtnSize + iconSpacing,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
    if (audioHit.input) {
      audioHit.input.cursor = "pointer";
    }

    const audioBg = this.add
      .rectangle(0, 0, iconBtnSize, iconBtnSize, theme.colors.buttonBg, 0.0)
      .setOrigin(0.5, 0.5);

    const audioIcon = this.add
      .image(0, 0, "icon-audio")
      .setOrigin(0.5, 0.5)
      .setTint(theme.colors.textDim);

    audioContainer.add([audioHit, audioBg, audioIcon]);
    this.navTooltip.attachTo(audioHit, "Audio Settings");

    audioHit.on("pointerover", () => {
      getAudioDirector().sfx("ui_hover");
      audioBg.setAlpha(0.2);
      audioIcon.setTint(theme.colors.text);
    });
    audioHit.on("pointerout", () => {
      audioBg.setAlpha(0.0);
      audioIcon.setTint(theme.colors.textDim);
    });
    audioHit.on("pointerup", () => {
      this.toggleAudioPanel();
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

    // End Turn button cluster (bottom right area)
    // Turn info display
    const currentQuarter = ((state.turn - 1) % 4) + 1;
    const currentYear = Math.ceil(state.turn / 4);
    this.bottomTurnInfoLabel = new Label(this, {
      x: GAME_WIDTH - 12,
      y: bottomBarY - 2,
      text: `Q${currentQuarter} Y${currentYear}`,
      style: "caption",
    });
    this.bottomTurnInfoLabel.setOrigin(1, 1);

    // End Turn button (rounded, bottom-right corner)
    const endTurnSize = 52;
    this.endTurnButton = new Button(this, {
      x: GAME_WIDTH - endTurnSize - 12,
      y: bottomBarY,
      width: endTurnSize,
      height: endTurnSize,
      label: "▶",
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
    this.bottomTurnInfoLabel.setText(`Q${quarter} Y${year}`);

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

    // Disable nav buttons during simulation and review phases
    const navEnabled = state.phase === "planning";
    for (const [, hitArea] of this.navHitAreas) {
      if (navEnabled) {
        hitArea.setInteractive(
          new Phaser.Geom.Rectangle(
            -NAV_SIDEBAR_WIDTH / 2,
            -29,
            NAV_SIDEBAR_WIDTH,
            58,
          ),
          Phaser.Geom.Rectangle.Contains,
        );
        if (hitArea.input) {
          hitArea.input.cursor = "pointer";
        }
      } else {
        hitArea.disableInteractive();
      }
    }
  }

  /**
   * Central method for all content scene transitions. Content scenes
   * must use this instead of calling scene.start() directly.
   * Access from any scene: (this.scene.get("GameHUDScene") as GameHUDScene).switchContentScene(name)
   */
  switchContentScene(sceneName: string, data?: object): void {
    const audio = getAudioDirector();
    const theme = getTheme();

    if (this.audioPanelOpen) {
      this.destroyAudioPanel();
    }

    // Stop overlay scenes that might be stacked on top
    for (const key of this.overlaySceneKeys) {
      if (this.scene.isActive(key)) {
        this.scene.stop(key);
      }
    }

    for (const key of this.contentSceneKeys) {
      if (
        key !== sceneName &&
        (this.scene.isActive(key) || this.scene.isPaused(key))
      ) {
        this.scene.stop(key);
      }
    }

    if (sceneName === "SimPlaybackScene") {
      gameStore.update({ phase: "simulation" });
      audio.setMusicState("sim");
      audio.sfx("ui_end_turn");
    } else if (sceneName === "TurnReportScene") {
      gameStore.update({ phase: "review" });
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

    if (
      sceneName === this.activeContentScene &&
      this.scene.isActive(sceneName)
    ) {
      this.updateNavVisualState(sceneName, theme);
      this.scene.bringToTop();
      return;
    }

    // Stop current content scene (check it's actually running)
    if (
      this.scene.isActive(this.activeContentScene) ||
      this.scene.isPaused(this.activeContentScene)
    ) {
      this.scene.stop(this.activeContentScene);
    }

    if (this.scene.isActive(sceneName) || this.scene.isPaused(sceneName)) {
      this.scene.stop(sceneName);
    }

    // Launch new content scene
    this.scene.launch(sceneName, data);

    this.activeContentScene = sceneName;
    this.updateNavVisualState(sceneName, theme);
    this.scene.bringToTop();
  }

  private updateNavVisualState(sceneName: string, theme = getTheme()): void {
    for (const [scene, indicator] of this.navIndicators) {
      const isActive = scene === sceneName;
      indicator.setVisible(isActive);
      const bg = this.navBackgrounds.get(scene);
      const icon = this.navIcons.get(scene);
      if (bg && icon) {
        bg.setAlpha(isActive ? 0.32 : 0.0);
        icon.setTint(isActive ? theme.colors.accent : theme.colors.textDim);
      }
    }
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
    const panelH = 456;
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
    const row4Y = row3Y + 62;
    const row5Y = row4Y + 62;
    const row6Y = row5Y + 62;

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

    const styleLabel = new Label(this, {
      x: panelX + content.x,
      y: row4Y,
      text: "Music Style",
      style: "body",
    });

    const prettyStyle = (
      style: "ambient" | "ftl" | "score" | "retro",
    ): string => {
      switch (style) {
        case "ftl":
          return "FTL";
        case "score":
          return "Score";
        case "retro":
          return "Retro";
        default:
          return "Ambient";
      }
    };

    this.musicStyleValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row4Y,
      text: prettyStyle(settings.musicStyle),
      style: "value",
    });
    this.musicStyleValueLabel.setOrigin(1, 0);

    const cycleStyleBtn = new Button(this, {
      x: panelX + content.x,
      y: row4Y + 26,
      width: 120,
      height: 32,
      label: "Cycle",
      onClick: () => {
        const current = audio.getSettings().musicStyle;
        const next =
          current === "ambient"
            ? "ftl"
            : current === "ftl"
              ? "score"
              : current === "score"
                ? "retro"
                : "ambient";
        audio.setMusicStyle(next);
        this.refreshAudioPanelValues();
        audio.sfx("ui_tab_switch");
      },
    });

    const muteLabel = new Label(this, {
      x: panelX + content.x,
      y: row6Y,
      text: "Mute All",
      style: "body",
    });

    const trackLabel = new Label(this, {
      x: panelX + content.x,
      y: row5Y,
      text: "Now Playing",
      style: "body",
    });

    this.musicTrackValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row5Y,
      text: audio.getCurrentTrackLabel(),
      style: "value",
    });
    this.musicTrackValueLabel.setOrigin(1, 0);

    const prevTrackBtn = new Button(this, {
      x: panelX + content.x,
      y: row5Y + 26,
      width: 80,
      height: 32,
      label: "Back",
      onClick: () => {
        audio.previousTrack();
        this.refreshAudioPanelValues();
        audio.sfx("ui_tab_switch");
      },
    });

    const nextTrackBtn = new Button(this, {
      x: panelX + content.x + 88,
      y: row5Y + 26,
      width: 80,
      height: 32,
      label: "Next",
      onClick: () => {
        audio.nextTrack();
        this.refreshAudioPanelValues();
        audio.sfx("ui_tab_switch");
      },
    });

    this.muteValueLabel = new Label(this, {
      x: panelX + panelW - content.x,
      y: row6Y,
      text:
        settings.musicVolume === 0 && settings.sfxVolume === 0 ? "Muted" : "On",
      style: "value",
    });
    this.muteValueLabel.setOrigin(1, 0);

    const muteBtn = new Button(this, {
      x: panelX + content.x,
      y: row6Y + 26,
      width: 120,
      height: 32,
      label: "Toggle Mute",
      onClick: () => {
        const s = audio.getSettings();
        if (s.musicVolume > 0 || s.sfxVolume > 0) {
          audio.setMusicVolume(0);
          audio.setSfxVolume(0);
        } else {
          audio.setMusicVolume(0.7);
          audio.setSfxVolume(0.8);
        }
        this.refreshAudioPanelValues();
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
      styleLabel,
      cycleStyleBtn,
      trackLabel,
      prevTrackBtn,
      nextTrackBtn,
      muteLabel,
      muteBtn,
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
    if (this.musicStyleValueLabel) {
      this.audioPanelObjects.push(this.musicStyleValueLabel);
    }
    if (this.musicTrackValueLabel) {
      this.audioPanelObjects.push(this.musicTrackValueLabel);
    }
    if (this.muteValueLabel) {
      this.audioPanelObjects.push(this.muteValueLabel);
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
    this.musicStyleValueLabel?.setText(
      settings.musicStyle === "ftl"
        ? "FTL"
        : settings.musicStyle === "score"
          ? "Score"
          : settings.musicStyle === "retro"
            ? "Retro"
            : "Ambient",
    );
    this.musicTrackValueLabel?.setText(
      getAudioDirector().getCurrentTrackLabel(),
    );
    this.muteValueLabel?.setText(
      settings.musicVolume === 0 && settings.sfxVolume === 0 ? "Muted" : "On",
    );
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
    this.musicStyleValueLabel = null;
    this.musicTrackValueLabel = null;
    this.muteValueLabel = null;
    this.audioPanelOpen = false;
  }
}
