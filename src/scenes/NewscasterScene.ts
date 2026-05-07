import * as Phaser from "phaser";
import {
  getTheme,
  getLayout,
  colorToString,
  Panel,
  Button,
} from "../ui/index.ts";
import { setGalaxy3DVisible } from "./galaxy3d/GalaxyView3D.ts";
import {
  getNewscasterForCategory,
  NEWSCASTER_DEFS,
} from "../generation/news/newscasters.ts";
import type { TickerItem } from "../generation/news/types.ts";
import { CATEGORY_META } from "../generation/news/categories.ts";

const PANEL_W = 680;
const PANEL_H = 340;
const PORTRAIT_SIZE = 180;
const PADDING = 20;
const TYPEWRITER_MS = 28;

// Derived from NEWSCASTER_DEFS so it stays in sync automatically.
const NEWSCASTER_PORTRAIT_KEYS = Object.values(NEWSCASTER_DEFS).map(
  (d) => d.portraitKey,
);

export class NewscasterScene extends Phaser.Scene {
  private item!: TickerItem;
  private typewriterEvent: Phaser.Time.TimerEvent | null = null;
  private storyText: Phaser.GameObjects.Text | null = null;
  private fullStoryText = "";
  private charIndex = 0;
  private widgets: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: "NewscasterScene" });
  }

  init(data: { item: TickerItem }): void {
    this.item = data.item;
  }

  preload(): void {
    for (const key of NEWSCASTER_PORTRAIT_KEYS) {
      if (!this.textures.exists(key)) {
        const stem = key.replace("newscaster-", "");
        this.load.image(key, `portraits/newscaster/${stem}.webp`);
      }
    }
  }

  create(): void {
    setGalaxy3DVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setGalaxy3DVisible(true);
    });

    const theme = getTheme();
    const L = getLayout();
    const cx = L.gameWidth / 2;
    const cy = L.gameHeight / 2;

    const newscaster = getNewscasterForCategory(this.item.category);
    const catMeta = CATEGORY_META[this.item.category];

    // Scrim — swallows clicks behind panel
    const scrim = this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(400)
      .setInteractive();
    this.widgets.push(scrim);

    // Main panel
    const panelX = cx - PANEL_W / 2;
    const panelY = cy - PANEL_H / 2;
    const panel = new Panel(this, {
      x: panelX,
      y: panelY,
      width: PANEL_W,
      height: PANEL_H,
    });
    panel.setDepth(401);
    this.widgets.push(panel);

    // Category header bar
    const headerH = 36;
    const headerBar = this.add
      .rectangle(panelX, panelY, PANEL_W, headerH, newscaster.accentColor, 0.9)
      .setOrigin(0, 0)
      .setDepth(402);
    this.widgets.push(headerBar);

    const channelLabel = this.add
      .text(
        panelX + PADDING,
        panelY + headerH / 2,
        `${catMeta.badge} — ${catMeta.label.toUpperCase()}`,
        {
          fontSize: "12px",
          fontFamily: "monospace",
          color: colorToString(theme.colors.background),
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(403);
    this.widgets.push(channelLabel);

    const liveTag = this.add
      .text(panelX + PANEL_W - PADDING, panelY + headerH / 2, "◉ LIVE", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.background),
      })
      .setOrigin(1, 0.5)
      .setDepth(403);
    this.widgets.push(liveTag);

    // [DEVELOPING] badge — only for long-depth stories. Pulses to signal an
    // ongoing/expanded story; sits to the left of the LIVE indicator.
    if (this.item.storyDepth === "long") {
      const developing = this.add
        .text(
          panelX + PANEL_W - PADDING - 60,
          panelY + headerH / 2,
          "[DEVELOPING]",
          {
            fontSize: "11px",
            fontFamily: "monospace",
            color: colorToString(theme.colors.warning),
          },
        )
        .setOrigin(1, 0.5)
        .setDepth(403);
      this.widgets.push(developing);
      this.tweens.add({
        targets: developing,
        alpha: { from: 1, to: 0.4 },
        duration: 800,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // Portrait area
    const portraitX = panelX + PADDING;
    const portraitY = panelY + headerH + PADDING;

    const portraitBg = this.add
      .rectangle(
        portraitX,
        portraitY,
        PORTRAIT_SIZE,
        PORTRAIT_SIZE,
        theme.colors.panelBorder,
        0.4,
      )
      .setOrigin(0, 0)
      .setDepth(402);
    this.widgets.push(portraitBg);

    if (this.textures.exists(newscaster.portraitKey)) {
      const portrait = this.add
        .image(
          portraitX + PORTRAIT_SIZE / 2,
          portraitY + PORTRAIT_SIZE / 2,
          newscaster.portraitKey,
        )
        .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
        .setDepth(403);
      this.widgets.push(portrait);
    }

    // Name / title column
    const nameX = portraitX + PORTRAIT_SIZE + PADDING;
    const nameAreaW = PANEL_W - PORTRAIT_SIZE - PADDING * 3;

    const nameLabel = this.add
      .text(nameX, portraitY, newscaster.name.toUpperCase(), {
        fontSize: "14px",
        fontFamily: "monospace",
        color: colorToString(newscaster.accentColor),
        fontStyle: "bold",
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(nameLabel);

    const titleLabel = this.add
      .text(nameX, portraitY + 20, newscaster.title, {
        fontSize: "10px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(titleLabel);

    const channelNameLabel = this.add
      .text(nameX, portraitY + 34, newscaster.channel, {
        fontSize: "10px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(channelNameLabel);

    const divider = this.add.graphics().setDepth(403);
    divider.lineStyle(1, theme.colors.panelBorder, 0.6);
    divider.lineBetween(
      nameX,
      portraitY + 52,
      nameX + nameAreaW,
      portraitY + 52,
    );
    this.widgets.push(divider);

    // Typewriter story text
    // item.story takes precedence over item.text; absent story → backward-compatible fallback.
    this.fullStoryText = this.item.story ?? this.item.text;
    this.charIndex = 0;

    this.storyText = this.add
      .text(nameX, portraitY + 62, "", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.text),
        wordWrap: { width: nameAreaW },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setDepth(403);
    this.widgets.push(this.storyText);

    this.typewriterEvent = this.time.addEvent({
      delay: TYPEWRITER_MS,
      callback: this.typeNextChar,
      callbackScope: this,
      loop: true,
    });

    // Close button
    const closeBtn = new Button(this, {
      x: panelX + PANEL_W - PADDING - 120,
      y: panelY + PANEL_H - PADDING - 32,
      width: 120,
      height: 32,
      label: "CLOSE",
      onClick: () => this.closeDialog(),
    });
    closeBtn.setDepth(403);
    this.widgets.push(closeBtn);

    this.input.keyboard?.once("keydown-ESC", () => this.closeDialog());
  }

  private typeNextChar(): void {
    if (!this.storyText) return;
    if (this.charIndex >= this.fullStoryText.length) {
      this.typewriterEvent?.remove();
      this.typewriterEvent = null;
      return;
    }
    this.charIndex++;
    this.storyText.setText(this.fullStoryText.slice(0, this.charIndex));
  }

  private closeDialog(): void {
    this.typewriterEvent?.remove();
    this.typewriterEvent = null;
    this.scene.stop();
  }

  shutdown(): void {
    this.typewriterEvent?.remove();
    this.typewriterEvent = null;
    for (const w of this.widgets) {
      if (w && "destroy" in w) (w as { destroy(): void }).destroy();
    }
    this.widgets = [];
  }
}
