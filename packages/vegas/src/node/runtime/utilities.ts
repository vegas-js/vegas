import { createBlob, type RuntimeBlob, type RuntimeBlobSource } from "./blob";
import { parseCsv as parseCsvString } from "./csv";
import { computeMd2 } from "./md2";
import { formatPrintf } from "./printf";
import { formatSimpleDate, parseSimpleDate } from "./simple-date-format";
import type { UtilitiesCapability } from "./utilities-capability";

const CHARSET = {
  US_ASCII: 0,
  UTF_8: 1,
} as const satisfies typeof GoogleAppsScript.Utilities.Charset;

const DIGEST_ALGORITHM = {
  MD2: 0,
  MD5: 1,
  SHA_1: 2,
  SHA_256: 3,
  SHA_384: 4,
  SHA_512: 5,
} as const satisfies typeof GoogleAppsScript.Utilities.DigestAlgorithm;

const MAC_ALGORITHM = {
  HMAC_MD5: 0,
  HMAC_SHA_1: 1,
  HMAC_SHA_256: 2,
  HMAC_SHA_384: 3,
  HMAC_SHA_512: 4,
} as const satisfies typeof GoogleAppsScript.Utilities.MacAlgorithm;

const RSA_ALGORITHM = {
  RSA_SHA_1: 0,
  RSA_SHA_256: 1,
} as const satisfies typeof GoogleAppsScript.Utilities.RsaAlgorithm;

const MAX_SLEEP_MILLISECONDS = 300_000;
const SLEEP_ARRAY = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

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
  return capability.encodeString(data, charset === CHARSET.US_ASCII ? "ascii" : "utf8");
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

function computeDigest(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
  data: Uint8Array,
): GoogleAppsScript.Byte[] {
  if (algorithm === DIGEST_ALGORITHM.MD2) {
    return Array.from(computeMd2(data), toSignedByte);
  }

  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case DIGEST_ALGORITHM.MD5:
      capabilityAlgorithm = "md5";
      break;
    case DIGEST_ALGORITHM.SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case DIGEST_ALGORITHM.SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case DIGEST_ALGORITHM.SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case DIGEST_ALGORITHM.SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported digest algorithm.");
  }

  return Array.from(capability.computeDigest(capabilityAlgorithm, data), toSignedByte);
}

function computeHmac(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
  value: Uint8Array,
  key: Uint8Array,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  switch (algorithm) {
    case MAC_ALGORITHM.HMAC_MD5:
      capabilityAlgorithm = "md5";
      break;
    case MAC_ALGORITHM.HMAC_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case MAC_ALGORITHM.HMAC_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    case MAC_ALGORITHM.HMAC_SHA_384:
      capabilityAlgorithm = "sha384";
      break;
    case MAC_ALGORITHM.HMAC_SHA_512:
      capabilityAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported MAC algorithm.");
  }

  return Array.from(capability.computeHmac(capabilityAlgorithm, value, key), toSignedByte);
}

function signRsa(
  capability: UtilitiesCapability,
  algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
  value: Uint8Array,
  key: string,
): GoogleAppsScript.Byte[] {
  let capabilityAlgorithm: "sha1" | "sha256";
  switch (algorithm) {
    case RSA_ALGORITHM.RSA_SHA_1:
      capabilityAlgorithm = "sha1";
      break;
    case RSA_ALGORITHM.RSA_SHA_256:
      capabilityAlgorithm = "sha256";
      break;
    default:
      throw new Error("Unsupported RSA algorithm.");
  }

  return Array.from(capability.computeRsaSignature(capabilityAlgorithm, value, key), toSignedByte);
}

// https://developers.google.com/apps-script/reference/utilities/utilities
// @types/google-apps-script models these values as ambient enums. Their concrete
// numeric values are Vegas-internal identities and are not compatibility promises.
export class Utilities {
  readonly Charset = CHARSET;
  readonly DigestAlgorithm = DIGEST_ALGORITHM;
  readonly MacAlgorithm = MAC_ALGORITHM;
  readonly RsaAlgorithm = RSA_ALGORITHM;
  readonly #capability: UtilitiesCapability;

  constructor(capability: UtilitiesCapability) {
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

    return computeDigest(this.#capability, algorithm, bytes);
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

    return computeHmac(this.#capability, MAC_ALGORITHM.HMAC_SHA_256, valueBytes, keyBytes);
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

    return computeHmac(this.#capability, algorithm, valueBytes, keyBytes);
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
    return signRsa(
      this.#capability,
      RSA_ALGORITHM.RSA_SHA_1,
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
    return signRsa(
      this.#capability,
      RSA_ALGORITHM.RSA_SHA_256,
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
    return signRsa(
      this.#capability,
      algorithm,
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

  gzip(blob: RuntimeBlobSource): RuntimeBlob;
  gzip(blob: RuntimeBlobSource, name: string): RuntimeBlob;
  gzip(blob: RuntimeBlobSource, name?: string): RuntimeBlob {
    const compressed = this.#capability.gzip(encodeBytes(blob.getBlob().getBytes()));
    return createBlob(Array.from(compressed, toSignedByte), null, name ?? null);
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
    return createBlob(data, contentType, name);
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

    Atomics.wait(SLEEP_ARRAY, 0, 0, milliseconds);
  }

  ungzip(blob: RuntimeBlobSource): RuntimeBlob {
    const uncompressed = this.#capability.gunzip(encodeBytes(blob.getBlob().getBytes()));
    return createBlob(Array.from(uncompressed, toSignedByte));
  }

  unzip(blob: RuntimeBlobSource): RuntimeBlob[] {
    return this.#capability
      .unzip(encodeBytes(blob.getBlob().getBytes()))
      .map((entry) => createBlob(Array.from(entry.data, toSignedByte), null, entry.name));
  }

  zip(blobs: RuntimeBlobSource[]): RuntimeBlob;
  zip(blobs: RuntimeBlobSource[], name: string): RuntimeBlob;
  zip(blobs: RuntimeBlobSource[], name?: string): RuntimeBlob {
    const entries = blobs.map((source) => {
      const blob = source.getBlob();
      const entryName = blob.getName();
      if (entryName === null || entryName.length === 0) {
        throw new RangeError("Utilities.zip() requires every input blob to have a name.");
      }
      return {
        name: entryName,
        data: encodeBytes(blob.getBytes()),
      };
    });

    return createBlob(Array.from(this.#capability.zip(entries), toSignedByte), null, name ?? null);
  }
}

export function createUtilities(capability: UtilitiesCapability): Utilities {
  return new Utilities(capability);
}
