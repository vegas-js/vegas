import type { RuntimeServiceImplementation } from "../../../runtime/protocol";
import type { RuntimeScope } from "../../../runtime/scope";
import type { ServeContext } from "../context";

export class PropertiesHandler implements RuntimeServiceImplementation<"Properties"> {
  readonly #context: ServeContext;

  constructor(context: ServeContext) {
    this.#context = context;
  }

  #getScopedProperties(scope: RuntimeScope) {
    switch (scope) {
      case "document": {
        return this.#context.store.properties.document;
      }
      case "script": {
        return this.#context.store.properties.script;
      }
      case "user": {
        return this.#context.store.properties.user;
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
