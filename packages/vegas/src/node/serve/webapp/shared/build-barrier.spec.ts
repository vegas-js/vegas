import { describe, expect, test } from "vitest";

import { createIdleWebAppBuildBarrier } from "./build-barrier";

describe("createIdleWebAppBuildBarrier", () => {
  test("resolve immediately", async () => {
    const barrier = createIdleWebAppBuildBarrier();

    await expect(barrier.waitForIdle()).resolves.toBeUndefined();
  });
});
