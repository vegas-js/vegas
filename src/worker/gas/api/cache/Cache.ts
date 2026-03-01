import { requestSync } from "../..";

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache implements GoogleAppsScript.Cache.Cache {
  readonly #scope: string;

  constructor(scope: string) {
    this.#scope = scope;
  }

  get = (key: string) => {
    return (
      requestSync({ message: "vegas:Cache#get", payload: { scope: this.#scope, key } }) ?? null
    );
  };
  getAll = (keys: string[]) => {
    return requestSync({ message: "vegas:Cache#getAll", payload: { scope: this.#scope, keys } });
  };
  put = (key: string, value: string, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    requestSync({
      message: "vegas:Cache#put",
      payload: { scope: this.#scope, record: { key, value, expired } },
    });
  };
  putAll = (values: object, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    const expired = new Date().valueOf() + expirationInSeconds * 1000;
    requestSync({
      message: "vegas:Cache#putAll",
      payload: { scope: this.#scope, record: { values, expired } },
    });
  };
  remove = (key: string) => {
    requestSync({ message: "vegas:Cache#remove", payload: { scope: this.#scope, key } });
  };
  removeAll = (keys: string[]) => {
    requestSync({ message: "vegas:Cache#removeAll", payload: { scope: this.#scope, keys } });
  };
}
