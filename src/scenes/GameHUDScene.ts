import * as Phaser from "phaser";
import {
  Button,
  Label,
  Modal,
  getTheme,
  getLayout,
  Tooltip,
  FloatingText,
  AdviserPanel,
} from "../ui/index.ts";
import { SettingsPanel } from "../ui/SettingsPanel.ts";
import { formatTurnShort, formatTurnLong } from "../utils/turnFormat.ts";
import { HorizontalNewsTicker } from "@rogue-universe/shared";
import { gameStore } from "../data/GameStore.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { checkTutorialAdvancement } from "../game/adviser/AdviserEngine.ts";
import type {
  TutorialTrigger,
  AdviserMessage,
  NavTabId,
} from "../data/types.ts";
import { TUTORIAL_STEPS } from "../game/adviser/TutorialDefinitions.ts";
import type { GameState } from "../data/types.ts";
import { generateTickerFeed } from "../generation/news/tickerFeed.ts";

/**
 * Compact "Charters: 3 (2P/1F) · Upkeep: §2,400" string for the HUD.
 * Replaces the legacy three-tier slot indicator now that empires own slot
 * pools and players hold charters. The P/F suffix splits permanent vs
 * fixed-term so an upcoming auction expiry is easy to spot.
 */
function formatSlotSummary(state: GameState): {
  text: string;
  anySaturated: boolean;
} {
  const charters = state.charters ?? [];
  const permanent = charters.filter((c) => c.term.kind === "permanent").length;
  const fixedTerm = charters.filter((c) => c.term.kind === "fixedTerm").length;
  const upkeep = charters.reduce(
    (sum, c) => sum + (c.term.kind === "permanent" ? c.term.upkeepPerTurn : 0),
    0,
  );
  // Saturation = upcoming upkeep exceeds current cash, or a fixed-term
  // charter expires within 2 turns.
  const cantPay = upkeep > state.cash;
  const expiringSoon = charters.some(
    (c) =>
      c.term.kind === "fixedTerm" && c.term.expiresOnTurn - state.turn <= 2,
  );
  const text = `Charters: ${charters.length} (${permanent}P/${fixedTerm}F) · Upkeep: §${Math.round(
    upkeep,
  ).toLocaleString("en-US")}`;
  return { text, anySaturated: cantPay || expiringSoon };
}
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

/** Delay before surfacing the new-game adviser welcome, so the HUD has
 * fully rendered before the drawer slides in. */
