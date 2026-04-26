import * as Phaser from "phaser";
import {
  Button,
  Label,
  Modal,
  Panel,
  getTheme,
  getLayout,
  Tooltip,
  FloatingText,
  AdviserPanel,
  TutorialOverlay,
} from "../ui/index.ts";
import { gameStore } from "../data/GameStore.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { checkTutorialAdvancement } from "../game/adviser/AdviserEngine.ts";
import type {
  TutorialTrigger,
  AdviserMessage,
  NavTabId,
} from "../data/types.ts";
import { TUTORIAL_STEPS } from "../game/adviser/TutorialDefinitions.ts";
import {
  getAvailableRouteSlots,
  getUsedRouteSlots,
  getAvailableLocalRouteSlots,
  getUsedLocalRouteSlots,
} from "../game/routes/RouteManager.ts";
import { getPortraitTextureKey } from "../data/portraits.ts";
import {
  portraitLoader,
  PORTRAIT_PLACEHOLDER_KEY,
} from "../game/PortraitLoader.ts";
import { getNewlyUnlockedTabs } from "../game/nav/NavUnlocks.ts";

/** Mapping from NavTabId to the Phaser scene key used for that nav item. */
const NAV_TAB_TO_SCENE: Record<NavTabId, string> = {
  map: "GalaxyMapScene",
  routes: "RoutesScene",
  fleet: "FleetScene",
  contracts: "ContractsScene",
  market: "MarketScene",
  research: "TechTreeScene",
  finance: "FinanceScene",
  empires: "EmpireScene",
  rivals: "CompetitionScene",
  hub: "StationBuilderScene",
};

function formatCash(amount: number): string {
  return "\u00A7" + Math.round(amount).toLocaleString("en-US");
}

function fitImageCover(
  image: Phaser.GameObjects.Image,
  width: number,
  height: number,
): void {
  const srcW = Math.max(1, image.width);
  const srcH = Math.max(1, image.height);
  const scale = Math.max(width / srcW, height / srcH);
  image.setDisplaySize(srcW * scale, srcH * scale);
}

export class GameHUDScene extends Phaser.Scene {
  private companyLabel!: Label;
  private turnLabel!: Label;
  private cashLabel!: Label;
  private streakLabel!: Label;
  private phaseLabel!: Label;
  private bottomTurnInfoLabel!: Label;
  private endTurnButton!: Button;
  private activeContentScene = "GalaxyMapScene";
  private activeContentData?: object;
  private previousCash = 0;
  private navIndicators = new Map<string, Phaser.GameObjects.Rectangle>();
  private navBackgrounds = new Map<string, Phaser.GameObjects.Rectangle>();
  private navIcons = new Map<string, Phaser.GameObjects.Image>();
  private navHitAreas = new Map<string, Phaser.GameObjects.Rectangle>();
  private navTooltip!: Tooltip;
  /** Tracks the tabs that were visible last time we updated, for unlock animation. */
  private knownUnlockedNavTabs: NavTabId[] = [];
  private audioPanelObjects: Phaser.GameObjects.GameObject[] = [];
  private audioPanelOpen = false;
  private musicVolumeValueLabel: Label | null = null;
  private sfxVolumeValueLabel: Label | null = null;
  private reducedUiSfxValueLabel: Label | null = null;
  private musicStyleValueLabel: Label | null = null;
  private musicTrackValueLabel: Label | null = null;
  private muteValueLabel: Label | null = null;
  private adviserPanel!: AdviserPanel;
  private tutorialOverlay: TutorialOverlay | null = null;
  private actionPromptLabel!: Label;
  private routeSlotLabel!: Label;
  private researchLabel!: Label;
  private apBadgeLabel!: Label;
  private navBadges = new Map<string, Phaser.GameObjects.Arc>();
  private endTurnModal: Modal | null = null;
  private readonly navIconButtonSize = 46;
  private readonly navIconSpacing = 8;
  private readonly navHitHeight = 50;
  private readonly navTooltipByScene: Record<string, string> = {
    GalaxyMapScene: "Galaxy overview — scan territory, lanes, and route flow",
    RoutesScene: "Route Command — create and optimize trade routes",
    FleetScene: "Fleet Ops — assign ships and monitor condition",
    ContractsScene: "Contracts — accept mission cargo for bonus income",
    MarketScene: "Market Intel — compare prices and demand across worlds",
    TechTreeScene: "Research — choose technologies and track progress",
    FinanceScene: "Finance — review cashflow, loans, and net worth",
    EmpireScene: "Empires — diplomacy, borders, and trade policy",
    CompetitionScene: "Rivals — standings and competitor performance",
    StationBuilderScene:
      "Hub Station — build rooms and upgrade your orbital hub",
  };

