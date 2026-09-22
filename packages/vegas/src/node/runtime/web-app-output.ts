import { HtmlOutput, serializeHtmlOutput, type HtmlOutputSnapshot } from "./html-output";
import { serializeTextOutput, TextOutput, type TextOutputSnapshot } from "./text-output";

export interface HtmlWebAppOutputSnapshot {
  readonly kind: "html";
  readonly output: HtmlOutputSnapshot;
}

export interface TextWebAppOutputSnapshot {
  readonly kind: "text";
  readonly output: TextOutputSnapshot;
}

export type WebAppOutputSnapshot = HtmlWebAppOutputSnapshot | TextWebAppOutputSnapshot;

export function serializeWebAppOutput(output: unknown): WebAppOutputSnapshot {
  if (output instanceof HtmlOutput) {
    return {
      kind: "html",
      output: serializeHtmlOutput(output),
    };
  }

  if (output instanceof TextOutput) {
    return {
      kind: "text",
      output: serializeTextOutput(output),
    };
  }

  throw new TypeError("Web app functions must return an HtmlOutput or TextOutput.");
}
