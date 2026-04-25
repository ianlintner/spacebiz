import * as Phaser from "phaser";
import {
  getTheme,
  Button,
  Label,
  Panel,
  DataTable,
  ScrollableList,
  ProgressBar,
  createStarfield,
  getLayout,
} from "../ui/index.ts";
import type { ColumnDef } from "../ui/index.ts";
import { SimulationRunner } from "../game/simulation/SimulationRunner.ts";
import type {
  SimulationConfig,
  SimulationResult,
  TurnLog,
} from "../game/simulation/SimulationRunner.ts";
import type { SimulationProgress } from "../game/simulation/SimulationRunner.ts";
import type { SimLogLevel } from "../game/simulation/SimulationLogger.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import type { GameState } from "../data/types.ts";
import {
  generateSaveId,
  createSandboxSaveData,
  updateSandboxSaveData,
  saveSandbox,
  setActiveSandbox,
  AUTOSAVE_INTERVAL,
} from "../game/simulation/SandboxSaveManager.ts";
import type { SandboxSaveData } from "../game/simulation/SandboxSaveManager.ts";
import { logs } from "../testing/log.ts";

// ── Speed mapping (turn delay in ms) ──────────────────────────

const SPEED_DELAYS: Record<string, number> = {
  normal: 800,
  fast: 200,
  instant: 0,
};

// ── Helpers ────────────────────────────────────────────────────

function formatCash(amount: number): string {
  return "\u00A7" + Math.round(amount).toLocaleString("en-US");
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}

// ── Scene ──────────────────────────────────────────────────────

export interface SandboxSceneData {
  seed: number;
  gameSize: "quick" | "standard" | "epic";
  galaxyShape: "spiral" | "elliptical" | "ring" | "irregular";
  companyCount: number;
  speed: string;
  logLevel: SimLogLevel;
  // Resume fields (present when loading a saved sandbox)
  resumeFrom?: SandboxSaveData;
}

export class AISandboxScene extends Phaser.Scene {
  // Simulation
  private runner!: SimulationRunner;
  private result: SimulationResult | null = null;
  private paused = false;
  private currentTurn = 0;
  private maxTurns = 0;
  private speed = "normal";
  private running = false;

  // Save state
  private saveId = "";
  private config!: SimulationConfig;
  private latestGameState: GameState | null = null;
  private latestRngState = 0;
  private accumulatedTurnLogs: TurnLog[] = [];
  private previousTurnLogs: TurnLog[] = [];
  private lastAutoSaveTurn = 0;

  // UI
  private turnLabel!: Label;
  private statusLabel!: Label;
  private progressBar!: ProgressBar;
  private rankingsTable!: DataTable;
  private activityList!: ScrollableList;
  private fuelLabel!: Label;
  private cargoLabel!: Label;
  private warningLabel!: Label;

  // Buttons
  private pauseBtn!: Button;
  private stepBtn!: Button;
  private speedBtn!: Button;
  private summaryBtn!: Button;
  // State for step mode
  private stepResolve: (() => void) | null = null;

  constructor() {
    super({ key: "AISandboxScene" });
  }

