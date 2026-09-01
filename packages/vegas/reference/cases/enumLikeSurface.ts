const GLOBAL_NAMES = [
  "MimeType",
  "ScriptApp.AuthMode",
  "CalendarApp.Month",
  "DocumentApp.Attribute",
  "GmailApp.LabelType",
] as const;

interface EnumLikeProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
  stringify: string | null;
  value: string | null;
  sameAsContainer: boolean | null;
}

function extractEnumObject(globals: Record<string, unknown>, name: string) {
  if (!name.includes(".")) {
    return globals[name];
  }

  let value: unknown = globals;
  name.split(".").forEach((n) => {
    value = (value as unknown as Record<string, unknown>)[n];
  });
  return value;
}

function describeProperties(value: object): EnumLikeProperty[] {
  return Object.getOwnPropertyNames(value).map((propertyName) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);

    if (!descriptor) {
      throw new Error(`Missing descriptor for ${propertyName}`);
    }

    return {
      name: propertyName,
      type: "value" in descriptor ? typeof descriptor.value : "accessor",
      value: typeof descriptor.value === "string" ? descriptor.value : null,
      stringify:
        "value" in descriptor && typeof descriptor.value !== "function"
          ? String(descriptor.value)
          : null,
      configurable: descriptor.configurable ?? false,
      enumerable: descriptor.enumerable ?? false,
      writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
      getter: typeof descriptor.get === "function",
      setter: typeof descriptor.set === "function",
      sameAsContainer:
        "value" in descriptor && descriptor.value !== null && typeof descriptor.value === "object"
          ? descriptor.value === value
          : null,
    };
  });
}

export function captureReferenceEnumLikeSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;

  return GLOBAL_NAMES.map((name) => {
    const value = extractEnumObject(globals, name);
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return {
        name,
        members: null,
        stringify: null,
        prototypeIsObjectPrototype: null,
      };
    }

    return {
      name,
      members: describeProperties(value),
      stringify: String(value as any),
      prototypeIsObjectPrototype: Object.getPrototypeOf(value) === Object.prototype,
    };
  });
}
