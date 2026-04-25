import { describe, it, expect } from "vitest";
import { DILEMMA_TEMPLATES } from "../DilemmaDefinitions.ts";

describe("DilemmaDefinitions", () => {
  it("exports a non-trivial slate", () => {
    expect(DILEMMA_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each template has a unique id", () => {
    const ids = DILEMMA_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each option has a unique id within its template", () => {
    for (const t of DILEMMA_TEMPLATES) {
      const optionIds = t.options.map((o) => o.id);
      expect(
        new Set(optionIds).size,
        `${t.id} has duplicate option ids: ${optionIds.join(", ")}`,
      ).toBe(optionIds.length);
    }
  });

  it("each template has 2-4 options", () => {
    for (const t of DILEMMA_TEMPLATES) {
      expect(
        t.options.length,
        `${t.id} should have 2-4 options, got ${t.options.length}`,
      ).toBeGreaterThanOrEqual(2);
      expect(t.options.length).toBeLessThanOrEqual(4);
    }
  });

  it("each option declares baseSuccess and effects", () => {
    for (const t of DILEMMA_TEMPLATES) {
      for (const o of t.options) {
        expect(o.baseSuccess, `${t.id}.${o.id} missing baseSuccess`).toBeTypeOf(
          "number",
        );
        expect(Array.isArray(o.effects)).toBe(true);
      }
    }
  });

  it("each template declares an imageKey (Phase 2 requirement)", () => {
    for (const t of DILEMMA_TEMPLATES) {
      expect(
        t.imageKey,
        `${t.id} missing imageKey — banner won't render`,
      ).toBeTruthy();
    }
  });

  it("imageKey values are unique across templates", () => {
    const keys = DILEMMA_TEMPLATES.map((t) => t.imageKey).filter(
      (k): k is string => Boolean(k),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("category is one of the documented values", () => {
    const allowed = new Set([
      "diplomatic",
      "operational",
      "financial",
      "narrative",
      "opportunity",
    ]);
    for (const t of DILEMMA_TEMPLATES) {
      expect(
        allowed.has(t.category),
        `${t.id} has unknown category ${t.category}`,
      ).toBe(true);
    }
  });
});
