import type { RequestLegacySync } from "../../legacy/transport";
import type { RuntimeScope } from "../../scope";

function createGasException(message: string): Error {
  const error = new Error(message);
  error.name = "Exception";

  return error;
}

const LOCK_TIMEOUT_MESSAGE = "Lock timeout: another process was holding the lock for too long.";

// https://developers.google.com/apps-script/reference/lock/lock
export class Lock implements GoogleAppsScript.Lock.Lock {
  readonly #scope: RuntimeScope;
  #requestSync: RequestLegacySync;
  #id: string | null;
  #isLocked: boolean;

  constructor(scope: RuntimeScope, requestSync: RequestLegacySync) {
    this.#scope = scope;
    this.#requestSync = requestSync;
    this.#id = null;
    this.#isLocked = false;
  }

  hasLock = () => {
    return this.#isLocked;
  };
  releaseLock = () => {
    if (this.#isLocked) {
      this.#requestSync({
        message: `${this.constructor.name}#releaseLock`,
        payload: { scope: this.#scope, id: this.#id },
      });
      this.#isLocked = false;
      this.#id = null;
    }

    return null as unknown as void;
  };
  tryLock = (timeoutInMillis: GoogleAppsScript.Integer) => {
    if (timeoutInMillis === undefined) {
      throw createGasException(
        "The parameters () don't match the method signature for LockService.Lock.tryLock.",
      );
    }

    if (timeoutInMillis < 0) {
      return false;
    }

    const id = (process.report.getReport() as any).javascriptStack.stack[1];

    if (
      this.#requestSync(
        {
          message: `${this.constructor.name}#tryLock`,
          payload: {
            scope: this.#scope,
            id,
          },
        },
        timeoutInMillis,
      )
    ) {
      this.#id = id;
      this.#isLocked = true;
    }

    return this.#isLocked;
  };
  waitLock = (timeoutInMillis: GoogleAppsScript.Integer) => {
    if (timeoutInMillis === undefined) {
      throw createGasException(
        "The parameters () don't match the method signature for LockService.Lock.waitLock.",
      );
    }

    if (timeoutInMillis < 0) {
      throw createGasException(LOCK_TIMEOUT_MESSAGE);
    }

    const id = (process.report.getReport() as any).javascriptStack.stack[1];

    if (
      !this.#requestSync(
        {
          message: `${this.constructor.name}#waitLock`,
          payload: {
            scope: this.#scope,
            id,
          },
        },
        timeoutInMillis,
      )
    ) {
      throw createGasException(LOCK_TIMEOUT_MESSAGE);
    }

    this.#id = id;
    this.#isLocked = true;

    return null as unknown as void;
  };
}
