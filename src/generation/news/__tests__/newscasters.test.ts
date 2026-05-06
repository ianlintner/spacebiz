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

  it("fashion and celebrity → fashion anchor", () => {
    expect(getNewscasterForCategory("fashion").type).toBe("fashion");
    expect(getNewscasterForCategory("celebrity").type).toBe("fashion");
  });

  it("crime and blotter → field reporter", () => {
    expect(getNewscasterForCategory("crime").type).toBe("field");
    expect(getNewscasterForCategory("blotter").type).toBe("field");
  });

  it("headline and obituary → studio anchor", () => {
    expect(getNewscasterForCategory("headline").type).toBe("anchor");
    expect(getNewscasterForCategory("obituary").type).toBe("anchor");
  });
});
