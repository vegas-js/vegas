export function unsupportedHostCall(call: never): never {
  const value = call as unknown as {
    readonly service?: unknown;
    readonly operation?: unknown;
  };

  throw new Error(`Unsupported host call: ${String(value.service)}#${String(value.operation)}`);
}
