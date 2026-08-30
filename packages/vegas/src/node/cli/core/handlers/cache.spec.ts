import { expect, test } from "vitest";

import { RuntimeScope } from "../../../runtime/scope";
import type { CacheStore, Clock } from "./cache";
import { CacheHandler } from "./cache";

function createStore(): CacheStore {
  return {
    document: {},
    script: {},
    user: {},
  };
}

function createClock(now: number): Clock {
  return {
    now: () => now,
  };
}
function fixedClock(clock: Clock, now: number) {
  clock.now = () => now;
}

test("returns null for missing key", () => {
  const handler = new CacheHandler(createStore(), createClock(0));

  expect(handler.get(RuntimeScope.SCRIPT, "missing")).toBeNull();
});

test("expires cached value", () => {
  const clock: Clock = createClock(0);
  const handler = new CacheHandler(createStore(), clock);

  fixedClock(clock, 1_000);
  handler.put(RuntimeScope.SCRIPT, "key", "value", 10);

  fixedClock(clock, 10_999);
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBe("value");

  fixedClock(clock, 11_000);
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBeNull();
});

test("isolates cache values by scope", () => {
  const handler = new CacheHandler(createStore(), createClock(0));
  handler.put(RuntimeScope.DOCUMENT, "key", "document", 600);
  handler.put(RuntimeScope.SCRIPT, "key", "script", 600);
  handler.put(RuntimeScope.USER, "key", "user", 600);

  expect(handler.get(RuntimeScope.DOCUMENT, "key")).toBe("document");
  expect(handler.get(RuntimeScope.SCRIPT, "key")).toBe("script");
  expect(handler.get(RuntimeScope.USER, "key")).toBe("user");
});

test("putAll uses the same expiration for all values", () => {
  const store = createStore();
  const handler = new CacheHandler(store, createClock(1_000));
  handler.putAll(RuntimeScope.SCRIPT, { foo: "foo", bar: "bar" }, 10);

  expect(store.script).toEqual({
    foo: { value: "foo", expired: 11_000 },
    bar: { value: "bar", expired: 11_000 },
  });
});
