import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_THEME,
  getTheme,
  setTheme,
  colorToString,
  colorWithAlpha,
  lerpColor,
} from "../../Theme.ts";
import type { ThemeConfig } from "../../Theme.ts";

describe("Theme", () => {
  beforeEach(() => {
    // Always reset to default to avoid test pollution.
    setTheme(DEFAULT_THEME);
  });

  describe("DEFAULT_THEME", () => {
    it("exposes the expected top-level shape", () => {
      expect(DEFAULT_THEME).toHaveProperty("colors");
      expect(DEFAULT_THEME).toHaveProperty("fonts");
      expect(DEFAULT_THEME).toHaveProperty("spacing");
      expect(DEFAULT_THEME).toHaveProperty("panel");
      expect(DEFAULT_THEME).toHaveProperty("button");
      expect(DEFAULT_THEME).toHaveProperty("glow");
      expect(DEFAULT_THEME).toHaveProperty("glass");
      expect(DEFAULT_THEME).toHaveProperty("chamfer");
      expect(DEFAULT_THEME).toHaveProperty("ambient");
    });

    it("uses numeric hex color codes", () => {
      for (const value of Object.values(DEFAULT_THEME.colors)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffff);
      }
    });

    it("defines spacing scale in ascending order", () => {
      const { xs, sm, md, lg, xl } = DEFAULT_THEME.spacing;
      expect(xs).toBeLessThan(sm);
      expect(sm).toBeLessThan(md);
      expect(md).toBeLessThan(lg);
      expect(lg).toBeLessThan(xl);
    });

    it("defines all four font roles with size and family", () => {
      for (const role of ["heading", "body", "caption", "value"] as const) {
        expect(DEFAULT_THEME.fonts[role].size).toBeGreaterThan(0);
        expect(typeof DEFAULT_THEME.fonts[role].family).toBe("string");
      }
    });
  });

  describe("getTheme / setTheme", () => {
    it("returns the default theme initially", () => {
      expect(getTheme()).toBe(DEFAULT_THEME);
    });

    it("replaces the active theme via setTheme", () => {
      const custom: ThemeConfig = {
        ...DEFAULT_THEME,
        colors: { ...DEFAULT_THEME.colors, accent: 0xff00ff },
      };
      setTheme(custom);
      expect(getTheme()).toBe(custom);
      expect(getTheme().colors.accent).toBe(0xff00ff);
    });

    it("can be reset back to DEFAULT_THEME", () => {
      const custom: ThemeConfig = {
        ...DEFAULT_THEME,
        colors: { ...DEFAULT_THEME.colors, accent: 0x123456 },
      };
      setTheme(custom);
      expect(getTheme().colors.accent).toBe(0x123456);
      setTheme(DEFAULT_THEME);
      expect(getTheme()).toBe(DEFAULT_THEME);
    });
  });

  describe("colorToString", () => {
    it("formats a hex number with leading hash and zero padding", () => {
      expect(colorToString(0xff00ff)).toBe("#ff00ff");
      expect(colorToString(0x000001)).toBe("#000001");
      expect(colorToString(0)).toBe("#000000");
    });

    it("matches Phaser-style 6-digit hex strings", () => {
      expect(colorToString(0xabcdef)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("colorWithAlpha", () => {
    it("returns the supplied color and alpha as a struct", () => {
      const result = colorWithAlpha(0x112233, 0.5);
      expect(result).toEqual({ color: 0x112233, alpha: 0.5 });
    });
  });

  describe("lerpColor", () => {
    it("returns c1 at t=0", () => {
      expect(lerpColor(0xff0000, 0x00ff00, 0)).toBe(0xff0000);
    });

    it("returns c2 at t=1", () => {
      expect(lerpColor(0xff0000, 0x00ff00, 1)).toBe(0x00ff00);
    });

    it("returns the midpoint at t=0.5", () => {
      // Halfway between 0xff0000 (255,0,0) and 0x00ff00 (0,255,0)
      // = (128, 128, 0) = 0x808000
      expect(lerpColor(0xff0000, 0x00ff00, 0.5)).toBe(0x808000);
    });

    it("interpolates per-channel across all RGB", () => {
      // 0x000000 to 0xffffff midpoint = 0x808080
      expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    });

    it("rounds intermediate values predictably", () => {
      const result = lerpColor(0x000000, 0x010101, 0.5);
      // Each channel: round(0 + 1*0.5) = round(0.5) = 1 (Math.round half-up)
      expect(result).toBe(0x010101);
    });
  });
});
