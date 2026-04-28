import { describe, it, expect } from "vitest";
import { groupByCategory, type StyleguideSection } from "../sectionGrouping.ts";
import { buildDefaultKnobValues, type KnobDef } from "../knobs/index.ts";

/**
 * Note: importing the real `legacySections` would transitively load
 * `@spacebiz/ui` which touches `window` at module load and crashes
 * Vitest's node environment. The registry's responsibility (grouping,
 * defaults) is pure data and is fully exercised by these synthetic
 * fixtures.
 */
const fixture = (
  id: string,
  category: string,
  title = id,
  knobs?: ReadonlyArray<KnobDef>,
): StyleguideSection => ({
  id,
  title,
  category,
  knobs,
  render: () => {},
});

describe("groupByCategory", () => {
  it("returns empty list for empty input", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("preserves the order categories were first seen", () => {
    const sections = [
      fixture("a", "Tokens"),
      fixture("b", "Primitives"),
      fixture("c", "Tokens"),
      fixture("d", "Composites"),
    ];
    const groups = groupByCategory(sections);
    expect(groups.map((g) => g.category)).toEqual([
      "Tokens",
      "Primitives",
      "Composites",
    ]);
  });

  it("returns sections in original registration order within each group", () => {
    const sections = [
      fixture("z", "Tokens"),
      fixture("y", "Primitives"),
      fixture("x", "Tokens"),
      fixture("w", "Tokens"),
    ];
    const groups = groupByCategory(sections);
    const tokens = groups.find((g) => g.category === "Tokens");
    expect(tokens?.sections.map((s) => s.id)).toEqual(["z", "x", "w"]);
  });

  it("preserves total section count across grouping", () => {
    const sections = [
      fixture("a", "Tokens"),
      fixture("b", "Primitives"),
      fixture("c", "Tokens"),
      fixture("d", "Composites"),
      fixture("e", "Primitives"),
    ];
    const groups = groupByCategory(sections);
    const total = groups.reduce((acc, g) => acc + g.sections.length, 0);
    expect(total).toBe(sections.length);
  });
});

describe("buildDefaultKnobValues", () => {
  it("returns empty object when no knobs supplied", () => {
    expect(buildDefaultKnobValues(undefined)).toEqual({});
    expect(buildDefaultKnobValues([])).toEqual({});
  });

  it("populates from each knob's `default`", () => {
    const knobs: KnobDef[] = [
      { type: "boolean", id: "b", label: "B", default: true },
      { type: "number", id: "n", label: "N", default: 7 },
      { type: "string", id: "s", label: "S", default: "hi" },
      {
        type: "select",
        id: "sel",
        label: "Sel",
        default: "two",
        options: [
          { value: "one", label: "One" },
          { value: "two", label: "Two" },
        ],
      },
      { type: "color", id: "c", label: "C", default: "#ff00aa" },
    ];
    expect(buildDefaultKnobValues(knobs)).toEqual({
      b: true,
      n: 7,
      s: "hi",
      sel: "two",
      c: "#ff00aa",
    });
  });

  it("preserves knob order in the returned record", () => {
    const knobs: KnobDef[] = [
      { type: "number", id: "first", label: "1", default: 1 },
      { type: "number", id: "second", label: "2", default: 2 },
      { type: "number", id: "third", label: "3", default: 3 },
    ];
    const values = buildDefaultKnobValues(knobs);
    expect(Object.keys(values)).toEqual(["first", "second", "third"]);
  });
});
