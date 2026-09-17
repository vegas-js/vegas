import { describe, expect, test } from "vitest";

import { CacheHostHandler, type CacheNamespace, type CacheStore } from "./index";

class RecordingCacheStore implements CacheStore {
  readonly calls: string[] = [];
  readonly values = new Map<string, string>();

  async get(namespace: CacheNamespace, key: string): Promise<string | undefined> {
    this.calls.push(`get:${namespace.kind}:${key}`);
    return this.values.get(key);
  }

  async getAll(
    namespace: CacheNamespace,
    keys: readonly string[],
  ): Promise<Record<string, string>> {
    this.calls.push(`getAll:${namespace.kind}:${keys.join(",")}`);
    return Object.fromEntries(
      keys.flatMap((key) => {
        const value = this.values.get(key);
        return value === undefined ? [] : [[key, value]];
      }),
    );
  }

  async put(
    namespace: CacheNamespace,
    key: string,
    value: string,
    expiresAtMs: number,
  ): Promise<void> {
    this.calls.push(`put:${namespace.kind}:${key}:${value}:${expiresAtMs}`);
    this.values.set(key, value);
  }

  async putAll(
    namespace: CacheNamespace,
    values: Readonly<Record<string, string>>,
    expiresAtMs: number,
  ): Promise<void> {
    this.calls.push(`putAll:${namespace.kind}:${JSON.stringify(values)}:${expiresAtMs}`);
    for (const [key, value] of Object.entries(values)) {
      this.values.set(key, value);
    }
  }

  async remove(namespace: CacheNamespace, key: string): Promise<void> {
    this.calls.push(`remove:${namespace.kind}:${key}`);
    this.values.delete(key);
  }

  async removeAll(namespace: CacheNamespace, keys: readonly string[]): Promise<void> {
    this.calls.push(`removeAll:${namespace.kind}:${keys.join(",")}`);
    for (const key of keys) {
      this.values.delete(key);
    }
  }
}

describe("CacheHostHandler", () => {
  test("resolve scoped cache calls and convert relative expiration to absolute time", async () => {
    const store = new RecordingCacheStore();
    const handler = new CacheHostHandler(
      store,
      {
        scriptKey: "script-a",
        userKey: "user-a",
        documentKey: "document-a",
      },
      () => 1_000,
    );

    await expect(
      handler.handle({
        service: "cache",
        operation: "isAvailable",
        namespace: "document",
      }),
    ).resolves.toBe(true);

    await handler.handle({
      service: "cache",
      operation: "put",
      namespace: "script",
      key: "one",
      value: "1",
      expirationInSeconds: 20,
    });
    await handler.handle({
      service: "cache",
      operation: "putAll",
      namespace: "user",
      values: {
        two: "2",
        three: "3",
      },
      expirationInSeconds: 600,
    });

    expect(store.calls).toStrictEqual([
      "put:script:one:1:21000",
      'putAll:user:{"two":"2","three":"3"}:601000',
    ]);
  });

  test("map missing store values to null while preserving getAll hits", async () => {
    const store = new RecordingCacheStore();
    store.values.set("found", "value");
    const handler = new CacheHostHandler(store, {
      scriptKey: "script-a",
      userKey: "user-a",
    });

    await expect(
      handler.handle({
        service: "cache",
        operation: "get",
        namespace: "script",
        key: "missing",
      }),
    ).resolves.toBeNull();
    await expect(
      handler.handle({
        service: "cache",
        operation: "getAll",
        namespace: "script",
        keys: ["found", "missing"],
      }),
    ).resolves.toStrictEqual({
      found: "value",
    });
  });

  test("treat document cache as unavailable without a containing document", async () => {
    const store = new RecordingCacheStore();
    const handler = new CacheHostHandler(store, {
      scriptKey: "script-a",
      userKey: "user-a",
    });

    await expect(
      handler.handle({
        service: "cache",
        operation: "isAvailable",
        namespace: "document",
      }),
    ).resolves.toBe(false);
    await expect(
      handler.handle({
        service: "cache",
        operation: "get",
        namespace: "document",
        key: "key",
      }),
    ).resolves.toBeNull();
    await expect(
      handler.handle({
        service: "cache",
        operation: "getAll",
        namespace: "document",
        keys: ["key"],
      }),
    ).resolves.toStrictEqual({});

    await handler.handle({
      service: "cache",
      operation: "put",
      namespace: "document",
      key: "key",
      value: "value",
      expirationInSeconds: 600,
    });

    expect(store.calls).toStrictEqual([]);
  });
});
