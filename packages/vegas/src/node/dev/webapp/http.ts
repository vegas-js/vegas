import type { HtmlXFrameOptionsMode } from "../../runtime";

export type WebAppEndpoint = "dev" | "exec";

export interface WebAppPath {
  readonly endpoint: WebAppEndpoint;
  readonly pathInfo?: string;
}

export function parseWebAppPath(pathname: string): WebAppPath | null {
  const match = /^\/(dev|exec)(?:\/(.*))?$/.exec(pathname);

  if (!match) {
    return null;
  }

  const endpoint = match[1];

  if (endpoint !== "dev" && endpoint !== "exec") {
    return null;
  }

  const pathInfo = match[2] || undefined;

  return {
    endpoint,
    ...(pathInfo ? { pathInfo } : {}),
  };
}

export function resolveAppsScriptXFrameOptionsHeader(
  mode: HtmlXFrameOptionsMode,
): string | undefined {
  switch (mode) {
    case "DEFAULT":
      return "SAMEORIGIN";
    case "ALLOWALL":
      return undefined;
  }
}

export async function readRequestBody(source: AsyncIterable<Uint8Array | string>): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of source) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}
