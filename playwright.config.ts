import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "5173";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Single baseline file per snapshot — no `-{platform}` suffix — so macOS
  // dev and Linux CI share the same baseline. The forgiving thresholds below
  // (maxDiffPixelRatio + threshold) absorb font-rendering variance between
  // platforms; if a snapshot becomes flaky cross-OS, prefer narrowing the
  // capture (`clip:`) over re-introducing platform-specific baselines.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 4 workers on CI (ubuntu-latest has 4 vCPUs); keep 1 locally to avoid
  // interfering with other work while developing.
  workers: process.env.CI ? 4 : 1,
  reporter: process.env.CI ? [["list"], ["blob"]] : [["list"]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Forgiving thresholds for visual regression — font hinting and
    // sub-pixel anti-aliasing differ slightly between machines.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /visual\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual",
      testMatch: /visual\/.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Pinned for snapshot stability across HiDPI dev machines.
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
