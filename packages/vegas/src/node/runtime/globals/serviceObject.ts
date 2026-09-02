import type { CreateGasObject } from "./object";

type GasServiceObjectEntry =
  | {
      kind: "method";
      name: string;
      value: (...args: any[]) => unknown;
    }
  | {
      kind: "property";
      name: string;
      value: unknown;
    };

export interface GasServiceObjectDefinition {
  entries: readonly GasServiceObjectEntry[];
}

const defaultCreateGasObject: CreateGasObject = () => ({});

export function createGasServiceObject(
  definition: GasServiceObjectDefinition,
  createObject: CreateGasObject = defaultCreateGasObject,
): Record<string, unknown> {
  const value = createObject();
  for (const entry of definition.entries) {
    Object.defineProperty(value, entry.name, {
      value: entry.value,
      configurable: true,
      enumerable: true,
      writable: entry.kind === "method",
    });
  }

  return value;
}
