import { requestSync } from "../..";

// https://developers.google.com/apps-script/reference/lock/lock
export class Lock implements GoogleAppsScript.Lock.Lock {
  readonly #scope: string;
  #id: string | null;
  #isLocked: boolean;

  constructor(scope: string) {
    this.#scope = scope;
    this.#id = null;
    this.#isLocked = false;
  }

  hasLock = () => {
    return this.#isLocked;
  };
  releaseLock = () => {
    if (this.#isLocked) {
      requestSync({
        message: "vegas:Lock#releaseLock",
        payload: { scope: this.#scope, id: this.#id },
      });
      this.#isLocked = false;
    }
  };
  tryLock = (timeoutInMillis: GoogleAppsScript.Integer) => {
    const id = (process.report.getReport() as any).javascriptStack.stack[1];
    if (
      requestSync(
        { message: "vegas:Lock#tryLock", payload: { scope: this.#scope, id } },
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
      !requestSync(
        { message: "vegas:Lock#waitLock", payload: { scope: this.#scope, id } },
        timeoutInMillis,
      )
    ) {
      throw new Error();
    }
    this.#id = id;
  };
}
