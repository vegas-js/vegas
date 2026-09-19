import worker from "node:worker_threads";

import { describe, expect, test } from "vitest";

import {
  HostDispatcher,
  InMemoryPropertiesStore,
  PropertiesHostHandler,
  UrlFetchHostHandler,
} from "./index";
import { createHostResponse, handleHostRequestMessage } from "./node";

function createDispatcher() {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

describe("createHostResponse", () => {
  test("wrap successful host results with the request id", async () => {
    const dispatcher = createDispatcher();

    await dispatcher.dispatch({
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "name",
      value: "Vegas",
    });

    await expect(
      createHostResponse(dispatcher, {
        id: 17,
        call: {
          service: "properties",
          operation: "get",
          namespace: "script",
          key: "name",
        },
      }),
    ).resolves.toStrictEqual({
      id: 17,
      ok: true,
      value: "Vegas",
    });
  });

  test("serialize host failures instead of rejecting the transport request", async () => {
    const dispatcher = createDispatcher();

    const response = await createHostResponse(dispatcher, {
      id: 18,
      call: {
        service: "drive",
        operation: "get-root-folder",
      },
    });

    expect(response).toMatchObject({
      id: 18,
      ok: false,
      error: {
        name: "Error",
        type: "Error",
        message: "Drive host handler is not configured for this invocation.",
      },
    });
  });

  test("serialize unsupported operations instead of returning undefined success", async () => {
    const dispatcher = createDispatcher();

    const response = await createHostResponse(dispatcher, {
      id: 19,
      call: {
        service: "properties",
        operation: "unknown",
      },
    } as never);

    expect(response).toMatchObject({
      id: 19,
      ok: false,
      error: {
        name: "Error",
        type: "Error",
        message: "Unsupported host call: properties#unknown",
      },
    });
  });
});

describe("handleHostRequestMessage", () => {
  test("accept UrlFetch calls through the typed host transport", async () => {
    const dispatcher = new HostDispatcher({
      properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
        scriptKey: "script",
        userKey: "user",
      }),
      urlFetch: new UrlFetchHostHandler({
        async fetch(request) {
          return {
            statusCode: request.url.endsWith("/created") ? 201 : 200,
            headers: {
              "content-type": "text/plain",
            },
            content: [79, 75],
          };
        },
        async fetchAll(requests) {
          return requests.map((request) => ({
            statusCode: request.url.endsWith("/created") ? 201 : 200,
            headers: {},
            content: [],
          }));
        },
      }),
    });
    const sharedArray = new Int32Array(new SharedArrayBuffer(4));
    const { port1, port2 } = new worker.MessageChannel();
    const response = new Promise<unknown>((resolve) => {
      port2.once("message", resolve);
    });

    try {
      await expect(
        handleHostRequestMessage(port1, sharedArray, dispatcher, {
          id: 19,
          call: {
            service: "url-fetch",
            operation: "fetch",
            request: {
              url: "https://example.com/created",
            },
          },
        }),
      ).resolves.toBe(true);

      await expect(response).resolves.toStrictEqual({
        id: 19,
        ok: true,
        value: {
          statusCode: 201,
          headers: {
            "content-type": "text/plain",
          },
          content: [79, 75],
        },
      });
      expect(Atomics.load(sharedArray, 0)).toBe(0);
    } finally {
      port1.close();
      port2.close();
    }
  });
});
