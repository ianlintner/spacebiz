import { legacySections } from "./sections/legacy.ts";
import type { StyleguideSection } from "./sectionGrouping.ts";

export type { StyleguideSection } from "./sectionGrouping.ts";
export { groupByCategory } from "./sectionGrouping.ts";

/**
 * Ordered list of all sections shown in the styleguide. Sections are grouped
 * in the side-panel by their `category` field (preserving first-seen order).
 *
 * To add a new section either:
 *  1. Append a `StyleguideSection` to this array directly, or
 *  2. Author a `*.styleguide.ts` adjacent to a component in
 *     `packages/spacebiz-ui/src/...` and import its `section` export here.
 */
export const styleguideSections: ReadonlyArray<StyleguideSection> = [
  ...legacySections,
];
