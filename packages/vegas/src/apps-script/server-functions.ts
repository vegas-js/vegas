/**
 * Handlers exposed to an Apps Script HTML Service client.
 *
 * Function names ending in an underscore are private in google.script.run.
 * Non-function members cannot be registered as handlers.
 *
 * This checks the TypeScript contract only. It does not validate whether
 * parameters or return values can cross the Apps Script transport boundary.
 */
export type ServerFunctionHandlers<Contract extends object> = {
  [Name in keyof Contract]: Name extends string
    ? Name extends `${string}_`
      ? never
      : Contract[Name] extends (...args: never[]) => unknown
        ? Contract[Name]
        : never
    : never;
};

/**
 * Type-check the server implementation against a client-independent RPC contract.
 *
 * The returned object is unchanged. Export its members as named exports in
 * Code.ts so the existing Vegas GAS bridge can expose each function.
 */
export function defineServerFunctions<Contract extends object>(
  handlers: ServerFunctionHandlers<Contract>,
): ServerFunctionHandlers<Contract> {
  return handlers;
}
