import { RequestSyncFn } from "../..";

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache implements GoogleAppsScript.Cache.Cache {
  readonly #scope: string;
  readonly #requestSync: RequestSyncFn;

  constructor(scope: string, requestSync: RequestSyncFn) {
    this.#scope = scope;
    this.#requestSync = requestSync;
  }

  get = (key: string) => {
    return this.#requestSync("vegas:Cache#get", { scope: this.#scope, key }) ?? null;
  };
  getAll = (keys: string[]) => {
    return this.#requestSync("vegas:Cache#getAll", { scope: this.#scope, keys });
  };
  put = (key: string, value: string, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    this.#requestSync("vegas:Cache#put", { scope: this.#scope, record: { key, value, expired } });
  };
  putAll = (values: object, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    this.#requestSync("vegas:Cache#putAll", { scope: this.#scope, record: { values, expired } });
  };
  remove = (key: string) => {
    this.#requestSync("vegas:Cache#remove", { scope: this.#scope, key });
  };
  removeAll = (keys: string[]) => {
    this.#requestSync("vegas:Cache#removeAll", { scope: this.#scope, keys });
  };
}
