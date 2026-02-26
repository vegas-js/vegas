import { Cache } from "./Cache";

// https://developers.google.com/apps-script/reference/cache/cache-service
export class CacheService implements GoogleAppsScript.Cache.CacheService {
  getDocumentCache = () => {
    return new Cache("document");
  };
  getScriptCache = () => {
    return new Cache("script");
  };
  getUserCache = () => {
    return new Cache("user");
  };
}
