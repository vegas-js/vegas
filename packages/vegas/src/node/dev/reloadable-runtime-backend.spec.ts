import { describe, expect, test, vi } from "vitest";

import type { RuntimeBackend } from "../runtime";
import { ReloadableRuntimeBackend } from "./reloadable-runtime-backend";

describe("ReloadableRuntimeBackend", () => {
  test("delegate execution to the current backend and allow replacement", async () => {
    const firstExecute = vi.fn(async () => "first");
    const secondExecute = vi.fn(async () => "second");
    const first: RuntimeBackend = { execute: firstExecute };
    const second: RuntimeBackend = { execute: secondExecute };
    const runtime = new ReloadableRuntimeBackend(first);
    const request = {
      functionName: "main",
      args: ["value"],
    };

    await expect(runtime.execute(request)).resolves.toBe("first");
    expect(firstExecute).toHaveBeenCalledWith(request);

    runtime.replace(second);

    await expect(runtime.execute(request)).resolves.toBe("second");
    expect(secondExecute).toHaveBeenCalledWith(request);
    expect(firstExecute).toHaveBeenCalledTimes(1);
  });
});
