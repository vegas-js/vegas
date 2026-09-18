import crypto from "node:crypto";

import { describe, expect, test } from "vitest";

import { createNodeUtilities } from "./node";
import { Utilities } from "./utilities";

type UtilitiesContract = Pick<
  GoogleAppsScript.Utilities.Utilities,
  | "Charset"
  | "DigestAlgorithm"
  | "MacAlgorithm"
  | "RsaAlgorithm"
  | "base64Decode"
  | "base64DecodeWebSafe"
  | "base64Encode"
  | "base64EncodeWebSafe"
  | "computeDigest"
  | "computeHmacSha256Signature"
  | "computeHmacSignature"
  | "computeRsaSha1Signature"
  | "computeRsaSha256Signature"
  | "computeRsaSignature"
  | "getUuid"
  | "sleep"
>;

function expectDistinctNumericValues(values: Readonly<Record<string, number>>): void {
  const identities = Object.values(values);

  expect(identities.every((value) => typeof value === "number")).toBe(true);
  expect(new Set(identities).size).toBe(identities.length);
}

describe("Utilities", () => {
  test("expose Google Apps Script utility enums as named numeric identities", () => {
    const utilities = createNodeUtilities();

    const contract: UtilitiesContract = utilities;

    expect(contract).toBe(utilities);
    expect(utilities).toBeInstanceOf(Utilities);
    expect(Object.keys(utilities.Charset)).toStrictEqual(["US_ASCII", "UTF_8"]);
    expect(Object.keys(utilities.DigestAlgorithm)).toStrictEqual([
      "MD2",
      "MD5",
      "SHA_1",
      "SHA_256",
      "SHA_384",
      "SHA_512",
    ]);
    expect(Object.keys(utilities.MacAlgorithm)).toStrictEqual([
      "HMAC_MD5",
      "HMAC_SHA_1",
      "HMAC_SHA_256",
      "HMAC_SHA_384",
      "HMAC_SHA_512",
    ]);
    expect(Object.keys(utilities.RsaAlgorithm)).toStrictEqual(["RSA_SHA_1", "RSA_SHA_256"]);

    expectDistinctNumericValues(utilities.Charset);
    expectDistinctNumericValues(utilities.DigestAlgorithm);
    expectDistinctNumericValues(utilities.MacAlgorithm);
    expectDistinctNumericValues(utilities.RsaAlgorithm);
  });

  test("decode standard and web-safe Base64 into signed bytes", () => {
    const utilities = createNodeUtilities();
    const expected = [
      71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
      -105,
    ];

    expect(utilities.base64Decode("R29vZ2xlIOOCsOODq+ODvOODlw==")).toStrictEqual(expected);
    expect(
      utilities.base64Decode("R29vZ2xlIOOCsOODq+ODvOODlw==", utilities.Charset.UTF_8),
    ).toStrictEqual(expected);
    expect(utilities.base64DecodeWebSafe("R29vZ2xlIOOCsOODq-ODvOODlw==")).toStrictEqual(expected);
    expect(
      utilities.base64DecodeWebSafe("R29vZ2xlIOOCsOODq-ODvOODlw==", utilities.Charset.UTF_8),
    ).toStrictEqual(expected);
  });

  test("encode byte arrays with standard and web-safe Base64 alphabets", () => {
    const utilities = createNodeUtilities();
    const bytes = [-5, -1];

    expect(utilities.base64Encode(bytes)).toBe("+/8=");
    expect(utilities.base64EncodeWebSafe(bytes)).toBe("-_8=");
  });

  test("encode strings with default and explicit charsets", () => {
    const utilities = createNodeUtilities();

    expect(utilities.base64Encode("A string here")).toBe("QSBzdHJpbmcgaGVyZQ==");
    expect(utilities.base64Encode("A string here", utilities.Charset.US_ASCII)).toBe(
      "QSBzdHJpbmcgaGVyZQ==",
    );
    expect(utilities.base64Encode("Google グループ", utilities.Charset.UTF_8)).toBe(
      "R29vZ2xlIOOCsOODq+ODvOODlw==",
    );
    expect(utilities.base64EncodeWebSafe("Google グループ", utilities.Charset.UTF_8)).toBe(
      "R29vZ2xlIOOCsOODq-ODvOODlw==",
    );
  });

  test("compute supported message digests", () => {
    const utilities = createNodeUtilities();
    const vectors = [
      [utilities.DigestAlgorithm.MD2, "da853b0d3f88d99b30283a69e6ded6bb"],
      [utilities.DigestAlgorithm.MD5, "900150983cd24fb0d6963f7d28e17f72"],
      [utilities.DigestAlgorithm.SHA_1, "a9993e364706816aba3e25717850c26c9cd0d89d"],
      [
        utilities.DigestAlgorithm.SHA_256,
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      ],
      [
        utilities.DigestAlgorithm.SHA_384,
        "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
      ],
      [
        utilities.DigestAlgorithm.SHA_512,
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
      ],
    ] as const;

    for (const [algorithm, expected] of vectors) {
      const digest = utilities.computeDigest(algorithm, "abc");
      const hex = Buffer.from(digest).toString("hex");

      expect(hex).toBe(expected);
      expect(digest.every((value) => value >= -128 && value <= 127)).toBe(true);
    }
  });

  test("compute digest from byte arrays and explicit charsets", () => {
    const utilities = createNodeUtilities();
    const expected = utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "abc");

    expect(utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, [97, 98, 99])).toStrictEqual(
      expected,
    );
    expect(
      utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "abc", utilities.Charset.US_ASCII),
    ).toStrictEqual(expected);
  });

  test("compute supported HMAC signatures from public RFC vectors", () => {
    const utilities = createNodeUtilities();
    const value = "what do ya want for nothing?";
    const key = "Jefe";
    const vectors = [
      [utilities.MacAlgorithm.HMAC_MD5, "750c783e6ab0b503eaa86e310a5db738"],
      [utilities.MacAlgorithm.HMAC_SHA_1, "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79"],
      [
        utilities.MacAlgorithm.HMAC_SHA_256,
        "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
      ],
      [
        utilities.MacAlgorithm.HMAC_SHA_384,
        "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
      ],
      [
        utilities.MacAlgorithm.HMAC_SHA_512,
        "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
      ],
    ] as const;

    for (const [algorithm, expected] of vectors) {
      const signature = utilities.computeHmacSignature(algorithm, value, key);

      expect(Buffer.from(signature).toString("hex")).toBe(expected);
      expect(signature.every((byte) => byte >= -128 && byte <= 127)).toBe(true);
    }
  });

  test("compute HMAC-SHA256 from byte arrays and explicit charsets", () => {
    const utilities = createNodeUtilities();
    const value = "what do ya want for nothing?";
    const key = "Jefe";
    const expected = utilities.computeHmacSignature(
      utilities.MacAlgorithm.HMAC_SHA_256,
      value,
      key,
    );

    expect(utilities.computeHmacSha256Signature(value, key)).toStrictEqual(expected);
    expect(
      utilities.computeHmacSha256Signature(value, key, utilities.Charset.US_ASCII),
    ).toStrictEqual(expected);

    const byteSignature = utilities.computeHmacSha256Signature(
      [...Buffer.from("Hi There")],
      Array.from({ length: 20 }, () => 0x0b),
    );
    expect(Buffer.from(byteSignature).toString("hex")).toBe(
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    );
  });

  test("generate a version 4 UUID string", () => {
    const utilities = createNodeUtilities();

    expect(utilities.getUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("sleep synchronously and reject durations above the documented maximum", () => {
    const utilities = createNodeUtilities();
    const startedAt = performance.now();

    expect(utilities.sleep(10)).toBeUndefined();
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(8);
    expect(() => utilities.sleep(300_001)).toThrow();
  });

  test("sign RSA values with the Vegas PKCS#1 v1.5 Runtime contract", () => {
    const utilities = createNodeUtilities();
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 1024,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const value = "Vegas RSA signature";
    const vectors = [
      [utilities.RsaAlgorithm.RSA_SHA_1, "sha1"],
      [utilities.RsaAlgorithm.RSA_SHA_256, "sha256"],
    ] as const;

    for (const [algorithm, nodeAlgorithm] of vectors) {
      const signature = utilities.computeRsaSignature(algorithm, value, privateKey);

      expect(signature.every((byte) => byte >= -128 && byte <= 127)).toBe(true);
      expect(
        crypto.verify(
          nodeAlgorithm,
          Buffer.from(value),
          { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
          Buffer.from(signature),
        ),
      ).toBe(true);
    }

    expect(utilities.computeRsaSha1Signature(value, privateKey)).toStrictEqual(
      utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_1, value, privateKey),
    );
    expect(utilities.computeRsaSha256Signature(value, privateKey)).toStrictEqual(
      utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_256, value, privateKey),
    );
    expect(
      utilities.computeRsaSha256Signature(value, privateKey, utilities.Charset.US_ASCII),
    ).toStrictEqual(
      utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_256, value, privateKey),
    );
  });
});
