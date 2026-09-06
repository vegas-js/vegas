interface SurfaceProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

interface CallObservation {
  ok: boolean;
  type: string | null;
  stringify: string | null;
  value: string | number | boolean | null;
  error: string | null;
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

function callMethod(
  target: object,
  methodName: string,
  args: readonly unknown[] = [],
): CallObservation {
  try {
    const method = (target as Record<string, unknown>)[methodName];

    if (typeof method !== "function") {
      return {
        ok: false,
        type: null,
        stringify: null,
        value: null,
        error: `${methodName} is not a function`,
      };
    }

    const result = Reflect.apply(method, target, args);
    const type = typeof result;

    return {
      ok: true,
      type,
      stringify: type === "symbol" ? null : String(result),
      value:
        result === null ||
        typeof result === "string" ||
        typeof result === "number" ||
        typeof result === "boolean"
          ? result
          : null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      type: null,
      stringify: null,
      value: null,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

function findObjectPropertyNames(value: object): string[] {
  return Object.getOwnPropertyNames(value)
    .filter((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);

      return (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      );
    })
    .sort((a, b) => a.localeCompare(b));
}

function samePropertySurface(left: object, right: object): boolean {
  return JSON.stringify(describeProperties(left)) === JSON.stringify(describeProperties(right));
}

function identityGraphMatchesContainer(
  container: Record<string, unknown>,
  memberNames: readonly string[],
): boolean {
  return memberNames.every((sourceName) => {
    const source = container[sourceName];

    if (source === null || typeof source !== "object") {
      return false;
    }

    const sourceRecord = source as Record<string, unknown>;

    return memberNames.every((targetName) => sourceRecord[targetName] === container[targetName]);
  });
}

function compareToMatchesOrdinalDifference(
  container: Record<string, unknown>,
  memberNames: readonly string[],
): boolean {
  const ordinals = new Map<string, number>();

  for (const memberName of memberNames) {
    const member = container[memberName];

    if (member === null || typeof member !== "object") {
      return false;
    }

    const ordinal = callMethod(member, "ordinal");
    if (!ordinal.ok || typeof ordinal.value !== "number") {
      return false;
    }

    ordinals.set(memberName, ordinal.value);
  }

  return memberNames.every((sourceName) => {
    const source = container[sourceName];

    if (source === null || typeof source !== "object") {
      return false;
    }

    return memberNames.every((targetName) => {
      const target = container[targetName];

      if (target === null || typeof target !== "object") {
        return false;
      }

      const sourceOrdinal = ordinals.get(sourceName);
      const targetOrdinal = ordinals.get(targetName);

      if (sourceOrdinal === undefined || targetOrdinal === undefined) {
        return false;
      }

      const result = callMethod(source, "compareTo", [target]);

      return (
        result.ok && result.type === "number" && result.value === sourceOrdinal - targetOrdinal
      );
    });
  });
}

function describeEnumLikeProperty(name: string, container: object) {
  const containerRecord = container as Record<string, unknown>;
  const memberNames = findObjectPropertyNames(container);

  const representativeName =
    memberNames.find((memberName) => containerRecord[memberName] === container) ?? null;

  const representative = representativeName === null ? null : containerRecord[representativeName];

  const representativeProperties =
    representative !== null && typeof representative === "object"
      ? describeProperties(representative)
      : null;

  return {
    name,
    memberNames,
    representativeName,
    stringify: String(container as any),
    prototypeIsObjectPrototype: Object.getPrototypeOf(container) === Object.prototype,
    properties: describeProperties(container),
    memberPropertySurface: representativeProperties,
    allMembersHaveSamePropertySurface:
      representative !== null &&
      typeof representative === "object" &&
      memberNames.every((memberName) => {
        const member = containerRecord[memberName];

        return (
          member !== null &&
          typeof member === "object" &&
          samePropertySurface(member, representative)
        );
      }),
    identityGraphMatchesContainer: identityGraphMatchesContainer(containerRecord, memberNames),
    compareToMatchesOrdinalDifference: compareToMatchesOrdinalDifference(
      containerRecord,
      memberNames,
    ),
    members: memberNames.map((memberName) => {
      const member = containerRecord[memberName];

      if (member === null || typeof member !== "object") {
        throw new Error(`Invalid enum member: ${name}.${memberName}`);
      }

      return {
        name: memberName,
        sameAsContainer: member === container,
        stringify: String(member as any),
        prototypeIsObjectPrototype: Object.getPrototypeOf(member) === Object.prototype,
        helpers: {
          name: callMethod(member, "name"),
          ordinal: callMethod(member, "ordinal"),
          toJSON: callMethod(member, "toJSON"),
        },
      };
    }),
  };
}

export function captureReferenceSpreadsheetAppSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const spreadsheetApp = globals.SpreadsheetApp;

  if (
    spreadsheetApp === null ||
    (typeof spreadsheetApp !== "object" && typeof spreadsheetApp !== "function")
  ) {
    return {
      type: typeof spreadsheetApp,
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
      enumLikeProperties: null,
    };
  }

  const enumLikePropertyNames = findObjectPropertyNames(spreadsheetApp);

  return {
    type: typeof spreadsheetApp,
    properties: describeProperties(spreadsheetApp),
    prototypeIsObjectPrototype: Object.getPrototypeOf(spreadsheetApp) === Object.prototype,
    stringify: String(spreadsheetApp as any),
    enumLikeProperties: enumLikePropertyNames.map((name) => {
      const value = (spreadsheetApp as Record<string, unknown>)[name];

      if (value === null || typeof value !== "object") {
        throw new Error(`Invalid enum-like property: SpreadsheetApp.${name}`);
      }

      return describeEnumLikeProperty(`SpreadsheetApp.${name}`, value);
    }),
  };
}
