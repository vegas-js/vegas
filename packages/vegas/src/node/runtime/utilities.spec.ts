import { describe, expect, test } from "vitest";

import { createUtilities, Utilities } from "./utilities";

function expectDistinctNumericValues(values: Readonly<Record<string, number>>): void {
  const identities = Object.values(values);

  expect(identities.every((value) => typeof value === "number")).toBe(true);
  expect(new Set(identities).size).toBe(identities.length);
}

describe("Utilities", () => {
  test("expose Google Apps Script utility enums as named numeric identities", () => {
    const utilities = createUtilities();

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
});
