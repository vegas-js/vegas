export class CreateVegasUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateVegasUsageError";
  }
}

export class CreateVegasCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateVegasCommandError";
  }
}

function isCacError(error: unknown): error is Error {
  return error instanceof Error && error.name === "CACError";
}

export function formatCreateVegasError(error: unknown): string | undefined {
  if (
    error instanceof CreateVegasUsageError ||
    error instanceof CreateVegasCommandError ||
    isCacError(error)
  ) {
    return error.message;
  }

  return undefined;
}
