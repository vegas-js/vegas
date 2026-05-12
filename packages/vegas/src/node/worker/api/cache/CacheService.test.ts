import { describe, expect, test } from "vitest";

import { Cache } from "./Cache";
import { CacheService } from "./CacheService";

const documentCache = new Cache("document", () => {});
const scriptCache = new Cache("script", () => {});
const userCache = new Cache("user", () => {});

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
