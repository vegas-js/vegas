declare namespace google {
  namespace script {
    type Run = {
      withSuccessHandler: (value: unknown) => Run;
      withFailureHandler: (reason?: unknown) => Run;
      [fn: string | symbol]: (...arg: unknown[]) => void;
    };
    const run: Run;
  }
}
