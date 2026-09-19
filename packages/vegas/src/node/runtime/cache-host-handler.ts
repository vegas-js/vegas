import type { CacheHostCall, CacheHostCallResult, CacheHostScope } from "./cache-host-call";
import { resolveCacheNamespace } from "./cache-namespace";
import type { CacheNamespace, CacheStore } from "./cache-store";
import type { InvocationScope } from "./scope";
import { unsupportedHostCall } from "./unsupported-host-call";

export interface CacheHostCallHandler {
  handle(call: CacheHostCall): Promise<CacheHostCallResult<CacheHostCall>>;
}

// https://developers.google.com/apps-script/reference/cache/cache-service
export class CacheHostHandler implements CacheHostCallHandler {
  readonly #now: () => number;
  readonly #scope: InvocationScope;
  readonly #store: CacheStore;

  constructor(store: CacheStore, scope: InvocationScope, now: () => number = Date.now) {
    this.#store = store;
    this.#scope = scope;
    this.#now = now;
  }

  async handle(call: CacheHostCall): Promise<CacheHostCallResult<CacheHostCall>> {
    const namespace = this.#resolve(call.namespace);

    switch (call.operation) {
      case "isAvailable": {
        return namespace !== undefined;
      }
      case "get": {
        if (!namespace) {
          return null;
        }

        return (await this.#store.get(namespace, call.key)) ?? null;
      }
      case "getAll": {
        if (!namespace) {
          return {};
        }

        return this.#store.getAll(namespace, call.keys);
      }
      case "put": {
        if (namespace) {
          await this.#store.put(
            namespace,
            call.key,
            call.value,
            this.#expiresAt(call.expirationInSeconds),
          );
        }
        return;
      }
      case "putAll": {
        if (namespace) {
          await this.#store.putAll(
            namespace,
            call.values,
            this.#expiresAt(call.expirationInSeconds),
          );
        }
        return;
      }
      case "remove": {
        if (namespace) {
          await this.#store.remove(namespace, call.key);
        }
        return;
      }
      case "removeAll": {
        if (namespace) {
          await this.#store.removeAll(namespace, call.keys);
        }
        return;
      }
    }

    return unsupportedHostCall(call);
  }

  #expiresAt(expirationInSeconds: number): number {
    return this.#now() + expirationInSeconds * 1_000;
  }

  #resolve(kind: CacheHostScope): CacheNamespace | undefined {
    return resolveCacheNamespace(this.#scope, kind);
  }
}
