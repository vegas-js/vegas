/// <reference types="../../types/google" />

import { assertRpcTransportValue } from "../apps-script/rpc-transport-value";

type ServerFunction = (...args: never[]) => unknown;

type ServerFunctionKey<T extends object> = {
  [K in keyof T]: K extends string
    ? K extends `${string}_` | "then"
      ? never
      : T[K] extends ServerFunction
        ? K
        : never
    : never;
}[keyof T];

export type ServerFunctionClient<T extends object> = {
  [K in ServerFunctionKey<T>]: T[K] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : never;
};

/**
 * Invoke top-level named server exports through google.script.run.
 *
 * @deprecated Use `createRpcClient()` and export `rpc` from the server entry.
 * This legacy wrapper is retained for existing named-function clients.
 */
export function createServerFunctionClient<T extends object>(): ServerFunctionClient<T> {
  return createClient<T>(false);
}

/**
 * Invoke handlers registered by the server's named `rpc` export.
 *
 * All calls use the single GAS global `vegasRpcCall`. The server must export
 * `rpc = defineServerFunctions<Contract>(...)` from its Code entry module.
 */
export function createRpcClient<T extends object>(): ServerFunctionClient<T> {
  return createClient<T>(true);
}

function createClient<T extends object>(registered: boolean): ServerFunctionClient<T> {
  const handler: ProxyHandler<object> = {
    get(_, property) {
      // RPC proxies must not become thenables or respond to symbol probes.
      if (typeof property !== "string" || property === "then") {
        return undefined;
      }

      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          if (registered) {
            for (let index = 0; index < args.length; index++) {
              assertRpcTransportValue(args[index], `arguments[${index}]`);
            }
          }

          const functionName = registered ? "vegasRpcCall" : property;
          const parameters = registered ? [property, ...args] : args;

          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [functionName](...parameters);
        });
    },
  };

  return new Proxy({}, handler) as ServerFunctionClient<T>;
}
