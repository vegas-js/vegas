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

export function captureReferencePropertiesServiceSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const propertiesService = globals.PropertiesService;
  if (
    propertiesService === null ||
    (typeof propertiesService !== "object" && typeof propertiesService !== "function")
  ) {
    return {
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
    };
  }

  return {
    properties: describeProperties(propertiesService),
    prototypeIsObjectPrototype: Object.getPrototypeOf(propertiesService) === Object.prototype,
    stringify: String(propertiesService as any),
  };
}
