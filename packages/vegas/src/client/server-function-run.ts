export type ServerFunctionHandler = (value: unknown) => void;

export interface ServerFunctionHandlers {
  readonly success?: ServerFunctionHandler;
  readonly failure?: ServerFunctionHandler;
}

export interface ServerFunctionInvocation {
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly handlers: ServerFunctionHandlers;
}

export interface ServerFunctionRun {
  withSuccessHandler(handler: ServerFunctionHandler): ServerFunctionRun;
  withFailureHandler(handler: ServerFunctionHandler): ServerFunctionRun;
}

type ServerFunctionDispatch = (invocation: ServerFunctionInvocation) => void;

export function createServerFunctionRun(
  dispatch: ServerFunctionDispatch,
  handlers: ServerFunctionHandlers = {},
): ServerFunctionRun {
  return new Proxy(
    {},
    {
      get(_, property) {
        if (property === "withSuccessHandler") {
          return (handler: ServerFunctionHandler) =>
            createServerFunctionRun(dispatch, {
              ...handlers,
              success: handler,
            });
        }

        if (property === "withFailureHandler") {
          return (handler: ServerFunctionHandler) =>
            createServerFunctionRun(dispatch, {
              ...handlers,
              failure: handler,
            });
        }

        return (...args: unknown[]) => {
          dispatch({
            functionName: String(property),
            args,
            handlers,
          });
        };
      },
    },
  ) as ServerFunctionRun;
}
