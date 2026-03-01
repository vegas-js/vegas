import { requestSync } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export class Properties implements GoogleAppsScript.Properties.Properties {
  readonly #scope: string;

  constructor(scope: string) {
    this.#scope = scope;
  }

  deleteAllProperties = () => {
    requestSync({
      message: "vegas:Properties#deleteAllProperties",
      payload: { scope: this.#scope },
    });
    return this;
  };
  deleteProperty = (key: string) => {
    requestSync({
      message: "vegas:Properties#deleteProperty",
      payload: { scope: this.#scope, key },
    });
    return this;
  };
  getKeys = () => {
    return requestSync({ message: "vegas:Properties#getKeys", payload: { scope: this.#scope } });
  };
  getProperties = () => {
    return requestSync({
      message: "vegas:Properties#getProperties",
      payload: { scope: this.#scope },
    });
  };
  getProperty = (key: string) => {
    return requestSync({
      message: "vegas:Properties#getProperty",
      payload: { scope: this.#scope, key },
    });
  };
  setProperties = (properties: object, deleteAllOthers: boolean = false) => {
    requestSync({
      message: "vegas:Properties#setProperties",
      payload: {
        scope: this.#scope,
        properties,
        deleteAllOthers,
      },
    });
    return this;
  };
  setProperty = (key: string, value: string) => {
    requestSync({
      message: "vegas:Properties#setProperty",
      payload: {
        scope: this.#scope,
        property: { key, value },
      },
    });
    return this;
  };
}
