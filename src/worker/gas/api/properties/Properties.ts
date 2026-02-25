import { RequestSyncFn } from "../..";

// https://developers.google.com/apps-script/reference/properties/properties
export function Properties(
  scope: string,
  requestSync: RequestSyncFn,
): GoogleAppsScript.Properties.Properties {
  return {
    deleteAllProperties: function () {
      requestSync("vegas:Properties#deleteAllProperties", { scope });
      return this;
    },
    deleteProperty: function (key: string) {
      requestSync("vegas:Properties#deleteProperty", { scope, key });
      return this;
    },
    getKeys: function () {
      return requestSync("vegas:Properties#getKeys", { scope });
    },
    getProperties: function () {
      return requestSync("vegas:Properties#getProperties", { scope });
    },
    getProperty: function (key: string) {
      return requestSync("vegas:Properties#getProperties", { scope, key });
    },
    setProperties: function (properties: object, deleteAllOthers: boolean = false) {
      requestSync("vegas:Properties#setProperties", { scope, properties, deleteAllOthers });
      return this;
    },
    setProperty: function (key: string, value: string) {
      requestSync("vegas:Properties#setProperty", { scope, property: { key, value } });
      return this;
    },
  };
}
