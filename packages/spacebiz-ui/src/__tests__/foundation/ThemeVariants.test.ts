import { describe, it, expect } from "vitest";
import {
  darkTheme,
  lightTheme,
  highContrastTheme,
  DEFAULT_THEME,
} from "../../Theme.ts";
import type { ThemeConfig, SemanticColorTokens } from "../../Theme.ts";

const SEMANTIC_GROUPS: Record<keyof SemanticColorTokens, readonly string[]> = {
  surface: ["default", "raised", "sunken", "hover", "active", "disabled"],
  text: [
    "primary",
    "secondary",
    "muted",
    "inverse",
    "link",
    "danger",
    "success",
    "warning",
  ],
  border: ["default", "strong", "subtle", "focus"],
  accent: ["primary", "secondary", "success", "warning", "danger", "info"],
};

const VARIANTS: ReadonlyArray<{ name: string; theme: ThemeConfig }> = [
  { name: "darkTheme", theme: darkTheme },
  { name: "lightTheme", theme: lightTheme },
  { name: "highContrastTheme", theme: highContrastTheme },
];

describe("Theme variants", () => {
  it("DEFAULT_THEME aliases darkTheme", () => {
    expect(DEFAULT_THEME).toBe(darkTheme);
  });

  for (const { name, theme } of VARIANTS) {
    describe(name, () => {
      it("exposes a `color` semantic-token tree alongside the legacy `colors` map", () => {
        expect(theme).toHaveProperty("color");
        expect(theme).toHaveProperty("colors");
      });

      it("contains every semantic token group with the correct keys", () => {
        for (const [group, expectedKeys] of Object.entries(SEMANTIC_GROUPS) as [
          keyof SemanticColorTokens,
          readonly string[],
        ][]) {
          const actual = theme.color[group] as Record<string, number>;
          expect(actual, `${name}.color.${group} missing`).toBeTruthy();
          for (const key of expectedKeys) {
            expect(
              actual,
              `${name}.color.${group}.${key} missing`,
            ).toHaveProperty(key);
            expect(typeof actual[key]).toBe("number");
            expect(actual[key]).toBeGreaterThanOrEqual(0);
            expect(actual[key]).toBeLessThanOrEqual(0xffffff);
          }
        }
      });

      it("populates every legacy color field with a valid hex number", () => {
        for (const value of Object.values(theme.colors)) {
          expect(typeof value).toBe("number");
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(0xffffff);
        }
      });

      it("shares the standard typography / spacing scale", () => {
        expect(theme.fonts.body.family).toBe("monospace");
        expect(theme.spacing.xs).toBe(4);
        expect(theme.spacing.xl).toBe(32);
      });
    });
  }

  it("all three variants share the exact same shape", () => {
    const reference = shapeOf(darkTheme);
    expect(shapeOf(lightTheme)).toEqual(reference);
    expect(shapeOf(highContrastTheme)).toEqual(reference);
  });

  it("light and dark variants pick distinct surface colors", () => {
    // sanity: the variants actually differ where you'd expect them to
    expect(lightTheme.color.surface.default).not.toBe(
      darkTheme.color.surface.default,
    );
    expect(lightTheme.color.text.primary).not.toBe(darkTheme.color.text.primary);
  });

  it("high-contrast theme uses pure black background and white text", () => {
    expect(highContrastTheme.color.surface.default).toBe(0x000000);
    expect(highContrastTheme.color.text.primary).toBe(0xffffff);
  });
});

/** Recursively map an object to a structure of key->typeof. Used to compare shapes. */
function shapeOf(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return typeof value;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    result[key] = shapeOf((value as Record<string, unknown>)[key]);
  }
  return result;
}
