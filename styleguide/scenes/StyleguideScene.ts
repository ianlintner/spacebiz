import * as Phaser from "phaser";
import {
  getTheme,
  colorToString,
  GAME_WIDTH,
  GAME_HEIGHT,
  Panel,
  Button,
  Label,
  Modal,
  Tooltip,
  ProgressBar,
  ScrollableList,
  TabGroup,
  DataTable,
  createStarfield,
  addPulseTween,
  addTwinkleTween,
  addFloatTween,
  registerAmbientCleanup,
  flashScreen,
  FloatingText,
  MilestoneOverlay,
  StatRow,
  InfoCard,
  IconButton,
  StatusBadge,
  HSizer,
  VSizer,
  GridSizer,
  FixWidthSizer,
  Anchor,
  // Layout constants
  SIDEBAR_WIDTH,
  CONTENT_GAP,
  HUD_TOP_BAR_HEIGHT,
  HUD_BOTTOM_BAR_HEIGHT,
  NAV_SIDEBAR_WIDTH,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  CONTENT_LEFT,
  MAX_CONTENT_WIDTH,
  SIDEBAR_LEFT,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
  FULL_CONTENT_LEFT,
  FULL_CONTENT_WIDTH,
  // Depth layers
  DEPTH_STARFIELD,
  DEPTH_AMBIENT_MID,
  DEPTH_CONTENT,
  DEPTH_UI,
  DEPTH_MODAL,
  DEPTH_HUD,
} from "@spacebiz/ui";
import type { ThemeConfig, ColumnDef, BadgeVariant } from "@spacebiz/ui";
import {
  CARGO_TYPE_LIST,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
} from "@spacebiz/ui";
import {
  drawRexPortrait,
  getMoodAccentColor,
} from "../../src/ui/AdviserPortrait.ts";
import { drawPortrait } from "../../src/ui/PortraitGenerator.ts";
import type {
  PortraitData,
  AlienRole,
} from "../../src/ui/PortraitGenerator.ts";
import type { AdviserMood } from "../../src/data/types.ts";

/**
 * Interactive style guide showcasing all @spacebiz/ui components.
 * Organised into vertical sections that scroll via mouse wheel.
 */
