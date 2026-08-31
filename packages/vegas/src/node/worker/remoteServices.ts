import type { RuntimeServicePort, ServiceCaller } from "../runtime/protocol";

export function createSpreadsheetAppService(
  callService: ServiceCaller,
): RuntimeServicePort<"SpreadsheetApp"> {
  return {
    create: (...args) => callService("SpreadsheetApp", "create", ...args),
  };
}

export function createRangeService(callService: ServiceCaller): RuntimeServicePort<"Range"> {
  return {
    getValue: (...args) => callService("Range", "getValue", ...args),
    getValues: (...args) => callService("Range", "getValues", ...args),
    setValue: (...args) => callService("Range", "setValue", ...args),
    setValues: (...args) => callService("Range", "setValues", ...args),
  };
}

export function createUrlFetchService(callService: ServiceCaller): RuntimeServicePort<"UrlFetch"> {
  return {
    fetch: (...args) => callService("UrlFetch", "fetch", ...args),
    fetchAll: (...args) => callService("UrlFetch", "fetchAll", ...args),
  };
}

export function createHtmlService(callService: ServiceCaller): RuntimeServicePort<"Html"> {
  return {
    getFileContent: (...args) => callService("Html", "getFileContent", ...args),
  };
}

export function createSessionService(callService: ServiceCaller): RuntimeServicePort<"Session"> {
  return {
    getActiveUser: () => callService("Session", "getActiveUser"),
    getActiveUserLocale: () => callService("Session", "getActiveUserLocale"),
    getEffectiveUser: () => callService("Session", "getEffectiveUser"),
    getScriptTimeZone: () => callService("Session", "getScriptTimeZone"),
    getTemporaryActiveUserKey: () => callService("Session", "getTemporaryActiveUserKey"),
  };
}

export function createCacheService(callService: ServiceCaller): RuntimeServicePort<"Cache"> {
  return {
    get: (...args) => callService("Cache", "get", ...args),
    getAll: (...args) => callService("Cache", "getAll", ...args),
    put: (...args) => callService("Cache", "put", ...args),
    putAll: (...args) => callService("Cache", "putAll", ...args),
    remove: (...args) => callService("Cache", "remove", ...args),
    removeAll: (...args) => callService("Cache", "removeAll", ...args),
  };
}

export function createPropertiesService(
  callService: ServiceCaller,
): RuntimeServicePort<"Properties"> {
  return {
    deleteAllProperties: (...args) => callService("Properties", "deleteAllProperties", ...args),
    deleteProperty: (...args) => callService("Properties", "deleteProperty", ...args),
    getKeys: (...args) => callService("Properties", "getKeys", ...args),
    getProperties: (...args) => callService("Properties", "getProperties", ...args),
    getProperty: (...args) => callService("Properties", "getProperty", ...args),
    setProperties: (...args) => callService("Properties", "setProperties", ...args),
    setProperty: (...args) => callService("Properties", "setProperty", ...args),
  };
}
