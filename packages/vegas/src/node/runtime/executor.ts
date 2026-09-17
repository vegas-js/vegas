import type { InvocationEnvironment } from "./invocation";
import type { Program } from "./program";
import type { InvocationScope } from "./scope";

export interface ExecutionRequest {
  readonly program: Program;
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly environment: InvocationEnvironment;
  readonly scope: InvocationScope;
}

export interface Executor {
  execute(request: ExecutionRequest): Promise<unknown>;
}
