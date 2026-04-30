import * as Phaser from "phaser";
import { Button, Label, Modal, Panel, getTheme, getLayout } from "./index.ts";
import { formatTurnShort } from "../utils/turnFormat.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

type AudioDirector = ReturnType<typeof getAudioDirector>;
import { gameStore } from "../data/GameStore.ts";
import {
  saveGame,
  loadGameIntoStore,
  hasSaveGame,
  hasAutoSave,
  deleteSave,
  deleteAutoSave,
  loadAutoSaveIntoStore,
  getSaveMeta,
  getAutoSaveMeta,
  type SaveMeta,
} from "../game/SaveManager.ts";

export type SettingsTabId = "audio" | "save";

export interface SettingsPanelOptions {
  /** Which tab to focus when the panel opens. Default: "audio". */
  initialTab?: SettingsTabId;
  /** Optional callback fired after the panel closes. */
  onClose?: () => void;
}

interface TabRecord {
  id: SettingsTabId;
  label: string;
  /** Tab strip background rect — recolored on selection. */
  bg: Phaser.GameObjects.Rectangle;
  /** Tab strip indicator (active underline). */
  indicator: Phaser.GameObjects.Rectangle;
  /** Tab strip label text. */
  text: Phaser.GameObjects.Text;
  /** Game objects belonging to this tab's content area. */
  content: Phaser.GameObjects.GameObject[];
  /** Optional refresh hook called when the tab becomes active. */
  refresh?: () => void;
}

const PANEL_W = 460;
const PANEL_H = 520;
const TAB_HEIGHT = 36;

/**
 * Modal settings panel with Audio + Save/Load tabs.
 * One panel per scene at a time — opening again while open is a no-op.
 */
export class SettingsPanel {
  private readonly scene: Phaser.Scene;
  private readonly audio: AudioDirector;
  private isOpen = false;
  private activeTabId: SettingsTabId = "audio";
  private tracked: Phaser.GameObjects.GameObject[] = [];
  private tabs: TabRecord[] = [];
  private onCloseCallback: (() => void) | null = null;

