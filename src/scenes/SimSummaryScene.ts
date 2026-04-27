import * as Phaser from "phaser";
import {
  getTheme,
  colorToString,
  Button,
  Label,
  Panel,
  TabGroup,
  getLayout,
  createStarfield,
} from "../ui/index.ts";
import type { SimulationResult } from "../game/simulation/SimulationLogger.ts";

// ── Company color palette ──────────────────────────────────────

const COMPANY_COLORS = [
  0x00ffcc, // cyan/accent
  0xff6666, // red
  0xffaa00, // amber
  0x66aaff, // blue
  0xff66ff, // magenta
  0x66ff66, // green
  0xff8844, // orange
  0xcc66ff, // purple
];

// ── Scene data ─────────────────────────────────────────────────

interface SimSummaryData {
  result: SimulationResult;
}

// ── Graph helper ───────────────────────────────────────────────

interface GraphSeries {
  label: string;
  color: number;
  values: number[];
}

function drawLineGraph(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  series: GraphSeries[],
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    yLabel?: string;
    formatValue?: (v: number) => string;
  },
): void {
  const theme = getTheme();
  const gfx = scene.add.graphics();
  container.add(gfx);

  const pad = { left: 70, right: 16, top: 32, bottom: 28 };
  const plotX = opts.x + pad.left;
  const plotY = opts.y + pad.top;
  const plotW = opts.width - pad.left - pad.right;
  const plotH = opts.height - pad.top - pad.bottom;

  // Title
  const titleText = scene.add.text(
    opts.x + opts.width / 2,
    opts.y + 4,
    opts.title,
    {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.text),
    },
  );
  titleText.setOrigin(0.5, 0);
  container.add(titleText);

  // Compute global min/max across all series
  let globalMin = Infinity;
  let globalMax = -Infinity;
  let maxLen = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    }
    if (s.values.length > maxLen) maxLen = s.values.length;
  }
  if (globalMin === globalMax) {
    globalMax = globalMin + 1;
  }
  // Add 5% padding
  const range = globalMax - globalMin;
  globalMin -= range * 0.05;
  globalMax += range * 0.05;

  // Axes
  gfx.lineStyle(1, theme.colors.panelBorder, 0.6);
  gfx.beginPath();
  gfx.moveTo(plotX, plotY);
  gfx.lineTo(plotX, plotY + plotH);
  gfx.lineTo(plotX + plotW, plotY + plotH);
  gfx.strokePath();

  // Grid lines (4 horizontal)
  const gridCount = 4;
  const fmt = opts.formatValue ?? ((v: number) => v.toFixed(0));
  for (let i = 0; i <= gridCount; i++) {
    const frac = i / gridCount;
    const gy = plotY + plotH - frac * plotH;
    const val = globalMin + frac * (globalMax - globalMin);

    gfx.lineStyle(1, theme.colors.panelBorder, 0.2);
    gfx.beginPath();
    gfx.moveTo(plotX, gy);
    gfx.lineTo(plotX + plotW, gy);
    gfx.strokePath();

    const label = scene.add.text(plotX - 6, gy, fmt(val), {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    });
    label.setOrigin(1, 0.5);
    container.add(label);
  }

  // X-axis labels (turn numbers)
  const xLabelCount = Math.min(6, maxLen);
  for (let i = 0; i < xLabelCount; i++) {
    const turnIdx = Math.round((i / (xLabelCount - 1)) * (maxLen - 1));
    const lx = plotX + (turnIdx / (maxLen - 1)) * plotW;
    const label = scene.add.text(lx, plotY + plotH + 4, `${turnIdx + 1}`, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    });
    label.setOrigin(0.5, 0);
    container.add(label);
  }

  // Draw each series
  for (const s of series) {
    if (s.values.length < 2) continue;
    gfx.lineStyle(2, s.color, 0.9);
    gfx.beginPath();
    for (let i = 0; i < s.values.length; i++) {
      const px = plotX + (i / (maxLen - 1)) * plotW;
      const py =
        plotY +
        plotH -
        ((s.values[i] - globalMin) / (globalMax - globalMin)) * plotH;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }
}

