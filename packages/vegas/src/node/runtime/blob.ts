import type { BlobConverter } from "./blob-converter";
import type { BlobValue } from "./blob-value";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

function toSignedByte(value: number): number {
  const unsigned = value & 0xff;
  return unsigned > 0x7f ? unsigned - 0x100 : unsigned;
}

function encodeUtf8(value: string): number[] {
  return [...new TextEncoder().encode(value)].map(toSignedByte);
}

function decodeUtf8(bytes: readonly number[]): string {
  return new TextDecoder("utf-8").decode(Uint8Array.from(bytes, (value) => value & 0xff));
}

function cloneValue(value: BlobValue): BlobValue {
  return {
    bytes: value.bytes.map(toSignedByte),
    contentType: value.contentType,
    name: value.name,
    googleType: value.googleType,
  };
}

export interface RuntimeBlobSource {
  getBlob(): RuntimeBlob;
}

// https://developers.google.com/apps-script/reference/base/blob
export class RuntimeBlob implements RuntimeBlobSource {
  readonly #blobConverter: BlobConverter | undefined;
  #bytes: number[];
  #contentType: string | null;
  #name: string | null;
  readonly #googleType: boolean;

  constructor(value: BlobValue, blobConverter?: BlobConverter) {
    const cloned = cloneValue(value);
    this.#blobConverter = blobConverter;
    this.#bytes = [...cloned.bytes];
    this.#contentType = cloned.contentType;
    this.#name = cloned.name;
    this.#googleType = cloned.googleType;
  }

  copyBlob(): RuntimeBlob {
    return new RuntimeBlob(serializeBlob(this), this.#blobConverter);
  }

  getAs(contentType: string): RuntimeBlob {
    if (this.#blobConverter === undefined) {
      // Vegas only enables conversion when the current Runtime supplies a conversion backend.
      throw new UnsupportedRuntimeOperationError(
        "Blob.getAs()",
        "Blob conversion is not available in this Runtime context.",
      );
    }

    return new RuntimeBlob(
      this.#blobConverter(serializeBlob(this), contentType),
      this.#blobConverter,
    );
  }

  getBlob(): RuntimeBlob {
    return this;
  }

  getBytes(): number[] {
    return [...this.#bytes];
  }

  getContentType(): string | null {
    return this.#contentType;
  }

  getDataAsString(): string {
    return decodeUtf8(this.#bytes);
  }

  getName(): string | null {
    return this.#name;
  }

  isGoogleType(): boolean {
    return this.#googleType;
  }

  setBytes(data: readonly number[]): this {
    this.#bytes = data.map(toSignedByte);
    return this;
  }

  setContentType(contentType: string): this {
    this.#contentType = contentType;
    return this;
  }

  setDataFromString(value: string): this {
    this.#bytes = encodeUtf8(value);
    return this;
  }

  setName(name: string): this {
    this.#name = name;
    return this;
  }
}

export function createBlob(
  data: string | readonly number[],
  contentType: string | null = null,
  name: string | null = null,
  blobConverter?: BlobConverter,
): RuntimeBlob {
  return new RuntimeBlob(
    {
      bytes: typeof data === "string" ? encodeUtf8(data) : data.map(toSignedByte),
      contentType,
      name,
      googleType: false,
    },
    blobConverter,
  );
}

export function hydrateBlob(value: BlobValue, blobConverter?: BlobConverter): RuntimeBlob {
  return new RuntimeBlob(value, blobConverter);
}

export function serializeBlob(blob: RuntimeBlob): BlobValue {
  return {
    bytes: blob.getBytes(),
    contentType: blob.getContentType(),
    name: blob.getName(),
    googleType: blob.isGoogleType(),
  };
}
