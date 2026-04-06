import Phaser from "phaser";
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
} from "@spacebiz/ui";
import type { ThemeConfig, ColumnDef } from "@spacebiz/ui";

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
}
