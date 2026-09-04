import { normalizeReferenceResult } from "./normalize";
import type { JsonValue, ReferenceExecutor } from "./types";

export async function acquireReference(
  executor: ReferenceExecutor,
  functionName: string,
  parameters: readonly JsonValue[] = [],
): Promise<unknown> {
  const result = await executor.execute(functionName, parameters);
  return normalizeReferenceResult(result);
}
