import { expect, test } from "vitest";

import type { RequestLegacySync } from "../../legacy/transport";
import { createLockService } from "./facade";

const requestLegacySync: RequestLegacySync = () => undefined;

test("creates GAS-compatible LockService facade", () => {
  const lockService = createLockService(requestLegacySync) as any;

  expect(Object.getOwnPropertyNames(lockService).sort()).toEqual(
    [
      "getDocumentLock",
      "getPrivateLock",
      "getPublicLock",
      "getScriptLock",
      "getUserLock",
      "toString",
    ].sort(),
  );

  expect(String(lockService)).toBe("LockService");
  expect(Object.getPrototypeOf(lockService) === Object.prototype).toBe(true);
});

test("returns fresh Lock facades from LockService getters", () => {
  const lockService = createLockService(requestLegacySync) as any;

  expect(lockService.getScriptLock()).not.toBe(lockService.getScriptLock());

  expect(lockService.getUserLock()).not.toBe(lockService.getUserLock());

  expect(lockService.getPrivateLock()).not.toBe(lockService.getPrivateLock());

  expect(lockService.getPublicLock()).not.toBe(lockService.getPublicLock());

  expect(lockService.getPrivateLock()).not.toBe(lockService.getUserLock());

  expect(lockService.getPublicLock()).not.toBe(lockService.getScriptLock());

  expect(lockService.getScriptLock()).not.toBe(lockService.getUserLock());
});

test("returns null when document lock is unavailable", () => {
  const lockService = createLockService(requestLegacySync, {
    documentLockAvailable: false,
  }) as any;

  expect(lockService.getDocumentLock()).toBeNull();
});
