import { expect, test } from "vitest";

import { Utilities } from "./Utilities";

const uuidRegExp = /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/;
const deprecatedRegExp = / is deprecated\. Do not use\.$/;

test("Utilities#base64Decode() can be base64 decoded", () => {
  const utilities = Utilities();
  const array = [
    71, 111, 111, 103, 108, 101, 32, -29, -126, -80, -29, -125, -85, -29, -125, -68, -29, -125,
    -105,
  ];
  expect(utilities.base64Decode("R29vZ2xlIOOCsOODq+ODvOODlw==")).toStrictEqual(array);
});

test("Utilities#base64Encode() can be base64 encoded", () => {
  const utilities = Utilities();
  expect(utilities.base64Encode("A string here")).toEqual("QSBzdHJpbmcgaGVyZQ==");
});

test("Utilities#base64Encode() can be base64 encoded with UTF8", () => {
  const utilities = Utilities();
  expect(utilities.base64Encode("Google グループ", utilities.Charset.UTF_8)).toEqual(
    "R29vZ2xlIOOCsOODq+ODvOODlw==",
  );
});

test("Utilities#getUuid() generates a string in the correct UUID format", () => {
  const utilities = Utilities();
  expect(utilities.getUuid()).toMatch(uuidRegExp);
});

test("Utilities#getUuid() generates a different UUID string each time", () => {
  const utilities = Utilities();
  const uuid1 = utilities.getUuid();
  const uuid2 = utilities.getUuid();
  expect(uuid1).not.toEqual(uuid2);
});

test("Utilities#parseCsv() parses the csv into a 2D array", () => {
  const utilities = Utilities();
  const csvString = "a,b,c\nd,e,f";
  const array2d = [
    ["a", "b", "c"],
    ["d", "e", "f"],
  ];
  const data = utilities.parseCsv(csvString);
  expect(data).toStrictEqual(array2d);
});

test("Utilities#parseCsv() parses the csv into a 2D array with custom delimiter", () => {
  const utilities = Utilities();
  const csvString = "a\tb\tc\nd\te\tf";
  const array2d = [
    ["a", "b", "c"],
    ["d", "e", "f"],
  ];
  const data = utilities.parseCsv(csvString, "\t");
  expect(data).toStrictEqual(array2d);
});

test("Utilities#sleep() stops processing for the specified number of seconds", () => {
  const utilities = Utilities();
  const durationMs = 100;
  const start = performance.now();
  utilities.sleep(durationMs);
  const realDurationMs = performance.now() - start;
  expect(realDurationMs).toBeGreaterThanOrEqual(durationMs);
});

test("Utilities#jsonParse() always throws an exception", () => {
  const utilities = Utilities();
  expect(() => utilities.jsonParse("{}")).throw(deprecatedRegExp);
});

test("Utilities#jsonStringify() always throws an exception", () => {
  const utilities = Utilities();
  expect(() => utilities.jsonStringify({})).toThrow(deprecatedRegExp);
});
