import type { RuntimeServiceImplementation } from "../../../runtime/protocol";
import type { RuntimeScope } from "../../../runtime/scope";

export type CacheStore = {
  document: Record<string, { value: string; expired: number }>;
  script: Record<string, { value: string; expired: number }>;
  user: Record<string, { value: string; expired: number }>;
};

export class CacheHandler implements RuntimeServiceImplementation<"Cache"> {
  readonly #store: CacheStore;

  constructor(store: CacheStore) {
    this.#store = store;
  }

  #getScopedCache(scope: RuntimeScope) {
    switch (scope) {
      case "document": {
        return this.#store.document;
      }
      case "script": {
        return this.#store.script;
      }
      case "user": {
        return this.#store.user;
      }
      default: {
        return null;
      }
    }
  }

  #deleteExpiredCache(cache: Record<string, { value: string; expired: number }>) {
    const now = Date.now();
    Object.entries(cache).forEach(([key, data]) => {
      if (data.expired <= now) {
        delete cache[key];
      }
    });
  }

  #deleteOverflowCache(cache: Record<string, { value: string; expired: number }>) {
    const cachedLength = Object.keys(cache).length;
    if (cachedLength > 1000) {
      const objArray: { expired: number; key: string }[] = [];
      Object.entries(cache).forEach(([key, data]) => objArray.push({ expired: data.expired, key }));
      // asc sort
      objArray.sort((a, b) => a.expired - b.expired);
      // remove cached value ( result 900 cache values )
      for (let i = 0; i < 100 + cachedLength - 1000; i++) {
        delete cache[objArray[i].key];
      }
    }
  }

  get(scope: RuntimeScope, key: string) {
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return null;
    }

    this.#deleteExpiredCache(cache);
    return cache[key]?.value ?? null;
  }
  getAll(scope: RuntimeScope, keys: string[]) {
    const obj: Record<string, string> = {};
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return obj;
    }

    this.#deleteExpiredCache(cache);
    Object.entries(cache).forEach(([key, value]) => {
      if (keys.includes(key)) {
        obj[key] = value.value;
      }
    });

    return obj;
  }
  put(scope: RuntimeScope, key: string, value: string, expirationInSeconds: number) {
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return;
    }

    const expired = Date.now() + expirationInSeconds * 1000;
    cache[key] = { value, expired };

    this.#deleteOverflowCache(cache);
  }
  putAll(scope: RuntimeScope, values: Record<string, string>, expirationInSeconds: number) {
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return;
    }

    const expired = Date.now() + expirationInSeconds * 1000;
    Object.entries(values).forEach(([key, value]) => {
      cache[key] = { value, expired };
    });

    this.#deleteOverflowCache(cache);
  }
  remove(scope: RuntimeScope, key: string) {
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return;
    }

    delete cache[key];
  }
  removeAll(scope: RuntimeScope, keys: string[]) {
    const cache = this.#getScopedCache(scope);
    if (!cache) {
      return;
    }

    keys.forEach((key) => delete cache[key]);
  }
}
