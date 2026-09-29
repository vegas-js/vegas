import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSpreadsheetRepositoryLockGuard,
  createSpreadsheetRepositoryScriptLockGuard,
  type SpreadsheetRepositoryLock,
} from "../server";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("createSpreadsheetRepositoryScriptLockGuard", () => {
  test("use the Apps Script script lock and flush with the default timeout", () => {
    const events: string[] = [];
    const lock = createLock(events);
    vi.stubGlobal("LockService", {
      getScriptLock() {
        events.push("get-script-lock");
        return lock;
      },
    });
    vi.stubGlobal("SpreadsheetApp", {
      flush(): void {
        events.push("flush");
      },
    });

    const guard = createSpreadsheetRepositoryScriptLockGuard();

    expect(
      guard.runExclusive(() => {
        events.push("mutation");
        return "result";
      }),
    ).toBe("result");
    expect(events).toStrictEqual(["get-script-lock", "wait:30000", "mutation", "flush", "release"]);
  });

  test("forward a custom timeout to the script lock", () => {
    const events: string[] = [];
    const lock = createLock(events);
    vi.stubGlobal("LockService", {
      getScriptLock: () => lock,
    });
    vi.stubGlobal("SpreadsheetApp", {
      flush(): void {},
    });

    const guard = createSpreadsheetRepositoryScriptLockGuard({ timeoutMilliseconds: 500 });
    guard.runExclusive(() => undefined);

    expect(events).toStrictEqual(["wait:500", "release"]);
  });
});
