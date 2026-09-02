import type { RuntimeServicePort } from "../../../runtime/protocol";
import type { RuntimeScope } from "../../../runtime/scope";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: RuntimeScope;
  readonly #service: RuntimeServicePort<"Properties">;

  constructor(scope: RuntimeScope, service: RuntimeServicePort<"Properties">) {
    this.#scope = scope;
    this.#service = service;
  }

  deleteAllProperties = () => {
    this.#service.deleteAllProperties(this.#scope);
    return this;
  };
  deleteProperty = (key: string) => {
    this.#service.deleteProperty(this.#scope, key);
    return this;
  };
  getKeys = () => {
    return this.#service.getKeys(this.#scope);
  };
  getProperties = () => {
    return this.#service.getProperties(this.#scope);
  };
  getProperty = (key: string) => {
    return this.#service.getProperty(this.#scope, key);
  };
  setProperties = (properties: Record<string, string>, deleteAllOthers: boolean = false) => {
    this.#service.setProperties(this.#scope, properties, deleteAllOthers);
    return this;
  };
  setProperty = (key: string, value: string) => {
    this.#service.setProperty(this.#scope, key, value);
    return this;
  };
}
