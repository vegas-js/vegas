import { HtmlOutput, type HtmlSandboxMode, type HtmlXFrameOptionsMode } from "./html-output";

const SANDBOX_MODE = {
  EMULATED: "EMULATED",
  IFRAME: "IFRAME",
  NATIVE: "NATIVE",
} as const satisfies Readonly<Record<HtmlSandboxMode, HtmlSandboxMode>>;

const X_FRAME_OPTIONS_MODE = {
  ALLOWALL: "ALLOWALL",
  DEFAULT: "DEFAULT",
} as const satisfies Readonly<Record<HtmlXFrameOptionsMode, HtmlXFrameOptionsMode>>;

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService {
  readonly SandboxMode = SANDBOX_MODE;
  readonly XFrameOptionsMode = X_FRAME_OPTIONS_MODE;

  createHtmlOutput(): HtmlOutput;
  createHtmlOutput(html: string): HtmlOutput;
  createHtmlOutput(html = ""): HtmlOutput {
    return new HtmlOutput(html);
  }
}

export function createHtmlService(): HtmlService {
  return new HtmlService();
}
