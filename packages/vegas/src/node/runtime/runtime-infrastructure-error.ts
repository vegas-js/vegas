export type RuntimeInfrastructureErrorKind = "backend" | "protocol" | "serialization" | "timeout";

const RUNTIME_INFRASTRUCTURE_ERROR_KINDS = {
  backend: true,
  protocol: true,
  serialization: true,
  timeout: true,
} as const satisfies Record<RuntimeInfrastructureErrorKind, true>;

export function isRuntimeInfrastructureErrorKind(
  value: unknown,
): value is RuntimeInfrastructureErrorKind {
  return typeof value === "string" && Object.hasOwn(RUNTIME_INFRASTRUCTURE_ERROR_KINDS, value);
}

// Vegas reserves this error for failures in the runtime machinery. Errors thrown by executed
// Apps Script code use the normal runtime error transport and are intentionally not wrapped.
export class RuntimeInfrastructureError extends Error {
  readonly kind: RuntimeInfrastructureErrorKind;

  constructor(kind: RuntimeInfrastructureErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RuntimeInfrastructureError";
    this.kind = kind;
  }
}
