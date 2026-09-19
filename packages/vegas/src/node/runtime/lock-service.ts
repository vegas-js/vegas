import type { HostBridge } from "./host-bridge";
import { Lock } from "./lock";

// https://developers.google.com/apps-script/reference/lock/lock-service
export class LockService {
  readonly #bridge: HostBridge;
  readonly #documentLock: Lock;
  readonly #scriptLock: Lock;
  readonly #userLock: Lock;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
    this.#documentLock = new Lock(bridge, "document");
    this.#scriptLock = new Lock(bridge, "script");
    this.#userLock = new Lock(bridge, "user");
  }

  getDocumentLock(): Lock | null {
    const isAvailable = this.#bridge.call({
      service: "lock",
      operation: "isAvailable",
      namespace: "document",
    });

    return isAvailable ? this.#documentLock : null;
  }

  getScriptLock(): Lock {
    return this.#scriptLock;
  }

  getUserLock(): Lock {
    return this.#userLock;
  }
}

export function createLockService(bridge: HostBridge): LockService {
  return new LockService(bridge);
}
