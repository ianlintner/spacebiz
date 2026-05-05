import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { playUiSfx } from "./UiSound.ts";
import {
  FocusManager,
  createFocusRing,
  type Focusable,
} from "./foundation/FocusManager.ts";

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
  /** Max rows visible before scrolling (default: 8) */
  maxVisible?: number;
}

export class Dropdown
  extends Phaser.GameObjects.Container
  implements Focusable
{
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private border: Phaser.GameObjects.Rectangle;
  private focusRing: Phaser.GameObjects.Rectangle;
  private options: DropdownOption[];
  private selectedIndex: number;
  private highlightedIndex = -1;
  private dropdownOpen = false;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  /** Keyed by option index, only populated for currently visible rows. */
  private optionBgsMap = new Map<number, Phaser.GameObjects.Rectangle>();
  private onChangeFn?: (value: string, index: number) => void;
  private widthPx: number;
  private heightPx: number;
  private fontSize: number;
  private maxVisible: number;
  /** Index of the first visible option row. */
  private scrollTop = 0;
  private isFocused = false;
  private focusManager: FocusManager | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  private canvasClickHandler: ((e: MouseEvent) => void) | null = null;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, config: DropdownConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.options = config.options;
    this.selectedIndex = config.defaultIndex ?? 0;
    this.onChangeFn = config.onChange;
    this.widthPx = config.width;
    this.heightPx = config.height ?? 36;
    this.fontSize = config.fontSize ?? theme.fonts.body.size;
    this.maxVisible = config.maxVisible ?? 8;

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

    // Focus ring
    this.focusRing = createFocusRing(scene, this.widthPx, this.heightPx);
    this.add(this.focusRing);

    this.setSize(this.widthPx, this.heightPx);
    scene.add.existing(this);

    // Register with the scene's focus manager and listen for keys.
    this.focusManager = FocusManager.forScene(scene);
    this.focusManager.register(this);
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    scene.input.keyboard?.on("keydown", this.keyHandler);

    // Cleanup on scene shutdown
    this.scene.events.once("shutdown", () => {
      this.closeDropdown();
    });
  }

  // ── Focusable ────────────────────────────────────────────────────────────

  setFocus(focused: boolean): void {
    if (focused) {
      this.focusManager?.setFocus(this);
    } else if (this.isFocused) {
      this.focusManager?.setFocus(null);
    }
  }

  focus(): void {
    if (this.isFocused) return;
    this.isFocused = true;
    this.focusRing.setVisible(true);
  }

  blur(): void {
    if (!this.isFocused) return;
    this.isFocused = false;
    this.focusRing.setVisible(false);
    if (this.dropdownOpen) this.closeDropdown();
  }

  isFocusable(): boolean {
    return this.visible && this.active;
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isFocused || !this.visible) return;
    if (this.dropdownOpen) {
      if (event.code === "ArrowDown") {
        const next =
          (this.highlightedIndex + 1 + this.options.length) %
          this.options.length;
        this.setHighlight(next);
        this.ensureVisible(next);
        event.preventDefault();
      } else if (event.code === "ArrowUp") {
        const prev =
          (this.highlightedIndex - 1 + this.options.length) %
          this.options.length;
        this.setHighlight(prev);
        this.ensureVisible(prev);
        event.preventDefault();
      } else if (event.code === "Enter" || event.code === "Space") {
        if (this.highlightedIndex >= 0) {
          this.commitSelection(this.highlightedIndex);
        }
        event.preventDefault();
      } else if (event.code === "Escape") {
        this.closeDropdown();
        event.preventDefault();
      }
    } else {
      if (event.code === "Enter" || event.code === "Space") {
        this.openDropdown();
        event.preventDefault();
      } else if (event.code === "ArrowDown" || event.code === "ArrowUp") {
        this.openDropdown();
        event.preventDefault();
      }
    }
  }

  /** Scroll `scrollTop` so that `index` is within the visible window. */
  private ensureVisible(index: number): void {
    const visibleEnd = this.scrollTop + this.maxVisible - 1;
    if (index < this.scrollTop) {
      this.scrollTop = index;
      this.renderDropdownItems();
      this.setHighlight(index);
    } else if (index > visibleEnd) {
      this.scrollTop = index - this.maxVisible + 1;
      this.renderDropdownItems();
      this.setHighlight(index);
    }
  }

  private setHighlight(index: number): void {
    const theme = getTheme();
    if (this.highlightedIndex >= 0) {
      const prev = this.optionBgsMap.get(this.highlightedIndex);
      if (prev) {
        prev.setFillStyle(
          this.highlightedIndex === this.selectedIndex
            ? theme.colors.buttonHover
            : theme.colors.headerBg,
        );
      }
    }
    this.highlightedIndex = index;
    const curr = this.optionBgsMap.get(index);
    if (curr) {
      curr.setFillStyle(theme.colors.rowHover);
    }
  }

  private commitSelection(index: number): void {
    playUiSfx("ui_click");
    this.selectedIndex = index;
    this.label.setText(this.options[index].label);
    this.closeDropdown();
    this.onChangeFn?.(this.options[index].value, index);
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

    // Centre the window on the selected item, clamped to valid range.
    const maxTop = Math.max(0, this.options.length - this.maxVisible);
    this.scrollTop = Math.max(
      0,
      Math.min(maxTop, this.selectedIndex - Math.floor(this.maxVisible / 2)),
    );

    this.renderDropdownItems();
    this.highlightedIndex = -1;
    this.setHighlight(this.selectedIndex);

    // Mouse-wheel scrolling.
    const canvas = this.scene.game.canvas;
    this.wheelHandler = (e: WheelEvent) => {
      if (!this.dropdownOpen) return;
      const delta = e.deltaY > 0 ? 1 : -1;
      const newTop = Math.max(
        0,
        Math.min(
          Math.max(0, this.options.length - this.maxVisible),
          this.scrollTop + delta,
        ),
      );
      if (newTop !== this.scrollTop) {
        this.scrollTop = newTop;
        const prevHighlight = this.highlightedIndex;
        this.renderDropdownItems();
        // Re-apply highlight if still visible, else clear it.
        if (
          prevHighlight >= this.scrollTop &&
          prevHighlight < this.scrollTop + this.maxVisible
        ) {
          this.setHighlight(prevHighlight);
        } else {
          this.highlightedIndex = -1;
        }
        e.preventDefault();
      }
    };
    canvas.addEventListener("wheel", this.wheelHandler, { passive: false });

    // Click-away listener — delayed so the current click doesn't fire it.
    const worldPos = this.getWorldTransformMatrix();
    const visibleRows = Math.min(this.maxVisible, this.options.length);
    this.scene.time.delayedCall(50, () => {
      this.canvasClickHandler = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const menuTop = worldPos.ty + this.heightPx;
        const menuBottom = menuTop + visibleRows * this.heightPx;
        const menuLeft = worldPos.tx;
        const menuRight = worldPos.tx + this.widthPx;
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

  /**
   * (Re-)render the visible window of option rows. Destroys any existing
   * overlay objects first, then creates rows for
   * [scrollTop, scrollTop + maxVisible).
   */
  private renderDropdownItems(): void {
    for (const obj of this.overlayObjects) {
      obj.destroy();
    }
    this.overlayObjects = [];
    this.optionBgsMap.clear();

    const theme = getTheme();
    const optH = this.heightPx;
    const worldPos = this.getWorldTransformMatrix();
    const visibleCount = Math.min(this.maxVisible, this.options.length);
    const end = Math.min(this.scrollTop + visibleCount, this.options.length);

    // Up-scroll indicator
    if (this.scrollTop > 0) {
      const indY = worldPos.ty + this.heightPx - Math.floor(optH * 0.35);
      const ind = this.scene.add
        .text(
          worldPos.tx + Math.floor(this.widthPx / 2),
          indY,
          `\u25B2 ${this.scrollTop} more`,
          {
            fontSize: `${Math.max(9, this.fontSize - 3)}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(0.5, 1)
        .setDepth(1003);
      this.overlayObjects.push(ind);
    }

    for (let i = this.scrollTop; i < end; i++) {
      const renderRow = i - this.scrollTop;
      const opt = this.options[i];
      const optY = worldPos.ty + this.heightPx + renderRow * optH;
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
      this.optionBgsMap.set(i, optBg);

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

      const selectIdx = i;
      optBg.on("pointerdown", () => {
        this.commitSelection(selectIdx);
      });
    }

    // Down-scroll indicator
    const remaining = this.options.length - end;
    if (remaining > 0) {
      const indY =
        worldPos.ty +
        this.heightPx +
        visibleCount * optH +
        Math.floor(optH * 0.35);
      const ind = this.scene.add
        .text(
          worldPos.tx + Math.floor(this.widthPx / 2),
          indY,
          `\u25BC ${remaining} more`,
          {
            fontSize: `${Math.max(9, this.fontSize - 3)}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(1003);
      this.overlayObjects.push(ind);
    }
  }

  private closeDropdown(): void {
    if (!this.dropdownOpen) return;
    this.dropdownOpen = false;

    for (const obj of this.overlayObjects) {
      obj.destroy();
    }
    this.overlayObjects = [];
    this.optionBgsMap.clear();
    this.highlightedIndex = -1;

    if (this.canvasClickHandler) {
      this.scene.game.canvas.removeEventListener(
        "pointerdown",
        this.canvasClickHandler,
      );
      this.canvasClickHandler = null;
    }

    if (this.wheelHandler) {
      this.scene.game.canvas.removeEventListener("wheel", this.wheelHandler);
      this.wheelHandler = null;
    }

    const theme = getTheme();
    this.bg.setFillStyle(theme.colors.buttonBg);
  }

  destroy(fromScene?: boolean): void {
    if (this.keyHandler && this.scene) {
      this.scene.input.keyboard?.off("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.focusManager?.unregister(this);
    this.focusManager = null;
    this.closeDropdown();
    super.destroy(fromScene);
  }
}
