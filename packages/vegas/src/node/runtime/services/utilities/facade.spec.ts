import vm from "node:vm";

import { expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
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

test("returns Blob facades from newBlob", () => {
  const context = vm.createContext({});
  const createObject = createVmGasObjectFactory(context);
  const utilities = createUtilities(createObject) as any;

  const blobA = utilities.newBlob("vegas-reference", "text/plain", "reference.txt");

  const blobB = utilities.newBlob("vegas-reference", "text/plain", "reference.txt");

  context.blob = blobA;

  expect(vm.runInContext("Object.getPrototypeOf(blob) === Object.prototype", context)).toBe(true);

  expect(String(blobA)).toBe("Blob");
  expect(blobA).not.toBe(blobB);

  expect(Object.prototype.hasOwnProperty.call(blobA, "getBlob")).toBe(false);
});
