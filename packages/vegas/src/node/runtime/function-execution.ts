import { serializeWebAppOutput } from "./web-app-output";

export async function executeRuntimeFunction(
  globals: Readonly<Record<string, unknown>>,
  functionName: string,
  args: readonly unknown[],
): Promise<unknown> {
  const target = globals[functionName];

  if (typeof target !== "function") {
    throw new Error(`${functionName} is not a function`);
  }

  const result = await target(...args);

  if (functionName === "doGet" || functionName === "doPost") {
    return serializeWebAppOutput(result);
  }

  return result;
}
