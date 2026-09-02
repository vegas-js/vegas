const GLOBAL_NAMES = ["CalendarApp", "DocumentApp", "GmailApp", "ScriptApp"] as const;

interface GlobalObjectProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

function describeProperties(value: object): GlobalObjectProperty[] {
  return Object.getOwnPropertyNames(value)
    .map((propertyName) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);

      if (!descriptor) {
        throw new Error(`Missing descriptor for ${propertyName}`);
      }

      return {
        name: propertyName,
        type: "value" in descriptor ? typeof descriptor.value : "accessor",
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
        getter: typeof descriptor.get === "function",
        setter: typeof descriptor.set === "function",
      };
    })
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
}

export function captureReferenceGlobalObjectSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;

  return GLOBAL_NAMES.map((name) => {
    const value = globals[name];
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return {
        name,
        properties: null,
        prototypeIsObjectPrototype: null,
        prototypePropertyNames: null,
      };
    }

    const prototype = Object.getPrototypeOf(value) as object | null;

    return {
      name,
      properties: describeProperties(value),
      prototypeIsObjectPrototype: Object.getPrototypeOf(value) === Object.prototype,
      prototypePropertyNames: prototype === null ? null : Object.getOwnPropertyNames(prototype),
    };
  });
}
