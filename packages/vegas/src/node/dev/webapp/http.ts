export type WebAppEndpoint = "dev" | "exec";

export interface WebAppPath {
  readonly endpoint: WebAppEndpoint;
  readonly pathInfo?: string;
}

export interface GasDoPostResult {
  readonly mimeType: string;
  readonly content: string;
}

export interface WebAppHttpResponse {
  readonly contentType: string;
  readonly body: string;
}

export function parseWebAppPath(pathname: string): WebAppPath | null {
  const match = /^\/(dev|exec)(?:\/(.*))?$/.exec(pathname);

  if (!match) {
    return null;
  }

  const endpoint = match[1] as WebAppEndpoint;
  const pathInfo = match[2] || undefined;

  return {
    endpoint,
    ...(pathInfo ? { pathInfo } : {}),
  };
}

export async function readRequestBody(source: AsyncIterable<Uint8Array | string>): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of source) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function createGasDoPostHttpResponse(result: GasDoPostResult): WebAppHttpResponse {
  return {
    contentType: `${result.mimeType}; charset=utf-8`,
    body: result.content,
  };
}
