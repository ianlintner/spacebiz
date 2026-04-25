import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Panel,
  Button,
  Label,
  ProgressBar,
  getLayout,
} from "../ui/index.ts";
import { resolveChoiceEvent } from "../game/events/ChoiceEventResolver.ts";
import { tagLabel } from "../game/events/SuccessFormula.ts";
import type {
  ChoiceEvent,
  ChoiceOption,
  DilemmaCategory,
  EventEffect,
} from "../data/types.ts";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 820;
const HEADER_HEIGHT = 56;
const PADDING = 18;

const BANNER_W = 480;
const BANNER_H = 180;
const BANNER_GAP = 14;

const PROMPT_HEIGHT = 78;
const OPTION_HEIGHT = 116;
const OPTION_GAP = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickPendingDilemma(): ChoiceEvent | null {
  const state = gameStore.getState();
  return (
    state.pendingChoiceEvents.find((e) => e.dilemmaId !== undefined) ?? null
  );
}

function successColor(
  success: number,
  theme: ReturnType<typeof getTheme>,
): number {
  if (success >= 70) return theme.colors.profit;
  if (success >= 40) return theme.colors.accent;
  return theme.colors.warning;
}

/**
 * Per-category accent colour for the panel header bar and banner frame —
 * borrows the existing theme palette so the dilemma modal stays cohesive.
 */
function categoryColor(
  category: DilemmaCategory | undefined,
  theme: ReturnType<typeof getTheme>,
): number {
  switch (category) {
    case "operational":
      return theme.colors.warning; // amber/orange
    case "diplomatic":
      return theme.colors.accent; // blue/cyan
    case "financial":
      return theme.colors.profit; // green/gold
    case "narrative":
      return theme.colors.accentHover; // purple-ish accent
    case "opportunity":
      return theme.colors.profit;
    default:
      return theme.colors.accent;
  }
}

/**
 * Format an EventEffect into a short chip label + colour. Returns null if
 * the effect doesn't have a meaningful summary at this UI level.
 */
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
      // Categorical diplomacy effects (declareWar, etc.) — show the type name
      return {
        label: effect.type.replace(/([A-Z])/g, " $1").trim().toLowerCase(),
        color: theme.colors.textDim,
      };
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/**
 * Modal-style overlay that presents a dilemma to the player.
 *
 * Layout (Paradox / Total War-inspired):
 *   ┌── header (category accent) ──┐
 *   │  banner illustration         │
 *   │  prompt text                 │
 *   │  option cards w/ chips + %   │
 *   └──────────────────────────────┘
 *
 * Per design: every option succeeds — the success% scales the magnitude of
 * the option's effects rather than gating pass/fail. Players see the success%
 * up front (frozen at fire-time) so they can make an informed choice.
 */
