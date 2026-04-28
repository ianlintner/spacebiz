import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";
import { texts, asMock } from "../_harness/inspect.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { InfoCard } from "../../InfoCard.ts";
import { StatRow } from "../../StatRow.ts";

describe("InfoCard", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("renders the title text in the card", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 240,
      title: "Cargo Manifest",
      stats: [],
    });

    const titleText = texts(card).find((t) => t.text === "Cargo Manifest");
    expect(titleText).toBeDefined();
  });

  it("composes one StatRow per stat entry, in order", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 240,
      title: "Stats",
      stats: [
        { label: "Speed", value: "12" },
        { label: "Cargo", value: "3,000" },
        { label: "Range", value: "8 ly" },
      ],
    });

    const statRows = card.list.filter((c) => c instanceof StatRow);
    expect(statRows.length).toBe(3);
  });

  it("re-parents StatRows from the scene factory into the card container", () => {
    const card = new InfoCard(scene as never, {
      x: 5,
      y: 5,
      width: 200,
      title: "Test",
      stats: [{ label: "A", value: "1" }],
    });

    const statRow = card.list.find((c) => c instanceof StatRow) as
      | StatRow
      | undefined;
    expect(statRow).toBeDefined();
    expect(statRow!.parentContainer).toBe(card);
  });

  it("renders an optional description text when provided", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 240,
      title: "T",
      stats: [],
      description: "Trades cargo across the rim.",
    });

    const desc = texts(card).find(
      (t) => t.text === "Trades cargo across the rim.",
    );
    expect(desc).toBeDefined();
  });

  it("omits the description when not provided", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 240,
      title: "T",
      stats: [],
    });

    expect(texts(card).map((t) => t.text)).toEqual(["T"]);
  });

  it("includes a NineSlice background sized to the computed card height", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 240,
      title: "T",
      stats: [
        { label: "a", value: "1" },
        { label: "b", value: "2" },
      ],
    });

    const bg = card.list.find(
      (c) => asMock<{ type: string }>(c).type === "NineSlice",
    );
    expect(bg).toBeDefined();
    const bgShape = asMock<{ width: number; height: number }>(bg);
    expect(bgShape.width).toBe(240);
    expect(bgShape.height).toBe(card.cardHeight);
  });

  it("updateStat delegates to the corresponding StatRow", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      title: "T",
      stats: [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
      ],
    });

    card.updateStat(1, "999", 0x00ff00);

    const statRows = card.list.filter((c) => c instanceof StatRow) as StatRow[];
    const updatedTexts = texts(statRows[1]).map((t) => t.text);
    expect(updatedTexts).toContain("999");
  });

  it("updateStat is a no-op for an out-of-range index", () => {
    const card = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      title: "T",
      stats: [{ label: "A", value: "1" }],
    });
    expect(() => card.updateStat(99, "x")).not.toThrow();
  });

  it("cardHeight grows as more stats are added", () => {
    const small = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      title: "T",
      stats: [{ label: "A", value: "1" }],
    });
    const large = new InfoCard(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      title: "T",
      stats: [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
        { label: "C", value: "3" },
        { label: "D", value: "4" },
      ],
    });
    expect(large.cardHeight).toBeGreaterThan(small.cardHeight);
  });
});
