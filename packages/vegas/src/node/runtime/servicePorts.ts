import type { RuntimeServicePort, ServiceCaller } from "./protocol";

export type RuntimeServicePorts = {
  spreadsheetAppService: RuntimeServicePort<"SpreadsheetApp">;
  sheetService: RuntimeServicePort<"Sheet">;
  rangeService: RuntimeServicePort<"Range">;
  urlFetchService: RuntimeServicePort<"UrlFetch">;
  htmlService: RuntimeServicePort<"Html">;
  sessionService: RuntimeServicePort<"Session">;
  cacheService: RuntimeServicePort<"Cache">;
  propertiesService: RuntimeServicePort<"Properties">;
};

export function createRuntimeServicePorts(callService: ServiceCaller): RuntimeServicePorts {
  const spreadsheetAppService: RuntimeServicePort<"SpreadsheetApp"> = {
    create: (...args) => callService("SpreadsheetApp", "create", ...args),
  };

  const sheetService: RuntimeServicePort<"Sheet"> = {
    getLastRow: (...args) => callService("Sheet", "getLastRow", ...args),
    getLastColumn: (...args) => callService("Sheet", "getLastColumn", ...args),
    getMaxRows: (...args) => callService("Sheet", "getMaxRows", ...args),
    getMaxColumns: (...args) => callService("Sheet", "getMaxColumns", ...args),
    getSheetName: (...args) => callService("Sheet", "getSheetName", ...args),
  };

  const rangeService: RuntimeServicePort<"Range"> = {
    getValue: (...args) => callService("Range", "getValue", ...args),
    getValues: (...args) => callService("Range", "getValues", ...args),
    setValue: (...args) => callService("Range", "setValue", ...args),
    setValues: (...args) => callService("Range", "setValues", ...args),
  };

  const urlFetchService: RuntimeServicePort<"UrlFetch"> = {
    fetch: (...args) => callService("UrlFetch", "fetch", ...args),
    fetchAll: (...args) => callService("UrlFetch", "fetchAll", ...args),
  };

  const htmlService: RuntimeServicePort<"Html"> = {
    getFileContent: (...args) => callService("Html", "getFileContent", ...args),
  };

  const sessionService: RuntimeServicePort<"Session"> = {
    getActiveUser: () => callService("Session", "getActiveUser"),
    getActiveUserLocale: () => callService("Session", "getActiveUserLocale"),
    getEffectiveUser: () => callService("Session", "getEffectiveUser"),
    getScriptTimeZone: () => callService("Session", "getScriptTimeZone"),
    getTemporaryActiveUserKey: () => callService("Session", "getTemporaryActiveUserKey"),
  };

  const cacheService: RuntimeServicePort<"Cache"> = {
    get: (...args) => callService("Cache", "get", ...args),
    getAll: (...args) => callService("Cache", "getAll", ...args),
    put: (...args) => callService("Cache", "put", ...args),
    putAll: (...args) => callService("Cache", "putAll", ...args),
    remove: (...args) => callService("Cache", "remove", ...args),
    removeAll: (...args) => callService("Cache", "removeAll", ...args),
  };

  const propertiesService: RuntimeServicePort<"Properties"> = {
    deleteAllProperties: (...args) => callService("Properties", "deleteAllProperties", ...args),
    deleteProperty: (...args) => callService("Properties", "deleteProperty", ...args),
    getKeys: (...args) => callService("Properties", "getKeys", ...args),
    getProperties: (...args) => callService("Properties", "getProperties", ...args),
    getProperty: (...args) => callService("Properties", "getProperty", ...args),
    setProperties: (...args) => callService("Properties", "setProperties", ...args),
    setProperty: (...args) => callService("Properties", "setProperty", ...args),
  };

  return {
    spreadsheetAppService,
    sheetService,
    rangeService,
    urlFetchService,
    htmlService,
    sessionService,
    cacheService,
    propertiesService,
  };
}
