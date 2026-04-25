import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import {
  getMoodAccentColor,
  ADVISER_SHEET_KEY,
  ADVISER_FRAME_COUNT,
  getAdviserFrameName,
  generateAdviserSpritesheet,
  drawRexPortrait,
} from "./AdviserPortrait.ts";
import type { AdviserMessage, AdviserMood } from "../data/types.ts";

export interface AdviserPanelConfig {
  x: number;
  y: number;
  width: number;
  /** If true, uses compact single-line mode */
  compact?: boolean;
}

// ── Drawer constants ───────────────────────────────────────
const TAB_WIDTH = 36;
const PORTRAIT_SIZE = 120;
const COMPACT_PORTRAIT = 64;
const TYPEWRITER_MS = 22;
const MSG_PADDING = 14;
const NAME_HEIGHT = 20;
const DISMISS_SIZE = 24;
const ANIM_FRAME_MS = 600;
const SLIDE_DURATION = 280;

/** Rex adviser portrait texture keys for loaded PNG portraits */
const REX_PORTRAIT_KEYS: Record<AdviserMood, string> = {
  standby: "rex-portrait-standby",
  analyzing: "rex-portrait-analyzing",
  alert: "rex-portrait-alert",
  success: "rex-portrait-success",
};

/**
 * Drawer-style adviser panel with integrated tab handle.
 *
 * The container is always visible. In the closed state only the tab
 * (left edge) peeks from the right side of the screen. Clicking the
 * tab slides the full panel out; clicking it again (or the dismiss
 * button) slides it back in.
 *
 * Layout inside the container (local coords):
 *   x=0            → tab handle (TAB_WIDTH wide)
 *   x=TAB_WIDTH    → panel body (config.width wide)
 *
 * The container's world-X is managed via closedX / openX.
 */
export class AdviserPanel extends Phaser.GameObjects.Container {
  // ── Visual elements ──
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private portraitGfx: Phaser.GameObjects.Graphics | null = null;
  private nameLabel: Phaser.GameObjects.Text;
  private msgLabel: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.NineSlice;
  private accentBar: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Rectangle;
  private solidBg: Phaser.GameObjects.Rectangle;
  private navLabel: Phaser.GameObjects.Text | null = null;
  private hitZone: Phaser.GameObjects.Zone | null = null;
  private dismissBtn: Phaser.GameObjects.Container | null = null;
  private portraitBorder: Phaser.GameObjects.Rectangle;
  private portraitGlowBar: Phaser.GameObjects.Rectangle;
  private tabBg: Phaser.GameObjects.Graphics;
  private tabIcon: Phaser.GameObjects.Image;
  private tabLabel: Phaser.GameObjects.Text;
  private tabAccent: Phaser.GameObjects.Rectangle;
  private tabBadge: Phaser.GameObjects.Text;

