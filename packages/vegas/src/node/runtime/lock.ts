import type { HostBridge } from "./host-bridge";
import type { LockHostScope } from "./lock-host-call";

// https://developers.google.com/apps-script/reference/lock/lock
export class Lock {
  readonly #bridge: HostBridge;
  readonly #namespace: LockHostScope;

  constructor(bridge: HostBridge, namespace: LockHostScope) {
    this.#bridge = bridge;
    this.#namespace = namespace;
  }

  hasLock(): boolean {
    return this.#bridge.call({
      service: "lock",
      operation: "has",
      namespace: this.#namespace,
    });
  }

  releaseLock(): void {
    this.#bridge.call({
      service: "lock",
      operation: "release",
      namespace: this.#namespace,
    });
  }

  tryLock(timeoutInMillis: number): boolean {
    return this.#acquire(timeoutInMillis);
  }

  waitLock(timeoutInMillis: number): void {
    if (!this.#acquire(timeoutInMillis)) {
      throw new Error(`Local Lock wait timed out after ${timeoutInMillis} milliseconds.`);
    }
  }

  #acquire(timeoutInMillis: number): boolean {
    return this.#bridge.call({
      service: "lock",
      operation: "acquire",
      namespace: this.#namespace,
      timeoutInMillis,
    });
  }
}
