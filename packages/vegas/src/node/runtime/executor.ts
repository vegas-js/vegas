import type { InvocationEnvironment } from "./invocation";

export interface ExecutionRequest {
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly environment: InvocationEnvironment;
}

export interface Executor {
  execute(request: ExecutionRequest): Promise<unknown>;
}
