// https://developers.google.com/apps-script/reference/utilities/utilities
export class GASUtilities implements GoogleAppsScript.Utilities.Utilities {
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
  MacAlgorithm = {
    HMAC_MD5: 0,
    HMAC_SHA_1: 1,
    HMAC_SHA_256: 2,
    HMAC_SHA_384: 3,
    HMAC_SHA_512: 4,
  };
  RsaAlgorithm = {
    RSA_SHA_1: 0,
    RSA_SHA_256: 1,
  };

  base64Decode = (encoded: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  base64DecodeWebSafe = (encoded: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  base64Encode = (data: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  base64EncodeWebSafe = (data: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeDigest = (algorithm: unknown, value: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeHmacSha256Signature = (value: unknown, key: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeHmacSignature = (algorithm: unknown, value: unknown, key: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeRsaSha1Signature = (value: unknown, key: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeRsaSha256Signature = (value: unknown, key: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  computeRsaSignature = (algorithm: unknown, value: unknown, key: unknown, charset?: unknown) => {
    throw new Error("Method not implemented.");
  };
  formatDate = (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  formatString = (template: string, ...args: any[]) => {
    throw new Error("Method not implemented.");
  };
  getUuid = () => {
    throw new Error("Method not implemented.");
  };
  gzip = (blob: unknown, name?: unknown) => {
    throw new Error("Method not implemented.");
  };
  newBlob = (data: unknown, contentType?: unknown, name?: unknown) => {
    throw new Error("Method not implemented.");
  };
  parseCsv = (csv: unknown, delimiter?: unknown) => {
    throw new Error("Method not implemented.");
  };
  parseDate = (date: string, timeZone: string, format: string) => {
    throw new Error("Method not implemented.");
  };
  sleep = (milliseconds: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
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
