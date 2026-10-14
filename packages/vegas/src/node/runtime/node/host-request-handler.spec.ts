import { describe, expect, test, vi } from "vitest";

import type { HostCallDispatcher } from "../host-dispatcher";
import type { HostRequestMessage } from "../host-protocol";
import { createHostResponse, handleHostRequestMessage } from "./host-request-handler";

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

describe("handleHostRequestMessage", () => {
  test("dispatches using the snapshotted request envelope without reading getters", async () => {
    const read = vi.fn(() => {
      throw new Error("unexpected property access");
    });
    const proxiedRequest = new Proxy(request, { get: read });
    const dispatch = vi.fn(async () => "ok" as never);
    const dispatcher = { dispatch } satisfies HostCallDispatcher;
    const messages: unknown[] = [];
    const port = { postMessage: (value: unknown) => messages.push(value) };
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    Atomics.store(sharedArray, 0, 1);

    await expect(
      handleHostRequestMessage(port, sharedArray, dispatcher, proxiedRequest),
    ).resolves.toBe(true);

    expect(read).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(request.call);
    expect(messages).toStrictEqual([{ id: 1, ok: true, value: "ok" }]);
    expect(Atomics.load(sharedArray, 0)).toBe(0);
  });

  test("does not dispatch malformed request envelopes", async () => {
    const dispatch = vi.fn(async () => "unexpected" as never);
    const dispatcher = { dispatch } satisfies HostCallDispatcher;
    const messages: unknown[] = [];
    const port = { postMessage: (value: unknown) => messages.push(value) };
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));

    const invalid = Object.defineProperty({ id: 1, call: request.call }, "id", {
      get() {
        throw new Error("invalid getter");
      },
    });
    await expect(handleHostRequestMessage(port, sharedArray, dispatcher, invalid)).resolves.toBe(
      false,
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(messages).toHaveLength(0);
  });
});