  private readonly contentSceneKeys = [
    "GalaxyMapScene",
    "SystemMapScene",
    "FleetScene",
    "RoutesScene",
    "ContractsScene",
    "TechTreeScene",
    "FinanceScene",
    "MarketScene",
    "EmpireScene",
    "CompetitionScene",
    "StationBuilderScene",
    "SimPlaybackScene",
    "TurnReportScene",
  ];

  private readonly overlaySceneKeys = ["PlanetDetailScene", "DilemmaScene"];

  private stateListener = (_data: unknown) => {
    this.updateHUD();
    this.maybeShowDilemma();
  };

  constructor() {
    super({ key: "GameHUDScene" });
  }

  init(data?: { restoreScene?: string; restoreData?: object }): void {
    this.activeContentScene = data?.restoreScene ?? "GalaxyMapScene";
    this.activeContentData = data?.restoreData;
  }

  create(): void {
    const L = getLayout();
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
        L.gameWidth,
        L.hudTopBarHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.92);

    // CEO portrait (small, left of company name)
    const portraitSize = L.hudTopBarHeight - 12;
    const portraitKey = getPortraitTextureKey(state.ceoPortrait.portraitId);
    const hudPortraitX = 6 + portraitSize / 2;
    const hudPortraitY = L.hudTopBarHeight / 2;

    // Always add the image — start with placeholder if texture not yet loaded
    const initialKey = this.textures.exists(portraitKey)
      ? portraitKey
      : PORTRAIT_PLACEHOLDER_KEY;
    const portraitImg = this.add
      .image(hudPortraitX, hudPortraitY, initialKey)
      .setOrigin(0.5, 0.5);
    fitImageCover(portraitImg, portraitSize, portraitSize);
    // Round mask (Phaser 4 Mask filter)
    const hudMask = this.add
      .circle(hudPortraitX, hudPortraitY, portraitSize / 2, 0xffffff)
      .setVisible(false);
    portraitImg.filters?.internal.addMask(hudMask);
    // Subtle border ring
    this.add
      .circle(hudPortraitX, hudPortraitY, portraitSize / 2 + 1)
      .setStrokeStyle(1, theme.colors.panelBorder)
      .setFillStyle(0x000000, 0);

    // If portrait wasn't pre-loaded (save-game path), fetch it now
    if (!this.textures.exists(portraitKey)) {
      portraitLoader
        .ensureCeoPortrait(this, state.ceoPortrait.portraitId)
        .then((key) => {
          if (portraitImg.active) {
            portraitImg.setTexture(key);
            fitImageCover(portraitImg, portraitSize, portraitSize);
          }
        })
        .catch(() => {
          /* leave placeholder */
        });
    }

    // Company name (left-aligned, shifted right for portrait)
    const nameOffsetX = 6 + portraitSize + 10;
    this.companyLabel = new Label(this, {
      x: nameOffsetX,
      y: L.hudTopBarHeight / 2,
      text: state.companyName,
      style: "body",
    });
    this.companyLabel.setOrigin(0, 0.5);
    this.companyLabel.setInteractive({ useHandCursor: true });
    this.companyLabel.on("pointerover", () => {
      this.companyLabel.setLabelColor(theme.colors.accent);
    });
    this.companyLabel.on("pointerout", () => {
      this.companyLabel.setLabelColor(theme.colors.text);
    });
    this.companyLabel.on("pointerup", () => {
      if (gameStore.getState().phase === "planning") {
        this.switchContentScene("GalaxyMapScene");
      }
    });

    // Turn display (centered)
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel = new Label(this, {
      x: L.gameWidth / 2,
      y: L.hudTopBarHeight / 2,
      text: `Q${quarter} Year ${year}`,
      style: "value",
    });
    this.turnLabel.setOrigin(0.5, 0.5);
    this.turnLabel.setInteractive({ useHandCursor: true });
    this.turnLabel.on("pointerover", () => {
      this.turnLabel.setLabelColor(theme.colors.accent);
    });
    this.turnLabel.on("pointerout", () => {
      this.turnLabel.setLabelColor(theme.colors.text);
    });
    this.turnLabel.on("pointerup", () => {
      if (gameStore.getState().phase === "planning") {
        this.switchContentScene("RoutesScene");
      }
    });

    // AP badge (right of turn label, shows current action points)
    const apCurrent = state.actionPoints?.current ?? 0;
    const apMax = state.actionPoints?.max ?? 0;
    this.apBadgeLabel = new Label(this, {
      x: L.gameWidth / 2 + 80,
      y: L.hudTopBarHeight / 2,
      text: `\u2B21 ${apCurrent}/${apMax} AP`,
      style: "caption",
      color: apCurrent > 0 ? theme.colors.accent : theme.colors.textDim,
    });
    this.apBadgeLabel.setOrigin(0, 0.5);

