// https://developers.google.com/apps-script/reference/properties/properties-service
export class PropertiesService implements GoogleAppsScript.Properties.PropertiesService {
  readonly #documentProperties: GoogleAppsScript.Properties.Properties;
  readonly #scriptProperties: GoogleAppsScript.Properties.Properties;
  readonly #userProperties: GoogleAppsScript.Properties.Properties;

  constructor(
    documentProperties: GoogleAppsScript.Properties.Properties,
    scriptProperties: GoogleAppsScript.Properties.Properties,
    userProperties: GoogleAppsScript.Properties.Properties,
  ) {
    this.#documentProperties = documentProperties;
    this.#scriptProperties = scriptProperties;
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
