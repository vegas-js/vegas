import { describe, expect, test } from "vitest";

import {
  createLockService,
  Lock,
  LockService,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #documentAvailable: boolean;

  constructor(documentAvailable = true) {
    this.#documentAvailable = documentAvailable;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "lock") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    if (call.operation !== "isAvailable") {
      throw new Error(`unexpected Lock operation: ${call.operation}`);
    }

    return (call.namespace !== "document" ||
      this.#documentAvailable) as unknown as HostCallResult<C>;
  }
}

describe("LockService Runtime object", () => {
  test("expose script and user Locks and return null when document Lock is unavailable", () => {
    const availableBridge = new RecordingHostBridge();
    const available = createLockService(availableBridge);

    expect(available).toBeInstanceOf(LockService);
    expect(available.getScriptLock()).toBeInstanceOf(Lock);
    expect(available.getUserLock()).toBeInstanceOf(Lock);
    expect(available.getDocumentLock()).toBeInstanceOf(Lock);

    const unavailableBridge = new RecordingHostBridge(false);
    const unavailable = createLockService(unavailableBridge);

    expect(unavailable.getDocumentLock()).toBeNull();
    expect(unavailableBridge.calls).toStrictEqual([
      {
        service: "lock",
        operation: "isAvailable",
        namespace: "document",
      },
    ]);
  });
});
