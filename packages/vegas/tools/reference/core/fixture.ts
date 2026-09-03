import { acquireReference } from "./acquire";
import type { ReferenceCaseDefinition } from "./cases";
import type { ReferenceExecutor, ReferenceResult, ReferenceMetadata } from "./types";

const DEFAULT_REFERENCE_CONCURRENCY = 8;

export interface AcquiredReferenceResult {
  referenceCase: ReferenceCaseDefinition;
  result: ReferenceResult;
}

async function mapConcurrently<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  if (values.length === 0) {
    return [];
  }

  const results = Array.from<R>({ length: values.length });
  let nextIndex = 0;
  let failed = false;
  let firstError: unknown;

  async function worker(): Promise<void> {
    while (!failed) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= values.length) {
        return;
      }

      try {
        results[index] = await mapper(values[index]!, index);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
        return;
      }
    }
  }

  const workerCount = Math.min(concurrency, values.length);

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (failed) {
    throw firstError;
  }

  return results;
}

export async function acquireReferenceResult(
  executor: ReferenceExecutor,
  functionName: string,
): Promise<ReferenceResult> {
  return acquireReference(executor, functionName) as Promise<ReferenceResult>;
}

export async function acquireReferenceResults(
  executor: ReferenceExecutor,
  referenceCases: readonly ReferenceCaseDefinition[],
  concurrency: number = DEFAULT_REFERENCE_CONCURRENCY,
): Promise<AcquiredReferenceResult[]> {
  return mapConcurrently(referenceCases, concurrency, async (referenceCase) => ({
    referenceCase,
    result: await acquireReferenceResult(executor, referenceCase.functionName),
  }));
}

export function createReferenceMetadata(caseRevision: string): ReferenceMetadata {
  return {
    runtime: "V8",
    caseRevision,
  };
}
