import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import { createBlob, hydrateBlob, RuntimeBlob, serializeBlob } from "./index";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

// Public contract:
// https://developers.google.com/apps-script/reference/base/blob
describe("Blob public contract", () => {
  test("copy Blob data and expose BlobSource, byte, metadata, and Google-type contracts", () => {
    const blob = hydrateBlob({
      bytes: [65, -1],
      contentType: "application/octet-stream",
      name: "source.bin",
      googleType: true,
    });

    expect(blob.getBlob()).toBe(blob);
    expect(blob.getBytes()).toStrictEqual([65, -1]);
    expect(blob.getContentType()).toBe("application/octet-stream");
    expect(blob.getName()).toBe("source.bin");
    expect(blob.isGoogleType()).toBe(true);

    const copy = blob.copyBlob();

    expect(copy).toBeInstanceOf(RuntimeBlob);
    expect(copy).not.toBe(blob);
    expect(serializeBlob(copy)).toStrictEqual(serializeBlob(blob));

    expect(copy.setBytes([66, 67])).toBe(copy);
    expect(copy.getBytes()).toStrictEqual([66, 67]);
    expect(blob.getBytes()).toStrictEqual([65, -1]);
  });

  test("read string data with UTF-8 and an explicitly specified charset", () => {
    const utf8 = createBlob("Google グ");

    expect(utf8.getDataAsString()).toBe("Google グ");
    expect(utf8.getDataAsString("UTF-8")).toBe("Google グ");

    const windows1252 = createBlob([67, 97, 102, -23]);

    expect(windows1252.getDataAsString("windows-1252")).toBe("Café");
  });

  test("mutate Blob data and metadata with chaining", () => {
    const blob = createBlob("", "application/octet-stream", "notes.txt");

    expect(blob.setDataFromString("Vegas")).toBe(blob);
    expect(blob.getBytes()).toStrictEqual([86, 101, 103, 97, 115]);

    expect(blob.setDataFromString("グ", "UTF-8")).toBe(blob);
    expect(blob.getDataAsString()).toBe("グ");

    expect(blob.setContentType("text/custom")).toBe(blob);
    expect(blob.getContentType()).toBe("text/custom");

    expect(blob.setName("renamed.txt")).toBe(blob);
    expect(blob.getName()).toBe("renamed.txt");

    expect(blob.setContentTypeFromExtension()).toBe(blob);
    expect(blob.getContentType()).toBe("text/plain");
  });

  test("convert through a Runtime capability and fail closed when conversion is unavailable", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
      name: "vegas.pdf",
    });
    const convertible = createBlob("Vegas", "text/plain", "vegas.txt", convert);
    const converted = convertible.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
    expect(converted.getName()).toBe("vegas.pdf");

    const localOnly = createBlob("Vegas", "text/plain", "vegas.txt");

    expect(() => localOnly.getAs("application/pdf")).toThrow(UnsupportedRuntimeOperationError);
  });

  test("fail closed for deprecated composite Blob access", () => {
    const blob = createBlob("Vegas");

    expect(() => blob.getAllBlobs()).toThrow(UnsupportedRuntimeOperationError);
    expect(() => blob.getAllBlobs()).toThrow(
      "Local Runtime does not support Blob.getAllBlobs(): composite Blob contents are not modeled.",
    );
  });

  test("fail closed when the requested output charset cannot be encoded locally", () => {
    const blob = createBlob("");

    expect(() => blob.setDataFromString("Café", "windows-1252")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(blob.getBytes()).toStrictEqual([]);
  });
});
