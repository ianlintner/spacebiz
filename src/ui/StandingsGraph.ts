import * as Phaser from "phaser";
import { getTheme, colorToString, TabGroup, getShipMapKey } from "./index.ts";
import {
  rivalBandBounds,
  type CompanyTimeSeries,
  type StandingsData,
  type StandingsMetric,
} from "../game/standingsHistory.ts";

export interface StandingsGraphConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Called when the user picks a metric tab; consumer rebuilds data and calls setData. */
  onMetricChange?: (metric: StandingsMetric) => void;
}

/** 6-color palette for rival lines. Cycles if there are more than 6 rivals. */
const RIVAL_COLORS = [
  0xff6688, // pink-red
  0xffaa44, // amber
  0xffee66, // yellow
  0x66ddff, // cyan
  0xaa88ff, // violet
  0x88ffaa, // mint
] as const;

const PLAYER_COLOR = 0x4488ff;

const PADDING = {
  left: 56,
  right: 32,
  top: 16,
  bottom: 28,
};

/** A drawable polyline: an array of (x,y) screen-space points. */
type Polyline = { x: number; y: number }[];

interface RenderedSeries {
  series: CompanyTimeSeries;
  color: number;
  isPlayer: boolean;
  /** Plot-space points (not yet clipped by draw-in progress). */
  fullLine: Polyline;
  /** For rivals: the upper/lower band polygon points (computed once on setData). */
  upperBand?: Polyline;
  lowerBand?: Polyline;
}

export class StandingsGraph extends Phaser.GameObjects.Container {
  private readonly graphWidth: number;
  private readonly graphHeight: number;

  private gridGraphics: Phaser.GameObjects.Graphics;
  private lineGraphics: Phaser.GameObjects.Graphics;
  private shipSprites: Phaser.GameObjects.Image[] = [];
  private rankTexts: Phaser.GameObjects.Text[] = [];
  private yLabels: Phaser.GameObjects.Text[] = [];
  private xLabels: Phaser.GameObjects.Text[] = [];
  private metricTabs: TabGroup;

  private currentData: StandingsData | null = null;
  private currentMetric: StandingsMetric = "cash";
  private rendered: RenderedSeries[] = [];

  private drawInTween: Phaser.Tweens.Tween | null = null;
  private bobTweens: Phaser.Tweens.Tween[] = [];

  /** Plot rect in container-local coords (below the metric tab strip). */
  private plotX = 0;
  private plotY = 0;
  private plotW = 0;
  private plotH = 0;
  private tabRowHeight: number;

  constructor(scene: Phaser.Scene, opts: StandingsGraphConfig) {
    super(scene, opts.x, opts.y);
    this.graphWidth = opts.width;
    this.graphHeight = opts.height;

    const theme = getTheme();
    this.tabRowHeight = theme.button.height;

    this.gridGraphics = scene.add.graphics();
    this.lineGraphics = scene.add.graphics();
    this.add([this.gridGraphics, this.lineGraphics]);

    // Inline metric tabs at the top — Cash / Routes / Fleet.
    const onMetricChange = opts.onMetricChange;
    this.metricTabs = new TabGroup(scene, {
      x: 0,
      y: 0,
      width: Math.min(360, this.graphWidth),
      tabHeight: this.tabRowHeight,
      tabs: [
        { label: "Cash", content: scene.add.container(0, 0) },
        { label: "Routes", content: scene.add.container(0, 0) },
        { label: "Fleet", content: scene.add.container(0, 0) },
      ],
    });

    // Override TabGroup activation to bubble the metric out — TabGroup itself
    // toggles its own (empty) tab content, but we use the click as a trigger.
    const originalSetActiveTab = this.metricTabs.setActiveTab.bind(
      this.metricTabs,
    );
    this.metricTabs.setActiveTab = (index: number) => {
      originalSetActiveTab(index);
      const metric: StandingsMetric =
        index === 0 ? "cash" : index === 1 ? "routes" : "fleet";
      if (metric !== this.currentMetric) {
        this.currentMetric = metric;
        onMetricChange?.(metric);
      }
    };
    this.add(this.metricTabs);

    // Plot rect lives below the tab strip.
    this.plotX = PADDING.left;
    this.plotY = this.tabRowHeight + PADDING.top;
    this.plotW = this.graphWidth - PADDING.left - PADDING.right;
    this.plotH =
      this.graphHeight - this.tabRowHeight - PADDING.top - PADDING.bottom;

    scene.add.existing(this);
  }

  setMetric(metric: StandingsMetric): void {
    this.currentMetric = metric;
    const idx = metric === "cash" ? 0 : metric === "routes" ? 1 : 2;
    if (this.metricTabs.getActiveIndex() !== idx) {
      // Use the original setActiveTab to avoid re-firing the metric callback.
      // The override above intercepts user clicks; this path is for
      // programmatic sync from the host scene.
      this.metricTabs.setActiveTab(idx);
    }
  }

