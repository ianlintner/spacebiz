import { describe, it, expect } from "vitest";
import { FLAVOR_CATEGORIES, CATEGORY_META } from "../categories.ts";
import {
  ALL_FLAVOR_TEMPLATES,
  getTemplatesForCategory,
  totalFlavorTemplateCount,
} from "../flavorTemplates.ts";
import { KNOWN_TOKENS } from "../tokens.ts";

const KNOWN_SET: Set<string> = new Set(KNOWN_TOKENS as readonly string[]);

describe("flavorTemplates", () => {
  it("has at least 500 templates total", () => {
    expect(totalFlavorTemplateCount()).toBeGreaterThanOrEqual(500);
  });

  it("covers every flavor category with at least 20 templates", () => {
    for (const cat of FLAVOR_CATEGORIES) {
      const t = getTemplatesForCategory(cat);
      expect(t.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("declares metadata for every flavor category", () => {
    for (const cat of FLAVOR_CATEGORIES) {
      expect(CATEGORY_META[cat]).toBeDefined();
      expect(CATEGORY_META[cat].badge.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses only known tokens (no orphan {something})", () => {
    const orphans: { template: string; token: string }[] = [];
    const tokenRe = /\{([a-zA-Z0-9_]+)\}/g;
    for (const t of ALL_FLAVOR_TEMPLATES) {
      let m: RegExpExecArray | null;
      while ((m = tokenRe.exec(t.template)) !== null) {
        if (!KNOWN_SET.has(m[1].toLowerCase())) {
          orphans.push({ template: t.template, token: m[1] });
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it("assigns each template to a recognized category", () => {
    for (const t of ALL_FLAVOR_TEMPLATES) {
      expect(FLAVOR_CATEGORIES).toContain(t.category);
    }
  });

  it("templates are non-empty strings", () => {
    for (const t of ALL_FLAVOR_TEMPLATES) {
      expect(t.template.length).toBeGreaterThan(10);
      expect(t.template.trim()).toBe(t.template);
    }
  });
});
