import { test as base, type Page } from "@playwright/test";
import { SftDriver } from "./SftDriver.ts";

export const test = base.extend<{ sft: SftDriver }>({
  sft: async (
    { page }: { page: Page },
    use: (d: SftDriver) => Promise<void>,
  ) => {
    await page.goto("/");
    const driver = new SftDriver(page);
    await driver.ready();
    await use(driver);
  },
});

export { expect } from "@playwright/test";
