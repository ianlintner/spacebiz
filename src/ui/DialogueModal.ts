import * as Phaser from "phaser";
import {
  Panel,
  Button,
  ProgressBar,
  DEPTH_MODAL,
  getTheme,
  getLayout,
  colorToString,
} from "@spacebiz/ui";
import type { SceneUiDirector, SceneUiLayer } from "@spacebiz/ui";
import {
  portraitLoader,
  PORTRAIT_PLACEHOLDER_KEY,
} from "../game/PortraitLoader.ts";
import {
  speakerDisplayName,
  speakerDisplayTitle,
  speakerAccentColor,
} from "../game/dialogue/SpeakerDefinitions.ts";
import { tagLabel } from "../game/events/SuccessFormula.ts";
import { classifyOutcome } from "../game/dialogue/outcomeTier.ts";
import type {
  ChoiceEvent,
  ChoiceOption,
  DialogueRequest,
  DialogueVariant,
  DilemmaCategory,
  EventEffect,
  OutcomeTier,
  SpeakerRef,
} from "../data/types.ts";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type DialogueResult =
  | { kind: "continue" }
  | {
      kind: "choice";
      choiceEventId: string;
      optionId: string;
      option: ChoiceOption;
      successPercent: number | null;
    };

export interface OpenDialogueOptions {
  /**
   * The ChoiceEvent to render in the choice stage. REQUIRED when
   * `request.choiceEventId` is set.
   */
  choiceEvent?: ChoiceEvent;
  /**
   * Hook to fire on open — orchestrator can play a per-variant SFX here.
   * The modal does not play SFX itself; it lets the caller decide what to
   * trigger and when.
   */
  onOpen?: () => void;
}

/**
 * Open a dialogue modal for the given request. Resolves when the player
 * dismisses (Continue) or makes a choice. The orchestrator drives the
 * intro→choice→result beat by chaining requests; this modal renders ONE
 * frame.
 */
