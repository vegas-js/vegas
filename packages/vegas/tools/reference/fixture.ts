import { acquireReference } from "./acquire";
import { REFERENCE_SCHEMA_VERSION } from "./constants";
import type { GASReferenceClient, ReferenceFixture } from "./types";

export async function acquireReferenceFixture(
  client: GASReferenceClient,
  functionName: string,
  caseRevision: string,
): Promise<ReferenceFixture> {
  const result = await acquireReference(client, functionName);

  return {
    metadata: {
      schemaVersion: REFERENCE_SCHEMA_VERSION,
      runtime: "V8",
      caseRevision,
    },
    result,
  };
}