export class DilemmaScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private widgets: Phaser.GameObjects.GameObject[] = [];
  private currentEventId: string | null = null;

  constructor() {
    super({ key: "DilemmaScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();

    this.overlay = this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, theme.colors.modalOverlay, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    this.overlay.setDepth(0);

    this.renderCurrentDilemma();
  }

  private clearWidgets(): void {
    for (const w of this.widgets) {
      w.destroy();
    }
    this.widgets = [];
  }

  private renderCurrentDilemma(): void {
    this.clearWidgets();

    const event = pickPendingDilemma();
    if (!event) {
      this.scene.stop();
      return;
    }
    this.currentEventId = event.id;

    const theme = getTheme();
    const L = getLayout();
    const category = event.category;
    const accent = categoryColor(category, theme);

    const optionsHeight =
      event.options.length * OPTION_HEIGHT +
      Math.max(0, event.options.length - 1) * OPTION_GAP;
    const totalHeight =
      HEADER_HEIGHT +
      PADDING +
      BANNER_H +
      BANNER_GAP +
      PROMPT_HEIGHT +
      PADDING +
      optionsHeight +
      PADDING;

    const x = (L.gameWidth - PANEL_WIDTH) / 2;
    const y = Math.max(24, (L.gameHeight - totalHeight) / 2);

    const panel = new Panel(this, {
      x,
      y,
      width: PANEL_WIDTH,
      height: totalHeight,
      title: category ? `Dilemma — ${capitalize(category)}` : "Dilemma",
    });
    panel.setDepth(10);
    this.widgets.push(panel);

    // Category accent line just below the header bar
    const accentLine = this.add
      .rectangle(
        x,
        y + HEADER_HEIGHT - 2,
        PANEL_WIDTH,
        2,
        accent,
      )
      .setOrigin(0, 0)
      .setDepth(11);
    this.widgets.push(accentLine);

    // ── Banner illustration ────────────────────────────────────────────────
    const bannerY = y + HEADER_HEIGHT + PADDING;
    const bannerX = x + (PANEL_WIDTH - BANNER_W) / 2;
    this.renderBanner(event, bannerX, bannerY, accent);

    // ── Prompt text ────────────────────────────────────────────────────────
    const promptY = bannerY + BANNER_H + BANNER_GAP;
    const promptLabel = new Label(this, {
      x: x + PADDING,
      y: promptY,
      text: event.prompt,
      style: "body",
      maxWidth: PANEL_WIDTH - PADDING * 2,
    });
    promptLabel.setDepth(12);
    this.widgets.push(promptLabel);

    // ── Option cards ───────────────────────────────────────────────────────
    let cursorY = promptY + PROMPT_HEIGHT + PADDING;
    for (const option of event.options) {
      this.renderOption(option, event, x + PADDING, cursorY);
      cursorY += OPTION_HEIGHT + OPTION_GAP;
    }
  }

  private renderBanner(
    event: ChoiceEvent,
    x: number,
    y: number,
    accent: number,
  ): void {
    const theme = getTheme();

    // Frame around the banner (drawn first, behind the image)
    const frame = this.add
      .rectangle(x - 2, y - 2, BANNER_W + 4, BANNER_H + 4, accent)
      .setOrigin(0, 0)
      .setAlpha(0.9)
      .setDepth(11);
    this.widgets.push(frame);

    if (event.imageKey && this.textures.exists(event.imageKey)) {
      const img = this.add
        .image(x + BANNER_W / 2, y + BANNER_H / 2, event.imageKey)
        .setDisplaySize(BANNER_W, BANNER_H)
        .setDepth(12);
      this.widgets.push(img);
    } else {
      // Placeholder — category-tinted box with subtle text
      const ph = this.add
        .rectangle(x, y, BANNER_W, BANNER_H, theme.colors.headerBg)
        .setOrigin(0, 0)
        .setDepth(12);
      this.widgets.push(ph);
      const phText = this.add.text(
        x + BANNER_W / 2,
        y + BANNER_H / 2,
        event.category ? capitalize(event.category) : "Dilemma",
        {
          fontSize: `${theme.fonts.heading.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      phText.setOrigin(0.5, 0.5).setDepth(13);
      this.widgets.push(phText);
    }
  }

  private renderOption(
    option: ChoiceOption,
    event: ChoiceEvent,
    x: number,
    y: number,
  ): void {
    const theme = getTheme();
    const optionWidth = PANEL_WIDTH - PADDING * 2;
    const success = event.optionSuccess?.[option.id] ?? 100;

    const card = this.add.container(x, y);
    card.setDepth(12);
    this.widgets.push(card);

    // Card background
    const bg = this.add
      .rectangle(0, 0, optionWidth, OPTION_HEIGHT, theme.colors.panelBg, 0.55)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder);
    card.add(bg);

    // ── Right-side: success% column ────────────────────────────────────────
    const colWidth = 110;
    const colX = optionWidth - colWidth - 12;
    const colY = 8;

    const successPct = this.add.text(
      colX + colWidth / 2,
      colY,
      `${success}%`,
      {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(successColor(success, theme)),
      },
    );
    successPct.setOrigin(0.5, 0);
    card.add(successPct);

    const bar = new ProgressBar(this, {
      x: colX,
      y: colY + 28,
      width: colWidth,
      height: 8,
      value: success,
      maxValue: 100,
      fillColor: successColor(success, theme),
    });
    card.add(bar);

    const successHint = this.add.text(
      colX + colWidth / 2,
      colY + 42,
      "outcome strength",
      {
        fontSize: `${theme.fonts.caption.size - 1}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
      },
    );
    successHint.setOrigin(0.5, 0);
    card.add(successHint);

    const choose = new Button(this, {
      x: colX,
      y: OPTION_HEIGHT - 30,
      width: colWidth,
      height: 26,
      label: "Choose",
      onClick: () => this.handleChoose(option),
    });
    card.add(choose);

    // ── Left side: label + description + chips ─────────────────────────────
    const leftPad = 12;
    const leftWidth = optionWidth - colWidth - 32;

    const labelText = this.add.text(leftPad, 8, option.label, {
      fontSize: `${theme.fonts.heading.size - 2}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
      wordWrap: { width: leftWidth },
    });
    card.add(labelText);

    if (option.outcomeDescription) {
      const desc = this.add.text(leftPad, 32, option.outcomeDescription, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
        wordWrap: { width: leftWidth },
      });
      card.add(desc);
    }

    // Chip row(s) — effect chips first (visible mechanical impact), then
    // scaling tag chips (what makes the % go up).
    let chipY = OPTION_HEIGHT - 26;
    let chipX = leftPad;

    for (const eff of option.effects) {
      const chipInfo = effectChip(eff, theme);
      if (!chipInfo) continue;
      const chip = this.add.text(chipX, chipY, chipInfo.label, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(chipInfo.color),
        backgroundColor: colorToString(theme.colors.headerBg),
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      });
      card.add(chip);
      chipX += chip.width + 6;
    }

    const tags = option.scalingTags ?? [];
    for (const tag of tags) {
      const chipText = `⚑ ${tagLabel(tag)}`;
      const chip = this.add.text(chipX, chipY, chipText, {
        fontSize: `${theme.fonts.caption.size - 1}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accentHover),
        backgroundColor: colorToString(theme.colors.headerBg),
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      });
      card.add(chip);
      chipX += chip.width + 6;
    }
  }

  private handleChoose(option: ChoiceOption): void {
    if (!this.currentEventId) return;
    try {
      const nextState = resolveChoiceEvent(
        gameStore.getState(),
        this.currentEventId,
        option.id,
      );
      gameStore.setState(nextState);
    } catch (err) {
      console.warn("DilemmaScene: failed to resolve choice", err);
    }
    // If there's another pending dilemma, render it; otherwise close.
    const next = pickPendingDilemma();
    if (next) {
      this.renderCurrentDilemma();
    } else {
      this.scene.stop();
    }
  }
}