    // Cash display (right-aligned, green/red conditional)
    this.cashLabel = new Label(this, {
      x: L.gameWidth - 20,
      y: L.hudTopBarHeight / 2,
      text: formatCash(state.cash),
      style: "value",
      color: state.cash >= 0 ? theme.colors.profit : theme.colors.loss,
    });
    this.cashLabel.setOrigin(1, 0.5);
    this.cashLabel.setInteractive({ useHandCursor: true });
    this.cashLabel.on("pointerover", () => {
      this.cashLabel.setScale(1.03);
    });
    this.cashLabel.on("pointerout", () => {
      this.cashLabel.setScale(1);
    });
    this.cashLabel.on("pointerup", () => {
      if (gameStore.getState().phase === "planning") {
        this.switchContentScene("FinanceScene");
      }
    });

    // Streak counter (left of cash, hidden until streak >= 2)
    const initStreak = state.storyteller?.consecutiveProfitTurns ?? 0;
    this.streakLabel = new Label(this, {
      x: L.gameWidth - 20,
      y: L.hudTopBarHeight / 2 + 1,
      text: initStreak >= 2 ? `\uD83D\uDD25 ${initStreak}` : "",
      style: "caption",
      color: theme.colors.accent,
    });
    this.streakLabel.setOrigin(1, 0.5);
    this.streakLabel.setAlpha(initStreak >= 2 ? 1 : 0);

    // ── Left Navigation Sidebar (Paradox-style icon strip) ──
    const navItems = [
      { label: "Map", scene: "GalaxyMapScene", icon: "icon-map" },
      { label: "Routes", scene: "RoutesScene", icon: "icon-routes" },
      { label: "Fleet", scene: "FleetScene", icon: "icon-fleet" },
      { label: "Contracts", scene: "ContractsScene", icon: "icon-contracts" },
      // Market nav removed (Track 2.6): market intel is now embedded in RouteBuilderPanel.
      // MarketScene file is retained for potential future use.
      { label: "Research", scene: "TechTreeScene", icon: "icon-research" },
      { label: "Finance", scene: "FinanceScene", icon: "icon-finance" },
      { label: "Empires", scene: "EmpireScene", icon: "icon-empire" },
      { label: "Rivals", scene: "CompetitionScene", icon: "icon-rival" },
      { label: "Hub", scene: "StationBuilderScene", icon: "icon-hub" },
    ];

    const navSidebarTop = L.hudTopBarHeight;
    const navSidebarH = L.gameHeight - L.hudTopBarHeight - L.hudBottomBarHeight;

    // Sidebar background strip
    this.add
      .nineslice(
        0,
        navSidebarTop,
        "hud-bar-bg",
        undefined,
        L.navSidebarWidth,
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
        L.navSidebarWidth - 1,
        navSidebarTop,
        1,
        navSidebarH,
        theme.colors.panelBorder,
      )
      .setOrigin(0, 0)
      .setAlpha(0.6);

    this.navTooltip = new Tooltip(this, { showDelay: 300 });
    this.navTooltip.attachTo(this.companyLabel, "Back to galaxy map");
    this.navTooltip.attachTo(this.turnLabel, "Open route planning");
    this.navTooltip.attachTo(this.cashLabel, "Open finance overview");

    const iconBtnSize = this.navIconButtonSize;
    const iconSpacing = this.navIconSpacing;
    const navStartY = navSidebarTop + 12;
    const navCenterX = L.navSidebarWidth / 2;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      const btnY =
        navStartY + i * (iconBtnSize + iconSpacing) + iconBtnSize / 2;

