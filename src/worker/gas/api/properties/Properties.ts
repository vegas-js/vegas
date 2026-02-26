import { requestSync } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: string;

  constructor(scope: string) {
    this.#scope = scope;
  }

  deleteAllProperties = () => {
    requestSync("vegas:Properties#deleteAllProperties", { scope: this.#scope });
    return this;
  };
  deleteProperty = (key: string) => {
    requestSync("vegas:Properties#deleteProperty", { scope: this.#scope, key });
    return this;
  };
  getKeys = () => {
    return requestSync("vegas:Properties#getKeys", { scope: this.#scope });
  };
  getProperties = () => {
    return requestSync("vegas:Properties#getProperties", { scope: this.#scope });
  };
  getProperty = (key: string) => {
    return requestSync("vegas:Properties#getProperties", { scope: this.#scope, key });
  };
  setProperties = (properties: object, deleteAllOthers: boolean = false) => {
    requestSync("vegas:Properties#setProperties", {
      scope: this.#scope,
      properties,
      deleteAllOthers,
    });
    return this;
  };
  setProperty = (key: string, value: string) => {
    requestSync("vegas:Properties#setProperty", {
      scope: this.#scope,
      property: { key, value },
    });
    return this;
  };
}
