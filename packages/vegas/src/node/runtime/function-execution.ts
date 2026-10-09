import { serializeWebAppOutput } from "./web-app-output";

export async function executeRuntimeFunction(
  globals: Readonly<Record<string, unknown>>,
  functionName: string,
  args: readonly unknown[],
): Promise<unknown> {
  // Only execute directly defined global functions. Resolving inherited names
  // or accessor properties could execute unintended code during lookup.
  const target: unknown = Object.getOwnPropertyDescriptor(globals, functionName)?.value;

  if (typeof target !== "function") {
    throw new Error(`${functionName} is not a function`);
  }

  const result = await target(...args);

  if (functionName === "doGet" || functionName === "doPost") {
    return serializeWebAppOutput(result);
  }

  return result;
}
