interface ServiceProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

function describeProperties(value: object): ServiceProperty[] {
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
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
}

export function captureReferenceUrlFetchAppSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const urlFetchApp = globals.UrlFetchApp;

  if (
    urlFetchApp === null ||
    (typeof urlFetchApp !== "object" && typeof urlFetchApp !== "function")
  ) {
    return {
      type: typeof urlFetchApp,
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
    };
  }

  return {
    type: typeof urlFetchApp,
    properties: describeProperties(urlFetchApp),
    prototypeIsObjectPrototype: Object.getPrototypeOf(urlFetchApp) === Object.prototype,
    stringify: String(urlFetchApp as any),
  };
}
