import { createHash, randomUUID } from "node:crypto";

// https://developers.google.com/apps-script/reference/utilities/utilities
export function Utilities(): GoogleAppsScript.Utilities.Utilities {
  return {
    Charset: {
      US_ASCII: 0,
      UTF_8: 1,
    },
    DigestAlgorithm: {
      MD2: 0,
      MD5: 1,
      SHA_1: 2,
      SHA_256: 3,
      SHA_384: 4,
      SHA_512: 5,
    },
    MacAlgorithm: {
      HMAC_MD5: 0,
      HMAC_SHA_1: 1,
      HMAC_SHA_256: 2,
      HMAC_SHA_384: 3,
      HMAC_SHA_512: 4,
    },
    RsaAlgorithm: {
      RSA_SHA_1: 0,
      RSA_SHA_256: 1,
    },

    // oxlint-disable-next-line no-unused-vars
    base64Decode: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
      return Array.from(new Int8Array(Buffer.from(encoded, "base64")));
    },
    // oxlint-disable-next-line no-unused-vars
    base64DecodeWebSafe: (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
      return Array.from(new Int8Array(Buffer.from(encoded, "base64")));
    },
    base64Encode: (
      data: string | GoogleAppsScript.Byte[],
      charset?: GoogleAppsScript.Utilities.Charset,
    ) => {
      const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
      const buffer = typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data);
      return buffer.toString("base64");
    },
    base64EncodeWebSafe: (
      data: string | GoogleAppsScript.Byte[],
      charset?: GoogleAppsScript.Utilities.Charset,
    ) => {
      const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
      const buffer = typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data);
      const encoded = buffer.toString("base64");
      return encoded.replaceAll("+", "-").replaceAll("/", "_");
    },
    computeDigest: (
      algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
      value: GoogleAppsScript.Byte[] | string,
      charset?: GoogleAppsScript.Utilities.Charset,
    ) => {
      const hash = createHash("md5");
      const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
      const buffer = typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
      hash.update(buffer);
      return Array.from(new Int8Array(hash.digest()));
    },
    computeHmacSha256Signature: (value: unknown, key: unknown, charset?: unknown) => {
      throw new Error("Method not implemented.");
    },
    computeHmacSignature: (algorithm: unknown, value: unknown, key: unknown, charset?: unknown) => {
      throw new Error("Method not implemented.");
    },
    computeRsaSha1Signature: (value: unknown, key: unknown, charset?: unknown) => {
      throw new Error("Method not implemented.");
    },
    computeRsaSha256Signature: (value: unknown, key: unknown, charset?: unknown) => {
      throw new Error("Method not implemented.");
    },
    computeRsaSignature: (algorithm: unknown, value: unknown, key: unknown, charset?: unknown) => {
      throw new Error("Method not implemented.");
    },
    formatDate: (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) => {
      throw new Error("Method not implemented.");
    },
    formatString: (template: string, ...args: object[]) => {
      throw new Error("Method not implemented.");
    },
    getUuid: () => {
      return randomUUID();
    },
    gzip: (blob: unknown, name?: unknown) => {
      throw new Error("Method not implemented.");
    },
    newBlob: (data: unknown, contentType?: unknown, name?: unknown) => {
      throw new Error("Method not implemented.");
    },
    parseCsv: (csv: string, delimiter: GoogleAppsScript.Char = ",") => {
      if (delimiter.length !== 1) {
        throw new Error(`Cannot convert ${delimiter} to char.`);
      }
      return csv.split("\n").map((dim1) => dim1.split(delimiter));
    },
    parseDate: (date: string, timeZone: string, format: string) => {
      throw new Error("Method not implemented.");
    },
    sleep: (milliseconds: GoogleAppsScript.Integer) => {
      const sharedBuffer = new SharedArrayBuffer(4);
      const arrayBuffer = new Int32Array(sharedBuffer);
      const delayMs = Math.min(milliseconds, 300000);
      Atomics.wait(arrayBuffer, 0, 0, delayMs);
    },
    ungzip: (blob: GoogleAppsScript.Base.BlobSource) => {
      throw new Error("Method not implemented.");
    },
    unzip: (blob: GoogleAppsScript.Base.BlobSource) => {
      throw new Error("Method not implemented.");
    },
    zip: (blobs: unknown, name?: unknown) => {
      throw new Error("Method not implemented.");
    },
    /** @deprecated DO NOT USE */
    // oxlint-disable-next-line no-unused-vars
    jsonParse: (jsonString: string) => {
      throw new Error("Utilities#jsonParse() is deprecated. Do not use.");
    },
    /** @deprecated DO NOT USE */
    // oxlint-disable-next-line no-unused-vars
    jsonStringify: (obj: any) => {
      throw new Error("Utilities#jsonStringify() is deprecated. Do not use.");
    },
  };
}