  create(data: SandboxSceneData): void {
    const theme = getTheme();
    const L = getLayout();
    const audio = getAudioDirector();
    audio.setMusicState("menu");

    this.paused = false;
    this.running = false;
    this.result = null;
    this.currentTurn = 0;
    this.speed = data.speed ?? "normal";
    this.accumulatedTurnLogs = [];
    this.previousTurnLogs = [];
    this.lastAutoSaveTurn = 0;
    this.latestGameState = null;
    this.latestRngState = 0;

    // Set up save identity
    if (data.resumeFrom) {
      this.saveId = data.resumeFrom.meta.id;
      this.previousTurnLogs = data.resumeFrom.turnLogs;
      this.lastAutoSaveTurn = data.resumeFrom.meta.turn;
    } else {
      this.saveId = generateSaveId();
    }

    // Mark this session as active for browser refresh recovery
    setActiveSandbox(this.saveId);

    // ── Background ───────────────────────────────────────────
    createStarfield(this);

    const padding = 16;

    // ── Top bar: Title + turn + progress ─────────────────────
    new Panel(this, {
      x: 0,
      y: 0,
      width: L.gameWidth,
      height: 64,
    });

    new Label(this, {
      x: padding,
      y: 8,
      text: "AI SANDBOX",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    }).setFontSize(22);

    this.turnLabel = new Label(this, {
      x: padding,
      y: 36,
      text: "Turn 0 / --",
      style: "caption",
      color: theme.colors.text,
    });

    this.statusLabel = new Label(this, {
      x: 200,
      y: 36,
      text: "Initializing\u2026",
      style: "caption",
      color: theme.colors.textDim,
    });

    this.progressBar = new ProgressBar(this, {
      x: L.gameWidth - 310 - padding,
      y: 22,
      width: 300,
      height: 20,
      value: 0,
      maxValue: 1, // updated to real turn count after first turnComplete
      showLabel: true,
      labelFormat: (v, m) => `Turn ${v} / ${m}`,
    });

    // ── Layout zones ─────────────────────────────────────────
    const topBarH = 64;
    const bottomBarH = 64;
    const contentH = L.gameHeight - topBarH - bottomBarH;
    const leftW = Math.min(400, Math.floor(L.gameWidth * 0.45));
    const rightW = L.gameWidth - leftW;

    // ── Left column: Rankings ────────────────────────────────
    new Panel(this, {
      x: 0,
      y: topBarH,
      width: leftW,
      height: contentH,
    });

    new Label(this, {
      x: padding,
      y: topBarH + 8,
      text: "Company Rankings",
      style: "caption",
      color: theme.colors.accent,
    });

    const rankColumns: ColumnDef[] = [
      { key: "rank", label: "#", width: 32, align: "center" },
      { key: "name", label: "Company", width: 120, align: "left" },
      {
        key: "cash",
        label: "Cash",
        width: 80,
        align: "right",
        format: (v) => formatCash(v as number),
        sortable: true,
      },
      {
        key: "fleet",
        label: "Fleet",
        width: 42,
        align: "center",
        sortable: true,
      },
      {
        key: "routes",
        label: "Rts",
        width: 38,
        align: "center",
        sortable: true,
      },
      {
        key: "status",
        label: "Status",
        width: 60,
        align: "center",
        colorFn: (v) => {
          if (v === "BANKRUPT") return theme.colors.loss;
          return null;
        },
      },
    ];

    this.rankingsTable = new DataTable(this, {
      x: padding,
      y: topBarH + 32,
      width: leftW - padding * 2,
      height: contentH - 130,
      columns: rankColumns,
      emptyStateText: "Waiting for simulation\u2026",
    });

    // ── Economy indicators below rankings ────────────────────
    const econY = topBarH + contentH - 90;

    new Label(this, {
      x: padding,
      y: econY,
      text: "Economy",
      style: "caption",
      color: theme.colors.accent,
    });

    this.fuelLabel = new Label(this, {
      x: padding,
      y: econY + 22,
      text: "Fuel: --",
      style: "value",
      color: theme.colors.text,
    });

    this.cargoLabel = new Label(this, {
      x: padding + 140,
      y: econY + 22,
      text: "Avg Cargo: --",
      style: "value",
      color: theme.colors.text,
    });

    this.warningLabel = new Label(this, {
      x: padding,
      y: econY + 48,
      text: "",
      style: "caption",
      color: theme.colors.warning,
    });

    // ── Right column: Activity feed ──────────────────────────
    new Panel(this, {
      x: leftW,
      y: topBarH,
      width: rightW,
      height: contentH,
    });

    new Label(this, {
      x: leftW + padding,
      y: topBarH + 8,
      text: "Activity Feed",
      style: "caption",
      color: theme.colors.accent,
    });

    this.activityList = new ScrollableList(this, {
      x: leftW + padding,
      y: topBarH + 32,
      width: rightW - padding * 2,
      height: contentH - 48,
      itemHeight: 28,
    });

    // ── Bottom control bar ───────────────────────────────────
    new Panel(this, {
      x: 0,
      y: L.gameHeight - bottomBarH,
      width: L.gameWidth,
      height: bottomBarH,
    });

    const btnW = 96;
    const btnH = 40;
    const btnY = L.gameHeight - bottomBarH + 12;
    let btnX = padding;

    this.pauseBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Pause",
      onClick: () => this.togglePause(),
    });
    btnX += btnW + 8;

    this.stepBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Step",
      disabled: true,
      onClick: () => this.stepOneTurn(),
    });
    btnX += btnW + 8;

    this.speedBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: `Speed: ${this.speed}`,
      onClick: () => this.cycleSpeed(),
    });
    btnX += btnW + 8;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Save",
      onClick: () => this.manualSave(),
    });
    btnX += btnW + 8;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Export",
      onClick: () => this.exportLog(),
    });
    btnX += btnW + 8;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Back",
      onClick: () => this.exitToMenu(),
    });
    btnX += btnW + 8;

    this.summaryBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Summary",
      disabled: true,
      onClick: () => this.viewSummary(),
    });

    // ── Start simulation ─────────────────────────────────────
    this.startSimulation(data);

    // ── Resize handler ───────────────────────────────────────
    const onResize = () => {
      this.scene.restart(data);
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
      this.cleanup();
    });
  }

  // ── Simulation lifecycle ─────────────────────────────────────

  private startSimulation(data: SandboxSceneData): void {
    this.runner = new SimulationRunner();
    this.running = true;

    const config: SimulationConfig = {
      seed: data.seed,
      gameSize: data.gameSize,
      galaxyShape: data.galaxyShape,
      companyCount: data.companyCount,
      maxTurns: 0, // derive from game size
      logLevel: data.logLevel,
    };
    this.config = config;

    this.runner.on("turnComplete", (evt: unknown) => {
      const progress = evt as SimulationProgress;
      this.currentTurn = progress.turn;
      this.maxTurns = progress.maxTurns;
      this.latestGameState = progress.state;
      this.latestRngState = progress.rngState;
      this.accumulatedTurnLogs.push(progress.turnLog);
      this.updateUI(progress.turnLog);
      this.tryAutoSave();
    });

    this.runner.on("simulationComplete", (evt: unknown) => {
      const r = evt as SimulationResult;
      this.result = r;
      this.running = false;
      this.statusLabel.setText(
        `Complete \u2014 ${r.summary.totalTurns} turns in ${(r.wallTimeMs / 1000).toFixed(1)}s`,
      );
      this.pauseBtn.setDisabled(true);
      this.stepBtn.setDisabled(true);
      this.summaryBtn.setDisabled(false);

      // Save completed state
      this.saveCurrentState("complete");

      // Add final summary to feed
      const th = getTheme();
      if (r.summary.winner) {
        this.addFeedItem(
          `Winner: ${r.summary.winner.name} (Score: ${r.summary.winner.score})`,
          th.colors.profit,
        );
      }
      for (const b of r.summary.bankruptcies) {
        this.addFeedItem(
          `${b.name} went bankrupt on turn ${b.turn}`,
          th.colors.loss,
        );
      }
    });

    const baseDelay = SPEED_DELAYS[this.speed] ?? 400;
    const isResume = !!data.resumeFrom;

    if (isResume) {
      const save = data.resumeFrom!;
      this.statusLabel.setText("Resuming\u2026");
      this.runner
        .resumeAsync(
          config,
          save.gameState,
          save.rngState,
          save.turnLogs,
          baseDelay,
        )
        .catch((err) => {
          logs.sim.error("AISandbox resumeAsync error", { err });
          this.running = false;
          this.statusLabel.setText("Error \u2014 see console");
        });
    } else {
      this.runner.runAsync(config, baseDelay).catch((err) => {
        logs.sim.error("AISandbox runAsync error", { err });
        this.running = false;
        this.statusLabel.setText("Error \u2014 see console");
      });
    }
  }

  // ── UI Update ────────────────────────────────────────────────

  private updateUI(turnLog: TurnLog): void {
    // Guard against post-shutdown turn events: Phaser 4 throws when setText
    // hits a Frame whose backing data was already destroyed. cleanup() flips
    // `running` to false on shutdown — bail before touching any GameObject.
    if (!this.running || !this.scene?.isActive()) return;
    // Turn counter + progress — single source of truth (drive bar from turns)
    this.turnLabel.setText(`Turn ${this.currentTurn} / ${this.maxTurns}`);
    if (this.maxTurns > 0) {
      this.progressBar.setMaxValue(this.maxTurns);
      this.progressBar.setValue(this.currentTurn);
    }
    this.statusLabel.setText(this.paused ? "Paused" : "Running\u2026");

    // Economy snapshot
    this.fuelLabel.setText(`Fuel: ${formatCash(turnLog.economy.fuelPrice)}`);
    this.cargoLabel.setText(
      `Avg Cargo: ${formatCash(turnLog.economy.avgCargoPrice)}`,
    );

    // Warnings
    if (turnLog.warnings.length > 0) {
      const latest = turnLog.warnings[turnLog.warnings.length - 1];
      this.warningLabel.setText(`\u26A0 ${latest.message}`);
    }

    // Rankings table
    const rows = turnLog.companies
      .slice()
      .sort((a, b) => b.cash - a.cash)
      .map((c, i) => ({
        rank: i + 1,
        name: truncate(c.name, 16),
        cash: c.cash,
        fleet: c.fleetSize,
        routes: c.routeCount,
        status: c.bankrupt ? "BANKRUPT" : "Active",
      }));
    this.rankingsTable.setRows(rows);

    // Activity feed — add notable events for this turn
    const th = getTheme();
    for (const evt of turnLog.events) {
      this.addFeedItem(`T${this.currentTurn}: ${evt.name}`, th.colors.accent);
    }

    // Build planet id -> name map once per turn for route log resolution
    const planetNames = new Map<string, string>();
    if (this.latestGameState) {
      for (const p of this.latestGameState.galaxy.planets) {
        planetNames.set(p.id, p.name);
      }
    }
    const resolvePlanet = (id: string): string => planetNames.get(id) ?? id;

    // Company actions (purchases, new routes)
    for (const c of turnLog.companies) {
      for (const ship of c.shipsPurchased) {
        this.addFeedItem(
          `T${this.currentTurn}: ${truncate(c.name, 12)} bought ${ship}`,
          th.colors.text,
        );
      }
      for (const route of c.routesOpened) {
        const originName = resolvePlanet(route.origin);
        const destName = resolvePlanet(route.dest);
        this.addFeedItem(
          `T${this.currentTurn}: ${truncate(c.name, 12)} opened ${originName}\u2192${destName}`,
          th.colors.text,
        );
      }
      if (c.bankrupt) {
        this.addFeedItem(
          `T${this.currentTurn}: ${c.name} BANKRUPT`,
          th.colors.loss,
        );
      }
    }
  }

  private addFeedItem(text: string, color: number): void {
    const container = this.add.container(0, 0);
    const label = new Label(this, {
      x: 4,
      y: 4,
      text,
      style: "caption",
      color,
    });
    label.setFontSize(12);
    container.add(label);
    this.activityList.prependItem(container);
  }

  // ── Playback controls ────────────────────────────────────────

  private togglePause(): void {
    if (!this.running) return;
    this.paused = !this.paused;
    this.pauseBtn.setLabel(this.paused ? "Resume" : "Pause");
    this.stepBtn.setDisabled(!this.paused);
    this.statusLabel.setText(this.paused ? "Paused" : "Running\u2026");

    // If unpausing and there is a pending step resolve, release it
    if (!this.paused && this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  }

  private stepOneTurn(): void {
    if (!this.paused || !this.running) return;
    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  }

  private cycleSpeed(): void {
    const speeds = ["normal", "fast", "instant"];
    const idx = speeds.indexOf(this.speed);
    this.speed = speeds[(idx + 1) % speeds.length];
    this.speedBtn.setLabel(`Speed: ${this.speed}`);
  }

  // ── Save / Auto-save ────────────────────────────────────────

  private buildSaveData(
    status: "running" | "paused" | "complete",
  ): SandboxSaveData | null {
    if (!this.latestGameState) return null;

    const allLogs = [...this.previousTurnLogs, ...this.accumulatedTurnLogs];
    const label = `Sandbox ${this.config.seed} T${this.currentTurn}`;

    // If we already have a save for this ID, update it; otherwise create fresh
    const data = createSandboxSaveData(
      this.saveId,
      label,
      this.config,
      this.latestGameState,
      this.latestRngState,
      this.speed,
    );
    return updateSandboxSaveData(
      data,
      this.latestGameState,
      this.latestRngState,
      allLogs,
      this.speed,
      status,
      this.result,
    );
  }

  private saveCurrentState(status: "running" | "paused" | "complete"): void {
    try {
      const data = this.buildSaveData(status);
      if (!data) return;
      saveSandbox(data);
    } catch (err) {
      // localStorage might be full or data non-serializable — non-critical
      logs.sim.warn("AISandbox save failed", { err });
    }
  }

  private tryAutoSave(): void {
    try {
      if (
        this.currentTurn > 0 &&
        this.currentTurn - this.lastAutoSaveTurn >= AUTOSAVE_INTERVAL
      ) {
        this.saveCurrentState(this.paused ? "paused" : "running");
        this.lastAutoSaveTurn = this.currentTurn;
      }
    } catch (err) {
      logs.sim.warn("AISandbox auto-save error", { err });
    }
  }

  private manualSave(): void {
    const status = this.running
      ? this.paused
        ? "paused"
        : "running"
      : "complete";
    this.saveCurrentState(status);
    this.statusLabel.setText(`Saved (turn ${this.currentTurn})`);
  }

  // ── Export ───────────────────────────────────────────────────

  private exportLog(): void {
    if (!this.result) {
      this.statusLabel.setText("No simulation data to export yet.");
      return;
    }

    const json = JSON.stringify(this.result, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sandbox-${this.result.config.seed}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.statusLabel.setText("Log exported!");
  }

  // ── Navigation ───────────────────────────────────────────────

  private exitToMenu(): void {
    // Save before exiting if simulation was in progress
    if (this.running && this.latestGameState) {
      this.saveCurrentState(this.paused ? "paused" : "running");
    }
    this.cleanup();
    this.scene.start("MainMenuScene");
  }

  private viewSummary(): void {
    if (!this.result) return;
    this.cleanup();
    this.scene.start("SimSummaryScene", { result: this.result });
  }

  private cleanup(): void {
    if (this.runner) {
      this.runner.abort();
    }
    this.running = false;
    this.paused = false;
    this.stepResolve = null;
    // Don't clear active sandbox here — only clear on explicit "Back" to SandboxSetupScene
    // This allows browser refresh to detect and resume
  }
}
