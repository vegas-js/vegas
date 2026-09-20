type RuntimeEnum<Name extends string> = {
  readonly [Key in Name]: Key;
};

// @types/google-apps-script models Apps Script enum surfaces with TypeScript enum declarations so
// APIs can refer to EnumName and typeof EnumName statically. That declaration shape does not define
// the runtime representation. Apps Script V8 documents enum values JSON-serializing as their names,
// so Vegas uses same-name string primitives instead of JavaScript/TypeScript numeric enums.
// Runtime behavior that Apps Script does not document remains intentionally unspecified.
export function createRuntimeEnum<const Name extends string>(
  ...names: readonly Name[]
): RuntimeEnum<Name> {
  return Object.fromEntries(names.map((name) => [name, name])) as RuntimeEnum<Name>;
}
