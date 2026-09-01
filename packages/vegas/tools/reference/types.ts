export interface ReferenceMetadata {
  schemaVersion: number;
  runtime: "V8";
  caseRevision: string;
}

export interface ReferenceFixture<T = unknown> {
  metadata: ReferenceMetadata;
  result: T;
}
