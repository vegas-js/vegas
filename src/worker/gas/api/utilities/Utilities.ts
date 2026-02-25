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

    base64Decode: function (encoded: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    base64DecodeWebSafe: function (encoded: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    base64Encode: function (data: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    base64EncodeWebSafe: function (data: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    computeDigest: function (algorithm: unknown, value: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    computeHmacSha256Signature: function (value: unknown, key: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    computeHmacSignature: function (
      algorithm: unknown,
      value: unknown,
      key: unknown,
      charset?: unknown,
    ) {
      throw new Error("Method not implemented.");
    },
    computeRsaSha1Signature: function (value: unknown, key: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    computeRsaSha256Signature: function (value: unknown, key: unknown, charset?: unknown) {
      throw new Error("Method not implemented.");
    },
    computeRsaSignature: function (
      algorithm: unknown,
      value: unknown,
      key: unknown,
      charset?: unknown,
    ) {
      throw new Error("Method not implemented.");
    },
    formatDate: function (date: GoogleAppsScript.Base.Date, timeZone: string, format: string) {
      throw new Error("Method not implemented.");
    },
    formatString: function (template: string, ...args: any[]) {
      throw new Error("Method not implemented.");
    },
    getUuid: function () {
      throw new Error("Method not implemented.");
    },
    gzip: function (blob: unknown, name?: unknown) {
      throw new Error("Method not implemented.");
    },
    newBlob: function (data: unknown, contentType?: unknown, name?: unknown) {
      throw new Error("Method not implemented.");
    },
    parseCsv: function (csv: unknown, delimiter?: unknown) {
      throw new Error("Method not implemented.");
    },
    parseDate: function (date: string, timeZone: string, format: string) {
      throw new Error("Method not implemented.");
    },
    sleep: function (milliseconds: GoogleAppsScript.Integer) {
      throw new Error("Method not implemented.");
    },
    ungzip: function (blob: GoogleAppsScript.Base.BlobSource) {
      throw new Error("Method not implemented.");
    },
    unzip: function (blob: GoogleAppsScript.Base.BlobSource) {
      throw new Error("Method not implemented.");
    },
    zip: function (blobs: unknown, name?: unknown) {
      throw new Error("Method not implemented.");
    },
    /** @deprecated DO NOT USE */
    // oxlint-disable-next-line no-unused-vars
    jsonParse: function (jsonString: string) {
      throw new Error("Utilities#jsonParse() is deprecated. Do not use.");
    },
    /** @deprecated DO NOT USE */
    // oxlint-disable-next-line no-unused-vars
    jsonStringify: function (obj: any) {
      throw new Error("Utilities#jsonStringify() is deprecated. Do not use.");
    },
  };
}
