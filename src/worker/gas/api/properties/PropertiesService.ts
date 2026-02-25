import { RequestSyncFn } from "../..";
import { Properties } from "./Properties";

// https://developers.google.com/apps-script/reference/properties/properties-service
export function PropertiesService(
  requestSync: RequestSyncFn,
): GoogleAppsScript.Properties.PropertiesService {
  return {
    getDocumentProperties: function () {
      return Properties("document", requestSync);
    },
    getScriptProperties: function () {
      return Properties("script", requestSync);
    },
    getUserProperties: function () {
      return Properties("user", requestSync);
    },
  };
}
