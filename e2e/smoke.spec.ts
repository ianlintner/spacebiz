import { test, expect } from "./fixtures/sft.ts";

test.describe("QA console fa\u00e7ade", () => {
  test("window.__sft is attached on dev server", async ({ sft }) => {
    const v = await sft.version();
    expect(v).toBeTruthy();
  });

  test("list() returns widgets from the main menu", async ({ sft }) => {
    await sft.readyWithWidgets();
    const items = await sft.list();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(typeof item.testId).toBe("string");
      expect(typeof item.label).toBe("string");
      expect(typeof item.scene).toBe("string");
    }
  });

  test("snapshot() returns a JSON-safe game state", async ({ sft }) => {
    const snap = await sft.snapshot();
    expect(snap).toHaveProperty("version");
    expect(snap).toHaveProperty("state");
    expect(snap.state).toHaveProperty("cash");
    expect(snap.state).toHaveProperty("turn");
    expect(snap.state).toHaveProperty("seed");
    expect(typeof snap.state.turn).toBe("number");
  });

  test("seed reset is reflected in getSeed", async ({ sft }) => {
    await sft.seed(42);
    expect(await sft.getSeed()).toBe(42);
    await sft.seed(1337);
    expect(await sft.getSeed()).toBe(1337);
  });

  test("invariant violations are surfaced through recent()", async ({
    sft,
    page,
  }) => {
    await page.evaluate(() => {
      window.__sft!.invariants.register(
        "always-fails",
        () => "forced violation",
      );
      window.__sft!.invariants.run();
    });
    const recent = await sft.invariantViolations();
    expect(recent.some((v) => v.name === "always-fails")).toBe(true);
  });

  test("log.tail surfaces emitted log entries", async ({ sft, page }) => {
    await sft.logClear();
    await page.evaluate(() => {
      const win = window as unknown as {
        __sft: {
          log: { channel: (n: string) => { info: (m: string) => void } };
        };
      };
      win.__sft.log.channel("e2e-smoke").info("hello");
    });
    const tail = await sft.logTail();
    expect(
      tail.some((e) => e.channel === "e2e-smoke" && e.message === "hello"),
    ).toBe(true);
  });

  test("click on unknown testId throws a structured error", async ({
    sft,
    page,
  }) => {
    await sft.readyWithWidgets();
    const thrown = await page.evaluate(() => {
      try {
        window.__sft!.click("btn-does-not-exist");
        return null;
      } catch (err) {
        const e = err as Error & { code?: string };
        return { name: e.name, code: e.code, message: e.message };
      }
    });
    expect(thrown).not.toBeNull();
    expect(thrown!.name).toBe("SftTestError");
    expect(thrown!.code).toBe("unknown-test-id");
  });
});
