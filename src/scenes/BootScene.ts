import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    this.add
      .text(640, 360, "Star Freight Tycoon", {
        fontSize: "48px",
        color: "#00ffcc",
      })
      .setOrigin(0.5);
  }
}