      // Explicit hit target aligned in world coordinates.
      // Using a separate rectangle avoids container-local hit area drift.
      const hitRect = this.add
        .rectangle(
          navCenterX,
          btnY,
          L.navSidebarWidth,
          this.navHitHeight,
          0x0,
          0,
        )
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });

      const btnContainer = this.add.container(navCenterX, btnY);
      btnContainer.setSize(L.navSidebarWidth, this.navHitHeight);

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
      this.navTooltip.attachTo(
        hitRect,
        this.navTooltipByScene[item.scene] ?? item.label,
      );

      hitRect.on("pointerover", () => {
        if (item.scene !== this.activeContentScene) {
          getAudioDirector().sfx("ui_hover");
          bg.setAlpha(0.22);
          icon.setTint(theme.colors.text);
        }
      });
      hitRect.on("pointerout", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.0);
          icon.setTint(theme.colors.textDim);
        }
      });
      hitRect.on("pointerdown", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.32);
        }
      });
      hitRect.on("pointerup", () => {
        getAudioDirector().sfx("ui_click_primary");
        this.switchContentScene(item.scene);
      });
      hitRect.on("pointerupoutside", () => {
        if (item.scene !== this.activeContentScene) {
          bg.setAlpha(0.0);
        }
      });

      this.navIndicators.set(item.scene, indicator);
      this.navBackgrounds.set(item.scene, bg);
      this.navIcons.set(item.scene, icon);
      this.navHitAreas.set(item.scene, hitRect);

      // Attention badge (small colored dot, top-right of icon)
      const badge = this.add
        .circle(iconBtnSize / 2 - 4, -iconBtnSize / 2 + 4, 5, theme.colors.loss)
        .setVisible(false);
      btnContainer.add(badge);
      this.navBadges.set(item.scene, badge);
    }

    this.updateNavBadges();
    this.updateNavVisibility();

    // (Adviser tab is now integrated into the AdviserPanel drawer — see below)

    // ── Audio button at bottom of nav sidebar ──
    const audioBtnY = navSidebarTop + navSidebarH - iconBtnSize / 2 - 12;
    const audioContainer = this.add.container(navCenterX, audioBtnY);

    const audioHit = this.add
      .rectangle(
        0,
        0,
        L.navSidebarWidth,
        iconBtnSize + iconSpacing,
        0x000000,
        0,
      )
      .setOrigin(0.5, 0.5)
      .setInteractive(
        new Phaser.Geom.Rectangle(
          0,
          0,
          L.navSidebarWidth,
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
    const bottomBarY = L.gameHeight - L.hudBottomBarHeight;

    this.add
      .nineslice(
        0,
        bottomBarY,
        "hud-bar-bg",
        undefined,
        L.gameWidth,
        L.hudBottomBarHeight,
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
      y: L.gameHeight - L.hudBottomBarHeight / 2,
      text: `Phase: ${state.phase}`,
      style: "caption",
    });
    this.phaseLabel.setOrigin(0, 0.5);

    // Action prompt (right of phase label, with enough clearance)
    this.actionPromptLabel = new Label(this, {
      x: 200,
      y: L.gameHeight - L.hudBottomBarHeight / 2,
      text: "",
      style: "caption",
      color: theme.colors.textDim,
    });
    this.actionPromptLabel.setOrigin(0, 0.5);

    // Route slot indicator (bottom bar, to the left of the end turn area)
    const slotsUsed = getUsedRouteSlots(state) + getUsedLocalRouteSlots(state);
    const slotsTotal =
      getAvailableRouteSlots(state) + getAvailableLocalRouteSlots(state);
    this.routeSlotLabel = new Label(this, {
      x: L.gameWidth - 200,
      y: L.gameHeight - L.hudBottomBarHeight / 2 - 8,
      text: `Routes ${slotsUsed}/${slotsTotal}`,
      style: "caption",
      color: slotsUsed >= slotsTotal ? theme.colors.loss : theme.colors.textDim,
    });
    this.routeSlotLabel.setOrigin(1, 0.5);

    // Research progress indicator (bottom bar, below route slots)
    const techState = state.tech;
    const researchText = techState?.currentResearchId
      ? `Researching...`
      : "No research";
    this.researchLabel = new Label(this, {
      x: L.gameWidth - 200,
      y: L.gameHeight - L.hudBottomBarHeight / 2 + 8,
      text: researchText,
      style: "caption",
      color: techState?.currentResearchId
        ? theme.colors.accent
        : theme.colors.textDim,
    });
    this.researchLabel.setOrigin(1, 0.5);

    this.updateActionPrompt();

    // End Turn button cluster (bottom right area)
    // End Turn button (rounded, bottom-right corner)
    const endTurnSize = 52;
    const endTurnX = L.gameWidth - endTurnSize - 12;
    // Turn info display — sits to the LEFT of the ▶ button with a 12px gap,
    // not stacked above it (previous placement collided with the button).
    const currentQuarter = ((state.turn - 1) % 4) + 1;
    const currentYear = Math.ceil(state.turn / 4);
    this.bottomTurnInfoLabel = new Label(this, {
      x: endTurnX - 12,
      y: bottomBarY + endTurnSize / 2,
      text: `Q${currentQuarter} Y${currentYear}`,
      style: "caption",
    });
    this.bottomTurnInfoLabel.setOrigin(1, 0.5);

    this.endTurnButton = new Button(this, {
      x: endTurnX,
      y: bottomBarY,
      width: endTurnSize,
      height: endTurnSize,
      label: "▶",
      onClick: () => {
        this.handleEndTurn();
      },
    });
    this.endTurnButton.setVisible(state.phase === "planning");

    // ── Adviser Panel (drawer-style, upper-right) ──
    // Tab (36px) is at x=0 of the container, panel body at x=36.
    // When closed, only the tab peeks from the right edge.
    // config.x = open position of the container's left edge (tab).
    const advPanelW = 220;
    const advTabW = 36; // must match TAB_WIDTH in AdviserPanel
    // 8px right-edge gutter so the × close button doesn't collide with
    // right-side HUD nav badges at narrow viewports (~813px).
    const advPanelX = L.gameWidth - advTabW - advPanelW - 8;
    const advPanelY = L.hudTopBarHeight + 8;
    this.adviserPanel = new AdviserPanel(this, {
      x: advPanelX,
      y: advPanelY,
      width: advPanelW,
    });
    this.adviserPanel.setDepth(200);

    // Show any pending adviser messages on load
    const pendingMsgs = state.adviser?.pendingMessages ?? [];
    if (pendingMsgs.length > 0) {
      this.adviserPanel.showMessages(pendingMsgs);
      this.updateAdviserBadge(pendingMsgs.length);
    } else if (state.turn === 1 && state.activeRoutes.length === 0) {
      // ── First-time onboarding: auto-open Rex with route-building prompt ──
      // Only fires on a brand new game (turn 1, no routes yet).
      const onboardMsg: AdviserMessage = {
        id: "rex-onboard-first-route",
        text: "Welcome aboard, Commander! I'm Rex, your K9 corporate adviser.\n\nTo launch your galactic freight empire, you'll need trade routes. Click the Routes icon (↔) in the left navigation bar to build your first corridor and start hauling cargo across the stars!",
        mood: "analyzing",
        priority: 3,
        context: "tip",
        turnGenerated: 1,
      };
      // Short delay so the HUD fully renders before the drawer slides in
      this.time.delayedCall(700, () => {
        this.adviserPanel.showMessages([onboardMsg]);
      });
    }

    // Fire initial tutorial trigger
    this.fireTutorialTrigger("newGame");

    // ── State Subscription ───────────────────────────────────
    gameStore.on("stateChanged", this.stateListener);

    // ── Resize handler: restart HUD and content scenes on layout change ──
    const onResize = () => {
      for (const key of this.contentSceneKeys) {
        if (this.scene.isActive(key) || this.scene.isPaused(key)) {
          this.scene.stop(key);
        }
      }
      for (const key of this.overlaySceneKeys) {
        if (this.scene.isActive(key)) {
          this.scene.stop(key);
        }
      }
      this.scene.restart({
        restoreScene: this.activeContentScene,
        restoreData: this.activeContentData,
      });
    };
    this.scale.on("resize", onResize);

    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
      gameStore.off("stateChanged", this.stateListener);
      this.destroyAudioPanel();
    });

    // Launch content scene (restored on resize, default GalaxyMapScene)
    this.scene.launch(this.activeContentScene, this.activeContentData);
    this.scene.bringToTop();

    // If a dilemma was already pending (e.g. resumed save), surface it now.
    this.maybeShowDilemma();
  }

  private maybeShowDilemma(): void {
    const state = gameStore.getState();
    const hasDilemma = state.pendingChoiceEvents.some(
      (e) => e.dilemmaId !== undefined,
    );
    if (hasDilemma && !this.scene.isActive("DilemmaScene")) {
      this.scene.launch("DilemmaScene");
      this.scene.bringToTop("DilemmaScene");
    }
  }

  private updateHUD(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const audio = getAudioDirector();

    this.companyLabel.setText(state.companyName);

    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel.setText(`Q${quarter} Year ${year}`);
    this.bottomTurnInfoLabel.setText(`Q${quarter} Y${year}`);

    // AP badge update
    const apCurrent = state.actionPoints?.current ?? 0;
    const apMax = state.actionPoints?.max ?? 0;
    this.apBadgeLabel.setText(`\u2B21 ${apCurrent}/${apMax} AP`);
    this.apBadgeLabel.setLabelColor(
      apCurrent > 0 ? theme.colors.accent : theme.colors.textDim,
    );

    // Cash display with flash effect on change
    const newCash = state.cash;
    this.cashLabel.setText(formatCash(newCash));
    this.cashLabel.setLabelColor(
      newCash >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    if (newCash !== this.previousCash) {
      const delta = newCash - this.previousCash;
      const isGain = delta > 0;
      audio.sfx(isGain ? "ui_confirm" : "ui_error");
      const flashTint = isGain ? theme.colors.profit : theme.colors.loss;
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

      // Floating delta popup near the cash label
      const sign = isGain ? "+" : "";
      const deltaStr = sign + formatCash(delta);
      new FloatingText(
        this,
        L.gameWidth - 24,
        L.hudTopBarHeight / 2 - 8,
        deltaStr,
        isGain ? theme.colors.profit : theme.colors.loss,
        { size: "small", riseDistance: 36, driftX: -12 },
      );

      this.previousCash = newCash;
    }

    // Streak label
    const streakTurns = state.storyteller?.consecutiveProfitTurns ?? 0;
    if (streakTurns >= 2) {
      this.streakLabel.setText(`\uD83D\uDD25 ${streakTurns}`);
      this.streakLabel.setAlpha(1);
    } else {
      this.streakLabel.setText("");
      this.streakLabel.setAlpha(0);
    }

    this.phaseLabel.setText(`Phase: ${state.phase}`);
    this.endTurnButton.setVisible(state.phase === "planning");
    this.updateActionPrompt();
    this.updateNavBadges();
    this.updateNavVisibility();

    // Route slot indicator (main + local combined)
    const slotsUsed = getUsedRouteSlots(state) + getUsedLocalRouteSlots(state);
    const slotsTotal =
      getAvailableRouteSlots(state) + getAvailableLocalRouteSlots(state);
    this.routeSlotLabel.setText(`Routes ${slotsUsed}/${slotsTotal}`);
    this.routeSlotLabel.setLabelColor(
      slotsUsed >= slotsTotal ? theme.colors.loss : theme.colors.textDim,
    );

    // Research indicator
    const techState = state.tech;
    if (techState?.currentResearchId) {
      const techCount = (state.tech?.completedTechIds ?? []).length;
      this.researchLabel.setText(`Research \u2022 ${techCount} techs`);
      this.researchLabel.setLabelColor(theme.colors.accent);
    } else {
      this.researchLabel.setText("No research");
      this.researchLabel.setLabelColor(theme.colors.textDim);
    }

    // Disable nav buttons during simulation and review phases
    const navEnabled = state.phase === "planning";
    const disabledReason =
      state.phase === "simulation"
        ? "Locked during simulation"
        : "Quarter complete — review results to continue";
    for (const [scene, hitArea] of this.navHitAreas) {
      if (navEnabled) {
        hitArea.setInteractive({ useHandCursor: true });
        if (hitArea.input) {
          hitArea.input.cursor = "pointer";
        }
        // Restore original tooltip
        if (this.navTooltipByScene[scene]) {
          this.navTooltip.attachTo(hitArea, this.navTooltipByScene[scene]);
        }
      } else {
        hitArea.disableInteractive();
        this.navTooltip.attachTo(hitArea, disabledReason);
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
      // Quarter summary is non-blocking — keep phase as planning so the
      // player can navigate freely while the report is on screen.
      gameStore.update({ phase: "planning" });
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
    this.activeContentData = data;
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

    const L = getLayout();
    const audio = getAudioDirector();
    const settings = audio.getSettings();

    const theme = getTheme();
    const overlay = this.add
      .rectangle(
        0,
        0,
        L.gameWidth,
        L.gameHeight,
        theme.colors.modalOverlay,
        0.35,
      )
      .setOrigin(0, 0)
      .setInteractive();
    overlay.on("pointerup", () => {
      this.destroyAudioPanel();
      audio.sfx("ui_modal_close");
    });

    const panelW = 420;
    const panelH = 456;
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = Math.floor((L.gameHeight - panelH) / 2);
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

  // ── Adviser integration ──────────────────────────────────

  private updateAdviserBadge(count: number): void {
    this.adviserPanel.updateBadge(count);
  }

  /** Call from scenes or HUD to advance tutorial on user actions. */
  fireTutorialTrigger(trigger: TutorialTrigger): void {
    const state = gameStore.getState();
    if (
      !state.adviser ||
      state.adviser.tutorialComplete ||
      state.adviser.tutorialSkipped
    )
      return;

    const result = checkTutorialAdvancement(state.adviser, trigger, state.turn);
    if (result === state.adviser) return; // no change

    // Update game store
    gameStore.update({ adviser: result });

    // Show tutorial overlay for current step
    const step = TUTORIAL_STEPS[result.tutorialStepIndex];
    if (step && result.tutorialStepIndex > state.adviser.tutorialStepIndex) {
      // Previous step was already shown, show the new one
      this.showTutorialStep(result.tutorialStepIndex - 1);
    } else if (result.tutorialStepIndex === 0 && trigger === "newGame") {
      this.showTutorialStep(0);
    }
  }

  private showTutorialStep(stepIndex: number): void {
    if (this.tutorialOverlay) {
      this.tutorialOverlay.close();
      this.tutorialOverlay = null;
    }

    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    this.tutorialOverlay = new TutorialOverlay(this, {
      text: step.text,
      mood: step.mood,
      highlightHint: step.highlightHint,
      onDismiss: () => {
        this.tutorialOverlay = null;
      },
    });
  }

  /** Skip the entire tutorial. */
  skipTutorial(): void {
    const state = gameStore.getState();
    if (!state.adviser) return;
    gameStore.update({
      adviser: { ...state.adviser, tutorialSkipped: true },
    });
  }

  // ── Action prompt & nav badges ─────────────────────────────

  private updateActionPrompt(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    if (state.phase === "simulation") {
      const q = ((state.turn - 1) % 4) + 1;
      const y = Math.ceil(state.turn / 4);
      this.actionPromptLabel.setText(`▶ Simulating Q${q} Y${y}...`);
      this.actionPromptLabel.setLabelColor(theme.colors.accent);
      return;
    }
    if (state.phase === "review") {
      const q = ((state.turn - 1) % 4) + 1;
      const y = Math.ceil(state.turn / 4);
      this.actionPromptLabel.setText(
        `✅ Quarter complete (Q${q} Y${y}) — review results`,
      );
      this.actionPromptLabel.setLabelColor(theme.colors.textDim);
      return;
    }

    // Planning phase — context-sensitive prompt
    if (state.activeRoutes.length === 0) {
      this.actionPromptLabel.setText(
        "💡 Open Routes to set up your first trade route",
      );
      this.actionPromptLabel.setLabelColor(theme.colors.warning);
      return;
    }

    const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
    if (unassigned.length > 0 && state.activeRoutes.length > 0) {
      this.actionPromptLabel.setText(
        `💡 ${unassigned.length} ship${unassigned.length > 1 ? "s" : ""} unassigned — check Fleet`,
      );
      this.actionPromptLabel.setLabelColor(theme.colors.warning);
      return;
    }

    const avgCondition =
      state.fleet.length > 0
        ? state.fleet.reduce((sum, s) => sum + s.condition, 0) /
          state.fleet.length
        : 100;
    if (avgCondition < 50 && state.fleet.length > 0) {
      this.actionPromptLabel.setText(
        "⚠️ Fleet needs maintenance — check Fleet",
      );
      this.actionPromptLabel.setLabelColor(theme.colors.loss);
      return;
    }

    if (state.cash < 0 && state.storyteller.turnsInDebt >= 2) {
      this.actionPromptLabel.setText(
        "⚠️ In debt — sell ships or take a loan in Finance",
      );
      this.actionPromptLabel.setLabelColor(theme.colors.loss);
      return;
    }

    // New Phase 3 prompts: contracts and research
    const availableContracts = (state.contracts ?? []).filter(
      (c) => c.status === "available",
    );
    if (availableContracts.length > 0 && state.activeRoutes.length > 0) {
      this.actionPromptLabel.setText(
        `📋 ${availableContracts.length} contract${availableContracts.length > 1 ? "s" : ""} available — check Contracts`,
      );
      this.actionPromptLabel.setLabelColor(theme.colors.accent);
      return;
    }

    if (!state.tech?.currentResearchId && state.activeRoutes.length > 0) {
      this.actionPromptLabel.setText(
        "🔬 No active research — pick a tech in Research",
      );
      this.actionPromptLabel.setLabelColor(theme.colors.warning);
      return;
    }

    this.actionPromptLabel.setText("✓ Ready — press ▶ to end turn");
    this.actionPromptLabel.setLabelColor(theme.colors.profit);
  }

  /**
   * Shows/hides nav icons based on `unlockedNavTabs` in the current game state.
   * Icons for locked tabs are hidden (alpha 0, non-interactive).
   * Icons for newly unlocked tabs play a brief scale-in tween.
   */
  private updateNavVisibility(): void {
    const state = gameStore.getState();
    const unlocked = new Set(state.unlockedNavTabs);

    // Determine which tabs are newly unlocked since last call
    const newlyUnlocked = getNewlyUnlockedTabs(
      this.knownUnlockedNavTabs,
      state.unlockedNavTabs,
    );
    const newlyUnlockedScenes = new Set(
      newlyUnlocked.map((tab) => NAV_TAB_TO_SCENE[tab]),
    );

    // Update visibility for every nav item
    for (const [tabId, sceneKey] of Object.entries(NAV_TAB_TO_SCENE) as Array<
      [NavTabId, string]
    >) {
      const icon = this.navIcons.get(sceneKey);
      const hitArea = this.navHitAreas.get(sceneKey);
      const bg = this.navBackgrounds.get(sceneKey);
      const indicator = this.navIndicators.get(sceneKey);
      const badge = this.navBadges.get(sceneKey);

      if (!icon || !hitArea) continue;

      const isUnlocked = unlocked.has(tabId);

      if (isUnlocked) {
        // Make visible
        icon.setAlpha(1);
        if (bg) bg.setAlpha(sceneKey === this.activeContentScene ? 0.32 : 0.0);
        if (indicator)
          indicator.setVisible(sceneKey === this.activeContentScene);
        if (badge) badge.setAlpha(1);

        // Re-enable interaction if it was previously disabled due to locking
        if (!hitArea.input) {
          hitArea.setInteractive({ useHandCursor: true });
        }

        // Unlock animation for newly revealed tabs
        if (newlyUnlockedScenes.has(sceneKey)) {
          icon.setScale(0.5);
          this.tweens.add({
            targets: icon,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: "Back.Out",
          });
        }
      } else {
        // Hide: fully transparent, no interaction
        icon.setAlpha(0);
        if (bg) bg.setAlpha(0);
        if (indicator) indicator.setVisible(false);
        if (badge) badge.setAlpha(0);
        hitArea.disableInteractive();
      }
    }

    // Remember the current set for next call
    this.knownUnlockedNavTabs = [...state.unlockedNavTabs];
  }

  private updateNavBadges(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    // Routes badge: red if no routes
    const routesBadge = this.navBadges.get("RoutesScene");
    if (routesBadge) {
      routesBadge.setVisible(
        state.phase === "planning" && state.activeRoutes.length === 0,
      );
      routesBadge.setFillStyle(theme.colors.loss);
    }

    // Fleet badge: yellow if unassigned ships or low condition
    const fleetBadge = this.navBadges.get("FleetScene");
    if (fleetBadge) {
      const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
      const avgCond =
        state.fleet.length > 0
          ? state.fleet.reduce((sum, s) => sum + s.condition, 0) /
            state.fleet.length
          : 100;
      const needsAttention =
        (unassigned.length > 0 && state.activeRoutes.length > 0) ||
        (avgCond < 50 && state.fleet.length > 0);
      fleetBadge.setVisible(state.phase === "planning" && needsAttention);
      fleetBadge.setFillStyle(theme.colors.warning);
    }

    // Finance badge: red if cash negative
    const financeBadge = this.navBadges.get("FinanceScene");
    if (financeBadge) {
      financeBadge.setVisible(state.phase === "planning" && state.cash < 0);
      financeBadge.setFillStyle(theme.colors.loss);
    }

    // Contracts badge: yellow if available contracts to accept
    const contractsBadge = this.navBadges.get("ContractsScene");
    if (contractsBadge) {
      const available = (state.contracts ?? []).filter(
        (c) => c.status === "available",
      );
      contractsBadge.setVisible(
        state.phase === "planning" && available.length > 0,
      );
      contractsBadge.setFillStyle(theme.colors.accent);
    }

    // Research badge: yellow if no active research and RP available
    const researchBadge = this.navBadges.get("TechTreeScene");
    if (researchBadge) {
      const noResearch = !state.tech?.currentResearchId;
      researchBadge.setVisible(state.phase === "planning" && noResearch);
      researchBadge.setFillStyle(theme.colors.warning);
    }

    // Hide all badges during sim/review
    if (state.phase !== "planning") {
      for (const [, badge] of this.navBadges) {
        badge.setVisible(false);
      }
    }
  }

  private handleEndTurn(): void {
    const state = gameStore.getState();
    const issues: string[] = [];

    if (state.activeRoutes.length === 0 && state.fleet.length > 0) {
      issues.push("You have no active routes. Your ships will sit idle.");
    }
    if (state.fleet.length === 0) {
      issues.push("You have no ships! Buy one from Fleet first.");
    }
    const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
    if (unassigned.length > 0 && state.activeRoutes.length > 0) {
      issues.push(
        `${unassigned.length} ship${unassigned.length > 1 ? "s" : ""} not assigned to a route.`,
      );
    }

    if (issues.length === 0) {
      this.switchContentScene("SimPlaybackScene");
      return;
    }

    // Show confirmation modal
    if (this.endTurnModal) {
      this.endTurnModal.destroy();
      this.endTurnModal = null;
    }

    this.endTurnModal = new Modal(this, {
      title: "Before You End Turn",
      body: issues.join("\n") + "\n\nEnd turn anyway?",
      okText: "End Turn",
      cancelText: "Go Back",
      onOk: () => {
        this.endTurnModal?.destroy();
        this.endTurnModal = null;
        this.switchContentScene("SimPlaybackScene");
      },
      onCancel: () => {
        this.endTurnModal?.destroy();
        this.endTurnModal = null;
      },
    });
    this.endTurnModal.setDepth(500);
  }

  /** Determine the best scene to show after a turn report, based on game state. */
  getSmartPostTurnScene(): string {
    const state = gameStore.getState();
    if (state.activeRoutes.length === 0) return "RoutesScene";
    const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
    if (unassigned.length > 0) return "FleetScene";
    if (state.cash < 0) return "FinanceScene";
    return "GalaxyMapScene";
  }
}
