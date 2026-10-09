import { describe, expect, test, vi } from "vitest";

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
  test("does not invoke an error constructor getter during host serialization", async () => {
    const constructorGetter = vi.fn(() => {
      throw new Error("unexpected constructor getter");
    });
    const error = new RangeError("out of range");
    Object.defineProperty(error, "constructor", { get: constructorGetter });
    const dispatcher = {
      async dispatch() {
        throw error;
      },
    } satisfies HostCallDispatcher;

    await expect(createHostResponse(dispatcher, request)).resolves.toMatchObject({
      id: 1,
      ok: false,
      error: { name: "RangeError", type: "RangeError", message: "out of range" },
    });
    expect(constructorGetter).not.toHaveBeenCalled();
  });

  test("preserves custom Error class names without evaluating getters", async () => {
    class HostFailure extends Error {
      constructor() {
        super("unavailable");
        this.name = "HostFailure";
      }
    }
    const dispatcher = {
      async dispatch() {
        throw new HostFailure();
      },
    } satisfies HostCallDispatcher;

    await expect(createHostResponse(dispatcher, request)).resolves.toMatchObject({
      ok: false,
      error: { name: "HostFailure", type: "HostFailure", message: "unavailable" },
    });
  });

  test("handles revoked Proxy failures without losing the host response", async () => {
    const { proxy, revoke } = Proxy.revocable(new Error("unavailable"), {});
    revoke();
    const dispatcher = {
      async dispatch() {
        throw proxy;
      },
    } satisfies HostCallDispatcher;

    await expect(createHostResponse(dispatcher, request)).resolves.toMatchObject({
      ok: false,
      error: { name: "Error", type: "Error", message: "Unknown error." },
    });
  });

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
