interface SurfaceProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

function describeProperties(value: object): SurfaceProperty[] {
  return Object.getOwnPropertyNames(value)
    .map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor) {
        throw new Error(`Missing descriptor for ${name}`);
      }

      return {
        name,
        type: "value" in descriptor ? typeof descriptor.value : "accessor",
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
        getter: typeof descriptor.get === "function",
        setter: typeof descriptor.set === "function",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function captureReferenceConsoleSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const consoleValue = globals.console;

  if (
    consoleValue === null ||
    (typeof consoleValue !== "object" && typeof consoleValue !== "function")
  ) {
    return {
      type: typeof consoleValue,
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
    };
  }

  return {
    type: typeof consoleValue,
    properties: describeProperties(consoleValue),
    prototypeIsObjectPrototype: Object.getPrototypeOf(consoleValue) === Object.prototype,
    stringify: String(consoleValue as any),
  };
}
