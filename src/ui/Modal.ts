import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export interface ModalConfig {
  title: string;
  body: string;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
}

export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: ModalConfig) {
    super(scene, 0, 0);
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
      },
    );
    this.panel.add(titleText);

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

    // Buttons at bottom
    const buttonY = modalHeight - theme.button.height - theme.spacing.md;
    const buttonWidth = 100;
    const buttonHeight = theme.button.height;
    const buttonSpacing = theme.spacing.md;

    // OK button
    const okText = config.okText ?? "OK";
    const okX =
      config.onCancel != null
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
      .setInteractive({ useHandCursor: true });
    const okLabel = scene.add
      .text(okX + buttonWidth / 2, buttonY + buttonHeight / 2, okText, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0.5);

    okBg.on("pointerover", () => okBg.setTexture("btn-hover"));
    okBg.on("pointerout", () => okBg.setTexture("btn-normal"));
    okBg.on("pointerdown", () => okBg.setTexture("btn-pressed"));
    okBg.on("pointerup", () => {
      config.onOk?.();
      this.hide();
    });

    this.panel.add([okBg, okLabel]);

    // Cancel button (optional)
    if (config.onCancel != null) {
      const cancelText = config.cancelText ?? "Cancel";
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
        .setInteractive({ useHandCursor: true });
      const cancelLabel = scene.add
        .text(
          cancelX + buttonWidth / 2,
          buttonY + buttonHeight / 2,
          cancelText,
          {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(0.5);

      cancelBg.on("pointerover", () => cancelBg.setTexture("btn-hover"));
      cancelBg.on("pointerout", () => cancelBg.setTexture("btn-normal"));
      cancelBg.on("pointerdown", () => cancelBg.setTexture("btn-pressed"));
      cancelBg.on("pointerup", () => {
        config.onCancel?.();
        this.hide();
      });

      this.panel.add([cancelBg, cancelLabel]);
    }

    this.add(this.panel);

    // Start hidden
    this.setVisible(false);
    this.setDepth(1000);

    scene.add.existing(this);
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}
