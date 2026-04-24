import Phaser from "phaser";
import {
  createStarfield,
  Panel,
  Button,
  Dropdown,
  Label,
  getTheme,
  getLayout,
} from "../ui/index.ts";
import { gameStore } from "../data/GameStore.ts";
import { createNewGame } from "../game/NewGameSetup.ts";
import type {
  GameState,
  StarSystem,
  GalaxyShape,
} from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { CEO_PORTRAITS, getPortraitTextureKey } from "../data/portraits.ts";
import { portraitLoader, PORTRAIT_PLACEHOLDER_KEY } from "../game/PortraitLoader.ts";
import { withLoadingOverlay } from "../ui/LoadingOverlay.ts";
import type { GamePreset } from "../data/constants.ts";

const PRESET_NAMES = [
  "Stellar Shipping Co.",
  "Nova Freight Lines",
  "Cosmic Haulers",
  "Galaxy Express",
  "Deep Space Transport",
];

/** Display info for each preset button */
const PRESET_OPTIONS: Array<{
  preset: GamePreset;
  label: string;
  description: string;
}> = [
  { preset: "quick", label: "QUICK", description: "~25 min · 6 empires" },
  { preset: "standard", label: "STANDARD", description: "~45 min · 8 empires" },
  { preset: "epic", label: "EPIC", description: "~80 min · 12 empires" },
];

/**
 * Module-level cache of the last-chosen setup parameters. Prevents the
 * scene from regenerating a brand-new seed / preset combo every time the
 * user backs out and re-enters Setup. Only an explicit "Randomize" click
 * rerolls the seed.
 */
interface LastSetupChoice {
  seed: number;
  nameIndex: number;
  portraitIndex: number;
  gamePreset: GamePreset;
  galaxyShape: GalaxyShape;
}
let lastSetupChoice: LastSetupChoice | null = null;

export class GalaxySetupScene extends Phaser.Scene {
  private seed = 0;
  private nameIndex = 0;
  private portraitIndex = 0;
  private selectedSystemIndex = 0;
  private gamePreset: GamePreset = "standard";
  private galaxyShape: GalaxyShape = "spiral";
  private seedLabel!: Label;
  private nameLabel!: Label;
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private systemCards: Panel[] = [];
  private startingOptions: StarSystem[] = [];
  private currentState!: GameState;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private portraitLabel: Label | null = null;
  private portraitMask: Phaser.GameObjects.Graphics | null = null;
  private portraitDiameter = 0;
  /** Preset picker buttons — tracked so we can re-highlight on click */
  private presetButtons: Button[] = [];
  /** Layout values needed by buildSystemCards, set in create() */
  private configX = 0;
  private configW = 0;
  private cardsTopY = 0;
  private cardsBottomY = 0;

