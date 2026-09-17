import { describe, expect, test } from "vitest";

import { InMemoryPropertiesStore, PropertiesHostHandler } from "./index";

const SCOPE = {
  scriptKey: "script",
  userKey: "user",
} as const;

describe("PropertiesHostHandler", () => {
  test("route script and user namespaces through the PropertiesStore", async () => {
    const store = new InMemoryPropertiesStore();
    const handler = new PropertiesHostHandler(store, SCOPE);

    await handler.handle({
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "shared",
      value: "script-value",
    });
    await handler.handle({
      service: "properties",
      operation: "set",
      namespace: "user",
      key: "shared",
      value: "user-value",
    });

    await expect(
      handler.handle({
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "shared",
      }),
    ).resolves.toBe("script-value");
    await expect(
      handler.handle({
        service: "properties",
        operation: "get",
        namespace: "user",
        key: "shared",
      }),
    ).resolves.toBe("user-value");
  });

  test("map merge replace remove and clear to Store semantics", async () => {
    const store = new InMemoryPropertiesStore();
    const handler = new PropertiesHostHandler(store, SCOPE);

    await handler.handle({
      service: "properties",
      operation: "merge",
      namespace: "script",
      values: { a: "1", b: "2" },
    });
    await expect(
      handler.handle({
        service: "properties",
        operation: "getAll",
        namespace: "script",
      }),
    ).resolves.toStrictEqual({ a: "1", b: "2" });

    await handler.handle({
      service: "properties",
      operation: "replace",
      namespace: "script",
      values: { c: "3" },
    });
    await expect(
      handler.handle({
        service: "properties",
        operation: "getKeys",
        namespace: "script",
      }),
    ).resolves.toStrictEqual(["c"]);

    await handler.handle({
      service: "properties",
      operation: "remove",
      namespace: "script",
      key: "c",
    });
    await expect(
      handler.handle({
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "c",
      }),
    ).resolves.toBeNull();

    await handler.handle({
      service: "properties",
      operation: "merge",
      namespace: "script",
      values: { d: "4" },
    });
    await handler.handle({
      service: "properties",
      operation: "clear",
      namespace: "script",
    });
    await expect(
      handler.handle({
        service: "properties",
        operation: "getAll",
        namespace: "script",
      }),
    ).resolves.toStrictEqual({});
  });

  test("treat document properties as unavailable without document context", async () => {
    const store = new InMemoryPropertiesStore();
    const handler = new PropertiesHostHandler(store, SCOPE);

    await expect(
      handler.handle({
        service: "properties",
        operation: "get",
        namespace: "document",
        key: "missing",
      }),
    ).resolves.toBeNull();
    await expect(
      handler.handle({
        service: "properties",
        operation: "getAll",
        namespace: "document",
      }),
    ).resolves.toStrictEqual({});
    await expect(
      handler.handle({
        service: "properties",
        operation: "getKeys",
        namespace: "document",
      }),
    ).resolves.toStrictEqual([]);

    await expect(
      handler.handle({
        service: "properties",
        operation: "set",
        namespace: "document",
        key: "ignored",
        value: "value",
      }),
    ).resolves.toBeUndefined();
  });
});
