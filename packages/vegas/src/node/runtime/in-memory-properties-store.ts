import type { PropertiesNamespace, PropertiesStore } from "./properties-store";

function createNamespaceKey(namespace: PropertiesNamespace): string {
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

// https://developers.google.com/apps-script/reference/properties/properties
export class InMemoryPropertiesStore implements PropertiesStore {
  readonly #stores = new Map<string, Map<string, string>>();

  #getStore(namespace: PropertiesNamespace): Map<string, string> | undefined {
    return this.#stores.get(createNamespaceKey(namespace));
  }

  #getOrCreateStore(namespace: PropertiesNamespace): Map<string, string> {
    const namespaceKey = createNamespaceKey(namespace);
    const existing = this.#stores.get(namespaceKey);

    if (existing) {
      return existing;
    }

    const created = new Map<string, string>();
    this.#stores.set(namespaceKey, created);

    return created;
  }

  async get(namespace: PropertiesNamespace, key: string): Promise<string | undefined> {
    return this.#getStore(namespace)?.get(key);
  }

  async getAll(namespace: PropertiesNamespace): Promise<Record<string, string>> {
    return Object.fromEntries(this.#getStore(namespace) ?? []);
  }

  async set(namespace: PropertiesNamespace, key: string, value: string): Promise<void> {
    this.#getOrCreateStore(namespace).set(key, value);
  }

  async setAll(
    namespace: PropertiesNamespace,
    properties: Readonly<Record<string, string>>,
  ): Promise<void> {
    const store = this.#getOrCreateStore(namespace);

    for (const [key, value] of Object.entries(properties)) {
      store.set(key, value);
    }
  }

  async replaceAll(
    namespace: PropertiesNamespace,
    properties: Readonly<Record<string, string>>,
  ): Promise<void> {
    this.#stores.set(createNamespaceKey(namespace), new Map(Object.entries(properties)));
  }

  async remove(namespace: PropertiesNamespace, key: string): Promise<void> {
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

  async clear(namespace: PropertiesNamespace): Promise<void> {
    this.#stores.delete(createNamespaceKey(namespace));
  }
}
