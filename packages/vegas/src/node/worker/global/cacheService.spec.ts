import { expect, test } from "vitest";

import type { RuntimeServicePort } from "../../runtime/protocol";
import { createCacheService } from "./cacheService";

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

  expect(cacheService.getPrivateCache()).toBe(cacheService.getUserCache());
  expect(cacheService.getPublicCache()).toBe(cacheService.getScriptCache());

  expect(String(cacheService as any)).toBe("CacheService");

  expect(Object.getPrototypeOf(cacheService) === Object.prototype).toBe(true);
});