  setStandingsData(data: StandingsData): void {
    this.stopAnimation();
    this.currentData = data;
    this.currentMetric = data.metric;
    this.buildRenderedSeries();
    this.drawGrid();
    this.placeShipSprites();
    this.placeRankBadges();
    this.redrawLines(1);
  }

  /** Cinematic left-to-right reveal. Call once per session. */
  playDrawIn(): void {
    if (!this.currentData) return;
    this.stopAnimation();
    this.redrawLines(0);
    for (const s of this.shipSprites) s.setVisible(false);
    for (const t of this.rankTexts) t.setVisible(false);

    const proxy = { p: 0 };
    this.drawInTween = this.scene.tweens.add({
      targets: proxy,
      p: 1,
      duration: 1200,
      ease: "Sine.Out",
      onUpdate: () => {
        this.redrawLines(proxy.p);
        this.updateShipPositions(proxy.p);
      },
      onComplete: () => {
        for (const s of this.shipSprites) s.setVisible(true);
        for (const t of this.rankTexts) t.setVisible(true);
        this.startBobTweens();
      },
    });
  }

  stopAnimation(): void {
    if (this.drawInTween) {
      this.drawInTween.stop();
      this.drawInTween = null;
    }
    for (const t of this.bobTweens) t.stop();
    this.bobTweens = [];
  }

