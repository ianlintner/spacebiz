import Phaser from "phaser";
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

// ── Speed mapping (turn delay in ms) ──────────────────────────

const SPEED_DELAYS: Record<string, number> = {
  normal: 800,
  fast: 200,
  instant: 0,
};

// ── Helpers ────────────────────────────────────────────────────

function formatCash(amount: number): string {
  return "\u00A7" + Math.round(amount).toLocaleString();
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}

// ── Scene ──────────────────────────────────────────────────────

interface SandboxSceneData {
  seed: number;
  gameSize: "small" | "medium" | "large";
  galaxyShape: "spiral" | "elliptical" | "ring" | "irregular";
  companyCount: number;
  speed: string;
  logLevel: SimLogLevel;
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
      maxValue: 100,
      showLabel: true,
      labelFormat: (v, m) => `${v} / ${m} turns`,
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

    const btnW = 110;
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
    btnX += btnW + 10;

    this.stepBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Step",
      disabled: true,
      onClick: () => this.stepOneTurn(),
    });
    btnX += btnW + 10;

    this.speedBtn = new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: `Speed: ${this.speed}`,
      onClick: () => this.cycleSpeed(),
    });
    btnX += btnW + 10;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Export Log",
      onClick: () => this.exportLog(),
    });
    btnX += btnW + 10;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Back",
      onClick: () => this.exitToMenu(),
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

    this.runner.on("turnComplete", (data: unknown) => {
      const progress = data as SimulationProgress;
      this.currentTurn = progress.turn;
      this.maxTurns = progress.maxTurns;
      this.updateUI(progress.turnLog);
    });

    this.runner.on("simulationComplete", (data: unknown) => {
      const r = data as SimulationResult;
      this.result = r;
      this.running = false;
      this.statusLabel.setText(
        `Complete \u2014 ${r.summary.totalTurns} turns in ${(r.wallTimeMs / 1000).toFixed(1)}s`,
      );
      this.pauseBtn.setDisabled(true);
      this.stepBtn.setDisabled(true);

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

    // Use custom step-aware delay for pausing
    const baseDelay = SPEED_DELAYS[this.speed] ?? 400;

    // Run async — the delay lambda handles pausing
    this.runner.runAsync(config, baseDelay).catch(() => {
      // Aborted or error — silently handle
      this.running = false;
    });
  }

  // ── UI Update ────────────────────────────────────────────────

  private updateUI(turnLog: TurnLog): void {
    // Turn counter + progress
    this.turnLabel.setText(`Turn ${this.currentTurn} / ${this.maxTurns}`);
    // ProgressBar maxValue is set at construction; scale value to percentage
    if (this.maxTurns > 0) {
      this.progressBar.setValue(
        Math.round((this.currentTurn / this.maxTurns) * 100),
      );
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

    // Company actions (purchases, new routes)
    for (const c of turnLog.companies) {
      for (const ship of c.shipsPurchased) {
        this.addFeedItem(
          `T${this.currentTurn}: ${truncate(c.name, 12)} bought ${ship}`,
          th.colors.text,
        );
      }
      for (const route of c.routesOpened) {
        this.addFeedItem(
          `T${this.currentTurn}: ${truncate(c.name, 12)} opened ${route.origin}\u2192${route.dest}`,
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
    this.activityList.addItem(container);
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
    this.cleanup();
    this.scene.start("MainMenuScene");
  }

  private cleanup(): void {
    if (this.runner) {
      this.runner.abort();
    }
    this.running = false;
    this.paused = false;
    this.stepResolve = null;
  }
}
