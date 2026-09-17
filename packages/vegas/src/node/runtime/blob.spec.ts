import { describe, expect, test } from "vitest";

import { createBlob, hydrateBlob, RuntimeBlob, serializeBlob } from "./index";

describe("RuntimeBlob", () => {
  test("create raw blobs from UTF-8 data with Apps Script signed bytes", () => {
    const blob = createBlob("Google グ");

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getBytes()).toStrictEqual([71, 111, 111, 103, 108, 101, 32, -29, -126, -80]);
    expect(blob.getDataAsString()).toBe("Google グ");
    expect(blob.getContentType()).toBeNull();
    expect(blob.getName()).toBeNull();
    expect(blob.isGoogleType()).toBe(false);
  });

  test("mutate raw blob data and metadata with chaining", () => {
    const blob = createBlob([65], "text/plain", "a.txt");

    expect(blob.setBytes([66, 67])).toBe(blob);
    expect(blob.setDataFromString("グ")).toBe(blob);
    expect(blob.setContentType("text/custom")).toBe(blob);
    expect(blob.setName("renamed.txt")).toBe(blob);

    expect(serializeBlob(blob)).toStrictEqual({
      bytes: [-29, -126, -80],
      contentType: "text/custom",
      name: "renamed.txt",
      googleType: false,
    });
  });

  test("copy and hydrate blobs without sharing mutable byte state", () => {
    const original = createBlob("original", "text/plain", "original.txt");
    const copy = original.copyBlob();

    copy.setDataFromString("copy").setName("copy.txt");

    expect(original.getDataAsString()).toBe("original");
    expect(original.getName()).toBe("original.txt");
    expect(copy.getDataAsString()).toBe("copy");
    expect(copy.getName()).toBe("copy.txt");

    const value = serializeBlob(original);
    const hydrated = hydrateBlob({
      ...value,
      googleType: true,
    });
    const returnedBytes = hydrated.getBytes();

    returnedBytes[0] = 0;

    expect(hydrated.getBytes()).toStrictEqual(value.bytes);
    expect(hydrated.isGoogleType()).toBe(true);
  });
});
