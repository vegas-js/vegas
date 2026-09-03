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

  expect(lockService.getPrivateLock()).toBe(lockService.getUserLock());
  expect(lockService.getPublicLock()).toBe(lockService.getScriptLock());

  expect(String(lockService)).toBe("LockService");
  expect(Object.getPrototypeOf(lockService) === Object.prototype).toBe(true);
});
