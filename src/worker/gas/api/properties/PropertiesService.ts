import { RequestSyncFn } from "../..";
import { Properties } from "./Properties";

// https://developers.google.com/apps-script/reference/properties/properties-service
export class PropertiesService implements GoogleAppsScript.Properties.PropertiesService {
  readonly #requestSync: RequestSyncFn;

  constructor(requestSync: RequestSyncFn) {
    this.#requestSync = requestSync;
  }

  getDocumentProperties = () => {
    return new Properties("document", this.#requestSync);
  };
  getScriptProperties = () => {
    return new Properties("script", this.#requestSync);
  };
  getUserProperties = () => {
    return new Properties("user", this.#requestSync);
  };
}
