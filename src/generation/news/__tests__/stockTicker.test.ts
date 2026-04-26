import { describe, it, expect } from "vitest";
import {
  buildStockList,
  quoteStock,
  quoteAllStocks,
} from "../stockTicker.ts";
import { makeFixtureState } from "./testFixtures.ts";

describe("stockTicker", () => {
  it("includes the player and every live AI company plus flavor brands", () => {
    const state = makeFixtureState();
    const list = buildStockList(state);
    const symbols = list.map((e) => e.symbol);
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(symbols.find((s) => s === "VOID")).toBeDefined();
  });

  it("symbols are stable across turns for the same state", () => {
    const state = makeFixtureState({ turn: 1 });
    const a = buildStockList(state).map((e) => e.symbol).sort();
    const b = buildStockList(state).map((e) => e.symbol).sort();
    expect(a).toEqual(b);
  });

  it("quotes are deterministic given (entry, seed, turn)", () => {
    const state = makeFixtureState();
    const list = buildStockList(state);
    const e = list[0];
    const a = quoteStock(e, state.seed, 5);
    const b = quoteStock(e, state.seed, 5);
    expect(a.price).toBe(b.price);
    expect(a.changePct).toBe(b.changePct);
    expect(a.context).toBe(b.context);
  });

  it("price moves between turns within plausible band", () => {
    const state = makeFixtureState();
    const list = buildStockList(state);
    for (const e of list) {
      const q1 = quoteStock(e, state.seed, 1);
      const q2 = quoteStock(e, state.seed, 2);
      expect(q1.price).toBeGreaterThan(0);
      expect(q2.price).toBeGreaterThan(0);
      expect(Math.abs(q1.changePct)).toBeLessThanOrEqual(0.3);
    }
  });

  it("quoteAllStocks returns one quote per symbol", () => {
    const state = makeFixtureState();
    const quotes = quoteAllStocks(state, state.seed, state.turn);
    const list = buildStockList(state);
    expect(quotes.length).toBe(list.length);
  });
});
