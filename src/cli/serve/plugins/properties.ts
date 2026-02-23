// https://developers.google.com/apps-script/reference/properties/properties
export class GASProperties implements GoogleAppsScript.Properties.Properties {
  #properties: Record<string, string>;

  constructor() {
    this.#properties = {};
  }

  deleteAllProperties = () => {
    this.#properties = {};
    return this;
  };
  deleteProperty = (key: string) => {
    delete this.#properties[key];
    return this;
  };
  getKeys = () => {
    return Object.keys(this.#properties);
  };
  getProperties = () => {
    return this.#properties;
  };
  getProperty = (key: string) => {
    return this.#properties[key];
  };
  setProperties = (properties: object, deleteAllOthers?: boolean) => {
    if (deleteAllOthers) {
      this.#properties = {};
    }
    Object.entries(properties).forEach(([key, value]) => {
      this.#properties[key] = value;
    });
    return this;
  };
  setProperty = (key: string, value: string) => {
    this.#properties[key] = value;
    return this;
  };
}
