import type { FrameLocator, Locator, Page } from "@playwright/test";
import { describe, expect, test, vi } from "vitest";

import { createReadyBrowserTestFixture } from "./browser-test";

describe("createReadyBrowserTestFixture", () => {
  test("hide the iframe structure behind an application root Locator", async () => {
    const waitFor = vi.fn(async () => undefined);
    const app = {} as Locator;
    const appLocator = vi.fn((_selector: string) => app);
    const contentFrame = {
      locator: appLocator,
    } as unknown as FrameLocator;
    const contentFrameForUserHtml = vi.fn(() => contentFrame);
    const userHtmlFrame = {
      waitFor,
      contentFrame: contentFrameForUserHtml,
    } as unknown as Locator;
    const locator = vi.fn((_selector: string) => userHtmlFrame);
    const sandbox = {
      locator,
    } as unknown as FrameLocator;
    const frameLocator = vi.fn((_selector: string) => sandbox);
    const page = {
      frameLocator,
    } as unknown as Page;

    const fixture = await createReadyBrowserTestFixture(page);

    expect(frameLocator).toHaveBeenCalledWith("#sandboxFrame");
    expect(locator).toHaveBeenCalledWith('#userHtmlFrame[data-vegas-ready="true"]');
    expect(waitFor).toHaveBeenCalledWith({
      state: "attached",
    });
    expect(contentFrameForUserHtml).toHaveBeenCalledOnce();
    expect(appLocator).toHaveBeenCalledWith("body");
    expect(fixture).toStrictEqual({
      app,
    });
  });
});
