import type { BlobValue } from "./blob-value";

export interface BlobConversionCapability {
  convert(value: BlobValue, contentType: string): Promise<BlobValue>;
}