  // ── State ──
  private isCompact: boolean;
  private messages: AdviserMessage[] = [];
  private currentIndex = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = "";
  private charIndex = 0;
  private currentMood: AdviserMood = "standby";
  private portraitSize: number;
  private panelWidth: number;
  private panelHeight: number;
  private minPanelHeight: number;
  private animFrameIndex = 0;
  private animTimer: Phaser.Time.TimerEvent | null = null;
  private usesSpritesheet = false;
  private usesPngPortraits = false;
  private slideTween: Phaser.Tweens.Tween | null = null;
  private drawerOpen = false;
  private closedX: number; // x when drawer is closed (only tab visible)
  private openX: number; // x when drawer is open (tab + panel visible)
  private escKey: Phaser.Input.Keyboard.Key | null = null;
  private escHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, config: AdviserPanelConfig) {
    // Container starts at closedX (only tab visible)
    const closedX = config.x + config.width;
    const openX = config.x;
    super(scene, closedX, config.y);

    const theme = getTheme();
    this.isCompact = config.compact ?? false;
    this.portraitSize = this.isCompact ? COMPACT_PORTRAIT : PORTRAIT_SIZE;
    this.panelWidth = config.width;
    this.closedX = closedX;
    this.openX = openX;

    // Calculate panel height
    if (this.isCompact) {
      this.minPanelHeight = this.portraitSize + MSG_PADDING * 2;
    } else {
      this.minPanelHeight = this.portraitSize + MSG_PADDING * 2 + 60;
    }
    this.panelHeight = this.minPanelHeight;

    // All body elements are offset right by TAB_WIDTH
    const bx = TAB_WIDTH; // body x offset

    // ════════════════════════════════════════════════
    // ── TAB HANDLE (x=0..TAB_WIDTH) ────────────────
    // ════════════════════════════════════════════════

    const tabH = 72;

    this.tabBg = scene.add.graphics();
    this.drawTabBg(this.tabBg, tabH, theme.colors.headerBg, 0.92, theme.colors.panelBorder, 0.6);
    this.add(this.tabBg);

    this.tabAccent = scene.add
      .rectangle(0, 2, 3, tabH - 4, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.7);
    this.add(this.tabAccent);

    this.tabIcon = scene.add
      .image(TAB_WIDTH / 2, tabH / 2 - 8, "icon-adviser")
      .setOrigin(0.5, 0.5)
      .setTint(theme.colors.textDim);
    this.add(this.tabIcon);

    this.tabLabel = scene.add
      .text(TAB_WIDTH / 2, tabH - 12, "REX", {
        fontSize: "8px",
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.add(this.tabLabel);

    this.tabBadge = scene.add
      .text(TAB_WIDTH - 4, 2, "", {
        fontSize: "9px",
        fontFamily: theme.fonts.caption.family,
        color: "#fff",
        backgroundColor: colorToString(theme.colors.accent),
        padding: { x: 3, y: 1 },
      })
      .setOrigin(1, 0)
      .setVisible(false);
    this.add(this.tabBadge);

    // Tab hit area
    const tabHit = scene.add
      .rectangle(TAB_WIDTH / 2, tabH / 2, TAB_WIDTH, tabH, 0x000000, 0)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.add(tabHit);

    tabHit.on("pointerover", () => {
      this.drawTabBg(this.tabBg, tabH, theme.colors.buttonHover, 0.95, theme.colors.accent, 0.8);
      this.tabIcon.setTint(theme.colors.accent);
      this.tabLabel.setColor(colorToString(theme.colors.accent));
      this.tabAccent.setAlpha(1);
    });
    tabHit.on("pointerout", () => {
      this.drawTabBg(this.tabBg, tabH, theme.colors.headerBg, 0.92, theme.colors.panelBorder, 0.6);
      this.tabIcon.setTint(theme.colors.textDim);
      this.tabLabel.setColor(colorToString(theme.colors.textDim));
      this.tabAccent.setAlpha(0.7);
    });
    tabHit.on("pointerup", () => {
      this.toggle();
    });

    // ════════════════════════════════════════════════
    // ── PANEL BODY (x=TAB_WIDTH) ───────────────────
    // ════════════════════════════════════════════════

    // Drop shadow
    this.shadow = scene.add
      .rectangle(bx + 4, 4, config.width, this.panelHeight, theme.colors.modalOverlay)
      .setOrigin(0, 0)
      .setAlpha(0.5);
    this.add(this.shadow);

    // Solid backing
    this.solidBg = scene.add
      .rectangle(bx, 0, config.width, this.panelHeight, theme.colors.background)
      .setOrigin(0, 0)
      .setAlpha(0.94);
    this.add(this.solidBg);

    // Nine-slice panel background
    this.bg = scene.add
      .nineslice(bx, 0, "panel-bg", undefined, config.width, this.panelHeight, 10, 10, 10, 10)
      .setOrigin(0, 0)
      .setAlpha(0.88);
    this.add(this.bg);

    // Top highlight
    scene.add
      .rectangle(bx + 1, 0, config.width - 2, 1, 0xffffff)
      .setOrigin(0, 0)
      .setAlpha(0.1);

    // Accent bar (top)
    this.accentBar = scene.add
      .rectangle(bx, 0, config.width, 3, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.8);
    this.add(this.accentBar);

    // ── Portrait section ──
    const portraitX = bx + Math.floor((config.width - this.portraitSize) / 2);
    const portraitY = MSG_PADDING;

    this.portraitBorder = scene.add
      .rectangle(portraitX - 3, portraitY - 3, this.portraitSize + 6, this.portraitSize + 6, theme.colors.panelBorder)
      .setOrigin(0, 0)
      .setAlpha(0.6);
    this.add(this.portraitBorder);

    this.portraitGlowBar = scene.add
      .rectangle(portraitX, portraitY + this.portraitSize + 1, this.portraitSize, 2, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.6);
    this.add(this.portraitGlowBar);

    // Determine portrait rendering method
    this.usesPngPortraits = this.checkPngPortraitsAvailable();
    if (!this.usesPngPortraits) {
      if (!scene.textures.exists(ADVISER_SHEET_KEY)) {
        generateAdviserSpritesheet(scene.textures);
      }
      this.usesSpritesheet = scene.textures.exists(ADVISER_SHEET_KEY);
    }

    if (this.usesPngPortraits) {
      this.portraitImage = scene.add
        .image(portraitX + this.portraitSize / 2, portraitY + this.portraitSize / 2, REX_PORTRAIT_KEYS.standby)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(this.portraitSize, this.portraitSize);
      this.add(this.portraitImage);
    } else if (this.usesSpritesheet) {
      const frameName = getAdviserFrameName("standby", 0);
      this.portraitImage = scene.add
        .image(portraitX + this.portraitSize / 2, portraitY + this.portraitSize / 2, ADVISER_SHEET_KEY, frameName)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(this.portraitSize, this.portraitSize);
      this.add(this.portraitImage);
    } else {
      this.portraitGfx = scene.add.graphics();
      this.portraitGfx.setPosition(portraitX, portraitY);
      this.add(this.portraitGfx);
      drawRexPortrait(this.portraitGfx, this.portraitSize, this.portraitSize, "standby");
    }

    // ── Text area below portrait ──
    const textAreaTop = portraitY + this.portraitSize + MSG_PADDING;
    const textX = bx + MSG_PADDING + 4;
    const textW = config.width - MSG_PADDING * 2 - 8;

    const nameText = this.isCompact ? "Rex" : "REX — K9-Corp Adviser";
    this.nameLabel = scene.add
      .text(textX, textAreaTop, nameText, {
        fontSize: `${this.isCompact ? theme.fonts.caption.size : 12}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accent),
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.add(this.nameLabel);

    const separatorY = textAreaTop + NAME_HEIGHT - 2;
    scene.add
      .rectangle(textX, separatorY, textW, 1, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.25);

    const msgY = textAreaTop + NAME_HEIGHT + 2;
    this.msgLabel = scene.add
      .text(textX, msgY, "", {
        fontSize: `${this.isCompact ? theme.fonts.caption.size : theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: textW },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.add(this.msgLabel);

    // Navigation label
    if (!this.isCompact) {
      this.navLabel = scene.add
        .text(bx + config.width - MSG_PADDING, this.panelHeight - MSG_PADDING - 4, "", {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.nextMessage());
      this.add(this.navLabel);
    }

    // Dismiss X button
    if (!this.isCompact) {
      this.dismissBtn = this.createDismissButton(bx + config.width, theme);
      this.add(this.dismissBtn);
    }

    // Click panel body to advance messages
    this.hitZone = scene.add
      .zone(bx, 0, config.width, this.panelHeight)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.charIndex < this.fullText.length) {
          this.finishTypewriter();
        } else if (this.messages.length > 0) {
          this.nextMessage();
        }
      });
    this.add(this.hitZone);

    // Start animation timer
    this.startAnimationLoop();

    // ── ESC key: dismiss drawer when open ──
    // Bind via the scene's Phaser keyboard plugin so it plays nicely with
    // scene lifecycle. Captured (scene-scoped) handler ignores key events
    // while the drawer is closed so other scenes / overlays can still claim
    // ESC for their own modals.
    if (scene.input.keyboard) {
      this.escKey = scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC,
        false, // don't swallow — let other listeners see it too
        false,
      );
      this.escHandler = () => {
        if (this.drawerOpen) {
          this.closeDrawer();
        }
      };
      this.escKey.on("down", this.escHandler);
    }

    // Always visible — starts in closed position
    this.setAlpha(1);
    scene.add.existing(this);
  }

  // ── Tab drawing helper ─────────────────────────

  private drawTabBg(
    gfx: Phaser.GameObjects.Graphics,
    h: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor: number,
    strokeAlpha: number,
  ): void {
    gfx.clear();
    gfx.fillStyle(fillColor, fillAlpha);
    gfx.fillRoundedRect(0, 0, TAB_WIDTH, h, { tl: 8, bl: 8, tr: 0, br: 0 });
    gfx.lineStyle(1, strokeColor, strokeAlpha);
    gfx.strokeRoundedRect(0, 0, TAB_WIDTH, h, { tl: 8, bl: 8, tr: 0, br: 0 });
  }

  // ── Dismiss Button ─────────────────────────────

  private createDismissButton(
    rightEdgeX: number,
    theme: ReturnType<typeof getTheme>,
  ): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(rightEdgeX - DISMISS_SIZE / 2 - 6, DISMISS_SIZE / 2 + 6);

    const bg = this.scene.add
      .circle(0, 0, DISMISS_SIZE / 2, theme.colors.buttonBg, 0.6)
      .setInteractive({ useHandCursor: true });

    const gfx = this.scene.add.graphics();
    gfx.lineStyle(2, theme.colors.text, 0.8);
    const s = 5;
    gfx.beginPath();
    gfx.moveTo(-s, -s);
    gfx.lineTo(s, s);
    gfx.moveTo(s, -s);
    gfx.lineTo(-s, s);
    gfx.strokePath();

    btn.add([bg, gfx]);

    bg.on("pointerover", () => bg.setFillStyle(theme.colors.buttonHover, 0.9));
    bg.on("pointerout", () => bg.setFillStyle(theme.colors.buttonBg, 0.6));
    bg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.closeDrawer();
    });

    return btn;
  }

  // ── Animation loop ─────────────────────────────

  private startAnimationLoop(): void {
    this.animTimer = this.scene.time.addEvent({
      delay: ANIM_FRAME_MS,
      loop: true,
      callback: () => {
        if (!this.drawerOpen) return;
        this.animFrameIndex = (this.animFrameIndex + 1) % ADVISER_FRAME_COUNT;
        this.updatePortraitFrame();
      },
    });
  }

  private updatePortraitFrame(): void {
    if (this.usesPngPortraits && this.portraitImage) return;
    if (this.usesSpritesheet && this.portraitImage) {
      const frameName = getAdviserFrameName(this.currentMood, this.animFrameIndex);
      this.portraitImage.setFrame(frameName);
    }
  }

  // ── Portrait helpers ───────────────────────────

  private checkPngPortraitsAvailable(): boolean {
    return this.scene.textures.exists(REX_PORTRAIT_KEYS.standby);
  }

  private updatePortrait(mood: AdviserMood): void {
    if (this.usesPngPortraits && this.portraitImage) {
      const key = REX_PORTRAIT_KEYS[mood];
      if (this.scene.textures.exists(key)) {
        this.portraitImage.setTexture(key);
      }
    } else if (this.usesSpritesheet && this.portraitImage) {
      const frameName = getAdviserFrameName(mood, this.animFrameIndex);
      this.portraitImage.setFrame(frameName);
    } else if (this.portraitGfx) {
      drawRexPortrait(this.portraitGfx, this.portraitSize, this.portraitSize, mood);
    }
  }

  private updateAccentBar(mood: AdviserMood): void {
    const color = getMoodAccentColor(mood);
    this.accentBar.setFillStyle(color);
    this.portraitGlowBar.setFillStyle(color);
    this.portraitBorder.setFillStyle(color, 0.15);
  }

  // ── Public API ─────────────────────────────────

  /** Toggle the drawer open/closed. */
  toggle(): void {
    if (this.drawerOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  /** Open the drawer. If no messages queued, shows standby. */
  openDrawer(): void {
    if (this.drawerOpen) return;
    this.drawerOpen = true;

    if (this.messages.length === 0) {
      // Show default standby message
      this.messages = [
        {
          id: `standby-${Date.now()}`,
          text: "All quiet on the corporate front, boss.",
          mood: "standby",
          priority: 1,
          context: "tip",
          turnGenerated: 0,
        },
      ];
      this.currentIndex = 0;
    }
    this.displayCurrent();
    this.slideOpen();
  }

  /** Close the drawer with slide animation. */
  closeDrawer(): void {
    if (!this.drawerOpen) return;
    this.slideClosed(() => {
      this.drawerOpen = false;
      this.stopTypewriter();
    });
  }

  /** Whether the drawer is currently open. */
  get isOpen(): boolean {
    return this.drawerOpen;
  }

  /** Show a batch of messages and open the drawer. */
  showMessages(messages: AdviserMessage[]): void {
    if (messages.length === 0) return;
    this.messages = [...messages];
    this.currentIndex = 0;
    this.drawerOpen = true;
    this.displayCurrent();
    this.slideOpen();
  }

  /** Append messages to the queue. Opens drawer if closed. */
  appendMessages(messages: AdviserMessage[]): void {
    if (messages.length === 0) return;
    const wasEmpty = this.messages.length === 0;
    this.messages.push(...messages);
    if (wasEmpty || !this.drawerOpen) {
      this.currentIndex = this.messages.length - messages.length;
      this.drawerOpen = true;
      this.displayCurrent();
      this.slideOpen();
    }
    this.updateNav();
  }

  /** Show a single message immediately and open the drawer. */
  showSingle(text: string, mood: AdviserMood = "standby"): void {
    this.showMessages([
      {
        id: `single-${Date.now()}`,
        text,
        mood,
        priority: 1,
        context: "tip",
        turnGenerated: 0,
      },
    ]);
  }

  /** Dismiss = close drawer. */
  dismiss(): void {
    this.closeDrawer();
  }

  /** Clear all messages (keeps drawer closed). */
  clear(): void {
    this.stopTypewriter();
    this.messages = [];
    this.currentIndex = 0;
    this.msgLabel.setText("");
    this.resizePanel(this.minPanelHeight);
    if (this.drawerOpen) {
      this.closeDrawer();
    }
  }

  /** Update the badge on the tab. */
  updateBadge(count: number): void {
    if (count > 0) {
      this.tabBadge.setText(`${count}`);
      this.tabBadge.setVisible(true);
    } else {
      this.tabBadge.setVisible(false);
    }
  }

  get remaining(): number {
    return Math.max(0, this.messages.length - this.currentIndex);
  }

  get mood(): AdviserMood {
    return this.currentMood;
  }

  // ── Slide animations ───────────────────────────

  private slideOpen(): void {
    if (this.slideTween) {
      this.slideTween.stop();
      this.slideTween = null;
    }
    this.slideTween = this.scene.tweens.add({
      targets: this,
      x: this.openX,
      duration: SLIDE_DURATION,
      ease: "Back.easeOut",
    });
  }

  private slideClosed(onComplete?: () => void): void {
    if (this.slideTween) {
      this.slideTween.stop();
      this.slideTween = null;
    }
    this.slideTween = this.scene.tweens.add({
      targets: this,
      x: this.closedX,
      duration: SLIDE_DURATION * 0.7,
      ease: "Cubic.easeIn",
      onComplete: () => {
        onComplete?.();
      },
    });
  }

  // ── Internal ───────────────────────────────────

  private displayCurrent(): void {
    const msg = this.messages[this.currentIndex];
    if (!msg) {
      this.closeDrawer();
      return;
    }
    this.currentMood = msg.mood;
    this.updatePortrait(msg.mood);
    this.updateAccentBar(msg.mood);
    this.startTypewriter(msg.text);
    this.updateNav();
  }

  private nextMessage(): void {
    if (this.currentIndex < this.messages.length - 1) {
      this.currentIndex++;
      this.displayCurrent();
    } else {
      this.closeDrawer();
    }
  }

  private startTypewriter(text: string): void {
    this.stopTypewriter();
    this.fullText = text;
    this.charIndex = 0;

    this.msgLabel.setText(text);
    const textHeight = this.msgLabel.height;
    this.msgLabel.setText("");

    const textAreaTop = MSG_PADDING + this.portraitSize + MSG_PADDING;
    const msgY = textAreaTop + NAME_HEIGHT + 2;
    const bottomPad = this.isCompact ? MSG_PADDING : MSG_PADDING + 24;
    const neededHeight = Math.max(this.minPanelHeight, msgY + textHeight + bottomPad);
    this.resizePanel(neededHeight);

    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.msgLabel.setText(this.fullText.substring(0, this.charIndex));
      },
    });
  }

  private resizePanel(newHeight: number): void {
    if (Math.abs(newHeight - this.panelHeight) < 1) return;
    this.panelHeight = newHeight;
    this.shadow.setSize(this.panelWidth, newHeight);
    this.solidBg.setSize(this.panelWidth, newHeight);
    this.bg.setSize(this.panelWidth, newHeight);
    if (this.hitZone) {
      this.hitZone.setSize(this.panelWidth, newHeight);
    }
    if (this.navLabel) {
      this.navLabel.setY(newHeight - MSG_PADDING - 4);
    }
  }

  private finishTypewriter(): void {
    this.stopTypewriter();
    this.charIndex = this.fullText.length;
    this.msgLabel.setText(this.fullText);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
  }

  private updateNav(): void {
    if (!this.navLabel) return;
    const total = this.messages.length;
    if (total <= 1) {
      this.navLabel.setText("click to dismiss");
    } else {
      this.navLabel.setText(`${this.currentIndex + 1}/${total}  ▶`);
    }
  }

  destroy(fromScene?: boolean): void {
    this.stopTypewriter();
    if (this.animTimer) {
      this.animTimer.destroy();
      this.animTimer = null;
    }
    if (this.slideTween) {
      this.slideTween.stop();
      this.slideTween = null;
    }
    if (this.escKey && this.escHandler) {
      this.escKey.off("down", this.escHandler);
      this.escKey = null;
      this.escHandler = null;
    }
    super.destroy(fromScene);
  }
}