  constructor() {
    super({ key: "GalaxySetupScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    getAudioDirector().setMusicState("setup");

    // Restore previous setup choice if present — only reroll seed on an
    // explicit "Randomize" click.
    if (lastSetupChoice) {
      this.seed = lastSetupChoice.seed;
      this.nameIndex = lastSetupChoice.nameIndex;
      this.portraitIndex = lastSetupChoice.portraitIndex;
      this.gamePreset = lastSetupChoice.gamePreset;
      this.galaxyShape = lastSetupChoice.galaxyShape;
    } else {
      this.seed = Math.floor(Math.random() * 1000000);
      this.nameIndex = 0;
      this.portraitIndex = 0;
      this.gamePreset = "standard";
      this.galaxyShape = "spiral";
    }
    this.selectedSystemIndex = 0;
    this.cardObjects = [];
    this.systemCards = [];
    this.presetButtons = [];

    // 1. Starfield background
    createStarfield(this);

    // 2. Centered setup panel
    const panelW = Math.min(780, L.gameWidth - 60);
    const panelH = Math.min(640, L.gameHeight - 60);
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = Math.floor((L.gameHeight - panelH) / 2);
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "NEW GALAXY",
    });

    const pad = theme.spacing.lg;
    const contentTop = panelY + theme.panel.titleHeight + pad;

    // ═══════════════════════════════════════════════════════════════════
    // Top area: Two-column layout — LEFT = CEO portrait, RIGHT = config
    // ═══════════════════════════════════════════════════════════════════
    const portraitSize = 120;
    this.portraitDiameter = portraitSize;
    const portraitAreaW = portraitSize + pad * 2;
    const portraitCenterX = panelX + pad + portraitSize / 2;
    const portraitCenterY = contentTop + portraitSize / 2;

    // ── CEO Portrait (large, circular) ──
    // Start with placeholder; swap when first portrait loads
    this.portraitImage = this.add
      .image(portraitCenterX, portraitCenterY, PORTRAIT_PLACEHOLDER_KEY)
      .setOrigin(0.5, 0.5);
    this.fitPortraitInCircle(this.portraitImage, portraitSize);
    // Load CEO portrait (restored or first) on-demand and swap in
    const initialPortraitId = CEO_PORTRAITS[this.portraitIndex].id;
    portraitLoader
      .ensureCeoPortrait(this, initialPortraitId)
      .then((key) => {
        if (this.portraitImage) {
          this.portraitImage.setTexture(key);
          this.fitPortraitInCircle(this.portraitImage, this.portraitDiameter);
        }
      })
      .catch(() => {/* leave placeholder */});

    this.portraitMask = this.add.graphics();
    this.portraitMask.fillStyle(0xffffff);
    this.portraitMask.fillCircle(
      portraitCenterX,
      portraitCenterY,
      portraitSize / 2,
    );
    this.portraitMask.setVisible(false);
    this.portraitImage.setMask(this.portraitMask.createGeometryMask());

    // Accent border ring
    this.add
      .circle(portraitCenterX, portraitCenterY, portraitSize / 2 + 2)
      .setStrokeStyle(2, theme.colors.accent)
      .setFillStyle(0x000000, 0);

    // Portrait label (name) below portrait
    this.portraitLabel = new Label(this, {
      x: portraitCenterX,
      y: portraitCenterY + portraitSize / 2 + theme.spacing.sm,
      text: CEO_PORTRAITS[this.portraitIndex].label,
      style: "caption",
      color: theme.colors.accent,
    });
    this.portraitLabel.setOrigin(0.5, 0);

    // Prev/Next buttons below label
    const navY = portraitCenterY + portraitSize / 2 + theme.spacing.sm + 20;
    const navBtnW = 36;
    const navGap = 8;
    new Button(this, {
      x: portraitCenterX - navBtnW - navGap / 2,
      y: navY,
      width: navBtnW,
      height: 28,
      label: "\u25C0",
      onClick: () => {
        this.portraitIndex =
          (this.portraitIndex - 1 + CEO_PORTRAITS.length) %
          CEO_PORTRAITS.length;
        this.updatePortraitPreview();
        this.saveChoice();
      },
    });
    new Button(this, {
      x: portraitCenterX + navGap / 2,
      y: navY,
      width: navBtnW,
      height: 28,
      label: "\u25B6",
      onClick: () => {
        this.portraitIndex = (this.portraitIndex + 1) % CEO_PORTRAITS.length;
        this.updatePortraitPreview();
        this.saveChoice();
      },
    });

    // ── Right column: Configuration fields ──
    const rightX = panelX + portraitAreaW + pad;
    const rightW = panelW - portraitAreaW - pad * 2;
    const labelW = 90;
    const fieldX = rightX + labelW;
    const fieldW = Math.min(200, rightW - labelW);
    const rowH = 44;
    let rowY = contentTop;

    // Company name
    new Label(this, {
      x: rightX,
      y: rowY + 8,
      text: "Company:",
      style: "body",
    });
    this.nameLabel = new Label(this, {
      x: fieldX,
      y: rowY + 8,
      text: PRESET_NAMES[this.nameIndex],
      style: "value",
      color: theme.colors.accent,
    });
    this.nameLabel.setInteractive({ useHandCursor: true });
    this.nameLabel.on("pointerdown", () => {
      this.nameIndex = (this.nameIndex + 1) % PRESET_NAMES.length;
      this.nameLabel.setText(PRESET_NAMES[this.nameIndex]);
      this.saveChoice();
    });

    rowY += rowH;

    // Seed
    new Label(this, { x: rightX, y: rowY + 8, text: "Seed:", style: "body" });
    this.seedLabel = new Label(this, {
      x: fieldX,
      y: rowY + 8,
      text: String(this.seed),
      style: "value",
      color: theme.colors.accent,
    });
    new Button(this, {
      x: fieldX + 120,
      y: rowY + 4,
      autoWidth: true,
      height: 30,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
        this.regenerate();
      },
    });

    rowY += rowH;

    // ── Game Length preset picker ──
    new Label(this, { x: rightX, y: rowY + 6, text: "Length:", style: "body" });

    const presetBtnH = 32;
    const presetBtnCount = PRESET_OPTIONS.length;
    // Fit buttons into the available width to the right of the label
    const totalPresetW = rightW - labelW;
    const presetGap = 6;
    const presetBtnW = Math.floor(
      (totalPresetW - presetGap * (presetBtnCount - 1)) / presetBtnCount,
    );

