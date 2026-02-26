import { Properties } from "./Properties";

// https://developers.google.com/apps-script/reference/properties/properties-service
export class PropertiesService implements GoogleAppsScript.Properties.PropertiesService {
  getDocumentProperties = () => {
    return new Properties("document");
  };
  getScriptProperties = () => {
    return new Properties("script");
  };
  getUserProperties = () => {
    return new Properties("user");
  };
}
