import * as Phaser from "phaser";
import type { ThemeConfig } from "../ui/index.ts";
import {
  getTheme,
  lerpColor,
  registerUiSoundHandler,
  generateCargoIcons,
  generateShipIcons,
  generateShipMapSprites,
  SHIP_CLASS_LIST,
} from "../ui/index.ts";
import { traceChamferedPath } from "@spacebiz/ui";
import { getAudioDirector, type SfxKey } from "../audio/AudioDirector.ts";
import {
  PLANET_PORTRAIT_TYPES,
  getPlanetPortraitTextureKey,
  getPlanetPortraitAssetUrls,
} from "../data/planetPortraits.ts";
import {
  ROOM_PORTRAIT_TYPES,
  getRoomPortraitTextureKey,
  getRoomPortraitAssetUrls,
} from "../data/roomPortraits.ts";
import {
  SYSTEM_PORTRAIT_KEYS,
  EVENT_PORTRAIT_CATEGORIES,
  getSystemPortraitAssetUrls,
  getEventPortraitTextureKey,
  getEventPortraitAssetUrls,
} from "../data/systemPortraits.ts";
import { generateAdviserSpritesheet } from "@rogue-universe/shared";
import { PlanetBiome } from "../data/types.ts";

const BOOT_MIN_DISPLAY_MS = 2500;

export class BootScene extends Phaser.Scene {
  private bootStartedAt = 0;

  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Launch the persistent video backdrop scene beneath us. It outlives boot
    // and provides the main-menu ambient background as well.
    this.bootStartedAt = performance.now();
    if (!this.scene.isActive("VideoBackdropScene")) {
      this.scene.launch("VideoBackdropScene");
    }
    this.scene.sendToBack("VideoBackdropScene");

    // ── Draw boot progress bar before any loads begin ─────────────────────
    this.drawBootScreen();

    this.load.on("progress", (value: number) => {
      this.updateProgressBar(value);
    });

    this.load.on("fileprogress", (file: { key: string }) => {
      this.updateProgressLabel(`Loading ${file.key}…`);
    });

    // ── Critical assets only (< 5 MB total with WebP) ─────────────────────

    // Hero images removed — MainMenuScene now uses VideoBackdropScene instead.

    // Planet portraits (7 types, ~280 KB WebP total) — always shown on maps
    for (const ptype of PLANET_PORTRAIT_TYPES) {
      this.load.image(
        getPlanetPortraitTextureKey(ptype),
        getPlanetPortraitAssetUrls(ptype),
      );
    }

    // Room portraits (18 types, ~680 KB WebP total) — StationBuilder shows all
    for (const rtype of ROOM_PORTRAIT_TYPES) {
      this.load.image(
        getRoomPortraitTextureKey(rtype),
        getRoomPortraitAssetUrls(rtype),
      );
    }

    // System portraits (6 star types) — historically shown in the (removed)
    // SystemMapScene sidebar; still kept loaded for any future system UI.
    for (const key of SYSTEM_PORTRAIT_KEYS) {
      this.load.image(key, getSystemPortraitAssetUrls(key));
    }

    // Event portraits (5 categories) — shown in TechTree, TurnReport, Finance, Contracts
    for (const cat of EVENT_PORTRAIT_CATEGORIES) {
      this.load.image(
        getEventPortraitTextureKey(cat),
        getEventPortraitAssetUrls(cat),
      );
    }

    // Rex adviser portraits (4 moods, ~230 KB WebP total) — HUD-wide
    const rexMoods = ["standby", "analyzing", "alert", "success"] as const;
    for (const mood of rexMoods) {
      this.load.image(`rex-portrait-${mood}`, [
        `portraits/adviser/rex-${mood}.webp`,
        `portraits/adviser/rex-${mood}.png`,
      ]);
    }

    // CEO + Empire Leader portraits are NOT preloaded here.
    // They are fetched on-demand via PortraitLoader when actually needed.

    // Ship AI pixel-art sprites — loaded if available; missing files are silently skipped.
    // When loaded, these take precedence over procedural Canvas sprites in generateShipMapSprites().
    for (const cls of SHIP_CLASS_LIST) {
      this.load.image(`ship-map-${cls}`, `ships/map/${cls}.png`);
      this.load.image(`ship-portrait-${cls}`, `ships/portraits/${cls}.png`);
    }

    // Planet biome sprites (21 PNGs) — authored pixel art, ~105KB total
    for (const biome of Object.values(PlanetBiome)) {
      this.load.image(`planet:${biome}`, `planets/${biome}.png`);
    }

    // Space station sprites (4 upgrade levels) — hub station in system view
    for (let level = 1; level <= 4; level++) {
      this.load.image(`station:level${level}`, `stations/level${level}.png`);
    }

