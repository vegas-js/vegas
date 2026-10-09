export type ServerFunctionHandler = (value: unknown, userObject?: unknown) => void;
export type ServerFunctionFailureHandler = (error: Error, userObject?: unknown) => void;

export interface ServerFunctionHandlers {
  readonly success?: ServerFunctionHandler;
  readonly failure?: ServerFunctionFailureHandler | null;
  readonly userObject?: unknown;
}

export interface ServerFunctionInvocation {
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly handlers: ServerFunctionHandlers;
}

export interface ServerFunctionRun {
  withSuccessHandler(handler: ServerFunctionHandler): ServerFunctionRun;
  withFailureHandler(handler: ServerFunctionFailureHandler | null): ServerFunctionRun;
  withUserObject(userObject: unknown): ServerFunctionRun;
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
        // Introspection must not become a server invocation or make the runner thenable.
        if (typeof property !== "string" || property === "then") {
          return undefined;
        }

        if (property === "withSuccessHandler") {
          return (handler: ServerFunctionHandler) =>
            createServerFunctionRun(dispatch, {
              ...handlers,
              success: handler,
            });
        }

        if (property === "withFailureHandler") {
          return (handler: ServerFunctionFailureHandler | null) =>
            createServerFunctionRun(dispatch, {
              ...handlers,
              failure: handler,
            });
        }

        if (property === "withUserObject") {
          return (userObject: unknown) =>
            createServerFunctionRun(dispatch, {
              ...handlers,
              userObject,
            });
        }

        return (...args: unknown[]) => {
          dispatch({
            functionName: property,
            args,
            handlers,
          });
        };
      },
    },
  ) as ServerFunctionRun;
}
