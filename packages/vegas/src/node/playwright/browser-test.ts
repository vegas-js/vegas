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

export function createBrowserTest(options: BrowserTestOptions = {}) {
  return baseTest.extend<{ vegas: BrowserTestFixture }>({
    vegas: async ({ page }, use) => {
      const harness = await createBrowserHarness(options);

      try {
        await page.goto(harness.urls.host);

        const sandbox = page.frameLocator("#sandboxFrame");
        const app = sandbox.frameLocator("#userHtmlFrame");

        await use({
          page,
          sandbox,
          app,
        });
      } finally {
        await harness.dispose();
      }
    },
  });
}
