import * as Phaser from "phaser";
import {
  getTheme,
  setTheme,
  colorToString,
  GAME_WIDTH,
  GAME_HEIGHT,
  Label,
  Dropdown,
} from "@spacebiz/ui";
import type { ThemeConfig } from "@spacebiz/ui";
import { darkTheme, lightTheme, highContrastTheme } from "../themes.ts";
import {
  styleguideSections,
  groupByCategory,
  type StyleguideSection,
} from "../registry.ts";
import {
  buildDefaultKnobValues,
  renderKnobs,
  type KnobValue,
  type KnobValues,
} from "../knobs/index.ts";

/* ── Layout constants for the styleguide chrome ──────────────────── */
const TOP_BAR_HEIGHT = 56;
const SIDE_PANEL_WIDTH = 200;
const KNOBS_PANEL_WIDTH = 280;
const PANEL_PADDING = 12;

/**
 * Registry-driven styleguide scene.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ top bar — title + theme switcher                     │
 *   ├──────────┬──────────────────────────────┬────────────┤
 *   │ sections │ active section content       │ knobs      │
 *   │ side nav │ (re-rendered on knob/theme   │ (DOM       │
 *   │          │  change)                     │  overlay)  │
 *   └──────────┴──────────────────────────────┴────────────┘
 */
export class StyleguideScene extends Phaser.Scene {
  private activeId: string;
  private knobValuesById: Map<string, KnobValues> = new Map();
  private contentRoot!: Phaser.GameObjects.Container;
  private contentTitle!: Label;
  private sidePanelRoot!: Phaser.GameObjects.Container;
  private topBarRoot!: Phaser.GameObjects.Container;

  private knobsHost: HTMLDivElement | null = null;
  private knobsTeardown: (() => void) | null = null;

  constructor() {
    super({ key: "StyleguideScene" });
    this.activeId =
      styleguideSections[0]?.id ??
      // Defensive: if registry is empty we still need a string.
      "missing";
  }

  create(): void {
    // Pre-populate knob values for every section.
    for (const s of styleguideSections) {
      this.knobValuesById.set(s.id, buildDefaultKnobValues(s.knobs));
    }

    this.drawBackground();
    this.buildTopBar();
    this.buildSidePanel();
    this.buildContentArea();
    this.mountKnobsHost();
    this.renderActiveSection();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  /* ── Chrome ────────────────────────────────────────────────── */

  private drawBackground(): void {
    const theme = getTheme();
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.colors.background)
      .setOrigin(0, 0);
  }

