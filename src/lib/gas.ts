import {
  excludesGASUserFunctionNames,
  MockProperties,
  MockSession,
  MockTarget,
} from "../shared/gas";

declare namespace google {
  namespace script {
    type ScriptRun = {
      withSuccessHandler: (value: unknown) => ScriptRun;
      withFailureHandler: (reason?: any) => ScriptRun;
      [fn: string | symbol]: (...arg: any[]) => void;
    };

    export const run: ScriptRun;
  }
}

type GASUserFunction<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

type ExcludeGASUserFunction = (typeof excludesGASUserFunctionNames)[number];

type GASFunction<T> = Omit<GASUserFunction<T>, ExcludeGASUserFunction>;

export function createGASClient<T extends object>() {
  const handler: ProxyHandler<object> = {
    get(_, property) {
      return (...args: any[]) =>
        new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [property](...args);
        });
    },
  };
  return new Proxy({}, handler) as GASFunction<T>;
}

function mockGAS<T>(target: MockTarget, mock: T): T {
  return {
    target,
    ...mock,
  };
}

export function mockProperties(mock: MockProperties): MockProperties {
  return mockGAS(MockTarget.Properties, mock);
}

export function mockSession(mock: MockSession): MockSession {
  return mockGAS(MockTarget.Session, mock);
}
