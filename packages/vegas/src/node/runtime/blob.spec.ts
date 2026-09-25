import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import { createBlob, hydrateBlob, RuntimeBlob, serializeBlob } from "./index";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

describe("RuntimeBlob", () => {
  test("create raw blobs from UTF-8 data with Apps Script signed bytes", () => {
    const blob = createBlob("Google グ");

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getBytes()).toStrictEqual([71, 111, 111, 103, 108, 101, 32, -29, -126, -80]);
    expect(blob.getDataAsString()).toBe("Google グ");
    expect(blob.getDataAsString("UTF-8")).toBe("Google グ");
    expect(blob.getContentType()).toBeNull();
    expect(blob.getName()).toBeNull();
    expect(blob.isGoogleType()).toBe(false);
  });

  test("decode blob data with a specified charset", () => {
    const blob = createBlob([67, 97, 102, -23]);

    expect(blob.getDataAsString("windows-1252")).toBe("Café");
  });

  test("convert blobs through the bound Runtime conversion backend", () => {
    const calls: unknown[] = [];
    const convert: BlobConverter = (value, contentType) => {
      calls.push({ value, contentType });

      return {
        ...value,
        bytes: [80, 68, 70],
        contentType,
        name: "vegas.pdf",
      };
    };
    const blob = createBlob("Vegas", "text/plain", "vegas.txt", convert);
    const converted = blob.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
    expect(converted.getName()).toBe("vegas.pdf");
    expect(calls).toStrictEqual([
      {
        value: {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
        contentType: "application/pdf",
      },
    ]);

    expect(converted.copyBlob().getAs("image/png").getContentType()).toBe("image/png");
  });

  test("reject conversion when a blob has no Runtime conversion backend", () => {
    const blob = createBlob("Vegas", "text/plain", "vegas.txt");

    expect(() => blob.getAs("application/pdf")).toThrow(UnsupportedRuntimeOperationError);
    expect(() => blob.getAs("application/pdf")).toThrow(
      "Local Runtime does not support Blob.getAs(): Blob conversion is not available in this Runtime context.",
    );
  });

  test("reject deprecated composite Blob access that the Local Runtime cannot model", () => {
    const blob = createBlob("Vegas", "text/plain", "vegas.txt");

    expect(() => blob.getAllBlobs()).toThrow(UnsupportedRuntimeOperationError);
    expect(() => blob.getAllBlobs()).toThrow(
      "Local Runtime does not support Blob.getAllBlobs(): composite Blob contents are not modeled.",
    );
  });

  test("return blob data through BlobSource contract", () => {
    const blob = createBlob("content", "text/plain", "content.txt");
    const returned = blob.getBlob();

    expect(returned).toBeInstanceOf(RuntimeBlob);
    expect(serializeBlob(returned)).toStrictEqual({
      bytes: [99, 111, 110, 116, 101, 110, 116],
      contentType: "text/plain",
      name: "content.txt",
      googleType: false,
    });
  });

  test("infer content types from file extensions documented by Apps Script MimeType", () => {
    const cases = [
      ["image.bmp", "image/bmp"],
      ["image.gif", "image/gif"],
      ["image.jpg", "image/jpeg"],
      ["image.png", "image/png"],
      ["image.svg", "image/svg+xml"],
      ["document.pdf", "application/pdf"],
      ["style.css", "text/css"],
      ["data.csv", "text/csv"],
      ["page.html", "text/html"],
      ["script.js", "application/javascript"],
      ["notes.txt", "text/plain"],
      ["document.rtf", "application/rtf"],
      ["drawing.odg", "application/vnd.oasis.opendocument.graphics"],
      ["slides.odp", "application/vnd.oasis.opendocument.presentation"],
      ["sheet.ods", "application/vnd.oasis.opendocument.spreadsheet"],
      ["document.odt", "application/vnd.oasis.opendocument.text"],
      ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["sheet.xls", "application/vnd.ms-excel"],
      ["slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
      ["slides.ppt", "application/vnd.ms-powerpoint"],
      ["document.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["document.doc", "application/msword"],
      ["archive.ZIP", "application/zip"],
    ] as const;

    for (const [name, contentType] of cases) {
      const blob = createBlob("content", "application/octet-stream", name);

      expect(blob.setContentTypeFromExtension()).toBe(blob);
      expect(blob.getContentType()).toBe(contentType);
    }
  });

  test("clear content type when a file extension cannot be inferred", () => {
    const blobs = [
      createBlob("content", "text/plain"),
      createBlob("content", "text/plain", "README"),
      createBlob("content", "text/plain", "archive.unknown"),
      createBlob("content", "text/plain", "trailing."),
    ];

    for (const blob of blobs) {
      expect(blob.setContentTypeFromExtension()).toBe(blob);
      expect(blob.getContentType()).toBeNull();
    }
  });

  test("mutate raw blob data and metadata with chaining", () => {
    const blob = createBlob([65], "text/plain", "a.txt");

    expect(blob.setBytes([66, 67])).toBe(blob);
    expect(blob.setDataFromString("グ")).toBe(blob);
    expect(blob.setDataFromString("グ", "UTF-8")).toBe(blob);
    expect(blob.setContentType(null)).toBe(blob);
    expect(blob.getContentType()).toBeNull();
    expect(blob.setContentType("text/custom")).toBe(blob);
    expect(blob.setName("renamed.txt")).toBe(blob);

    expect(serializeBlob(blob)).toStrictEqual({
      bytes: [-29, -126, -80],
      contentType: "text/custom",
      name: "renamed.txt",
      googleType: false,
    });
  });

  test("fail closed when encoding a string with an unsupported local charset", () => {
    const blob = createBlob("");

    expect(() => blob.setDataFromString("Café", "windows-1252")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => blob.setDataFromString("Café", "windows-1252")).toThrow(
      'Local Runtime does not support Blob.setDataFromString(string, charset): charset encoding is not modeled: "windows-1252".',
    );
    expect(blob.getBytes()).toStrictEqual([]);
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
