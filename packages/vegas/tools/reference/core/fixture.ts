import { acquireReference } from "./acquire";
import type { ReferenceCaseDefinition } from "./cases";
import { ReferenceExecutionError } from "./executionError";
import { normalizeReferenceResult } from "./normalize";
import type { JsonValue, ReferenceExecutor, ReferenceResult, ReferenceMetadata } from "./types";

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

async function acquireSingleReferenceResult(
  executor: ReferenceExecutor,
  functionName: string,
  observationMode: "result" | "outcome",
  parameters: readonly JsonValue[],
): Promise<ReferenceResult> {
  if (observationMode === "result") {
    return (await acquireReference(executor, functionName, parameters)) as ReferenceResult;
  }

  try {
    const value = await acquireReference(executor, functionName, parameters);

    return {
      outcome: "return",
      value,
    } as ReferenceResult;
  } catch (error) {
    if (!(error instanceof ReferenceExecutionError)) {
      throw error;
    }

    return normalizeReferenceResult({
      outcome: "execution-error",
      error: error.observation,
    }) as ReferenceResult;
  }
}

export async function acquireReferenceResult(
  executor: ReferenceExecutor,
  functionName: string,
  executionCount: number = 1,
  observationMode: "result" | "outcome" = "result",
  parameters: readonly JsonValue[] = [],
): Promise<ReferenceResult> {
  if (!Number.isInteger(executionCount) || executionCount < 1) {
    throw new RangeError("executionCount must be a positive integer");
  }

  if (executionCount === 1) {
    return acquireSingleReferenceResult(executor, functionName, observationMode, parameters);
  }

  const results: ReferenceResult[] = [];

  for (let executionIndex = 0; executionIndex < executionCount; executionIndex++) {
    results.push(
      await acquireSingleReferenceResult(executor, functionName, observationMode, parameters),
    );
  }

  return results;
}

export async function acquireReferenceResults(
  executor: ReferenceExecutor,
  referenceCases: readonly ReferenceCaseDefinition[],
  concurrency: number = DEFAULT_REFERENCE_CONCURRENCY,
): Promise<AcquiredReferenceResult[]> {
  return mapConcurrently(referenceCases, concurrency, async (referenceCase) => ({
    referenceCase,
    result: await acquireReferenceResult(
      executor,
      referenceCase.functionName,
      referenceCase.executionCount,
      referenceCase.observationMode,
      referenceCase.parameters,
    ),
  }));
}

export function createReferenceMetadata(caseRevision: string): ReferenceMetadata {
  return {
    runtime: "V8",
    caseRevision,
  };
}
