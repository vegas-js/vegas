import type { CacheNamespace, CacheStore } from "./cache-store";

type CacheEntry = {
  readonly value: string;
  readonly expiresAtMs: number;
};

function createNamespaceKey(namespace: CacheNamespace): string {
  switch (namespace.kind) {
    case "script": {
      return JSON.stringify(["script", namespace.scriptKey]);
    }
    case "user": {
      return JSON.stringify(["user", namespace.scriptKey, namespace.userKey]);
    }
    case "document": {
      return JSON.stringify(["document", namespace.scriptKey, namespace.documentKey]);
    }
  }
}

// https://developers.google.com/apps-script/reference/cache/cache
export class InMemoryCacheStore implements CacheStore {
  readonly #now: () => number;
  readonly #stores = new Map<string, Map<string, CacheEntry>>();

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  #getOrCreateStore(namespace: CacheNamespace): Map<string, CacheEntry> {
    const namespaceKey = createNamespaceKey(namespace);
    const existing = this.#stores.get(namespaceKey);

    if (existing) {
      return existing;
    }

    const created = new Map<string, CacheEntry>();
    this.#stores.set(namespaceKey, created);

    return created;
  }

  #getUnexpiredValue(namespace: CacheNamespace, key: string, nowMs: number): string | undefined {
    const namespaceKey = createNamespaceKey(namespace);
    const store = this.#stores.get(namespaceKey);
    const entry = store?.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAtMs > nowMs) {
      return entry.value;
    }

    store?.delete(key);

    if (store?.size === 0) {
      this.#stores.delete(namespaceKey);
    }

    return undefined;
  }

  async get(namespace: CacheNamespace, key: string): Promise<string | undefined> {
    return this.#getUnexpiredValue(namespace, key, this.#now());
  }

  async getAll(
    namespace: CacheNamespace,
    keys: readonly string[],
  ): Promise<Record<string, string>> {
    const nowMs = this.#now();
    const values: Record<string, string> = {};

    for (const key of keys) {
      const value = this.#getUnexpiredValue(namespace, key, nowMs);

      if (value !== undefined) {
        values[key] = value;
      }
    }

    return values;
  }

  async put(
    namespace: CacheNamespace,
    key: string,
    value: string,
    expiresAtMs: number,
  ): Promise<void> {
    this.#getOrCreateStore(namespace).set(key, {
      value,
      expiresAtMs,
    });
  }

  async putAll(
    namespace: CacheNamespace,
    values: Readonly<Record<string, string>>,
    expiresAtMs: number,
  ): Promise<void> {
    const store = this.#getOrCreateStore(namespace);

    for (const [key, value] of Object.entries(values)) {
      store.set(key, {
        value,
        expiresAtMs,
      });
    }
  }

  async remove(namespace: CacheNamespace, key: string): Promise<void> {
    const namespaceKey = createNamespaceKey(namespace);
    const store = this.#stores.get(namespaceKey);

    if (!store) {
      return;
    }

    store.delete(key);

    if (store.size === 0) {
      this.#stores.delete(namespaceKey);
    }
  }

  async removeAll(namespace: CacheNamespace, keys: readonly string[]): Promise<void> {
    const namespaceKey = createNamespaceKey(namespace);
    const store = this.#stores.get(namespaceKey);

    if (!store) {
      return;
    }

    for (const key of keys) {
      store.delete(key);
    }

    if (store.size === 0) {
      this.#stores.delete(namespaceKey);
    }
  }
}
