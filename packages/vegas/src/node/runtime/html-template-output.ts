import type { BlobConverter } from "./blob-converter";
import { HtmlOutput } from "./html-output";
import type { HtmlTemplateEvaluator } from "./html-template";

// This is the private output-sink protocol emitted by html-template-compiler.ts. Apps Script
// documents contextual and force-printing behavior, but does not define its internal sink object.
// Vegas routes those writes through HtmlOutput so the same escaping behavior is used consistently.
export function createHtmlTemplateOutput(
  webApp: boolean,
  htmlTemplateEvaluator?: HtmlTemplateEvaluator,
  blobConverter?: BlobConverter,
) {
  const output = new HtmlOutput("", webApp, htmlTemplateEvaluator, blobConverter);

  return {
    set escaped(value: unknown) {
      output.appendUntrusted(String(value));
    },
    set raw(value: unknown) {
      output.append(String(value));
    },
    finish(): HtmlOutput {
      return output;
    },
  };
}
