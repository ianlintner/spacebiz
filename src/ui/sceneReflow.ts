import * as Phaser from "phaser";

/** Subscribe a handler to the scene's scale "resize" event, with auto-cleanup
 *  when the scene shuts down. Standardizes the wiring for any scene that needs
 *  to reflow its layout when the game canvas dimensions change.
 */
export function attachReflowHandler(
  scene: Phaser.Scene,
  handler: (gameSize: Phaser.Structs.Size) => void,
): void {
  scene.scale.on("resize", handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", handler);
  });
}
