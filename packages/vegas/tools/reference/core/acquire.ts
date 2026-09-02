import { normalizeReferenceResult } from "./normalize";
import type { ReferenceExecutor } from "./types";

export async function acquireReference(
  executor: ReferenceExecutor,
  functionName: string,
): Promise<unknown> {
  const result = await executor.execute(functionName);
  return normalizeReferenceResult(result);
}
