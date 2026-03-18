import { RequestSync, Scope } from "../..";

// https://developers.google.com/apps-script/reference/lock/lock
export class Lock implements GoogleAppsScript.Lock.Lock {
  readonly #scope: Scope;
  #requestSync: RequestSync;
  #id: string | null;
  #isLocked: boolean;

  constructor(scope: Scope, requestSync: RequestSync) {
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
    }
  };
  tryLock = (timeoutInMillis: GoogleAppsScript.Integer) => {
    const id = (process.report.getReport() as any).javascriptStack.stack[1];
    if (
      this.#requestSync(
        { message: `${this.constructor.name}#tryLock`, payload: { scope: this.#scope, id } },
        timeoutInMillis,
      )
    ) {
      this.#id = id;
      this.#isLocked = true;
    }
    return this.#isLocked;
  };
  waitLock = (timeoutInMillis: GoogleAppsScript.Integer) => {
    const id = (process.report.getReport() as any).javascriptStack.stack[1];
    if (
      !this.#requestSync(
        { message: `${this.constructor.name}#waitLock`, payload: { scope: this.#scope, id } },
        timeoutInMillis,
      )
    ) {
      throw new Error();
    }
    this.#id = id;
  };
}
