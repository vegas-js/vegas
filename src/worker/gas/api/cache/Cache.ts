import { RequestSyncFn } from "../..";

// https://developers.google.com/apps-script/reference/cache/cache
export function Cache(scope: string, requestSync: RequestSyncFn): GoogleAppsScript.Cache.Cache {
  return {
    get: function (key: string) {
      return requestSync("vegas:Cache#get", { scope, key }) ?? null;
    },
    getAll: function (keys: string[]) {
      return requestSync("vegas:Cache#getAll", { scope, keys });
    },
    put: function (
      key: string,
      value: string,
      expirationInSeconds: GoogleAppsScript.Integer = 600,
    ) {
      const expired = new Date().valueOf() + expirationInSeconds * 1000;
      requestSync("vegas:Cache#put", { scope, record: { key, value, expired } });
    },
    putAll: function (values: object, expirationInSeconds: GoogleAppsScript.Integer = 600) {
      const expired = new Date().valueOf() + expirationInSeconds * 1000;
      requestSync("vegas:Cache#putAll", { scope, record: { values, expired } });
    },
    remove: function (key: string) {
      requestSync("vegas:Cache#remove", { scope, key });
    },
    removeAll: function (keys: string[]) {
      requestSync("vegas:Cache#removeAll", { scope, keys });
    },
  };
}
