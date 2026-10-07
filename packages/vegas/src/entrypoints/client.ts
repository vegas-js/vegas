/// <reference types="../../types/google" />

type ServerFunction = (...args: never[]) => unknown;

type ServerFunctionKey<T extends object> = {
  [K in keyof T]: K extends string
    ? K extends `${string}_`
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

export function createServerFunctionClient<T extends object>(): ServerFunctionClient<T> {
  const handler: ProxyHandler<object> = {
    get(_, property) {
      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [property](...args);
        });
    },
  };

  return new Proxy({}, handler) as ServerFunctionClient<T>;
}
