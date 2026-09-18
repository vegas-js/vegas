import crypto from "node:crypto";

import { computeMd2 } from "./md2";

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

function encodeBytes(data: GoogleAppsScript.Byte[]): Buffer {
  return Buffer.from(Uint8Array.from(data, (value) => value & 0xff));
}

function encodeString(
  data: string,
  charset: GoogleAppsScript.Utilities.Charset | undefined,
): Buffer {
  if (charset === CHARSET.US_ASCII) {
    return Buffer.from(data, "ascii");
  }

  return Buffer.from(data, "utf8");
}

function encodeBase64(data: Buffer, webSafe: boolean): string {
  const encoded = data.toString("base64");

  return webSafe ? encoded.replaceAll("+", "-").replaceAll("/", "_") : encoded;
}

function decodeBase64(encoded: string, webSafe: boolean): GoogleAppsScript.Byte[] {
  const normalized = webSafe ? encoded.replaceAll("-", "+").replaceAll("_", "/") : encoded;

  return Array.from(Buffer.from(normalized, "base64"), toSignedByte);
}

function computeDigest(
  algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
  data: Uint8Array,
): GoogleAppsScript.Byte[] {
  if (algorithm === DIGEST_ALGORITHM.MD2) {
    return Array.from(computeMd2(data), toSignedByte);
  }

  let nodeAlgorithm: string;
  switch (algorithm) {
    case DIGEST_ALGORITHM.MD5:
      nodeAlgorithm = "md5";
      break;
    case DIGEST_ALGORITHM.SHA_1:
      nodeAlgorithm = "sha1";
      break;
    case DIGEST_ALGORITHM.SHA_256:
      nodeAlgorithm = "sha256";
      break;
    case DIGEST_ALGORITHM.SHA_384:
      nodeAlgorithm = "sha384";
      break;
    case DIGEST_ALGORITHM.SHA_512:
      nodeAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported digest algorithm.");
  }

  return Array.from(crypto.createHash(nodeAlgorithm).update(data).digest(), toSignedByte);
}

function computeHmac(
  algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
  value: Uint8Array,
  key: Uint8Array,
): GoogleAppsScript.Byte[] {
  let nodeAlgorithm: string;
  switch (algorithm) {
    case MAC_ALGORITHM.HMAC_MD5:
      nodeAlgorithm = "md5";
      break;
    case MAC_ALGORITHM.HMAC_SHA_1:
      nodeAlgorithm = "sha1";
      break;
    case MAC_ALGORITHM.HMAC_SHA_256:
      nodeAlgorithm = "sha256";
      break;
    case MAC_ALGORITHM.HMAC_SHA_384:
      nodeAlgorithm = "sha384";
      break;
    case MAC_ALGORITHM.HMAC_SHA_512:
      nodeAlgorithm = "sha512";
      break;
    default:
      throw new Error("Unsupported MAC algorithm.");
  }

  return Array.from(crypto.createHmac(nodeAlgorithm, key).update(value).digest(), toSignedByte);
}

function signRsa(
  algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
  value: Uint8Array,
  key: string,
): GoogleAppsScript.Byte[] {
  let nodeAlgorithm: string;
  switch (algorithm) {
    case RSA_ALGORITHM.RSA_SHA_1:
      nodeAlgorithm = "sha1";
      break;
    case RSA_ALGORITHM.RSA_SHA_256:
      nodeAlgorithm = "sha256";
      break;
    default:
      throw new Error("Unsupported RSA algorithm.");
  }

  // Google public documentation does not specify the RSA padding scheme.
  // Vegas uses RSASSA-PKCS1-v1_5 as its explicit local Runtime contract.
  return Array.from(
    crypto.sign(nodeAlgorithm, value, {
      key,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }),
    toSignedByte,
  );
}

// https://developers.google.com/apps-script/reference/utilities/utilities
// @types/google-apps-script models these values as ambient enums. Their concrete
// numeric values are Vegas-internal identities and are not compatibility promises.
export class Utilities {
  readonly Charset = CHARSET;
  readonly DigestAlgorithm = DIGEST_ALGORITHM;
  readonly MacAlgorithm = MAC_ALGORITHM;
  readonly RsaAlgorithm = RSA_ALGORITHM;

  base64Decode(encoded: string): GoogleAppsScript.Byte[];
  base64Decode(
    encoded: string,
    charset: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[];
  base64Decode(
    encoded: string,
    _charset?: GoogleAppsScript.Utilities.Charset,
  ): GoogleAppsScript.Byte[] {
    return decodeBase64(encoded, false);
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
    return decodeBase64(encoded, true);
  }

  base64Encode(data: GoogleAppsScript.Byte[]): string;
  base64Encode(data: string): string;
  base64Encode(data: string, charset: GoogleAppsScript.Utilities.Charset): string;
  base64Encode(
    data: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): string {
    const bytes = typeof data === "string" ? encodeString(data, charset) : encodeBytes(data);

    return encodeBase64(bytes, false);
  }

  base64EncodeWebSafe(data: GoogleAppsScript.Byte[]): string;
  base64EncodeWebSafe(data: string): string;
  base64EncodeWebSafe(data: string, charset: GoogleAppsScript.Utilities.Charset): string;
  base64EncodeWebSafe(
    data: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ): string {
    const bytes = typeof data === "string" ? encodeString(data, charset) : encodeBytes(data);

    return encodeBase64(bytes, true);
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
    const bytes = typeof value === "string" ? encodeString(value, charset) : encodeBytes(value);

    return computeDigest(algorithm, bytes);
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
      typeof value === "string" ? encodeString(value, charset) : encodeBytes(value);
    const keyBytes = typeof key === "string" ? encodeString(key, charset) : encodeBytes(key);

    return computeHmac(MAC_ALGORITHM.HMAC_SHA_256, valueBytes, keyBytes);
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
      typeof value === "string" ? encodeString(value, charset) : encodeBytes(value);
    const keyBytes = typeof key === "string" ? encodeString(key, charset) : encodeBytes(key);

    return computeHmac(algorithm, valueBytes, keyBytes);
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
    return signRsa(RSA_ALGORITHM.RSA_SHA_1, encodeString(value, charset), key);
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
    return signRsa(RSA_ALGORITHM.RSA_SHA_256, encodeString(value, charset), key);
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
    return signRsa(algorithm, encodeString(value, charset), key);
  }

  getUuid(): string {
    return crypto.randomUUID();
  }

  sleep(milliseconds: GoogleAppsScript.Integer): void {
    if (milliseconds > MAX_SLEEP_MILLISECONDS) {
      throw new RangeError("Sleep duration exceeds 300000 milliseconds.");
    }

    Atomics.wait(SLEEP_ARRAY, 0, 0, milliseconds);
  }
}

export function createUtilities(): Utilities {
  return new Utilities();
}
