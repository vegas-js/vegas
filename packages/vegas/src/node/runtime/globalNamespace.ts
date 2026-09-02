export type RuntimeGlobalSource = "builtin" | "advanced-service" | "library";

export interface RuntimeGlobalLayer {
  readonly source: RuntimeGlobalSource;
  readonly names: readonly string[];
}

export interface RuntimeGlobalBinding {
  readonly name: string;
  readonly source: RuntimeGlobalSource;
}

export class RuntimeGlobalConflictError extends Error {
  readonly globalName: string;
  readonly existingSource: RuntimeGlobalSource;
  readonly incomingSource: RuntimeGlobalSource;

  constructor(
    globalName: string,
    existingSource: RuntimeGlobalSource,
    incomingSource: RuntimeGlobalSource,
  ) {
    super(`Global "${globalName}" is provided by both "${existingSource}" and "${incomingSource}"`);

    this.name = "RuntimeGlobalConflictError";
    this.globalName = globalName;
    this.existingSource = existingSource;
    this.incomingSource = incomingSource;
  }
}

export function resolveRuntimeGlobalNamespace(
  layers: readonly RuntimeGlobalLayer[],
): RuntimeGlobalBinding[] {
  const owners = new Map<string, RuntimeGlobalSource>();
  const bindings: RuntimeGlobalBinding[] = [];

  for (const layer of layers) {
    for (const name of layer.names) {
      const existingSource = owners.get(name);

      if (existingSource !== undefined) {
        throw new RuntimeGlobalConflictError(name, existingSource, layer.source);
      }

      owners.set(name, layer.source);
      bindings.push({
        name,
        source: layer.source,
      });
    }
  }

  return bindings;
}
