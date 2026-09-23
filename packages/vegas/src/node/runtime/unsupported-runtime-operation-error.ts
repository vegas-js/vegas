export class UnsupportedRuntimeOperationError extends Error {
  constructor(operation: string, reason: string) {
    super(`Local Runtime does not support ${operation}: ${reason}`);
    this.name = "UnsupportedRuntimeOperationError";
  }
}
