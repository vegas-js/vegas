import { describe, expect, test } from "vitest";

import { createUtilities, Utilities } from "./utilities";

type UtilitiesContract = Pick<
  GoogleAppsScript.Utilities.Utilities,
  | "Charset"
  | "DigestAlgorithm"
  | "base64Decode"
  | "base64DecodeWebSafe"
  | "base64Encode"
  | "base64EncodeWebSafe"
  | "computeDigest"
>;

function expectDistinctNumericValues(values: Readonly<Record<string, number>>): void {
  const identities = Object.values(values);

  expect(identities.every((value) => typeof value === "number")).toBe(true);
  expect(new Set(identities).size).toBe(identities.length);
}

describe("Utilities", () => {
  test("expose Google Apps Script utility enums as named numeric identities", () => {
    const utilities = createUtilities();

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
    const utilities = createUtilities();
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
    const utilities = createUtilities();
    const bytes = [-5, -1];

    expect(utilities.base64Encode(bytes)).toBe("+/8=");
    expect(utilities.base64EncodeWebSafe(bytes)).toBe("-_8=");
  });

  test("encode strings with default and explicit charsets", () => {
    const utilities = createUtilities();

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
    const utilities = createUtilities();
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
    const utilities = createUtilities();
    const expected = utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "abc");

    expect(utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, [97, 98, 99])).toStrictEqual(
      expected,
    );
    expect(
      utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "abc", utilities.Charset.US_ASCII),
    ).toStrictEqual(expected);
  });
});
