export type GasConstants<T extends Record<string, unknown>> = Readonly<T> & {
  toString(): string;
};

export function createGasConstants<const T extends Record<string, unknown>>(
  name: string,
  constants: T,
): GasConstants<T> {
  const value = {} as GasConstants<T>;

  Object.defineProperty(value, "toString", {
    value: () => name,
    configurable: true,
    enumerable: true,
    writable: true,
  });

  for (const [constantName, constantValue] of Object.entries(constants)) {
    Object.defineProperty(value, constantName, {
      value: constantValue,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  }

  return value;
}
