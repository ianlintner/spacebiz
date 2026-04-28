/**
 * Styleguide section for `Button`.
 *
 * This adjacent `*.styleguide.ts` file is the convention for declaring
 * a component's styleguide entry. The styleguide app's `registry.ts`
 * imports these sections so each component owns its own demo.
 *
 * Section type lives in `styleguide/registry.ts`; we type the export
 * loosely here to avoid a circular dependency between the package and
 * the styleguide app.
 */
import * as Phaser from "phaser";
import { Button } from "./Button.ts";
import { Label } from "./Label.ts";
import { FloatingText } from "./FloatingText.ts";
import { getTheme } from "./Theme.ts";

export interface ButtonStyleguide {
  id: string;
  title: string;
  category: string;
  knobs: ReadonlyArray<{
    type: "boolean" | "string";
    id: string;
    label: string;
    default: boolean | string;
  }>;
  render: (
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    knobs: Record<string, boolean | number | string>,
  ) => void;
}

export const buttonStyleguide: ButtonStyleguide = {
  id: "button",
  title: "Button",
  category: "Primitives",
  knobs: [
    { type: "string", id: "label", label: "Label text", default: "Click me" },
    { type: "boolean", id: "disabled", label: "Disabled", default: false },
  ],
  render: (scene, root, knobs) => {
    const theme = getTheme();
    const label = String(knobs["label"] ?? "Click me");
    const disabled = Boolean(knobs["disabled"]);
    root.add(
      new Label(scene, {
        x: 0,
        y: 0,
        text: "Knob-driven button:",
        style: "caption",
      }),
    );
    const btn = new Button(scene, {
      x: 0,
      y: 24,
      label,
      disabled,
      onClick: () =>
        new FloatingText(
          scene,
          root.x + 60,
          root.y + 50,
          "Click!",
          theme.colors.profit,
        ),
    });
    root.add(btn);
  },
};
