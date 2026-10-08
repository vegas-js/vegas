/**
 * Handlers exposed to an Apps Script HTML Service client.
 *
 * Function names ending in an underscore are private in google.script.run.
 * Non-function members cannot be registered as handlers.
 *
 * Registration also validates handler names and values at runtime. It does
 * not validate whether parameters or results can cross the GAS transport.
 */
export type ServerFunctionHandlers<Contract extends object> = {
  [Name in keyof Contract]: Name extends string
    ? Name extends `${string}_` | "then"
      ? never
      : Contract[Name] extends (...args: never[]) => unknown
        ? Contract[Name]
        : never
    : never;
};

/**
 * Type-check the server implementation against a client-independent RPC contract.
 *
 * The returned object is unchanged. Export the registry as `rpc` to use
 * `createRpcClient`, or export its members for the legacy named-function bridge.
 */
export function defineServerFunctions<Contract extends object>(
  handlers: ServerFunctionHandlers<Contract>,
): ServerFunctionHandlers<Contract> {
  const value: unknown = handlers;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("RPC handlers must be an object.");
  }

  for (const name of Reflect.ownKeys(handlers)) {
    const descriptor = Object.getOwnPropertyDescriptor(handlers, name);
    if (
      typeof name !== "string" ||
      name.endsWith("_") ||
      name === "then" ||
      descriptor === undefined ||
      !("value" in descriptor) ||
      typeof descriptor.value !== "function"
    ) {
      throw new TypeError(`Invalid RPC handler: ${String(name)}`);
    }
  }

  return handlers;
}
