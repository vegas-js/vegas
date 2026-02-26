import { requestSync } from "../..";

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache implements GoogleAppsScript.Cache.Cache {
  readonly #scope: string;

  constructor(scope: string) {
    this.#scope = scope;
  }

  get = (key: string) => {
    return requestSync("vegas:Cache#get", { scope: this.#scope, key }) ?? null;
  };
  getAll = (keys: string[]) => {
    return requestSync("vegas:Cache#getAll", { scope: this.#scope, keys });
  };
  put = (key: string, value: string, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    requestSync("vegas:Cache#put", { scope: this.#scope, record: { key, value, expired } });
  };
  putAll = (values: object, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    requestSync("vegas:Cache#putAll", { scope: this.#scope, record: { values, expired } });
  };
  remove = (key: string) => {
    requestSync("vegas:Cache#remove", { scope: this.#scope, key });
  };
  removeAll = (keys: string[]) => {
    requestSync("vegas:Cache#removeAll", { scope: this.#scope, keys });
  };
}
