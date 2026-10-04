export interface BlobValue {
  readonly bytes: readonly number[];
  readonly contentType: string | null;
  readonly name: string | null;
  readonly googleType: boolean;
}
