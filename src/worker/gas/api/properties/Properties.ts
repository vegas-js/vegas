import { RequestSyncFn } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: string;
  readonly #requestSync: RequestSyncFn;

  constructor(scope: string, requestSync: RequestSyncFn) {
    this.#scope = scope;
    this.#requestSync = requestSync;
  }

  deleteAllProperties = () => {
    this.#requestSync("vegas:Properties#deleteAllProperties", { scope: this.#scope });
    return this;
  };
  deleteProperty = (key: string) => {
    this.#requestSync("vegas:Properties#deleteProperty", { scope: this.#scope, key });
    return this;
  };
  getKeys = () => {
    return this.#requestSync("vegas:Properties#getKeys", { scope: this.#scope });
  };
  getProperties = () => {
    return this.#requestSync("vegas:Properties#getProperties", { scope: this.#scope });
  };
  getProperty = (key: string) => {
    return this.#requestSync("vegas:Properties#getProperties", { scope: this.#scope, key });
  };
  setProperties = (properties: object, deleteAllOthers: boolean = false) => {
    this.#requestSync("vegas:Properties#setProperties", {
      scope: this.#scope,
      properties,
      deleteAllOthers,
    });
    return this;
  };
  setProperty = (key: string, value: string) => {
    this.#requestSync("vegas:Properties#setProperty", {
      scope: this.#scope,
      property: { key, value },
    });
    return this;
  };
}
