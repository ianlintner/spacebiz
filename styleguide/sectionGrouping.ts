import type * as Phaser from "phaser";
import type { KnobDef, KnobValues } from "./knobs/index.ts";

/**
 * A renderable styleguide section.
 *
 * `render` is given a clean container — anything it adds will be cleaned up
 * by the scene when the section changes. The render is re-invoked when the
 * theme is changed or any knob value changes, so it MUST be idempotent and
 * MUST NOT keep singleton state outside the supplied container.
 */
export interface StyleguideSection {
  id: string;
  title: string;
  category: string;
  knobs?: ReadonlyArray<KnobDef>;
  render: (
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    knobs: KnobValues,
  ) => void;
}

/**
 * Group sections by their `category`, preserving insertion order.
 *
 * Lives in its own module (separate from `registry.ts`) so unit tests can
 * import the grouping logic without transitively pulling in Phaser-bound
 * section renderers.
 */
export function groupByCategory(
  sections: ReadonlyArray<StyleguideSection>,
): ReadonlyArray<{
  category: string;
  sections: ReadonlyArray<StyleguideSection>;
}> {
  const ordered: string[] = [];
  const buckets = new Map<string, StyleguideSection[]>();
  for (const s of sections) {
    if (!buckets.has(s.category)) {
      buckets.set(s.category, []);
      ordered.push(s.category);
    }
    buckets.get(s.category)!.push(s);
  }
  return ordered.map((category) => ({
    category,
    sections: buckets.get(category)!,
  }));
}