    // Dilemma banner illustrations (~10 × 480×240 PNG, ~1.2 MB total) — loaded
    // up front so the modal can display instantly when a dilemma fires.
    const dilemmaImageKeys = [
      "dilemma_engineer_strike",
      "dilemma_tariff_brinkmanship",
      "dilemma_credit_squeeze",
      "dilemma_rival_recruits",
      "dilemma_retrofit_offer",
      "dilemma_quarantine_outbreak",
      "dilemma_corporate_espionage",
      "dilemma_bandit_warlord_offer",
      "dilemma_data_breach",
      "dilemma_legacy_freighter",
    ];
    for (const key of dilemmaImageKeys) {
      this.load.image(key, `dilemmas/${key}.png`);
    }

    // Map layer toolbar icon spritesheet — 4×4 grid of 24×24 px icons.
    this.load.spritesheet("ui-icons", "ui-icons-24.png", {
      frameWidth: 24,
      frameHeight: 24,
    });
  }

  create(): void {
    const theme = getTheme();

    // Fade out the boot screen before switching scenes
    this.updateProgressBar(1);
    this.updateProgressLabel("Initializing…");

    getAudioDirector().attachScene(this);
    registerUiSoundHandler({
      sfx: (key) => getAudioDirector().sfx(key as SfxKey),
    });

    // Wave-2 dialogue SFX (file-based, generated by `scripts/generate-dialogue-sfx.mjs`).
    // Missing files silently fall back to a synthesized confirm — see AudioDirector.sfx().
    const dialogueSfxKeys: SfxKey[] = [
      "dialogue_open_standard",
      "dialogue_open_news",
      "dialogue_open_alert",
      "dialogue_open_memo",
      "result_positive_operational",
      "result_positive_diplomatic",
      "result_positive_financial",
      "result_positive_narrative",
      "result_negative_operational",
      "result_negative_diplomatic",
      "result_negative_financial",
      "result_negative_narrative",
    ];
    for (const key of dialogueSfxKeys) {
      void getAudioDirector().preloadFileSfx(key, `audio/dialogue/${key}.ogg`);
    }

    this.generatePanelBg(theme);
    this.generatePanelGlow(theme);
    this.generateButtonTextures(theme);
    this.generateHudBarBg(theme);
    this.generateDividerH(theme);
    this.generateGlowDot();
    this.generatePixelWhite();
    this.generateNavIcons();
    generateCargoIcons(this.textures);
    generateShipIcons(this.textures);
    generateShipMapSprites(this.textures, this.anims);
    generateAdviserSpritesheet(this.textures);

    // Enforce minimum display so the backdrop video gets screen time, then
    // fade out and hand off to the main menu.
    const elapsed = performance.now() - this.bootStartedAt;
    const remaining = Math.max(0, BOOT_MIN_DISPLAY_MS - elapsed);
    this.time.delayedCall(remaining, () => {
      // Fade out boot UI only — leaving the persistent VideoBackdropScene
      // untouched so the menu can take over the video seamlessly.
      this.tweens.add({
        targets: this.children.list,
        alpha: 0,
        duration: 200,
        onComplete: () => this.scene.start("MainMenuScene"),
      });
    });
  }

  // ── Boot screen progress UI ──────────────────────────────────────────────

  private bootGfx: Phaser.GameObjects.Graphics | null = null;
  private bootLabel: Phaser.GameObjects.Text | null = null;
  private bootBarWidth = 0;
  private bootBarX = 0;
  private bootBarY = 0;

  private drawBootScreen(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Local corner vignette so UI stays legible against bright video frames.
    this.drawCornerVignette(W, H);

    // Right-aligned slick corner stack: title → subtitle → progress bar → file label.
    const rightX = W - 32;
    const baseY = H - 48;
    const barW = 220;
    const barH = 2;
    const barX = rightX - barW;
    const barY = baseY;
    this.bootBarWidth = barW;
    this.bootBarX = barX;
    this.bootBarY = barY;

    const textDpr = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      3,
    );

    // Title — small, wide-tracked, low alpha for subtlety
    this.add
      .text(rightX, baseY - 30, "STAR FREIGHT TYCOON", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8f0f7",
        letterSpacing: 4,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.85)
      .setResolution(textDpr);

    // Tiny subtitle in muted accent
    this.add
      .text(rightX, baseY - 14, "BOOTING SYSTEMS", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#7eb8d4",
        letterSpacing: 3,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.55)
      .setResolution(textDpr);

    // Hairline track
    const track = this.add.graphics();
    track.fillStyle(0xffffff, 0.08);
    track.fillRect(barX, barY, barW, barH);

    this.bootGfx = this.add.graphics();
    this.updateProgressBar(0);

    // File label, right-aligned under the bar, very muted
    this.bootLabel = this.add
      .text(rightX, barY + 12, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#7eb8d4",
        letterSpacing: 1,
      })
      .setOrigin(1, 0.5)
      .setResolution(textDpr)
      .setAlpha(0.45);
  }

  /**
   * Radial vignette anchored to the bottom-right corner.
   * Darkest at the corner where the boot UI sits, fading to fully transparent
   * across roughly the bottom-right quadrant. Uses a canvas texture because
   * Phaser Graphics doesn't support radial gradients.
   */
  private drawCornerVignette(W: number, H: number): void {
    const size = 512;
    const key = "boot-corner-vignette";
    if (!this.textures.exists(key)) {
      const { tex, ctx } = this.makeCanvas(key, size, size);
      // Gradient centered at (size, size) — the bottom-right of the texture
      const grad = ctx.createRadialGradient(size, size, 0, size, size, size);
      grad.addColorStop(0, "rgba(5,10,20,0.85)");
      grad.addColorStop(0.5, "rgba(5,10,20,0.4)");
      grad.addColorStop(1, "rgba(5,10,20,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
    // Stretch a portion of the texture across the bottom-right of the screen.
    const vw = Math.min(W * 0.55, 560);
    const vh = Math.min(H * 0.55, 380);
    this.add
      .image(W, H, key)
      .setOrigin(1, 1)
      .setDisplaySize(vw, vh)
      .setDepth(-50);
  }

  private updateProgressBar(value: number): void {
    if (!this.bootGfx) return;
    const clamped = Math.min(Math.max(value, 0), 1);
    const filled = Math.floor(this.bootBarWidth * clamped);
    this.bootGfx.clear();
    // Main fill — soft accent
    this.bootGfx.fillStyle(0x7eb8d4, 0.9);
    this.bootGfx.fillRect(this.bootBarX, this.bootBarY, filled, 2);
    // Bright leading pixel for that "live" feel
    if (clamped > 0 && clamped < 1) {
      this.bootGfx.fillStyle(0xffffff, 1);
      this.bootGfx.fillRect(
        this.bootBarX + filled - 1,
        this.bootBarY - 1,
        1,
        4,
      );
    }
  }

  private updateProgressLabel(text: string): void {
    if (this.bootLabel) {
      this.bootLabel.setText(text);
    }
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

  /**
   * panel-bg (64x64): Glass gradient with chamfered corners.
   * Vertical gradient from glass.topTint to glass.bottomTint,
   * chamfered border in panelBorder.
   */
  private generatePanelBg(theme: ThemeConfig): void {
    const size = 64;
    const { glass, shape, panel, colors } = theme;
    const c = shape.container.chamfer;
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
    traceChamferedPath(ctx, 1, 1, size - 2, size - 2, c);
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
    const { glow, shape, colors } = theme;
    const c = shape.container.chamfer;
    const { tex, ctx } = this.makeCanvas("panel-glow", size, size);

    // Draw concentric glow rings fading outward (3 layers)
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const alpha = glow.alpha * (1 - i / layers);
      const offset = i + 2;
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.rgba(colors.accent, alpha);
      traceChamferedPath(
        ctx,
        offset,
        offset,
        size - offset * 2,
        size - offset * 2,
        c + (layers - i),
      );
      ctx.stroke();
    }

    tex.refresh();
  }

  /**
   * btn-normal, btn-hover, btn-pressed, btn-disabled (64x64 each):
   * Clean rounded-rect buttons with a 1px border and subtle top-edge highlight.
   * These textures are retained for Modal.ts backward compatibility; the
   * Button component draws its own Graphics bg at runtime.
   */
  private generateButtonTextures(theme: ThemeConfig): void {
    const size = 64;
    const { colors } = theme;

    const buttons: ReadonlyArray<[string, number]> = [
      ["btn-normal", colors.buttonBg],
      ["btn-hover", colors.buttonHover],
      ["btn-pressed", colors.buttonPressed],
      ["btn-disabled", colors.buttonDisabled],
    ];

    for (const [key, baseColor] of buttons) {
      const { tex, ctx } = this.makeCanvas(key, size, size);
      const isDisabled = key === "btn-disabled";
      const isPressed = key === "btn-pressed";

      // Fill (hard-square)
      const fillAlpha = isDisabled ? 0.75 : 0.95;
      ctx.fillStyle = this.rgba(baseColor, fillAlpha);
      ctx.fillRect(0, 0, size, size);

      // Top-edge highlight (subtle depth on non-pressed)
      if (!isPressed && !isDisabled) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(2, 1, size - 4, 1);
      }

      // Border
      const borderBase = colors.panelBorder;
      const borderColor =
        key === "btn-hover"
          ? lerpColor(borderBase, colors.accent, 0.4)
          : borderBase;
      const borderAlpha = isDisabled ? 0.3 : isPressed ? 0.5 : 0.75;
      ctx.lineWidth = 1;
      ctx.strokeStyle = this.rgba(borderColor, borderAlpha);
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

      // Bottom accent line (skip disabled)
      if (!isDisabled) {
        ctx.strokeStyle = this.rgba(colors.accent, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(4, size - 1);
        ctx.lineTo(size - 4, size - 1);
        ctx.stroke();
      }

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

    // ── icon-save: Floppy disk silhouette ──
    {
      const { tex, ctx } = this.makeCanvas("icon-save", s, s);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      // Outer disk body (rounded-corner-ish square)
      ctx.fillRect(3, 3, 18, 18);
      // Punch a hole for label area (drawn over with negative space later)
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      // Label panel (lower portion, lighter)
      ctx.fillRect(6, 13, 12, 7);
      // Metal shutter (upper portion, slot)
      ctx.fillRect(8, 4, 8, 6);
      ctx.restore();
      // Re-draw label rim and shutter slot strokes for definition
      ctx.lineWidth = 1.2;
      ctx.strokeRect(6, 13, 12, 7);
      ctx.strokeRect(8, 4, 8, 6);
      // Slot indicator inside the shutter
      ctx.fillRect(13, 5, 2, 4);
      // Label lines (writing on the label area)
      ctx.fillRect(8, 15, 8, 1);
      ctx.fillRect(8, 17, 6, 1);
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

    // ── icon-contracts: Clipboard / document with lines ──
    {
      const { tex, ctx } = this.makeCanvas("icon-contracts", s, s);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1.5;
      // Clipboard outline
      ctx.strokeRect(5, 4, 14, 18);
      // Clip at top
      ctx.fillRect(9, 2, 6, 4);
      // Lines on page
      ctx.fillRect(8, 10, 8, 1.5);
      ctx.fillRect(8, 14, 8, 1.5);
      ctx.fillRect(8, 18, 5, 1.5);
      tex.refresh();
    }

    // ── icon-research: Atom / orbital rings ──
    {
      const { tex, ctx } = this.makeCanvas("icon-research", s, s);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1.5;
      const cx = s / 2,
        cy = s / 2;
      // Center nucleus
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Orbital ring 1 (horizontal ellipse)
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Orbital ring 2 (tilted)
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 4, Math.PI / 3, 0, Math.PI * 2);
      ctx.stroke();
      // Orbital ring 3 (tilted other way)
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 4, -Math.PI / 3, 0, Math.PI * 2);
      ctx.stroke();
      tex.refresh();
    }

    // ── icon-empire: Crown (3 points) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-empire", s, s);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(3, 20);
      ctx.lineTo(3, 10);
      ctx.lineTo(8, 14);
      ctx.lineTo(12, 4);
      ctx.lineTo(16, 14);
      ctx.lineTo(21, 10);
      ctx.lineTo(21, 20);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }

    // ── icon-rival: Two crossed swords ──
    {
      const { tex, ctx } = this.makeCanvas("icon-rival", s, s);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2;
      // Sword 1 (top-left to bottom-right)
      ctx.beginPath();
      ctx.moveTo(4, 4);
      ctx.lineTo(20, 20);
      ctx.stroke();
      ctx.fillRect(2, 2, 4, 4);
      // Sword 2 (top-right to bottom-left)
      ctx.beginPath();
      ctx.moveTo(20, 4);
      ctx.lineTo(4, 20);
      ctx.stroke();
      ctx.fillRect(18, 2, 4, 4);
      // Guard lines
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 16);
      ctx.lineTo(16, 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(16, 8);
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

    // ── icon-hub: Space station (central ring + docking arms) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-hub", s, s);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1.5;
      const cx = s / 2,
        cy = s / 2;
      // Central ring
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.stroke();
      // Docking arms (4 directions)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(2, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy);
      ctx.lineTo(22, cy);
      ctx.stroke();
      // End caps
      ctx.fillRect(cx - 2, 1, 4, 3);
      ctx.fillRect(cx - 2, 20, 4, 3);
      ctx.fillRect(1, cy - 2, 3, 4);
      ctx.fillRect(20, cy - 2, 3, 4);
      tex.refresh();
    }

    // ── icon-adviser: Husky face silhouette (ears + muzzle) ──
    {
      const { tex, ctx } = this.makeCanvas("icon-adviser", s, s);
      ctx.fillStyle = col;
      // Left ear
      ctx.beginPath();
      ctx.moveTo(5, 14);
      ctx.lineTo(8, 3);
      ctx.lineTo(11, 10);
      ctx.closePath();
      ctx.fill();
      // Right ear
      ctx.beginPath();
      ctx.moveTo(19, 14);
      ctx.lineTo(16, 3);
      ctx.lineTo(13, 10);
      ctx.closePath();
      ctx.fill();
      // Head circle
      ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2);
      ctx.fill();
      // Muzzle
      ctx.beginPath();
      ctx.ellipse(12, 18, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
  }
}
