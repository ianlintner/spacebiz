import { describe, it, expect } from "vitest";
import { substituteTickerTokens, KNOWN_TOKENS } from "../tokens.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { makeFixtureState } from "./testFixtures.ts";

describe("tokens.substituteTickerTokens", () => {
  it("replaces every known token", () => {
    const state = makeFixtureState();
    const rng = new SeededRNG(123);
    for (const tok of KNOWN_TOKENS) {
      const out = substituteTickerTokens(`HEAD {${tok}} TAIL`, state, rng);
      expect(out).not.toContain(`{${tok}}`);
      expect(out.startsWith("HEAD ")).toBe(true);
      expect(out.endsWith(" TAIL")).toBe(true);
    }
  });

  it("leaves unknown tokens visible (no crash)", () => {
    const state = makeFixtureState();
    const rng = new SeededRNG(123);
    const out = substituteTickerTokens("look at {unknownToken}", state, rng);
    expect(out).toContain("{unknownToken}");
  });

  it("binds {empire} and {empire2} to distinct names when possible", () => {
    const state = makeFixtureState();
    const rng = new SeededRNG(7);
    const out = substituteTickerTokens(
      "{empire} and {empire2} signed the treaty",
      state,
      rng,
    );
    const m = out.match(/^(.+) and (.+) signed the treaty$/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toBe(m![2]);
  });

  it("is deterministic for same RNG state", () => {
    const state = makeFixtureState();
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const out1 = substituteTickerTokens("{ceo} of {company}", state, rng1);
    const out2 = substituteTickerTokens("{ceo} of {company}", state, rng2);
    expect(out1).toBe(out2);
  });

  it("formats {credits} like an amount with magnitude", () => {
    const state = makeFixtureState();
    const rng = new SeededRNG(5);
    const out = substituteTickerTokens("paid {credits}", state, rng);
    expect(out).toMatch(/paid [\d.]+(K|M|B) cr/);
  });

  it("formats {percent} as a number string", () => {
    const state = makeFixtureState();
    const rng = new SeededRNG(11);
    const out = substituteTickerTokens("up {percent}%", state, rng);
    expect(out).toMatch(/up \d+%/);
  });
});
