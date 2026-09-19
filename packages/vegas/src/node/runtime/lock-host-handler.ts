import type { LockHostCall, LockHostCallResult, LockHostScope } from "./lock-host-call";
import { resolveLockNamespace } from "./lock-namespace";
import type { LockNamespace, LockStoreSession } from "./lock-store";
import type { InvocationScope } from "./scope";
import { unsupportedHostCall } from "./unsupported-host-call";

export interface LockHostCallHandler {
  handle(call: LockHostCall): Promise<LockHostCallResult<LockHostCall>>;
}

// https://developers.google.com/apps-script/reference/lock/lock-service
export class LockHostHandler implements LockHostCallHandler {
  readonly #scope: InvocationScope;
  readonly #session: LockStoreSession;

  constructor(session: LockStoreSession, scope: InvocationScope) {
    this.#session = session;
    this.#scope = scope;
  }

  async handle(call: LockHostCall): Promise<LockHostCallResult<LockHostCall>> {
    const namespace = this.#resolve(call.namespace);

    switch (call.operation) {
      case "isAvailable": {
        return namespace !== undefined;
      }
      case "acquire": {
        if (!namespace) {
          return false;
        }

        return this.#session.acquire(namespace, call.timeoutInMillis);
      }
      case "has": {
        if (!namespace) {
          return false;
        }

        return this.#session.has(namespace);
      }
      case "release": {
        if (namespace) {
          await this.#session.release(namespace);
        }
        return;
      }
    }

    return unsupportedHostCall(call);
  }

  #resolve(kind: LockHostScope): LockNamespace | undefined {
    return resolveLockNamespace(this.#scope, kind);
  }
}
