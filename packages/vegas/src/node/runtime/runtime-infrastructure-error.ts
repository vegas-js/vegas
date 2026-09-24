export type RuntimeInfrastructureErrorKind = "backend" | "protocol" | "timeout";

// Vegas reserves this error for failures in the runtime machinery. Errors thrown by executed
// Apps Script code use the normal runtime error transport and are intentionally not wrapped.
export class RuntimeInfrastructureError extends Error {
  readonly kind: RuntimeInfrastructureErrorKind;

  constructor(kind: RuntimeInfrastructureErrorKind, message: string) {
    super(message);
    this.name = "RuntimeInfrastructureError";
    this.kind = kind;
  }
}