  private buildTopBar(): void {
    const theme = getTheme();
    this.topBarRoot = this.add.container(0, 0);
    const bg = this.add
      .rectangle(0, 0, GAME_WIDTH, TOP_BAR_HEIGHT, theme.colors.headerBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    this.topBarRoot.add(bg);
    const title = new Label(this, {
      x: PANEL_PADDING,
      y: TOP_BAR_HEIGHT / 2 - 12,
      text: "STAR FREIGHT TYCOON — UI STYLE GUIDE",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    this.topBarRoot.add(title);

    // Place the theme switcher to the left of the reserved DOM knobs
    // overlay so it stays visible regardless of FIT scaling.
    const themeLabelX = GAME_WIDTH - KNOBS_PANEL_WIDTH - 260;
    const themeLabel = new Label(this, {
      x: themeLabelX,
      y: TOP_BAR_HEIGHT / 2 - 6,
      text: "Theme:",
      style: "caption",
      color: theme.colors.textDim,
    });
    this.topBarRoot.add(themeLabel);

    const dropdown = new Dropdown(this, {
      x: themeLabelX + 60,
      y: TOP_BAR_HEIGHT / 2 - 16,
      width: 180,
      height: 32,
      defaultIndex: 0,
      options: [
        { label: "Default (Dark)", value: "dark" },
        { label: "Light", value: "light" },
        { label: "High Contrast", value: "high-contrast" },
      ],
      onChange: (value) => this.applyTheme(value),
    });
    this.topBarRoot.add(dropdown);
  }

  private buildSidePanel(): void {
    const theme = getTheme();
    this.sidePanelRoot = this.add.container(0, TOP_BAR_HEIGHT);

    const bg = this.add
      .rectangle(
        0,
        0,
        SIDE_PANEL_WIDTH,
        GAME_HEIGHT - TOP_BAR_HEIGHT,
        theme.colors.panelBg,
        0.7,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.4);
    this.sidePanelRoot.add(bg);

    let y = PANEL_PADDING;
    for (const group of groupByCategory(styleguideSections)) {
      this.sidePanelRoot.add(
        new Label(this, {
          x: PANEL_PADDING,
          y,
          text: group.category.toUpperCase(),
          style: "caption",
          color: theme.colors.accent,
        }),
      );
      y += 18;
      for (const section of group.sections) {
        const isActive = section.id === this.activeId;
        const item = this.buildNavItem(section, isActive);
        item.setPosition(PANEL_PADDING, y);
        this.sidePanelRoot.add(item);
        y += 22;
      }
      y += 8;
    }
  }

  private buildNavItem(
    section: StyleguideSection,
    isActive: boolean,
  ): Phaser.GameObjects.Container {
    const theme = getTheme();
    const c = this.add.container(0, 0);
    const txt = this.add
      .text(0, 0, `${isActive ? "▶ " : "  "}${section.title}`, {
        fontFamily: theme.fonts.body.family,
        fontSize: "13px",
        color: colorToString(
          isActive ? theme.colors.accent : theme.colors.text,
        ),
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    txt.on("pointerover", () => {
      if (!isActive) txt.setColor(colorToString(theme.colors.accentHover));
    });
    txt.on("pointerout", () => {
      if (!isActive) txt.setColor(colorToString(theme.colors.text));
    });
    txt.on("pointerdown", () => this.setActiveSection(section.id));
    c.add(txt);
    return c;
  }

  private buildContentArea(): void {
    const theme = getTheme();
    const x = SIDE_PANEL_WIDTH;
    const y = TOP_BAR_HEIGHT;
    const w = GAME_WIDTH - SIDE_PANEL_WIDTH - KNOBS_PANEL_WIDTH;
    const h = GAME_HEIGHT - TOP_BAR_HEIGHT;

    this.add.rectangle(x, y, w, h, theme.colors.background).setOrigin(0, 0);

    this.contentTitle = new Label(this, {
      x: x + PANEL_PADDING,
      y: y + PANEL_PADDING,
      text: "",
      style: "heading",
      color: theme.colors.accent,
    });

    // Container that owns the active section's children. Positioned
    // below the title so render functions can use (0,0) coordinates
    // relative to the content area.
    this.contentRoot = this.add.container(x + PANEL_PADDING, y + 50);
  }

  /* ── Knobs panel (DOM overlay) ─────────────────────────────── */

  private mountKnobsHost(): void {
    // The styleguide canvas sits inside a Phaser scaled wrapper. The DOM
    // overlay is appended to `document.body` and positioned absolutely.
    // It does NOT scale with the canvas — it lives in screen pixels — so
    // it remains usable regardless of FIT scaling.
    const existing = document.getElementById("sg-knobs-panel");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    const host = document.createElement("div");
    host.id = "sg-knobs-panel";
    host.style.position = "fixed";
    host.style.top = "12px";
    host.style.right = "12px";
    host.style.width = "260px";
    host.style.maxHeight = "calc(100vh - 24px)";
    host.style.overflow = "auto";
    host.style.background = "rgba(10, 10, 24, 0.92)";
    host.style.color = "#e0e0ff";
    host.style.fontFamily = "monospace";
    host.style.fontSize = "12px";
    host.style.padding = "12px";
    host.style.border = "1px solid #2a2a5a";
    host.style.borderRadius = "4px";
    host.style.zIndex = "1000";

    const heading = document.createElement("div");
    heading.textContent = "KNOBS";
    heading.style.fontSize = "11px";
    heading.style.opacity = "0.7";
    heading.style.letterSpacing = "1px";
    heading.style.marginBottom = "10px";
    heading.style.borderBottom = "1px solid #2a2a5a";
    heading.style.paddingBottom = "6px";
    host.appendChild(heading);

    const body = document.createElement("div");
    body.id = "sg-knobs-body";
    host.appendChild(body);

    document.body.appendChild(host);
    this.knobsHost = host;
  }

  private renderKnobsForActive(): void {
    if (!this.knobsHost) return;
    const body = this.knobsHost.querySelector<HTMLDivElement>("#sg-knobs-body");
    if (!body) return;
    if (this.knobsTeardown) {
      this.knobsTeardown();
      this.knobsTeardown = null;
    }
    const section = this.getActiveSection();
    if (!section) return;
    const values = this.knobValuesById.get(section.id) ?? {};
    this.knobsTeardown = renderKnobs(
      body,
      section.knobs ?? [],
      values,
      (id, value) => this.onKnobChange(id, value),
    );
  }

  private onKnobChange(id: string, value: KnobValue): void {
    const section = this.getActiveSection();
    if (!section) return;
    const current = this.knobValuesById.get(section.id) ?? {};
    this.knobValuesById.set(section.id, { ...current, [id]: value });
    this.renderActiveSection();
  }

  /* ── Theme switching ────────────────────────────────────────── */

  private applyTheme(value: string): void {
    const next = themeFromValue(value);
    setTheme(next);
    // Components read the theme on construction, so a full re-render
    // of all chrome + active section is needed.
    this.scene.restart();
  }

  /* ── Section switching / rendering ──────────────────────────── */

  private setActiveSection(id: string): void {
    if (this.activeId === id) return;
    this.activeId = id;
    // Repaint side panel so the active marker moves.
    this.sidePanelRoot.removeAll(true);
    this.buildSidePanel();
    this.renderActiveSection();
  }

  private getActiveSection(): StyleguideSection | undefined {
    return styleguideSections.find((s) => s.id === this.activeId);
  }

  private renderActiveSection(): void {
    const section = this.getActiveSection();
    if (!section) return;
    if (this.contentTitle) {
      this.contentTitle.setText(section.title);
    }
    this.contentRoot.removeAll(true);
    const values = this.knobValuesById.get(section.id) ?? {};
    section.render(this, this.contentRoot, values);
    this.renderKnobsForActive();
  }

  /* ── Cleanup ────────────────────────────────────────────────── */

  private cleanup(): void {
    if (this.knobsTeardown) {
      this.knobsTeardown();
      this.knobsTeardown = null;
    }
    if (this.knobsHost && this.knobsHost.parentNode) {
      this.knobsHost.parentNode.removeChild(this.knobsHost);
    }
    this.knobsHost = null;
  }
}

function themeFromValue(value: string): ThemeConfig {
  switch (value) {
    case "light":
      return lightTheme;
    case "high-contrast":
      return highContrastTheme;
    case "dark":
    default:
      return darkTheme;
  }
}
