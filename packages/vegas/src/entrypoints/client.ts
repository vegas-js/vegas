/// <reference types="../../types/google" />

import {
  isPublicRpcHandlerName,
  type ReservedRpcHandlerName,
} from "../apps-script/rpc-handler-name";
import { assertRpcTransportValue } from "../apps-script/rpc-transport-value";

type ServerFunction = (...args: never[]) => unknown;

type ServerFunctionKey<T extends object> = {
  [K in keyof T]: K extends string
    ? K extends `${string}_` | ReservedRpcHandlerName
      ? never
      : T[K] extends ServerFunction
        ? K
        : never
    : never;
}[keyof T];

/** Promise-based client interface for methods of a registered RPC contract. */
export type RpcClient<T extends object> = {
  [K in ServerFunctionKey<T>]: T[K] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : never;
};

/**
 * Invoke handlers registered by the server's named `rpc` export.
 *
 * All calls use the single GAS global `vegasRpcCall`. The server must export
 * `rpc = defineServerFunctions<Contract>(...)` from its Code entry module.
 */
export function createRpcClient<T extends object>(): RpcClient<T> {
  const handler: ProxyHandler<object> = {
    get(_, property) {
      // Ignore reserved names and avoid thenables or accidental proxy introspection calls.
      if (!isPublicRpcHandlerName(property)) {
        return undefined;
      }

      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          for (let index = 0; index < args.length; index++) {
            assertRpcTransportValue(args[index], `arguments[${index}]`);
          }

          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .vegasRpcCall(property, ...args);
        });
    },
  };

  return new Proxy({}, handler) as RpcClient<T>;
}
