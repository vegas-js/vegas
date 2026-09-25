import crypto from "node:crypto";

import { describe, expect, test } from "vitest";

import { createNodeUtilities } from "./node";

type UtilitiesContract = Pick<
  GoogleAppsScript.Utilities.Utilities,
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
  | "formatDate"
  | "formatString"
  | "getUuid"
  | "gzip"
  | "jsonParse"
  | "jsonStringify"
  | "newBlob"
  | "parseCsv"
  | "parseDate"
  | "sleep"
  | "ungzip"
  | "unzip"
  | "zip"
>;

// Public contract:
// https://developers.google.com/apps-script/reference/utilities/utilities
describe("Utilities public contract", () => {
  test("encode, decode, digest, and authenticate documented byte and string values", () => {
    const utilities = createNodeUtilities();
    const contract: UtilitiesContract = utilities;

    expect(contract).toBe(utilities);
    expect(utilities.base64Encode([-5, -1])).toBe("+/8=");
    expect(utilities.base64Decode("+/8=")).toStrictEqual([-5, -1]);
    expect(utilities.base64EncodeWebSafe([-5, -1])).toBe("-_8=");
    expect(utilities.base64DecodeWebSafe("-_8=")).toStrictEqual([-5, -1]);
    expect(utilities.base64Encode("Google グループ", utilities.Charset.UTF_8)).toBe(
      "R29vZ2xlIOOCsOODq+ODvOODlw==",
    );

    const digest = utilities.computeDigest(utilities.DigestAlgorithm.SHA_256, "abc");

    expect(Buffer.from(digest).toString("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const hmac = utilities.computeHmacSignature(
      utilities.MacAlgorithm.HMAC_SHA_256,
      "what do ya want for nothing?",
      "Jefe",
    );

    expect(
      utilities.computeHmacSha256Signature("what do ya want for nothing?", "Jefe"),
    ).toStrictEqual(hmac);
    expect(Buffer.from(hmac).toString("hex")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  test("sign values through each documented RSA entry point", () => {
    const utilities = createNodeUtilities();
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 1024,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const signatures = [
      utilities.computeRsaSha1Signature("Vegas", privateKey),
      utilities.computeRsaSha256Signature("Vegas", privateKey),
      utilities.computeRsaSignature(utilities.RsaAlgorithm.RSA_SHA_256, "Vegas", privateKey),
    ];

    for (const signature of signatures) {
      expect(signature.length).toBeGreaterThan(0);
      expect(signature.every((byte) => byte >= -128 && byte <= 127)).toBe(true);
    }
  });

  test("format and parse the documented string, date, CSV, JSON, and UUID surfaces", () => {
    const utilities = createNodeUtilities();

    expect(utilities.formatDate(new Date(0), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")).toBe(
      "1970-01-01T00:00:00Z",
    );
    expect(utilities.formatString("%11.6f", 123.456)).toBe(" 123.456000");
    expect(utilities.getUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    const json = '{"name":"John Smith","company":"Virginia Company"}';
    const value = { name: "John Smith", company: "Virginia Company" };

    expect(utilities.jsonParse(json)).toStrictEqual(value);
    expect(utilities.jsonStringify(value)).toBe(json);
    expect(utilities.parseCsv("a,b,c\nd,e,f")).toStrictEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
    expect(
      utilities.parseDate("1970-01-01 00:00:00", "GMT", "yyyy-MM-dd' 'HH:mm:ss").getTime(),
    ).toBe(0);
  });

  test("create, gzip, ungzip, zip, and unzip documented Blob values", () => {
    const utilities = createNodeUtilities();
    const source = utilities.newBlob("Vegas", "text/plain", "text.txt");

    expect(source.getDataAsString()).toBe("Vegas");
    expect(source.getContentType()).toBe("text/plain");
    expect(source.getName()).toBe("text.txt");

    const gzip = utilities.gzip(source, "text.gz");

    expect(gzip.getName()).toBe("text.gz");
    expect(utilities.ungzip(gzip).getDataAsString()).toBe("Vegas");

    const archive = utilities.zip(
      [source, utilities.newBlob("Two", "text/plain", "second.txt")],
      "bundle.zip",
    );

    expect(archive.getName()).toBe("bundle.zip");

    const components = utilities
      .unzip(archive)
      .map((blob) => ({ name: blob.getName(), data: blob.getDataAsString() }))
      .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""));

    expect(components).toStrictEqual([
      { name: "second.txt", data: "Two" },
      { name: "text.txt", data: "Vegas" },
    ]);
  });

  test("sleep within the documented limit and reject values above it", () => {
    const utilities = createNodeUtilities();

    expect(utilities.sleep(0)).toBeUndefined();
    expect(() => utilities.sleep(300_001)).toThrow(RangeError);
  });
});
