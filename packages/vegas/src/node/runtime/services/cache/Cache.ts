import type { RuntimeServicePort } from "../../protocol";
import type { RuntimeScope } from "../../scope";

// https://developers.google.com/apps-script/reference/cache/cache
export class Cache implements GoogleAppsScript.Cache.Cache {
  readonly #scope: RuntimeScope;
  readonly #service: RuntimeServicePort<"Cache">;

  constructor(scope: RuntimeScope, service: RuntimeServicePort<"Cache">) {
    this.#scope = scope;
    this.#service = service;
  }

  get = (key: string) => {
    return this.#service.get(this.#scope, key) ?? null;
  };
  getAll = (keys: string[]) => {
    return this.#service.getAll(this.#scope, keys);
  };
  put = (key: string, value: string, expirationInSeconds: GoogleAppsScript.Integer = 600) => {
    this.#service.put(this.#scope, key, value, expirationInSeconds);
    return null;
  };
  putAll = (
    values: Record<string, string>,
    expirationInSeconds: GoogleAppsScript.Integer = 600,
  ) => {
    this.#service.putAll(this.#scope, values, expirationInSeconds);
    return null;
  };
  remove = (key: string) => {
    this.#service.remove(this.#scope, key);
    return null;
  };
  removeAll = (keys: string[]) => {
    this.#service.removeAll(this.#scope, keys);
    return null;
  };
}
