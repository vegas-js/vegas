interface SurfaceProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

interface PropertyOwnership {
  owner: "own" | "prototype" | "missing";
  prototypeDepth: number | null;
}

function requireObject(value: unknown, label: string): object {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    throw new TypeError(`${label} must be an object`);
  }

  return value;
}

function requireFunction(target: object, name: string): CallableFunction {
  const value = (target as Record<string, unknown>)[name];

  if (typeof value !== "function") {
    throw new TypeError(`${name} must be a function`);
  }

  return value;
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

function describePropertyOwnership(value: object, name: string): PropertyOwnership {
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
  const constructor = (
    value as {
      constructor?: unknown;
    }
  ).constructor;

  return {
    ownership: describePropertyOwnership(value, "constructor"),
    type: typeof constructor,
    name: typeof constructor === "function" ? constructor.name : null,
    isObjectConstructor: constructor === Object,
  };
}

function describeEnumContainer(container: object) {
  const record = container as Record<string, unknown>;

  const memberNames = Object.getOwnPropertyNames(container)
    .filter((name) => {
      const value = record[name];

      return value !== null && typeof value === "object";
    })
    .sort((a, b) => a.localeCompare(b));

  return {
    properties: describeProperties(container),

    prototypeIsObjectPrototype: Object.getPrototypeOf(container) === Object.prototype,

    // oxlint-disable-next-line no-base-to-string
    stringify: String(container),

    memberNames,

    members: memberNames.map((name) => {
      const member = requireObject(record[name], `MimeType.${name}`);

      return {
        name,

        // oxlint-disable-next-line no-base-to-string
        stringify: String(member),

        properties: describeProperties(member),

        prototypeIsObjectPrototype: Object.getPrototypeOf(member) === Object.prototype,

        helpers: {
          name: call(member, "name"),

          ordinal: call(member, "ordinal"),

          toJSON: call(member, "toJSON"),
        },

        compareTo: Object.fromEntries(
          memberNames.map((otherName) => [
            otherName,

            call(member, "compareTo", [requireObject(record[otherName], `MimeType.${otherName}`)]),
          ]),
        ),

        identity: Object.fromEntries(
          memberNames.map((otherName) => [
            otherName,

            member === record[otherName],
          ]),
        ),
      };
    }),
  };
}

function getContentService() {
  const globals = globalThis as unknown as Record<string, unknown>;

  return requireObject(globals.ContentService, "ContentService");
}

function createTextOutput(content?: string): object {
  const contentService = getContentService();

  const method = requireFunction(contentService, "createTextOutput");

  return requireObject(
    content === undefined
      ? Reflect.apply(method, contentService, [])
      : Reflect.apply(method, contentService, [content]),
    "TextOutput",
  );
}

function call(target: object, methodName: string, args: readonly unknown[] = []): unknown {
  return Reflect.apply(requireFunction(target, methodName), target, args);
}

function describeTextOutput(value: object) {
  return {
    type: typeof value,

    // oxlint-disable-next-line no-base-to-string
    stringify: String(value),

    objectTag: Object.prototype.toString.call(value),

    prototypeIsObjectPrototype: Object.getPrototypeOf(value) === Object.prototype,

    prototypeIsNull: Object.getPrototypeOf(value) === null,

    properties: describeProperties(value),

    prototypeChain: describePrototypeChain(value),

    methodOwnership: {
      append: describePropertyOwnership(value, "append"),

      clear: describePropertyOwnership(value, "clear"),

      downloadAsFile: describePropertyOwnership(value, "downloadAsFile"),

      getContent: describePropertyOwnership(value, "getContent"),

      getFileName: describePropertyOwnership(value, "getFileName"),

      getMimeType: describePropertyOwnership(value, "getMimeType"),

      setContent: describePropertyOwnership(value, "setContent"),

      setMimeType: describePropertyOwnership(value, "setMimeType"),

      toString: describePropertyOwnership(value, "toString"),
    },

    constructorInfo: describeConstructor(value),
  };
}

export function captureReferenceContentServiceSurface() {
  const contentService = getContentService();

  const mimeType = requireObject(
    (contentService as Record<string, unknown>).MimeType,
    "ContentService.MimeType",
  );

  return {
    type: typeof contentService,

    // oxlint-disable-next-line no-base-to-string
    stringify: String(contentService),

    properties: describeProperties(contentService),

    prototypeIsObjectPrototype: Object.getPrototypeOf(contentService) === Object.prototype,

    mimeType: describeEnumContainer(mimeType),
  };
}

export function captureReferenceTextOutputObjectSurface() {
  return describeTextOutput(createTextOutput("vegas-reference"));
}

export function captureReferenceTextOutputSemantics() {
  const contentService = getContentService();

  const mimeType = requireObject(
    (contentService as Record<string, unknown>).MimeType,
    "ContentService.MimeType",
  ) as Record<string, unknown>;

  const empty = createTextOutput();

  const populated = createTextOutput("initial");

  const appendResult = call(populated, "append", ["-append"]);

  const afterAppend = call(populated, "getContent");

  const setContentResult = call(populated, "setContent", ["replaced"]);

  const afterSetContent = call(populated, "getContent");

  const setMimeTypeResult = call(populated, "setMimeType", [mimeType.JSON]);

  const currentMimeType = call(populated, "getMimeType");

  const downloadResult = call(populated, "downloadAsFile", ["reference.txt"]);

  const fileNameAfterDownload = call(populated, "getFileName");

  const clearResult = call(populated, "clear");

  const afterClear = call(populated, "getContent");

  const defaultMimeType = call(empty, "getMimeType");

  return {
    empty: {
      content: call(empty, "getContent"),

      fileName: call(empty, "getFileName"),

      mimeType: {
        stringify: String(defaultMimeType),

        identities: Object.fromEntries(
          Object.keys(mimeType)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => [name, defaultMimeType === mimeType[name]]),
        ),
      },

      // oxlint-disable-next-line no-base-to-string
      stringify: String(empty),
    },

    mutation: {
      appendReturnsSelf: appendResult === populated,

      afterAppend,

      setContentReturnsSelf: setContentResult === populated,

      afterSetContent,

      setMimeTypeReturnsSelf: setMimeTypeResult === populated,

      mimeType: {
        stringify: String(currentMimeType),

        isJson: currentMimeType === mimeType.JSON,
      },

      downloadAsFileReturnsSelf: downloadResult === populated,

      fileNameAfterDownload,

      clearReturnsSelf: clearResult === populated,

      afterClear,
    },
  };
}
