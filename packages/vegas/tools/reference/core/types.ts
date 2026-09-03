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
  execute(functionName: string): Promise<unknown>;
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
