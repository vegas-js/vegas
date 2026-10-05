import { describe, expect, test } from "vitest";

import { computeMd2 } from "./md2";

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

// https://www.rfc-editor.org/rfc/rfc1319#appendix-A.5
describe("computeMd2", () => {
  test.each([
    ["", "8350e5a3e24c153df2275c9f80692773"],
    ["a", "32ec01ec4a6dac72c0ab96fb34c0b5d1"],
    ["abc", "da853b0d3f88d99b30283a69e6ded6bb"],
    ["message digest", "ab4f496bfb2a530b219ff33031fe06b0"],
    ["abcdefghijklmnopqrstuvwxyz", "4e8ddff3650292ab5a4108c3aa47940b"],
    [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      "da33def2a42df13975352846c30338cd",
    ],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "d5976f79d83d3a0dc9806c3c66f3efd8",
    ],
  ])("match RFC 1319 test vector for %j", (input, expected) => {
    expect(toHex(computeMd2(Buffer.from(input)))).toBe(expected);
  });
});
