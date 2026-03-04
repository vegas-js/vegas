import { RequestSyncFn, Scope } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: Scope;
  readonly #requestSync: RequestSyncFn;

  constructor(scope: Scope, requestSync: RequestSyncFn) {
    this.#scope = scope;
    this.#requestSync = requestSync;
  }

  deleteAllProperties = () => {
    this.#requestSync({
      message: "Properties#deleteAllProperties",
      payload: { scope: this.#scope },
    });
    return this;
  };
  deleteProperty = (key: string) => {
    this.#requestSync({
      message: "Properties#deleteProperty",
      payload: { scope: this.#scope, key },
    });
    return this;
  };
  getKeys = () => {
    return this.#requestSync({
      message: "Properties#getKeys",
      payload: { scope: this.#scope },
    });
  };
  getProperties = () => {
    return this.#requestSync({
      message: "Properties#getProperties",
      payload: { scope: this.#scope },
    });
  };
  getProperty = (key: string) => {
    return this.#requestSync({
      message: "Properties#getProperty",
      payload: { scope: this.#scope, key },
    });
  };
  setProperties = (properties: object, deleteAllOthers: boolean = false) => {
    this.#requestSync({
      message: "Properties#setProperties",
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
      message: "Properties#setProperty",
      payload: {
        scope: this.#scope,
        property: { key, value },
      },
    });
    return this;
  };
}
