import { acquireReference } from "./acquire";
import type { ReferenceExecutor, ReferenceResult, ReferenceMetadata } from "./types";

export async function acquireReferenceResult(
  executor: ReferenceExecutor,
  functionName: string,
): Promise<ReferenceResult> {
  return acquireReference(executor, functionName) as Promise<ReferenceResult>;
}

export function createReferenceMetadata(caseRevision: string): ReferenceMetadata {
  return {
    runtime: "V8",
    caseRevision,
  };
}
