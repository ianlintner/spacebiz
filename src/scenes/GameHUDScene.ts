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
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
  DEPTH_MODAL,
} from "../ui/index.ts";
import { colorToString } from "@spacebiz/ui";
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
import { setGalaxy3DVisible } from "./galaxy3d/GalaxyView3D.ts";
import {
  NAV_GROUPS,
  SCENE_TO_NAV_TAB,
  findGroupForScene,
  hasSceneUrgency,
  resolveDefaultTab,
} from "../game/nav/NavGroups.ts";

/** Mapping from NavTabId to the Phaser scene key used for that nav item. */
const NAV_TAB_TO_SCENE: Partial<Record<NavTabId, string>> = {
  map: "GalaxyMapScene",
  routes: "RoutesScene",
  fleet: "FleetScene",
  contracts: "ContractsScene",
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
  // ── Layout-derived widgets re-positioned/re-sized by relayout() ──
  private topBarBg!: Phaser.GameObjects.NineSlice;
  private bottomBarBg!: Phaser.GameObjects.NineSlice;
  private navSidebarBg!: Phaser.GameObjects.NineSlice;
  private navSidebarAccent!: Phaser.GameObjects.Rectangle;
  private tickerBg!: Phaser.GameObjects.Rectangle;
  private tickerBorder!: Phaser.GameObjects.Rectangle;
  private ceoPortraitImg!: Phaser.GameObjects.Image;
  private ceoPortraitMask!: Phaser.GameObjects.Arc;
  private ceoPortraitBorder!: Phaser.GameObjects.Arc;
  /** Per-nav button containers (used by relayout to reposition the cluster). */
  private navContainers = new Map<string, Phaser.GameObjects.Container>();
  /** Order of nav scenes as built — needed to recompute Y on resize. */
  private navOrder: string[] = [];
  /** In-session memory: last scene the player opened within each group. */
  private lastVisitedByGroup = new Map<string, string>();
  /** Horizontal tab strip rendered when a grouped scene is active. */
  private tabStrip!: Phaser.GameObjects.Container;
  /** Settings (audio + save) icon buttons; stored for repositioning. */
  private settingsButtons: Array<{
    container: Phaser.GameObjects.Container;
    /** "audio" | "save" — drives Y placement relative to bottom of sidebar. */
    role: "audio" | "save";
  }> = [];
  private readonly navIconButtonSize = 46;
  private readonly navIconSpacing = 8;
  private readonly navHitHeight = 50;
  private readonly navTooltipByScene: Record<string, string> = {
    GalaxyMapScene: "Galaxy overview — scan territory, lanes, and route flow",
    RoutesScene: "Route Command — create and optimize trade routes",
    FleetScene: "Fleet Ops — assign ships and monitor condition",
    ContractsScene: "Contracts — accept mission cargo for bonus income",
    DiplomacyScene: "Foreign Relations — empires, rivals, and standing",
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
    this.topBarBg = this.add
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
    this.ceoPortraitImg = portraitImg;
    // Round mask (Phaser 4 Mask filter)
    const hudMask = this.add
      .circle(hudPortraitX, hudPortraitY, portraitSize / 2, 0xffffff)
      .setVisible(false);
    portraitImg.filters?.internal.addMask(hudMask);
    this.ceoPortraitMask = hudMask;
    // Subtle border ring
    this.ceoPortraitBorder = this.add
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
    // 6-icon nav: 4 standalone (Map/Routes/Fleet/Finance) + 2 grouped
    // (Empire / Ops). Grouped icons open via `resolveDefaultTab` (urgency
    // → last-visited → first tab). Each nav button is keyed by the
    // group's *primary* scene (`group.scenes[0]`), so existing per-scene
    // map infrastructure (icons, badges, indicators) keeps working.
    const navItems = NAV_GROUPS.map((group) => ({
      label: group.label,
      scene: group.scenes[0],
      icon: group.icon,
      group,
    }));

    const navSidebarTop = L.hudTopBarHeight;
    const navSidebarH = L.hudBottomBarTop - L.hudTopBarHeight;

    // Sidebar background strip
    this.navSidebarBg = this.add
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
    this.navSidebarAccent = this.add
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

      // A grouped nav icon is "active" when ANY scene in its group is the
      // active content scene (e.g. Empire icon stays lit while user has
      // Diplomacy or Rivals open).
      const isItemActive = (): boolean =>
        item.group.scenes.includes(this.activeContentScene);

      const isActive = isItemActive();
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
        if (!isItemActive()) {
          getAudioDirector().sfx("ui_hover");
          bg.setAlpha(0.22);
          icon.setTint(theme.colors.text);
        }
      });
      hitRect.on("pointerout", () => {
        if (!isItemActive()) {
          bg.setAlpha(0.0);
          icon.setTint(theme.colors.textDim);
        }
      });
      hitRect.on("pointerdown", () => {
        if (!isItemActive()) {
          bg.setAlpha(0.32);
        }
      });
      hitRect.on("pointerup", () => {
        getAudioDirector().sfx("ui_click_primary");
        const target = resolveDefaultTab(
          item.group,
          gameStore.getState(),
          this.lastVisitedByGroup,
        );
        this.switchContentScene(target);
      });
      hitRect.on("pointerupoutside", () => {
        if (!isItemActive()) {
          bg.setAlpha(0.0);
        }
      });

      this.navIndicators.set(item.scene, indicator);
      this.navBackgrounds.set(item.scene, bg);
      this.navIcons.set(item.scene, icon);
      this.navHitAreas.set(item.scene, hitRect);
      this.navContainers.set(item.scene, btnContainer);
      this.navOrder.push(item.scene);

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

    const audioBtn = this.createSettingsIconButton({
      x: navCenterX,
      y: audioBtnY,
      iconKey: "icon-audio",
      tooltip: "Audio Settings",
      onClick: () => this.toggleSettingsPanel("audio"),
    });
    this.settingsButtons.push({ container: audioBtn, role: "audio" });
    const saveBtn = this.createSettingsIconButton({
      x: navCenterX,
      y: saveBtnY,
      iconKey: "icon-save",
      tooltip: "Save / Load",
      onClick: () => this.toggleSettingsPanel("save"),
    });
    this.settingsButtons.push({ container: saveBtn, role: "save" });

    // ── Bottom Bar ───────────────────────────────────────────
    const bottomBarY = L.hudBottomBarTop;
    const bottomBarMidY = bottomBarY + L.hudBottomBarHeight / 2;

    this.bottomBarBg = this.add
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
    this.tickerBg = this.add
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
    this.tickerBorder = this.add
      .rectangle(0, tickerY, L.gameWidth, 1, theme.colors.panelBorder)
      .setOrigin(0, 0)
      .setDepth(291);
    // newsTicker is created/recreated by relayout() so the geometry is
    // owned by a single code path.

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

    this.events.once("shutdown", () => {
      gameStore.off("stateChanged", this.stateListener);
      this.settingsPanel?.destroy();
      this.settingsPanel = null;
      this.newsTicker?.destroy();
      this.newsTicker = null;
    });

    // Tab strip: empty container, populated by `rebuildTabStrip()` whenever
    // the active scene belongs to a NavGroup with multiple tabs.
    this.tabStrip = this.add.container(0, 0).setDepth(50);

    // Initial layout pass + reflow on viewport resize. Content scenes own
    // their own reflow handlers, so the HUD only repositions its own widgets.
    this.relayout();
    attachReflowHandler(this, () => this.relayout());

    // Launch content scene (restored on resize, default GalaxyMapScene)
    this.scene.launch(this.activeContentScene, this.activeContentData);
    setGalaxy3DVisible(this.activeContentScene === "GalaxyMapScene");
    this.rebuildTabStrip();
    this.scene.bringToTop();

    // If a dilemma was already pending (e.g. resumed save), surface it now.
    this.maybeShowDilemma();
  }

  /**
   * Reposition + resize every layout-dependent widget when the viewport
   * changes. Children themselves are built once in `create()`; this only
   * touches geometry, not content/state.
   */
  private relayout(): void {
    const L = getLayout();

    // ── Top bar ─────────────────────────────────────────────
    this.topBarBg.setPosition(0, 0);
    this.topBarBg.setSize(L.gameWidth, L.hudTopBarHeight);

    // CEO portrait cluster (image + mask + border ring) — left side of top bar.
    const portraitSize = L.hudTopBarHeight - 12;
    const hudPortraitX = 6 + portraitSize / 2;
    const hudPortraitY = L.hudTopBarHeight / 2;
    this.ceoPortraitImg.setPosition(hudPortraitX, hudPortraitY);
    fitImageCover(this.ceoPortraitImg, portraitSize, portraitSize);
    this.ceoPortraitMask.setPosition(hudPortraitX, hudPortraitY);
    this.ceoPortraitMask.setRadius(portraitSize / 2);
    this.ceoPortraitBorder.setPosition(hudPortraitX, hudPortraitY);
    this.ceoPortraitBorder.setRadius(portraitSize / 2 + 1);

    // Top-bar labels.
    const topMidY = L.hudTopBarHeight / 2;
    const nameOffsetX = 6 + portraitSize + 10;
    this.companyLabel.setPosition(nameOffsetX, topMidY);
    this.turnLabel.setPosition(L.gameWidth / 2, topMidY);
    this.apBadgeLabel.setPosition(L.gameWidth / 2 + 80, topMidY);
    this.cashLabel.setPosition(L.gameWidth - 20, topMidY);
    this.streakLabel.setPosition(L.gameWidth - 20, topMidY + 1);

    // ── Nav sidebar background + accent line ──────────────
    const navSidebarTop = L.hudTopBarHeight;
    const navSidebarH = L.hudBottomBarTop - L.hudTopBarHeight;
    this.navSidebarBg.setPosition(0, navSidebarTop);
    this.navSidebarBg.setSize(L.navSidebarWidth, navSidebarH);
    this.navSidebarAccent.setPosition(L.navSidebarWidth - 1, navSidebarTop);
    this.navSidebarAccent.setSize(1, navSidebarH);

    // Nav button cluster — recompute Y for each scene in build order.
    const iconBtnSize = this.navIconButtonSize;
    const iconSpacing = this.navIconSpacing;
    const navStartY = navSidebarTop + 12;
    const navCenterX = L.navSidebarWidth / 2;
    for (let i = 0; i < this.navOrder.length; i++) {
      const sceneKey = this.navOrder[i];
      const btnY =
        navStartY + i * (iconBtnSize + iconSpacing) + iconBtnSize / 2;
      const container = this.navContainers.get(sceneKey);
      const hit = this.navHitAreas.get(sceneKey);
      // Nav button container holds a fixed-size icon — reposition only.
      if (container) container.setPosition(navCenterX, btnY);
      if (hit) hit.setPosition(navCenterX, btnY);
    }

    // Settings buttons (audio above, save below) — anchored to sidebar bottom.
    const bottomCluster = navSidebarTop + navSidebarH - 12;
    const audioBtnY = bottomCluster - iconBtnSize / 2 - (iconBtnSize + 6);
    const saveBtnY = bottomCluster - iconBtnSize / 2;
    for (const btn of this.settingsButtons) {
      // Settings icon button is a fixed-size container — reposition only.
      btn.container.setPosition(
        navCenterX,
        btn.role === "audio" ? audioBtnY : saveBtnY,
      );
    }

    // ── Bottom bar ──────────────────────────────────────────
    const bottomBarY = L.hudBottomBarTop;
    const bottomBarMidY = bottomBarY + L.hudBottomBarHeight / 2;
    this.bottomBarBg.setPosition(0, bottomBarY);
    this.bottomBarBg.setSize(L.gameWidth, L.hudBottomBarHeight);

    this.phaseLabel.setPosition(20, bottomBarMidY);
    this.actionPromptLabel.setPosition(200, bottomBarMidY);
    this.routeSlotLabel.setPosition(L.gameWidth - 200, bottomBarMidY - 8);
    this.researchLabel.setPosition(L.gameWidth - 200, bottomBarMidY + 8);

    // End Turn cluster (button + small turn-info label) — right edge.
    const endTurnSize = 52;
    const endTurnX = L.gameWidth - endTurnSize - 12;
    this.bottomTurnInfoLabel.setPosition(
      endTurnX - 12,
      bottomBarY + endTurnSize / 2,
    );
    this.endTurnButton.setPosition(endTurnX, bottomBarY);

    // ── News ticker strip ──────────────────────────────────
    const tickerY = L.gameHeight - L.hudTickerHeight;
    this.tickerBg.setPosition(0, tickerY);
    this.tickerBg.setSize(L.gameWidth, L.hudTickerHeight);
    this.tickerBorder.setPosition(0, tickerY);
    this.tickerBorder.setSize(L.gameWidth, 1);

    // News ticker reflows in place — mask + scroll travel rebuild against
    // the new bounds without destroying the underlying graphics objects.
    if (this.newsTicker) {
      this.newsTicker.setPosition(L.navSidebarWidth, tickerY);
      this.newsTicker.setSize(
        L.gameWidth - L.navSidebarWidth,
        L.hudTickerHeight,
      );
    } else {
      this.newsTicker = new HorizontalNewsTicker(
        this,
        L.navSidebarWidth,
        tickerY,
        L.gameWidth - L.navSidebarWidth,
        L.hudTickerHeight,
      );
      this.newsTicker.updateItems(this.buildTickerItems(gameStore.getState()));
    }

    // ── Adviser drawer (upper-right, anchored to right edge) ──
    // setSize first so panelWidth tracks any width change; setAnchor then
    // recomputes openX/closedX and snaps the container to whichever
    // position matches the current drawer state (open vs. tab-only).
    const advPanelW = 220;
    const advTabW = 36;
    const advPanelX = L.gameWidth - advTabW - advPanelW - 8;
    const advPanelY = L.hudTopBarHeight + 8;
    // Height is content-driven inside AdviserPanel; pass 0 to keep the
    // current internal panelHeight (the override skips heights below the
    // content-driven minimum).
    this.adviserPanel.setSize(advPanelW, 0);
    this.adviserPanel.setAnchor(advPanelX, advPanelY);

    // Tab strip repositions on resize (strip is already visible/hidden by
    // rebuildTabStrip; here we only need to reflow positions).
    if (this.tabStrip) {
      this.rebuildTabStrip();
    }
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
    setGalaxy3DVisible(sceneName === "GalaxyMapScene");

    this.activeContentScene = sceneName;
    this.activeContentData = data;

    // Remember last-visited tab within its group, so re-clicking the group
    // icon (when no urgency fires) returns the player here.
    const group = findGroupForScene(sceneName);
    if (group) {
      this.lastVisitedByGroup.set(group.id, sceneName);
    }

    this.updateNavVisualState(sceneName, theme);
    this.rebuildTabStrip();
    this.scene.bringToTop();
  }

  /**
   * Build (or rebuild + reposition) the horizontal tab strip shown above
   * the content area when the active scene belongs to a NavGroup with
   * more than one tab. Hidden for solo groups (Map, Routes, Fleet, Finance).
   */
  private rebuildTabStrip(): void {
    const theme = getTheme();
    const L = getLayout();

    this.tabStrip.removeAll(true);

    const group = findGroupForScene(this.activeContentScene);
    if (!group || group.scenes.length < 2) {
      this.tabStrip.setVisible(false);
      return;
    }
    this.tabStrip.setVisible(true);

    const stripHeight = GROUP_TAB_STRIP_HEIGHT;
    const stripTop = L.hudTopBarHeight;
    const stripLeft = L.sidebarLeft;
    const stripWidth = L.maxContentWidth;

    // Translucent background — keeps scene content visible behind tabs but
    // creates a clear "this is chrome" affordance.
    const bg = this.add
      .rectangle(
        stripLeft,
        stripTop,
        stripWidth,
        stripHeight,
        theme.colors.panelBg,
        0.78,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    this.tabStrip.add(bg);

    // Render tabs left-to-right.
    const tabHeight = stripHeight - 4;
    const tabSpacing = 4;
    const tabWidth = 110;
    const tabsTotalWidth =
      group.scenes.length * tabWidth + (group.scenes.length - 1) * tabSpacing;
    let tabX = stripLeft + 10;
    void tabsTotalWidth; // reserved for right-aligned variant

    const state = gameStore.getState();

    for (const sceneKey of group.scenes) {
      const isActive = sceneKey === this.activeContentScene;
      const tabY = stripTop + 2;

      const tabBg = this.add
        .rectangle(
          tabX,
          tabY,
          tabWidth,
          tabHeight,
          isActive ? theme.colors.buttonBg : theme.colors.headerBg,
          isActive ? 1.0 : 0.6,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(
          1,
          isActive ? theme.colors.accent : theme.colors.panelBorder,
          isActive ? 1 : 0.4,
        )
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(
          tabX + tabWidth / 2,
          tabY + tabHeight / 2,
          this.tabLabel(sceneKey),
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(
              isActive ? theme.colors.accent : theme.colors.textDim,
            ),
          },
        )
        .setOrigin(0.5, 0.5);

      // Urgency dot on this tab if its scene wants attention.
      let urgencyDot: Phaser.GameObjects.Arc | null = null;
      if (hasSceneUrgency(sceneKey, state)) {
        urgencyDot = this.add
          .circle(tabX + tabWidth - 8, tabY + 6, 4, theme.colors.warning)
          .setDepth(1);
      }

      tabBg.on("pointerover", () => {
        if (!isActive) {
          tabBg.setFillStyle(theme.colors.buttonHover);
          label.setColor(colorToString(theme.colors.text));
        }
      });
      tabBg.on("pointerout", () => {
        if (!isActive) {
          tabBg.setFillStyle(theme.colors.headerBg, 0.6);
          label.setColor(colorToString(theme.colors.textDim));
        }
      });
      tabBg.on("pointerup", () => {
        if (sceneKey !== this.activeContentScene) {
          getAudioDirector().sfx("ui_click_primary");
          this.switchContentScene(sceneKey);
        }
      });

      this.tabStrip.add(tabBg);
      this.tabStrip.add(label);
      if (urgencyDot) this.tabStrip.add(urgencyDot);

      tabX += tabWidth + tabSpacing;
    }
  }

  private tabLabel(sceneKey: string): string {
    switch (sceneKey) {
      case "EmpireScene":
        return "Empires";
      case "DiplomacyScene":
        return "Diplomacy";
      case "CompetitionScene":
        return "Rivals";
      case "ContractsScene":
        return "Contracts";
      case "TechTreeScene":
        return "Research";
      case "StationBuilderScene":
        return "Hub";
      default:
        return sceneKey;
    }
  }

  private updateNavVisualState(sceneName: string, theme = getTheme()): void {
    // Each nav icon is keyed by its group's primary scene. The icon is
    // active when the active content scene belongs to that same group.
    const activeGroup = findGroupForScene(sceneName);
    for (const [scene, indicator] of this.navIndicators) {
      const itemGroup = findGroupForScene(scene);
      const isActive = !!(
        itemGroup &&
        activeGroup &&
        itemGroup.id === activeGroup.id
      );
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
  }): Phaser.GameObjects.Container {
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

    return container;
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
      newlyUnlocked.flatMap((tab) => {
        const scene = NAV_TAB_TO_SCENE[tab];
        return scene ? [scene] : [];
      }),
    );

    // A grouped nav icon is visible iff ANY scene in its group has its
    // NavTabId unlocked (DiplomacyScene has no NavTabId — treat as always
    // unlocked, mirroring the legacy behavior).
    const isSceneUnlocked = (sceneKey: string): boolean => {
      const tabId = SCENE_TO_NAV_TAB[sceneKey];
      if (tabId === undefined) return true; // e.g. DiplomacyScene
      return unlocked.has(tabId);
    };

    const activeGroup = findGroupForScene(this.activeContentScene);

    for (const group of NAV_GROUPS) {
      const primaryScene = group.scenes[0];
      const icon = this.navIcons.get(primaryScene);
      const hitArea = this.navHitAreas.get(primaryScene);
      const bg = this.navBackgrounds.get(primaryScene);
      const indicator = this.navIndicators.get(primaryScene);
      const badge = this.navBadges.get(primaryScene);

      if (!icon || !hitArea) continue;

      const groupUnlocked = group.scenes.some(isSceneUnlocked);
      const isActive = activeGroup?.id === group.id;

      if (groupUnlocked) {
        icon.setAlpha(1);
        if (bg) bg.setAlpha(isActive ? 0.32 : 0.0);
        if (indicator) indicator.setVisible(isActive);
        if (badge) badge.setAlpha(1);

        if (!hitArea.input) {
          hitArea.setInteractive({ useHandCursor: true });
        }

        // Unlock animation if any scene in this group was newly unlocked.
        if (group.scenes.some((s) => newlyUnlockedScenes.has(s))) {
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

    // Hide all badges during sim/review.
    if (state.phase !== "planning") {
      for (const [, badge] of this.navBadges) {
        badge.setVisible(false);
      }
      return;
    }

    // Per-group urgency: a group's badge fires if ANY of its scenes has
    // urgency. Color reflects the most severe scene (loss > warning > accent).
    for (const group of NAV_GROUPS) {
      const primaryScene = group.scenes[0];
      const badge = this.navBadges.get(primaryScene);
      if (!badge) continue;

      let badgeColor: number | null = null;
      for (const sceneKey of group.scenes) {
        if (!hasSceneUrgency(sceneKey, state)) continue;
        const sceneColor = this.urgencyColorForScene(sceneKey, theme);
        if (
          badgeColor === null ||
          this.urgencySeverity(sceneColor, theme) <
            this.urgencySeverity(badgeColor, theme)
        ) {
          badgeColor = sceneColor;
        }
      }

      if (badgeColor !== null) {
        badge.setFillStyle(badgeColor);
        badge.setVisible(true);
      } else {
        badge.setVisible(false);
      }
    }
  }

  /** Color of the urgency dot for a given scene (loss/warning/accent). */
  private urgencyColorForScene(sceneKey: string, theme = getTheme()): number {
    switch (sceneKey) {
      case "RoutesScene":
      case "FinanceScene":
        return theme.colors.loss;
      case "ContractsScene":
        return theme.colors.accent;
      default:
        return theme.colors.warning;
    }
  }

  /** Lower number = higher severity. Used to pick the worst color across a group. */
  private urgencySeverity(color: number, theme = getTheme()): number {
    if (color === theme.colors.loss) return 0;
    if (color === theme.colors.warning) return 1;
    return 2;
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
    this.endTurnModal.setDepth(DEPTH_MODAL);
    this.endTurnModal.show();
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
