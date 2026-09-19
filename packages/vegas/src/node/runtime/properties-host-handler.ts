import type {
  PropertiesHostCall,
  PropertiesHostCallResult,
  PropertiesHostScope,
} from "./properties-host-call";
import { resolvePropertiesNamespace } from "./properties-namespace";
import type { PropertiesNamespace, PropertiesStore } from "./properties-store";
import type { InvocationScope } from "./scope";
import { unsupportedHostCall } from "./unsupported-host-call";

export interface PropertiesHostCallHandler {
  handle(call: PropertiesHostCall): Promise<PropertiesHostCallResult<PropertiesHostCall>>;
}

// https://developers.google.com/apps-script/reference/properties/properties-service
export class PropertiesHostHandler implements PropertiesHostCallHandler {
  readonly #store: PropertiesStore;
  readonly #scope: InvocationScope;

  constructor(store: PropertiesStore, scope: InvocationScope) {
    this.#store = store;
    this.#scope = scope;
  }

  async handle(call: PropertiesHostCall): Promise<PropertiesHostCallResult<PropertiesHostCall>> {
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

        return this.#store.getAll(namespace);
      }
      case "getKeys": {
        if (!namespace) {
          return [];
        }

        return Object.keys(await this.#store.getAll(namespace));
      }
      case "set": {
        if (namespace) {
          await this.#store.set(namespace, call.key, call.value);
        }
        return;
      }
      case "merge": {
        if (namespace) {
          await this.#store.setAll(namespace, call.values);
        }
        return;
      }
      case "replace": {
        if (namespace) {
          await this.#store.replaceAll(namespace, call.values);
        }
        return;
      }
      case "remove": {
        if (namespace) {
          await this.#store.remove(namespace, call.key);
        }
        return;
      }
      case "clear": {
        if (namespace) {
          await this.#store.clear(namespace);
        }
        return;
      }
    }

    return unsupportedHostCall(call);
  }

  #resolve(kind: PropertiesHostScope): PropertiesNamespace | undefined {
    return resolvePropertiesNamespace(this.#scope, kind);
  }
}
