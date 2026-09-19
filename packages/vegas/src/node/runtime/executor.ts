import type { InvocationEnvironment } from "./invocation";
import type { Program } from "./program";
import type { InvocationScope } from "./scope";

export interface RuntimeExecutionRequest {
  readonly program: Program;
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export interface RuntimeBackend {
  execute(request: RuntimeExecutionRequest): Promise<unknown>;
}

export interface ExecutionRequest extends RuntimeExecutionRequest {
  readonly environment: InvocationEnvironment;
  readonly scope: InvocationScope;
}

export interface Executor {
  execute(request: ExecutionRequest): Promise<unknown>;
}
