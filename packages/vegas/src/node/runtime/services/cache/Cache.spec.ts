import { expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { RuntimeScope } from "../../scope";
import { Cache } from "./Cache";

function createCacheService(
  overrides: Partial<RuntimeServicePort<"Cache">> = {},
): RuntimeServicePort<"Cache"> {
  return {
    get: () => null,
    getAll: () => {
      return {};
    },
    put: () => {},
    putAll: () => {},
    remove: () => {},
    removeAll: () => {},
    ...overrides,
  };
}

test("put defaults expiration to 600 seconds", () => {
  const put = vi.fn();
  const cache = new Cache(RuntimeScope.SCRIPT, createCacheService({ put }));
  cache.put("key", "value");

  expect(put).toHaveBeenCalledWith(RuntimeScope.SCRIPT, "key", "value", 600);
});

test("putAll defaults expiration to 600 seconds", () => {
  const putAll = vi.fn();
  const cache = new Cache(RuntimeScope.SCRIPT, createCacheService({ putAll }));
  cache.putAll({
    foo: "foo",
    bar: "bar",
  });

  expect(putAll).toHaveBeenCalledWith(RuntimeScope.SCRIPT, { foo: "foo", bar: "bar" }, 600);
});
