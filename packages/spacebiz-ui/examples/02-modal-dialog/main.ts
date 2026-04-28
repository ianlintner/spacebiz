import * as Phaser from "phaser";
import { Button, Modal, getTheme } from "@spacebiz/ui";

class ModalScene extends Phaser.Scene {
  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.bgDeep);

    const open = new Button(this, {
      x: 400,
      y: 300,
      label: "Open dialog",
      autoWidth: true,
      onClick: () => {
        const modal = new Modal(this, {
          title: "Confirm",
          body: "Proceed with the operation?",
          okText: "Yes",
          cancelText: "No",
          onOk: () => console.log("ok"),
          onCancel: () => console.log("cancel"),
        });
        this.add.existing(modal);
      },
    });
    this.add.existing(open);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scene: [ModalScene],
});
