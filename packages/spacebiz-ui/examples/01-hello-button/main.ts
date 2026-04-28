import * as Phaser from "phaser";
import { Button, getTheme } from "@spacebiz/ui";

class HelloScene extends Phaser.Scene {
  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.bgDeep);

    const button = new Button(this, {
      x: 400,
      y: 300,
      label: "Click me",
      autoWidth: true,
      onClick: () => console.log("clicked"),
    });
    this.add.existing(button);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scene: [HelloScene],
});
