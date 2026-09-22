import { test as baseTest, type FrameLocator, type Page } from "@playwright/test";

import { createBrowserHarness } from "../browser-harness";
import type { RuntimeDataFixture } from "../runtime-data-fixture";

export interface BrowserTestOptions {
  readonly root?: string;
  readonly runtimeData?: RuntimeDataFixture;
}

export interface BrowserTestFixture {
  readonly page: Page;
  readonly sandbox: FrameLocator;
  readonly app: FrameLocator;
}

export async function createReadyBrowserTestFixture(page: Page): Promise<BrowserTestFixture> {
  const sandbox = page.frameLocator("#sandboxFrame");

  await sandbox.locator('#userHtmlFrame[data-vegas-ready="true"]').waitFor({
    state: "attached",
  });

  return {
    page,
    sandbox,
    app: sandbox.frameLocator("#userHtmlFrame"),
  };
}

export function createBrowserTest(options: BrowserTestOptions = {}) {
  return baseTest.extend<{ vegas: BrowserTestFixture }>({
    vegas: async ({ page }, use) => {
      const harness = await createBrowserHarness(options);

      try {
        await page.goto(harness.urls.host);
        await use(await createReadyBrowserTestFixture(page));
      } finally {
        await harness.dispose();
      }
    },
  });
}
