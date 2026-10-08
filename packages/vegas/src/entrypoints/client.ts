/// <reference types="../../types/google" />

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

/**
 * Reject unsupported values before dispatching a registered RPC call.
 *
 * This intentionally follows the conservative GAS transport subset checked
 * by the generated dispatcher. It does not serialize or clone arguments.
 */
function assertRpcArgument(value: unknown, path: string, active: WeakSet<object>): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return;
  }

  if (
    typeof value !== "object" ||
    (!Array.isArray(value) && Object.prototype.toString.call(value) !== "[object Object]")
  ) {
    throw new TypeError(`Unsupported RPC transport value at ${path}`);
  }

  if (active.has(value)) {
    throw new TypeError(`Cyclic RPC transport value at ${path}`);
  }

  active.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new TypeError(`Unsupported RPC transport value at ${path}`);
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new TypeError(`Unsupported RPC transport value at ${path}`);
      }

      assertRpcArgument(descriptor.value, `${path}[${JSON.stringify(key)}]`, active);
    }
  } finally {
    active.delete(value);
  }
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
              assertRpcArgument(args[index], `arguments[${index}]`, new WeakSet());
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
