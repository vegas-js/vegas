import type { FrameLocator, Locator, Page } from "@playwright/test";
import { describe, expect, test, vi } from "vitest";

import { createReadyBrowserTestFixture } from "./browser-test";

describe("createReadyBrowserTestFixture", () => {
  test("wait for user HTML injection before exposing the browser fixture", async () => {
    const waitFor = vi.fn(async () => undefined);
    const locator = vi.fn(
      (_selector: string) =>
        ({
          waitFor,
        }) as unknown as Locator,
    );
    const app = {} as FrameLocator;
    const nestedFrameLocator = vi.fn((_selector: string) => app);
    const sandbox = {
      locator,
      frameLocator: nestedFrameLocator,
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
    expect(nestedFrameLocator).toHaveBeenCalledWith("#userHtmlFrame");
    expect(fixture).toStrictEqual({
      page,
      sandbox,
      app,
    });
  });
});
