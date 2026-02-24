// https://developers.google.com/apps-script/reference/properties/properties-service
export function PropertiesService({
  documentProperties,
  scriptProperties,
  userProperties,
}: {
  documentProperties: GoogleAppsScript.Properties.Properties;
  scriptProperties: GoogleAppsScript.Properties.Properties;
  userProperties: GoogleAppsScript.Properties.Properties;
}): GoogleAppsScript.Properties.PropertiesService {
  return {
    getDocumentProperties: function () {
      return documentProperties;
    },
    getScriptProperties: function () {
      return scriptProperties;
    },
    getUserProperties: function () {
      return userProperties;
    },
  };
}
