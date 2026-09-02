import { describe, expect, test } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { Cache } from "./Cache";
import { CacheService } from "./CacheService";

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

const documentCache = new Cache("document", createCacheService());
const scriptCache = new Cache("script", createCacheService());
const userCache = new Cache("user", createCacheService());

test("get document scope", () => {
  const cacheService = new CacheService(documentCache, scriptCache, userCache);
  const cache = cacheService.getDocumentCache();
  expect(cache).toStrictEqual(documentCache);
});

describe("get", () => {
  test("cache instance", () => {
    const cacheService = new CacheService(documentCache, scriptCache, userCache);
    const cache = cacheService.getDocumentCache();
    expect(cache).toBeInstanceOf(Cache);
  });

  describe("with scope", () => {
    test("document", () => {
      const cacheService = new CacheService(documentCache, scriptCache, userCache);
      const cache = cacheService.getDocumentCache();
      expect(cache).toStrictEqual(documentCache);
    });

    test("script", () => {
      const cacheService = new CacheService(documentCache, scriptCache, userCache);
      const cache = cacheService.getScriptCache();
      expect(cache).toStrictEqual(scriptCache);
    });

    test("user", () => {
      const cacheService = new CacheService(documentCache, scriptCache, userCache);
      const cache = cacheService.getUserCache();
      expect(cache).toStrictEqual(userCache);
    });
  });
});
