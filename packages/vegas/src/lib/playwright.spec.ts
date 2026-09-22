import type { FrameLocator, Page } from "@playwright/test";
import { expect, expectTypeOf, test } from "vitest";

import {
  createBrowserTest,
  type BrowserTestFixture,
  type BrowserTestOptions,
  type RuntimeDataFixture,
} from "./playwright";

test("expose the Playwright browser test surface", () => {
  expect(typeof createBrowserTest).toBe("function");

  expectTypeOf<BrowserTestOptions["root"]>().toEqualTypeOf<string | undefined>();
  expectTypeOf<BrowserTestOptions["runtimeData"]>().toEqualTypeOf<RuntimeDataFixture | undefined>();
  expectTypeOf<BrowserTestFixture["page"]>().toEqualTypeOf<Page>();
  expectTypeOf<BrowserTestFixture["sandbox"]>().toEqualTypeOf<FrameLocator>();
  expectTypeOf<BrowserTestFixture["app"]>().toEqualTypeOf<FrameLocator>();
});
