import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { autoButtonWidth } from "./TextMetrics.ts";
import { registerWidget } from "./WidgetHooks.ts";
import { createFocusRing } from "./foundation/FocusManager.ts";

export interface ModalConfig {
  title: string;
  body: string;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  /** Test id prefix. The modal registers `${testId}-ok`, `${testId}-cancel`, `${testId}-close`. */
  testId?: string;
  /**
   * When false, the modal cannot be dismissed by ESC, the close glyph, or
   * clicking the overlay. Useful for blocking confirmations. Defaults to true.
   */
  closable?: boolean;
}

interface InternalFocusable {
  ring: Phaser.GameObjects.Rectangle;
  activate: () => void;
}

export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private config: ModalConfig;
  private isShowing = false;
  private internalFocusables: InternalFocusable[] = [];
  private focusedIndex = -1;
  private readonly closable: boolean;

  constructor(scene: Phaser.Scene, config: ModalConfig) {
    super(scene, 0, 0);
    this.config = config;
    this.closable = config.closable !== false;
    const theme = getTheme();

    const gameWidth = scene.cameras.main.width;
    const gameHeight = scene.cameras.main.height;
    const modalWidth = config.width ?? 400;
    const modalHeight = config.height ?? 250;

    // Full-screen overlay
    this.overlay = scene.add
      .rectangle(0, 0, gameWidth, gameHeight, theme.colors.modalOverlay, 0.7)
      .setOrigin(0, 0)
      .setInteractive();
    this.overlay.on("pointerup", () => {
      if (!this.closable) return;
      if (config.onCancel) {
        config.onCancel();
      }
      if (this.scene) {
        this.hide();
      }
    });
    this.add(this.overlay);

    // Centered panel
    const panelX = (gameWidth - modalWidth) / 2;
    const panelY = (gameHeight - modalHeight) / 2;
    this.panel = scene.add.container(panelX, panelY);

    // Panel background
    const panelBg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        modalWidth,
        modalHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0);
    this.panel.add(panelBg);

    // Title bar
    const titleBg = scene.add
      .rectangle(
        0,
        0,
        modalWidth,
        theme.panel.titleHeight,
        theme.colors.headerBg,
      )
      .setOrigin(0, 0);
    this.panel.add(titleBg);

    // 1px accent line at the bottom of the title bar
    const titleAccentLine = scene.add
      .rectangle(
        0,
        theme.panel.titleHeight - 1,
        modalWidth,
        1,
        theme.colors.accent,
      )
      .setOrigin(0, 0)
      .setAlpha(0.5);
    this.panel.add(titleAccentLine);

    const titleText = scene.add.text(
      theme.spacing.md,
      theme.spacing.sm,
      config.title,
      {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
        wordWrap: {
          width:
            modalWidth - theme.spacing.md * 3 - (theme.fonts.heading.size + 4),
        },
      },
    );
    this.panel.add(titleText);

    const closeText = scene.add
      .text(modalWidth - theme.spacing.md, theme.spacing.xs, "×", {
        fontSize: `${theme.fonts.heading.size + 4}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(1, 0);
    if (this.closable) {
      closeText.setInteractive({ useHandCursor: true });
      closeText.on("pointerover", () => {
        closeText.setColor(colorToString(theme.colors.accent));
      });
      closeText.on("pointerout", () => {
        closeText.setColor(colorToString(theme.colors.textDim));
      });
      closeText.on("pointerup", () => {
        this.cancel();
      });
    } else {
      closeText.setVisible(false);
    }
    this.panel.add(closeText);

    if (this.closable) {
      // The close glyph is right-anchored, so use its bounds as the ring's
      // top-left origin in panel-local space.
      const closeBounds = closeText.getBounds();
      const closeRing = createFocusRing(
        scene,
        closeBounds.width,
        closeBounds.height,
        closeBounds.x,
        closeText.y,
      );
      this.panel.add(closeRing);
      this.internalFocusables.push({
        ring: closeRing,
        activate: () => this.cancel(),
      });
    }

    // Body text
    const bodyText = scene.add.text(
      theme.spacing.md,
      theme.panel.titleHeight + theme.spacing.md,
      config.body,
      {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: modalWidth - theme.spacing.md * 2 },
      },
    );
    this.panel.add(bodyText);

    // Buttons at bottom — auto-size to fit their labels
    const buttonY = modalHeight - theme.button.height - theme.spacing.md;
    const buttonHeight = theme.button.height;
    const buttonSpacing = theme.spacing.md;

    const okText = config.okText ?? "OK";
    const cancelText = config.cancelText ?? "Cancel";
    const hasCancelBtn = config.onCancel != null;

    // Measure both labels so buttons have consistent width when shown together
    const okBtnW = autoButtonWidth(
      scene,
      okText,
      theme.fonts.body.family,
      theme.fonts.body.size,
      80,
    );
    const cancelBtnW = hasCancelBtn
      ? autoButtonWidth(
          scene,
          cancelText,
          theme.fonts.body.family,
          theme.fonts.body.size,
          80,
        )
      : 0;
    // Use the larger of the two so paired buttons are equal width
    const buttonWidth = hasCancelBtn ? Math.max(okBtnW, cancelBtnW) : okBtnW;

    // OK button
    const okX = hasCancelBtn
      ? modalWidth / 2 - buttonWidth - buttonSpacing / 2
      : (modalWidth - buttonWidth) / 2;

    const okBg = scene.add
      .nineslice(
        okX,
        buttonY,
        "btn-normal",
        undefined,
        buttonWidth,
        buttonHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
        Phaser.Geom.Rectangle.Contains,
      );
    if (okBg.input) {
      okBg.input.cursor = "pointer";
    }
    const okLabel = scene.add
      .text(okX + buttonWidth / 2, buttonY + buttonHeight / 2, okText, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0.5);

    okBg.on("pointerover", () => {
      okBg.setTexture("btn-hover");
      okLabel.setColor(colorToString(theme.colors.accent));
    });
    okBg.on("pointerout", () => {
      okBg.setTexture("btn-normal");
      okLabel.setColor(colorToString(theme.colors.text));
    });
    okBg.on("pointerdown", () => okBg.setTexture("btn-pressed"));
    okBg.on("pointerup", () => {
      config.onOk?.();
      if (this.scene) {
        this.hide();
      }
    });
    okBg.on("pointerupoutside", () => {
      okBg.setTexture("btn-normal");
      okLabel.setColor(colorToString(theme.colors.text));
    });

    const okRing = createFocusRing(
      scene,
      buttonWidth,
      buttonHeight,
      okX,
      buttonY,
    );
    this.panel.add([okBg, okLabel, okRing]);
    this.internalFocusables.push({
      ring: okRing,
      activate: () => this.confirm(),
    });

    // Cancel button (optional)
    if (hasCancelBtn) {
      const cancelX = modalWidth / 2 + buttonSpacing / 2;

      const cancelBg = scene.add
        .nineslice(
          cancelX,
          buttonY,
          "btn-normal",
          undefined,
          buttonWidth,
          buttonHeight,
          10,
          10,
          10,
          10,
        )
        .setOrigin(0, 0)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
          Phaser.Geom.Rectangle.Contains,
        );
      if (cancelBg.input) {
        cancelBg.input.cursor = "pointer";
      }
      const cancelLabel = scene.add
        .text(
          cancelX + buttonWidth / 2,
          buttonY + buttonHeight / 2,
          cancelText,
          {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.text),
          },
        )
        .setOrigin(0.5);

      cancelBg.on("pointerover", () => {
        cancelBg.setTexture("btn-hover");
        cancelLabel.setColor(colorToString(theme.colors.text));
      });
      cancelBg.on("pointerout", () => {
        cancelBg.setTexture("btn-normal");
        cancelLabel.setColor(colorToString(theme.colors.textDim));
      });
      cancelBg.on("pointerdown", () => cancelBg.setTexture("btn-pressed"));
      cancelBg.on("pointerup", () => {
        config.onCancel?.();
        if (this.scene) {
          this.hide();
        }
      });
      cancelBg.on("pointerupoutside", () => {
        cancelBg.setTexture("btn-normal");
        cancelLabel.setColor(colorToString(theme.colors.textDim));
      });

      const cancelRing = createFocusRing(
        scene,
        buttonWidth,
        buttonHeight,
        cancelX,
        buttonY,
      );
      this.panel.add([cancelBg, cancelLabel, cancelRing]);
      this.internalFocusables.push({
        ring: cancelRing,
        activate: () => this.cancel(),
      });
    }

    this.add(this.panel);

    // Start hidden
    this.setVisible(false);
    this.setDepth(1000);

    this.scene.input.keyboard?.on("keydown", this.handleKeyDown, this);

    scene.add.existing(this);

    const prefix = config.testId ?? "modal";
    const unregisterFns: Array<() => void> = [];
    const unregOk = registerWidget({
      testId: `${prefix}-ok`,
      kind: "modal-ok",
      label: okText,
      scene,
      invoke: () => {
        if (!this.isShowing) return;
        config.onOk?.();
        if (this.scene) this.hide();
      },
      isEnabled: () => this.isShowing,
      isVisible: () => this.isShowing,
    });
    if (unregOk) unregisterFns.push(unregOk);

    if (hasCancelBtn) {
      const unregCancel = registerWidget({
        testId: `${prefix}-cancel`,
        kind: "modal-cancel",
        label: cancelText,
        scene,
        invoke: () => {
          if (!this.isShowing) return;
          config.onCancel?.();
          if (this.scene) this.hide();
        },
        isEnabled: () => this.isShowing,
        isVisible: () => this.isShowing,
      });
      if (unregCancel) unregisterFns.push(unregCancel);
    }

    const unregClose = registerWidget({
      testId: `${prefix}-close`,
      kind: "modal-close",
      label: "×",
      scene,
      invoke: () => {
        if (!this.isShowing) return;
        config.onCancel?.();
        if (this.scene) this.hide();
      },
      isEnabled: () => this.isShowing,
      isVisible: () => this.isShowing,
    });
    if (unregClose) unregisterFns.push(unregClose);

    if (unregisterFns.length > 0) {
      this.once("destroy", () => {
        for (const fn of unregisterFns) fn();
      });
    }
  }

  show(): void {
    this.isShowing = true;
    this.setVisible(true);
    // Prefer the OK button so Enter immediately confirms. The internal
    // focusables are pushed in order [close?, ok, cancel?]; OK is therefore
    // index 1 when the modal is closable and index 0 otherwise.
    const okIndex = this.closable ? 1 : 0;
    if (this.internalFocusables[okIndex]) {
      this.setFocusedIndex(okIndex);
    }
  }

  hide(): void {
    this.isShowing = false;
    this.setVisible(false);
    this.setFocusedIndex(-1);
  }

  private setFocusedIndex(index: number): void {
    if (this.focusedIndex >= 0 && this.internalFocusables[this.focusedIndex]) {
      this.internalFocusables[this.focusedIndex].ring.setVisible(false);
    }
    this.focusedIndex = index;
    if (index >= 0 && this.internalFocusables[index]) {
      this.internalFocusables[index].ring.setVisible(true);
    }
  }

  private cycleFocus(direction: 1 | -1): void {
    const n = this.internalFocusables.length;
    if (n === 0) return;
    const current = this.focusedIndex < 0 ? -1 : this.focusedIndex;
    const next = (current + direction + n) % n;
    this.setFocusedIndex(next);
  }

  private confirm(): void {
    this.config.onOk?.();
    if (this.scene) this.hide();
  }

  private cancel(): void {
    if (!this.closable) return;
    this.config.onCancel?.();
    if (this.scene) this.hide();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isShowing || !this.visible) return;

    if (event.code === "Tab") {
      this.cycleFocus(event.shiftKey ? -1 : 1);
      event.preventDefault();
      return;
    }

    if (event.code === "Enter" || event.code === "Space") {
      const focused = this.internalFocusables[this.focusedIndex];
      if (focused) {
        focused.activate();
      } else {
        this.confirm();
      }
      event.preventDefault();
      return;
    }

    if (event.code === "Escape") {
      if (!this.closable) return;
      this.cancel();
      event.preventDefault();
    }
  }

  destroy(fromScene?: boolean): void {
    this.scene.input.keyboard?.off("keydown", this.handleKeyDown, this);
    super.destroy(fromScene);
  }
}
