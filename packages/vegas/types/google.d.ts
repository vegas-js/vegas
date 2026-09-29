declare namespace google {
  namespace script {
    type Run = {
      withSuccessHandler: (handler: (value: unknown, userObject?: unknown) => void) => Run;
      withFailureHandler: (handler: ((error: Error, userObject?: unknown) => void) | null) => Run;
      withUserObject: (userObject: unknown) => Run;
    } & {
      [fn: string | symbol]: (...arg: unknown[]) => void;
    };
    const run: Run;
  }
}
