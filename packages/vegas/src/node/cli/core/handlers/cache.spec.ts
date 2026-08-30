import { afterEach, expect, test, vi } from "vitest";

import { RuntimeScope } from "../../../runtime/scope";
import type { CacheStore } from "./cache";
import { CacheHandler } from "./cache";

function createStore(): CacheStore {
  return {
    document: {},
    script: {},
    user: {},
  };
}

afterEach(() => vi.restoreAllMocks());

test("returns null for missing key", () => {
  const handler = new CacheHandler(createStore());

  expect(handler.get(RuntimeScope.SCRIPT, "missing")).toBeNull();
});

test("expires cached value", () => {
  const handler = new CacheHandler(createStore());
  const now = vi.spyOn(Date, "now");

  now.mockReturnValue(1_000);
  handler.put(RuntimeScope.SCRIPT, "key", "value", 10);

  now.mockReturnValue(10_999);
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBe("value");

  now.mockReturnValue(11_000);
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBeNull();
});

test("isolates cache values by scope", () => {
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  const handler = new CacheHandler(createStore());
  handler.put(RuntimeScope.DOCUMENT, "key", "document", 600);
  handler.put(RuntimeScope.SCRIPT, "key", "script", 600);
  handler.put(RuntimeScope.USER, "key", "user", 600);

  expect(handler.get(RuntimeScope.DOCUMENT, "key")).toBe("document");
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBe("script");
  expect(handler.get(RuntimeScope.USER, "key")).toBe("user");
});

test("putAll uses the same expiration for all values", () => {
  const store = createStore();
  const handler = new CacheHandler(store);
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  handler.putAll(RuntimeScope.SCRIPT, { foo: "foo", bar: "bar" }, 10);

  expect(store.script).toEqual({
    foo: { value: "foo", expired: 11_000 },
    bar: { value: "bar", expired: 11_000 },
  });
});
