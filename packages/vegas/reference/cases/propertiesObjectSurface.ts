function describeProperties(value: object) {
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

export function captureReferencePropertiesObjectSurface() {
  const globals = globalThis as unknown as Record<string, any>;
  const service = globals.PropertiesService;

  const script = service.getScriptProperties();
  const user = service.getUserProperties();

  return {
    script: {
      properties: describeProperties(script),
      prototypeIsObjectPrototype: Object.getPrototypeOf(script) === Object.prototype,
      stringify: String(script),
    },

    user: {
      properties: describeProperties(user),
      prototypeIsObjectPrototype: Object.getPrototypeOf(user) === Object.prototype,
      stringify: String(user),
    },
  };
}
