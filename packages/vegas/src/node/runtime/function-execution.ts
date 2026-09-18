import { type HtmlOutput, serializeHtmlOutput } from "./html-output";

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

  if (target.name === "doGet") {
    return serializeHtmlOutput(result as HtmlOutput);
  }

  if (target.name === "doPost") {
    const output = result as {
      getContent(): string;
      getMimeType?: () => unknown;
    };

    return {
      mimeType: typeof output.getMimeType === "function" ? output.getMimeType() : "text/html",
      content: output.getContent(),
    };
  }

  return result;
}
