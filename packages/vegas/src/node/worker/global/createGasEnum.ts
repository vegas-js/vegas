export type GasEnumValue<TMember extends string> = {
  toString(): string;
  name(): string;
  toJSON(): string;
  ordinal(): number;
  compareTo(other: GasEnumValue<TMember>): number;
} & {
  [K in TMember]: GasEnumValue<TMember>;
};

export interface GasEnumDefinition<TMember extends string> {
  members: readonly TMember[];
  representative: TMember;
}

const HELPER_PROPERTY_DESCRIPTOR = {
  configurable: true,
  enumerable: true,
  writable: true,
} as const;

function defineHelper(target: object, name: string, value: (...args: any[]) => unknown): void {
  Object.defineProperty(target, name, {
    value,
    ...HELPER_PROPERTY_DESCRIPTOR,
  });
}

function defineMember(target: object, name: string, value: object): void {
  Object.defineProperty(target, name, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

export function createGasEnum<const TMember extends string>(
  definition: GasEnumDefinition<TMember>,
): GasEnumValue<TMember> {
  const values = new Map<TMember, GasEnumValue<TMember>>();

  for (const [ordinal, memberName] of definition.members.entries()) {
    const value = {} as GasEnumValue<TMember>;

    defineHelper(value, "toString", () => memberName);
    defineHelper(value, "name", () => memberName);
    defineHelper(value, "toJSON", () => memberName);
    defineHelper(value, "ordinal", () => ordinal);
    defineHelper(value, "compareTo", (other: GasEnumValue<TMember>) => ordinal - other.ordinal());

    values.set(memberName, value);
  }

  for (const value of values.values()) {
    for (const [memberName, member] of values) {
      defineMember(value, memberName, member);
    }
  }

  const representative = values.get(definition.representative);
  if (!representative) {
    throw new Error(`Unknown GAS enum representative: ${definition.representative}`);
  }

  return representative;
}
