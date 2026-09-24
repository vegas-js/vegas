import { describe, expect, test } from "vitest";

import type { HostCallDispatcher } from "../host-dispatcher";
import type { HostRequestMessage } from "../host-protocol";
import { createHostResponse } from "./host-request-handler";

const request = {
  id: 1,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "environment",
  },
} satisfies HostRequestMessage;

describe("createHostResponse", () => {
  test("serialize host errors with transport metadata", async () => {
    const dispatcher = {
      async dispatch() {
        throw new RangeError("out of range");
      },
    } satisfies HostCallDispatcher;

    const response = await createHostResponse(dispatcher, request);

    expect(response).toMatchObject({
      id: 1,
      ok: false,
      error: {
        name: "RangeError",
        type: "RangeError",
        message: "out of range",
      },
    });
  });
});
