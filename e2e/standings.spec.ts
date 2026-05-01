import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Local QA pass for the Standings Graph tab in CompetitionScene.
 * Goes through the new-game wizard → plays a few turns → opens Competition →
 * captures a screenshot for each metric (Cash / Routes / Fleet).
 */
test.describe("Standings Graph QA", () => {
  test("renders Standings tab across all metrics", async ({ page, sft }) => {
    test.setTimeout(120_000);

    const outDir = path.join(process.cwd(), "e2e", "screenshots", "standings");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    await sft.seed(2026);
    await sft.actions.newGame(2026);

    // newGame leaves us on GalaxySetupScene. Click Launch to enter the HUD.
    await sft.readyWithWidgets();
    const launched = await sft.clickIfPresent("btn-launch");
    if (!launched) {
      console.warn("btn-launch not found — listing widgets:");
      console.warn(await sft.list());
    }
    await page.waitForTimeout(800);

    // Wait until end-turn button appears (means we're on the HUD).
    await sft.readyWithWidgets();
    await page
      .waitForFunction(
        () =>
          window.__sft?.list().some((w) => w.testId === "btn-end-turn") ??
          false,
        undefined,
        { timeout: 10_000 },
      )
      .catch(() => {
        console.warn("btn-end-turn not found after launch");
      });

    // Play a few turns so history populates. The end-turn button uses a
    // glyph label ("▶") with no explicit testId so `actions.endTurn()` can't
    // find it — call the scene's handler directly via window.__SFT_GAME.
    for (let i = 0; i < 4; i++) {
      const ended = await page.evaluate(() => {
        const game = window.__SFT_GAME;
        if (!game) return false;
        const hud = game.scene.getScene("GameHUDScene") as
          | (Phaser.Scene & { handleEndTurn?: () => void })
          | null;
        if (!hud || typeof hud.handleEndTurn !== "function") return false;
        hud.handleEndTurn();
        return true;
      });
      if (!ended) {
        console.warn(`Could not end turn ${i + 1}`);
        break;
      }
      await page.waitForTimeout(1500);
      await sft.actions.closeModal();
      await page.waitForTimeout(300);
    }

    await sft.actions.openScene("CompetitionScene");
    await page.waitForTimeout(500);

    const sceneNow = await sft.currentScene();
    expect(sceneNow.active.includes("CompetitionScene")).toBe(true);

    await page.screenshot({
      path: path.join(outDir, "01-companies-tab.png"),
      fullPage: false,
    });

    // Flip the outer Companies/Standings TabGroup at the scene root.
    const switchResult = await page.evaluate(() => {
      const game = window.__SFT_GAME;
      if (!game) return { ok: false, reason: "no game on window" };
      const scene = game.scene.getScene("CompetitionScene") as
        | (Phaser.Scene & { children: Phaser.GameObjects.DisplayList })
        | null;
      if (!scene) return { ok: false, reason: "no CompetitionScene" };
      const root = scene.children.list as unknown as Array<{
        setActiveTab?: (i: number) => void;
      }>;
      const groups = root.filter((c) => typeof c.setActiveTab === "function");
      if (groups.length === 0) {
        return { ok: false, reason: "no TabGroup at scene root" };
      }
      groups[0].setActiveTab!(1);
      return { ok: true, foundGroups: groups.length };
    });
    console.log("Outer tab switch:", switchResult);
    expect(switchResult.ok).toBe(true);

    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(outDir, "02-standings-cash.png"),
      fullPage: false,
    });

    const setMetric = async (idx: number): Promise<boolean> => {
      return await page.evaluate((i) => {
        const game = window.__SFT_GAME;
        if (!game) return false;
        const scene = game.scene.getScene("CompetitionScene") as
          | (Phaser.Scene & { children: Phaser.GameObjects.DisplayList })
          | null;
        if (!scene) return false;
        const root = scene.children.list as unknown as Array<{
          setStandingsData?: unknown;
          list?: Array<{ setActiveTab?: (i: number) => void }>;
        }>;
        const graph = root.find(
          (c) => typeof c.setStandingsData === "function",
        );
        if (!graph?.list) return false;
        const inner = graph.list.find(
          (c) => typeof c.setActiveTab === "function",
        );
        if (!inner?.setActiveTab) return false;
        inner.setActiveTab(i);
        return true;
      }, idx);
    };

    expect(await setMetric(1)).toBe(true);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(outDir, "03-standings-routes.png"),
      fullPage: false,
    });

    expect(await setMetric(2)).toBe(true);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(outDir, "04-standings-fleet.png"),
      fullPage: false,
    });

    console.log(`✅ Standings screenshots saved → ${outDir}`);
  });
});
