import type { RuntimeServiceImplementation } from "../../protocol";
import type { RuntimeScope } from "../../scope";

export type PropertiesStore = {
  document: Record<string, string>;
  script: Record<string, string>;
  user: Record<string, string>;
};

export class PropertiesHandler implements RuntimeServiceImplementation<"Properties"> {
  readonly #store: PropertiesStore;

  constructor(store: PropertiesStore) {
    this.#store = store;
  }

  #getScopedProperties(scope: RuntimeScope) {
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

  deleteAllProperties(scope: RuntimeScope) {
    const property = this.#getScopedProperties(scope);
    if (property) {
      Object.keys(property).forEach((key) => {
        delete property[key];
      });
    }
  }

  deleteProperty(scope: RuntimeScope, key: string) {
    const property = this.#getScopedProperties(scope);
    if (property) {
      delete property[key];
    }
  }

  getKeys(scope: RuntimeScope) {
    const property = this.#getScopedProperties(scope);

    return Object.keys(property ?? {});
  }

  getProperties(scope: RuntimeScope) {
    const property = this.#getScopedProperties(scope);
    const result: Record<string, string> = {};
    if (property) {
      Object.keys(property).forEach((key) => {
        result[key] = property[key];
      });
    }

    return result;
  }

  getProperty(scope: RuntimeScope, key: string) {
    const property = this.#getScopedProperties(scope);

    return property ? (property[key] ?? null) : null;
  }

  setProperties(scope: RuntimeScope, properties: Record<string, string>, deleteAllOthers: boolean) {
    const property = this.#getScopedProperties(scope);
    if (!property) {
      return;
    }

    if (deleteAllOthers) {
      Object.keys(property).forEach((key) => {
        delete property[key];
      });
    }

    Object.entries(properties).forEach(([key, value]) => {
      property[key] = value;
    });
  }

  setProperty(scope: RuntimeScope, key: string, value: string) {
    const property = this.#getScopedProperties(scope);
    if (property) {
      property[key] = value;
    }
  }
}
