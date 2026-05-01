import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Visual QA pass for the fluid layout work — verifies that core content scenes
 * reflow correctly when the browser viewport changes across desktop HD aspect
 * ratios. One screenshot per (resolution × scene) lands in
 * docs/pr-screenshots/pr-fluid-layout/.
 *
 * The dev server's main.ts uses a ResizeObserver on #game-container, so a
 * page.setViewportSize() call propagates to Phaser's scale.resize after the
 * observer fires. We wait a beat between size + scene-switch and screenshot
 * for the reflow to settle.
 */

interface Resolution {
  label: string;
  width: number;
  height: number;
}

const RESOLUTIONS: Resolution[] = [
  { label: "1366x768", width: 1366, height: 768 }, // common laptop 16:9
  { label: "1920x1080", width: 1920, height: 1080 }, // FHD 16:9 baseline
  { label: "1920x1200", width: 1920, height: 1200 }, // 16:10
  { label: "2560x1440", width: 2560, height: 1440 }, // QHD 16:9
  { label: "3440x1440", width: 3440, height: 1440 }, // 21:9 ultra-wide
];

const SCENES = [
  "RoutesScene",
  "FleetScene",
  "MarketScene",
  "FinanceScene",
  "CompetitionScene",
] as const;

const OUT_DIR = path.join(
  process.cwd(),
  "docs",
  "pr-screenshots",
  "pr-fluid-layout",
);

test.describe("Fluid layout visual QA", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test("captures every scene at every HD resolution", async ({ page, sft }) => {
    test.setTimeout(360_000);

    // Bootstrap a started game once. Subsequent scene switches reuse it so we
    // don't pay the new-game wizard cost per resolution.
    await sft.seed(2026);
    await sft.actions.newGame(2026);

    await sft.readyWithWidgets();
    const launched = await sft.clickIfPresent("btn-launch");
    if (!launched) {
      console.warn("btn-launch not found at startup");
    }
    await page.waitForTimeout(800);

    // Play one turn so scenes that read history (Finance, Competition) have
    // something to render.
    await sft.readyWithWidgets();
    await page.evaluate(() => {
      const game = window.__SFT_GAME;
      if (!game) return;
      const hud = game.scene.getScene("GameHUDScene") as
        | (Phaser.Scene & { handleEndTurn?: () => void })
        | null;
      hud?.handleEndTurn?.();
    });
    await page.waitForTimeout(1500);
    await sft.actions.closeModal();
    await page.waitForTimeout(300);

    // Reparent #game-container to <body> so it tracks the viewport directly,
    // free of the marketing site's column layout. Done once before the loop —
    // the canvas survives because Phaser holds its own reference.
    await page.evaluate(() => {
      const container = document.getElementById("game-container");
      if (!container) return;
      // Hide everything else on the page so nothing fights for layout.
      Array.from(document.body.children).forEach((el) => {
        if (el.id !== "game-container" && el !== container.parentElement) {
          (el as HTMLElement).style.display = "none";
        }
      });
      document.body.appendChild(container);
      container.style.cssText =
        "position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 99999 !important; margin: 0 !important; padding: 0 !important; border: 0 !important;";
      document.documentElement.style.cssText = "margin: 0; padding: 0;";
      document.body.style.cssText = "margin: 0; padding: 0; overflow: hidden;";
    });

    const gameContainer = page.locator("#game-container");

    for (const res of RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });

      // Nudge the resize pipeline. main.ts's ResizeObserver listens on
      // #game-container; dispatching a window.resize hits the fallback path
      // which always calls resizeGameToViewport → updateLayout → scale.resize.
      await page.evaluate(() => {
        // Two events across rAF boundaries; main.ts dedupes so this is safe.
        window.dispatchEvent(new Event("resize"));
      });
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        window.dispatchEvent(new Event("resize"));
      });
      // Long enough for: rAF → updateLayout → scale.resize → scene reflow.
      await page.waitForTimeout(800);

      for (const sceneKey of SCENES) {
        await sft.actions.openScene(sceneKey);
        await page.waitForTimeout(500);

        const sceneNow = await sft.currentScene();
        expect(
          sceneNow.active.includes(sceneKey),
          `expected ${sceneKey} active at ${res.label}`,
        ).toBe(true);

        const file = path.join(
          OUT_DIR,
          `${res.label}-${sceneKey.replace(/Scene$/, "").toLowerCase()}.png`,
        );
        await gameContainer.screenshot({ path: file });
      }
    }

    console.log(`✅ Fluid-layout screenshots saved → ${OUT_DIR}`);
  });
});
