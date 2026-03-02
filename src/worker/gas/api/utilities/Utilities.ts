import crypto from "node:crypto";
import util from "node:util";

import { Blob } from "../base/Blob";
import { MD2Hash } from "./md2hash";

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
  };

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
    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const buffer = typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data);
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

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const buffer = typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
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

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const bufferValue =
      typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
    const bufferKey = typeof key === "string" ? Buffer.from(key, encoding) : Buffer.from(key);
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

    const encoding = (charset && charset === 0 ? "ascii" : "utf8") as BufferEncoding;
    const bufferValue =
      typeof value === "string" ? Buffer.from(value, encoding) : Buffer.from(value);
    const bufferKey = typeof key === "string" ? Buffer.from(key, encoding) : Buffer.from(key);
    const result = Array.from(new Int8Array(crypto.sign(algo, bufferValue, bufferKey)));

    return result;
  };
  formatDate = (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  formatString = (template: string, ...args: any[]) => {
    throw new Error("Method not implemented.");
  };
  getUuid = () => {
    return crypto.randomUUID();
  };
  gzip = (blob: unknown, name?: unknown) => {
    throw new Error("Method not implemented.");
  };
  newBlob = (data: GoogleAppsScript.Byte[] | string, contentType?: string, name?: string) => {
    const blob = new Blob(name);
    if (typeof data === "string") {
      blob.setDataFromString(data);
    } else {
      blob.setBytes(data);
    }
    blob.setContentType(contentType ?? null);

    return blob;
  };
  parseCsv = (csv: string, delimiter: GoogleAppsScript.Char = ",") => {
    if (delimiter.length !== 1) {
      throw new Error(`Cannot convert ${delimiter} to char.`);
    }
    return csv.split("\n").map((dim1) => dim1.split(delimiter));
  };
  parseDate = (date: string, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  sleep = (milliseconds: GoogleAppsScript.Integer) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const arrayBuffer = new Int32Array(sharedBuffer);
    const delayMs = Math.min(milliseconds, 300000);
    Atomics.wait(arrayBuffer, 0, 0, delayMs);
  };
  ungzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    throw new Error("Method not implemented.");
  };
  unzip = (blob: GoogleAppsScript.Base.BlobSource) => {
    throw new Error("Method not implemented.");
  };
  zip = (blobs: unknown, name?: unknown) => {
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
