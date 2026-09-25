import { afterEach, describe, expect, test, vi } from "vitest";

import { createDriveFileBlob } from "./drive-create-file";
import { MIME_TYPE, createBlob, type RuntimeBlobSource } from "./index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createDriveFileBlob", () => {
  test("preserve Blob input without rebuilding it", () => {
    const blob = createBlob("Vegas", MIME_TYPE.PLAIN_TEXT, "vegas.txt");

    expect(createDriveFileBlob(blob)).toBe(blob);
  });

  test("resolve BlobSource input through getBlob", () => {
    const blob = createBlob("Vegas", MIME_TYPE.PLAIN_TEXT, "vegas.txt");
    const source = {
      getBlob: () => blob,
    } satisfies RuntimeBlobSource;

    expect(createDriveFileBlob(source)).toBe(blob);
  });

  test("create a named plain-text Blob from string content", () => {
    const blob = createDriveFileBlob("vegas.txt", "Vegas");

    expect(blob.getName()).toBe("vegas.txt");
    expect(blob.getContentType()).toBe(MIME_TYPE.PLAIN_TEXT);
    expect(blob.getDataAsString()).toBe("Vegas");
  });

  test("create a named Blob with an explicit MIME type", () => {
    const blob = createDriveFileBlob("index.html", "<main>Vegas</main>", MIME_TYPE.HTML);

    expect(blob.getName()).toBe("index.html");
    expect(blob.getContentType()).toBe(MIME_TYPE.HTML);
    expect(blob.getDataAsString()).toBe("<main>Vegas</main>");
  });

  test("enforce the 50 MB plain-text content limit", () => {
    vi.spyOn(TextEncoder.prototype, "encode").mockReturnValue({
      byteLength: 50_000_001,
    } as ReturnType<TextEncoder["encode"]>);

    expect(() => createDriveFileBlob("vegas.txt", "oversized")).toThrow(
      "Local Drive file content exceeds the 50 MB limit.",
    );
  });

  test("enforce the 10 MB explicit-MIME content limit", () => {
    vi.spyOn(TextEncoder.prototype, "encode").mockReturnValue({
      byteLength: 10_000_001,
    } as ReturnType<TextEncoder["encode"]>);

    expect(() => createDriveFileBlob("index.html", "oversized", MIME_TYPE.HTML)).toThrow(
      "Local Drive file content exceeds the 10 MB limit.",
    );
  });
});
