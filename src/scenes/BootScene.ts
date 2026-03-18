import Phaser from "phaser";
import type { ThemeConfig } from "../ui/Theme";
import { getTheme } from "../ui/Theme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const theme = getTheme();
    this.generatePanelTexture(
      "panel-bg",
      theme.colors.panelBg,
      theme.colors.panelBorder,
    );
    this.generateButtonTextures(theme);
    this.generatePixelTexture("pixel-white", 0xffffff);

    // Proceed to main menu after textures are ready
    this.scene.start("MainMenuScene");
  }

  private generatePanelTexture(
    key: string,
    fill: number,
    border: number,
  ): void {
    const size = 32;
    const bw = 2;
    const graphics = this.add.graphics();
    graphics.fillStyle(border, 1);
    graphics.fillRect(0, 0, size, size);
    graphics.fillStyle(fill, 1);
    graphics.fillRect(bw, bw, size - bw * 2, size - bw * 2);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private generateButtonTextures(theme: ThemeConfig): void {
    for (const [suffix, color] of [
      ["normal", theme.colors.buttonBg],
      ["hover", theme.colors.buttonHover],
      ["pressed", theme.colors.buttonPressed],
      ["disabled", theme.colors.buttonDisabled],
    ] as const) {
      const size = 32;
      const bw = 2;
      const g = this.add.graphics();
      g.fillStyle(theme.colors.panelBorder, 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(color, 1);
      g.fillRect(bw, bw, size - bw * 2, size - bw * 2);
      g.generateTexture(`btn-${suffix}`, size, size);
      g.destroy();
    }
  }

  private generatePixelTexture(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture(key, 4, 4);
    g.destroy();
  }
}
