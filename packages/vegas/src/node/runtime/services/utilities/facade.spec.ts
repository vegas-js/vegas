import { expect, test } from "vitest";

import { createUtilities } from "./facade";

test("creates GAS-compatible Utilities facade", () => {
  const utilities = createUtilities() as any;

  expect(Object.getPrototypeOf(utilities)).toBe(Object.prototype);
  expect(String(utilities)).toBe("Utilities");

  expect(Object.getOwnPropertyNames(utilities).sort()).toEqual(
    [
      "Charset",
      "DigestAlgorithm",
      "MacAlgorithm",
      "RsaAlgorithm",
      "base64Decode",
      "base64DecodeWebSafe",
      "base64Encode",
      "base64EncodeWebSafe",
      "computeDigest",
      "computeHmacSha256Signature",
      "computeHmacSignature",
      "computeRsaSha1Signature",
      "computeRsaSha256Signature",
      "computeRsaSignature",
      "formatDate",
      "formatString",
      "getUuid",
      "gzip",
      "jsonParse",
      "jsonStringify",
      "newBlob",
      "parseCsv",
      "parseDate",
      "sleep",
      "sleepAndThrow",
      "toString",
      "ungzip",
      "unzip",
      "validateSleepTime",
      "zip",
    ].sort(),
  );

  expect(Object.getOwnPropertyDescriptor(utilities, "Charset")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(utilities, "DigestAlgorithm")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(utilities, "MacAlgorithm")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(utilities, "RsaAlgorithm")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(utilities, "formatString")?.writable).toBe(false);

  expect(utilities.Charset).toBe(utilities.Charset.US_ASCII);
  expect(utilities.DigestAlgorithm).toBe(utilities.DigestAlgorithm.SHA_512);
  expect(utilities.MacAlgorithm).toBe(utilities.MacAlgorithm.HMAC_SHA_512);
  expect(utilities.RsaAlgorithm).toBe(utilities.RsaAlgorithm.RSA_SHA_256);

  expect(utilities.Charset.US_ASCII.ordinal()).toBe(0);
  expect(utilities.Charset.UTF_8.ordinal()).toBe(1);

  expect(utilities.DigestAlgorithm.MD2.ordinal()).toBe(0);
  expect(utilities.DigestAlgorithm.SHA_512.ordinal()).toBe(5);

  expect(utilities.MacAlgorithm.HMAC_MD5.ordinal()).toBe(0);
  expect(utilities.MacAlgorithm.HMAC_SHA_512.ordinal()).toBe(4);

  expect(utilities.RsaAlgorithm.RSA_SHA_1.ordinal()).toBe(0);
  expect(utilities.RsaAlgorithm.RSA_SHA_256.ordinal()).toBe(1);

  expect(utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "hello")).toHaveLength(32);
});