export class StyleguideScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private theme!: ThemeConfig;

  constructor() {
    super({ key: "StyleguideScene" });
  }

  create(): void {
    this.theme = getTheme();

    // ── Starfield background ──
    createStarfield(this, { count: 80, twinkle: true, shimmer: true });

    // ── Scrollable container for all sections ──
    this.scrollContainer = this.add.container(0, 0);

    let y = 30;
    y = this.addSectionTitle(y, "◆ STAR FREIGHT TYCOON — UI STYLE GUIDE");
    y = this.addColorPaletteSection(y);
    y = this.addTypographySection(y);
    y = this.addButtonSection(y);
    y = this.addPanelSection(y);
    y = this.addProgressBarSection(y);
    y = this.addScrollableListSection(y);
    y = this.addTabGroupSection(y);
    y = this.addDataTableSection(y);
    y = this.addTooltipSection(y);
    y = this.addFloatingTextSection(y);
    y = this.addAmbientFxSection(y);
    y = this.addMilestoneSection(y);
    y = this.addModalSection(y);

    // ── Game-specific & extended sections ──
    y = this.addIconGallerySection(y);
    y = this.addCargoIconSection(y);
    y = this.addHudBarSection(y);
    y = this.addAdviserPortraitSection(y);
    y = this.addPortraitGallerySection(y);
    y = this.addSpacingLayoutSection(y);
    y = this.addDepthLayersSection(y);
    y = this.addGlassEffectSection(y);
    y = this.addAnimationTimingSection(y);
    y = this.addStatRowSection(y);
    y = this.addInfoCardSection(y);
    y = this.addIconButtonSection(y);
    y = this.addStatusBadgeSection(y);
    y = this.addLayoutPrimitivesSection(y);
    y += 60;

    this.maxScroll = Math.max(0, y - GAME_HEIGHT);

    // ── Mouse wheel scrolling ──
    this.input.on(
      "wheel",
      (
        _pointer: unknown,
        over: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        // Don't scroll the page when over a child that handles its own scroll
        if (
          over.some(
            (obj) =>
              "getData" in obj &&
              (obj as Phaser.GameObjects.GameObject).getData("consumesWheel"),
          )
        ) {
          return;
        }
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY + deltaY * 0.5,
          0,
          this.maxScroll,
        );
        this.scrollContainer.y = -this.scrollY;
      },
    );

    // Scroll hint
    const hint = this.add
      .text(GAME_WIDTH - 20, GAME_HEIGHT - 20, "↕ Scroll to explore", {
        fontFamily: this.theme.fonts.caption.family,
        fontSize: `${this.theme.fonts.caption.size}px`,
        color: colorToString(this.theme.colors.textDim),
      })
      .setOrigin(1, 1);
    addPulseTween(this, hint, {
      minAlpha: 0.3,
      maxAlpha: 0.8,
      duration: this.theme.ambient.panelIdlePulseDuration,
    });
  }

  /* ── Section helpers ──────────────────────────────────────── */

  private addSectionTitle(y: number, text: string): number {
    const label = new Label(this, {
      x: GAME_WIDTH / 2,
      y,
      text,
      style: "heading",
      color: this.theme.colors.accent,
      glow: true,
    }).setOrigin(0.5, 0);
    this.scrollContainer.add(label);
    return y + 50;
  }

  private addSubheading(y: number, text: string): number {
    const label = new Label(this, {
      x: 40,
      y,
      text,
      style: "heading",
      color: this.theme.colors.text,
    });
    this.scrollContainer.add(label);

    // Accent divider
    const line = this.add
      .rectangle(40, y + 28, 200, 2, this.theme.colors.accent, 0.4)
      .setOrigin(0, 0.5);
    this.scrollContainer.add(line);
    return y + 44;
  }

  /* ── 1. Color Palette ─────────────────────────────────────── */

  private addColorPaletteSection(y: number): number {
    y = this.addSubheading(y, "COLOR PALETTE");

    const colors = this.theme.colors;
    const swatches: [string, number][] = [
      ["background", colors.background],
      ["headerBg", colors.headerBg],
      ["panelBg", colors.panelBg],
      ["panelBorder", colors.panelBorder],
      ["accent", colors.accent],
      ["accentHover", colors.accentHover],
      ["text", colors.text],
      ["textDim", colors.textDim],
      ["profit", colors.profit],
      ["loss", colors.loss],
      ["warning", colors.warning],
      ["buttonBg", colors.buttonBg],
      ["buttonHover", colors.buttonHover],
      ["buttonPressed", colors.buttonPressed],
      ["buttonDisabled", colors.buttonDisabled],
      ["scrollbarTrack", colors.scrollbarTrack],
      ["scrollbarThumb", colors.scrollbarThumb],
      ["rowEven", colors.rowEven],
      ["rowOdd", colors.rowOdd],
      ["rowHover", colors.rowHover],
      ["modalOverlay", colors.modalOverlay],
    ];

    const cols = 7;
    const swatchW = 140;
    const swatchH = 50;
    const gap = 10;
    const startX = 40;

    for (let i = 0; i < swatches.length; i++) {
      const [name, value] = swatches[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = startX + col * (swatchW + gap);
      const sy = y + row * (swatchH + 24 + gap);

      const rect = this.add
        .rectangle(sx, sy, swatchW, swatchH, value, 1)
        .setOrigin(0, 0);
      rect.setStrokeStyle(1, this.theme.colors.panelBorder, 0.6);
      this.scrollContainer.add(rect);

      const lbl = this.add
        .text(sx, sy + swatchH + 4, `${name}\n${colorToString(value)}`, {
          fontFamily: this.theme.fonts.caption.family,
          fontSize: `${this.theme.fonts.caption.size}px`,
          color: colorToString(this.theme.colors.textDim),
        })
        .setOrigin(0, 0);
      this.scrollContainer.add(lbl);
    }

    const totalRows = Math.ceil(swatches.length / cols);
    return y + totalRows * (swatchH + 24 + gap) + 20;
  }

  /* ── 2. Typography ────────────────────────────────────────── */

  private addTypographySection(y: number): number {
    y = this.addSubheading(y, "TYPOGRAPHY");

    const styles: Array<{
      style: "heading" | "body" | "caption" | "value";
      sample: string;
    }> = [
      { style: "heading", sample: "Heading – Orbitron 20px Bold" },
      { style: "body", sample: "Body – Share Tech Mono 16px Regular" },
      { style: "caption", sample: "Caption – Share Tech Mono 12px (dimmed)" },
      { style: "value", sample: "Value – Orbitron 18px Bold (accent)" },
    ];

    for (const { style, sample } of styles) {
      const label = new Label(this, { x: 60, y, text: sample, style });
      this.scrollContainer.add(label);
      y += 36;
    }

    // Glow example
    const glowLabel = new Label(this, {
      x: 60,
      y,
      text: "Label with glow: true",
      style: "heading",
      color: this.theme.colors.accent,
      glow: true,
    });
    this.scrollContainer.add(glowLabel);
    y += 36;

    // Colored labels
    const colorExamples: [string, number][] = [
      ["Profit label", this.theme.colors.profit],
      ["Loss label", this.theme.colors.loss],
      ["Warning label", this.theme.colors.warning],
    ];
    for (const [text, color] of colorExamples) {
      const lbl = new Label(this, { x: 60, y, text, style: "body", color });
      this.scrollContainer.add(lbl);
      y += 28;
    }

    return y + 20;
  }

  /* ── 3. Buttons ───────────────────────────────────────────── */

  private addButtonSection(y: number): number {
    y = this.addSubheading(y, "BUTTONS");

    const configs: Array<{ label: string; disabled?: boolean }> = [
      { label: "Primary Action" },
      { label: "Hover Me" },
      { label: "Disabled", disabled: true },
    ];

    let x = 60;
    for (const cfg of configs) {
      const btn = new Button(this, {
        x,
        y: y + 20,
        label: cfg.label,
        disabled: cfg.disabled,
        onClick: () => {
          new FloatingText(this, x, y, "Clicked!", this.theme.colors.profit);
        },
      });
      this.scrollContainer.add(btn);
      x += btn.width + 20;
    }

    // Size variants on a second row — autoWidth sizes to content
    const sizeConfigs: Array<{ label: string }> = [
      { label: "Short" },
      { label: "A Much Longer Label Here" },
    ];

    x = 60;
    for (const cfg of sizeConfigs) {
      const btn = new Button(this, {
        x,
        y: y + 70,
        label: cfg.label,
        autoWidth: true,
        onClick: () => {
          new FloatingText(
            this,
            x,
            y + 50,
            "Clicked!",
            this.theme.colors.profit,
          );
        },
      });
      this.scrollContainer.add(btn);
      x += btn.width + 20;
    }

    return y + 130;
  }

  /* ── 4. Panels ────────────────────────────────────────────── */

  private addPanelSection(y: number): number {
    y = this.addSubheading(y, "PANELS");

    // Standard panel
    const panel1 = new Panel(this, {
      x: 40,
      y,
      width: 300,
      height: 160,
      title: "Standard Panel",
    });
    this.scrollContainer.add(panel1);

    const panelBody = new Label(this, {
      x: 55,
      y: y + panel1.getContentY() + 10,
      text: "Panel with title bar,\nchamfered border, and\nglowing idle animation.",
      style: "body",
    });
    this.scrollContainer.add(panelBody);

    // Panel without title
    const panel2 = new Panel(this, {
      x: 370,
      y,
      width: 280,
      height: 160,
    });
    this.scrollContainer.add(panel2);

    const p2Body = new Label(this, {
      x: 385,
      y: y + 20,
      text: "Panel without title.\nNo drag, just display.",
      style: "body",
    });
    this.scrollContainer.add(p2Body);

    // Active panel
    const panel3 = new Panel(this, {
      x: 680,
      y,
      width: 280,
      height: 160,
      title: "Active Panel",
    });
    panel3.setActive(true);
    this.scrollContainer.add(panel3);

    const p3Body = new Label(this, {
      x: 695,
      y: y + panel3.getContentY() + 10,
      text: "setActive(true) —\nbrighter glow for focus.",
      style: "body",
    });
    this.scrollContainer.add(p3Body);

    return y + 190;
  }

  /* ── 5. Progress Bars ─────────────────────────────────────── */

  private addProgressBarSection(y: number): number {
    y = this.addSubheading(y, "PROGRESS BARS");

    const configs: Array<{
      label: string;
      value: number;
      maxValue: number;
      fillColor?: number;
    }> = [
      { label: "Default (70/100)", value: 70, maxValue: 100 },
      {
        label: "Profit (45/50)",
        value: 45,
        maxValue: 50,
        fillColor: this.theme.colors.profit,
      },
      {
        label: "Warning (20/100)",
        value: 20,
        maxValue: 100,
        fillColor: this.theme.colors.warning,
      },
      {
        label: "Loss (8/100)",
        value: 8,
        maxValue: 100,
        fillColor: this.theme.colors.loss,
      },
      { label: "Full (100/100)", value: 100, maxValue: 100 },
      { label: "Empty (0/100)", value: 0, maxValue: 100 },
    ];

    for (const cfg of configs) {
      const lbl = new Label(this, {
        x: 60,
        y,
        text: cfg.label,
        style: "caption",
      });
      this.scrollContainer.add(lbl);

      const bar = new ProgressBar(this, {
        x: 60,
        y: y + 18,
        width: 400,
        height: 18,
        value: cfg.value,
        maxValue: cfg.maxValue,
        fillColor: cfg.fillColor,
      });
      this.scrollContainer.add(bar);
      y += 52;
    }

    // Animated bar
    const animLabel = new Label(this, {
      x: 560,
      y: y - 300,
      text: "Animated fill:",
      style: "caption",
    });
    this.scrollContainer.add(animLabel);
    const animBar = new ProgressBar(this, {
      x: 560,
      y: y - 282,
      width: 400,
      height: 22,
      value: 0,
      maxValue: 100,
    });
    this.scrollContainer.add(animBar);

    // Cycle animation
    let animVal = 0;
    let animDir = 1;
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        animVal += animDir * 15;
        if (animVal >= 100) {
          animVal = 100;
          animDir = -1;
        }
        if (animVal <= 0) {
          animVal = 0;
          animDir = 1;
        }
        animBar.setValue(animVal, true);
      },
    });

    return y + 20;
  }

  /* ── 6. Scrollable List ───────────────────────────────────── */

  private addScrollableListSection(y: number): number {
    y = this.addSubheading(y, "SCROLLABLE LIST");

    const list = new ScrollableList(this, {
      x: 60,
      y,
      width: 400,
      height: 200,
      itemHeight: 36,
      onSelect: (idx) => {
        new FloatingText(
          this,
          480,
          y + 40,
          `Selected #${idx}`,
          this.theme.colors.accent,
        );
      },
    });
    this.scrollContainer.add(list);

    // Populate with sample data
    for (let i = 0; i < 20; i++) {
      const row = this.add.container(0, 0);
      const txt = new Label(this, {
        x: 16,
        y: 8,
        text: `Item ${i + 1} — Sample list entry`,
        style: "body",
      });
      row.add(txt);
      list.addItem(row);
    }

    const desc = new Label(this, {
      x: 500,
      y: y + 10,
      text: "ScrollableList\n• Mouse wheel scroll\n• Click to select\n• Keyboard nav (arrows/enter)\n• Geometry mask clipping",
      style: "caption",
      maxWidth: 300,
    });
    this.scrollContainer.add(desc);

    return y + 230;
  }

  /* ── 7. Tab Group ─────────────────────────────────────────── */

  private addTabGroupSection(y: number): number {
    y = this.addSubheading(y, "TAB GROUP");

    const tab1Content = this.add.container(0, 0);
    tab1Content.add(
      new Label(this, {
        x: 16,
        y: 16,
        text: "Content for Tab 1\nThis is the first panel.",
        style: "body",
      }),
    );

    const tab2Content = this.add.container(0, 0);
    tab2Content.add(
      new Label(this, {
        x: 16,
        y: 16,
        text: "Content for Tab 2\nDifferent content here.",
        style: "body",
      }),
    );

    const tab3Content = this.add.container(0, 0);
    tab3Content.add(
      new Label(this, {
        x: 16,
        y: 16,
        text: "Content for Tab 3\nYet another tab.",
        style: "body",
      }),
    );

    const tabGroup = new TabGroup(this, {
      x: 60,
      y,
      width: 600,
      tabs: [
        { label: "Overview", content: tab1Content },
        { label: "Details", content: tab2Content },
        { label: "Settings", content: tab3Content },
      ],
    });
    this.scrollContainer.add(tabGroup);

    return y + 140;
  }

  /* ── 8. Data Table ────────────────────────────────────────── */

  private addDataTableSection(y: number): number {
    y = this.addSubheading(y, "DATA TABLE");

    const columns: ColumnDef[] = [
      { key: "name", label: "Planet", width: 150, sortable: true },
      { key: "commodity", label: "Commodity", width: 120, sortable: true },
      {
        key: "price",
        label: "Price",
        width: 80,
        align: "right",
        sortable: true,
        format: (v: unknown) => `$${v}`,
      },
      {
        key: "trend",
        label: "Trend",
        width: 80,
        align: "right",
        sortable: true,
        format: (v: unknown) => `${Number(v) > 0 ? "+" : ""}${v}%`,
        colorFn: (v: unknown) => {
          const n = Number(v);
          return n > 0
            ? this.theme.colors.profit
            : n < 0
              ? this.theme.colors.loss
              : this.theme.colors.textDim;
        },
      },
      {
        key: "supply",
        label: "Supply",
        width: 80,
        align: "right",
        sortable: true,
      },
    ];

    const rows = [
      {
        name: "Solara Prime",
        commodity: "Fuel Cells",
        price: 124,
        trend: 12,
        supply: 450,
      },
      {
        name: "Nova Station",
        commodity: "Ore",
        price: 89,
        trend: -5,
        supply: 1200,
      },
      {
        name: "Zenith IV",
        commodity: "Electronics",
        price: 342,
        trend: 3,
        supply: 88,
      },
      {
        name: "Dustfall",
        commodity: "Food",
        price: 45,
        trend: -18,
        supply: 3400,
      },
      {
        name: "Helix Ring",
        commodity: "Luxury Goods",
        price: 780,
        trend: 25,
        supply: 22,
      },
      {
        name: "Frost Haven",
        commodity: "Water",
        price: 32,
        trend: 0,
        supply: 5600,
      },
      {
        name: "Ember Gate",
        commodity: "Rare Metals",
        price: 567,
        trend: 8,
        supply: 75,
      },
      {
        name: "Drift Colony",
        commodity: "Passengers",
        price: 210,
        trend: -2,
        supply: 150,
      },
    ];

    const table = new DataTable(this, {
      x: 60,
      y,
      width: 560,
      height: 260,
      columns,
      onRowSelect: (_rowIndex, rowData) => {
        new FloatingText(
          this,
          640,
          y + 40,
          String(rowData["name"]),
          this.theme.colors.accent,
        );
      },
    });
    table.setRows(rows);
    this.scrollContainer.add(table);

    const desc = new Label(this, {
      x: 660,
      y: y + 10,
      text: "DataTable\n• Click headers to sort\n• Click rows to select\n• Scroll with mouse wheel\n• Color functions for cells\n• Custom formatters",
      style: "caption",
      maxWidth: 300,
    });
    this.scrollContainer.add(desc);

    return y + 290;
  }

  /* ── 9. Tooltips ──────────────────────────────────────────── */

  private addTooltipSection(y: number): number {
    y = this.addSubheading(y, "TOOLTIPS");

    const tooltip = new Tooltip(this);
    this.scrollContainer.add(tooltip);

    const targets: Array<{ label: string; tip: string }> = [
      {
        label: "Hover for info",
        tip: "This is a standard tooltip.\nIt auto-positions near the cursor.",
      },
      {
        label: "Another tooltip",
        tip: "Tooltips support multi-line text\nand configurable delay + width.",
      },
      { label: "Short tip", tip: "Quick info." },
    ];

    let x = 60;
    for (const { label, tip } of targets) {
      const btn = new Button(this, {
        x,
        y: y + 10,
        label,
        autoWidth: true,
        onClick: () => {},
      });
      this.scrollContainer.add(btn);
      tooltip.attachTo(btn, tip);
      x += btn.width + 24;
    }

    return y + 80;
  }

  /* ── 10. Floating Text ────────────────────────────────────── */

  private addFloatingTextSection(y: number): number {
    y = this.addSubheading(y, "FLOATING TEXT");

    const sizes: Array<"small" | "medium" | "large" | "huge"> = [
      "small",
      "medium",
      "large",
      "huge",
    ];
    let x = 60;

    for (const size of sizes) {
      const btn = new Button(this, {
        x,
        y: y + 10,
        label: size,
        onClick: () => {
          new FloatingText(
            this,
            x + 40,
            y - 10 - this.scrollY,
            `+$${Math.floor(Math.random() * 999)}`,
            this.theme.colors.profit,
            { size },
          );
        },
      });
      this.scrollContainer.add(btn);
      x += 140;
    }

    // Bounce vs no-bounce
    const btnBounce = new Button(this, {
      x: x + 20,
      y: y + 10,
      label: "bounce: true",
      autoWidth: true,
      onClick: () => {
        new FloatingText(
          this,
          x + 60,
          y - 10 - this.scrollY,
          "Bouncy!",
          this.theme.colors.warning,
          { bounce: true },
        );
      },
    });
    this.scrollContainer.add(btnBounce);

    const btnNoBounce = new Button(this, {
      x: x + btnBounce.width + 20,
      y: y + 10,
      label: "bounce: false",
      autoWidth: true,
      onClick: () => {
        new FloatingText(
          this,
          x + 240,
          y - 10 - this.scrollY,
          "Smooth",
          this.theme.colors.accent,
          { bounce: false },
        );
      },
    });
    this.scrollContainer.add(btnNoBounce);

    return y + 80;
  }

  /* ── 11. Ambient FX ───────────────────────────────────────── */

  private addAmbientFxSection(y: number): number {
    y = this.addSubheading(y, "AMBIENT FX");

    const tweens: Phaser.Tweens.Tween[] = [];

    // Pulse
    const pulseTarget = this.add.circle(
      100,
      y + 40,
      16,
      this.theme.colors.accent,
      0.8,
    );
    this.scrollContainer.add(pulseTarget);
    tweens.push(
      addPulseTween(this, pulseTarget, {
        minAlpha: 0.3,
        maxAlpha: 1.0,
        duration: this.theme.ambient.panelIdlePulseDuration,
      }),
    );
    const pulseLbl = new Label(this, {
      x: 130,
      y: y + 32,
      text: "addPulseTween",
      style: "caption",
    });
    this.scrollContainer.add(pulseLbl);

    // Twinkle
    const twinkleTarget = this.add.circle(
      300,
      y + 40,
      16,
      this.theme.colors.profit,
      0.8,
    );
    this.scrollContainer.add(twinkleTarget);
    tweens.push(
      addTwinkleTween(this, twinkleTarget, {
        minAlpha: 0.3,
        maxAlpha: 1.0,
        minDuration: this.theme.ambient.starTwinkleDurationMin,
        maxDuration: this.theme.ambient.starTwinkleDurationMax,
      }),
    );
    const twinkleLbl = new Label(this, {
      x: 330,
      y: y + 32,
      text: "addTwinkleTween",
      style: "caption",
    });
    this.scrollContainer.add(twinkleLbl);

    // Float
    const floatTarget = this.add.circle(
      520,
      y + 40,
      16,
      this.theme.colors.warning,
      0.8,
    );
    this.scrollContainer.add(floatTarget);
    tweens.push(
      addFloatTween(this, floatTarget, { dx: 5, dy: -8, duration: 4000 }),
    );
    const floatLbl = new Label(this, {
      x: 550,
      y: y + 32,
      text: "addFloatTween",
      style: "caption",
    });
    this.scrollContainer.add(floatLbl);

    registerAmbientCleanup(this, tweens);

    // Flash screen button
    const flashBtn = new Button(this, {
      x: 720,
      y: y + 28,
      label: "flashScreen()",
      onClick: () => flashScreen(this, 0xffffff),
    });
    this.scrollContainer.add(flashBtn);

    return y + 90;
  }

  /* ── 12. Milestones ───────────────────────────────────────── */

  private addMilestoneSection(y: number): number {
    y = this.addSubheading(y, "MILESTONE OVERLAYS");

    const types: Array<{
      type: Parameters<typeof MilestoneOverlay.show>[1];
      label: string;
    }> = [
      { type: "big_profit", label: "Big Profit" },
      { type: "profit_streak", label: "Profit Streak" },
      { type: "record_profit", label: "Record Profit" },
      { type: "loss_warning", label: "Loss Warning" },
      { type: "bankruptcy_warning", label: "Bankruptcy" },
      { type: "event_opportunity", label: "Opportunity" },
      { type: "event_hazard", label: "Hazard" },
      { type: "sim_complete", label: "Sim Complete" },
    ];

    let x = 60;
    for (const { type, label } of types) {
      const btn = new Button(this, {
        x,
        y: y + 10,
        label,
        onClick: () => {
          MilestoneOverlay.show(
            this,
            type,
            label,
            "Subtitle text shown below",
            undefined,
            { holdDuration: 4000 },
          );
        },
      });
      this.scrollContainer.add(btn);
      x += btn.width + 12;
      if (x > GAME_WIDTH - 160) {
        x = 60;
        y += 50;
      }
    }

    return y + 80;
  }

  /* ── 13. Modal ────────────────────────────────────────────── */

  private addModalSection(y: number): number {
    y = this.addSubheading(y, "MODALS");

    const btnModal = new Button(this, {
      x: 60,
      y: y + 10,
      autoWidth: true,
      label: "Open Confirm Modal",
      onClick: () => {
        new Modal(this, {
          title: "Confirm Action",
          body: "Are you sure you want to proceed?\nThis action cannot be undone.",
          okText: "Confirm",
          cancelText: "Cancel",
          onOk: () =>
            new FloatingText(
              this,
              GAME_WIDTH / 2,
              300,
              "Confirmed!",
              this.theme.colors.profit,
            ),
          onCancel: () =>
            new FloatingText(
              this,
              GAME_WIDTH / 2,
              300,
              "Cancelled",
              this.theme.colors.loss,
            ),
        }).show();
      },
    });
    this.scrollContainer.add(btnModal);

    const btnInfo = new Button(this, {
      x: 280,
      y: y + 10,
      autoWidth: true,
      label: "Open Info Modal",
      onClick: () => {
        new Modal(this, {
          title: "Information",
          body: "This is an informational modal\nwith only an OK button.",
          okText: "Got it",
        }).show();
      },
    });
    this.scrollContainer.add(btnInfo);

    return y + 80;
  }

  /* ── 14. Icon Gallery ─────────────────────────────────────── */

  private addIconGallerySection(y: number): number {
    y = this.addSubheading(y, "ICON GALLERY");

    const icons = [
      { key: "icon-map", label: "Map" },
      { key: "icon-fleet", label: "Fleet" },
      { key: "icon-routes", label: "Routes" },
      { key: "icon-finance", label: "Finance" },
      { key: "icon-market", label: "Market" },
      { key: "icon-audio", label: "Audio" },
      { key: "icon-end-turn", label: "End Turn" },
      { key: "icon-adviser", label: "Adviser" },
    ];

    let x = 60;
    for (const { key, label } of icons) {
      // Icon against a subtle bg
      const bg = this.add
        .rectangle(x, y, 56, 56, this.theme.colors.panelBg, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.4);
      this.scrollContainer.add(bg);

      const img = this.add
        .image(x + 28, y + 28, key)
        .setOrigin(0.5)
        .setTint(this.theme.colors.accent);
      this.scrollContainer.add(img);

      const lbl = new Label(this, {
        x: x + 28,
        y: y + 62,
        text: label,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += 80;
    }

    // Hovered variants on second row
    x = 60;
    const hoverY = y + 90;
    const hoverNote = new Label(this, {
      x,
      y: hoverY,
      text: "Hover tint variants:",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(hoverNote);

    x = 250;
    const tints = [
      { label: "accent", color: this.theme.colors.accent },
      { label: "text", color: this.theme.colors.text },
      { label: "profit", color: this.theme.colors.profit },
      { label: "warning", color: this.theme.colors.warning },
      { label: "loss", color: this.theme.colors.loss },
    ];
    for (const { label, color } of tints) {
      const img = this.add
        .image(x + 14, hoverY + 8, "icon-map")
        .setOrigin(0.5)
        .setTint(color);
      this.scrollContainer.add(img);

      const lbl = new Label(this, {
        x: x + 32,
        y: hoverY + 2,
        text: label,
        style: "caption",
        color,
      });
      this.scrollContainer.add(lbl);
      x += 100;
    }

    return hoverY + 40;
  }

  /* ── 14b. Cargo Icons ─────────────────────────────────────── */

  private addCargoIconSection(y: number): number {
    y = this.addSubheading(y, "CARGO ICONS");

    let x = 60;
    for (const ct of CARGO_TYPE_LIST) {
      const color = getCargoColor(ct);
      const label = getCargoLabel(ct);
      const key = getCargoIconKey(ct);

      const bg = this.add
        .rectangle(x, y, 56, 56, this.theme.colors.panelBg, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.4);
      this.scrollContainer.add(bg);

      const img = this.add
        .image(x + 28, y + 28, key)
        .setOrigin(0.5)
        .setTint(color);
      this.scrollContainer.add(img);

      const lbl = new Label(this, {
        x: x + 28,
        y: y + 62,
        text: label,
        style: "caption",
        color,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += 90;
    }

    return y + 90;
  }

  /* ── 15. HUD Bar ──────────────────────────────────────────── */

  private addHudBarSection(y: number): number {
    y = this.addSubheading(y, "HUD BAR & DIVIDERS");

    // Show nine-slice HUD bar texture
    const barW = 600;
    const bar = this.add
      .nineslice(60, y, "hud-bar-bg", undefined, barW, 48, 10, 10, 10, 10)
      .setOrigin(0, 0);
    this.scrollContainer.add(bar);

    const barLbl = new Label(this, {
      x: 70 + barW / 2,
      y: y + 14,
      text: "hud-bar-bg (NineSlice)",
      style: "caption",
      color: this.theme.colors.textDim,
    }).setOrigin(0.5, 0);
    this.scrollContainer.add(barLbl);

    y += 60;

    // Divider
    const divW = 400;
    const div = this.add
      .nineslice(60, y, "divider-h", undefined, divW, 4, 2, 2, 0, 0)
      .setOrigin(0, 0);
    this.scrollContainer.add(div);

    const divLbl = new Label(this, {
      x: 60 + divW + 16,
      y: y - 4,
      text: "divider-h",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(divLbl);

    y += 24;

    // Layout reference
    const layoutInfo = [
      `HUD_TOP_BAR_HEIGHT: ${HUD_TOP_BAR_HEIGHT}`,
      `HUD_BOTTOM_BAR_HEIGHT: ${HUD_BOTTOM_BAR_HEIGHT}`,
      `NAV_SIDEBAR_WIDTH: ${NAV_SIDEBAR_WIDTH}`,
    ];
    for (const info of layoutInfo) {
      const lbl = new Label(this, {
        x: 60,
        y,
        text: info,
        style: "caption",
        color: this.theme.colors.textDim,
      });
      this.scrollContainer.add(lbl);
      y += 18;
    }

    return y + 20;
  }

  /* ── 16. Adviser Portrait ─────────────────────────────────── */

  private addAdviserPortraitSection(y: number): number {
    y = this.addSubheading(y, "ADVISER PORTRAIT — REX K9-CORP");

    const moods: AdviserMood[] = ["standby", "analyzing", "alert", "success"];
    const portraitSize = 128;
    let x = 60;

    for (const mood of moods) {
      // Portrait graphics
      const g = this.add.graphics();
      g.setPosition(x, y);
      drawRexPortrait(g, portraitSize, portraitSize, mood);
      this.scrollContainer.add(g);

      // Accent border matching mood
      const accentColor = getMoodAccentColor(mood);
      const border = this.add
        .rectangle(x, y, portraitSize, portraitSize)
        .setOrigin(0, 0)
        .setStrokeStyle(2, accentColor, 0.6);
      border.isFilled = false;
      this.scrollContainer.add(border);

      // Mood label
      const lbl = new Label(this, {
        x: x + portraitSize / 2,
        y: y + portraitSize + 6,
        text: mood,
        style: "caption",
        color: accentColor,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      // Accent color hex
      const hex = new Label(this, {
        x: x + portraitSize / 2,
        y: y + portraitSize + 22,
        text: colorToString(accentColor),
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(hex);

      x += portraitSize + 24;
    }

    // Description
    const descX = x + 30;
    const desc = new Label(this, {
      x: descX,
      y: y + 10,
      text: "Rex — K9-Corp Advisor\n32×32 pixel grid\n4 mood states\nProcedural pixel art\nwith mood-specific\naccents and expressions",
      style: "caption",
      color: this.theme.colors.textDim,
      maxWidth: 200,
    });
    this.scrollContainer.add(desc);

    return y + portraitSize + 50;
  }

  /* ── 17. Portrait Gallery ─────────────────────────────────── */

  private addPortraitGallerySection(y: number): number {
    y = this.addSubheading(y, "PORTRAIT GALLERY — PROCEDURAL PIXEL ART");

    const size = 96;
    const gap = 16;

    // ── Planet types ──
    const planetsLabel = new Label(this, {
      x: 60,
      y,
      text: "Planets",
      style: "body",
      color: this.theme.colors.text,
    });
    this.scrollContainer.add(planetsLabel);
    y += 24;

    const planetTypes: Array<{
      label: string;
      planetType: string;
    }> = [
      { label: "Terran", planetType: "terran" },
      { label: "Mining", planetType: "mining" },
      { label: "Agricultural", planetType: "agricultural" },
      { label: "Industrial", planetType: "industrial" },
      { label: "Hub Station", planetType: "hubStation" },
      { label: "Resort", planetType: "resort" },
      { label: "Research", planetType: "research" },
    ];

    let x = 60;
    for (const { label, planetType } of planetTypes) {
      const g = this.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, "planet", size, size, 42, {
        planetType: planetType as "terran",
      });
      this.scrollContainer.add(g);

      const border = this.add
        .rectangle(x, y, size, size)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.4);
      border.isFilled = false;
      this.scrollContainer.add(border);

      const lbl = new Label(this, {
        x: x + size / 2,
        y: y + size + 4,
        text: label,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += size + gap;
    }

    y += size + 34;

    // ── Ships, Systems, Events ──
    const otherLabel = new Label(this, {
      x: 60,
      y,
      text: "Ships / Systems / Events",
      style: "body",
      color: this.theme.colors.text,
    });
    this.scrollContainer.add(otherLabel);
    y += 24;

    const otherTypes: Array<{
      label: string;
      type: "ship" | "system" | "event";
      data?: PortraitData;
    }> = [
      {
        label: "Ship (shuttle)",
        type: "ship",
        data: { shipClass: "cargoShuttle" },
      },
      {
        label: "Ship (freighter)",
        type: "ship",
        data: { shipClass: "bulkFreighter" },
      },
      {
        label: "Ship (hauler)",
        type: "ship",
        data: { shipClass: "mixedHauler" },
      },
      {
        label: "System",
        type: "system",
        data: { starColor: 0xffd700, planetCount: 5 },
      },
      {
        label: "Event (market)",
        type: "event",
        data: { eventCategory: "market" },
      },
      {
        label: "Event (hazard)",
        type: "event",
        data: { eventCategory: "hazard" },
      },
    ];

    x = 60;
    for (const item of otherTypes) {
      const g = this.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, item.type, size, size, 123, item.data);
      this.scrollContainer.add(g);

      const border = this.add
        .rectangle(x, y, size, size)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.4);
      border.isFilled = false;
      this.scrollContainer.add(border);

      const lbl = new Label(this, {
        x: x + size / 2,
        y: y + size + 4,
        text: item.label,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += size + gap;
    }

    y += size + 34;

    // ── Aliens ──
    const alienLabel = new Label(this, {
      x: 60,
      y,
      text: "Aliens",
      style: "body",
      color: this.theme.colors.text,
    });
    this.scrollContainer.add(alienLabel);
    y += 24;

    const alienRoles: AlienRole[] = [
      "broker",
      "miner",
      "researcher",
      "concierge",
      "enforcer",
    ];

    x = 60;
    for (const role of alienRoles) {
      const g = this.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, "alien", size, size, 77, { alienRole: role });
      this.scrollContainer.add(g);

      const border = this.add
        .rectangle(x, y, size, size)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.4);
      border.isFilled = false;
      this.scrollContainer.add(border);

      const lbl = new Label(this, {
        x: x + size / 2,
        y: y + size + 4,
        text: role,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += size + gap;
    }

    y += size + 34;

    // ── Seed variation ──
    const seedLabel = new Label(this, {
      x: 60,
      y,
      text: "Seed variation (same type, different seeds)",
      style: "body",
      color: this.theme.colors.text,
    });
    this.scrollContainer.add(seedLabel);
    y += 24;

    x = 60;
    for (let seed = 1; seed <= 8; seed++) {
      const g = this.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, "planet", size, size, seed * 17, {
        planetType: "terran",
      });
      this.scrollContainer.add(g);

      const lbl = new Label(this, {
        x: x + size / 2,
        y: y + size + 4,
        text: `seed ${seed * 17}`,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += size + gap;
    }

    return y + size + 34;
  }

  /* ── 18. Spacing & Layout Guide ───────────────────────────── */

  private addSpacingLayoutSection(y: number): number {
    y = this.addSubheading(y, "SPACING & LAYOUT TOKENS");

    const spacing = this.theme.spacing;
    const spacingTokens: Array<{ name: string; value: number }> = [
      { name: "xs", value: spacing.xs },
      { name: "sm", value: spacing.sm },
      { name: "md", value: spacing.md },
      { name: "lg", value: spacing.lg },
      { name: "xl", value: spacing.xl },
    ];

    let x = 60;
    for (const { name, value } of spacingTokens) {
      // Visual size block
      const block = this.add
        .rectangle(x, y, value, value, this.theme.colors.accent, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.accent, 0.8);
      this.scrollContainer.add(block);

      const lbl = new Label(this, {
        x: x + Math.max(value, 20) / 2,
        y: y + Math.max(value, 4) + 8,
        text: `${name}\n${value}px`,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += Math.max(value, 30) + 30;
    }

    y += 70;

    // Layout constants table
    const layoutConstants: Array<{ name: string; value: number }> = [
      { name: "GAME_WIDTH", value: GAME_WIDTH },
      { name: "GAME_HEIGHT", value: GAME_HEIGHT },
      { name: "MAX_CONTENT_WIDTH", value: MAX_CONTENT_WIDTH },
      { name: "SIDEBAR_WIDTH", value: SIDEBAR_WIDTH },
      { name: "CONTENT_GAP", value: CONTENT_GAP },
      { name: "NAV_SIDEBAR_WIDTH", value: NAV_SIDEBAR_WIDTH },
      { name: "CONTENT_TOP", value: CONTENT_TOP },
      { name: "CONTENT_HEIGHT", value: CONTENT_HEIGHT },
      { name: "CONTENT_LEFT", value: CONTENT_LEFT },
      { name: "SIDEBAR_LEFT", value: SIDEBAR_LEFT },
      { name: "MAIN_CONTENT_LEFT", value: MAIN_CONTENT_LEFT },
      { name: "MAIN_CONTENT_WIDTH", value: MAIN_CONTENT_WIDTH },
      { name: "FULL_CONTENT_LEFT", value: FULL_CONTENT_LEFT },
      { name: "FULL_CONTENT_WIDTH", value: FULL_CONTENT_WIDTH },
    ];

    const colWidth = 260;
    let col = 0;
    const startY = y;
    for (const { name, value } of layoutConstants) {
      const cx = 60 + col * colWidth;
      const lbl = new Label(this, {
        x: cx,
        y,
        text: `${name}: ${value}`,
        style: "caption",
        color: this.theme.colors.textDim,
      });
      this.scrollContainer.add(lbl);
      y += 18;

      // Wrap to next column after 7 items
      if ((layoutConstants.indexOf({ name, value }) + 1) % 7 === 0) {
        col++;
        y = startY;
      }
    }

    // Two-column layout — reset y to below longest column
    y = startY + Math.ceil(layoutConstants.length / 2) * 18;

    return y + 20;
  }

  /* ── 19. Depth Layers Reference ───────────────────────────── */

  private addDepthLayersSection(y: number): number {
    y = this.addSubheading(y, "DEPTH LAYERS");

    const layers: Array<{ name: string; value: number; color: number }> = [
      {
        name: "DEPTH_STARFIELD",
        value: DEPTH_STARFIELD,
        color: 0x335577,
      },
      {
        name: "DEPTH_AMBIENT_MID",
        value: DEPTH_AMBIENT_MID,
        color: 0x557799,
      },
      {
        name: "DEPTH_CONTENT",
        value: DEPTH_CONTENT,
        color: this.theme.colors.text,
      },
      { name: "DEPTH_UI", value: DEPTH_UI, color: this.theme.colors.accent },
      {
        name: "DEPTH_MODAL",
        value: DEPTH_MODAL,
        color: this.theme.colors.warning,
      },
      { name: "DEPTH_HUD", value: DEPTH_HUD, color: this.theme.colors.profit },
    ];

    const barMaxW = 500;
    const barH = 24;
    const maxDepth = DEPTH_HUD;

    for (const { name, value, color } of layers) {
      // Depth bar (log-scale visual)
      const normalised =
        value <= 0
          ? 20
          : Math.max(
              20,
              (Math.log10(value + 1) / Math.log10(maxDepth + 1)) * barMaxW,
            );
      const bar = this.add
        .rectangle(60, y, normalised, barH, color, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, color, 0.7);
      this.scrollContainer.add(bar);

      const lbl = new Label(this, {
        x: 70 + normalised,
        y: y + 4,
        text: `${name} = ${value}`,
        style: "caption",
        color,
      });
      this.scrollContainer.add(lbl);

      y += barH + 8;
    }

    return y + 20;
  }

  /* ── 20. Glass Effect Showcase ────────────────────────────── */

  private addGlassEffectSection(y: number): number {
    y = this.addSubheading(y, "GLASS EFFECT & CHAMFER");

    const { glass, chamfer, panel } = this.theme;

    // Visual demo — panel with labelled effects
    const demoPanel = new Panel(this, {
      x: 60,
      y,
      width: 350,
      height: 180,
      title: "Glass Effect Demo",
    });
    this.scrollContainer.add(demoPanel);

    // Annotate config values
    const configLabels = [
      `glass.bgAlpha: ${glass.bgAlpha}`,
      `glass.topTint: ${colorToString(glass.topTint)}`,
      `glass.bottomTint: ${colorToString(glass.bottomTint)}`,
      `glass.innerBorderAlpha: ${glass.innerBorderAlpha}`,
      `chamfer.size: ${chamfer.size}`,
      `panel.borderWidth: ${panel.borderWidth}`,
    ];

    let configY = y + 10;
    for (const text of configLabels) {
      const lbl = new Label(this, {
        x: 440,
        y: configY,
        text,
        style: "caption",
        color: this.theme.colors.textDim,
      });
      this.scrollContainer.add(lbl);
      configY += 18;
    }

    // Chamfer size comparison
    const chamferSizes = [0, 4, 8, 12, 16];
    let cx = 60;
    const chamferY = y + 200;

    const chamferTitle = new Label(this, {
      x: 60,
      y: chamferY - 20,
      text: "Chamfer size comparison (visual approximation):",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(chamferTitle);

    for (const size of chamferSizes) {
      const rect = this.add
        .rectangle(cx, chamferY, 80, 60, this.theme.colors.panelBg, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.theme.colors.panelBorder, 0.6);
      this.scrollContainer.add(rect);

      const lbl = new Label(this, {
        x: cx + 40,
        y: chamferY + 66,
        text: `${size}px`,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      cx += 100;
    }

    return chamferY + 90;
  }

  /* ── 21. Animation Timing Guide ───────────────────────────── */

  private addAnimationTimingSection(y: number): number {
    y = this.addSubheading(y, "ANIMATION / AMBIENT TIMING");

    const ambient = this.theme.ambient;
    const timings: Array<{ name: string; value: number; unit?: string }> = [
      {
        name: "starTwinkleDurationMin",
        value: ambient.starTwinkleDurationMin,
        unit: "ms",
      },
      {
        name: "starTwinkleDurationMax",
        value: ambient.starTwinkleDurationMax,
        unit: "ms",
      },
      {
        name: "starShimmerDuration",
        value: ambient.starShimmerDuration,
        unit: "ms",
      },
      {
        name: "routePulseDuration",
        value: ambient.routePulseDuration,
        unit: "ms",
      },
      {
        name: "routePulseAlphaMin",
        value: ambient.routePulseAlphaMin,
      },
      {
        name: "routePulseAlphaMax",
        value: ambient.routePulseAlphaMax,
      },
      {
        name: "routeFlowDuration",
        value: ambient.routeFlowDuration,
        unit: "ms",
      },
      {
        name: "panelIdlePulseDuration",
        value: ambient.panelIdlePulseDuration,
        unit: "ms",
      },
      {
        name: "buttonIdleShimmerDuration",
        value: ambient.buttonIdleShimmerDuration,
        unit: "ms",
      },
      {
        name: "orbitalRotationDuration",
        value: ambient.orbitalRotationDuration,
        unit: "ms",
      },
    ];

    const colWidth = 360;
    let col = 0;
    const startY = y;
    let currentY = y;
    let maxY = y;

    for (let i = 0; i < timings.length; i++) {
      const { name, value, unit } = timings[i];
      const cx = 60 + col * colWidth;
      const display = unit ? `${value}${unit}` : `${value}`;

      const lbl = new Label(this, {
        x: cx,
        y: currentY,
        text: `${name}: ${display}`,
        style: "caption",
        color: this.theme.colors.textDim,
      });
      this.scrollContainer.add(lbl);

      currentY += 20;
      if (currentY > maxY) maxY = currentY;

      // Split into two columns
      if (i === 4) {
        col = 1;
        currentY = startY;
      }
    }

    return maxY + 20;
  }

  /* ── 22. StatRow Widget ───────────────────────────────────── */

  private addStatRowSection(y: number): number {
    y = this.addSubheading(y, "STAT ROW WIDGET");

    const rows: Array<{
      label: string;
      value: string;
      valueColor?: number;
      compact?: boolean;
    }> = [
      { label: "Credits", value: "$12,450" },
      {
        label: "Fuel Level",
        value: "85%",
        valueColor: this.theme.colors.profit,
      },
      {
        label: "Risk Factor",
        value: "HIGH",
        valueColor: this.theme.colors.loss,
      },
      { label: "Distance", value: "42 LY", compact: true },
      {
        label: "Profit Margin",
        value: "+18.5%",
        valueColor: this.theme.colors.profit,
        compact: true,
      },
    ];

    for (const cfg of rows) {
      const row = new StatRow(this, {
        x: 60,
        y,
        width: 400,
        ...cfg,
      });
      // Re-parent into scroll container
      this.children.remove(row);
      this.scrollContainer.add(row);
      y += row.rowHeight + 4;
    }

    const desc = new Label(this, {
      x: 500,
      y: y - 80,
      text: "StatRow\n• Key→value with leader line\n• Optional color override\n• Compact mode for dense layouts\n• Used in InfoCard, HUD, and\n  detail panels",
      style: "caption",
      color: this.theme.colors.textDim,
      maxWidth: 300,
    });
    this.scrollContainer.add(desc);

    return y + 20;
  }

  /* ── 23. InfoCard Widget ──────────────────────────────────── */

  private addInfoCardSection(y: number): number {
    y = this.addSubheading(y, "INFO CARD WIDGET");

    // Standard card
    const card1 = new InfoCard(this, {
      x: 60,
      y,
      width: 280,
      title: "Solara Prime",
      stats: [
        { label: "Population", value: "2.4M" },
        { label: "Economy", value: "Industrial" },
        {
          label: "Trade Volume",
          value: "$450K",
          valueColor: this.theme.colors.profit,
        },
        { label: "Tax Rate", value: "12%" },
      ],
      description:
        "A thriving industrial world with significant mining operations and growing trade networks.",
    });
    this.children.remove(card1);
    this.scrollContainer.add(card1);

    // Compact card
    const card2 = new InfoCard(this, {
      x: 380,
      y,
      width: 240,
      title: "Ship Status",
      stats: [
        { label: "Hull", value: "92%", valueColor: this.theme.colors.profit },
        { label: "Fuel", value: "45%", valueColor: this.theme.colors.warning },
        { label: "Cargo", value: "8/12" },
        { label: "Speed", value: "3.2 LY/turn" },
      ],
      compact: true,
    });
    this.children.remove(card2);
    this.scrollContainer.add(card2);

    // Danger-themed card
    const card3 = new InfoCard(this, {
      x: 660,
      y,
      width: 260,
      title: "⚠ Risk Alert",
      stats: [
        {
          label: "Pirate Threat",
          value: "HIGH",
          valueColor: this.theme.colors.loss,
        },
        {
          label: "Hull Damage",
          value: "34%",
          valueColor: this.theme.colors.loss,
        },
        {
          label: "Escape Route",
          value: "Available",
          valueColor: this.theme.colors.profit,
        },
      ],
      description: "Hostile territory ahead. Proceed with caution.",
    });
    this.children.remove(card3);
    this.scrollContainer.add(card3);

    const maxH = Math.max(card1.cardHeight, card2.cardHeight, card3.cardHeight);
    return y + maxH + 20;
  }

  /* ── 24. IconButton Widget ────────────────────────────────── */

  private addIconButtonSection(y: number): number {
    y = this.addSubheading(y, "ICON BUTTON WIDGET");

    const icons = [
      { icon: "icon-map", label: "Map" },
      { icon: "icon-fleet", label: "Fleet" },
      { icon: "icon-routes", label: "Routes" },
      { icon: "icon-finance", label: "Finance" },
      { icon: "icon-market", label: "Market" },
    ];

    // Row 1: Icon-only buttons
    let x = 60;
    const row1Label = new Label(this, {
      x,
      y: y - 2,
      text: "Icon-only:",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(row1Label);
    x = 160;

    for (let i = 0; i < icons.length; i++) {
      const btn = new IconButton(this, {
        x,
        y,
        icon: icons[i].icon,
        active: i === 0,
        onClick: () => {
          new FloatingText(
            this,
            x + 20,
            y - 10 - this.scrollY,
            icons[i].label,
            this.theme.colors.accent,
          );
        },
      });
      this.children.remove(btn);
      this.scrollContainer.add(btn);
      x += 50;
    }

    y += 50;

    // Row 2: Icon + label buttons
    x = 60;
    const row2Label = new Label(this, {
      x,
      y: y - 2,
      text: "With labels:",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(row2Label);
    x = 160;

    for (let i = 0; i < 3; i++) {
      const btn = new IconButton(this, {
        x,
        y,
        icon: icons[i].icon,
        label: icons[i].label,
        active: i === 1,
        onClick: () => {},
      });
      this.children.remove(btn);
      this.scrollContainer.add(btn);
      x += 140;
    }

    y += 50;

    // Row 3: Disabled
    x = 60;
    const row3Label = new Label(this, {
      x,
      y: y - 2,
      text: "Disabled:",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(row3Label);

    const disabledBtn = new IconButton(this, {
      x: 160,
      y,
      icon: "icon-end-turn",
      label: "End Turn",
      disabled: true,
      onClick: () => {},
    });
    this.children.remove(disabledBtn);
    this.scrollContainer.add(disabledBtn);

    return y + 50;
  }

  /* ── 25. Status Badge Widget ──────────────────────────────── */

  private addStatusBadgeSection(y: number): number {
    y = this.addSubheading(y, "STATUS BADGE WIDGET");

    const variants: Array<{
      text: string;
      variant: BadgeVariant;
      pulse?: boolean;
    }> = [
      { text: "Online", variant: "success" },
      { text: "In Transit", variant: "info" },
      { text: "Low Fuel", variant: "warning" },
      { text: "Critical", variant: "danger", pulse: true },
      { text: "Idle", variant: "neutral" },
    ];

    let x = 60;
    for (const cfg of variants) {
      const badge = new StatusBadge(this, {
        x,
        y,
        ...cfg,
      });
      this.children.remove(badge);
      this.scrollContainer.add(badge);

      const lbl = new Label(this, {
        x: x + badge.badgeWidth / 2,
        y: y + badge.badgeHeight + 6,
        text: cfg.variant,
        style: "caption",
        color: this.theme.colors.textDim,
      }).setOrigin(0.5, 0);
      this.scrollContainer.add(lbl);

      x += badge.badgeWidth + 20;
    }

    y += 50;

    // Contextual usage examples
    const usageLabel = new Label(this, {
      x: 60,
      y,
      text: "Contextual usage examples:",
      style: "caption",
      color: this.theme.colors.textDim,
    });
    this.scrollContainer.add(usageLabel);
    y += 20;

    const contextBadges: Array<{
      text: string;
      variant: BadgeVariant;
    }> = [
      { text: "Profit Streak", variant: "success" },
      { text: "Market Crash", variant: "danger" },
      { text: "Trade Route Active", variant: "info" },
      { text: "Fuel Warning", variant: "warning" },
      { text: "Docked", variant: "neutral" },
      { text: "Bonus Active", variant: "success" },
    ];

    x = 60;
    for (const cfg of contextBadges) {
      const badge = new StatusBadge(this, { x, y, ...cfg });
      this.children.remove(badge);
      this.scrollContainer.add(badge);
      x += badge.badgeWidth + 12;

      if (x > GAME_WIDTH - 200) {
        x = 60;
        y += 30;
      }
    }

    return y + 40;
  }

  /* ── Layout primitives (HSizer / VSizer / GridSizer / FixWidthSizer / Anchor) ─ */

  private addLayoutPrimitivesSection(y: number): number {
    y = this.addSubheading(y, "LAYOUT PRIMITIVES");

    const swatch = (
      w: number,
      h: number,
      color = this.theme.colors.accent,
    ): Phaser.GameObjects.Rectangle => {
      const r = this.add.rectangle(0, 0, w, h, color, 0.85).setOrigin(0, 0);
      r.setStrokeStyle(1, this.theme.colors.panelBorder, 0.8);
      return r;
    };

    // ── HSizer ──
    this.scrollContainer.add(
      new Label(this, {
        x: 60,
        y,
        text: "HSizer (gap=8, justify=space-between, align=center)",
        style: "caption",
        color: this.theme.colors.textDim,
      }),
    );
    y += 22;
    const hSizer = new HSizer(this, {
      x: 60,
      y,
      width: 600,
      height: 40,
      gap: 8,
      justify: "space-between",
      align: "center",
    });
    hSizer.add([swatch(80, 30), swatch(120, 30), swatch(60, 30)]);
    this.children.remove(hSizer);
    this.scrollContainer.add(hSizer);
    y += 60;

    // ── VSizer with flex ──
    this.scrollContainer.add(
      new Label(this, {
        x: 60,
        y,
        text: "VSizer (gap=6, align=stretch, child flex weights)",
        style: "caption",
        color: this.theme.colors.textDim,
      }),
    );
    y += 22;
    const vSizer = new VSizer(this, {
      x: 60,
      y,
      width: 200,
      height: 180,
      gap: 6,
      align: "stretch",
    });
    vSizer.add(swatch(0, 30), { flex: 0 });
    vSizer.add(swatch(0, 30, this.theme.colors.profit), { flex: 1 });
    vSizer.add(swatch(0, 30, this.theme.colors.warning), { flex: 2 });
    this.children.remove(vSizer);
    this.scrollContainer.add(vSizer);

    // ── GridSizer beside the VSizer ──
    this.scrollContainer.add(
      new Label(this, {
        x: 290,
        y: y - 22,
        text: "GridSizer (3 cols, colspan)",
        style: "caption",
        color: this.theme.colors.textDim,
      }),
    );
    const grid = new GridSizer(this, {
      x: 290,
      y,
      columns: 3,
      columnGap: 6,
      rowGap: 6,
    });
    grid.add(swatch(60, 40));
    grid.add(swatch(60, 40));
    grid.add(swatch(60, 40));
    grid.add(swatch(126, 40), { colspan: 2 });
    grid.add(swatch(60, 40));
    this.children.remove(grid);
    this.scrollContainer.add(grid);

    y += 200;

    // ── FixWidthSizer ──
    this.scrollContainer.add(
      new Label(this, {
        x: 60,
        y,
        text: "FixWidthSizer (wraps when overflowing the container)",
        style: "caption",
        color: this.theme.colors.textDim,
      }),
    );
    y += 22;
    const fix = new FixWidthSizer(this, {
      x: 60,
      y,
      width: 600,
      columnGap: 6,
      rowGap: 6,
    });
    for (let i = 0; i < 12; i++) {
      const w = 60 + ((i * 17) % 80);
      fix.add(
        swatch(
          w,
          24,
          i % 2 === 0
            ? this.theme.colors.accent
            : this.theme.colors.accentHover,
        ),
      );
    }
    this.children.remove(fix);
    this.scrollContainer.add(fix);
    y += fix.getContentSize().height + 20;

    // ── Anchor ──
    this.scrollContainer.add(
      new Label(this, {
        x: 60,
        y,
        text: "Anchor (pin a child to a corner of a 600x120 frame, fill=horizontal)",
        style: "caption",
        color: this.theme.colors.textDim,
      }),
    );
    y += 22;

    const frame = this.add
      .rectangle(60, y, 600, 120, this.theme.colors.panelBg, 0.4)
      .setOrigin(0, 0);
    frame.setStrokeStyle(1, this.theme.colors.panelBorder, 0.7);
    this.scrollContainer.add(frame);

    const anchored = swatch(0, 24, this.theme.colors.profit);
    const anchor = new Anchor(this, {
      to: "bottom",
      fill: "horizontal",
      insets: 8,
      parentWidth: 600,
      parentHeight: 120,
    });
    anchor.x = 60;
    anchor.y = y;
    anchor.add(anchored);
    this.children.remove(anchor);
    this.scrollContainer.add(anchor);

    y += 140;
    return y;
  }
}
