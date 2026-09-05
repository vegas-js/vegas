import type { ScriptRuntimeExecution } from "../execution/bootstrap";

export type WebAppTextMimeType = "CSV" | "ICAL" | "JAVASCRIPT" | "JSON" | "TEXT" | "VCARD";

export interface WebAppHtmlResult {
  readonly kind: "html";

  readonly content: string;

  readonly title: string;

  readonly faviconUrl: string | null;

  readonly metaTags: readonly {
    readonly name: string;
    readonly content: string;
  }[];

  readonly xFrameOptionsMode: string | null | undefined;
}

export interface WebAppTextResult {
  readonly kind: "text";

  readonly content: string | null;

  readonly mimeType: WebAppTextMimeType;

  readonly fileName: string | null;
}

export interface UnsupportedWebAppResult {
  readonly kind: "unsupported";
}

export type WebAppResult = WebAppHtmlResult | WebAppTextResult | UnsupportedWebAppResult;

const WEB_APP_TEXT_MIME_TYPES = new Set<WebAppTextMimeType>([
  "CSV",
  "ICAL",
  "JAVASCRIPT",
  "JSON",
  "TEXT",
  "VCARD",
]);

function requireMethod(value: unknown, name: string): CallableFunction {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    throw new TypeError(`${name}() is unavailable.`);
  }

  const method = Reflect.get(value, name);

  if (typeof method !== "function") {
    throw new TypeError(`${name}() is unavailable.`);
  }

  return method;
}

function callMethod(value: unknown, name: string): unknown {
  return Reflect.apply(requireMethod(value, name), value, []);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }

  return value;
}

function requireNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, label);
}

function projectHtmlOutput(execution: ScriptRuntimeExecution): WebAppHtmlResult {
  const value = execution.value;

  const metaTags = callMethod(value, "getMetaTags");

  if (!Array.isArray(metaTags)) {
    throw new TypeError("HtmlOutput#getMetaTags() must return an array.");
  }

  return {
    kind: "html",

    content: requireString(callMethod(value, "getContent"), "HtmlOutput content"),

    title: requireString(callMethod(value, "getTitle"), "HtmlOutput title"),

    faviconUrl: requireNullableString(callMethod(value, "getFaviconUrl"), "HtmlOutput favicon URL"),

    metaTags: metaTags.map((metaTag) => ({
      name: requireString(callMethod(metaTag, "getName"), "HtmlOutput meta tag name"),

      content: requireString(callMethod(metaTag, "getContent"), "HtmlOutput meta tag content"),
    })),

    xFrameOptionsMode: execution.getHtmlOutputXFrameOptionsMode(value),
  };
}

function requireTextMimeType(value: unknown): WebAppTextMimeType {
  const name = String(value);

  if (!WEB_APP_TEXT_MIME_TYPES.has(name as WebAppTextMimeType)) {
    throw new TypeError(`Unsupported TextOutput MIME type: ${name}`);
  }

  return name as WebAppTextMimeType;
}

function projectTextOutput(execution: ScriptRuntimeExecution): WebAppTextResult {
  const value = execution.value;

  return {
    kind: "text",

    content: requireNullableString(callMethod(value, "getContent"), "TextOutput content"),

    mimeType: requireTextMimeType(callMethod(value, "getMimeType")),

    fileName: requireNullableString(callMethod(value, "getFileName"), "TextOutput file name"),
  };
}

export function projectWebAppResult(execution: ScriptRuntimeExecution): WebAppResult {
  if (execution.isHtmlOutput(execution.value)) {
    return projectHtmlOutput(execution);
  }

  if (execution.isTextOutput(execution.value)) {
    return projectTextOutput(execution);
  }

  return {
    kind: "unsupported",
  };
}
