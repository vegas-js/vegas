import type { InvocationScope, PropertiesNamespace, PropertiesStore } from "../../../runtime";
import { resolvePropertiesNamespace } from "../../../runtime";
import type { ServeContext } from "../context";

// https://developers.google.com/apps-script/reference/properties/properties
export class PropertiesHandler {
  readonly #store: PropertiesStore;

  constructor(store: PropertiesStore) {
    this.#store = store;
  }

  #resolve(
    scope: InvocationScope,
    kind: PropertiesNamespace["kind"],
  ): PropertiesNamespace | undefined {
    return resolvePropertiesNamespace(scope, kind);
  }

  async deleteAllProperties(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (namespace) {
      await this.#store.clear(namespace);
    }
  }

  async deleteProperty(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (namespace) {
      await this.#store.remove(namespace, payload.key);
    }
  }

  async getKeys(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (!namespace) {
      return [];
    }

    return Object.keys(await this.#store.getAll(namespace));
  }

  async getProperties(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (!namespace) {
      return {};
    }

    return this.#store.getAll(namespace);
  }

  async getProperty(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (!namespace) {
      return null;
    }

    return (await this.#store.get(namespace, payload.key)) ?? null;
  }

  async setProperties(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (!namespace) {
      return;
    }

    const properties = Object.fromEntries(
      Object.entries(payload.properties).map(([key, value]) => [key, String(value)]),
    );

    if (payload.deleteAllOthers) {
      await this.#store.replaceAll(namespace, properties);
    } else {
      await this.#store.setAll(namespace, properties);
    }
  }

  async setProperty(_ctx: ServeContext, payload: any, scope: InvocationScope) {
    const namespace = this.#resolve(scope, payload.scope);

    if (namespace) {
      await this.#store.set(namespace, payload.property.key, String(payload.property.value));
    }
  }
}
