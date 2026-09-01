export interface ReferenceMetadata {
  schemaVersion: number;
  runtime: "V8";
  caseRevision: string;
}

export interface ReferenceFixture<T = unknown> {
  metadata: ReferenceMetadata;
  result: T;
}

export interface GASReferenceClient {
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
