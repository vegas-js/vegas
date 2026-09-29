import { describe, expect, test, vi } from "vitest";

import { createSpreadsheetRepositoryLockGuard, type SpreadsheetRepositoryLock } from "../server";

function createLock(events: string[]): SpreadsheetRepositoryLock {
  return {
    waitLock(timeoutMilliseconds): void {
      events.push(`wait:${timeoutMilliseconds}`);
    },
    releaseLock(): void {
      events.push("release");
    },
  };
}

describe("createSpreadsheetRepositoryLockGuard", () => {
  test("run a mutation while holding the lock", () => {
    const events: string[] = [];
    const lock = createLock(events);
    const guard = createSpreadsheetRepositoryLockGuard({
      getLock: () => {
        events.push("get");
        return lock;
      },
      timeoutMilliseconds: 30_000,
      flush: () => {
        events.push("flush");
      },
    });

    expect(
      guard.runExclusive(() => {
        events.push("mutation");
        return "result";
      }),
    ).toBe("result");
    expect(events).toStrictEqual(["get", "wait:30000", "mutation", "flush", "release"]);
  });

  test("flush and release the lock when a mutation throws", () => {
    const events: string[] = [];
    const guard = createSpreadsheetRepositoryLockGuard({
      getLock: () => createLock(events),
      timeoutMilliseconds: 1_000,
      flush: () => {
        events.push("flush");
      },
    });

    expect(() =>
      guard.runExclusive(() => {
        events.push("mutation");
        throw new Error("mutation failed");
      }),
    ).toThrow("mutation failed");
    expect(events).toStrictEqual(["wait:1000", "mutation", "flush", "release"]);
  });

  test("not flush or release when acquiring the lock fails", () => {
    const mutation = vi.fn();
    const flush = vi.fn();
    const releaseLock = vi.fn();
    const guard = createSpreadsheetRepositoryLockGuard({
      getLock: () => ({
        waitLock(): void {
          throw new Error("lock timeout");
        },
        releaseLock,
      }),
      timeoutMilliseconds: 500,
      flush,
    });

    expect(() => guard.runExclusive(mutation)).toThrow("lock timeout");
    expect(mutation).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
    expect(releaseLock).not.toHaveBeenCalled();
  });

  test("release the lock when flushing throws", () => {
    const releaseLock = vi.fn();
    const guard = createSpreadsheetRepositoryLockGuard({
      getLock: () => ({
        waitLock(): void {},
        releaseLock,
      }),
      timeoutMilliseconds: 500,
      flush(): void {
        throw new Error("flush failed");
      },
    });

    expect(() => guard.runExclusive(() => "result")).toThrow("flush failed");
    expect(releaseLock).toHaveBeenCalledOnce();
  });
});
