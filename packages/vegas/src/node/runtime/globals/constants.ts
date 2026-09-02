import type { CreateGasObject } from "./object";

export type GasConstants<T extends Record<string, unknown>> = Readonly<T> & {
  toString(): string;
};

const defaultCreateGasObject: CreateGasObject = () => ({});

export function createGasConstants<const T extends Record<string, unknown>>(
  name: string,
  constants: T,
  createObject: CreateGasObject = defaultCreateGasObject,
): GasConstants<T> {
  const value = createObject() as GasConstants<T>;

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
