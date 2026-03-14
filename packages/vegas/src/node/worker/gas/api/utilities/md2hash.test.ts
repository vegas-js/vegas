import { expect, test } from "vitest";

import { MD2Hash } from "./md2hash";

// https://www.rfc-editor.org/info/rfc1319
// A.5 Test suite
test("test suite 1: empty string", () => {
  const hash = new MD2Hash();
  const testString = "";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("8350e5a3e24c153df2275c9f80692773");
});
test("test suite 2: one character", () => {
  const hash = new MD2Hash();
  const testString = "a";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("32ec01ec4a6dac72c0ab96fb34c0b5d1");
});
test("test suite 3: string", () => {
  const hash = new MD2Hash();
  const testString = "abc";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("da853b0d3f88d99b30283a69e6ded6bb");
});
test("test suite 4: string includes space", () => {
  const hash = new MD2Hash();
  const testString = "message digest";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("ab4f496bfb2a530b219ff33031fe06b0");
});
test("test suite 5: a-z string ( 26 character )", () => {
  const hash = new MD2Hash();
  const testString = "abcdefghijklmnopqrstuvwxyz";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("4e8ddff3650292ab5a4108c3aa47940b");
});
test("test suite 6: A-Z / a-z / 0-9 string ( 62 character )", () => {
  const hash = new MD2Hash();
  const testString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("da33def2a42df13975352846c30338cd");
});
test("test suite 7: 0-9 string ( 80 character )", () => {
  const hash = new MD2Hash();
  const testString =
    "12345678901234567890123456789012345678901234567890123456789012345678901234567890";
  hash.update(Buffer.from(testString));
  expect(hash.digest().toString("hex")).toBe("d5976f79d83d3a0dc9806c3c66f3efd8");
});
