import { describe, it, expect } from "vitest";
import {
  getNewscasterForCategory,
  NEWSCASTER_DEFS,
  NEWSCASTER_BY_CATEGORY,
} from "../newscasters.ts";
import type { TickerCategory } from "../types.ts";
import { FLAVOR_CATEGORIES } from "../categories.ts";

const ALL_CATEGORIES: TickerCategory[] = [
  "headline",
  "leader",
  "stock",
  ...FLAVOR_CATEGORIES,
];

describe("newscaster registry", () => {
  it("every TickerCategory maps to a newscaster", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(
        NEWSCASTER_BY_CATEGORY[cat],
        `missing category: ${cat}`,
      ).toBeDefined();
    }
  });

  it("every mapped newscaster type has a def entry", () => {
    const types = new Set(Object.values(NEWSCASTER_BY_CATEGORY));
    for (const t of types) {
      expect(NEWSCASTER_DEFS[t], `missing def for type: ${t}`).toBeDefined();
    }
  });

  it("science → science anchor", () => {
    const def = getNewscasterForCategory("science");
    expect(def.type).toBe("science");
  });

  it("stock and market_mover → finance anchor", () => {
    expect(getNewscasterForCategory("stock").type).toBe("finance");
    expect(getNewscasterForCategory("market_mover").type).toBe("finance");
  });

  it("fashion → fashion anchor; celebrity → paparazzi", () => {
    expect(getNewscasterForCategory("fashion").type).toBe("fashion");
    expect(getNewscasterForCategory("celebrity").type).toBe("paparazzi");
  });

  it("crime and blotter → investigator", () => {
    expect(getNewscasterForCategory("crime").type).toBe("investigator");
    expect(getNewscasterForCategory("blotter").type).toBe("investigator");
  });

  it("headline → main anchor; obituary → anchor_d night desk", () => {
    expect(getNewscasterForCategory("headline").type).toBe("anchor");
    expect(getNewscasterForCategory("obituary").type).toBe("anchor_d");
  });

  it("cosmic_weather → weather reporter", () => {
    expect(getNewscasterForCategory("cosmic_weather").type).toBe("weather");
  });

  it("sports → sports anchor", () => {
    expect(getNewscasterForCategory("sports").type).toBe("sports");
  });

  it("xenobiology, health, academia → explorer", () => {
    expect(getNewscasterForCategory("xenobiology").type).toBe("explorer");
    expect(getNewscasterForCategory("health").type).toBe("explorer");
    expect(getNewscasterForCategory("academia").type).toBe("explorer");
  });

  it("leader and homage → anchor_b; religion → anchor_c", () => {
    expect(getNewscasterForCategory("leader").type).toBe("anchor_b");
    expect(getNewscasterForCategory("homage").type).toBe("anchor_b");
    expect(getNewscasterForCategory("religion").type).toBe("anchor_c");
  });
});
