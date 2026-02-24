// https://developers.google.com/apps-script/reference/properties/properties
export function Properties(): GoogleAppsScript.Properties.Properties {
  let _properties: Record<string, string> = {};

  return {
    deleteAllProperties: function () {
      _properties = {};
      return this;
    },
    deleteProperty: function (key: string) {
      delete _properties[key];
      return this;
    },
    getKeys: function () {
      return Object.keys(_properties);
    },
    getProperties: function () {
      return _properties;
    },
    getProperty: function (key: string) {
      return _properties[key] ?? null;
    },
    setProperties: function (properties: object, deleteAllOthers?: boolean) {
      if (deleteAllOthers) {
        _properties = {};
      }
      Object.entries(properties).forEach(([key, value]) => {
        _properties[key] = value;
      });
      return this;
    },
    setProperty: function (key: string, value: string) {
      _properties[key] = value;
      return this;
    },
  };
}
