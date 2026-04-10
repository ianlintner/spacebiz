import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
  options: DropdownOption[];
  defaultIndex?: number;
  onChange?: (value: string, index: number) => void;
  /** Font size override (default: theme body size) */
  fontSize?: number;
}

export class Dropdown extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private border: Phaser.GameObjects.Rectangle;
  private options: DropdownOption[];
  private selectedIndex: number;
  private dropdownOpen = false;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private onChangeFn?: (value: string, index: number) => void;
  private widthPx: number;
  private heightPx: number;
  private fontSize: number;
  /** Click-away listener registered on the canvas */
  private canvasClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, config: DropdownConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.options = config.options;
    this.selectedIndex = config.defaultIndex ?? 0;
    this.onChangeFn = config.onChange;
    this.widthPx = config.width;
    this.heightPx = config.height ?? 36;
    this.fontSize = config.fontSize ?? theme.fonts.body.size;

    // Background
    this.bg = scene.add
      .rectangle(0, 0, this.widthPx, this.heightPx, theme.colors.buttonBg)
      .setOrigin(0, 0);
    this.add(this.bg);

    // Border
    this.border = scene.add
      .rectangle(0, 0, this.widthPx, this.heightPx)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder)
      .setFillStyle(0x000000, 0);
    this.add(this.border);

    // Label
    const currentLabel = this.options[this.selectedIndex]?.label ?? "";
    this.label = scene.add
      .text(theme.spacing.sm, Math.floor(this.heightPx / 2), currentLabel, {
        fontSize: `${this.fontSize}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0, 0.5);
    this.add(this.label);

    // Arrow indicator
    this.arrow = scene.add
      .text(
        this.widthPx - theme.spacing.sm - 12,
        Math.floor(this.heightPx / 2),
        "\u25BC",
        {
          fontSize: `${Math.max(10, this.fontSize - 4)}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
        },
      )
      .setOrigin(0, 0.5);
    this.add(this.arrow);

    // Interactive hit area on the whole dropdown
    this.bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.widthPx, this.heightPx),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.bg.input) {
      this.bg.input.cursor = "pointer";
    }
    this.bg.on("pointerover", () => {
      if (!this.dropdownOpen) {
        this.bg.setFillStyle(theme.colors.buttonHover);
      }
    });
    this.bg.on("pointerout", () => {
      if (!this.dropdownOpen) {
        this.bg.setFillStyle(theme.colors.buttonBg);
      }
    });
    this.bg.on("pointerdown", () => {
      if (this.dropdownOpen) {
        this.closeDropdown();
      } else {
        this.openDropdown();
      }
    });

    this.setSize(this.widthPx, this.heightPx);
    scene.add.existing(this);

    // Cleanup on scene shutdown
    this.scene.events.once("shutdown", () => {
      this.closeDropdown();
    });
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getSelectedValue(): string {
    return this.options[this.selectedIndex]?.value ?? "";
  }

  setSelectedIndex(index: number): void {
    if (index < 0 || index >= this.options.length) return;
    this.selectedIndex = index;
    this.label.setText(this.options[index].label);
  }

  private openDropdown(): void {
    if (this.dropdownOpen) return;
    this.dropdownOpen = true;
    playUiSfx("ui_click");

    const theme = getTheme();
    const optH = this.heightPx;
    const worldPos = this.getWorldTransformMatrix();

    // Options render below the dropdown trigger in screen space.
    // We use the scene's add methods and position them globally.
    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      const optY = worldPos.ty + this.heightPx + i * optH;
      const isSelected = i === this.selectedIndex;

      const optBg = this.scene.add
        .rectangle(
          worldPos.tx,
          optY,
          this.widthPx,
          optH,
          isSelected ? theme.colors.buttonHover : theme.colors.headerBg,
        )
        .setOrigin(0, 0)
        .setDepth(1000);
      this.overlayObjects.push(optBg);

      const optBorder = this.scene.add
        .rectangle(worldPos.tx, optY, this.widthPx, optH)
        .setOrigin(0, 0)
        .setStrokeStyle(
          1,
          isSelected ? theme.colors.accent : theme.colors.panelBorder,
        )
        .setFillStyle(0x000000, 0)
        .setDepth(1001);
      this.overlayObjects.push(optBorder);

      const optLabel = this.scene.add
        .text(
          worldPos.tx + theme.spacing.sm,
          optY + Math.floor(optH / 2),
          opt.label,
          {
            fontSize: `${this.fontSize}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(
              isSelected ? theme.colors.accent : theme.colors.text,
            ),
          },
        )
        .setOrigin(0, 0.5)
        .setDepth(1002);
      this.overlayObjects.push(optLabel);

      optBg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.widthPx, optH),
        Phaser.Geom.Rectangle.Contains,
      );
      if (optBg.input) optBg.input.cursor = "pointer";

      optBg.on("pointerover", () => {
        optBg.setFillStyle(theme.colors.rowHover);
      });
      optBg.on("pointerout", () => {
        optBg.setFillStyle(
          i === this.selectedIndex
            ? theme.colors.buttonHover
            : theme.colors.headerBg,
        );
      });

      const selectIdx = i; // capture
      optBg.on("pointerdown", () => {
        playUiSfx("ui_click");
        this.selectedIndex = selectIdx;
        this.label.setText(this.options[selectIdx].label);
        this.closeDropdown();
        if (this.onChangeFn) {
          this.onChangeFn(this.options[selectIdx].value, selectIdx);
        }
      });
    }

    // Close when clicking outside — use a delayed listener so the current
    // click doesn't immediately fire it.
    this.scene.time.delayedCall(50, () => {
      const canvas = this.scene.game.canvas;
      this.canvasClickHandler = (e: MouseEvent) => {
        // Check if click is outside the dropdown overlay area
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const menuTop = worldPos.ty + this.heightPx;
        const menuBottom = menuTop + this.options.length * optH;
        const menuLeft = worldPos.tx;
        const menuRight = worldPos.tx + this.widthPx;

        // Also include the trigger button area
        const triggerTop = worldPos.ty;

        if (
          clickX < menuLeft ||
          clickX > menuRight ||
          clickY < triggerTop ||
          clickY > menuBottom
        ) {
          this.closeDropdown();
        }
      };
      canvas.addEventListener("pointerdown", this.canvasClickHandler);
    });
  }

  private closeDropdown(): void {
    if (!this.dropdownOpen) return;
    this.dropdownOpen = false;

    for (const obj of this.overlayObjects) {
      obj.destroy();
    }
    this.overlayObjects = [];

    if (this.canvasClickHandler) {
      this.scene.game.canvas.removeEventListener(
        "pointerdown",
        this.canvasClickHandler,
      );
      this.canvasClickHandler = null;
    }

    const theme = getTheme();
    this.bg.setFillStyle(theme.colors.buttonBg);
  }

  destroy(fromScene?: boolean): void {
    this.closeDropdown();
    super.destroy(fromScene);
  }
}
