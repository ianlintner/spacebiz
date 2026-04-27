import { describe, it, expect } from "vitest";
import { generateTickerFeed } from "../tickerFeed.ts";
import { makeFixtureState, makeFixtureTurnResult } from "./testFixtures.ts";

describe("tickerFeed", () => {
  it("returns deterministic output for the same (seed, turn)", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const a = generateTickerFeed(state, tr);
    const b = generateTickerFeed(state, tr);
    expect(a.map((i) => i.text)).toEqual(b.map((i) => i.text));
  });

  it("differs across turns", () => {
    const state1 = makeFixtureState({ turn: 1 });
    const state2 = makeFixtureState({ turn: 7 });
    const tr1 = makeFixtureTurnResult({ turn: 1 });
    const tr2 = makeFixtureTurnResult({ turn: 7 });
    const a = generateTickerFeed(state1, tr1);
    const b = generateTickerFeed(state2, tr2);
    expect(a.map((i) => i.text)).not.toEqual(b.map((i) => i.text));
  });

  it("respects maxItems", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const items = generateTickerFeed(state, tr, { maxItems: 10 });
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("includes leader rankings sorted by cash", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const items = generateTickerFeed(state, tr);
    const leaders = items.filter((i) => i.category === "leader");
    expect(leaders.length).toBeGreaterThanOrEqual(1);
    expect(leaders[0].text.startsWith("#1")).toBe(true);
  });

  it("includes stock movers with profit/loss color", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const items = generateTickerFeed(state, tr);
    const stocks = items.filter((i) => i.category === "stock");
    expect(stocks.length).toBeGreaterThan(0);
    for (const s of stocks) {
      expect(s.color === 0x00ff88 || s.color === 0xff6666).toBe(true);
    }
  });

  it("draws flavor items from multiple categories with cap enforced", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const items = generateTickerFeed(state, tr, {
      maxItems: 30,
      perCategoryCap: 2,
      flavorCategoryCount: 8,
    });
    const counts = new Map<string, number>();
    for (const it of items) {
      if (
        it.category === "headline" ||
        it.category === "leader" ||
        it.category === "stock"
      )
        continue;
      counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBeLessThanOrEqual(2);
    }
    expect(counts.size).toBeGreaterThanOrEqual(2);
  });

  it("substitutes tokens — no raw {empire}/{planet} should remain", () => {
    const state = makeFixtureState();
    const tr = makeFixtureTurnResult();
    const items = generateTickerFeed(state, tr);
    for (const it of items) {
      // Allow {commodity2}-style typos to fall through; assert only that the
      // common tokens we declared are gone.
      expect(it.text).not.toMatch(/\{empire\}/);
      expect(it.text).not.toMatch(/\{planet\}/);
      expect(it.text).not.toMatch(/\{ceo\}/);
      expect(it.text).not.toMatch(/\{stock\}/);
      expect(it.text).not.toMatch(/\{percent\}/);
    }
  });

  it("includes real headlines when events occurred", () => {
    const state = makeFixtureState({
      activeEvents: [
        {
          id: "e1",
          name: "Asteroid Fields Closed",
          description: "Mining halted in the sector.",
        },
      ],
    });
    const tr = makeFixtureTurnResult({
      eventsOccurred: ["Asteroid Fields Closed"],
    });
    const items = generateTickerFeed(state, tr);
    const headline = items.find((i) => i.category === "headline");
    expect(headline?.text.includes("Asteroid Fields Closed")).toBe(true);
  });
});
