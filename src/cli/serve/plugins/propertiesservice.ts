import { GASProperties } from "./properties";

// https://developers.google.com/apps-script/reference/properties/properties-service
export class GASPropertiesService implements GoogleAppsScript.Properties.PropertiesService {
  #documentProperties: GASProperties;
  #scriptProperties: GASProperties;
  #userProperties: GASProperties;

  constructor(
    documentProperties: GASProperties,
    scriptPropeties: GASProperties,
    userProperties: GASProperties,
  ) {
    this.#documentProperties = documentProperties;
    this.#scriptProperties = scriptPropeties;
    this.#userProperties = userProperties;
  }

  getDocumentProperties = () => {
    return this.#documentProperties;
  };
  getScriptProperties = () => {
    return this.#scriptProperties;
  };
  getUserProperties = () => {
    return this.#userProperties;
  };
}
