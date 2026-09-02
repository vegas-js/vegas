const IMPLEMENTED_GLOBAL_NAMES = [
  "DriveApp",
  "SpreadsheetApp",
  "UrlFetchApp",
  "Utilities",
  "HtmlService",
  "Logger",
  "MimeType",
  "Session",
  "console",
  "CacheService",
  "LockService",
  "PropertiesService",
] as const;

const PENDING_BUILTIN_GLOBAL_NAMES = [
  "CalendarApp",
  "DocumentApp",
  "GmailApp",
  "ScriptApp",
] as const;

type GlobalName =
  | (typeof IMPLEMENTED_GLOBAL_NAMES)[number]
  | (typeof PENDING_BUILTIN_GLOBAL_NAMES)[number];

interface GlobalSurfaceEntry {
  name: GlobalName;
  present: boolean;
  own: boolean;
  type: string;
  descriptor: {
    configurable: boolean;
    enumerable: boolean;
    writable: boolean | null;
    getter: boolean;
    setter: boolean;
  } | null;
}

function describeGlobal(name: GlobalName): GlobalSurfaceEntry {
  const globals = globalThis as unknown as Record<string, unknown>;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);

  return {
    name,
    present: name in globalThis,
    own: Object.prototype.hasOwnProperty.call(globalThis, name),
    type: typeof globals[name],
    descriptor: descriptor
      ? {
          configurable: descriptor.configurable ?? false,
          enumerable: descriptor.enumerable ?? false,
          writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
          getter: "get" in descriptor && typeof descriptor.get === "function",
          setter: "set" in descriptor && typeof descriptor.set === "function",
        }
      : null,
  };
}

export function captureReferenceGlobalSurface() {
  return IMPLEMENTED_GLOBAL_NAMES.map(describeGlobal);
}

export function captureReferenceBuiltinGlobalSurface() {
  return PENDING_BUILTIN_GLOBAL_NAMES.map(describeGlobal);
}
