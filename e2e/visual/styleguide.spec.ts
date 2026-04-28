import { test, expect } from "@playwright/test";

/**
 * Visual regression suite for the styleguide.
 *
 * For each registered styleguide section we:
 *   1. Scroll the styleguide scene to that section via the
 *      `window.__styleguideScrollTo(id)` hook.
 *   2. Wait briefly for any CSS/canvas reflow.
 *   3. Capture a viewport screenshot named `section-<id>.png`.
 *
 * Baselines live in `e2e/visual/__screenshots__/` (Playwright's default).
 * Regenerate with `npm run test:visual:update`.
 */

// Fallback list — used if the styleguide hasn't published a registry
// (e.g. older builds). Mirrors the IDs registered in StyleguideScene.
const FALLBACK_SECTION_IDS = [
  "colors",
  "typography",
  "buttons",
  "panels",
  "progress-bars",
  "scrollable-lists",
  "tab-groups",
  "portraits",
] as const;

type StyleguideHooks = {
  __styleguideReady?: boolean;
  __styleguideSections?: Array<{ id: string; y: number; height: number }>;
  __styleguideScrollTo?: (id: string) => boolean;
};

test.describe("Styleguide visual regression", () => {
  test.beforeEach(async ({ page }) => {
    // Pin a deterministic seed so any procedural rendering
    // (portraits, ambient FX, starfield) is byte-identical run-to-run.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("sft.seed", "1");
      } catch {
        // localStorage may be unavailable in some envs; non-fatal.
      }
    });

    await page.goto("/styleguide/");

    // Wait for the styleguide ready flag (set at the end of
    // StyleguideScene.create()).
    await page.waitForFunction(
      () => (window as unknown as StyleguideHooks).__styleguideReady === true,
      undefined,
      { timeout: 30_000 },
    );

    // Settle one frame so any final tween/layout work completes.
    await page.waitForTimeout(250);
  });

  test("captures baseline for each registered section", async ({ page }) => {
    const sectionIds = await page.evaluate<string[]>(() => {
      const hooks = window as unknown as StyleguideHooks;
      const registered = hooks.__styleguideSections;
      return registered && registered.length > 0
        ? registered.map((s) => s.id)
        : [];
    });

    const ids = sectionIds.length > 0 ? sectionIds : [...FALLBACK_SECTION_IDS];
    expect(ids.length).toBeGreaterThan(0);

    for (const id of ids) {
      const scrolled = await page.evaluate((sectionId) => {
        const hooks = window as unknown as StyleguideHooks;
        return hooks.__styleguideScrollTo
          ? hooks.__styleguideScrollTo(sectionId)
          : false;
      }, id);

      // If scroll hook isn't available we still snapshot the default view —
      // baselines for unknown sections will just match the top of the page.
      if (scrolled) {
        await page.waitForTimeout(150);
      }

      await expect(page).toHaveScreenshot(`section-${id}.png`, {
        fullPage: false,
      });
    }
  });

  test("captures full-page baseline (default theme)", async ({ page }) => {
    await expect(page).toHaveScreenshot("full-default.png", {
      fullPage: false,
    });
  });

  test("captures full-page baseline (dark theme)", async ({ page }) => {
    const switched = await page.evaluate(() => {
      const win = window as unknown as {
        __styleguideSetTheme?: (name: string) => boolean;
      };
      return win.__styleguideSetTheme
        ? win.__styleguideSetTheme("dark")
        : false;
    });
    test.skip(!switched, "theme switcher not wired in this build");
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot("full-dark.png", { fullPage: false });
  });

  test("captures full-page baseline (high-contrast theme)", async ({
    page,
  }) => {
    const switched = await page.evaluate(() => {
      const win = window as unknown as {
        __styleguideSetTheme?: (name: string) => boolean;
      };
      return win.__styleguideSetTheme
        ? win.__styleguideSetTheme("high-contrast")
        : false;
    });
    test.skip(!switched, "theme switcher not wired in this build");
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot("full-high-contrast.png", {
      fullPage: false,
    });
  });
});
