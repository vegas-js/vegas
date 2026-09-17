import { describe, expect, test } from "vitest";

import { LockHostHandler, type LockNamespace, type LockStoreSession } from "./index";

class RecordingLockStoreSession implements LockStoreSession {
  readonly calls: unknown[] = [];
  acquireResult = true;
  hasResult = true;

  async acquire(namespace: LockNamespace, timeoutInMillis: number): Promise<boolean> {
    this.calls.push({
      operation: "acquire",
      namespace,
      timeoutInMillis,
    });
    return this.acquireResult;
  }

  async has(namespace: LockNamespace): Promise<boolean> {
    this.calls.push({
      operation: "has",
      namespace,
    });
    return this.hasResult;
  }

  async release(namespace: LockNamespace): Promise<void> {
    this.calls.push({
      operation: "release",
      namespace,
    });
  }

  async releaseAll(): Promise<void> {
    this.calls.push({
      operation: "releaseAll",
    });
  }
}

describe("LockHostHandler", () => {
  test("resolve scoped Lock calls through the invocation ownership session", async () => {
    const session = new RecordingLockStoreSession();
    const handler = new LockHostHandler(session, {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    });

    await expect(
      handler.handle({
        service: "lock",
        operation: "isAvailable",
        namespace: "document",
      }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 250,
      }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({
        service: "lock",
        operation: "has",
        namespace: "user",
      }),
    ).resolves.toBe(true);
    await handler.handle({
      service: "lock",
      operation: "release",
      namespace: "document",
    });

    expect(session.calls).toStrictEqual([
      {
        operation: "acquire",
        namespace: {
          kind: "script",
          scriptKey: "script-a",
        },
        timeoutInMillis: 250,
      },
      {
        operation: "has",
        namespace: {
          kind: "user",
          scriptKey: "script-a",
          userKey: "user-a",
        },
      },
      {
        operation: "release",
        namespace: {
          kind: "document",
          scriptKey: "script-a",
          documentKey: "document-a",
        },
      },
    ]);
  });

  test("treat document Lock as unavailable without a containing document", async () => {
    const session = new RecordingLockStoreSession();
    const handler = new LockHostHandler(session, {
      scriptKey: "script-a",
      userKey: "user-a",
    });

    await expect(
      handler.handle({
        service: "lock",
        operation: "isAvailable",
        namespace: "document",
      }),
    ).resolves.toBe(false);
    await expect(
      handler.handle({
        service: "lock",
        operation: "acquire",
        namespace: "document",
        timeoutInMillis: 100,
      }),
    ).resolves.toBe(false);
    await expect(
      handler.handle({
        service: "lock",
        operation: "has",
        namespace: "document",
      }),
    ).resolves.toBe(false);
    await handler.handle({
      service: "lock",
      operation: "release",
      namespace: "document",
    });

    expect(session.calls).toStrictEqual([]);
  });
});
