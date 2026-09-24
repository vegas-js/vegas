import { describe, expect, test } from "vitest";

import {
  Cache,
  createCacheService,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

type CacheNamespace = "document" | "script" | "user";

// Public contracts:
// https://developers.google.com/apps-script/reference/cache/cache-service
// https://developers.google.com/apps-script/reference/cache/cache
class StatefulCacheBridge implements HostBridge {
  readonly expirations: number[] = [];
  readonly #documentAvailable: boolean;
  readonly #stores = new Map<CacheNamespace, Map<string, string>>([
    ["document", new Map()],
    ["script", new Map()],
    ["user", new Map()],
  ]);

  constructor(documentAvailable = true) {
    this.#documentAvailable = documentAvailable;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    if (call.service !== "cache") {
      throw new Error("unexpected host service");
    }

    const store = this.#stores.get(call.namespace);

    if (store === undefined) {
      throw new Error(`unexpected Cache namespace: ${call.namespace}`);
    }

    switch (call.operation) {
      case "isAvailable":
        return (call.namespace !== "document" ||
          this.#documentAvailable) as unknown as HostCallResult<C>;
      case "get":
        return (store.get(call.key) ?? null) as unknown as HostCallResult<C>;
      case "getAll":
        return Object.fromEntries(
          call.keys.flatMap((key) => {
            const value = store.get(key);
            return value === undefined ? [] : [[key, value]];
          }),
        ) as unknown as HostCallResult<C>;
      case "put":
        this.expirations.push(call.expirationInSeconds);
        store.set(call.key, call.value);
        return undefined as unknown as HostCallResult<C>;
      case "putAll":
        this.expirations.push(call.expirationInSeconds);
        for (const [key, value] of Object.entries(call.values)) {
          store.set(key, value);
        }
        return undefined as unknown as HostCallResult<C>;
      case "remove":
        store.delete(call.key);
        return undefined as unknown as HostCallResult<C>;
      case "removeAll":
        for (const key of call.keys) {
          store.delete(key);
        }
        return undefined as unknown as HostCallResult<C>;
    }
  }
}

describe("CacheService public contract", () => {
  test("scope caches and return null without a containing document", () => {
    const service = createCacheService(new StatefulCacheBridge());
    const scriptCache = service.getScriptCache();
    const userCache = service.getUserCache();

    expect(scriptCache).toBeInstanceOf(Cache);
    expect(userCache).toBeInstanceOf(Cache);
    expect(service.getDocumentCache()).toBeInstanceOf(Cache);

    scriptCache.put("scope", "script");
    userCache.put("scope", "user");

    expect(scriptCache.get("scope")).toBe("script");
    expect(userCache.get("scope")).toBe("user");

    const unavailable = createCacheService(new StatefulCacheBridge(false));
    expect(unavailable.getDocumentCache()).toBeNull();
  });
});

describe("Cache public contract", () => {
  test("read, write, and remove individual and batched values", () => {
    const bridge = new StatefulCacheBridge();
    const cache = createCacheService(bridge).getScriptCache();

    expect(cache.get("missing")).toBeNull();

    cache.put("first", "one");
    cache.putAll({
      second: "two",
      third: "three",
    });

    expect(cache.get("first")).toBe("one");
    expect(cache.getAll(["first", "missing", "third"])).toStrictEqual({
      first: "one",
      third: "three",
    });
    expect(bridge.expirations).toStrictEqual([600, 600]);

    cache.remove("first");
    cache.removeAll(["second", "third"]);

    expect(cache.get("first")).toBeNull();
    expect(cache.getAll(["second", "third"])).toStrictEqual({});
  });

  test("enforce documented expiration, key, and value boundaries", () => {
    const bridge = new StatefulCacheBridge();
    const cache = createCacheService(bridge).getScriptCache();

    cache.put("minimum", "value", 1);
    cache.putAll({ maximum: "value" }, 21_600);
    cache.put("x".repeat(250), "x".repeat(100_000), 1);

    expect(bridge.expirations).toStrictEqual([1, 21_600, 1]);
    expect(() => cache.put("key", "value", 0)).toThrow(RangeError);
    expect(() => cache.put("key", "value", 21_601)).toThrow(RangeError);
    expect(() => cache.put("key", "value", 1.5)).toThrow(RangeError);
    expect(() => cache.put("x".repeat(251), "value")).toThrow(
      "Local Cache key exceeds the 250 character limit.",
    );
    expect(() => cache.put("key", "x".repeat(100_001))).toThrow(
      "Local Cache value exceeds the 100 KB limit.",
    );
  });
});
