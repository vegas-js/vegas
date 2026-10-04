import type { BlobValue } from "./blob-value";

export interface BlobConvertHostCall {
  readonly service: "blob";
  readonly operation: "convert";
  readonly value: BlobValue;
  readonly contentType: string;
}

export type BlobHostCall = BlobConvertHostCall;

export type BlobHostCallResult<C extends BlobHostCall> = C extends BlobConvertHostCall
  ? BlobValue
  : never;
