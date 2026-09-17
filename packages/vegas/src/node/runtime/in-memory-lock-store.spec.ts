import { describe, expect, test, vi } from "vitest";

import { InMemoryLockStore, type LockNamespace } from "./index";

const SCRIPT_LOCK = {
  kind: "script",
  scriptKey: "script-a",
} as const satisfies LockNamespace;

describe("InMemoryLockStore", () => {
  test("track lock ownership per invocation session", async () => {
    const store = new InMemoryLockStore();
    const first = store.createSession();
    const second = store.createSession();

    await expect(first.has(SCRIPT_LOCK)).resolves.toBe(false);
    await expect(first.acquire(SCRIPT_LOCK, 0)).resolves.toBe(true);
    await expect(first.has(SCRIPT_LOCK)).resolves.toBe(true);

    await expect(first.acquire(SCRIPT_LOCK, 0)).resolves.toBe(true);
    await expect(second.acquire(SCRIPT_LOCK, 0)).resolves.toBe(false);

    await first.release(SCRIPT_LOCK);
    await expect(first.has(SCRIPT_LOCK)).resolves.toBe(false);
    await expect(second.acquire(SCRIPT_LOCK, 0)).resolves.toBe(true);
  });

  test("isolate script, user, and document lock namespaces", async () => {
    const store = new InMemoryLockStore();
    const first = store.createSession();
    const second = store.createSession();

    const userA = {
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-a",
    } as const satisfies LockNamespace;
    const userB = {
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-b",
    } as const satisfies LockNamespace;
    const documentA = {
      kind: "document",
      scriptKey: "script-a",
      documentKey: "document-a",
    } as const satisfies LockNamespace;
    const documentB = {
      kind: "document",
      scriptKey: "script-a",
      documentKey: "document-b",
    } as const satisfies LockNamespace;

    await expect(first.acquire(SCRIPT_LOCK, 0)).resolves.toBe(true);
    await expect(second.acquire(SCRIPT_LOCK, 0)).resolves.toBe(false);

    await expect(first.acquire(userA, 0)).resolves.toBe(true);
    await expect(second.acquire(userA, 0)).resolves.toBe(false);
    await expect(second.acquire(userB, 0)).resolves.toBe(true);

    await expect(first.acquire(documentA, 0)).resolves.toBe(true);
    await expect(second.acquire(documentA, 0)).resolves.toBe(false);
    await expect(second.acquire(documentB, 0)).resolves.toBe(true);
  });

  test("grant a waiting session when the current owner releases the lock", async () => {
    const store = new InMemoryLockStore();
    const first = store.createSession();
    const second = store.createSession();

    await first.acquire(SCRIPT_LOCK, 0);

    const waiting = second.acquire(SCRIPT_LOCK, 1_000);
    await first.release(SCRIPT_LOCK);

    await expect(waiting).resolves.toBe(true);
    await expect(second.has(SCRIPT_LOCK)).resolves.toBe(true);
  });

  test("return false when a waiting session reaches its timeout", async () => {
    vi.useFakeTimers();

    try {
      const store = new InMemoryLockStore();
      const first = store.createSession();
      const second = store.createSession();

      await first.acquire(SCRIPT_LOCK, 0);
      const waiting = second.acquire(SCRIPT_LOCK, 100);

      await vi.advanceTimersByTimeAsync(100);

      await expect(waiting).resolves.toBe(false);
      await expect(second.has(SCRIPT_LOCK)).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  test("release every lock owned by one invocation session", async () => {
    const store = new InMemoryLockStore();
    const first = store.createSession();
    const second = store.createSession();
    const userLock = {
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-a",
    } as const satisfies LockNamespace;

    await first.acquire(SCRIPT_LOCK, 0);
    await first.acquire(userLock, 0);

    const waitingForScript = second.acquire(SCRIPT_LOCK, 1_000);
    const waitingForUser = second.acquire(userLock, 1_000);

    await first.releaseAll();

    await expect(first.has(SCRIPT_LOCK)).resolves.toBe(false);
    await expect(first.has(userLock)).resolves.toBe(false);
    await expect(waitingForScript).resolves.toBe(true);
    await expect(waitingForUser).resolves.toBe(true);
  });

  test("treat release of an unowned lock as a no-op", async () => {
    const store = new InMemoryLockStore();
    const first = store.createSession();
    const second = store.createSession();

    await first.acquire(SCRIPT_LOCK, 0);
    await second.release(SCRIPT_LOCK);

    await expect(first.has(SCRIPT_LOCK)).resolves.toBe(true);
    await expect(second.has(SCRIPT_LOCK)).resolves.toBe(false);
  });
});
