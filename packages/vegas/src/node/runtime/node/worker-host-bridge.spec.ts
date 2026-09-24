import { describe, expect, test } from "vitest";

import type { HostRequestMessage } from "../host-protocol";
import { readHostResponse } from "./worker-host-bridge";

const request = {
  id: 1,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "environment",
  },
} satisfies HostRequestMessage;

describe("readHostResponse", () => {
  test("restore host errors with their built-in class and host type", () => {
    let caught: unknown;

    try {
      readHostResponse(request, {
        id: 1,
        ok: false,
        error: {
          name: "RangeError",
          type: "RangeError",
          message: "out of range",
          stack: "host stack",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RangeError);
    expect(caught).toMatchObject({
      name: "RangeError",
      type: "RangeError",
      message: "out of range",
      stack: "host stack",
    });
  });
});
