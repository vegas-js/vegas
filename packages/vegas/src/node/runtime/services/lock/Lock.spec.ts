import { expect, test, vi } from "vitest";

import type { RequestLegacySync } from "../../legacy/transport";
import { RuntimeScope } from "../../scope";
import { Lock } from "./Lock";

function createSuccessfulRequestSync() {
  return vi.fn((..._args: Parameters<RequestLegacySync>) => true);
}

test("preserves characterized Lock acquisition and release state", () => {
  const requestSync = createSuccessfulRequestSync();

  const lock = new Lock(RuntimeScope.SCRIPT, requestSync);

  expect(lock.hasLock()).toBe(false);

  expect(lock.releaseLock() as unknown).toBeNull();

  expect(lock.hasLock()).toBe(false);

  expect(lock.tryLock(0)).toBe(true);

  expect(lock.hasLock()).toBe(true);

  expect(lock.releaseLock() as unknown).toBeNull();

  expect(lock.hasLock()).toBe(false);

  expect(lock.waitLock(0) as unknown).toBeNull();

  expect(lock.hasLock()).toBe(true);

  expect(lock.releaseLock() as unknown).toBeNull();

  expect(lock.hasLock()).toBe(false);

  expect(lock.tryLock(0)).toBe(true);

  expect(lock.hasLock()).toBe(true);
});

test("preserves characterized Lock timeout validation", () => {
  const requestSync = createSuccessfulRequestSync();

  const tryLock = new Lock(RuntimeScope.SCRIPT, requestSync);

  expect(tryLock.tryLock(-1)).toBe(false);

  expect(requestSync).not.toHaveBeenCalled();

  const waitLock = new Lock(RuntimeScope.SCRIPT, requestSync);

  let thrown: unknown;

  try {
    waitLock.waitLock(-1);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(Error);

  expect((thrown as Error).name).toBe("Exception");

  expect((thrown as Error).message).toBe(
    "Lock timeout: another process was holding the lock for too long.",
  );

  expect(requestSync).not.toHaveBeenCalled();
});

test("rejects missing Lock timeout arguments with GAS Exceptions", () => {
  const requestSync = createSuccessfulRequestSync();

  for (const methodName of ["tryLock", "waitLock"] as const) {
    const lock = new Lock(RuntimeScope.SCRIPT, requestSync);

    let thrown: unknown;

    try {
      Reflect.apply(lock[methodName], lock, []);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);

    expect((thrown as Error).name).toBe("Exception");

    expect((thrown as Error).message).toBe(
      `The parameters () don't match the method signature for LockService.Lock.${methodName}.`,
    );
  }

  expect(requestSync).not.toHaveBeenCalled();
});

test("waitLock() throws the characterized timeout Exception when acquisition fails", () => {
  const requestSync: RequestLegacySync = vi.fn(() => false);

  const lock = new Lock(RuntimeScope.SCRIPT, requestSync);

  let thrown: unknown;

  try {
    lock.waitLock(0);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(Error);

  expect((thrown as Error).name).toBe("Exception");

  expect((thrown as Error).message).toBe(
    "Lock timeout: another process was holding the lock for too long.",
  );

  expect(lock.hasLock()).toBe(false);
});
