import { describe, expect, test } from "vitest";

import {
  CacheHostHandler,
  HostDispatcher,
  InMemoryCacheStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  LockHostHandler,
  PropertiesHostHandler,
  type DriveHostCallHandler,
  type UrlFetchHostCallHandler,
} from "./index";

function createPropertiesHandler() {
  return new PropertiesHostHandler(new InMemoryPropertiesStore(), {
    scriptKey: "script",
    userKey: "user",
  });
}

describe("HostDispatcher", () => {
  test("dispatch properties calls to the invocation-bound handler", async () => {
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ properties });

    await dispatcher.dispatch({
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "name",
      value: "Vegas",
    });

    await expect(
      dispatcher.dispatch({
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "name",
      }),
    ).resolves.toBe("Vegas");
  });

  test("dispatch cache calls only when the invocation provides a Cache handler", async () => {
    const cache = new CacheHostHandler(
      new InMemoryCacheStore(() => 1_000),
      {
        scriptKey: "script",
        userKey: "user",
      },
      () => 1_000,
    );
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ cache, properties });

    await dispatcher.dispatch({
      service: "cache",
      operation: "put",
      namespace: "script",
      key: "name",
      value: "Vegas",
      expirationInSeconds: 600,
    });

    await expect(
      dispatcher.dispatch({
        service: "cache",
        operation: "get",
        namespace: "script",
        key: "name",
      }),
    ).resolves.toBe("Vegas");
  });

  test("reject cache calls when the invocation has no Cache handler", async () => {
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ properties });

    await expect(
      dispatcher.dispatch({
        service: "cache",
        operation: "get",
        namespace: "script",
        key: "name",
      }),
    ).rejects.toThrow("Cache host handler is not configured for this invocation.");
  });

  test("dispatch Lock calls only when the invocation provides a Lock handler", async () => {
    const lock = new LockHostHandler(new InMemoryLockStore().createSession(), {
      scriptKey: "script",
      userKey: "user",
    });
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ lock, properties });

    await expect(
      dispatcher.dispatch({
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 0,
      }),
    ).resolves.toBe(true);
    await expect(
      dispatcher.dispatch({
        service: "lock",
        operation: "has",
        namespace: "script",
      }),
    ).resolves.toBe(true);
  });

  test("reject Lock calls when the invocation has no Lock handler", async () => {
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ properties });

    await expect(
      dispatcher.dispatch({
        service: "lock",
        operation: "has",
        namespace: "script",
      }),
    ).rejects.toThrow("Lock host handler is not configured for this invocation.");
  });

  test("dispatch drive calls only when the invocation provides a Drive handler", async () => {
    const properties = createPropertiesHandler();
    const drive: DriveHostCallHandler = {
      async handle(call) {
        if (call.operation !== "get-root-folder") {
          throw new Error(`unexpected Drive operation: ${call.operation}`);
        }

        return {
          service: "drive",
          kind: "folder",
          id: "root",
        };
      },
    };
    const dispatcher = new HostDispatcher({ drive, properties });

    await expect(
      dispatcher.dispatch({
        service: "drive",
        operation: "get-root-folder",
      }),
    ).resolves.toStrictEqual({
      service: "drive",
      kind: "folder",
      id: "root",
    });
  });

  test("reject drive calls when the invocation has no Drive handler", async () => {
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ properties });

    await expect(
      dispatcher.dispatch({
        service: "drive",
        operation: "get-root-folder",
      }),
    ).rejects.toThrow("Drive host handler is not configured for this invocation.");
  });

  test("dispatch UrlFetch calls only when the invocation provides a UrlFetch handler", async () => {
    const properties = createPropertiesHandler();
    const urlFetch: UrlFetchHostCallHandler = {
      async handle(call) {
        if (call.operation !== "fetch") {
          throw new Error(`unexpected UrlFetch operation: ${call.operation}`);
        }

        return {
          statusCode: 200,
          headers: {
            "content-type": "text/plain",
          },
          content: [79, 75],
        };
      },
    };
    const dispatcher = new HostDispatcher({ properties, urlFetch });

    await expect(
      dispatcher.dispatch({
        service: "url-fetch",
        operation: "fetch",
        request: {
          url: "https://example.com",
        },
      }),
    ).resolves.toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/plain",
      },
      content: [79, 75],
    });
  });

  test("reject UrlFetch calls when the invocation has no UrlFetch handler", async () => {
    const properties = createPropertiesHandler();
    const dispatcher = new HostDispatcher({ properties });

    await expect(
      dispatcher.dispatch({
        service: "url-fetch",
        operation: "fetch",
        request: {
          url: "https://example.com",
        },
      }),
    ).rejects.toThrow("UrlFetch host handler is not configured for this invocation.");
  });
});
