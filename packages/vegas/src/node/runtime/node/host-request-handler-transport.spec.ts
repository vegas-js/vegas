import { describe, expect, test } from "vitest";

import type { HostRequestMessage } from "../host-protocol";
import {
  HostDispatcher,
  InMemoryPropertiesStore,
  PropertiesHostHandler,
  RuntimeInfrastructureError,
} from "../index";
import { handleHostRequestMessage } from "./host-request-handler";

const request = {
  id: 1,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "environment",
  },
} satisfies HostRequestMessage;

function createDispatcher(): HostDispatcher {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

describe("Host request response transport", () => {
  test("classify response structured-clone failures and always release the waiting worker", async () => {
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    Atomics.store(sharedArray, 0, 1);
    const cause = new DOMException("could not clone", "DataCloneError");
    const port = {
      postMessage() {
        throw cause;
      },
    };

    const result = handleHostRequestMessage(port, sharedArray, createDispatcher(), request);

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "serialization",
      message: "Host response 1 could not be serialized.",
      cause,
    });
    expect(Atomics.load(sharedArray, 0)).toBe(0);
  });
});
