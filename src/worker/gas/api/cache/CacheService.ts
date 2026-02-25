import { RequestSyncFn } from "../..";
import { Cache } from "./Cache";

// https://developers.google.com/apps-script/reference/cache/cache-service
export function CacheService(requestSync: RequestSyncFn): GoogleAppsScript.Cache.CacheService {
  return {
    getDocumentCache: function () {
      return Cache("document", requestSync);
    },
    getScriptCache: function () {
      return Cache("script", requestSync);
    },
    getUserCache: function () {
      return Cache("user", requestSync);
    },
  };
}
