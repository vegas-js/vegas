/// <reference types="../../types/google" />
import { MockProperties, MockSession, MockTarget } from "../shared/gas";

type GASUserFunction<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};
type GASTriggerFunction =
  | "onOpen"
  | "onInstall"
  | "onEdit"
  | "onSelectionChange"
  | "doGet"
  | "doPost";
type GASClient<T> = Omit<GASUserFunction<T>, GASTriggerFunction>;

export function createGASClient<T extends object>() {
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
  return new Proxy({}, handler) as GASClient<T>;
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
