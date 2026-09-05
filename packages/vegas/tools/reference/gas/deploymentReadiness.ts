import type { ReferenceWebAppExecutor } from "../core/types";

const DEFAULT_MAX_ATTEMPTS = 40;
const DEFAULT_REQUIRED_CONSECUTIVE_MATCHES = 5;
const DEFAULT_DELAY_MS = 500;

export interface ReferenceDeploymentReadinessOptions {
  readonly maxAttempts?: number;

  readonly requiredConsecutiveMatches?: number;

  readonly delayMs?: number;

  readonly sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function requirePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function requireNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

export async function waitForReferenceDeploymentReadiness(
  webApp: ReferenceWebAppExecutor,
  expectedRevision: string,
  options: ReferenceDeploymentReadinessOptions = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const requiredConsecutiveMatches =
    options.requiredConsecutiveMatches ?? DEFAULT_REQUIRED_CONSECUTIVE_MATCHES;

  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;

  const sleep = options.sleep ?? defaultSleep;

  requirePositiveInteger(maxAttempts, "maxAttempts");

  requirePositiveInteger(requiredConsecutiveMatches, "requiredConsecutiveMatches");

  if (requiredConsecutiveMatches > maxAttempts) {
    throw new RangeError("requiredConsecutiveMatches must not exceed maxAttempts");
  }

  requireNonNegativeInteger(delayMs, "delayMs");

  let lastObserved: unknown;

  let lastError: unknown;

  let consecutiveMatches = 0;
  let bestConsecutiveMatches = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      lastObserved = await webApp.execute({
        method: "GET",
        queryString: "__vegas_reference_readiness=1",
        responseMode: "text",
      });

      lastError = undefined;

      if (lastObserved === expectedRevision) {
        consecutiveMatches += 1;

        bestConsecutiveMatches = Math.max(bestConsecutiveMatches, consecutiveMatches);

        if (consecutiveMatches >= requiredConsecutiveMatches) {
          return;
        }
      } else {
        consecutiveMatches = 0;
      }
    } catch (error) {
      lastError = error;
      consecutiveMatches = 0;
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  const details =
    lastError === undefined
      ? `last observed revision: ${JSON.stringify(lastObserved)}`
      : `last request failed: ${
          // oxlint-disable-next-line no-base-to-string
          lastError instanceof Error ? lastError.message : String(lastError)
        }`;

  throw new Error(
    [
      "Reference Web App deployment did not become ready",
      `expected revision: ${expectedRevision}`,
      `attempts: ${maxAttempts}`,
      `required consecutive matches: ${requiredConsecutiveMatches}`,
      `best consecutive matches: ${bestConsecutiveMatches}`,
      details,
    ].join("; "),
  );
}
