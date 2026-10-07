export const DEFAULT_GOOGLE_HTTP_REQUEST_TIMEOUT_MS = 60_000;

export interface GoogleHttpRequestLifetimeOptions {
  readonly signal?: AbortSignal;
  readonly requestTimeoutMs?: number;
}

export function createGoogleHttpRequestSignal(
  options: GoogleHttpRequestLifetimeOptions = {},
): AbortSignal {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_GOOGLE_HTTP_REQUEST_TIMEOUT_MS;

  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new RangeError("Google HTTP request timeout must be a positive integer.");
  }

  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);

  if (options.signal === undefined) {
    return timeoutSignal;
  }

  return AbortSignal.any([options.signal, timeoutSignal]);
}
