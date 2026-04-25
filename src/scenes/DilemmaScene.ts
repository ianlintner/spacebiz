import Phaser from "phaser";
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
import type { ChoiceEvent, ChoiceOption } from "../data/types.ts";

const PANEL_WIDTH = 760;
const OPTION_HEIGHT = 110;
const OPTION_GAP = 12;
const PROMPT_HEIGHT = 110;
const HEADER_HEIGHT = 56;
const PADDING = 18;

function pickPendingDilemma(): ChoiceEvent | null {
  const state = gameStore.getState();
  return (
    state.pendingChoiceEvents.find((e) => e.dilemmaId !== undefined) ?? null
  );
}

function successColor(success: number, theme: ReturnType<typeof getTheme>): number {
  if (success >= 70) return theme.colors.profit;
  if (success >= 40) return theme.colors.accent;
  return theme.colors.warning;
}

/**
 * Modal-style overlay that presents a dilemma to the player.
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

    const L = getLayout();

    const optionsHeight =
      event.options.length * OPTION_HEIGHT +
      Math.max(0, event.options.length - 1) * OPTION_GAP;
    const totalHeight =
      HEADER_HEIGHT + PROMPT_HEIGHT + optionsHeight + PADDING * 3;

    const x = (L.gameWidth - PANEL_WIDTH) / 2;
    const y = Math.max(40, (L.gameHeight - totalHeight) / 2);

    const panel = new Panel(this, {
      x,
      y,
      width: PANEL_WIDTH,
      height: totalHeight,
      title: event.category
        ? `Dilemma — ${capitalize(event.category)}`
        : "Dilemma",
    });
    panel.setDepth(10);
    this.widgets.push(panel);

    const promptLabel = new Label(this, {
      x: x + PADDING,
      y: y + HEADER_HEIGHT + PADDING,
      text: event.prompt,
      style: "body",
      maxWidth: PANEL_WIDTH - PADDING * 2,
    });
    promptLabel.setDepth(11);
    this.widgets.push(promptLabel);

    let cursorY = y + HEADER_HEIGHT + PROMPT_HEIGHT + PADDING;
    for (const option of event.options) {
      this.renderOption(option, event, x + PADDING, cursorY);
      cursorY += OPTION_HEIGHT + OPTION_GAP;
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
    card.setDepth(11);
    this.widgets.push(card);

    const bg = this.add
      .rectangle(0, 0, optionWidth, OPTION_HEIGHT, theme.colors.panelBg, 0.55)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder);
    card.add(bg);

    const labelText = this.add.text(12, 10, option.label, {
      fontSize: `${theme.fonts.heading.size - 2}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
      wordWrap: { width: optionWidth - 24 - 110 },
    });
    card.add(labelText);

    if (option.outcomeDescription) {
      const desc = this.add.text(12, 36, option.outcomeDescription, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
        wordWrap: { width: optionWidth - 24 - 110 },
      });
      card.add(desc);
    }

    // Scaling tag chips along the bottom
    const tags = option.scalingTags ?? [];
    if (tags.length > 0) {
      let chipX = 12;
      for (const tag of tags) {
        const chipText = tagLabel(tag);
        const chip = this.add.text(chipX, OPTION_HEIGHT - 22, chipText, {
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

    // Success% bar on the right side
    const barWidth = 90;
    const barX = optionWidth - barWidth - 14;
    const successPct = this.add.text(barX + barWidth / 2, 12, `${success}%`, {
      fontSize: `${theme.fonts.heading.size - 2}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(successColor(success, theme)),
    });
    successPct.setOrigin(0.5, 0);
    card.add(successPct);

    const bar = new ProgressBar(this, {
      x: barX,
      y: 38,
      width: barWidth,
      height: 8,
      value: success,
      maxValue: 100,
      fillColor: successColor(success, theme),
    });
    card.add(bar);

    const successHint = this.add.text(
      barX + barWidth / 2,
      52,
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
      x: barX,
      y: OPTION_HEIGHT - 22,
      width: barWidth,
      height: 26,
      label: "Choose",
      onClick: () => this.handleChoose(option),
    });
    card.add(choose);
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

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