  destroy(fromScene?: boolean): void {
    this.stopAnimation();
    super.destroy(fromScene);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private buildRenderedSeries(): void {
    if (!this.currentData) return;
    const data = this.currentData;
    const out: RenderedSeries[] = [];

    out.push({
      series: data.playerSeries,
      color: PLAYER_COLOR,
      isPlayer: true,
      fullLine: data.playerSeries.snapshots.map((s) => ({
        x: this.xForTurn(s.turn),
        y: this.yForValue(s.value),
      })),
    });

    data.rivalSeries.forEach((r, i) => {
      const color = RIVAL_COLORS[i % RIVAL_COLORS.length];
      const fullLine: Polyline = r.snapshots.map((s) => ({
        x: this.xForTurn(s.turn),
        y: this.yForValue(s.value),
      }));
      const upperBand: Polyline = r.snapshots.map((s) => ({
        x: this.xForTurn(s.turn),
        y: this.yForValue(rivalBandBounds(s.value).upper),
      }));
      const lowerBand: Polyline = r.snapshots.map((s) => ({
        x: this.xForTurn(s.turn),
        y: this.yForValue(rivalBandBounds(s.value).lower),
      }));
      out.push({
        series: r,
        color,
        isPlayer: false,
        fullLine,
        upperBand,
        lowerBand,
      });
    });

    this.rendered = out;
  }

  private xForTurn(turn: number): number {
    if (!this.currentData) return this.plotX;
    const { maxTurns } = this.currentData;
    const span = Math.max(1, maxTurns);
    // Turn 0 sits at the left edge; current turn at the right.
    const t = Phaser.Math.Clamp(turn / span, 0, 1);
    return this.plotX + t * this.plotW;
  }

  private yForValue(value: number): number {
    if (!this.currentData) return this.plotY + this.plotH;
    const { yMin, yMax } = this.currentData;
    const span = Math.max(1, yMax - yMin);
    const t = (value - yMin) / span;
    // Higher value = visually higher = smaller y.
    return this.plotY + this.plotH - t * this.plotH;
  }

  private drawGrid(): void {
    const theme = getTheme();
    this.gridGraphics.clear();

    // Plot background
    this.gridGraphics.fillStyle(theme.colors.background, 0.4);
    this.gridGraphics.fillRect(this.plotX, this.plotY, this.plotW, this.plotH);

    // Border
    this.gridGraphics.lineStyle(1, theme.colors.panelBorder, 0.6);
    this.gridGraphics.strokeRect(
      this.plotX,
      this.plotY,
      this.plotW,
      this.plotH,
    );

    // Y-axis gridlines (5 horizontal bands)
    const yTicks = 5;
    this.gridGraphics.lineStyle(1, theme.colors.panelBorder, 0.25);
    for (let i = 0; i <= yTicks; i++) {
      const yy = this.plotY + (i / yTicks) * this.plotH;
      this.gridGraphics.lineBetween(
        this.plotX,
        yy,
        this.plotX + this.plotW,
        yy,
      );
    }

    this.refreshYLabels(yTicks);
    this.refreshXLabels();
  }

  private refreshYLabels(yTicks: number): void {
    for (const t of this.yLabels) t.destroy();
    this.yLabels = [];
    if (!this.currentData) return;

    const theme = getTheme();
    const { yMin, yMax } = this.currentData;

    for (let i = 0; i <= yTicks; i++) {
      // i=0 → top label (max), i=yTicks → bottom label (min)
      const value = yMax - (i / yTicks) * (yMax - yMin);
      const text = formatAxisValue(value, this.currentMetric);
      const yy = this.plotY + (i / yTicks) * this.plotH;
      const label = this.scene.add
        .text(this.plotX - 6, yy, text, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(1, 0.5);
      this.yLabels.push(label);
      this.add(label);
    }
  }

  private refreshXLabels(): void {
    for (const t of this.xLabels) t.destroy();
    this.xLabels = [];
    if (!this.currentData) return;

    const theme = getTheme();
    const maxTurns = this.currentData.maxTurns;
    const stepEvery = maxTurns > 16 ? 4 : 2;
    for (let turn = 0; turn <= maxTurns; turn += stepEvery) {
      const xx = this.xForTurn(turn);
      const label = this.scene.add
        .text(xx, this.plotY + this.plotH + 4, `T${turn}`, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5, 0);
      this.xLabels.push(label);
      this.add(label);
    }
  }

  private redrawLines(progress: number): void {
    this.lineGraphics.clear();
    if (!this.currentData) return;

    // Draw rival bands first so player line renders above them.
    for (const r of this.rendered) {
      if (r.isPlayer || !r.upperBand || !r.lowerBand) continue;
      this.drawRivalBand(r, progress);
    }

    // Then rival midlines (dashed, 50% opacity).
    for (const r of this.rendered) {
      if (r.isPlayer) continue;
      this.drawDashedPolyline(r.fullLine, progress, r.color, 0.5, 2);
    }

    // Player line on top — older half dashed/dim, recent half solid/bright.
    for (const r of this.rendered) {
      if (!r.isPlayer) continue;
      this.drawPlayerLine(r, progress);
    }
  }

  private drawRivalBand(r: RenderedSeries, progress: number): void {
    if (!r.upperBand || !r.lowerBand) return;
    const total = r.fullLine.length;
    if (total < 2) return;
    const visiblePts = Math.max(2, Math.ceil(total * progress));
    const upper = r.upperBand.slice(0, visiblePts);
    const lower = r.lowerBand.slice(0, visiblePts);
    if (upper.length < 2) return;

    // Polygon: upper left→right, then lower right→left.
    const poly = [...upper, ...[...lower].reverse()];
    this.lineGraphics.fillStyle(r.color, 0.12);
    this.lineGraphics.beginPath();
    this.lineGraphics.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      this.lineGraphics.lineTo(poly[i].x, poly[i].y);
    }
    this.lineGraphics.closePath();
    this.lineGraphics.fillPath();
  }

  private drawPlayerLine(r: RenderedSeries, progress: number): void {
    const total = r.fullLine.length;
    if (total < 2) return;
    const visiblePts = Math.max(2, Math.ceil(total * progress));
    const pts = r.fullLine.slice(0, visiblePts);

    // Split at the halfway point of the *full* series so the styling stays
    // stable across the draw-in. Older half: dashed/40% alpha. Recent: solid/full.
    const splitIdx = Math.floor(total / 2);
    const olderEnd = Math.min(splitIdx, pts.length - 1);

    // Older portion (dashed)
    if (olderEnd > 0) {
      this.drawDashedPolyline(pts.slice(0, olderEnd + 1), 1, r.color, 0.4, 3);
    }
    // Recent portion (solid)
    if (pts.length - 1 > olderEnd) {
      this.lineGraphics.lineStyle(3, r.color, 1);
      this.lineGraphics.beginPath();
      this.lineGraphics.moveTo(pts[olderEnd].x, pts[olderEnd].y);
      for (let i = olderEnd + 1; i < pts.length; i++) {
        this.lineGraphics.lineTo(pts[i].x, pts[i].y);
      }
      this.lineGraphics.strokePath();
    }
  }

  private drawDashedPolyline(
    pts: Polyline,
    progress: number,
    color: number,
    alpha: number,
    width: number,
  ): void {
    const total = pts.length;
    if (total < 2) return;
    const visiblePts = Math.max(2, Math.ceil(total * progress));
    const visible = pts.slice(0, visiblePts);

    this.lineGraphics.lineStyle(width, color, alpha);
    const dashLen = 6;
    const gapLen = 4;
    for (let i = 0; i < visible.length - 1; i++) {
      drawDashedSegment(
        this.lineGraphics,
        visible[i],
        visible[i + 1],
        dashLen,
        gapLen,
      );
    }
  }

  private placeShipSprites(): void {
    for (const s of this.shipSprites) s.destroy();
    this.shipSprites = [];
    if (!this.currentData) return;

    for (const r of this.rendered) {
      if (r.series.isBankrupt) continue; // bankrupt rivals lose their sprite
      const last = r.fullLine[r.fullLine.length - 1];
      if (!last) continue;
      const key = getShipMapKey(r.series.shipClass);
      let sprite: Phaser.GameObjects.Image;
      if (this.scene.textures.exists(key)) {
        sprite = this.scene.add.image(last.x, last.y, key, "1");
        // Map sprites are 48×48 with 4 frames; "1" is the cruising frame.
      } else {
        // Fallback: a tinted dot so the graph never breaks if textures are missing.
        sprite = this.scene.add.image(
          last.x,
          last.y,
          "__MISSING",
        ) as Phaser.GameObjects.Image;
      }
      sprite.setScale(0.5); // 48 → ~24px
      sprite.setTint(r.color);
      sprite.setDepth(1);
      this.shipSprites.push(sprite);
      this.add(sprite);
    }
  }

  private placeRankBadges(): void {
    for (const t of this.rankTexts) t.destroy();
    this.rankTexts = [];
    if (!this.currentData) return;

    const theme = getTheme();
    const ranks = computeRankMap(this.currentData);

    for (const r of this.rendered) {
      const last = r.fullLine[r.fullLine.length - 1];
      if (!last) continue;
      const rank = ranks.get(r.series.id);
      const label = r.series.isBankrupt ? "✕" : `#${rank}`;
      const txt = this.scene.add
        .text(last.x, last.y - 18, label, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(r.color),
          fontStyle: "bold",
          stroke: colorToString(theme.colors.background),
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1);
      this.rankTexts.push(txt);
      this.add(txt);
    }
  }

  private updateShipPositions(progress: number): void {
    if (!this.currentData) return;
    let visibleIdx = 0;
    for (const r of this.rendered) {
      if (r.series.isBankrupt) continue;
      const sprite = this.shipSprites[visibleIdx];
      const rankText = this.rankTexts[visibleIdx];
      visibleIdx++;
      if (!sprite) continue;

      const total = r.fullLine.length;
      if (total < 2) {
        // Single-point series: just reveal at full progress.
        if (progress >= 1) {
          sprite.setVisible(true);
          if (rankText) rankText.setVisible(true);
        }
        continue;
      }
      const targetFloat = (total - 1) * progress;
      const baseIdx = Math.floor(targetFloat);
      const frac = targetFloat - baseIdx;
      const a = r.fullLine[baseIdx];
      const b = r.fullLine[Math.min(baseIdx + 1, total - 1)];
      const x = a.x + (b.x - a.x) * frac;
      const y = a.y + (b.y - a.y) * frac;
      sprite.setPosition(x, y);
      sprite.setVisible(true);
      if (rankText) {
        rankText.setPosition(x, y - 18);
        // Rank text only meaningful at the end — keep hidden until done.
        rankText.setVisible(progress >= 0.95);
      }
    }
  }

  private startBobTweens(): void {
    for (const t of this.bobTweens) t.stop();
    this.bobTweens = [];
    this.shipSprites.forEach((sprite, i) => {
      const baseY = sprite.y;
      const tw = this.scene.tweens.add({
        targets: sprite,
        y: baseY - 3,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
        delay: i * 120,
      });
      this.bobTweens.push(tw);
    });
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function drawDashedSegment(
  g: Phaser.GameObjects.Graphics,
  a: { x: number; y: number },
  b: { x: number; y: number },
  dashLen: number,
  gapLen: number,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len;
  const uy = dy / len;
  let pos = 0;
  while (pos < len) {
    const dash = Math.min(dashLen, len - pos);
    const x1 = a.x + ux * pos;
    const y1 = a.y + uy * pos;
    const x2 = a.x + ux * (pos + dash);
    const y2 = a.y + uy * (pos + dash);
    g.lineBetween(x1, y1, x2, y2);
    pos += dashLen + gapLen;
  }
}

function formatAxisValue(value: number, metric: StandingsMetric): string {
  if (metric !== "cash") {
    return Math.round(value).toString();
  }
  // Cash: § prefix with K/M suffix.
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1_000_000) body = `${(value / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) body = `${(value / 1_000).toFixed(0)}K`;
  else body = `${Math.round(value)}`;
  return `§${body}`;
}

function computeRankMap(data: StandingsData): Map<string, number> {
  const all = [data.playerSeries, ...data.rivalSeries];
  const sorted = [...all].sort((a, b) => b.currentValue - a.currentValue);
  const ranks = new Map<string, number>();
  sorted.forEach((s, i) => ranks.set(s.id, i + 1));
  return ranks;
}
