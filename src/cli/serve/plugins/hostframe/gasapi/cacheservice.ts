import { GASCache } from "./cache";

// https://developers.google.com/apps-script/reference/cache/cache-service
export class GASCacheService implements GoogleAppsScript.Cache.CacheService {
  readonly #documentCache: GASCache;
  readonly #scriptCache: GASCache;
  readonly #userCache: GASCache;

  constructor(documentCache: GASCache, scriptCache: GASCache, userCache: GASCache) {
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
