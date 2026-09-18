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
}

export function createUtilities(): Utilities {
  return new Utilities();
}