  // Cached labels for live refresh.
  private musicVolumeValue: Label | null = null;
  private sfxVolumeValue: Label | null = null;
  private reducedUiValue: Label | null = null;
  private musicStyleValue: Label | null = null;
  private musicTrackValue: Label | null = null;
  private muteValue: Label | null = null;
  private saveStatusLabel: Label | null = null;
  private autoSaveStatusLabel: Label | null = null;
  private saveButton: Button | null = null;
  private loadButton: Button | null = null;
  private deleteSaveButton: Button | null = null;
  private loadAutoSaveButton: Button | null = null;
  private deleteAutoSaveButton: Button | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.audio = getAudioDirector();
  }

  /** True if the modal is currently visible. */
  isVisible(): boolean {
    return this.isOpen;
  }

  /** Currently active tab. */
  getActiveTabId(): SettingsTabId {
    return this.activeTabId;
  }

  /**
   * Open the panel. If already open, simply switch to `initialTab`.
   * Pass `initialTab` to land on a specific tab — e.g. clicking the
   * save icon should land on the Save tab.
   */
  open(options: SettingsPanelOptions = {}): void {
    const requestedTab = options.initialTab ?? "audio";
    this.onCloseCallback = options.onClose ?? null;

    if (this.isOpen) {
      this.setActiveTab(requestedTab);
      return;
    }

    this.activeTabId = requestedTab;
    this.build();
    this.audio.sfx("ui_modal_open");
  }

  /** Close the panel and free its game objects. */
  close(): void {
    if (!this.isOpen) return;
    for (const obj of this.tracked) {
      if (obj.active) obj.destroy();
    }
    this.tracked = [];
    this.tabs = [];
    this.musicVolumeValue = null;
    this.sfxVolumeValue = null;
    this.reducedUiValue = null;
    this.musicStyleValue = null;
    this.musicTrackValue = null;
    this.muteValue = null;
    this.saveStatusLabel = null;
    this.autoSaveStatusLabel = null;
    this.saveButton = null;
    this.loadButton = null;
    this.deleteSaveButton = null;
    this.loadAutoSaveButton = null;
    this.deleteAutoSaveButton = null;
    this.isOpen = false;
    const cb = this.onCloseCallback;
    this.onCloseCallback = null;
    cb?.();
  }

  /** Destroy on scene shutdown. */
  destroy(): void {
    this.close();
  }

  /**
   * Show a confirmation Modal for destructive actions (Load / Delete).
   * The Modal renders above the panel via depth, so we don't tear the
   * settings panel down — just stack on top until the user picks.
   */
  private confirmDestructive(opts: {
    title: string;
    body: string;
    okText: string;
    testId: string;
    onOk: () => void;
  }): void {
    const modal = new Modal(this.scene, {
      title: opts.title,
      body: opts.body,
      okText: opts.okText,
      cancelText: "Cancel",
      testId: opts.testId,
      onOk: () => {
        modal.destroy();
        opts.onOk();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    // Stack above SettingsPanel children. Modal defaults to depth 1000;
    // panel children are unlayered, so this is sufficient — but bump
    // explicitly so future depth changes don't surprise us.
    modal.setDepth(2000);
    modal.show();
    this.audio.sfx("ui_modal_open");
  }

  /**
   * After a successful Load, restart the owning scene so it rebuilds
   * against the freshly-loaded GameStore state. Uses the actual scene
   * key rather than a hardcoded "GameHUDScene" so the panel can be
   * reused from other scenes without silent breakage.
   */
  private reloadOwningScene(): void {
    const sceneKey = this.scene.scene.key;
    this.close();
    this.scene.scene.stop(sceneKey);
    this.scene.scene.start(sceneKey);
  }

  private setActiveTab(id: SettingsTabId): void {
    if (id === this.activeTabId) {
      // Even if same tab, re-fire refresh so consumers (e.g. Save tab opened
      // from icon click) see fresh metadata.
      const tab = this.tabs.find((t) => t.id === id);
      tab?.refresh?.();
      return;
    }
    this.activeTabId = id;
    const theme = getTheme();
    for (const tab of this.tabs) {
      const active = tab.id === id;
      tab.bg.setFillStyle(
        active ? theme.colors.panelBg : theme.colors.headerBg,
      );
      tab.bg.setAlpha(active ? 1 : 0.7);
      tab.indicator.setVisible(active);
      tab.text.setColor(
        active
          ? `#${theme.colors.accent.toString(16).padStart(6, "0")}`
          : `#${theme.colors.textDim.toString(16).padStart(6, "0")}`,
      );
      for (const obj of tab.content) {
        // Audio panel content is a mix of Phaser native GameObjects and our
        // Container-based Label/Button widgets. Both expose setVisible.
        (obj as { setVisible?: (v: boolean) => void }).setVisible?.(active);
      }
    }
    const newTab = this.tabs.find((t) => t.id === id);
    newTab?.refresh?.();
    this.audio.sfx("ui_tab_switch");
  }

  private build(): void {
    const L = getLayout();
    const theme = getTheme();

    const overlay = this.scene.add
      .rectangle(
        0,
        0,
        L.gameWidth,
        L.gameHeight,
        theme.colors.modalOverlay,
        0.45,
      )
      .setOrigin(0, 0)
      .setInteractive();
    overlay.on("pointerup", () => {
      this.audio.sfx("ui_modal_close");
      this.close();
    });
    this.tracked.push(overlay);

    const panelX = Math.floor((L.gameWidth - PANEL_W) / 2);
    const panelY = Math.floor((L.gameHeight - PANEL_H) / 2);
    const panel = new Panel(this.scene, {
      x: panelX,
      y: panelY,
      width: PANEL_W,
      height: PANEL_H,
      title: "Game Settings",
    });
    this.tracked.push(panel);

    // Tab strip sits inside the panel content area (below title).
    const content = panel.getContentArea();
    const tabStripY = panelY + content.y;
    const tabStripX = panelX + content.x;
    const tabStripW = PANEL_W - content.x * 2;

    const tabDefs: ReadonlyArray<{ id: SettingsTabId; label: string }> = [
      { id: "audio", label: "Audio" },
      { id: "save", label: "Save / Load" },
    ];
    const tabBtnW = Math.floor(tabStripW / tabDefs.length);

    for (let i = 0; i < tabDefs.length; i++) {
      const def = tabDefs[i];
      const tx = tabStripX + i * tabBtnW;
      const isActive = def.id === this.activeTabId;

      const tabBg = this.scene.add
        .rectangle(
          tx,
          tabStripY,
          tabBtnW,
          TAB_HEIGHT,
          isActive ? theme.colors.panelBg : theme.colors.headerBg,
        )
        .setOrigin(0, 0)
        .setAlpha(isActive ? 1 : 0.7)
        .setInteractive({ useHandCursor: true });

      const tabText = this.scene.add
        .text(tx + tabBtnW / 2, tabStripY + TAB_HEIGHT / 2, def.label, {
          fontSize: "14px",
          fontFamily: theme.fonts.body.family,
          color: `#${(isActive ? theme.colors.accent : theme.colors.textDim)
            .toString(16)
            .padStart(6, "0")}`,
        })
        .setOrigin(0.5);

      const indicator = this.scene.add
        .rectangle(
          tx,
          tabStripY + TAB_HEIGHT - 3,
          tabBtnW,
          3,
          theme.colors.accent,
        )
        .setOrigin(0, 0)
        .setVisible(isActive);

      tabBg.on("pointerover", () => {
        if (def.id !== this.activeTabId) {
          tabBg.setFillStyle(theme.colors.buttonHover);
        }
      });
      tabBg.on("pointerout", () => {
        const stillActive = def.id === this.activeTabId;
        tabBg.setFillStyle(
          stillActive ? theme.colors.panelBg : theme.colors.headerBg,
        );
        tabBg.setAlpha(stillActive ? 1 : 0.7);
      });
      tabBg.on("pointerup", () => {
        this.setActiveTab(def.id);
      });

      this.tracked.push(tabBg, tabText, indicator);

      const record: TabRecord = {
        id: def.id,
        label: def.label,
        bg: tabBg,
        indicator,
        text: tabText,
        content: [],
      };
      this.tabs.push(record);
    }

    // Content origin (just below the tab strip).
    const contentTopY = tabStripY + TAB_HEIGHT + 12;
    const contentLeftX = tabStripX;
    const contentRightX = panelX + PANEL_W - content.x;

    const audioTab = this.tabs.find((t) => t.id === "audio")!;
    const saveTab = this.tabs.find((t) => t.id === "save")!;

    this.buildAudioTabContent(
      audioTab,
      contentLeftX,
      contentTopY,
      contentRightX,
    );
    this.buildSaveTabContent(saveTab, contentLeftX, contentTopY, contentRightX);

    // Hide non-active tab content.
    for (const tab of this.tabs) {
      if (tab.id !== this.activeTabId) {
        for (const obj of tab.content) {
          (obj as { setVisible?: (v: boolean) => void }).setVisible?.(false);
        }
      }
    }

    // Close button (shared, sits at the bottom of the panel).
    const closeBtn = new Button(this.scene, {
      x: panelX + PANEL_W - content.x - 110,
      y: panelY + PANEL_H - 44,
      width: 110,
      height: 32,
      label: "Close",
      onClick: () => {
        this.audio.sfx("ui_modal_close");
        this.close();
      },
    });
    this.tracked.push(closeBtn);

    // Re-fire the active tab's refresh hook so dynamic state (last save time,
    // current track) is shown immediately on open.
    this.tabs.find((t) => t.id === this.activeTabId)?.refresh?.();

    this.isOpen = true;
  }

  // ── Audio tab ──────────────────────────────────────────────────────────

  private buildAudioTabContent(
    tab: TabRecord,
    leftX: number,
    topY: number,
    rightX: number,
  ): void {
    const settings = this.audio.getSettings();

    const rowHeight = 62;
    const row1Y = topY;
    const row2Y = row1Y + rowHeight;
    const row3Y = row2Y + rowHeight;
    const row4Y = row3Y + rowHeight;
    const row5Y = row4Y + rowHeight;
    const row6Y = row5Y + rowHeight;

    const trackedAdd = (...objs: Phaser.GameObjects.GameObject[]) => {
      for (const o of objs) {
        tab.content.push(o);
        this.tracked.push(o);
      }
    };

    // Row 1 — Music Volume
    const musicLabel = new Label(this.scene, {
      x: leftX,
      y: row1Y,
      text: "Music Volume",
      style: "body",
    });
    this.musicVolumeValue = new Label(this.scene, {
      x: rightX,
      y: row1Y,
      text: `${Math.round(settings.musicVolume * 100)}%`,
      style: "value",
    });
    this.musicVolumeValue.setOrigin(1, 0);
    const decMusic = new Button(this.scene, {
      x: leftX,
      y: row1Y + 26,
      width: 46,
      height: 32,
      label: "-",
      onClick: () => {
        this.audio.setMusicVolume(this.audio.getSettings().musicVolume - 0.1);
        this.refreshAudioValues();
      },
    });
    const incMusic = new Button(this.scene, {
      x: leftX + 54,
      y: row1Y + 26,
      width: 46,
      height: 32,
      label: "+",
      onClick: () => {
        this.audio.setMusicVolume(this.audio.getSettings().musicVolume + 0.1);
        this.refreshAudioValues();
      },
    });
    trackedAdd(musicLabel, this.musicVolumeValue, decMusic, incMusic);

    // Row 2 — SFX Volume
    const sfxLabel = new Label(this.scene, {
      x: leftX,
      y: row2Y,
      text: "SFX Volume",
      style: "body",
    });
    this.sfxVolumeValue = new Label(this.scene, {
      x: rightX,
      y: row2Y,
      text: `${Math.round(settings.sfxVolume * 100)}%`,
      style: "value",
    });
    this.sfxVolumeValue.setOrigin(1, 0);
    const decSfx = new Button(this.scene, {
      x: leftX,
      y: row2Y + 26,
      width: 46,
      height: 32,
      label: "-",
      onClick: () => {
        this.audio.setSfxVolume(this.audio.getSettings().sfxVolume - 0.1);
        this.refreshAudioValues();
        this.audio.sfx("ui_click_secondary");
      },
    });
    const incSfx = new Button(this.scene, {
      x: leftX + 54,
      y: row2Y + 26,
      width: 46,
      height: 32,
      label: "+",
      onClick: () => {
        this.audio.setSfxVolume(this.audio.getSettings().sfxVolume + 0.1);
        this.refreshAudioValues();
        this.audio.sfx("ui_click_secondary");
      },
    });
    trackedAdd(sfxLabel, this.sfxVolumeValue, decSfx, incSfx);

    // Row 3 — Reduced UI SFX
    const reducedLabel = new Label(this.scene, {
      x: leftX,
      y: row3Y,
      text: "Reduced UI SFX",
      style: "body",
    });
    this.reducedUiValue = new Label(this.scene, {
      x: rightX,
      y: row3Y,
      text: settings.reducedUiSfx ? "On" : "Off",
      style: "value",
    });
    this.reducedUiValue.setOrigin(1, 0);
    const toggleReduced = new Button(this.scene, {
      x: leftX,
      y: row3Y + 26,
      width: 100,
      height: 32,
      label: "Toggle",
      onClick: () => {
        this.audio.setReducedUiSfx(!this.audio.getSettings().reducedUiSfx);
        this.refreshAudioValues();
        this.audio.sfx("ui_confirm");
      },
    });
    trackedAdd(reducedLabel, this.reducedUiValue, toggleReduced);

    // Row 4 — Music Style
    const styleLabel = new Label(this.scene, {
      x: leftX,
      y: row4Y,
      text: "Music Style",
      style: "body",
    });
    this.musicStyleValue = new Label(this.scene, {
      x: rightX,
      y: row4Y,
      text: prettyStyle(settings.musicStyle),
      style: "value",
    });
    this.musicStyleValue.setOrigin(1, 0);
    const cycleStyle = new Button(this.scene, {
      x: leftX,
      y: row4Y + 26,
      width: 120,
      height: 32,
      label: "Cycle",
      onClick: () => {
        const cur = this.audio.getSettings().musicStyle;
        const next =
          cur === "ambient"
            ? "ftl"
            : cur === "ftl"
              ? "score"
              : cur === "score"
                ? "retro"
                : "ambient";
        this.audio.setMusicStyle(next);
        this.refreshAudioValues();
        this.audio.sfx("ui_tab_switch");
      },
    });
    trackedAdd(styleLabel, this.musicStyleValue, cycleStyle);

    // Row 5 — Now Playing
    const trackLabel = new Label(this.scene, {
      x: leftX,
      y: row5Y,
      text: "Now Playing",
      style: "body",
    });
    this.musicTrackValue = new Label(this.scene, {
      x: rightX,
      y: row5Y,
      text: this.audio.getCurrentTrackLabel(),
      style: "value",
    });
    this.musicTrackValue.setOrigin(1, 0);
    const prevTrack = new Button(this.scene, {
      x: leftX,
      y: row5Y + 26,
      width: 80,
      height: 32,
      label: "Back",
      onClick: () => {
        this.audio.previousTrack();
        this.refreshAudioValues();
        this.audio.sfx("ui_tab_switch");
      },
    });
    const nextTrack = new Button(this.scene, {
      x: leftX + 88,
      y: row5Y + 26,
      width: 80,
      height: 32,
      label: "Next",
      onClick: () => {
        this.audio.nextTrack();
        this.refreshAudioValues();
        this.audio.sfx("ui_tab_switch");
      },
    });
    trackedAdd(trackLabel, this.musicTrackValue, prevTrack, nextTrack);

    // Row 6 — Mute All
    const muteLabel = new Label(this.scene, {
      x: leftX,
      y: row6Y,
      text: "Mute All",
      style: "body",
    });
    this.muteValue = new Label(this.scene, {
      x: rightX,
      y: row6Y,
      text:
        settings.musicVolume === 0 && settings.sfxVolume === 0 ? "Muted" : "On",
      style: "value",
    });
    this.muteValue.setOrigin(1, 0);
    const muteBtn = new Button(this.scene, {
      x: leftX,
      y: row6Y + 26,
      width: 120,
      height: 32,
      label: "Toggle Mute",
      onClick: () => {
        const s = this.audio.getSettings();
        if (s.musicVolume > 0 || s.sfxVolume > 0) {
          this.audio.setMusicVolume(0);
          this.audio.setSfxVolume(0);
        } else {
          this.audio.setMusicVolume(0.7);
          this.audio.setSfxVolume(0.8);
        }
        this.refreshAudioValues();
      },
    });
    trackedAdd(muteLabel, this.muteValue, muteBtn);

    tab.refresh = () => this.refreshAudioValues();
  }

  private refreshAudioValues(): void {
    if (!this.isOpen) return;
    const settings = this.audio.getSettings();
    this.musicVolumeValue?.setText(
      `${Math.round(settings.musicVolume * 100)}%`,
    );
    this.sfxVolumeValue?.setText(`${Math.round(settings.sfxVolume * 100)}%`);
    this.reducedUiValue?.setText(settings.reducedUiSfx ? "On" : "Off");
    this.musicStyleValue?.setText(prettyStyle(settings.musicStyle));
    this.musicTrackValue?.setText(this.audio.getCurrentTrackLabel());
    this.muteValue?.setText(
      settings.musicVolume === 0 && settings.sfxVolume === 0 ? "Muted" : "On",
    );
  }

  // ── Save / Load tab ────────────────────────────────────────────────────

  private buildSaveTabContent(
    tab: TabRecord,
    leftX: number,
    topY: number,
    rightX: number,
  ): void {
    const trackedAdd = (...objs: Phaser.GameObjects.GameObject[]) => {
      for (const o of objs) {
        tab.content.push(o);
        this.tracked.push(o);
      }
    };

    // Manual save section header
    const manualHeader = new Label(this.scene, {
      x: leftX,
      y: topY,
      text: "Manual Save",
      style: "heading",
    });
    trackedAdd(manualHeader);

    this.saveStatusLabel = new Label(this.scene, {
      x: leftX,
      y: topY + 32,
      text: "",
      style: "caption",
      maxWidth: rightX - leftX,
    });
    trackedAdd(this.saveStatusLabel);

    // Buttons row for manual save (Save Now / Load / Delete)
    const manualRowY = topY + 70;
    const btnW = 120;
    const btnGap = 10;

    this.saveButton = new Button(this.scene, {
      x: leftX,
      y: manualRowY,
      width: btnW,
      height: 36,
      label: "Save Now",
      onClick: () => {
        const state = gameStore.getState();
        saveGame(state);
        this.audio.sfx("ui_confirm");
        this.refreshSaveValues();
      },
    });

    this.loadButton = new Button(this.scene, {
      x: leftX + (btnW + btnGap),
      y: manualRowY,
      width: btnW,
      height: 36,
      label: "Load",
      onClick: () => {
        if (!hasSaveGame()) return;
        this.confirmDestructive({
          title: "Load Save?",
          body: "Loading will replace your current progress with the last manual save. Any work since you last saved will be lost.",
          okText: "Load",
          testId: "modal-settings-load",
          onOk: () => {
            if (loadGameIntoStore()) {
              this.audio.sfx("ui_confirm");
              this.reloadOwningScene();
            }
          },
        });
      },
    });

    this.deleteSaveButton = new Button(this.scene, {
      x: leftX + (btnW + btnGap) * 2,
      y: manualRowY,
      width: btnW,
      height: 36,
      label: "Delete",
      onClick: () => {
        if (!hasSaveGame()) return;
        this.confirmDestructive({
          title: "Delete Manual Save?",
          body: "This permanently removes your manual save. The auto-save is unaffected. This cannot be undone.",
          okText: "Delete",
          testId: "modal-settings-delete-manual",
          onOk: () => {
            deleteSave();
            this.audio.sfx("ui_error");
            this.refreshSaveValues();
          },
        });
      },
    });
    trackedAdd(this.saveButton, this.loadButton, this.deleteSaveButton);

    // Auto-save section header
    const autoHeaderY = manualRowY + 64;
    const autoHeader = new Label(this.scene, {
      x: leftX,
      y: autoHeaderY,
      text: "Auto-Save",
      style: "heading",
    });
    trackedAdd(autoHeader);

    this.autoSaveStatusLabel = new Label(this.scene, {
      x: leftX,
      y: autoHeaderY + 32,
      text: "",
      style: "caption",
      maxWidth: rightX - leftX,
    });
    trackedAdd(this.autoSaveStatusLabel);

    const autoRowY = autoHeaderY + 70;
    this.loadAutoSaveButton = new Button(this.scene, {
      x: leftX,
      y: autoRowY,
      width: btnW,
      height: 36,
      label: "Load Auto",
      onClick: () => {
        if (!hasAutoSave()) return;
        this.confirmDestructive({
          title: "Load Auto-Save?",
          body: "Loading the auto-save will replace your current progress. Anything you've done since the start of the current turn will be lost.",
          okText: "Load Auto",
          testId: "modal-settings-load-auto",
          onOk: () => {
            if (loadAutoSaveIntoStore()) {
              this.audio.sfx("ui_confirm");
              this.reloadOwningScene();
            }
          },
        });
      },
    });
    this.deleteAutoSaveButton = new Button(this.scene, {
      x: leftX + (btnW + btnGap),
      y: autoRowY,
      width: btnW,
      height: 36,
      label: "Delete",
      onClick: () => {
        if (!hasAutoSave()) return;
        this.confirmDestructive({
          title: "Delete Auto-Save?",
          body: "This permanently removes the auto-save. Your manual save is unaffected. A new auto-save will be written at the end of the next turn.",
          okText: "Delete",
          testId: "modal-settings-delete-auto",
          onOk: () => {
            deleteAutoSave();
            this.audio.sfx("ui_error");
            this.refreshSaveValues();
          },
        });
      },
    });
    trackedAdd(this.loadAutoSaveButton, this.deleteAutoSaveButton);

    // Footer note
    const footerY = autoRowY + 60;
    const footer = new Label(this.scene, {
      x: leftX,
      y: footerY,
      text: "Auto-saves are written at the end of each turn. Manual saves are kept separately.",
      style: "caption",
      maxWidth: rightX - leftX,
    });
    trackedAdd(footer);

    tab.refresh = () => this.refreshSaveValues();
  }

  private refreshSaveValues(): void {
    if (!this.isOpen) return;
    const manual = getSaveMeta();
    const auto = getAutoSaveMeta();
    const phase = gameStore.getState().phase;

    this.saveStatusLabel?.setText(formatSaveStatus("Manual save", manual));
    this.autoSaveStatusLabel?.setText(formatSaveStatus("Auto-save", auto));

    // Save Now is only safe during planning (mid-simulation state may be
    // partially mutated). Disable otherwise.
    this.saveButton?.setDisabled(phase !== "planning");
    this.loadButton?.setDisabled(manual === null);
    this.deleteSaveButton?.setDisabled(manual === null);
    this.loadAutoSaveButton?.setDisabled(auto === null);
    this.deleteAutoSaveButton?.setDisabled(auto === null);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function prettyStyle(style: "ambient" | "ftl" | "score" | "retro"): string {
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
}

function formatSaveStatus(prefix: string, meta: SaveMeta | null): string {
  if (meta === null) return `${prefix}: none`;
  const ago = formatRelativeTime(meta.timestamp);
  return `${prefix}: ${formatTurnShort(meta.turn)} (${ago})`;
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 0) return "just now";
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
