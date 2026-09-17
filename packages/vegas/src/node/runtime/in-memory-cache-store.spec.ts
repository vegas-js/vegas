import { describe, expect, test } from "vitest";

import type { CacheNamespace } from "./cache-store";
import { InMemoryCacheStore } from "./in-memory-cache-store";

const SCRIPT_CACHE = {
  kind: "script",
  scriptKey: "script-a",
} as const satisfies CacheNamespace;

const USER_CACHE = {
  kind: "user",
  scriptKey: "script-a",
  userKey: "user-a",
} as const satisfies CacheNamespace;

const DOCUMENT_CACHE = {
  kind: "document",
  scriptKey: "script-a",
  documentKey: "document-a",
} as const satisfies CacheNamespace;

// https://developers.google.com/apps-script/reference/cache/cache-service
describe("InMemoryCacheStore namespace", () => {
  test("isolate script, user, and document cache namespaces", async () => {
    const store = new InMemoryCacheStore(() => 1_000);

    await store.put(SCRIPT_CACHE, "key", "script-value", 10_000);
    await store.put(USER_CACHE, "key", "user-value", 10_000);
    await store.put(DOCUMENT_CACHE, "key", "document-value", 10_000);
    await store.put(
      {
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-b",
      },
      "key",
      "other-user-value",
      10_000,
    );
    await store.put(
      {
        kind: "script",
        scriptKey: "script-b",
      },
      "key",
      "other-script-value",
      10_000,
    );

    await expect(store.get(SCRIPT_CACHE, "key")).resolves.toBe("script-value");
    await expect(store.get(USER_CACHE, "key")).resolves.toBe("user-value");
    await expect(store.get(DOCUMENT_CACHE, "key")).resolves.toBe("document-value");
    await expect(
      store.get(
        {
          kind: "user",
          scriptKey: "script-a",
          userKey: "user-b",
        },
        "key",
      ),
    ).resolves.toBe("other-user-value");
    await expect(
      store.get(
        {
          kind: "script",
          scriptKey: "script-b",
        },
        "key",
      ),
    ).resolves.toBe("other-script-value");
  });
});

// https://developers.google.com/apps-script/reference/cache/cache
describe("InMemoryCacheStore values", () => {
  test("return only requested cache entries that exist", async () => {
    const store = new InMemoryCacheStore(() => 1_000);

    await store.putAll(
      SCRIPT_CACHE,
      {
        first: "one",
        second: "two",
        ignored: "ignored",
      },
      10_000,
    );

    await expect(store.get(SCRIPT_CACHE, "missing")).resolves.toBeUndefined();
    await expect(store.getAll(SCRIPT_CACHE, ["first", "missing", "second"])).resolves.toStrictEqual(
      {
        first: "one",
        second: "two",
      },
    );
  });

  test("expire cache entries at their absolute expiration boundary", async () => {
    let nowMs = 1_000;
    const store = new InMemoryCacheStore(() => nowMs);

    await store.put(SCRIPT_CACHE, "key", "value", 2_000);

    nowMs = 1_999;
    await expect(store.get(SCRIPT_CACHE, "key")).resolves.toBe("value");

    nowMs = 2_000;
    await expect(store.get(SCRIPT_CACHE, "key")).resolves.toBeUndefined();
    await expect(store.getAll(SCRIPT_CACHE, ["key"])).resolves.toStrictEqual({});
  });

  test("apply one expiration boundary to every value in putAll", async () => {
    let nowMs = 1_000;
    const store = new InMemoryCacheStore(() => nowMs);

    await store.putAll(
      SCRIPT_CACHE,
      {
        first: "one",
        second: "two",
      },
      2_000,
    );

    nowMs = 2_000;

    await expect(store.getAll(SCRIPT_CACHE, ["first", "second"])).resolves.toStrictEqual({});
  });

  test("remove one or many cache entries", async () => {
    const store = new InMemoryCacheStore(() => 1_000);

    await store.putAll(
      SCRIPT_CACHE,
      {
        first: "one",
        second: "two",
        third: "three",
      },
      10_000,
    );

    await store.remove(SCRIPT_CACHE, "first");
    await store.removeAll(SCRIPT_CACHE, ["second", "missing"]);

    await expect(store.getAll(SCRIPT_CACHE, ["first", "second", "third"])).resolves.toStrictEqual({
      third: "three",
    });
  });
});
