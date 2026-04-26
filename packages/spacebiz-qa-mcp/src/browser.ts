import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

const DEFAULT_URL = "http://localhost:5173";
const READY_TIMEOUT_MS = Number(process.env.SFT_READY_TIMEOUT_MS ?? 30_000);

interface BrowserState {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

let state: BrowserState | null = null;
let launchPromise: Promise<BrowserState> | null = null;

function targetUrl(): string {
  return process.env.SFT_URL ?? DEFAULT_URL;
}

async function launch(): Promise<BrowserState> {
  const headless = process.env.SFT_HEADLESS !== "false";
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(targetUrl(), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof (window as unknown as { __sft?: unknown }).__sft === "object",
    undefined,
    { timeout: READY_TIMEOUT_MS },
  );
  return { browser, context, page };
}

/**
 * Lazily launch a Chromium instance, navigate to the dev server, and wait for
 * the `window.__sft` façade. Subsequent calls reuse the same page.
 */
export async function getPage(): Promise<Page> {
  if (state) return state.page;
  if (!launchPromise) {
    launchPromise = launch().catch((err) => {
      launchPromise = null;
      throw err;
    });
  }
  state = await launchPromise;
  launchPromise = null;
  return state.page;
}

/** Re-navigate to the configured URL and wait for `__sft` again. */
export async function reload(): Promise<Page> {
  const page = await getPage();
  await page.goto(targetUrl(), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof (window as unknown as { __sft?: unknown }).__sft === "object",
    undefined,
    { timeout: READY_TIMEOUT_MS },
  );
  return page;
}

/** Close the Chromium instance. Invoked on MCP shutdown. */
export async function closeBrowser(): Promise<void> {
  if (!state) return;
  const { browser } = state;
  state = null;
  try {
    await browser.close();
  } catch {
    // best-effort
  }
}
