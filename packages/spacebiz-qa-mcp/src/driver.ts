import type { Page } from "playwright";
import type {
  ClickResult,
  GameStateSnapshot,
  InvariantViolation,
  LogEntry,
  SceneInfo,
  TestIdEntry,
} from "./types.js";

/**
 * Thin wrapper around `window.__sft` exposed over `page.evaluate`. Mirrors
 * `e2e/fixtures/SftDriver.ts` from the main app tree. This copy exists so the
 * MCP package can be built independently of the app's Vite/Phaser pipeline.
 */
export class SftDriver {
  constructor(private page: Page) {}

  async ready(timeoutMs = 15_000): Promise<void> {
    await this.page.waitForFunction(
      () =>
        typeof (window as unknown as { __sft?: unknown }).__sft === "object",
      undefined,
      { timeout: timeoutMs },
    );
  }

  version(): Promise<string> {
    return this.page.evaluate(() => (window as any).__sft.version as string);
  }

  list(filter?: string): Promise<TestIdEntry[]> {
    return this.page.evaluate(
      (f) => (window as any).__sft.list(f) as TestIdEntry[],
      filter,
    );
  }

  currentScene(): Promise<SceneInfo> {
    return this.page.evaluate(
      () => (window as any).__sft.currentScene() as SceneInfo,
    );
  }

  click(testId: string): Promise<ClickResult> {
    return this.page.evaluate(
      (id) => (window as any).__sft.click(id) as ClickResult,
      testId,
    );
  }

  clickIfPresent(testId: string): Promise<ClickResult | null> {
    return this.page.evaluate(
      (id) => (window as any).__sft.clickIfPresent(id) as ClickResult | null,
      testId,
    );
  }

  snapshot(): Promise<GameStateSnapshot> {
    return this.page.evaluate(
      () => (window as any).__sft.snapshot() as GameStateSnapshot,
    );
  }

  state<T = unknown>(): Promise<T> {
    return this.page.evaluate(() =>
      (window as any).__sft.state(),
    ) as Promise<T>;
  }

  help(): Promise<unknown> {
    return this.page.evaluate(() => {
      const fn = (window as any).__sft?.help;
      if (typeof fn === "function") return Promise.resolve(fn());
      return null;
    });
  }

  seed(n: number): Promise<void> {
    return this.page.evaluate((v) => (window as any).__sft.seed(v), n);
  }

  getSeed(): Promise<number> {
    return this.page.evaluate(() => (window as any).__sft.getSeed() as number);
  }

  logTail(n = 50): Promise<LogEntry[]> {
    return this.page.evaluate(
      (count) => (window as any).__sft.log.tail(count) as LogEntry[],
      n,
    );
  }

  logClear(): Promise<void> {
    return this.page.evaluate(() => (window as any).__sft.log.clear());
  }

  invariantViolations(): Promise<InvariantViolation[]> {
    return this.page.evaluate(
      () => (window as any).__sft.invariants.recent() as InvariantViolation[],
    );
  }

  /** Invoke an action by name, e.g. `action("newGame", 42)`. */
  action(name: string, ...args: unknown[]): Promise<unknown> {
    return this.page.evaluate(
      ([n, a]) => {
        const actions = (
          (window as any).__sft as {
            actions: Record<string, (...x: unknown[]) => unknown>;
          }
        ).actions;
        const fn = actions[n as string];
        if (typeof fn !== "function") {
          throw new Error(`__sft.actions.${n} is not a function`);
        }
        return Promise.resolve(fn(...(a as unknown[])));
      },
      [name, args] as const,
    );
  }
}
