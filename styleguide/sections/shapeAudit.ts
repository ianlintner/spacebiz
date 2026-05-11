import * as Phaser from "phaser";
import {
  getTheme,
  fillChamferedRect,
  strokeChamferedRect,
  Label,
} from "@spacebiz/ui";
import type { StyleguideSection } from "../sectionGrouping.ts";

/**
 * Shape Audit — visual reference for the unified chamfered language.
 *
 * Row 1: Containers  — chamfered 8px (Panel container, Modal/Card, Tooltip)
 * Row 2: Controls    — hard square   (Button, Input/Badge, ProgressBar)
 * Row 3: Portraits   — chamfered 6px (three Portrait frames)
 * Caption strip at bottom explains the rule.
 */
export const shapeAudit: StyleguideSection = {
  id: "shape-audit",
  title: "Shape Audit",
  category: "Tokens",
  render: (scene: Phaser.Scene, root: Phaser.GameObjects.Container) => {
    const theme = getTheme();

    const BOX_W = 160;
    const BOX_H = 90;
    const GAP = 24;
    const ROW_GAP = 56;

    // ── Helper: draw a chamfered box ─────────────────────────────────────────
    function drawChamfered(
      x: number,
      y: number,
      chamfer: number,
      borderWidth: number,
      label: string,
    ): void {
      const g = scene.add.graphics();
      g.fillStyle(theme.colors.panelBg, 1);
      fillChamferedRect(g, x, y, BOX_W, BOX_H, chamfer);
      g.lineStyle(borderWidth, theme.colors.panelBorder, 1);
      strokeChamferedRect(g, x, y, BOX_W, BOX_H, chamfer);
      root.add(g);

      root.add(
        new Label(scene, {
          x: x + BOX_W / 2,
          y: y + BOX_H / 2 - 8,
          text: label,
          style: "caption",
          color: theme.colors.text,
        }).setOrigin(0.5, 0.5),
      );

      root.add(
        new Label(scene, {
          x: x + BOX_W / 2,
          y: y + BOX_H / 2 + 8,
          text: `chamfer ${chamfer}px / border ${borderWidth}px`,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0.5),
      );
    }

    // ── Helper: draw a hard-square box ───────────────────────────────────────
    function drawSquare(
      x: number,
      y: number,
      borderWidth: number,
      label: string,
    ): void {
      const g = scene.add.graphics();
      g.fillStyle(theme.colors.panelBg, 1);
      g.fillRect(x, y, BOX_W, BOX_H);
      g.lineStyle(borderWidth, theme.colors.panelBorder, 1);
      g.strokeRect(x, y, BOX_W, BOX_H);
      root.add(g);

      root.add(
        new Label(scene, {
          x: x + BOX_W / 2,
          y: y + BOX_H / 2 - 8,
          text: label,
          style: "caption",
          color: theme.colors.text,
        }).setOrigin(0.5, 0.5),
      );

      root.add(
        new Label(scene, {
          x: x + BOX_W / 2,
          y: y + BOX_H / 2 + 8,
          text: `square / border ${borderWidth}px`,
          style: "caption",
          color: theme.colors.textDim,
        }).setOrigin(0.5, 0.5),
      );
    }

    // ── Row header helper ────────────────────────────────────────────────────
    function rowHeader(y: number, text: string): void {
      root.add(
        new Label(scene, {
          x: 0,
          y,
          text,
          style: "body",
          color: theme.colors.accent,
        }),
      );
    }

    // ── Row 1: Containers (chamfered 8px) ────────────────────────────────────
    const ROW1_Y = 20;
    rowHeader(0, "Row 1 — Containers (chamfered 8px)");

    const containers: Array<{ label: string; border: number }> = [
      { label: "Panel container", border: 2 },
      { label: "Modal / Card", border: 2 },
      { label: "Tooltip", border: 1 },
    ];
    containers.forEach(({ label, border }, i) => {
      drawChamfered(i * (BOX_W + GAP), ROW1_Y, 8, border, label);
    });

    // ── Row 2: Controls (hard square) ────────────────────────────────────────
    const ROW2_Y = ROW1_Y + BOX_H + ROW_GAP;
    rowHeader(ROW1_Y + BOX_H + ROW_GAP - 20, "Row 2 — Controls (square)");

    const controls: Array<{ label: string }> = [
      { label: "Button" },
      { label: "Input / Badge" },
      { label: "ProgressBar" },
    ];
    controls.forEach(({ label }, i) => {
      drawSquare(i * (BOX_W + GAP), ROW2_Y, 1, label);
    });

    // ── Row 3: Portrait frames (chamfered 6px) ───────────────────────────────
    const ROW3_Y = ROW2_Y + BOX_H + ROW_GAP;
    rowHeader(
      ROW2_Y + BOX_H + ROW_GAP - 20,
      "Row 3 — Portrait frames (chamfered 6px)",
    );

    for (let i = 0; i < 3; i++) {
      drawChamfered(i * (BOX_W + GAP), ROW3_Y, 6, 1, "Portrait");
    }

    // ── Caption strip ────────────────────────────────────────────────────────
    const CAPTION_Y = ROW3_Y + BOX_H + 16;
    root.add(
      new Label(scene, {
        x: 0,
        y: CAPTION_Y,
        text: "Containers: chamfered 8px  |  Controls: square  |  Portraits: chamfered 6px",
        style: "caption",
        color: theme.colors.textDim,
      }),
    );
  },
};