function buildLegend(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  series: GraphSeries[],
  x: number,
  y: number,
  maxWidth: number,
): void {
  const theme = getTheme();
  const itemH = 16;
  const swatchW = 12;
  const gap = 8;
  let cx = 0;
  let cy = 0;

  for (const s of series) {
    const estWidth = swatchW + 4 + s.label.length * 7 + gap;
    if (cx + estWidth > maxWidth && cx > 0) {
      cx = 0;
      cy += itemH;
    }

    const swatch = scene.add
      .rectangle(x + cx, y + cy, swatchW, swatchW, s.color)
      .setOrigin(0, 0);
    container.add(swatch);

    const lbl = scene.add.text(x + cx + swatchW + 4, y + cy, s.label, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.text),
    });
    lbl.setOrigin(0, 0);
    container.add(lbl);

    cx += estWidth;
  }
}

// ── Scene ──────────────────────────────────────────────────────

export class SimSummaryScene extends Phaser.Scene {
  constructor() {
    super("SimSummaryScene");
  }

  create(data: SimSummaryData): void {
    const { result } = data;
    const theme = getTheme();
    const L = getLayout();

    // Opaque backdrop blocks any underlying scene's renderer (e.g. the
    // GalaxyMapScene Three.js canvas) from showing through.
    this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, theme.colors.background, 1)
      .setOrigin(0, 0)
      .setDepth(-200);

    createStarfield(this);

    // ── Title bar ──────────────────────────────────────────
    const titleLabel = new Label(this, {
      x: L.gameWidth / 2,
      y: 14,
      text: "Simulation Summary",
      style: "heading",
      color: theme.colors.accent,
    });
    titleLabel.setOrigin(0.5, 0);

    // ── Subtitle ───────────────────────────────────────────
    const sub = result.summary.winner
      ? `Winner: ${result.summary.winner.name}  |  ${result.summary.totalTurns} turns  |  ${(result.wallTimeMs / 1000).toFixed(1)}s`
      : `No winner  |  ${result.summary.totalTurns} turns  |  ${(result.wallTimeMs / 1000).toFixed(1)}s`;
    const subLabel = new Label(this, {
      x: L.gameWidth / 2,
      y: 42,
      text: sub,
      style: "caption",
      color: theme.colors.textDim,
    });
    subLabel.setOrigin(0.5, 0);

    // ── Build company color map ────────────────────────────
    const companyNames = this.getCompanyNames(result);
    const colorMap = new Map<string, number>();
    companyNames.forEach((name, i) => {
      colorMap.set(name, COMPANY_COLORS[i % COMPANY_COLORS.length]);
    });

    // ── Main panel ─────────────────────────────────────────
    const panelTop = 60;
    const panelH = L.gameHeight - panelTop - 60;
    const mainPanel = new Panel(this, {
      x: L.fullContentLeft,
      y: panelTop,
      width: L.fullContentWidth,
      height: panelH,
      title: "Results",
    });
    const ca = mainPanel.getContentArea();

    // ── Build tab contents ─────────────────────────────────
    const cashTab = this.buildCashGraph(result, colorMap, ca.width);
    const fleetTab = this.buildFleetGraph(result, colorMap, ca.width);
    const economyTab = this.buildEconomyGraph(result, ca.width);
    const rankingsTab = this.buildRankingsTab(result, colorMap, ca.width);

    new TabGroup(this, {
      x: L.fullContentLeft + ca.x,
      y: panelTop + ca.y,
      width: ca.width,
      tabs: [
        { label: "Cash", content: cashTab },
        { label: "Fleet", content: fleetTab },
        { label: "Economy", content: economyTab },
        { label: "Rankings", content: rankingsTab },
      ],
    });

