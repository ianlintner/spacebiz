import { describe, it, expect } from "vitest";
import { classifyOutcome, moodForOutcome } from "../outcomeTier.ts";

describe("classifyOutcome", () => {
  it("classifies <40 as negative", () => {
    expect(classifyOutcome(0)).toBe("negative");
    expect(classifyOutcome(39)).toBe("negative");
    expect(classifyOutcome(39.999)).toBe("negative");
  });

  it("classifies 40-69 as neutral", () => {
    expect(classifyOutcome(40)).toBe("neutral");
    expect(classifyOutcome(55)).toBe("neutral");
    expect(classifyOutcome(69)).toBe("neutral");
    expect(classifyOutcome(69.999)).toBe("neutral");
  });

  it("classifies >=70 as positive", () => {
    expect(classifyOutcome(70)).toBe("positive");
    expect(classifyOutcome(85)).toBe("positive");
    expect(classifyOutcome(100)).toBe("positive");
  });
});

describe("moodForOutcome", () => {
  it("maps tiers to expected portrait moods", () => {
    expect(moodForOutcome("positive")).toBe("success");
    expect(moodForOutcome("neutral")).toBe("analyzing");
    expect(moodForOutcome("negative")).toBe("alert");
  });
});
