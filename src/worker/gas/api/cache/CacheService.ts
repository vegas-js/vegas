import { RequestSyncFn } from "../..";
import { Cache } from "./Cache";

// https://developers.google.com/apps-script/reference/cache/cache-service
export class CacheService implements GoogleAppsScript.Cache.CacheService {
  readonly #requestSync: RequestSyncFn;

  constructor(requestSync: RequestSyncFn) {
    this.#requestSync = requestSync;
  }

  getDocumentCache = () => {
    return new Cache("document", this.#requestSync);
  };
  getScriptCache = () => {
    return new Cache("script", this.#requestSync);
  };
  getUserCache = () => {
    return new Cache("user", this.#requestSync);
  };
}
