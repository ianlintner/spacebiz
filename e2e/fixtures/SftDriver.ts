import type { Page } from "@playwright/test";
import type {
  GameStateSnapshot,
  TestIdEntry,
  ClickResult,
  SceneInfo,
  LogEntry,
  InvariantViolation,
} from "../../src/testing/types.ts";
import type {
  PortraitStatus,
  AdviserSnapshot,
} from "../../src/testing/tier2.ts";
import type { TickerItem } from "../../src/generation/news/types.ts";

/**
 * Typed wrapper around `window.__sft` exposed over `page.evaluate`. The browser
 * fa\u00e7ade is the source of truth for shapes; this file re-exports the types.
 */
export class SftDriver {
  constructor(private page: Page) {}

  /** Wait until the DEV-only fa\u00e7ade has attached to window. */
  async ready(timeoutMs = 15_000): Promise<void> {
    await this.page.waitForFunction(
      () =>
        typeof (window as unknown as { __sft?: unknown }).__sft === "object",
      undefined,
      { timeout: timeoutMs },
    );
  }

  /** Wait until at least one widget has been registered from an active scene. */
  async readyWithWidgets(timeoutMs = 15_000): Promise<void> {
    await this.ready(timeoutMs);
    await this.page.waitForFunction(
      () => (window.__sft?.list().length ?? 0) > 0,
      undefined,
      { timeout: timeoutMs, polling: 100 },
    );
  }

  version(): Promise<string> {
    return this.page.evaluate(() => window.__sft!.version);
  }

  list(filter?: string): Promise<TestIdEntry[]> {
    return this.page.evaluate((f) => window.__sft!.list(f), filter);
  }

  currentScene(): Promise<SceneInfo> {
    return this.page.evaluate(() => window.__sft!.currentScene());
  }

  click(testId: string): Promise<ClickResult> {
    return this.page.evaluate((id) => window.__sft!.click(id), testId);
  }

  clickIfPresent(testId: string): Promise<ClickResult | null> {
    return this.page.evaluate((id) => window.__sft!.clickIfPresent(id), testId);
  }

  snapshot(): Promise<GameStateSnapshot> {
    return this.page.evaluate(() => window.__sft!.snapshot());
  }

  state<T = unknown>(): Promise<T> {
    return this.page.evaluate(() => window.__sft!.state()) as Promise<T>;
  }

  seed(n: number): Promise<void> {
    return this.page.evaluate((v) => window.__sft!.seed(v), n);
  }

  getSeed(): Promise<number> {
    return this.page.evaluate(() => window.__sft!.getSeed());
  }

  /** Wait for a predicate evaluated inside the page context. */
  waitForState<T>(
    fn: (state: unknown) => boolean,
    timeoutMs = 5_000,
  ): Promise<T> {
    return this.page.waitForFunction(
      (src) => {
        const pred = new Function("s", `return (${src})(s);`) as (
          s: unknown,
        ) => boolean;
        return pred(window.__sft!.state());
      },
      fn.toString(),
      { timeout: timeoutMs, polling: 50 },
    ) as unknown as Promise<T>;
  }

  logTail(n = 50): Promise<LogEntry[]> {
    return this.page.evaluate((count) => window.__sft!.log.tail(count), n);
  }

  logClear(): Promise<void> {
    return this.page.evaluate(() => window.__sft!.log.clear());
  }

  invariantViolations(): Promise<InvariantViolation[]> {
    return this.page.evaluate(() => window.__sft!.invariants.recent());
  }

  getPortrait(ceoId?: string): Promise<PortraitStatus> {
    return this.page.evaluate((id) => window.__sft!.getPortrait(id), ceoId);
  }

  getNewsItems(): Promise<TickerItem[]> {
    return this.page.evaluate(() => window.__sft!.getNewsItems());
  }

  getAdviserState(): Promise<AdviserSnapshot> {
    return this.page.evaluate(() => window.__sft!.getAdviserState());
  }

  /** Typed proxy for `__sft.actions.*`. */
  readonly actions: ActionProxy = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        return (...args: unknown[]): Promise<unknown> => {
          return this.page.evaluate(
            ([name, payload]) => {
              const actions = window.__sft!.actions as unknown as Record<
                string,
                (...a: unknown[]) => unknown
              >;
              const fn = actions[name];
              if (typeof fn !== "function") {
                throw new Error(`__sft.actions.${name} is not a function`);
              }
              return Promise.resolve(fn(...(payload as unknown[])));
            },
            [prop, args] as const,
          );
        };
      },
    },
  ) as ActionProxy;
}

import type { SandboxRunOptions } from "../../src/testing/actions.ts";

export type { SandboxRunOptions };

export type ActionProxy = {
  newGame: (seed?: number) => Promise<void>;
  endTurn: () => Promise<ClickResult | null>;
  openScene: (key: string, data?: object) => Promise<void>;
  closeModal: () => Promise<void>;
  seed: (n: number) => Promise<void>;
  getSeed: () => Promise<number>;
  triggerDilemma: (templateId?: string) => Promise<string>;
  forceGameOver: (reason?: "completed" | "bankruptcy") => Promise<void>;
  startSandboxPlayback: (opts?: SandboxRunOptions) => Promise<unknown>;
  startSandboxSummary: (opts?: SandboxRunOptions) => Promise<unknown>;
};
