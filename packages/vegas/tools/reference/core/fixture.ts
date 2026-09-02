import { acquireReference } from "./acquire";
import { REFERENCE_SCHEMA_VERSION } from "./constants";
import type { ReferenceExecutor, ReferenceFixture } from "./types";

export async function acquireReferenceFixture(
  executor: ReferenceExecutor,
  functionName: string,
  caseRevision: string,
): Promise<ReferenceFixture> {
  const result = await acquireReference(executor, functionName);

  return {
    metadata: {
      schemaVersion: REFERENCE_SCHEMA_VERSION,
      runtime: "V8",
      caseRevision,
    },
    result,
  };
}
