import { expect, test } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { createCacheService } from "./facade";

const service: RuntimeServicePort<"Cache"> = {
  get: () => null,
  getAll: () => ({}),
  put: () => null,
  putAll: () => null,
  remove: () => null,
  removeAll: () => null,
};

test("creates GAS-compatible CacheService facade", () => {
  const cacheService = createCacheService(service) as any;

  expect(String(cacheService as any)).toBe("CacheService");

  expect(Object.getPrototypeOf(cacheService) === Object.prototype).toBe(true);
});

test("returns fresh Cache facades from CacheService getters", () => {
  const cacheService = createCacheService(service) as any;

  expect(cacheService.getScriptCache()).not.toBe(cacheService.getScriptCache());
  expect(cacheService.getUserCache()).not.toBe(cacheService.getUserCache());
  expect(cacheService.getPrivateCache()).not.toBe(cacheService.getPrivateCache());
  expect(cacheService.getPublicCache()).not.toBe(cacheService.getPublicCache());

  expect(cacheService.getPrivateCache()).not.toBe(cacheService.getUserCache());
  expect(cacheService.getPublicCache()).not.toBe(cacheService.getScriptCache());
  expect(cacheService.getScriptCache()).not.toBe(cacheService.getUserCache());
});

test("returns null when document cache is unavailable", () => {
  const cacheService = createCacheService(service, {
    documentCacheAvailable: false,
  }) as any;

  expect(cacheService.getDocumentCache()).toBeNull();
});
