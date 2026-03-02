import { describe, expect, test } from "vitest";

import { Utilities } from "./Utilities";

const uuidRegExp = /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/;
const deprecatedRegExp = / is deprecated\. Do not use\.$/;

describe("base64", () => {
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64decodeencoded
  test("decode", () => {
    const utilities = new Utilities();
    const decodedArray = [
      71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
      -105,
    ];
    const base64data = "R29vZ2xlIOOCsOODq+ODvOODlw==";
    const decoded = utilities.base64Decode(base64data);
    expect(decoded).toStrictEqual(decodedArray);
  });
  test("decode and stringify", () => {
    const utilities = new Utilities();
    const original = "Google グループ";
    const base64data = "R29vZ2xlIOOCsOODq+ODvOODlw==";
    const decoded = utilities.base64Decode(base64data);
    expect(utilities.newBlob(decoded).getDataAsString()).toBe(original);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64decodeencoded,-charset
  test("decode with charset", () => {
    const utilities = new Utilities();
    const decodedArray = [
      71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
      -105,
    ];
    const base64data = "R29vZ2xlIOOCsOODq+ODvOODlw==";
    const decoded = utilities.base64Decode(base64data, utilities.Charset.UTF_8);
    expect(decoded).toStrictEqual(decodedArray);
  });
  test("decode with charset and stringify", () => {
    const utilities = new Utilities();
    const original = "Google グループ";
    const base64data = "R29vZ2xlIOOCsOODq+ODvOODlw==";
    const decoded = utilities.base64Decode(base64data, utilities.Charset.UTF_8);
    expect(utilities.newBlob(decoded).getDataAsString()).toBe(original);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64decodewebsafeencoded
  test("decode websafe", () => {
    const utilities = new Utilities();
    const decodedArray = [
      71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
      -105,
    ];
    const base64data = "R29vZ2xlIOOCsOODq-ODvOODlw==";
    const decoded = utilities.base64DecodeWebSafe(base64data);
    expect(decoded).toStrictEqual(decodedArray);
  });
  test("decode websafe and stringify", () => {
    const utilities = new Utilities();
    const original = "Google グループ";
    const base64data = "R29vZ2xlIOOCsOODq-ODvOODlw==";
    const decoded = utilities.base64DecodeWebSafe(base64data);
    expect(utilities.newBlob(decoded).getDataAsString()).toBe(original);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64decodewebsafeencoded,-charset
  test("decode websafe with charset", () => {
    const utilities = new Utilities();
    const decodedArray = [
      71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
      -105,
    ];
    const base64data = "R29vZ2xlIOOCsOODq-ODvOODlw==";
    const decoded = utilities.base64DecodeWebSafe(base64data, utilities.Charset.UTF_8);
    expect(decoded).toStrictEqual(decodedArray);
  });
  test("decode websafe with charset and stringify", () => {
    const utilities = new Utilities();
    const original = "Google グループ";
    const base64data = "R29vZ2xlIOOCsOODq-ODvOODlw==";
    const decoded = utilities.base64DecodeWebSafe(base64data, utilities.Charset.UTF_8);
    expect(utilities.newBlob(decoded).getDataAsString()).toBe(original);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodedata
  test("encode from blob", () => {
    const utilities = new Utilities();
    const blob = utilities.newBlob("A string here");
    const encoded = utilities.base64Encode(blob.getBytes());
    expect(encoded).toBe("QSBzdHJpbmcgaGVyZQ==");
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodedata_1
  test("encode from string", () => {
    const utilities = new Utilities();
    const encoded = utilities.base64Encode("A string here");
    expect(encoded).toBe("QSBzdHJpbmcgaGVyZQ==");
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodedata,-charset
  test("encode from string with charset", () => {
    const utilities = new Utilities();
    const input = "Google グループ";
    const encoded = utilities.base64Encode(input, utilities.Charset.UTF_8);
    expect(encoded).toBe("R29vZ2xlIOOCsOODq+ODvOODlw==");
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodewebsafedata
  test("encode websafe from blob", () => {
    const utilities = new Utilities();
    const blob = utilities.newBlob("A string here");
    const encoded = utilities.base64EncodeWebSafe(blob.getBytes());
    expect(encoded).toBe("QSBzdHJpbmcgaGVyZQ==");
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodewebsafedata_1
  test("encode websafe from string", () => {
    const utilities = new Utilities();
    const encoded = utilities.base64EncodeWebSafe("A string here");
    expect(encoded).toBe("QSBzdHJpbmcgaGVyZQ==");
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#base64encodewebsafedata,-charset
  test("encode websafe from string with charset", () => {
    const utilities = new Utilities();
    const input = "Google グループ";
    const encoded = utilities.base64EncodeWebSafe(input, utilities.Charset.UTF_8);
    expect(encoded).toBe("R29vZ2xlIOOCsOODq-ODvOODlw==");
  });
});

describe("compute", () => {
  describe("MD2", () => {
    test("digest1", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(utilities.DigestAlgorithm.MD2, "");
      expect(Buffer.from(digest).toString("hex")).toBe("8350e5a3e24c153df2275c9f80692773");
    });
    test("digest2", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(utilities.DigestAlgorithm.MD2, "a");
      expect(Buffer.from(digest).toString("hex")).toBe("32ec01ec4a6dac72c0ab96fb34c0b5d1");
    });
    test("digest3", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(utilities.DigestAlgorithm.MD2, "abc");
      expect(Buffer.from(digest).toString("hex")).toBe("da853b0d3f88d99b30283a69e6ded6bb");
    });
    test("digest4", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(utilities.DigestAlgorithm.MD2, "message digest");
      expect(Buffer.from(digest).toString("hex")).toBe("ab4f496bfb2a530b219ff33031fe06b0");
    });
    test("digest5", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(
        utilities.DigestAlgorithm.MD2,
        "abcdefghijklmnopqrstuvwxyz",
      );
      expect(Buffer.from(digest).toString("hex")).toBe("4e8ddff3650292ab5a4108c3aa47940b");
    });
    test("digest6", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(
        utilities.DigestAlgorithm.MD2,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      );
      expect(Buffer.from(digest).toString("hex")).toBe("da33def2a42df13975352846c30338cd");
    });
    test("digest7", () => {
      const utilities = new Utilities();
      const digest = utilities.computeDigest(
        utilities.DigestAlgorithm.MD2,
        "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      );
      expect(Buffer.from(digest).toString("hex")).toBe("d5976f79d83d3a0dc9806c3c66f3efd8");
    });
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#computedigestalgorithm,-value
  test("digest", () => {
    const utilities = new Utilities();
    // Calculated from the results of running GAS
    const digestArray = [
      23, -116, 22, 69, -124, -39, -22, -57, 55, 93, -3, -124, 22, -119, -28, -77,
    ];
    const input = utilities.base64Decode("aW5wdXQgdG8gaGFzaA0K");
    const digest = utilities.computeDigest(utilities.DigestAlgorithm.MD5, input);
    expect(digest).toStrictEqual(digestArray);
  });
});

// describe("format", () => {
//   // https://developers.google.com/apps-script/reference/utilities/utilities#formatdatedate,-timezone,-format
//   test("date", () => {
//     const utilities = new Utilities();
//     const formattedDate = utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
//     expect(formattedDate).toBe("year-month-dateThour-minute-second");
//   });
//   // https://developers.google.com/apps-script/reference/utilities/utilities#formatstringtemplate,-args
//   test("string from number", () => {
//     const utilities = new Utilities();
//     const formattedString = " 123.456000";
//     const formatted = utilities.formatString("%11.6f", 123.456);
//     expect(formatted).toBe(formattedString);
//   });
//   test("string from string", () => {
//     const utilities = new Utilities();
//     const formattedString = "   abc";
//     const formatted = utilities.formatString("%6s", "abc");
//     expect(formatted).toBe(formattedString);
//   });
// });

test("uuid", () => {
  const utilities = new Utilities();
  const uuid = utilities.getUuid();
  expect(uuid).toMatch(uuidRegExp);
});

describe("parse", () => {
  // https://developers.google.com/apps-script/reference/utilities/utilities#parsecsvcsv
  test("csv", () => {
    const utilities = new Utilities();
    const csvString = "a,b,c\nd,e,f";
    const parsedCsv = [
      ["a", "b", "c"],
      ["d", "e", "f"],
    ];
    const parsed = utilities.parseCsv(csvString);
    expect(parsed).toStrictEqual(parsedCsv);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#parsecsvcsv,-delimiter
  test("csv with delimiter", () => {
    const utilities = new Utilities();
    const csvString = "a\tb\tc\nd\te\tf";
    const parsedCsv = [
      ["a", "b", "c"],
      ["d", "e", "f"],
    ];
    const parsed = utilities.parseCsv(csvString, "\t");
    expect(parsed).toStrictEqual(parsedCsv);
  });
  // https://developers.google.com/apps-script/reference/utilities/utilities#parsedatedate,-timezone,-format
  // test("date", () => {
  //   const utilities = new Utilities();
  //   const parsedDate = 0;
  //   const parsed = utilities.parseDate("1970-01-01 00:00:00", "GMT", "yyyy-MM-dd' 'HH:mm:ss");
  //   expect(parsed.valueOf()).toBe(parsedDate);
  // });
});

// https://developers.google.com/apps-script/reference/utilities/utilities#sleepmilliseconds
test("sleep", () => {
  const utilities = new Utilities();
  const durationMs = 1000;
  const start = performance.now();
  utilities.sleep(durationMs);
  const realDurationMs = performance.now() - start;
  expect(realDurationMs).toBeGreaterThanOrEqual(durationMs);
});

describe("deprecated", () => {
  test("jsonParse() always throws an exception", () => {
    const utilities = new Utilities();
    expect(() => utilities.jsonParse("{}")).throw(deprecatedRegExp);
  });
  test("jsonStringify() always throws an exception", () => {
    const utilities = new Utilities();
    expect(() => utilities.jsonStringify({})).toThrow(deprecatedRegExp);
  });
});
