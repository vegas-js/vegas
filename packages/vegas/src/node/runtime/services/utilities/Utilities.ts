import crypto from "node:crypto";
import zlib from "node:zlib";

import { Blob } from "../base/Blob";
import { formatDate as formatGasDate } from "./formatDate";
import { createGasException } from "./gasException";
import { MD2Hash } from "./md2hash";
import { parseCsv as parseGasCsv } from "./parseCsv";

// https://developers.google.com/apps-script/reference/utilities/utilities
export class Utilities implements GoogleAppsScript.Utilities.Utilities {
  Charset = {
    US_ASCII: 0,
    UTF_8: 1,
  };
  DigestAlgorithm = {
    MD2: 0,
    MD5: 1,
    SHA_1: 2,
    SHA_256: 3,
    SHA_384: 4,
    SHA_512: 5,
  };
  #DigestAlgorithmMap = {
    [this.DigestAlgorithm.MD2]: "md2",
    [this.DigestAlgorithm.MD5]: "md5",
    [this.DigestAlgorithm.SHA_1]: "sha1",
    [this.DigestAlgorithm.SHA_256]: "sha256",
    [this.DigestAlgorithm.SHA_384]: "sha384",
    [this.DigestAlgorithm.SHA_512]: "sha512",
  } as const;
  MacAlgorithm = {
    HMAC_MD5: 0,
    HMAC_SHA_1: 1,
    HMAC_SHA_256: 2,
    HMAC_SHA_384: 3,
    HMAC_SHA_512: 4,
  };
  #MacAlgorithmMap = {
    [this.MacAlgorithm.HMAC_MD5]: "md5",
    [this.MacAlgorithm.HMAC_SHA_1]: "sha1",
    [this.MacAlgorithm.HMAC_SHA_256]: "sha256",
    [this.MacAlgorithm.HMAC_SHA_384]: "sha384",
    [this.MacAlgorithm.HMAC_SHA_512]: "sha512",
  } as const;
  RsaAlgorithm = {
    RSA_SHA_1: 0,
    RSA_SHA_256: 1,
  };
  #RsaAlgorithmMap = {
    [this.RsaAlgorithm.RSA_SHA_1]: "sha1",
    [this.RsaAlgorithm.RSA_SHA_256]: "sha256",
  } as const;

  #encodeString(
    value: string,
    charset: GoogleAppsScript.Utilities.Charset | undefined,
    defaultCharset: "utf8" | "us-ascii",
  ): Buffer {
    const useUsAscii =
      charset === this.Charset.US_ASCII || (charset === undefined && defaultCharset === "us-ascii");

    if (!useUsAscii) {
      return Buffer.from(value, "utf8");
    }

    return Buffer.from(
      Array.from(value, (character) => {
        const codePoint = character.codePointAt(0) ?? 0;

        return codePoint <= 0x7f ? codePoint : 0x3f;
      }),
    );
  }

  // oxlint-disable-next-line no-unused-vars
  base64Decode = (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
    return Array.from(new Int8Array(Buffer.from(encoded, "base64")));
  };
  base64DecodeWebSafe = (encoded: string, charset?: GoogleAppsScript.Utilities.Charset) => {
    return this.base64Decode(encoded, charset);
  };
  base64Encode = (
    data: string | GoogleAppsScript.Byte[],
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    const buffer =
      typeof data === "string" ? this.#encodeString(data, charset, "us-ascii") : Buffer.from(data);

    return buffer.toString("base64");
  };
  base64EncodeWebSafe = (
    data: string | GoogleAppsScript.Byte[],
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.base64Encode(data, charset).replaceAll("+", "-").replaceAll("/", "_");
  };
  computeDigest = (
    algorithm: GoogleAppsScript.Utilities.DigestAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#DigestAlgorithmMap[algorithm];

    const buffer =
      typeof value === "string" ? this.#encodeString(value, charset, "utf8") : Buffer.from(value);

    const hash = algo === "md2" ? new MD2Hash() : crypto.createHash(algo);
    hash.update(buffer);
    const result = Array.from(new Int8Array(hash.digest()));

    return result;
  };
  computeHmacSha256Signature = (
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeHmacSignature(this.MacAlgorithm.HMAC_SHA_256, value, key, charset);
  };
  computeHmacSignature = (
    algorithm: GoogleAppsScript.Utilities.MacAlgorithm,
    value: GoogleAppsScript.Byte[] | string,
    key: GoogleAppsScript.Byte[] | string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#MacAlgorithmMap[algorithm];

    const bufferValue =
      typeof value === "string"
        ? this.#encodeString(value, charset, "us-ascii")
        : Buffer.from(value);

    const bufferKey =
      typeof key === "string" ? this.#encodeString(key, charset, "us-ascii") : Buffer.from(key);
    const hmac = crypto.createHmac(algo, bufferKey);
    hmac.update(bufferValue);
    const result = Array.from(new Int8Array(hmac.digest()));

    return result;
  };
  computeRsaSha1Signature = (
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeRsaSignature(this.RsaAlgorithm.RSA_SHA_1, value, key, charset);
  };
  computeRsaSha256Signature = (
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    return this.computeRsaSignature(this.RsaAlgorithm.RSA_SHA_256, value, key, charset);
  };
  computeRsaSignature = (
    algorithm: GoogleAppsScript.Utilities.RsaAlgorithm,
    value: string,
    key: string,
    charset?: GoogleAppsScript.Utilities.Charset,
  ) => {
    let algo = this.#RsaAlgorithmMap[algorithm];

    const bufferValue = this.#encodeString(value, charset, "us-ascii");

    const bufferKey = this.#encodeString(key, charset, "us-ascii");

    const result = Array.from(new Int8Array(crypto.sign(algo, bufferValue, bufferKey)));

    return result;
  };
  formatDate = (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) => {
    return formatGasDate(date, timeZone, format);
  };
  formatString = (template: string, ...args: any[]) => {
    // https://docs.oracle.com/javase/7/docs/api/java/util/Formatter.html#syntax
    throw new Error("Method not implemented.");
  };
  getUuid = () => {
    return crypto.randomUUID();
  };
  gzip = (blob: GoogleAppsScript.Base.BlobSource, name?: string) => {
    const source = blob.getBlob();

    const buffer = zlib.gzipSync(Buffer.from(source.getBytes()));

    return new Blob(name ?? "archive.gz")
      .setBytes(Array.from(buffer))
      .setContentType("application/x-gzip");
  };
  newBlob = (data: GoogleAppsScript.Byte[] | string, contentType?: string, name?: string) => {
    const blob = new Blob(name ?? null);

    if (typeof data === "string") {
      blob.setDataFromString(data);
    } else {
      blob.setBytes(data);
    }

    blob.setContentType(contentType ?? (typeof data === "string" ? "text/plain" : null));

    return blob;
  };
  parseCsv = (csv: string, delimiter: GoogleAppsScript.Char = ",") => {
    return parseGasCsv(csv, delimiter);
  };
  parseDate = (date: string, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  sleep = (milliseconds: GoogleAppsScript.Integer): void => {
    if (milliseconds < 0) {
      throw createGasException("Invalid argument");
    }

    const sharedBuffer = new SharedArrayBuffer(4);

    const arrayBuffer = new Int32Array(sharedBuffer);

    const delayMs = Math.min(milliseconds, 300000);

    Atomics.wait(arrayBuffer, 0, 0, delayMs);

    return null as unknown as void;
  };
  ungzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    const source = blob.getBlob();

    const buffer = zlib.gunzipSync(Buffer.from(source.getBytes()));

    const sourceName = source.getName() as string | null;

    const name =
      sourceName !== null && sourceName.toLowerCase().endsWith(".gz")
        ? sourceName.slice(0, -3)
        : sourceName;

    return new Blob(name).setBytes(Array.from(buffer)).setContentType(null);
  };
  unzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    throw new Error("Method not implemented.");
  };
  zip = (blobs: GoogleAppsScript.Base.BlobSource[], name?: string) => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  jsonParse = (jsonString: string) => {
    throw new Error("Utilities#jsonParse() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  jsonStringify = (obj: any) => {
    throw new Error("Utilities#jsonStringify() is deprecated. Do not use.");
  };
}