const ADVISER_ONBOARD_DELAY_MS = 700;

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
  // Track turn so the stateListener can detect a turn-advance and clear the
  // adviser drawer — otherwise messages from prior turns pile up.
  private lastSeenTurn = 0;
  private navIndicators = new Map<string, Phaser.GameObjects.Rectangle>();
  private navBackgrounds = new Map<string, Phaser.GameObjects.Rectangle>();
  private navIcons = new Map<string, Phaser.GameObjects.Image>();
  private navHitAreas = new Map<string, Phaser.GameObjects.Rectangle>();
  private navTooltip!: Tooltip;
  /** Tracks the tabs that were visible last time we updated, for unlock animation. */
  private knownUnlockedNavTabs: NavTabId[] = [];
  private settingsPanel: SettingsPanel | null = null;
  private adviserPanel!: AdviserPanel;
  private actionPromptLabel!: Label;
  private routeSlotLabel!: Label;
  private researchLabel!: Label;
  private apBadgeLabel!: Label;
  private navBadges = new Map<string, Phaser.GameObjects.Arc>();
  private endTurnModal: Modal | null = null;
  private newsTicker: HorizontalNewsTicker | null = null;
  private readonly navIconButtonSize = 46;
  private readonly navIconSpacing = 8;
  private readonly navHitHeight = 50;
  private readonly navTooltipByScene: Record<string, string> = {
    GalaxyMapScene: "Galaxy overview — scan territory, lanes, and route flow",
    RoutesScene: "Route Command — create and optimize trade routes",
    FleetScene: "Fleet Ops — assign ships and monitor condition",
    ContractsScene: "Contracts — accept mission cargo for bonus income",
    DiplomacyScene: "Foreign Relations — empires, rivals, and standing",
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
    "DiplomacyScene",
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
    const state = gameStore.getState();
    // Clear stale adviser messages when the turn advances. Without this the
    // drawer accumulates dozens of messages across turns and the player has
    // to mash Next to dismiss them all. We also wipe `state.adviser
    // .pendingMessages` so the queue doesn't keep growing in the background
    // (Rex was reaching 30+ announcements after a few turns).
    if (state.turn !== this.lastSeenTurn && this.adviserPanel) {
      this.lastSeenTurn = state.turn;
      this.adviserPanel.clear();
      this.updateAdviserBadge(0);
      if (state.adviser.pendingMessages.length > 0) {
        gameStore.update({
          adviser: { ...state.adviser, pendingMessages: [] },
        });
      }
    }
    this.updateHUD();
    this.maybeShowDilemma();
    if (this.newsTicker) {
      this.newsTicker.updateItems(this.buildTickerItems(state));
    }
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
    this.lastSeenTurn = state.turn;
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
    this.turnLabel = new Label(this, {
      x: L.gameWidth / 2,
      y: L.hudTopBarHeight / 2,
      text: formatTurnLong(state.turn),
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
      {
        label: "Foreign Relations",
        scene: "DiplomacyScene",
        icon: "icon-contracts", // TODO: dedicated icon
      },
      { label: "Research", scene: "TechTreeScene", icon: "icon-research" },
      { label: "Finance", scene: "FinanceScene", icon: "icon-finance" },
      { label: "Empires", scene: "EmpireScene", icon: "icon-empire" },
      { label: "Rivals", scene: "CompetitionScene", icon: "icon-rival" },
      { label: "Hub", scene: "StationBuilderScene", icon: "icon-hub" },
    ];

    const navSidebarTop = L.hudTopBarHeight;
    const navSidebarH = L.hudBottomBarTop - L.hudTopBarHeight;

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

    // ── Settings buttons (Audio + Save) at bottom of nav sidebar ──
    // Two icon buttons stacked vertically. Audio opens the Audio tab,
    // Save opens the Save/Load tab of the same panel.
    const bottomCluster = navSidebarTop + navSidebarH - 12;
    const audioBtnY = bottomCluster - iconBtnSize / 2 - (iconBtnSize + 6);
    const saveBtnY = bottomCluster - iconBtnSize / 2;

    this.createSettingsIconButton({
      x: navCenterX,
      y: audioBtnY,
      iconKey: "icon-audio",
      tooltip: "Audio Settings",
      onClick: () => this.toggleSettingsPanel("audio"),
    });
    this.createSettingsIconButton({
      x: navCenterX,
      y: saveBtnY,
      iconKey: "icon-save",
      tooltip: "Save / Load",
      onClick: () => this.toggleSettingsPanel("save"),
    });

    // ── Bottom Bar ───────────────────────────────────────────
    const bottomBarY = L.hudBottomBarTop;
    const bottomBarMidY = bottomBarY + L.hudBottomBarHeight / 2;

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
      y: bottomBarMidY,
      text: `Phase: ${state.phase}`,
      style: "caption",
    });
    this.phaseLabel.setOrigin(0, 0.5);

    // Action prompt (right of phase label, with enough clearance)
    this.actionPromptLabel = new Label(this, {
      x: 200,
      y: bottomBarMidY,
      text: "",
      style: "caption",
      color: theme.colors.textDim,
    });
    this.actionPromptLabel.setOrigin(0, 0.5);

    // Route slot indicator (bottom bar, to the left of the end turn area).
    // Shows all three pools inline so a saturated tier is immediately visible.
    const slotSummary = formatSlotSummary(state);
    this.routeSlotLabel = new Label(this, {
      x: L.gameWidth - 200,
      y: bottomBarMidY - 8,
      text: slotSummary.text,
      style: "caption",
      color: slotSummary.anySaturated
        ? theme.colors.loss
        : theme.colors.textDim,
    });
    this.routeSlotLabel.setOrigin(1, 0.5);

    // Research progress indicator (bottom bar, below route slots)
    const techState = state.tech;
    const researchText = techState?.currentResearchId
      ? `Researching...`
      : "No research";
    this.researchLabel = new Label(this, {
      x: L.gameWidth - 200,
      y: bottomBarMidY + 8,
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
    this.bottomTurnInfoLabel = new Label(this, {
      x: endTurnX - 12,
      y: bottomBarY + endTurnSize / 2,
      text: formatTurnShort(state.turn),
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

    // ── Horizontal News Ticker strip (below bottom bar) ──
    const tickerY = L.gameHeight - L.hudTickerHeight;
    this.add
      .rectangle(
        0,
        tickerY,
        L.gameWidth,
        L.hudTickerHeight,
        theme.colors.background,
      )
      .setOrigin(0, 0)
      .setAlpha(0.97)
      .setDepth(290);
    // 1px top border
    this.add
      .rectangle(0, tickerY, L.gameWidth, 1, theme.colors.panelBorder)
      .setOrigin(0, 0)
      .setDepth(291);
    this.newsTicker = new HorizontalNewsTicker(
      this,
      L.navSidebarWidth,
      tickerY,
      L.gameWidth - L.navSidebarWidth,
      L.hudTickerHeight,
    );
    this.newsTicker.updateItems(this.buildTickerItems(state));

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
    }

    // Fire initial tutorial trigger — surfaces the welcome step via the
    // adviser drawer (route-building onboarding).
    this.time.delayedCall(ADVISER_ONBOARD_DELAY_MS, () => {
      this.fireTutorialTrigger("newGame");
    });

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
      this.settingsPanel?.destroy();
      this.settingsPanel = null;
      this.newsTicker?.destroy();
      this.newsTicker = null;
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

    this.turnLabel.setText(formatTurnLong(state.turn));
    this.bottomTurnInfoLabel.setText(formatTurnShort(state.turn));

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

    // Route slot indicator (system / empire / galactic pools).
    const slotSummary = formatSlotSummary(state);
    this.routeSlotLabel.setText(slotSummary.text);
    this.routeSlotLabel.setLabelColor(
      slotSummary.anySaturated ? theme.colors.loss : theme.colors.textDim,
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

    if (this.settingsPanel?.isVisible()) {
      this.settingsPanel.close();
    }

    // Stop overlay scenes that might be stacked on top.
    // DilemmaScene is exempt if it has pending choices — it closes itself.
    for (const key of this.overlaySceneKeys) {
      if (this.scene.isActive(key)) {
        if (key === "DilemmaScene") {
          const hasPending = gameStore
            .getState()
            .pendingChoiceEvents.some((e) => e.dilemmaId !== undefined);
          if (hasPending) continue;
        }
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
      // Close + clear the Rex drawer so it doesn't sit open over the
      // simulation playback. The state-listener-driven clear (lines
      // 173-176) only fires once `state.turn` advances at the END of
      // the simulation, but players want the panel out of the way the
      // moment they hit End Turn.
      this.adviserPanel?.clear();
      this.updateAdviserBadge(0);
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

  private createSettingsIconButton(opts: {
    x: number;
    y: number;
    iconKey: string;
    tooltip: string;
    onClick: () => void;
  }): void {
    const L = getLayout();
    const theme = getTheme();
    const iconBtnSize = this.navIconButtonSize;

    const container = this.add.container(opts.x, opts.y);

    const hit = this.add
      .rectangle(0, 0, L.navSidebarWidth, iconBtnSize + 6, 0x000000, 0)
      .setOrigin(0.5, 0.5)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, L.navSidebarWidth, iconBtnSize + 6),
        Phaser.Geom.Rectangle.Contains,
      );
    if (hit.input) {
      hit.input.cursor = "pointer";
    }

    const bg = this.add
      .rectangle(0, 0, iconBtnSize, iconBtnSize, theme.colors.buttonBg, 0.0)
      .setOrigin(0.5, 0.5);

    const icon = this.add
      .image(0, 0, opts.iconKey)
      .setOrigin(0.5, 0.5)
      .setTint(theme.colors.textDim);

    container.add([hit, bg, icon]);
    this.navTooltip.attachTo(hit, opts.tooltip);

    hit.on("pointerover", () => {
      getAudioDirector().sfx("ui_hover");
      bg.setAlpha(0.2);
      icon.setTint(theme.colors.text);
    });
    hit.on("pointerout", () => {
      bg.setAlpha(0.0);
      icon.setTint(theme.colors.textDim);
    });
    hit.on("pointerup", () => {
      opts.onClick();
    });
  }

  private toggleSettingsPanel(initialTab: "audio" | "save"): void {
    if (!this.settingsPanel) {
      this.settingsPanel = new SettingsPanel(this);
    }
    if (this.settingsPanel.isVisible()) {
      // If the panel is already open on a different tab, switch tabs;
      // if it's already on this tab, close it.
      if (this.settingsPanel.getActiveTabId() === initialTab) {
        this.settingsPanel.close();
      } else {
        this.settingsPanel.open({ initialTab });
      }
      return;
    }
    this.settingsPanel.open({ initialTab });
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
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    // Dedup is by message id (via shownMessageIds in AdviserEngine), and
    // each tutorial step has a unique id, so firing across turns is safe.
    const msg: AdviserMessage = {
      id: step.id,
      text: step.text,
      mood: step.mood,
      priority: 3,
      context: "tutorial",
      turnGenerated: gameStore.getState().turn,
    };
    this.adviserPanel.appendMessages([msg]);
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
      this.actionPromptLabel.setText(
        `▶ Simulating ${formatTurnShort(state.turn)}...`,
      );
      this.actionPromptLabel.setLabelColor(theme.colors.accent);
      return;
    }
    if (state.phase === "review") {
      this.actionPromptLabel.setText(
        `✅ Quarter complete (${formatTurnShort(state.turn)}) — review results`,
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

  private buildTickerItems(state: GameState) {
    const lastTurn = state.history[state.history.length - 1];
    if (!lastTurn) return [];
    return generateTickerFeed(state, lastTurn);
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
