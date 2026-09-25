import { createBlob, type RuntimeBlob } from "./blob";
import type { BlobConverter } from "./blob-converter";
import { parseCsv as parseCsvString } from "./csv";
import { formatPrintf } from "./printf";
import { formatSimpleDate, parseSimpleDate } from "./simple-date-format";
import type { UtilitiesCapability } from "./utilities-capability";
import {
  computeUtilitiesDigest,
  computeUtilitiesHmac,
  computeUtilitiesRsaSignature,
} from "./utilities-crypto";
import {
  UTILITIES_CHARSET,
  UTILITIES_DIGEST_ALGORITHM,
  UTILITIES_MAC_ALGORITHM,
  UTILITIES_RSA_ALGORITHM,
  type UtilitiesCharset,
  type UtilitiesDigestAlgorithm,
  type UtilitiesMacAlgorithm,
  type UtilitiesRsaAlgorithm,
} from "./utilities-enum";

const MAX_SLEEP_MILLISECONDS = 300_000;

function toSignedByte(value: number): number {
  const unsigned = value & 0xff;
  return unsigned > 0x7f ? unsigned - 0x100 : unsigned;
}

function encodeBytes(data: readonly GoogleAppsScript.Byte[]): Uint8Array {
  return Uint8Array.from(data, (value) => value & 0xff);
}

function encodeString(
  capability: UtilitiesCapability,
  data: string,
  charset: GoogleAppsScript.Utilities.Charset | undefined,
): Uint8Array {
  const runtimeCharset = charset as unknown as UtilitiesCharset | undefined;

  return capability.encodeString(
    data,
    runtimeCharset === UTILITIES_CHARSET.US_ASCII ? "ascii" : "utf8",
  );
}

function encodeBase64(capability: UtilitiesCapability, data: Uint8Array, webSafe: boolean): string {
  const encoded = capability.encodeBase64(data);

  return webSafe ? encoded.replaceAll("+", "-").replaceAll("/", "_") : encoded;
}

function decodeBase64(
  capability: UtilitiesCapability,
  encoded: string,
  webSafe: boolean,
): GoogleAppsScript.Byte[] {
  const normalized = webSafe ? encoded.replaceAll("-", "+").replaceAll("_", "/") : encoded;

  return Array.from(capability.decodeBase64(normalized), toSignedByte);
}

// https://developers.google.com/apps-script/reference/utilities/utilities
export class Utilities {
  // Preserve the @types/google-apps-script static surface while the Runtime values themselves use
  // the string representation defined by createRuntimeEnum().
  readonly Charset = UTILITIES_CHARSET as unknown as typeof GoogleAppsScript.Utilities.Charset;
  readonly DigestAlgorithm =
    UTILITIES_DIGEST_ALGORITHM as unknown as typeof GoogleAppsScript.Utilities.DigestAlgorithm;
  readonly MacAlgorithm =
    UTILITIES_MAC_ALGORITHM as unknown as typeof GoogleAppsScript.Utilities.MacAlgorithm;
  readonly RsaAlgorithm =
    UTILITIES_RSA_ALGORITHM as unknown as typeof GoogleAppsScript.Utilities.RsaAlgorithm;
  readonly #blobConverter: BlobConverter | undefined;
  readonly #capability: UtilitiesCapability;

  constructor(capability: UtilitiesCapability, blobConverter?: BlobConverter) {
    this.#blobConverter = blobConverter;
    this.#capability = capability;
  }

