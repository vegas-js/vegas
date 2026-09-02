interface MimeTypeProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
  stringify: string | null;
  value: string | null;
}

function describeProperties(value: object): MimeTypeProperty[] {
  return Object.getOwnPropertyNames(value).map((propertyName) => {
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
      stringify:
        "value" in descriptor && typeof descriptor.value !== "function"
          ? String(descriptor.value)
          : null,
      value: typeof descriptor.value === "string" ? descriptor.value : null,
    };
  });
}

export function captureReferenceMimeTypeSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const mimeType = globals.MimeType;
  if (mimeType === null || typeof mimeType !== "object") {
    return {
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
    };
  }

  return {
    properties: describeProperties(mimeType),
    prototypeIsObjectPrototype: Object.getPrototypeOf(mimeType) === Object.prototype,
    stringify: String(mimeType as any),
  };
}
