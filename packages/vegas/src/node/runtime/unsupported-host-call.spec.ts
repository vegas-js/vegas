import { describe, expect, test } from "vitest";

import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";
import { unsupportedHostCall } from "./unsupported-host-call";

describe("unsupportedHostCall", () => {
  test("classify unreachable host operations as protocol failures", () => {
    let caught: unknown;

    try {
      unsupportedHostCall({
        service: "cache",
        operation: "unknown",
      } as never);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RuntimeInfrastructureError);
    expect(caught).toMatchObject({
      kind: "protocol",
      message: "Unsupported host call: cache#unknown",
    });
  });
});
