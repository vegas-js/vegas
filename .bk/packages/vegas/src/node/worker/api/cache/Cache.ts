import { RequestSync, Scope } from "../..";

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache implements GoogleAppsScript.Cache.Cache {
  readonly #scope: Scope;
  readonly #requestSync: RequestSync;

  constructor(scope: Scope, requestSync: RequestSync) {
    this.#scope = scope;
    this.#requestSync = requestSync;
  }

  get = (key: string) => {
    return (
      this.#requestSync({
        message: `${this.constructor.name}#get`,
        payload: { scope: this.#scope, key },
      }) ?? null
    );
  };
  getAll = (keys: string[]) => {
    return this.#requestSync({
      message: `${this.constructor.name}#getAll`,
      payload: { scope: this.#scope, keys },
    });
  };
  put = (key: string, value: string, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = Date.now() + expirationInSeconds * 1000;
    this.#requestSync({
      message: `${this.constructor.name}#put`,
      payload: { scope: this.#scope, record: { key, value, expired } },
    });
  };
  putAll = (values: object, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = Date.now() + expirationInSeconds * 1000;
    this.#requestSync({
      message: `${this.constructor.name}#putAll`,
      payload: { scope: this.#scope, record: { values, expired } },
    });
  };
  remove = (key: string) => {
    this.#requestSync({
      message: `${this.constructor.name}#remove`,
      payload: { scope: this.#scope, key },
    });
  };
  removeAll = (keys: string[]) => {
    this.#requestSync({
      message: `${this.constructor.name}#removeAll`,
      payload: { scope: this.#scope, keys },
    });
  };
}
