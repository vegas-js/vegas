const MEMBER_CASES = [
  {
    name: "ScriptApp.AuthMode.NONE",
    container: "ScriptApp.AuthMode",
    member: "NONE",
  },
  {
    name: "ScriptApp.AuthMode.FULL",
    container: "ScriptApp.AuthMode",
    member: "FULL",
  },
  {
    name: "CalendarApp.Month.FEBRUARY",
    container: "CalendarApp.Month",
    member: "FEBRUARY",
  },
  {
    name: "DocumentApp.Attribute.BACKGROUND_COLOR",
    container: "DocumentApp.Attribute",
    member: "BACKGROUND_COLOR",
  },
] as const;

function resolvePath(globals: Record<string, unknown>, path: string): unknown {
  let value: unknown = globals;
  for (const part of path.split(".")) {
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

interface ValueObservation {
  type: string;
  stringify: string | null;
  value: string | number | boolean | null;
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

interface CallObservation {
  ok: boolean;
  result: ValueObservation | null;
  error: string | null;
}

function callMethod(target: object, methodName: string, args: unknown[] = []): CallObservation {
  try {
    const method = (target as Record<string, unknown>)[methodName];
    if (typeof method !== "function") {
      return {
        ok: false,
        result: null,
        error: `${methodName} is not a function`,
      };
    }

    const result = Reflect.apply(method, target, args);

    return {
      ok: true,
      result: observeValue(result),
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

function describeMember(
  globals: Record<string, unknown>,
  definition: (typeof MEMBER_CASES)[number],
) {
  const container = resolvePath(globals, definition.container);
  if (container === null || (typeof container !== "object" && typeof container !== "function")) {
    throw new Error(`Invalid enum container: ${definition.container}`);
  }

  const member = (container as Record<string, unknown>)[definition.member];
  if (member === null || (typeof member !== "object" && typeof member !== "function")) {
    throw new Error(`Invalid enum member: ${definition.name}`);
  }

  return {
    name: definition.name,
    sameAsContainer: member === container,
    ownPropertyNames: Object.getOwnPropertyNames(member),
    prototypeIsObjectPrototype: Object.getPrototypeOf(member) === Object.prototype,
    stringify: String(member as any),
    helpers: {
      name: callMethod(member, "name"),
      ordinal: callMethod(member, "ordinal"),
      toJSON: callMethod(member, "toJSON"),
    },
  };
}

function captureCompareTo(globals: Record<string, unknown>) {
  const authMode = resolvePath(globals, "ScriptApp.AuthMode") as Record<string, unknown>;

  const none = authMode.NONE as object;
  const full = authMode.FULL as object;

  return {
    noneToFull: callMethod(none, "compareTo", [full]),
    fullToNone: callMethod(full, "compareTo", [none]),
    fullToFull: callMethod(full, "compareTo", [full]),
  };
}

function captureIdentityGraph(globals: Record<string, unknown>) {
  const authMode = resolvePath(globals, "ScriptApp.AuthMode") as Record<string, unknown>;

  const none = authMode.NONE as Record<string, unknown>;
  const full = authMode.FULL as Record<string, unknown>;

  return {
    containerIsNone: authMode === none,
    noneNoneIsNone: none.NONE === none,
    noneFullIsFull: none.FULL === full,
    fullNoneIsNone: full.NONE === none,
    fullFullIsFull: full.FULL === full,
  };
}

export function captureReferenceEnumMemberSurface() {
  const globals = globalThis as unknown as Record<string, unknown>;

  return {
    members: MEMBER_CASES.map((definition) => describeMember(globals, definition)),
    compareTo: captureCompareTo(globals),
    identityGraph: captureIdentityGraph(globals),
  };
}
