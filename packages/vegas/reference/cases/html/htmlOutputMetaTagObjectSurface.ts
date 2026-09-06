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

function describePropertyOwnership(value: object, name: string) {
  if (Object.prototype.hasOwnProperty.call(value, name)) {
    return {
      owner: "own",
      prototypeDepth: null,
    };
  }

  let prototype = Object.getPrototypeOf(value);
  let depth = 0;

  while (prototype !== null) {
    if (Object.prototype.hasOwnProperty.call(prototype, name)) {
      return {
        owner: "prototype",
        prototypeDepth: depth,
      };
    }

    prototype = Object.getPrototypeOf(prototype);
    depth += 1;
  }

  return {
    owner: "missing",
    prototypeDepth: null,
  };
}

function describePrototypeChain(value: object) {
  const chain = [];
  let prototype = Object.getPrototypeOf(value);
  let depth = 0;

  while (prototype !== null) {
    const constructor = Object.prototype.hasOwnProperty.call(prototype, "constructor")
      ? Object.getOwnPropertyDescriptor(prototype, "constructor")?.value
      : undefined;

    chain.push({
      depth,
      isObjectPrototype: prototype === Object.prototype,
      properties: describeProperties(prototype),
      ownConstructorType: typeof constructor,
      ownConstructorName: typeof constructor === "function" ? constructor.name : null,
    });

    prototype = Object.getPrototypeOf(prototype);
    depth += 1;
  }

  return chain;
}

function describeConstructor(value: object) {
  const constructor = (value as { constructor?: unknown }).constructor;

  return {
    ownership: describePropertyOwnership(value, "constructor"),
    type: typeof constructor,
    name: typeof constructor === "function" ? constructor.name : null,
    isObjectConstructor: constructor === Object,
  };
}

function describeMetaTag(value: object) {
  return {
    type: typeof value,
    stringify: String(value as any),
    objectTag: Object.prototype.toString.call(value),

    prototypeIsObjectPrototype: Object.getPrototypeOf(value) === Object.prototype,
    prototypeIsNull: Object.getPrototypeOf(value) === null,

    properties: describeProperties(value),
    prototypeChain: describePrototypeChain(value),

    methodOwnership: {
      getContent: describePropertyOwnership(value, "getContent"),
      getName: describePropertyOwnership(value, "getName"),
      toString: describePropertyOwnership(value, "toString"),
    },

    constructorInfo: describeConstructor(value),
  };
}

export function captureReferenceHtmlOutputMetaTagObjectSurface() {
  const globals = globalThis as unknown as Record<string, any>;

  const output = globals.HtmlService.createHtmlOutput("<p>vegas-reference</p>");

  output.addMetaTag("viewport", "width=device-width, initial-scale=1");

  const metaTag = output.getMetaTags()[0];

  if (!metaTag) {
    throw new Error("Expected HtmlOutputMetaTag");
  }

  return describeMetaTag(metaTag);
}
