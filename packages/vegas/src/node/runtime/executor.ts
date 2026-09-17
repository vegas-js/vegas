import type { InvocationEnvironment } from "./invocation";
import type { Program } from "./program";

export interface ExecutionRequest {
  readonly program: Program;
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly environment: InvocationEnvironment;
}

export interface Executor {
  execute(request: ExecutionRequest): Promise<unknown>;
}
