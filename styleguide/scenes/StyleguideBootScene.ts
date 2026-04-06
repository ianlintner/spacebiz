import Phaser from "phaser";
import type { ThemeConfig } from "@spacebiz/ui";
import { getTheme, lerpColor } from "@spacebiz/ui";

/**
 * Generates all procedural canvas textures that the @spacebiz/ui
 * components depend on, then starts the showcase scene.
 */
export class StyleguideBootScene extends Phaser.Scene {
  constructor() {
    super({ key: "StyleguideBootScene" });
  }

  create(): void {
    const theme = getTheme();
    this.generatePanelBg(theme);
    this.generatePanelGlow(theme);
    this.generateButtonTextures(theme);
    this.generateGlowDot();
    this.generatePixelWhite();
    this.scene.start("StyleguideScene");
  }

  /* ── helpers ─────────────────────────────────────────────── */

  private makeCanvas(
    key: string,
    w: number,
    h: number,
  ): { tex: Phaser.Textures.CanvasTexture; ctx: CanvasRenderingContext2D } {
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) throw new Error(`Failed to create canvas texture "${key}"`);
    return { tex, ctx: tex.getContext() };
  }

  private rgba(color: number, alpha: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

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

  /* ── texture generators ──────────────────────────────────── */

  private generatePanelBg(theme: ThemeConfig): void {
    const size = 64;
    const { glass, chamfer, panel, colors } = theme;
    const { tex, ctx } = this.makeCanvas("panel-bg", size, size);
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, this.rgba(glass.topTint, glass.bgAlpha));
    grad.addColorStop(1, this.rgba(glass.bottomTint, glass.bgAlpha));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.lineWidth = panel.borderWidth;
    ctx.strokeStyle = this.rgba(colors.panelBorder, 0.8);
    this.traceChamferedRect(ctx, 1, 1, size - 2, size - 2, chamfer.size);
    ctx.stroke();
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

  private generatePanelGlow(theme: ThemeConfig): void {
    const size = 72;
    const { glow, chamfer, colors } = theme;
    const { tex, ctx } = this.makeCanvas("panel-glow", size, size);
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
      const topColor = lerpColor(baseColor, 0x000000, 0.15);
      const bottomColor = lerpColor(baseColor, 0xffffff, 0.08);
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, this.rgba(topColor, glass.bgAlpha));
      grad.addColorStop(1, this.rgba(bottomColor, glass.bgAlpha));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.lineWidth = panel.borderWidth;
      ctx.strokeStyle = this.rgba(colors.panelBorder, 1);
      this.traceChamferedRect(ctx, 1, 1, size - 2, size - 2, chamfer.size);
      ctx.stroke();
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

  private generatePixelWhite(): void {
    const { tex, ctx } = this.makeCanvas("pixel-white", 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 4, 4);
    tex.refresh();
  }
}
