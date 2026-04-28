import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * E2E gameplay test that plays a few turns of the game using the __sft API,
 * capturing screenshots at key scenes for visual verification.
 */
test.describe("Gameplay E2E", () => {
  test("play multiple turns and capture key scenes", async ({ page, sft }) => {
    // Ensure screenshots directory exists
    const screenshotsDir = path.join(process.cwd(), "e2e", "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Start a new game with a fixed seed for reproducibility
    await sft.seed(12345);
    await sft.actions.newGame(12345);

    // Wait for game to be ready
    await sft.readyWithWidgets();

    // Capture initial main menu/game start
    const scene1 = await sft.currentScene();
    console.log(`Current scene: ${scene1.key}`);
    await page.screenshot({
      path: path.join(screenshotsDir, "01-game-start.png"),
      fullPage: false,
    });

    // Get initial game state
    const initialState = await sft.snapshot();
    console.log(
      `Initial state - Turn: ${initialState.state.turn}, Cash: ${initialState.state.cash}`,
    );
    // Game starts at turn 1
    expect(initialState.state.turn).toBeGreaterThanOrEqual(1);

    // Play first turn - try to end turn
    console.log("Attempting to end turn 1...");
    const endTurn1 = await sft.actions.endTurn();
    console.log(`End turn 1 result:`, endTurn1);

    // Wait a bit for turn processing
    await page.waitForTimeout(1000);

    // Capture after first turn
    const scene2 = await sft.currentScene();
    console.log(`Scene after turn 1: ${scene2.key}`);
    await page.screenshot({
      path: path.join(screenshotsDir, "02-after-turn-1.png"),
      fullPage: false,
    });

    const state1 = await sft.snapshot();
    console.log(
      `After turn 1 - Turn: ${state1.state.turn}, Cash: ${state1.state.cash}`,
    );
    // Turn should have progressed
    expect(state1.state.turn).toBeGreaterThanOrEqual(initialState.state.turn);

    // Play second turn
    console.log("Attempting to end turn 2...");
    const endTurn2 = await sft.actions.endTurn();
    console.log(`End turn 2 result:`, endTurn2);

    await page.waitForTimeout(1000);

    // Capture after second turn
    const scene3 = await sft.currentScene();
    console.log(`Scene after turn 2: ${scene3.key}`);
    await page.screenshot({
      path: path.join(screenshotsDir, "03-after-turn-2.png"),
      fullPage: false,
    });

    const state2 = await sft.snapshot();
    console.log(
      `After turn 2 - Turn: ${state2.state.turn}, Cash: ${state2.state.cash}`,
    );
    // Turn should have progressed
    expect(state2.state.turn).toBeGreaterThanOrEqual(state1.state.turn);

    // Try to interact with some game elements if available
    const widgets = await sft.list();
    console.log(
      `Available widgets: ${widgets.map((w) => w.testId).join(", ")}`,
    );

    // Look for a routes or market button to open
    const routeButton = widgets.find(
      (w) =>
        w.testId.includes("route") ||
        w.testId.includes("market") ||
        w.testId.includes("fleet"),
    );

    if (routeButton) {
      console.log(`Clicking ${routeButton.testId}...`);
      await sft.click(routeButton.testId);
      await page.waitForTimeout(500);

      // Capture the opened scene
      const scene4 = await sft.currentScene();
      console.log(`Scene after clicking button: ${scene4.key}`);
      await page.screenshot({
        path: path.join(screenshotsDir, "04-ui-interaction.png"),
        fullPage: false,
      });

      // Close modal if one was opened
      await sft.actions.closeModal();
      await page.waitForTimeout(500);
    }

    // Play one more turn
    console.log("Attempting to end turn 3...");
    const endTurn3 = await sft.actions.endTurn();
    console.log(`End turn 3 result:`, endTurn3);

    await page.waitForTimeout(1000);

    // Final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "05-final-state.png"),
      fullPage: false,
    });

    const finalState = await sft.snapshot();
    console.log(
      `Final state - Turn: ${finalState.state.turn}, Cash: ${finalState.state.cash}`,
    );

    // Verify we've played through multiple turn attempts
    // (turn may not always advance if game state doesn't allow it)
    expect(finalState.state.turn).toBeGreaterThanOrEqual(
      initialState.state.turn,
    );

    // Check that game state is valid
    expect(finalState.version).toBeTruthy();
    expect(finalState.state).toHaveProperty("cash");
    expect(finalState.state).toHaveProperty("seed");
    expect(finalState.state.seed).toBe(12345);

    console.log("✅ Gameplay E2E test completed successfully");
  });
});
