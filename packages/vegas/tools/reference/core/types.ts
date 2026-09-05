export interface ReferenceMetadata {
  runtime: "V8";
  caseRevision: string;
}

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReferenceResult = JsonValue;

export interface ReferenceExecutor {
  execute(functionName: string, parameters?: readonly JsonValue[]): Promise<unknown>;
}

export interface ReferenceWebAppRequest {
  method: "GET" | "POST";
  pathInfo?: string;
  queryString?: string;
  headers?: Record<string, string>;
  body?: string;
  responseMode?: "json" | "text" | "http" | "http-text" | "http-details";
  authentication?: "oauth";
}

export interface ReferenceWebAppExecutor {
  execute(request: ReferenceWebAppRequest): Promise<unknown>;
}

export interface ReferenceAcquirers {
  executionApi: ReferenceExecutor;
  webApp?: ReferenceWebAppExecutor;
}

export interface ReferenceConfig {
  scriptId: string;
  deploymentId: string;
}

export interface AccessTokenProvider {
  getAccessToken(): Promise<string>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}
