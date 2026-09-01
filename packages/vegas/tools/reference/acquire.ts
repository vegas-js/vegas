import { normalizeReferenceResult } from "./normalize";
import type { GASReferenceClient } from "./types";

export async function acquireReference(
  client: GASReferenceClient,
  functionName: string,
): Promise<unknown> {
  const result = await client.execute(functionName);
  return normalizeReferenceResult(result);
}
