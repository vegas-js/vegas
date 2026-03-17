import { Scope } from "../../../worker";
import { ServeContext } from "../context";

export class PropertiesHandler {
  #getScopedProperties(scope: Scope, ctx: ServeContext) {
    switch (scope) {
      case "document": {
        return ctx.store.properties.document;
      }
      case "script": {
        return ctx.store.properties.script;
      }
      case "user": {
        return ctx.store.properties.user;
      }
      default: {
        return null;
      }
    }
  }

  deleteAllProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      Object.keys(property).forEach((key) => {
        delete property[key];
      });
    }
  }
  deleteProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      delete property[payload.key];
    }
  }
  getKeys(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    return Object.keys(property ?? {});
  }
  getProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    const obj: Record<string, string> = {};
    if (property) {
      Object.keys(property).forEach((key) => {
        obj[key] = property[key];
      });
    }
    return obj;
  }
  getProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    return property ? property[payload.key] : null;
  }
  setProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      if (payload.deleteAllOthers) {
        Object.keys(property).forEach((key) => {
          delete property[key];
        });
      }

      Object.keys(payload.properties).forEach((key) => {
        property[key] = payload.properties[key];
      });
    }
  }
  setProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      property[payload.property.key] = payload.property.value;
    }
  }
}
