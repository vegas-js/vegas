// https://developers.google.com/apps-script/reference/lock/lock-service
export class LockService implements GoogleAppsScript.Lock.LockService {
  readonly #documentLock: GoogleAppsScript.Lock.Lock;
  readonly #scriptLock: GoogleAppsScript.Lock.Lock;
  readonly #userLock: GoogleAppsScript.Lock.Lock;

  constructor(
    documentLock: GoogleAppsScript.Lock.Lock,
    scriptLock: GoogleAppsScript.Lock.Lock,
    userLock: GoogleAppsScript.Lock.Lock,
  ) {
    this.#documentLock = documentLock;
    this.#scriptLock = scriptLock;
    this.#userLock = userLock;
  }

  getDocumentLock = () => {
    return this.#documentLock;
  };
  getScriptLock = () => {
    return this.#scriptLock;
  };
  getUserLock = () => {
    return this.#userLock;
  };
}