    // ── Bottom buttons ─────────────────────────────────────
    const btnY = L.gameHeight - 48;
    const btnW = 140;
    const btnH = 38;
    const btnGap = 16;
    const totalBtnW = btnW * 3 + btnGap * 2;
    let btnX = Math.floor((L.gameWidth - totalBtnW) / 2);

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Run Again",
      onClick: () => {
        this.scene.start("SandboxSetupScene");
      },
    });
    btnX += btnW + btnGap;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Export Log",
      onClick: () => this.exportLog(result),
    });
    btnX += btnW + btnGap;

    new Button(this, {
      x: btnX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: "Main Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    // ── Resize handler ─────────────────────────────────────
    const onResize = () => {
      this.scene.restart(data);
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
  }

  // ── Tab builders ─────────────────────────────────────────────

  private buildCashGraph(
    result: SimulationResult,
    colorMap: Map<string, number>,
    contentWidth: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const names = this.getCompanyNames(result);
    const series: GraphSeries[] = names.map((name) => ({
      label: name,
      color: colorMap.get(name) ?? 0xffffff,
      values: result.turnLogs.map(
        (tl) => tl.companies.find((c) => c.name === name)?.cash ?? 0,
      ),
    }));

    const graphH = 280;
    drawLineGraph(this, container, series, {
      x: 0,
      y: 10,
      width: contentWidth - 20,
      height: graphH,
      title: "Cash Over Time",
      formatValue: (v) => `\u00A7${Math.round(v / 1000)}k`,
    });

    buildLegend(this, container, series, 80, graphH + 20, contentWidth - 100);

    return container;
  }

  private buildFleetGraph(
    result: SimulationResult,
    colorMap: Map<string, number>,
    contentWidth: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const names = this.getCompanyNames(result);

    const fleetSeries: GraphSeries[] = names.map((name) => ({
      label: name,
      color: colorMap.get(name) ?? 0xffffff,
      values: result.turnLogs.map(
        (tl) => tl.companies.find((c) => c.name === name)?.fleetSize ?? 0,
      ),
    }));

    const graphH = 280;
    drawLineGraph(this, container, fleetSeries, {
      x: 0,
      y: 10,
      width: contentWidth - 20,
      height: graphH,
      title: "Fleet Size Over Time",
    });

    buildLegend(
      this,
      container,
      fleetSeries,
      80,
      graphH + 20,
      contentWidth - 100,
    );

    return container;
  }

  private buildEconomyGraph(
    result: SimulationResult,
    contentWidth: number,
  ): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(0, 0);

    const fuelSeries: GraphSeries = {
      label: "Fuel Price",
      color: theme.colors.warning,
      values: result.turnLogs.map((tl) => tl.economy.fuelPrice),
    };

    const cargoSeries: GraphSeries = {
      label: "Avg Cargo Price",
      color: theme.colors.accent,
      values: result.turnLogs.map((tl) => tl.economy.avgCargoPrice),
    };

    const volumeSeries: GraphSeries = {
      label: "Market Volume",
      color: 0x66aaff,
      values: result.turnLogs.map((tl) => tl.economy.totalMarketVolume),
    };

    // Price graph
    const priceH = 200;
    drawLineGraph(this, container, [fuelSeries, cargoSeries], {
      x: 0,
      y: 10,
      width: contentWidth - 20,
      height: priceH,
      title: "Prices Over Time",
      formatValue: (v) => `\u00A7${v.toFixed(1)}`,
    });

    // Volume graph below
    const volY = priceH + 40;
    const volH = 160;
    drawLineGraph(this, container, [volumeSeries], {
      x: 0,
      y: volY,
      width: contentWidth - 20,
      height: volH,
      title: "Total Market Volume",
      formatValue: (v) => `${Math.round(v)}`,
    });

    buildLegend(
      this,
      container,
      [fuelSeries, cargoSeries, volumeSeries],
      80,
      volY + volH + 10,
      contentWidth - 100,
    );

    return container;
  }

  private buildRankingsTab(
    result: SimulationResult,
    colorMap: Map<string, number>,
    contentWidth: number,
  ): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(0, 0);

    let y = 16;
    const rowH = 36;
    const pad = 16;
    const barMaxW = contentWidth - 280;

    // Find max score for bar scaling
    const maxScore = Math.max(
      1,
      ...result.summary.rankings.map((r) => r.score),
    );

    // Header
    const hdrStyle = {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    };
    container.add(this.add.text(pad, y, "#", hdrStyle).setOrigin(0, 0));
    container.add(
      this.add.text(pad + 30, y, "Company", hdrStyle).setOrigin(0, 0),
    );
    container.add(
      this.add.text(pad + 180, y, "Score", hdrStyle).setOrigin(0, 0),
    );
    container.add(
      this.add.text(pad + 240, y, "Net Worth", hdrStyle).setOrigin(0, 0),
    );
    y += 24;

    // Separator
    const sep = this.add
      .rectangle(pad, y, contentWidth - pad * 2, 1, theme.colors.panelBorder)
      .setOrigin(0, 0);
    container.add(sep);
    y += 8;

    // Rankings rows with bar chart
    result.summary.rankings.forEach((rank, i) => {
      const color = colorMap.get(rank.name) ?? theme.colors.text;
      const rowStyle = {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(color),
      };

      // Rank number
      container.add(
        this.add.text(pad, y, `${i + 1}`, rowStyle).setOrigin(0, 0),
      );

      // Company name
      const nameStr =
        rank.name.length > 18 ? rank.name.slice(0, 17) + "\u2026" : rank.name;
      container.add(
        this.add.text(pad + 30, y, nameStr, rowStyle).setOrigin(0, 0),
      );

      // Score
      container.add(
        this.add.text(pad + 180, y, `${rank.score}`, rowStyle).setOrigin(0, 0),
      );

      // Net worth
      container.add(
        this.add
          .text(
            pad + 240,
            y,
            `\u00A7${Math.round(rank.netWorth).toLocaleString("en-US")}`,
            {
              ...rowStyle,
              color: colorToString(theme.colors.text),
            },
          )
          .setOrigin(0, 0),
      );

      // Score bar
      const barW = Math.max(4, (rank.score / maxScore) * barMaxW);
      const bar = this.add
        .rectangle(pad + 340, y + 2, barW, rowH - 12, color, 0.35)
        .setOrigin(0, 0);
      container.add(bar);

      // Fleet / route info on bar
      container.add(
        this.add
          .text(
            pad + 346,
            y + 4,
            `Fleet: ${rank.fleetSize}  Routes: ${rank.routeCount}`,
            {
              fontSize: `${theme.fonts.caption.size}px`,
              fontFamily: theme.fonts.caption.family,
              color: colorToString(theme.colors.textDim),
            },
          )
          .setOrigin(0, 0),
      );

      y += rowH;
    });

    // Bankruptcies section
    if (result.summary.bankruptcies.length > 0) {
      y += 16;
      container.add(
        this.add
          .text(pad, y, "Bankruptcies", {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.loss),
          })
          .setOrigin(0, 0),
      );
      y += 24;

      for (const b of result.summary.bankruptcies) {
        container.add(
          this.add
            .text(pad + 16, y, `${b.name} — turn ${b.turn}`, {
              fontSize: `${theme.fonts.caption.size}px`,
              fontFamily: theme.fonts.caption.family,
              color: colorToString(theme.colors.textDim),
            })
            .setOrigin(0, 0),
        );
        y += 20;
      }
    }

    // Economy snapshot
    y += 16;
    const econ = result.summary.economySnapshot;
    container.add(
      this.add
        .text(pad, y, "Economy Snapshot", {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.accent),
        })
        .setOrigin(0, 0),
    );
    y += 24;

    const econRows = [
      ["Final Fuel Price", `\u00A7${econ.finalFuelPrice.toFixed(2)}`],
      ["Avg Fuel Price", `\u00A7${econ.avgFuelPrice.toFixed(2)}`],
      ["Peak Fuel Price", `\u00A7${econ.peakFuelPrice.toFixed(2)}`],
      ["Final Cargo Price", `\u00A7${econ.finalAvgCargoPrice.toFixed(2)}`],
    ];

    for (const [label, value] of econRows) {
      container.add(
        this.add
          .text(pad + 16, y, label, {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
          })
          .setOrigin(0, 0),
      );
      container.add(
        this.add
          .text(pad + 200, y, value, {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.text),
          })
          .setOrigin(0, 0),
      );
      y += 20;
    }

    return container;
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getCompanyNames(result: SimulationResult): string[] {
    if (result.turnLogs.length === 0) return [];
    return result.turnLogs[0].companies.map((c) => c.name);
  }

  private exportLog(result: SimulationResult): void {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sim-summary-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