    PRESET_OPTIONS.forEach(({ preset, label, description }, idx) => {
      const btnX = fieldX + idx * (presetBtnW + presetGap);
      const btn = new Button(this, {
        x: btnX,
        y: rowY + 2,
        width: presetBtnW,
        height: presetBtnH,
        label,
        onClick: () => {
          this.gamePreset = preset;
          this.updatePresetHighlight();
          this.regenerate();
        },
      });
      this.presetButtons.push(btn);

      // Description sub-label below each button
      new Label(this, {
        x: btnX + presetBtnW / 2,
        y: rowY + presetBtnH + 6,
        text: description,
        style: "caption",
        color: theme.colors.textDim,
      }).setOrigin(0.5, 0);
    });

    this.updatePresetHighlight();

    rowY += rowH + 20; // extra space for descriptions

    // Shape dropdown
    new Label(this, { x: rightX, y: rowY + 6, text: "Shape:", style: "body" });
    const shapeOptions: Array<{ label: string; value: GalaxyShape }> = [
      { label: "Spiral", value: "spiral" },
      { label: "Elliptical", value: "elliptical" },
      { label: "Ring", value: "ring" },
      { label: "Irregular", value: "irregular" },
    ];
    const shapeDefaultIndex = Math.max(
      0,
      shapeOptions.findIndex((o) => o.value === this.galaxyShape),
    );
    new Dropdown(this, {
      x: fieldX,
      y: rowY + 2,
      width: fieldW,
      height: 32,
      options: shapeOptions,
      defaultIndex: shapeDefaultIndex,
      onChange: (value) => {
        this.galaxyShape = value as GalaxyShape;
        this.regenerate();
      },
    });

    rowY += rowH + theme.spacing.md;

    // ═══════════════════════════════════════════════════════════════════
    // Bottom area: Starting system cards
    // ═══════════════════════════════════════════════════════════════════
    new Label(this, {
      x: panelX + pad,
      y: rowY,
      text: "Select Starting System:",
      style: "body",
      color: theme.colors.accent,
    });

    this.configX = panelX;
    this.configW = panelW;
    this.cardsTopY = rowY + 28;
    this.cardsBottomY = panelY + panelH - 76;

    this.regenerate();

    // ── Launch button ──
    const launchW = 220;
    new Button(this, {
      x: panelX + (panelW - launchW) / 2,
      y: panelY + panelH - 62,
      width: launchW,
      height: 44,
      label: "Launch",
      onClick: () => {
        const chosenPortrait = CEO_PORTRAITS[this.portraitIndex];
        this.currentState.ceoPortrait = {
          portraitId: chosenPortrait.id,
          category: chosenPortrait.category,
        };
        gameStore.setState(this.currentState);
        // Ensure the chosen CEO portrait is loaded before GameHUDScene starts
        // so the HUD top-bar portrait is ready immediately.
        withLoadingOverlay(
          this,
          portraitLoader.ensureCeoPortrait(this, chosenPortrait.id),
          { label: "Preparing…" },
        )
          .catch(() => {/* portrait missing — HUD will show placeholder */})
          .finally(() => {
            this.scene.start("GameHUDScene");
          });
      },
    });

    // Restart scene on resize so layout recalculates
    const onResize = () => {
      this.scene.restart();
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
  }

  private regenerate(): void {
    const result = createNewGame(
      this.seed,
      PRESET_NAMES[this.nameIndex],
      this.gamePreset,
      this.galaxyShape,
    );
    this.currentState = result.state;
    this.startingOptions = result.startingSystemOptions;
    this.selectedSystemIndex = 0;
    this.buildSystemCards();
    this.saveChoice();
  }

  /** Persist the current user choices in the module-level cache so
   * re-entering Setup doesn't regenerate a fresh seed/preset. */
  private saveChoice(): void {
    lastSetupChoice = {
      seed: this.seed,
      nameIndex: this.nameIndex,
      portraitIndex: this.portraitIndex,
      gamePreset: this.gamePreset,
      galaxyShape: this.galaxyShape,
    };
  }

  /** Highlight the currently-selected preset button */
  private updatePresetHighlight(): void {
    PRESET_OPTIONS.forEach(({ preset }, idx) => {
      const btn = this.presetButtons[idx];
      if (!btn) return;
      btn.setActive(preset === this.gamePreset);
    });
  }

  private updatePortraitPreview(): void {
    const def = CEO_PORTRAITS[this.portraitIndex];

    if (this.portraitLabel) {
      this.portraitLabel.setText(def.label);
    }

    // If already in cache swap immediately; otherwise load on-demand
    const key = getPortraitTextureKey(def.id);
    if (this.portraitImage) {
      if (this.textures.exists(key)) {
        this.portraitImage.setTexture(key);
        if (this.portraitDiameter > 0) {
          this.fitPortraitInCircle(this.portraitImage, this.portraitDiameter);
        }
      } else {
        // Show placeholder while loading
        this.portraitImage.setTexture(PORTRAIT_PLACEHOLDER_KEY);
        portraitLoader
          .ensureCeoPortrait(this, def.id)
          .then((loadedKey) => {
            // Only apply if user hasn't navigated away to a different portrait
            if (
              this.portraitImage &&
              CEO_PORTRAITS[this.portraitIndex]?.id === def.id
            ) {
              this.portraitImage.setTexture(loadedKey);
              if (this.portraitDiameter > 0) {
                this.fitPortraitInCircle(
                  this.portraitImage,
                  this.portraitDiameter,
                );
              }
            }
          })
          .catch(() => {/* leave placeholder */});
      }
    }
  }

