import { describe, expect, test } from "vitest";

import {
  Cache,
  CacheService,
  createCacheService,
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

    if (call.service !== "cache") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    if (call.operation !== "isAvailable") {
      throw new Error(`unexpected Cache operation: ${call.operation}`);
    }

    return (call.namespace !== "document" ||
      this.#documentAvailable) as unknown as HostCallResult<C>;
  }
}

describe("CacheService Runtime object", () => {
  test("expose script and user caches and return null when document cache is unavailable", () => {
    const availableBridge = new RecordingHostBridge();
    const available = createCacheService(availableBridge);

    expect(available).toBeInstanceOf(CacheService);
    expect(available.getScriptCache()).toBeInstanceOf(Cache);
    expect(available.getUserCache()).toBeInstanceOf(Cache);
    expect(available.getDocumentCache()).toBeInstanceOf(Cache);

    const unavailableBridge = new RecordingHostBridge(false);
    const unavailable = createCacheService(unavailableBridge);

    expect(unavailable.getDocumentCache()).toBeNull();
    expect(unavailableBridge.calls).toStrictEqual([
      {
        service: "cache",
        operation: "isAvailable",
        namespace: "document",
      },
    ]);
  });
});