export function openDialogueModal(
  scene: Phaser.Scene,
  ui: SceneUiDirector,
  request: DialogueRequest,
  options: OpenDialogueOptions = {},
): Promise<DialogueResult> {
  return new Promise<DialogueResult>((resolve) => {
    const layer = ui.openLayer({ key: "dialogue" });
    const theme = getTheme();
    layer.createOverlay({
      alpha: 0,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: false,
      activationDelayMs: 300,
    });
    new DialogueModalRenderer(scene, layer, request, options, resolve);
    options.onOpen?.();
  });
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const STANDARD_W = 720;
const NEWS_W = 720;
const ALERT_W = 640;
const MEMO_W = 680;

const HEADER_H = 44;
const PADDING = 16;
const PORTRAIT_SIZE = 144;
const OPTION_H = 88;
const OPTION_GAP = 8;
const BUTTON_H = 32;
const FOOTER_GAP = 12;

// ---------------------------------------------------------------------------
// Variant styling
// ---------------------------------------------------------------------------

interface HeaderStyle {
  bg: number;
  textColor: number;
  font: "monospace" | "heading";
  showLive: boolean;
  showAlertIcon: boolean;
  /** Override modal width. */
  width: number;
  /** Default title prefix when request.title is absent. */
  defaultTitle: string;
}

function variantStyle(
  variant: DialogueVariant,
  accent: number,
  theme: ReturnType<typeof getTheme>,
): HeaderStyle {
  switch (variant) {
    case "news":
      return {
        bg: accent,
        textColor: theme.colors.background,
        font: "monospace",
        showLive: true,
        showAlertIcon: false,
        width: NEWS_W,
        defaultTitle: "GALACTIC NEWS NETWORK",
      };
    case "alert":
      return {
        bg: theme.colors.loss,
        textColor: theme.colors.background,
        font: "monospace",
        showLive: false,
        showAlertIcon: true,
        width: ALERT_W,
        defaultTitle: "PRIORITY ALERT",
      };
    case "memo":
      return {
        bg: theme.colors.headerBg,
        textColor: theme.colors.textDim,
        font: "monospace",
        showLive: false,
        showAlertIcon: false,
        width: MEMO_W,
        defaultTitle: "INTERNAL MEMORANDUM",
      };
    case "standard":
    default:
      return {
        bg: theme.colors.headerBg,
        textColor: theme.colors.text,
        font: "heading",
        showLive: false,
        showAlertIcon: false,
        width: STANDARD_W,
        defaultTitle: "DIRECT TRANSMISSION",
      };
  }
}

// ---------------------------------------------------------------------------
// Effect chips (lifted from DilemmaScene)
// ---------------------------------------------------------------------------

function effectChip(
  effect: EventEffect,
  theme: ReturnType<typeof getTheme>,
): { label: string; color: number } | null {
  switch (effect.type) {
    case "modifyCash": {
      const sign = effect.value >= 0 ? "+" : "−";
      const abs = Math.abs(Math.round(effect.value)).toLocaleString();
      return {
        label: `${sign}§${abs}`,
        color: effect.value >= 0 ? theme.colors.profit : theme.colors.loss,
      };
    }
    case "modifyReputation": {
      const sign = effect.value >= 0 ? "+" : "−";
      return {
        label: `${sign}${Math.abs(Math.round(effect.value))} rep`,
        color: effect.value >= 0 ? theme.colors.profit : theme.colors.loss,
      };
    }
    case "modifyPrice":
    case "modifyDemand": {
      const pct = Math.round(effect.value * 100);
      const sign = pct >= 0 ? "+" : "−";
      return {
        label: `${sign}${Math.abs(pct)}% ${effect.type === "modifyPrice" ? "price" : "demand"}`,
        color: pct >= 0 ? theme.colors.profit : theme.colors.loss,
      };
    }
    case "modifySpeed": {
      const pct = Math.round(effect.value * 100);
      return {
        label: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% speed`,
        color: pct >= 0 ? theme.colors.profit : theme.colors.loss,
      };
    }
    case "modifyTariff": {
      const pct = Math.round(effect.value * 100);
      return {
        label: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% tariff`,
        color: pct >= 0 ? theme.colors.loss : theme.colors.profit,
      };
    }
    default:
      return {
        label: effect.type
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toLowerCase(),
        color: theme.colors.textDim,
      };
  }
}

function successColor(
  success: number,
  theme: ReturnType<typeof getTheme>,
): number {
  if (success >= 70) return theme.colors.profit;
  if (success >= 40) return theme.colors.accent;
  return theme.colors.warning;
}

function outcomeTierColor(
  tier: OutcomeTier | undefined,
  theme: ReturnType<typeof getTheme>,
  fallback: number,
): number {
  switch (tier) {
    case "positive":
      return theme.colors.profit;
    case "negative":
      return theme.colors.loss;
    case "neutral":
      return theme.colors.accent;
    default:
      return fallback;
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

class DialogueModalRenderer {
  private readonly scene: Phaser.Scene;
  private readonly layer: SceneUiLayer;
  private readonly request: DialogueRequest;
  private readonly options: OpenDialogueOptions;
  private readonly resolveFn: (result: DialogueResult) => void;

  private portraitImage?: Phaser.GameObjects.Image;
  private bodyText?: Phaser.GameObjects.Text;
  private fullBodyText = "";
  private bodyCharIndex = 0;
  private typewriterEvent: Phaser.Time.TimerEvent | null = null;
  private typewriterDone = false;
  private revealables: Phaser.GameObjects.GameObject[] = [];
  private resolved = false;

  constructor(
    scene: Phaser.Scene,
    layer: SceneUiLayer,
    request: DialogueRequest,
    options: OpenDialogueOptions,
    resolveFn: (result: DialogueResult) => void,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.request = request;
    this.options = options;
    this.resolveFn = resolveFn;
    this.build();
    this.layer.onDestroy(() => {
      this.typewriterEvent?.remove(false);
      this.typewriterEvent = null;
      if (!this.resolved) {
        // Layer was destroyed externally (scene shutdown) — resolve with a
        // sentinel so awaiting callers don't hang forever.
        this.resolved = true;
        this.resolveFn({ kind: "continue" });
      }
    });
  }

  private resolveAndClose(result: DialogueResult): void {
    if (this.resolved) return;
    this.resolved = true;
    this.resolveFn(result);
    this.layer.destroy();
  }

  private build(): void {
    const theme = getTheme();
    const L = getLayout();
    const accent =
      this.request.accentColor ?? speakerAccentColor(this.request.speaker);
    const style = variantStyle(this.request.variant, accent, theme);

    // Compute body height based on whether option cards are present
    const choiceEvent = this.options.choiceEvent;
    const showChoices =
      this.request.choiceEventId !== undefined && choiceEvent !== undefined;
    const optionsCount = showChoices ? choiceEvent.options.length : 0;

    const bodyAreaH = showChoices
      ? optionsCount * OPTION_H +
        Math.max(0, optionsCount - 1) * OPTION_GAP +
        40
      : 120;
    const portraitColH = PORTRAIT_SIZE + 64; // portrait + name/title block
    const innerH = Math.max(bodyAreaH, portraitColH);
    const panelH =
      HEADER_H + PADDING + innerH + PADDING + BUTTON_H + FOOTER_GAP;
    const panelW = style.width;

    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = Math.max(24, Math.floor((L.gameHeight - panelH) / 2));

    // ── Panel ────────────────────────────────────────────────────────────
    const panel = new Panel(this.scene, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
    });
    panel.setDepth(DEPTH_MODAL);
    this.layer.track(panel);

    // ── Header bar ───────────────────────────────────────────────────────
    const header = this.scene.add
      .rectangle(panelX, panelY, panelW, HEADER_H, style.bg, 0.92)
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 1);
    this.layer.track(header);

    const fontFamily =
      style.font === "monospace" ? "monospace" : theme.fonts.heading.family;
    const headerText = this.request.title ?? style.defaultTitle;
    const headerLabel = this.scene.add
      .text(panelX + PADDING, panelY + HEADER_H / 2, headerText.toUpperCase(), {
        fontSize: "13px",
        fontFamily,
        color: colorToString(style.textColor),
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(headerLabel);

    if (style.showLive) {
      const live = this.scene.add
        .text(panelX + panelW - PADDING, panelY + HEADER_H / 2, "◉ LIVE", {
          fontSize: "11px",
          fontFamily: "monospace",
          color: colorToString(style.textColor),
        })
        .setOrigin(1, 0.5)
        .setDepth(DEPTH_MODAL + 2);
      this.layer.track(live);
      this.scene.tweens.add({
        targets: live,
        alpha: { from: 1, to: 0.4 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }

    if (style.showAlertIcon) {
      const dot = this.scene.add
        .circle(
          panelX + panelW - PADDING - 6,
          panelY + HEADER_H / 2,
          6,
          0xffffff,
        )
        .setDepth(DEPTH_MODAL + 2);
      this.layer.track(dot);
      this.scene.tweens.add({
        targets: dot,
        alpha: { from: 1, to: 0.2 },
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
    }

    // Accent stripe just below header
    const accentLine = this.scene.add
      .rectangle(panelX, panelY + HEADER_H, panelW, 2, accent, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(accentLine);

    // ── Portrait column ──────────────────────────────────────────────────
    const innerY = panelY + HEADER_H + PADDING;
    const portraitX = panelX + PADDING;

    const portraitBg = this.scene.add
      .rectangle(
        portraitX,
        innerY,
        PORTRAIT_SIZE,
        PORTRAIT_SIZE,
        0x000000,
        0.55,
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 1);
    this.layer.track(portraitBg);

    this.portraitImage = this.scene.add
      .image(
        portraitX + PORTRAIT_SIZE / 2,
        innerY + PORTRAIT_SIZE / 2,
        PORTRAIT_PLACEHOLDER_KEY,
      )
      .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(this.portraitImage);

    const portraitFrame = this.scene.add
      .rectangle(portraitX, innerY, PORTRAIT_SIZE, PORTRAIT_SIZE)
      .setOrigin(0, 0)
      .setStrokeStyle(2, accent)
      .setFillStyle(0x000000, 0)
      .setDepth(DEPTH_MODAL + 3);
    this.layer.track(portraitFrame);

    const nameLabel = this.scene.add
      .text(
        portraitX,
        innerY + PORTRAIT_SIZE + 6,
        speakerDisplayName(this.request.speaker),
        {
          fontSize: "13px",
          fontFamily,
          color: colorToString(accent),
          fontStyle: "bold",
          wordWrap: { width: PORTRAIT_SIZE },
        },
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(nameLabel);

    const titleLabel = this.scene.add
      .text(
        portraitX,
        innerY + PORTRAIT_SIZE + 24,
        speakerDisplayTitle(this.request.speaker),
        {
          fontSize: "11px",
          fontFamily: "monospace",
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: PORTRAIT_SIZE },
        },
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(titleLabel);

    this.loadPortrait();

    // ── Body column ──────────────────────────────────────────────────────
    const bodyX = portraitX + PORTRAIT_SIZE + PADDING;
    const bodyW = panelW - bodyX + panelX - PADDING;
    const bodyY = innerY;

    // Result body has outcome-tier color flash on the body text
    const bodyTextColor = this.request.resultText
      ? outcomeTierColor(this.request.outcomeTier, theme, theme.colors.text)
      : theme.colors.text;

    this.fullBodyText = this.request.resultText ?? this.request.introText;
    this.bodyCharIndex = 0;
    this.bodyText = this.scene.add
      .text(bodyX, bodyY, "", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(bodyTextColor),
        wordWrap: { width: bodyW, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(this.bodyText);

    // Click anywhere on body area to skip typewriter
    const skipZone = this.scene.add
      .rectangle(bodyX, bodyY, bodyW, innerH, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 4)
      .setInteractive({ useHandCursor: false });
    skipZone.on("pointerdown", () => this.skipTypewriter());
    this.layer.track(skipZone);

    // ── Reveal targets: option cards OR Continue button ──────────────────
    if (showChoices) {
      // Render option cards directly under the body text
      const optionsY = bodyY + 80;
      this.renderOptionCards(choiceEvent, bodyX, optionsY, bodyW);
    } else {
      const continueBtn = new Button(this.scene, {
        x: panelX + panelW - PADDING - 130,
        y: panelY + panelH - PADDING - BUTTON_H,
        width: 130,
        height: BUTTON_H,
        label: "Continue  ▶",
        onClick: () => this.resolveAndClose({ kind: "continue" }),
      });
      continueBtn.setDepth(DEPTH_MODAL + 3);
      continueBtn.setVisible(false);
      this.layer.track(continueBtn);
      this.revealables.push(continueBtn);
    }

    // ESC closes flavor (non-required) items immediately, but blocks required.
    this.scene.input.keyboard?.once("keydown-ESC", () => {
      if (this.request.priority === "flavor") {
        this.resolveAndClose({ kind: "continue" });
      }
    });

    this.startTypewriter();
  }

  private renderOptionCards(
    event: ChoiceEvent,
    x: number,
    startY: number,
    width: number,
  ): void {
    const theme = getTheme();
    let cursorY = startY;
    for (const option of event.options) {
      const card = this.renderOption(option, event, x, cursorY, width, theme);
      card.setDepth(DEPTH_MODAL + 2);
      card.setVisible(false);
      this.layer.track(card);
      this.revealables.push(card);
      cursorY += OPTION_H + OPTION_GAP;
    }
  }

  private renderOption(
    option: ChoiceOption,
    event: ChoiceEvent,
    x: number,
    y: number,
    width: number,
    theme: ReturnType<typeof getTheme>,
  ): Phaser.GameObjects.Container {
    const success = event.optionSuccess?.[option.id] ?? 100;
    const card = this.scene.add.container(x, y);

    const bg = this.scene.add
      .rectangle(0, 0, width, OPTION_H, theme.colors.panelBg, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder);
    card.add(bg);

    const colWidth = 110;
    const colX = width - colWidth - 12;
    const colY = 8;

    const successPct = this.scene.add
      .text(colX + colWidth / 2, colY, `${success}%`, {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(successColor(success, theme)),
      })
      .setOrigin(0.5, 0);
    card.add(successPct);

    const bar = new ProgressBar(this.scene, {
      x: colX,
      y: colY + 28,
      width: colWidth,
      height: 6,
      value: success,
      maxValue: 100,
      fillColor: successColor(success, theme),
      showLabel: false,
    });
    card.add(bar);

    const chooseBtn = new Button(this.scene, {
      x: colX,
      y: OPTION_H - 30,
      width: colWidth,
      height: 26,
      label: "Choose",
      onClick: () => this.handleChoose(event, option, success),
    });
    card.add(chooseBtn);

    // Left side — label + chips
    const leftPad = 12;
    const leftWidth = width - colWidth - 32;

    const labelText = this.scene.add.text(leftPad, 8, option.label, {
      fontSize: `${theme.fonts.heading.size - 2}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
      wordWrap: { width: leftWidth },
    });
    card.add(labelText);

    if (option.outcomeDescription) {
      const desc = this.scene.add.text(leftPad, 32, option.outcomeDescription, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
        wordWrap: { width: leftWidth },
      });
      card.add(desc);
    }

    // Chip row
    let chipY = OPTION_H - 26;
    let chipX = leftPad;

    for (const eff of option.effects) {
      const chipInfo = effectChip(eff, theme);
      if (!chipInfo) continue;
      const chip = this.scene.add.text(chipX, chipY, chipInfo.label, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(chipInfo.color),
        backgroundColor: colorToString(theme.colors.headerBg),
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      });
      card.add(chip);
      chipX += chip.width + 6;
    }

    for (const tag of option.scalingTags ?? []) {
      const chipText = `⚑ ${tagLabel(tag)}`;
      const chip = this.scene.add.text(chipX, chipY, chipText, {
        fontSize: `${theme.fonts.caption.size - 1}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accentHover),
        backgroundColor: colorToString(theme.colors.headerBg),
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      });
      card.add(chip);
      chipX += chip.width + 6;
    }

    return card;
  }

  private handleChoose(
    event: ChoiceEvent,
    option: ChoiceOption,
    successPercent: number,
  ): void {
    this.resolveAndClose({
      kind: "choice",
      choiceEventId: event.id,
      optionId: option.id,
      option,
      successPercent: event.optionSuccess ? successPercent : null,
    });
  }

  private startTypewriter(): void {
    if (!this.bodyText) return;
    const text = this.fullBodyText;
    if (text.length === 0) {
      this.revealAfterTypewriter();
      return;
    }
    this.typewriterEvent = this.scene.time.addEvent({
      delay: 20,
      repeat: text.length - 1,
      callback: () => {
        this.bodyCharIndex++;
        this.bodyText?.setText(text.slice(0, this.bodyCharIndex));
        if (this.bodyCharIndex >= text.length) {
          this.revealAfterTypewriter();
        }
      },
    });
  }

  private skipTypewriter(): void {
    if (this.typewriterDone) return;
    this.typewriterEvent?.remove(false);
    this.typewriterEvent = null;
    this.bodyText?.setText(this.fullBodyText);
    this.revealAfterTypewriter();
  }

  private revealAfterTypewriter(): void {
    this.typewriterDone = true;
    for (const obj of this.revealables) {
      if ("setVisible" in obj) {
        (obj as { setVisible(v: boolean): void }).setVisible(true);
      }
    }
  }

  private loadPortrait(): void {
    if (!this.portraitImage) return;
    const speaker: SpeakerRef = this.request.speaker;

    const setIfActive = (key: string) => {
      if (!this.portraitImage?.active) return;
      this.portraitImage
        .setTexture(key)
        .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
    };

    const promise =
      speaker.pool === "newscaster"
        ? portraitLoader.ensureNewscasterPortrait(
            this.scene,
            speaker.archetypeId,
          )
        : portraitLoader.ensureAdviserPortrait(
            this.scene,
            speaker.archetypeId,
            speaker.mood,
          );

    promise.then(setIfActive).catch(() => {
      // Placeholder stays on failure.
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers for orchestrators
// ---------------------------------------------------------------------------

/**
 * Build a SFX key for opening a dialogue of the given variant.
 */
export function openSfxKeyForVariant(variant: DialogueVariant): string {
  return `dialogue_open_${variant}`;
}

/**
 * Build a SFX key for a result of the given outcome tier + category. Returns
 * null for the neutral tier — callers should fall back to the synthesized
 * `ui_confirm` for neutral outcomes.
 */
export function resultSfxKey(
  tier: OutcomeTier,
  category: DilemmaCategory | undefined,
): string | null {
  if (tier === "neutral") return null;
  const cat = category ?? "narrative";
  return `result_${tier}_${cat}`;
}

/**
 * Re-export classifyOutcome so orchestrators can map success% → tier without
 * importing two paths.
 */
export { classifyOutcome };
