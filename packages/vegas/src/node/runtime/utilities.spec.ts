import { describe, expect, test } from "vitest";

import { createUtilities, Utilities } from "./utilities";

type Base64UtilitiesContract = Pick<
  GoogleAppsScript.Utilities.Utilities,
  "Charset" | "base64Decode" | "base64DecodeWebSafe" | "base64Encode" | "base64EncodeWebSafe"
>;

function expectDistinctNumericValues(values: Readonly<Record<string, number>>): void {
  const identities = Object.values(values);

  expect(identities.every((value) => typeof value === "number")).toBe(true);
  expect(new Set(identities).size).toBe(identities.length);
}

describe("Utilities", () => {
  test("expose Google Apps Script utility enums as named numeric identities", () => {
    const utilities = createUtilities();

    const contract: Base64UtilitiesContract = utilities;

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
});
