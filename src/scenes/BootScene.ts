import Phaser from "phaser";
import type { ThemeConfig } from "../ui/Theme.ts";
import { getTheme, lerpColor } from "../ui/Theme.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.image("hero-freight", "concepts/hero/freight-menu.jpg");
    this.load.image("hero-passenger", "concepts/hero/passenger-menu.jpg");
  }

  create(): void {
    const theme = getTheme();

    getAudioDirector().attachScene(this);

    this.generatePanelBg(theme);
    this.generatePanelGlow(theme);
    this.generateButtonTextures(theme);
    this.generateHudBarBg(theme);
    this.generateDividerH(theme);
    this.generateGlowDot();
    this.generatePixelWhite();
    this.generateNavIcons();

    // Proceed to main menu after textures are ready
    this.scene.start("MainMenuScene");
  }

  /**
   * Create a CanvasTexture and return it with its 2D context.
   * Throws if Phaser fails to allocate the canvas (should never happen at boot).
   */
  private makeCanvas(
    key: string,
    w: number,
    h: number,
  ): { tex: Phaser.Textures.CanvasTexture; ctx: CanvasRenderingContext2D } {
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) {
      throw new Error(`Failed to create canvas texture "${key}"`);
    }
    return { tex, ctx: tex.getContext() };
  }

  /** Convert hex color + alpha to an "rgba(r,g,b,a)" CSS string. */
  private rgba(color: number, alpha: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /** Trace a chamfered rectangle path on a Canvas2D context. */
  private traceChamferedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    c: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }

  /**
   * panel-bg (64x64): Glass gradient with chamfered corners.
   * Vertical gradient from glass.topTint to glass.bottomTint,
   * chamfered border in panelBorder, inner glow line in accent.
   */
  private generatePanelBg(theme: ThemeConfig): void {
    const size = 64;
    const { glass, chamfer, panel, colors } = theme;
    const { tex, ctx } = this.makeCanvas("panel-bg", size, size);

    // Vertical gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, this.rgba(glass.topTint, glass.bgAlpha));
    grad.addColorStop(1, this.rgba(glass.bottomTint, glass.bgAlpha));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Chamfered outer border
    ctx.lineWidth = panel.borderWidth;
    ctx.strokeStyle = this.rgba(colors.panelBorder, 0.8);
    this.traceChamferedRect(ctx, 1, 1, size - 2, size - 2, chamfer.size);
    ctx.stroke();

    // Inner accent line (1px inside the border)
    const inset = panel.borderWidth + 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.rgba(colors.accent, glass.innerBorderAlpha);
    this.traceChamferedRect(
      ctx,
      inset,
      inset,
      size - inset * 2,
      size - inset * 2,
      Math.max(chamfer.size - inset, 1),
    );
    ctx.stroke();

    tex.refresh();
  }

  /**
   * panel-glow (72x72): Outer glow texture.
   * Transparent canvas with concentric soft glow lines in accent color,
   * rendered behind panels as an underlay.
   */
  private generatePanelGlow(theme: ThemeConfig): void {
    const size = 72;
    const { glow, chamfer, colors } = theme;
    const { tex, ctx } = this.makeCanvas("panel-glow", size, size);

    // Draw concentric glow rings fading outward (3 layers)
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const alpha = glow.alpha * (1 - i / layers);
      const offset = i + 2;
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.rgba(colors.accent, alpha);
      this.traceChamferedRect(
        ctx,
        offset,
        offset,
        size - offset * 2,
        size - offset * 2,
        chamfer.size + (layers - i),
      );
      ctx.stroke();
    }

    tex.refresh();
  }

  /**
   * btn-normal, btn-hover, btn-pressed, btn-disabled (64x64 each):
   * Gradient fills derived from each button color, chamfered border,
   * and a 1px bottom accent line.
   */
  private generateButtonTextures(theme: ThemeConfig): void {
    const size = 64;
    const { chamfer, panel, glass, colors } = theme;

    const buttons: ReadonlyArray<[string, number]> = [
      ["btn-normal", colors.buttonBg],
      ["btn-hover", colors.buttonHover],
      ["btn-pressed", colors.buttonPressed],
      ["btn-disabled", colors.buttonDisabled],
    ];

    for (const [key, baseColor] of buttons) {
      const { tex, ctx } = this.makeCanvas(key, size, size);

      // Top: darken base color by 15%; bottom: lighten by 8%
      const topColor = lerpColor(baseColor, 0x000000, 0.15);
      const bottomColor = lerpColor(baseColor, 0xffffff, 0.08);

      // Vertical gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, this.rgba(topColor, glass.bgAlpha));
      grad.addColorStop(1, this.rgba(bottomColor, glass.bgAlpha));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Chamfered border
      ctx.lineWidth = panel.borderWidth;
      ctx.strokeStyle = this.rgba(colors.panelBorder, 1);
      this.traceChamferedRect(ctx, 1, 1, size - 2, size - 2, chamfer.size);
      ctx.stroke();

      // 1px bottom accent line along the chamfered bottom edge
      const c = chamfer.size;
      ctx.lineWidth = 1;
      ctx.strokeStyle = this.rgba(colors.accent, 0.4);
      ctx.beginPath();
      ctx.moveTo(c, size - 1);
      ctx.lineTo(size - c, size - 1);
      ctx.stroke();

      tex.refresh();
    }
  }

  /**
   * hud-bar-bg (256x4): Horizontal gradient for HUD bars.
   * Slightly darker at edges, full brightness at center, 0.9 alpha.
   */
  private generateHudBarBg(theme: ThemeConfig): void {
    const w = 256;
    const h = 4;
    const darkerHeader = lerpColor(theme.colors.headerBg, 0x000000, 0.2);
    const { tex, ctx } = this.makeCanvas("hud-bar-bg", w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, this.rgba(darkerHeader, 0.85));
    grad.addColorStop(0.5, this.rgba(theme.colors.headerBg, 0.9));
    grad.addColorStop(1, this.rgba(darkerHeader, 0.85));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    tex.refresh();
  }

  /**
   * divider-h (128x2): Horizontal divider gradient.
   * Accent color at full alpha on the left fading to transparent on the right.
   */
  private generateDividerH(theme: ThemeConfig): void {
    const w = 128;
    const h = 2;
    const { tex, ctx } = this.makeCanvas("divider-h", w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, this.rgba(theme.colors.accent, 1));
    grad.addColorStop(1, this.rgba(theme.colors.accent, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    tex.refresh();
  }

  /**
   * glow-dot (16x16): Radial glow for starfield.
   * White center fading to transparent at the edges.
   */
  private generateGlowDot(): void {
    const size = 16;
    const half = size / 2;
    const { tex, ctx } = this.makeCanvas("glow-dot", size, size);

    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    tex.refresh();
  }

  /** pixel-white (4x4): Solid white texture. */
  private generatePixelWhite(): void {
    const { tex, ctx } = this.makeCanvas("pixel-white", 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 4, 4);
    tex.refresh();
  }

  /**
   * Nav icons (24x24 each): Simple geometric icons for the left sidebar.
   * Drawn in white so they can be tinted at runtime.
   */
  private generateNavIcons(): void {
    const s = 24; // icon size
    const col = "#ffffff";

    // ── icon-map: 4-pointed star (galaxy) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-map", s, s);
      const cx = s / 2,
        cy = s / 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      const spikes = 4,
        outerR = 10,
        innerR = 4;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }

    // ── icon-fleet: Spaceship silhouette (upward triangle with fins) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-fleet", s, s);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(12, 2); // nose
      ctx.lineTo(17, 14); // right wing
      ctx.lineTo(20, 22); // right fin tip
      ctx.lineTo(15, 18); // right fin inner
      ctx.lineTo(12, 20); // tail center
      ctx.lineTo(9, 18); // left fin inner
      ctx.lineTo(4, 22); // left fin tip
      ctx.lineTo(7, 14); // left wing
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }

    // ── icon-routes: Two nodes connected by a line ──
    {
      const { tex, ctx } = this.makeCanvas("icon-routes", s, s);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2;
      // Connecting line
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(18, 18);
      ctx.stroke();
      // Nodes
      ctx.beginPath();
      ctx.arc(6, 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Small waypoint
      ctx.beginPath();
      ctx.arc(12, 12, 2, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }

    // ── icon-finance: Bar chart (3 ascending bars) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-finance", s, s);
      ctx.fillStyle = col;
      const barW = 5,
        gap = 2;
      const startX = 3;
      // Bar 1 (short)
      ctx.fillRect(startX, 15, barW, 7);
      // Bar 2 (medium)
      ctx.fillRect(startX + barW + gap, 10, barW, 12);
      // Bar 3 (tall)
      ctx.fillRect(startX + (barW + gap) * 2, 4, barW, 18);
      tex.refresh();
    }

    // ── icon-market: Exchange arrows (↔) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-market", s, s);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      // Right arrow
      ctx.beginPath();
      ctx.moveTo(4, 8);
      ctx.lineTo(18, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(20, 8);
      ctx.lineTo(14, 12);
      ctx.closePath();
      ctx.fill();
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(20, 16);
      ctx.lineTo(6, 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, 12);
      ctx.lineTo(4, 16);
      ctx.lineTo(10, 20);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }

    // ── icon-audio: Speaker with sound wave ──
    {
      const { tex, ctx } = this.makeCanvas("icon-audio", s, s);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      // Speaker body
      ctx.beginPath();
      ctx.moveTo(3, 9);
      ctx.lineTo(7, 9);
      ctx.lineTo(12, 5);
      ctx.lineTo(12, 19);
      ctx.lineTo(7, 15);
      ctx.lineTo(3, 15);
      ctx.closePath();
      ctx.fill();
      // Sound waves
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(13, 12, 4, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(13, 12, 7, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
      tex.refresh();
    }

    // ── icon-end-turn: Play/forward arrow ──
    {
      const { tex, ctx } = this.makeCanvas("icon-end-turn", s, s);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(6, 3);
      ctx.lineTo(20, 12);
      ctx.lineTo(6, 21);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }
  }
}
