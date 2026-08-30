import type { RuntimeServicePort } from "../../../runtime/protocol";
import type { RuntimeScope } from "../../../runtime/scope";

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
  };
  putAll = (
    values: Record<string, string>,
    expirationInSeconds: GoogleAppsScript.Integer = 600,
  ) => {
    this.#service.putAll(this.#scope, values, expirationInSeconds);
  };
  remove = (key: string) => {
    this.#service.remove(this.#scope, key);
  };
  removeAll = (keys: string[]) => {
    this.#service.removeAll(this.#scope, keys);
  };
}
