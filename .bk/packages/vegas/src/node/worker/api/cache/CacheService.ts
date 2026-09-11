// https://developers.google.com/apps-script/reference/cache/cache-service
export class CacheService implements GoogleAppsScript.Cache.CacheService {
  readonly #documentCache: GoogleAppsScript.Cache.Cache;
  readonly #scriptCache: GoogleAppsScript.Cache.Cache;
  readonly #userCache: GoogleAppsScript.Cache.Cache;

  constructor(
    documentCache: GoogleAppsScript.Cache.Cache,
    scriptCache: GoogleAppsScript.Cache.Cache,
    userCache: GoogleAppsScript.Cache.Cache,
  ) {
    this.#documentCache = documentCache;
    this.#scriptCache = scriptCache;
    this.#userCache = userCache;
  }

  getDocumentCache = () => {
    return this.#documentCache;
  };
  getScriptCache = () => {
    return this.#scriptCache;
  };
  getUserCache = () => {
    return this.#userCache;
  };
}
