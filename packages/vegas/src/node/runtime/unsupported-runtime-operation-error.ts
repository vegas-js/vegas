export class UnsupportedRuntimeOperationError extends Error {
  readonly operation: string;
  readonly reason: string;

  constructor(operation: string, reason: string) {
    super(`Local Runtime does not support ${operation}: ${reason}`);
    this.name = "UnsupportedRuntimeOperationError";
    this.operation = operation;
    this.reason = reason;
  }
}