  base64Decode(encoded: string): GoogleAppsScript.Byte[];
  base64Decode(
    encoded: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  base64Decode(
    encoded: string,
    _charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return decodeBase64(this.#capability, encoded, false);
  }

  base64DecodeWebSafe(encoded: string): GoogleAppsScript.Byte[];
  base64DecodeWebSafe(
    encoded: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  base64DecodeWebSafe(
    encoded: string,
    _charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return decodeBase64(this.#capability, encoded, true);
  }

  base64Encode(data: GoogleAppsScript.Byte[]): string;
  base64Encode(data: string): string;
  base64Encode(data: string, charset: GoogleAppsScript.Utilities.Charset): string;
  base64Encode(
    data: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): string {
    const bytes =
      typeof data === "string" ? encodeString(this.#capability, data, charset) : encodeBytes(data);

    return encodeBase64(this.#capability, bytes, false);
  }

  base64EncodeWebSafe(data: GoogleAppsScript.Byte[]): string;
  base64EncodeWebSafe(data: string): string;
  base64EncodeWebSafe(data: string, charset: GoogleAppsScript.Utilities.Charset): string;
  base64EncodeWebSafe(
    data: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): string {
    const bytes =
      typeof data === "string" ? encodeString(this.#capability, data, charset) : encodeBytes(data);

    return encodeBase64(this.#capability, bytes, true);
  }

  computeDigest(
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: GoogleAppsScript.Byte[],
  ): GoogleAppsScript.Byte[];
  computeDigest(
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: string,
  ): GoogleAppsScript.Byte[];
  computeDigest(
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeDigest(
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    const bytes =
      typeof value === "string"
        ? encodeString(this.#capability, value, charset)
        : encodeBytes(value);

    return computeUtilitiesDigest(
      this.#capability,
      algorithm as unknown as UtilitiesDigestAlgorithm,
      bytes,
    );
  }

  computeHmacSha256Signature(
    value: GoogleAppsScript.Byte[],
    key: GoogleAppsScript.Byte[],
  ): GoogleAppsScript.Byte[];
  computeHmacSha256Signature(value: string, key: string): GoogleAppsScript.Byte[];
  computeHmacSha256Signature(
    value: string,
    key: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeHmacSha256Signature(
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    const valueBytes =
      typeof value === "string"
        ? encodeString(this.#capability, value, charset)
        : encodeBytes(value);
    const keyBytes =
      typeof key === "string" ? encodeString(this.#capability, key, charset) : encodeBytes(key);

    return computeUtilitiesHmac(
      this.#capability,
      UTILITIES_MAC_ALGORITHM.HMAC_SHA_256,
      valueBytes,
      keyBytes,
    );
  }

  computeHmacSignature(
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: GoogleAppsScript.Byte[],
    key: GoogleAppsScript.Byte[],
  ): GoogleAppsScript.Byte[];
  computeHmacSignature(
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: string,
    key: string,
  ): GoogleAppsScript.Byte[];
  computeHmacSignature(
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: string,
    key: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeHmacSignature(
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    const valueBytes =
      typeof value === "string"
        ? encodeString(this.#capability, value, charset)
        : encodeBytes(value);
    const keyBytes =
      typeof key === "string" ? encodeString(this.#capability, key, charset) : encodeBytes(key);

    return computeUtilitiesHmac(
      this.#capability,
      algorithm as unknown as UtilitiesMacAlgorithm,
      valueBytes,
      keyBytes,
    );
  }

  computeRsaSha1Signature(value: string, key: string): GoogleAppsScript.Byte[];
  computeRsaSha1Signature(
    value: string,
    key: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeRsaSha1Signature(
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return computeUtilitiesRsaSignature(
      this.#capability,
      UTILITIES_RSA_ALGORITHM.RSA_SHA_1,
      encodeString(this.#capability, value, charset),
      key,
    );
  }

  computeRsaSha256Signature(value: string, key: string): GoogleAppsScript.Byte[];
  computeRsaSha256Signature(
    value: string,
    key: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeRsaSha256Signature(
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return computeUtilitiesRsaSignature(
      this.#capability,
      UTILITIES_RSA_ALGORITHM.RSA_SHA_256,
      encodeString(this.#capability, value, charset),
      key,
    );
  }

  computeRsaSignature(
    algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
    value: string,
    key: string,
  ): GoogleAppsScript.Byte[];
  computeRsaSignature(
    algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
    value: string,
    key: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  computeRsaSignature(
    algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return computeUtilitiesRsaSignature(
      this.#capability,
      algorithm as unknown as UtilitiesRsaAlgorithm,
      encodeString(this.#capability, value, charset),
      key,
    );
  }

  formatDate(date: GoogleAppsScript.Base.Date, timeZone: string, format: string): string {
    return formatSimpleDate(new Date(date.getTime()), timeZone, format);
  }

  formatString(template: string, ...args: unknown[]): string {
    return formatPrintf(template, args);
  }

  getUuid(): string {
    return this.#capability.randomUuid();
  }

  /** @deprecated Replaced by JSON.parse() in Apps Script. */
  jsonParse(jsonString: string): unknown {
    return JSON.parse(jsonString);
  }

  /** @deprecated Replaced by JSON.stringify() in Apps Script. */
  jsonStringify(obj: unknown): string {
    // Apps Script documents this legacy helper as a direct replacement by JSON.stringify().
    // Preserve native JSON serialization semantics while retaining the Apps Script string surface.
    return JSON.stringify(obj) as string;
  }

  gzip(blob: GoogleAppsScript.Base.BlobSource): RuntimeBlob;
  gzip(blob: GoogleAppsScript.Base.BlobSource, name: string): RuntimeBlob;
  gzip(blob: GoogleAppsScript.Base.BlobSource, name?: string): RuntimeBlob {
    const compressed = this.#capability.gzip(encodeBytes(blob.getBlob().getBytes()));
    return createBlob(
      Array.from(compressed, toSignedByte),
      null,
      name ?? null,
      this.#blobConverter,
    );
  }

  newBlob(data: GoogleAppsScript.Byte[]): RuntimeBlob;
  newBlob(data: GoogleAppsScript.Byte[], contentType: string | null): RuntimeBlob;
  newBlob(
    data: GoogleAppsScript.Byte[],
    contentType: string | null,
    name: string | null,
  ): RuntimeBlob;
  newBlob(data: string): RuntimeBlob;
  newBlob(data: string, contentType: string | null): RuntimeBlob;
  newBlob(data: string, contentType: string | null, name: string | null): RuntimeBlob;
  newBlob(
    data: GoogleAppsScript.Byte[] | string,
    contentType: string | null = null,
    name: string | null = null,
  ): RuntimeBlob {
    return createBlob(data, contentType, name, this.#blobConverter);
  }

  parseCsv(csv: string): string[][];
  parseCsv(csv: string, delimiter: GoogleAppsScript.Char): string[][];
  parseCsv(csv: string, delimiter: GoogleAppsScript.Char = ","): string[][] {
    return parseCsvString(csv, delimiter);
  }

  parseDate(date: string, timeZone: string, format: string): Date {
    return parseSimpleDate(date, timeZone, format);
  }

  sleep(milliseconds: GoogleAppsScript.Integer): void {
    if (milliseconds > MAX_SLEEP_MILLISECONDS) {
      throw new RangeError("Sleep duration exceeds 300000 milliseconds.");
    }

    this.#capability.sleep(milliseconds);
  }

  ungzip(blob: GoogleAppsScript.Base.BlobSource): RuntimeBlob {
    const uncompressed = this.#capability.gunzip(encodeBytes(blob.getBlob().getBytes()));
    return createBlob(Array.from(uncompressed, toSignedByte), null, null, this.#blobConverter);
  }

  unzip(blob: GoogleAppsScript.Base.BlobSource): RuntimeBlob[] {
    return this.#capability
      .unzip(encodeBytes(blob.getBlob().getBytes()))
      .map((entry) =>
        createBlob(Array.from(entry.data, toSignedByte), null, entry.name, this.#blobConverter),
      );
  }

  zip(blobs: GoogleAppsScript.Base.BlobSource[]): RuntimeBlob;
  zip(blobs: GoogleAppsScript.Base.BlobSource[], name: string): RuntimeBlob;
  zip(blobs: GoogleAppsScript.Base.BlobSource[], name?: string): RuntimeBlob {
    const entries = blobs.map((source) => {
      const blob = source.getBlob();
      const entryName = blob.getName();
      if (entryName === null || entryName.length === 0) {
        // Apps Script does not document how unnamed BlobSource values are named in ZIP archives.
        // Vegas fails closed instead of inventing a local archive-entry name.
        throw new RangeError("Utilities.zip() requires every input blob to have a name.");
      }
      return {
        name: entryName,
        data: encodeBytes(blob.getBytes()),
      };
    });

    return createBlob(
      Array.from(this.#capability.zip(entries), toSignedByte),
      null,
      name ?? null,
      this.#blobConverter,
    );
  }
}

export function createUtilities(
  capability: UtilitiesCapability,
  blobConverter?: BlobConverter,
): Utilities {
  return new Utilities(capability, blobConverter);
}
