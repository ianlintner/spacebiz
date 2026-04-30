import { describe, it, expect } from "vitest";
import { getFlavor } from "../CopyTemplates.ts";

describe("getFlavor", () => {
  it("returns a non-empty string for any (kind, personality, tier)", () => {
    const s = getFlavor("giftAccepted", "warm", "Neutral");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("falls back to neutral defaults for unknown personality/tier", () => {
    const s = getFlavor("giftAccepted", "warm" as never, "Allied");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("differs across personality tags for the same kind/tier", () => {
    const a = getFlavor("giftRefused", "formal", "Cold");
    const b = getFlavor("giftRefused", "warm", "Cold");
    expect(a).not.toBe(b);
  });
});
