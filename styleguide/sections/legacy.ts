import * as Phaser from "phaser";
import {
  getTheme,
  colorToString,
  Panel,
  Button,
  Label,
  Modal,
  Tooltip,
  ProgressBar,
  ScrollableList,
  TabGroup,
  DataTable,
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
  HUD_TOP_BAR_HEIGHT,
  HUD_BOTTOM_BAR_HEIGHT,
  NAV_SIDEBAR_WIDTH,
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_CONTENT_WIDTH,
  SIDEBAR_WIDTH,
  CONTENT_GAP,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  CONTENT_LEFT,
  SIDEBAR_LEFT,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
  FULL_CONTENT_LEFT,
  FULL_CONTENT_WIDTH,
  DEPTH_STARFIELD,
  DEPTH_AMBIENT_MID,
  DEPTH_CONTENT,
  DEPTH_UI,
  DEPTH_MODAL,
  DEPTH_HUD,
  CARGO_TYPE_LIST,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
} from "@spacebiz/ui";
import type { ColumnDef, BadgeVariant } from "@spacebiz/ui";
import type { StyleguideSection } from "../sectionGrouping.ts";
import type { KnobValues } from "../knobs/index.ts";
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

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

const colorPalette: StyleguideSection = {
  id: "color-palette",
  title: "Color Palette",
  category: "Tokens",
  render: (scene, root) => {
    const theme = getTheme();
    const colors = theme.colors;
    const swatches: Array<[string, number]> = [
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

    const cols = 5;
    const swatchW = 140;
    const swatchH = 50;
    const gap = 10;

    for (let i = 0; i < swatches.length; i++) {
      const [name, value] = swatches[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = col * (swatchW + gap);
      const sy = row * (swatchH + 24 + gap);
      const rect = scene.add
        .rectangle(sx, sy, swatchW, swatchH, value, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
      root.add(rect);
      const lbl = scene.add
        .text(sx, sy + swatchH + 4, `${name}\n${colorToString(value)}`, {
          fontFamily: theme.fonts.caption.family,
          fontSize: `${theme.fonts.caption.size}px`,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0, 0);
      root.add(lbl);
    }
  },
};

const typography: StyleguideSection = {
  id: "typography",
  title: "Typography",
  category: "Tokens",
  knobs: [
    {
      type: "boolean",
      id: "glow",
      label: "Glow heading",
      default: true,
    },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
    let y = 0;
    const styles: Array<{
      style: "heading" | "body" | "caption" | "value";
      sample: string;
    }> = [
      { style: "heading", sample: "Heading – 24px Bold" },
      { style: "body", sample: "Body – 16px Regular" },
      { style: "caption", sample: "Caption – 12px (dimmed)" },
      { style: "value", sample: "Value – 18px Bold (accent)" },
    ];
    for (const { style, sample } of styles) {
      root.add(new Label(scene, { x: 0, y, text: sample, style }));
      y += 36;
    }
    root.add(
      new Label(scene, {
        x: 0,
        y,
        text: "Heading with knob-controlled glow",
        style: "heading",
        color: theme.colors.accent,
        glow: Boolean(knobs["glow"]),
      }),
    );
    y += 36;
    const colorExamples: Array<[string, number]> = [
      ["Profit label", theme.colors.profit],
      ["Loss label", theme.colors.loss],
      ["Warning label", theme.colors.warning],
    ];
    for (const [text, color] of colorExamples) {
      root.add(new Label(scene, { x: 0, y, text, style: "body", color }));
      y += 28;
    }
  },
};

const buttons: StyleguideSection = {
  id: "buttons",
  title: "Buttons",
  category: "Primitives",
  knobs: [
    {
      type: "boolean",
      id: "disabled",
      label: "Disable second button",
      default: false,
    },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
    const configs: Array<{ label: string; disabled?: boolean }> = [
      { label: "Primary Action" },
      { label: "Hover Me", disabled: Boolean(knobs["disabled"]) },
      { label: "Always Disabled", disabled: true },
    ];
    let x = 0;
    for (const cfg of configs) {
      const btn = new Button(scene, {
        x,
        y: 0,
        label: cfg.label,
        disabled: cfg.disabled,
        onClick: () => {
          new FloatingText(scene, x + 20, 0, "Click!", theme.colors.profit);
        },
      });
      root.add(btn);
      x += btn.width + 20;
    }
    const sizeConfigs = ["Short", "A Much Longer Label Here"];
    x = 0;
    for (const label of sizeConfigs) {
      const btn = new Button(scene, {
        x,
        y: 60,
        label,
        autoWidth: true,
        onClick: () => {},
      });
      root.add(btn);
      x += btn.width + 20;
    }
  },
};

const panels: StyleguideSection = {
  id: "panels",
  title: "Panels",
  category: "Primitives",
  knobs: [
    {
      type: "boolean",
      id: "active",
      label: "Activate centre panel",
      default: false,
    },
  ],
  render: (scene, root, knobs) => {
    const p1 = new Panel(scene, {
      x: 0,
      y: 0,
      width: 300,
      height: 160,
      title: "Standard Panel",
    });
    root.add(p1);
    root.add(
      new Label(scene, {
        x: 16,
        y: p1.getContentY() + 10,
        text: "Panel with title bar,\nchamfered border, and\nidle pulse glow.",
        style: "body",
      }),
    );

    const p2 = new Panel(scene, {
      x: 320,
      y: 0,
      width: 280,
      height: 160,
    });
    root.add(p2);
    root.add(
      new Label(scene, {
        x: 336,
        y: 20,
        text: "Panel without title.",
        style: "body",
      }),
    );

    const p3 = new Panel(scene, {
      x: 620,
      y: 0,
      width: 280,
      height: 160,
      title: "Active Panel",
    });
    p3.setActive(Boolean(knobs["active"]));
    root.add(p3);
    root.add(
      new Label(scene, {
        x: 636,
        y: p3.getContentY() + 10,
        text: "Toggle 'active'\nin the knobs panel.",
        style: "body",
      }),
    );
  },
};

const progressBars: StyleguideSection = {
  id: "progress-bars",
  title: "Progress Bars",
  category: "Primitives",
  knobs: [
    {
      type: "number",
      id: "value",
      label: "Animated value",
      default: 60,
      min: 0,
      max: 100,
      step: 1,
    },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
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
        fillColor: theme.colors.profit,
      },
      {
        label: "Warning (20/100)",
        value: 20,
        maxValue: 100,
        fillColor: theme.colors.warning,
      },
      {
        label: "Loss (8/100)",
        value: 8,
        maxValue: 100,
        fillColor: theme.colors.loss,
      },
    ];
    let y = 0;
    for (const cfg of configs) {
      root.add(
        new Label(scene, {
          x: 0,
          y,
          text: cfg.label,
          style: "caption",
        }),
      );
      root.add(
        new ProgressBar(scene, {
          x: 0,
          y: y + 18,
          width: 400,
          height: 18,
          value: cfg.value,
          maxValue: cfg.maxValue,
          fillColor: cfg.fillColor,
        }),
      );
      y += 52;
    }

    root.add(
      new Label(scene, {
        x: 0,
        y,
        text: "Knob-driven value:",
        style: "caption",
      }),
    );
    root.add(
      new ProgressBar(scene, {
        x: 0,
        y: y + 18,
        width: 400,
        height: 22,
        value: Number(knobs["value"]),
        maxValue: 100,
      }),
    );
  },
};

const scrollableList: StyleguideSection = {
  id: "scrollable-list",
  title: "Scrollable List",
  category: "Composites",
  render: (scene, root) => {
    const list = new ScrollableList(scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      itemHeight: 36,
    });
    root.add(list);
    for (let i = 0; i < 20; i++) {
      const row = scene.add.container(0, 0);
      row.add(
        new Label(scene, {
          x: 16,
          y: 8,
          text: `Item ${i + 1} — Sample list entry`,
          style: "body",
        }),
      );
      list.addItem(row);
    }
    root.add(
      new Label(scene, {
        x: 420,
        y: 10,
        text: "ScrollableList\n• Wheel scroll\n• Click to select\n• Keyboard nav\n• Geometry mask",
        style: "caption",
        maxWidth: 280,
      }),
    );
  },
};

const tabGroup: StyleguideSection = {
  id: "tab-group",
  title: "Tab Group",
  category: "Composites",
  render: (scene, root) => {
    const buildTab = (text: string): Phaser.GameObjects.Container => {
      const c = scene.add.container(0, 0);
      c.add(new Label(scene, { x: 16, y: 16, text, style: "body" }));
      return c;
    };
    root.add(
      new TabGroup(scene, {
        x: 0,
        y: 0,
        width: 600,
        tabs: [
          { label: "Overview", content: buildTab("Content for Tab 1") },
          { label: "Details", content: buildTab("Content for Tab 2") },
          { label: "Settings", content: buildTab("Content for Tab 3") },
        ],
      }),
    );
  },
};

const dataTable: StyleguideSection = {
  id: "data-table",
  title: "Data Table",
  category: "Composites",
  render: (scene, root) => {
    const theme = getTheme();
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
            ? theme.colors.profit
            : n < 0
              ? theme.colors.loss
              : theme.colors.textDim;
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
        commodity: "Fuel",
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
        commodity: "Luxury",
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
        commodity: "Metals",
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
    const table = new DataTable(scene, {
      x: 0,
      y: 0,
      width: 560,
      height: 260,
      columns,
    });
    table.setRows(rows);
    root.add(table);
  },
};

const tooltips: StyleguideSection = {
  id: "tooltips",
  title: "Tooltips",
  category: "Composites",
  render: (scene, root) => {
    const tooltip = new Tooltip(scene);
    root.add(tooltip);
    const targets: Array<{ label: string; tip: string }> = [
      { label: "Hover for info", tip: "Standard tooltip.\nAuto-positions." },
      { label: "Another tooltip", tip: "Multi-line text\nand delay support." },
      { label: "Short tip", tip: "Quick info." },
    ];
    let x = 0;
    for (const { label, tip } of targets) {
      const btn = new Button(scene, {
        x,
        y: 0,
        label,
        autoWidth: true,
        onClick: () => {},
      });
      root.add(btn);
      tooltip.attachTo(btn, tip);
      x += btn.width + 24;
    }
  },
};

const floatingText: StyleguideSection = {
  id: "floating-text",
  title: "Floating Text",
  category: "Feedback",
  render: (scene, root) => {
    const theme = getTheme();
    const sizes: Array<"small" | "medium" | "large" | "huge"> = [
      "small",
      "medium",
      "large",
      "huge",
    ];
    let x = 0;
    for (const size of sizes) {
      const btn = new Button(scene, {
        x,
        y: 0,
        label: size,
        onClick: () => {
          new FloatingText(
            scene,
            root.x + x + 40,
            root.y + 20,
            `+$${Math.floor(Math.random() * 999)}`,
            theme.colors.profit,
            { size },
          );
        },
      });
      root.add(btn);
      x += 140;
    }
  },
};

const ambientFx: StyleguideSection = {
  id: "ambient-fx",
  title: "Ambient FX",
  category: "Feedback",
  render: (scene, root) => {
    const theme = getTheme();
    const tweens: Phaser.Tweens.Tween[] = [];
    const pulse = scene.add.circle(0, 20, 16, theme.colors.accent, 0.8);
    root.add(pulse);
    tweens.push(
      addPulseTween(scene, pulse, {
        minAlpha: 0.3,
        maxAlpha: 1,
        duration: theme.ambient.panelIdlePulseDuration,
      }),
    );
    root.add(
      new Label(scene, {
        x: 30,
        y: 10,
        text: "addPulseTween",
        style: "caption",
      }),
    );

    const twinkle = scene.add.circle(200, 20, 16, theme.colors.profit, 0.8);
    root.add(twinkle);
    tweens.push(
      addTwinkleTween(scene, twinkle, {
        minAlpha: 0.3,
        maxAlpha: 1,
        minDuration: theme.ambient.starTwinkleDurationMin,
        maxDuration: theme.ambient.starTwinkleDurationMax,
      }),
    );
    root.add(
      new Label(scene, {
        x: 230,
        y: 10,
        text: "addTwinkleTween",
        style: "caption",
      }),
    );

    const float = scene.add.circle(420, 20, 16, theme.colors.warning, 0.8);
    root.add(float);
    tweens.push(addFloatTween(scene, float, { dx: 5, dy: -8, duration: 4000 }));
    root.add(
      new Label(scene, {
        x: 450,
        y: 10,
        text: "addFloatTween",
        style: "caption",
      }),
    );

    registerAmbientCleanup(scene, tweens);

    const flashBtn = new Button(scene, {
      x: 620,
      y: 8,
      label: "flashScreen()",
      onClick: () => flashScreen(scene, 0xffffff),
    });
    root.add(flashBtn);
  },
};

const milestones: StyleguideSection = {
  id: "milestones",
  title: "Milestones",
  category: "Feedback",
  render: (scene, root) => {
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
    let x = 0;
    let y = 0;
    for (const { type, label } of types) {
      const btn = new Button(scene, {
        x,
        y,
        label,
        onClick: () => {
          MilestoneOverlay.show(
            scene,
            type,
            label,
            "Subtitle text",
            undefined,
            {
              holdDuration: 4000,
            },
          );
        },
      });
      root.add(btn);
      x += btn.width + 12;
      if (x > 600) {
        x = 0;
        y += 50;
      }
    }
  },
};

const modals: StyleguideSection = {
  id: "modals",
  title: "Modals",
  category: "Feedback",
  render: (scene, root) => {
    const theme = getTheme();
    root.add(
      new Button(scene, {
        x: 0,
        y: 0,
        autoWidth: true,
        label: "Open Confirm Modal",
        onClick: () => {
          new Modal(scene, {
            title: "Confirm Action",
            body: "Are you sure?\nThis cannot be undone.",
            okText: "Confirm",
            cancelText: "Cancel",
            onOk: () =>
              new FloatingText(
                scene,
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                "Confirmed!",
                theme.colors.profit,
              ),
          }).show();
        },
      }),
    );
    root.add(
      new Button(scene, {
        x: 220,
        y: 0,
        autoWidth: true,
        label: "Open Info Modal",
        onClick: () => {
          new Modal(scene, {
            title: "Information",
            body: "Informational modal\nwith only OK.",
            okText: "Got it",
          }).show();
        },
      }),
    );
  },
};

const iconGallery: StyleguideSection = {
  id: "icons",
  title: "Icon Gallery",
  category: "Assets",
  render: (scene, root) => {
    const theme = getTheme();
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
    let x = 0;
    for (const { key, label } of icons) {
      const bg = scene.add
        .rectangle(x, 0, 56, 56, theme.colors.panelBg, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.4);
      root.add(bg);
      const img = scene.add
        .image(x + 28, 28, key)
        .setOrigin(0.5)
        .setTint(theme.colors.accent);
      root.add(img);
      root.add(
        new Label(scene, {
          x: x + 28,
          y: 62,
          text: label,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += 80;
    }
  },
};

const cargoIcons: StyleguideSection = {
  id: "cargo-icons",
  title: "Cargo Icons",
  category: "Assets",
  render: (scene, root) => {
    const theme = getTheme();
    let x = 0;
    for (const ct of CARGO_TYPE_LIST) {
      const color = getCargoColor(ct);
      const label = getCargoLabel(ct);
      const key = getCargoIconKey(ct);
      const bg = scene.add
        .rectangle(x, 0, 56, 56, theme.colors.panelBg, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.4);
      root.add(bg);
      const img = scene.add
        .image(x + 28, 28, key)
        .setOrigin(0.5)
        .setTint(color);
      root.add(img);
      root.add(
        new Label(scene, {
          x: x + 28,
          y: 62,
          text: label,
          style: "caption",
          color,
        }).setOrigin(0.5, 0),
      );
      x += 90;
    }
  },
};

const hudBar: StyleguideSection = {
  id: "hud-bar",
  title: "HUD Bar & Dividers",
  category: "Assets",
  render: (scene, root) => {
    const theme = getTheme();
    const barW = 600;
    root.add(
      scene.add
        .nineslice(0, 0, "hud-bar-bg", undefined, barW, 48, 10, 10, 10, 10)
        .setOrigin(0, 0),
    );
    root.add(
      new Label(scene, {
        x: barW / 2,
        y: 14,
        text: "hud-bar-bg (NineSlice)",
        style: "caption",
        color: theme.colors.textDim,
      }).setOrigin(0.5, 0),
    );
    root.add(
      scene.add
        .nineslice(0, 60, "divider-h", undefined, 400, 4, 2, 2, 0, 0)
        .setOrigin(0, 0),
    );
    const layoutInfo = [
      `HUD_TOP_BAR_HEIGHT: ${HUD_TOP_BAR_HEIGHT}`,
      `HUD_BOTTOM_BAR_HEIGHT: ${HUD_BOTTOM_BAR_HEIGHT}`,
      `NAV_SIDEBAR_WIDTH: ${NAV_SIDEBAR_WIDTH}`,
    ];
    let y = 80;
    for (const info of layoutInfo) {
      root.add(
        new Label(scene, {
          x: 0,
          y,
          text: info,
          style: "caption",
          color: theme.colors.textDim,
        }),
      );
      y += 18;
    }
  },
};

const adviserPortrait: StyleguideSection = {
  id: "adviser-portrait",
  title: "Adviser Portrait",
  category: "Game UI",
  knobs: [
    {
      type: "select",
      id: "mood",
      label: "Highlight mood",
      default: "standby",
      options: [
        { value: "standby", label: "Standby" },
        { value: "analyzing", label: "Analyzing" },
        { value: "alert", label: "Alert" },
        { value: "success", label: "Success" },
      ],
    },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
    const moods: AdviserMood[] = ["standby", "analyzing", "alert", "success"];
    const portraitSize = 128;
    const highlight = String(knobs["mood"]);
    let x = 0;
    for (const mood of moods) {
      const g = scene.add.graphics();
      g.setPosition(x, 0);
      drawRexPortrait(g, portraitSize, portraitSize, mood);
      root.add(g);
      const accentColor = getMoodAccentColor(mood);
      const isHighlighted = mood === highlight;
      const border = scene.add
        .rectangle(x, 0, portraitSize, portraitSize)
        .setOrigin(0, 0)
        .setStrokeStyle(
          isHighlighted ? 4 : 2,
          accentColor,
          isHighlighted ? 1 : 0.6,
        );
      border.isFilled = false;
      root.add(border);
      root.add(
        new Label(scene, {
          x: x + portraitSize / 2,
          y: portraitSize + 6,
          text: mood,
          style: "caption",
          color: accentColor,
        }).setOrigin(0.5, 0),
      );
      root.add(
        new Label(scene, {
          x: x + portraitSize / 2,
          y: portraitSize + 22,
          text: colorToString(accentColor),
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += portraitSize + 24;
    }
  },
};

const portraitGallery: StyleguideSection = {
  id: "portrait-gallery",
  title: "Portrait Gallery",
  category: "Game UI",
  knobs: [
    {
      type: "number",
      id: "seed",
      label: "Seed",
      default: 42,
      min: 1,
      max: 200,
      step: 1,
    },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
    const size = 96;
    const gap = 16;
    const seed = Number(knobs["seed"]);
    let y = 0;

    root.add(
      new Label(scene, {
        x: 0,
        y,
        text: "Planets",
        style: "body",
        color: theme.colors.text,
      }),
    );
    y += 24;
    const planetTypes: Array<{ label: string; planetType: string }> = [
      { label: "Terran", planetType: "terran" },
      { label: "Mining", planetType: "mining" },
      { label: "Agri", planetType: "agricultural" },
      { label: "Industrial", planetType: "industrial" },
      { label: "Hub", planetType: "hubStation" },
      { label: "Resort", planetType: "resort" },
      { label: "Research", planetType: "research" },
    ];
    let x = 0;
    for (const { label, planetType } of planetTypes) {
      const g = scene.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, "planet", size, size, seed, {
        planetType: planetType as "terran",
      });
      root.add(g);
      root.add(
        new Label(scene, {
          x: x + size / 2,
          y: y + size + 4,
          text: label,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += size + gap;
    }
    y += size + 34;

    root.add(
      new Label(scene, {
        x: 0,
        y,
        text: "Ships / Systems / Events",
        style: "body",
        color: theme.colors.text,
      }),
    );
    y += 24;
    const otherTypes: Array<{
      label: string;
      type: "ship" | "system" | "event";
      data?: PortraitData;
    }> = [
      { label: "Shuttle", type: "ship", data: { shipClass: "cargoShuttle" } },
      {
        label: "Freighter",
        type: "ship",
        data: { shipClass: "bulkFreighter" },
      },
      { label: "Hauler", type: "ship", data: { shipClass: "mixedHauler" } },
      {
        label: "System",
        type: "system",
        data: { starColor: 0xffd700, planetCount: 5 },
      },
      { label: "Market evt", type: "event", data: { eventCategory: "market" } },
      { label: "Hazard evt", type: "event", data: { eventCategory: "hazard" } },
    ];
    x = 0;
    for (const item of otherTypes) {
      const g = scene.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, item.type, size, size, seed, item.data);
      root.add(g);
      root.add(
        new Label(scene, {
          x: x + size / 2,
          y: y + size + 4,
          text: item.label,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += size + gap;
    }
    y += size + 34;

    root.add(
      new Label(scene, {
        x: 0,
        y,
        text: "Aliens",
        style: "body",
        color: theme.colors.text,
      }),
    );
    y += 24;
    const alienRoles: AlienRole[] = [
      "broker",
      "miner",
      "researcher",
      "concierge",
      "enforcer",
    ];
    x = 0;
    for (const role of alienRoles) {
      const g = scene.add.graphics();
      g.setPosition(x, y);
      drawPortrait(g, "alien", size, size, seed, { alienRole: role });
      root.add(g);
      root.add(
        new Label(scene, {
          x: x + size / 2,
          y: y + size + 4,
          text: role,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += size + gap;
    }
  },
};

const spacingLayout: StyleguideSection = {
  id: "spacing-layout",
  title: "Spacing & Layout",
  category: "Tokens",
  render: (scene, root) => {
    const theme = getTheme();
    const spacingTokens: Array<{ name: string; value: number }> = [
      { name: "xs", value: theme.spacing.xs },
      { name: "sm", value: theme.spacing.sm },
      { name: "md", value: theme.spacing.md },
      { name: "lg", value: theme.spacing.lg },
      { name: "xl", value: theme.spacing.xl },
    ];
    let x = 0;
    for (const { name, value } of spacingTokens) {
      const block = scene.add
        .rectangle(x, 0, value, value, theme.colors.accent, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, theme.colors.accent, 0.8);
      root.add(block);
      root.add(
        new Label(scene, {
          x: x + Math.max(value, 20) / 2,
          y: Math.max(value, 4) + 8,
          text: `${name}\n${value}px`,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0),
      );
      x += Math.max(value, 30) + 30;
    }
    let y = 70;
    const layoutConstants: Array<[string, number]> = [
      ["GAME_WIDTH", GAME_WIDTH],
      ["GAME_HEIGHT", GAME_HEIGHT],
      ["MAX_CONTENT_WIDTH", MAX_CONTENT_WIDTH],
      ["SIDEBAR_WIDTH", SIDEBAR_WIDTH],
      ["CONTENT_GAP", CONTENT_GAP],
      ["NAV_SIDEBAR_WIDTH", NAV_SIDEBAR_WIDTH],
      ["CONTENT_TOP", CONTENT_TOP],
      ["CONTENT_HEIGHT", CONTENT_HEIGHT],
      ["CONTENT_LEFT", CONTENT_LEFT],
      ["SIDEBAR_LEFT", SIDEBAR_LEFT],
      ["MAIN_CONTENT_LEFT", MAIN_CONTENT_LEFT],
      ["MAIN_CONTENT_WIDTH", MAIN_CONTENT_WIDTH],
      ["FULL_CONTENT_LEFT", FULL_CONTENT_LEFT],
      ["FULL_CONTENT_WIDTH", FULL_CONTENT_WIDTH],
    ];
    const colW = 260;
    for (let i = 0; i < layoutConstants.length; i++) {
      const [name, value] = layoutConstants[i];
      const col = Math.floor(i / 7);
      const row = i % 7;
      root.add(
        new Label(scene, {
          x: col * colW,
          y: y + row * 18,
          text: `${name}: ${value}`,
          style: "caption",
          color: theme.colors.textDim,
        }),
      );
    }
  },
};

const depthLayers: StyleguideSection = {
  id: "depth-layers",
  title: "Depth Layers",
  category: "Tokens",
  render: (scene, root) => {
    const theme = getTheme();
    const layers: Array<{ name: string; value: number; color: number }> = [
      { name: "DEPTH_STARFIELD", value: DEPTH_STARFIELD, color: 0x335577 },
      { name: "DEPTH_AMBIENT_MID", value: DEPTH_AMBIENT_MID, color: 0x557799 },
      { name: "DEPTH_CONTENT", value: DEPTH_CONTENT, color: theme.colors.text },
      { name: "DEPTH_UI", value: DEPTH_UI, color: theme.colors.accent },
      { name: "DEPTH_MODAL", value: DEPTH_MODAL, color: theme.colors.warning },
      { name: "DEPTH_HUD", value: DEPTH_HUD, color: theme.colors.profit },
    ];
    const barMaxW = 500;
    const barH = 24;
    const maxDepth = DEPTH_HUD;
    let y = 0;
    for (const { name, value, color } of layers) {
      const normalised =
        value <= 0
          ? 20
          : Math.max(
              20,
              (Math.log10(value + 1) / Math.log10(maxDepth + 1)) * barMaxW,
            );
      root.add(
        scene.add
          .rectangle(0, y, normalised, barH, color, 0.5)
          .setOrigin(0, 0)
          .setStrokeStyle(1, color, 0.7),
      );
      root.add(
        new Label(scene, {
          x: 10 + normalised,
          y: y + 4,
          text: `${name} = ${value}`,
          style: "caption",
          color,
        }),
      );
      y += barH + 8;
    }
  },
};

const statRow: StyleguideSection = {
  id: "stat-row",
  title: "Stat Row",
  category: "Composites",
  render: (scene, root) => {
    const theme = getTheme();
    const rows: Array<{
      label: string;
      value: string;
      valueColor?: number;
      compact?: boolean;
    }> = [
      { label: "Credits", value: "$12,450" },
      { label: "Fuel Level", value: "85%", valueColor: theme.colors.profit },
      { label: "Risk Factor", value: "HIGH", valueColor: theme.colors.loss },
      { label: "Distance", value: "42 LY", compact: true },
      {
        label: "Profit Margin",
        value: "+18.5%",
        valueColor: theme.colors.profit,
        compact: true,
      },
    ];
    let y = 0;
    for (const cfg of rows) {
      const row = new StatRow(scene, { x: 0, y, width: 400, ...cfg });
      scene.children.remove(row);
      root.add(row);
      y += row.rowHeight + 4;
    }
  },
};

const infoCard: StyleguideSection = {
  id: "info-card",
  title: "Info Card",
  category: "Composites",
  render: (scene, root) => {
    const theme = getTheme();
    const c1 = new InfoCard(scene, {
      x: 0,
      y: 0,
      width: 280,
      title: "Solara Prime",
      stats: [
        { label: "Population", value: "2.4M" },
        { label: "Economy", value: "Industrial" },
        {
          label: "Trade Volume",
          value: "$450K",
          valueColor: theme.colors.profit,
        },
      ],
      description: "Industrial world with growing trade networks.",
    });
    scene.children.remove(c1);
    root.add(c1);
    const c2 = new InfoCard(scene, {
      x: 320,
      y: 0,
      width: 240,
      title: "Ship Status",
      stats: [
        { label: "Hull", value: "92%", valueColor: theme.colors.profit },
        { label: "Fuel", value: "45%", valueColor: theme.colors.warning },
      ],
      compact: true,
    });
    scene.children.remove(c2);
    root.add(c2);
  },
};

const iconButton: StyleguideSection = {
  id: "icon-button",
  title: "Icon Button",
  category: "Primitives",
  render: (scene, root) => {
    const icons = [
      { icon: "icon-map", label: "Map" },
      { icon: "icon-fleet", label: "Fleet" },
      { icon: "icon-routes", label: "Routes" },
      { icon: "icon-finance", label: "Finance" },
    ];
    let x = 0;
    for (let i = 0; i < icons.length; i++) {
      const btn = new IconButton(scene, {
        x,
        y: 0,
        icon: icons[i].icon,
        active: i === 0,
        onClick: () => {},
      });
      scene.children.remove(btn);
      root.add(btn);
      x += 50;
    }
    x = 0;
    for (let i = 0; i < 3; i++) {
      const btn = new IconButton(scene, {
        x,
        y: 60,
        icon: icons[i].icon,
        label: icons[i].label,
        active: i === 1,
        onClick: () => {},
      });
      scene.children.remove(btn);
      root.add(btn);
      x += 140;
    }
  },
};

const statusBadge: StyleguideSection = {
  id: "status-badge",
  title: "Status Badge",
  category: "Primitives",
  render: (scene, root) => {
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
    let x = 0;
    for (const cfg of variants) {
      const badge = new StatusBadge(scene, { x, y: 0, ...cfg });
      scene.children.remove(badge);
      root.add(badge);
      x += badge.badgeWidth + 20;
    }
  },
};

export const legacySections: ReadonlyArray<StyleguideSection> = [
  colorPalette,
  typography,
  spacingLayout,
  depthLayers,
  buttons,
  panels,
  progressBars,
  iconButton,
  statusBadge,
  scrollableList,
  tabGroup,
  dataTable,
  tooltips,
  statRow,
  infoCard,
  floatingText,
  ambientFx,
  milestones,
  modals,
  iconGallery,
  cargoIcons,
  hudBar,
  adviserPortrait,
  portraitGallery,
];

// Mark `KnobValues` as referenced so unused-locals stays clean.
export type _Touch = KnobValues;
