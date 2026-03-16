import { RequestSync, Scope } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: Scope;
  readonly #requestSync: RequestSync;

  constructor(scope: Scope, requestSync: RequestSync) {
    this.#scope = scope;
    this.#requestSync = requestSync;
  }

  deleteAllProperties = () => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteAllProperties`,
      payload: { scope: this.#scope },
    });
    return this;
  };
  deleteProperty = (key: string) => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteProperty`,
      payload: { scope: this.#scope, key },
    });
    return this;
  };
  getKeys = () => {
    return this.#requestSync({
      message: `${this.constructor.name}#getKeys`,
      payload: { scope: this.#scope },
    });
  };
  getProperties = () => {
    return this.#requestSync({
      message: `${this.constructor.name}#getProperties`,
      payload: { scope: this.#scope },
    });
  };
  getProperty = (key: string) => {
    return this.#requestSync({
      message: `${this.constructor.name}#getProperty`,
      payload: { scope: this.#scope, key },
    });
  };
  setProperties = (properties: object, deleteAllOthers: boolean = false) => {
    this.#requestSync({
      message: `${this.constructor.name}#setProperties`,
      payload: {
        scope: this.#scope,
        properties,
        deleteAllOthers,
      },
    });
    return this;
  };
  setProperty = (key: string, value: string) => {
    this.#requestSync({
      message: `${this.constructor.name}#setProperty`,
      payload: {
        scope: this.#scope,
        property: { key, value },
      },
    });
    return this;
  };
}
