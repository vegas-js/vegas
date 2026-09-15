export interface GasExecutionRequest {
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export interface GasExecutor {
  execute(request: GasExecutionRequest): Promise<any>;
}