  private fitPortraitInCircle(
    image: Phaser.GameObjects.Image,
    diameter: number,
  ): void {
    const srcW = Math.max(1, image.width);
    const srcH = Math.max(1, image.height);
    // Cover fit for circular masks (fills the circle without distortion)
    const scale = Math.max(diameter / srcW, diameter / srcH);
    image.setDisplaySize(srcW * scale, srcH * scale);
  }

  private buildSystemCards(): void {
    // Clean up previous card objects
    for (const obj of this.cardObjects) {
      obj.destroy();
    }
    this.cardObjects = [];
    this.systemCards = [];

    if (this.startingOptions.length === 0) return;

    const theme = getTheme();

    const gap = 16;
    const count = this.startingOptions.length;
    const availW = this.configW - theme.spacing.lg * 2;
    const cardW = Math.min(
      240,
      Math.floor((availW - gap * (count - 1)) / count),
    );
    const totalW = cardW * count + gap * (count - 1);
    const startX = this.configX + (this.configW - totalW) / 2;
    const cardsY = this.cardsTopY;
    const cardH = Math.max(140, this.cardsBottomY - cardsY);
    const planets = this.currentState.galaxy.planets;

    this.startingOptions.forEach((system, index) => {
      const cardX = startX + index * (cardW + gap);
      const systemPlanets = planets.filter((p) => p.systemId === system.id);

      // Card panel with title
      const panel = new Panel(this, {
        x: cardX,
        y: cardsY,
        width: cardW,
        height: cardH,
        title: system.name,
      });
      this.cardObjects.push(panel);
      this.systemCards.push(panel);

      // Planet count
      const infoX = cardX + theme.spacing.md;
      const infoY = cardsY + theme.panel.titleHeight + theme.spacing.md;

      const countLabel = new Label(this, {
        x: infoX,
        y: infoY,
        text: `Planets: ${systemPlanets.length}`,
        style: "body",
      });
      this.cardObjects.push(countLabel);

      // Planet type list
      let listY = infoY + 28;
      const lineH = 18;
      const availH = cardH - (listY - cardsY) - theme.spacing.sm;
      const maxPlanetsShown = Math.floor(availH / lineH);
      const planetsToShow = systemPlanets.slice(0, maxPlanetsShown);
      const nameMaxW = cardW - theme.spacing.md * 2 - theme.spacing.sm;
      for (const planet of planetsToShow) {
        // Truncate long names so they don't word-wrap
        let displayName = `${planet.name} (${planet.type})`;
        const approxCharW = 6.5; // caption font ~6.5px per char
        const maxChars = Math.floor(nameMaxW / approxCharW);
        if (displayName.length > maxChars) {
          displayName = displayName.slice(0, maxChars - 1) + "\u2026";
        }
        const pLabel = new Label(this, {
          x: infoX + theme.spacing.sm,
          y: listY,
          text: displayName,
          style: "caption",
        });
        this.cardObjects.push(pLabel);
        listY += lineH;
      }
      if (systemPlanets.length > maxPlanetsShown) {
        const moreLabel = new Label(this, {
          x: infoX + theme.spacing.sm,
          y: listY,
          text: `+${systemPlanets.length - maxPlanetsShown} more...`,
          style: "caption",
          color: theme.colors.textDim,
        });
        this.cardObjects.push(moreLabel);
      }

      // Transparent clickable overlay
      const hitRect = this.add
        .rectangle(
          cardX + cardW / 2,
          cardsY + cardH / 2,
          cardW,
          cardH,
          0x000000,
          0,
        )
        .setInteractive({ useHandCursor: true });

      hitRect.on("pointerover", () => {
        if (this.selectedSystemIndex !== index) {
          panel.setAlpha(0.9);
        }
      });
      hitRect.on("pointerout", () => {
        panel.setAlpha(1);
      });
      hitRect.on("pointerdown", () => {
        this.selectedSystemIndex = index;
        this.updateSelectionHighlight();
      });
      this.cardObjects.push(hitRect);
    });

    this.updateSelectionHighlight();
  }

  private updateSelectionHighlight(): void {
    // Use panel.setActive for selection highlight instead of manual graphics
    this.systemCards.forEach((panel, index) => {
      panel.setActive(index === this.selectedSystemIndex);
    });
  }
}
