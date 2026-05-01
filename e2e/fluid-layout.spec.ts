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
 *
 * Coverage is split into two tests:
 *   1. "in-game scenes" — bootstraps a game once, then loops every resolution
 *      × scene combination. Includes scenes that need init data (planetId,
 *      systemId, AI sandbox config).
 *   2. "pre-game scenes" — captures the menus that only render before a game
 *      is started (MainMenu, GalaxySetup, SandboxSetup). Re-uses the same
 *      reparented #game-container trick.
 *
 * Scenes intentionally not screenshotted:
 *   - GameHUDScene — overlay that's already implicitly captured behind every
 *     in-game content screenshot, so a dedicated capture would be redundant.
 *   - DilemmaScene — needs a pending dilemma event in state; no programmatic
 *     trigger exposed via __sft.
 *   - SimPlaybackScene — render is animation-driven and relies on the 3D
 *     galaxy canvas overlay; static screenshots aren't meaningful.
 *   - SimSummaryScene — requires a populated SimulationResult passed as init
 *     data; only reachable from the AI sandbox flow.
 *   - GameOverScene — requires end-of-game state with a final TurnResult; no
 *     programmatic trigger exposed.
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

/**
 * Scenes captured while a game is in progress. Most open via plain
 * `actions.openScene(key)`; a few need init data (PlanetDetail wants a
 * planetId, SystemMap wants a systemId, AISandbox wants a config payload).
 * The data factory runs inside the page context and reads from gameStore.
 */
interface InGameSceneSpec {
  key: string;
  /** Optional payload computed on the page side; receives no args. */
  dataScript?: string;
}

const IN_GAME_SCENES: InGameSceneSpec[] = [
  // Original priority five
  { key: "RoutesScene" },
  { key: "FleetScene" },
  { key: "MarketScene" },
  { key: "FinanceScene" },
  { key: "CompetitionScene" },
  // Newly-migrated content scenes
  { key: "EmpireScene" },
  { key: "TechTreeScene" },
  { key: "ContractsScene" },
  { key: "DiplomacyScene" },
  { key: "GalaxyMapScene" },
  { key: "StationBuilderScene" },
  {
    key: "PlanetDetailScene",
    dataScript: `(() => {
      const state = window.__sft.state();
      const planet = state.galaxy.planets[0];
      return planet ? { planetId: planet.id } : {};
    })()`,
  },
  {
    key: "SystemMapScene",
    dataScript: `(() => {
      const state = window.__sft.state();
      const system = state.galaxy.systems[0];
      return system ? { systemId: system.id } : {};
    })()`,
  },
  {
    key: "AISandboxScene",
    dataScript: `({
      seed: 2026,
      gameSize: "quick",
      galaxyShape: "spiral",
      companyCount: 4,
      speed: "paused",
      logLevel: "summary",
    })`,
  },
  // Captured after end-of-turn so state.history has a TurnResult to render.
  { key: "TurnReportScene" },
];

const PRE_GAME_SCENES = [
  "MainMenuScene",
  "GalaxySetupScene",
  "SandboxSetupScene",
] as const;

const OUT_DIR = path.join(
  process.cwd(),
  "docs",
  "pr-screenshots",
  "pr-fluid-layout",
);

/**
 * Reparents #game-container to <body> and stretches it to the viewport so
 * page.setViewportSize() drives Phaser's resize pipeline directly, free of
 * the marketing site's column layout. Idempotent.
 */
async function detachGameContainer(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    const container = document.getElementById("game-container");
    if (!container) return;
    if (container.dataset.fluidLayoutDetached === "1") return;
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
    container.dataset.fluidLayoutDetached = "1";
  });
}

/** Nudge the resize pipeline so Phaser sees the new viewport. */
async function settleResize(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
  });
  // Long enough for: rAF → updateLayout → scale.resize → scene reflow.
  await page.waitForTimeout(800);
}

function screenshotPath(resolution: string, sceneKey: string): string {
  return path.join(
    OUT_DIR,
    `${resolution}-${sceneKey.replace(/Scene$/, "").toLowerCase()}.png`,
  );
}

test.describe("Fluid layout visual QA", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test("captures in-game scenes at every HD resolution", async ({
    page,
    sft,
  }) => {
    test.setTimeout(720_000);

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

    // Play one turn so scenes that read history (Finance, Competition,
    // TurnReport) have something to render.
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

    await detachGameContainer(page);
    const gameContainer = page.locator("#game-container");

    for (const res of RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await settleResize(page);

      for (const spec of IN_GAME_SCENES) {
        const data = spec.dataScript
          ? await page.evaluate<Record<string, unknown>>(spec.dataScript)
          : undefined;
        await sft.actions.openScene(spec.key, data);
        // AISandboxScene boots a runner that paints frames asynchronously;
        // give it a touch more settle time than the static content scenes.
        await page.waitForTimeout(spec.key === "AISandboxScene" ? 900 : 500);

        const sceneNow = await sft.currentScene();
        expect(
          sceneNow.active.includes(spec.key),
          `expected ${spec.key} active at ${res.label}`,
        ).toBe(true);

        await gameContainer.screenshot({
          path: screenshotPath(res.label, spec.key),
        });
      }
    }

    console.log(`✅ Fluid-layout in-game screenshots saved → ${OUT_DIR}`);
  });

  test("captures pre-game menu scenes at every HD resolution", async ({
    page,
    sft,
  }) => {
    test.setTimeout(240_000);

    // No newGame() — we stay on MainMenuScene so GalaxySetup/SandboxSetup
    // open as fresh setup wizards rather than mid-campaign.
    await sft.ready();
    await page.waitForTimeout(300);

    await detachGameContainer(page);
    const gameContainer = page.locator("#game-container");

    for (const res of RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await settleResize(page);

      for (const sceneKey of PRE_GAME_SCENES) {
        await sft.actions.openScene(sceneKey);
        await page.waitForTimeout(500);

        const sceneNow = await sft.currentScene();
        expect(
          sceneNow.active.includes(sceneKey),
          `expected ${sceneKey} active at ${res.label}`,
        ).toBe(true);

        await gameContainer.screenshot({
          path: screenshotPath(res.label, sceneKey),
        });
      }
    }

    console.log(`✅ Fluid-layout pre-game screenshots saved → ${OUT_DIR}`);
  });
});
