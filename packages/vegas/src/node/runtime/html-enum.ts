import { createRuntimeEnum } from "./runtime-enum";

export const HTML_SANDBOX_MODE = createRuntimeEnum("EMULATED", "IFRAME", "NATIVE");
export type HtmlSandboxMode = (typeof HTML_SANDBOX_MODE)[keyof typeof HTML_SANDBOX_MODE];

export const HTML_X_FRAME_OPTIONS_MODE = createRuntimeEnum("ALLOWALL", "DEFAULT");
export type HtmlXFrameOptionsMode =
  (typeof HTML_X_FRAME_OPTIONS_MODE)[keyof typeof HTML_X_FRAME_OPTIONS_MODE];
