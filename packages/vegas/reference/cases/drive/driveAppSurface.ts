interface SurfaceProperty {
  name: string;
  type: string;
  configurable: boolean;
  enumerable: boolean;
  writable: boolean | null;
  getter: boolean;
  setter: boolean;
}

interface ValueObservation {
  type: string;
  stringify: string | null;
  value: string | number | boolean | null;
}

interface CallObservation {
  ok: boolean;
  result: ValueObservation | null;
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

function observeValue(value: unknown): ValueObservation {
  const type = typeof value;

  return {
    type,
    stringify: type === "symbol" ? null : String(value),
    value:
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? value
        : null,
  };
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
        result: null,
        error: `${methodName} is not a function`,
      };
    }

    return {
      ok: true,
      result: observeValue(Reflect.apply(method, target, args)),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      result: null,
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

function describeEnumLikeProperty(name: string, container: object) {
  const containerRecord = container as Record<string, unknown>;
  const memberNames = findObjectPropertyNames(container);

  const members = memberNames.map((memberName) => {
    const member = containerRecord[memberName];

    if (member === null || typeof member !== "object") {
      throw new Error(`Invalid enum member: ${name}.${memberName}`);
    }

    const memberRecord = member as Record<string, unknown>;

    return {
      name: memberName,
      sameAsContainer: member === container,
      properties: describeProperties(member),
      prototypeIsObjectPrototype: Object.getPrototypeOf(member) === Object.prototype,
      stringify: String(member as any),
      helpers: {
        name: callMethod(member, "name"),
        ordinal: callMethod(member, "ordinal"),
        toJSON: callMethod(member, "toJSON"),
      },
      identity: Object.fromEntries(
        memberNames.map((targetName) => [
          targetName,
          memberRecord[targetName] === containerRecord[targetName],
        ]),
      ),
      compareTo: Object.fromEntries(
        memberNames.map((targetName) => [
          targetName,
          callMethod(member, "compareTo", [containerRecord[targetName]]),
        ]),
      ),
    };
  });

  return {
    name,
    properties: describeProperties(container),
    prototypeIsObjectPrototype: Object.getPrototypeOf(container) === Object.prototype,
    stringify: String(container as any),
    memberNames,
    members,
  };
}

export function captureReferenceDriveAppSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const driveApp = globals.DriveApp;

  if (driveApp === null || (typeof driveApp !== "object" && typeof driveApp !== "function")) {
    return {
      type: typeof driveApp,
      properties: null,
      prototypeIsObjectPrototype: null,
      stringify: null,
      enumLikeProperties: null,
    };
  }

  const enumLikePropertyNames = findObjectPropertyNames(driveApp);

  return {
    type: typeof driveApp,
    properties: describeProperties(driveApp),
    prototypeIsObjectPrototype: Object.getPrototypeOf(driveApp) === Object.prototype,
    stringify: String(driveApp as any),
    enumLikeProperties: enumLikePropertyNames.map((name) => {
      const value = (driveApp as Record<string, unknown>)[name];

      if (value === null || typeof value !== "object") {
        throw new Error(`Invalid enum-like property: DriveApp.${name}`);
      }

      return describeEnumLikeProperty(`DriveApp.${name}`, value);
    }),
  };
}
