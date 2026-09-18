import { describe, expect, test } from "vitest";

import { RuntimeBlob } from "./blob";
import { createNodeUtilities } from "./node";

type CompressionMethodName = keyof Pick<
  GoogleAppsScript.Utilities.Utilities,
  "gzip" | "newBlob" | "ungzip" | "unzip" | "zip"
>;

const COMPRESSION_METHODS = [
  "gzip",
  "newBlob",
  "ungzip",
  "unzip",
  "zip",
] as const satisfies readonly CompressionMethodName[];

describe("Utilities Blob and compression contract", () => {
  test("create byte and UTF-8 blobs with nullable metadata", () => {
    const utilities = createNodeUtilities();
    const bytes = utilities.newBlob([71, 79, 79, 71, 76, 69], null, null);
    const text = utilities.newBlob("Google グ", "text/plain", "google.txt");

    expect(COMPRESSION_METHODS.every((method) => typeof utilities[method] === "function")).toBe(
      true,
    );
    expect(bytes).toBeInstanceOf(RuntimeBlob);
    expect(bytes.getDataAsString()).toBe("GOOGLE");
    expect(bytes.getContentType()).toBeNull();
    expect(bytes.getName()).toBeNull();
    expect(text.getBytes()).toStrictEqual([71, 111, 111, 103, 108, 101, 32, -29, -126, -80]);
    expect(text.getContentType()).toBe("text/plain");
    expect(text.getName()).toBe("google.txt");
  });

  test("gzip and ungzip BlobSource data without mutating the source", () => {
    const utilities = createNodeUtilities();
    const source = utilities.newBlob("Some text to compress using gzip compression");
    const compressed = utilities.gzip({ getBlob: () => source }, "text.gz");
    const uncompressed = utilities.ungzip(compressed);

    expect(compressed).toBeInstanceOf(RuntimeBlob);
    expect(compressed.getName()).toBe("text.gz");
    expect(compressed.getContentType()).toBeNull();
    expect(uncompressed.getDataAsString()).toBe(source.getDataAsString());
    expect(uncompressed.getName()).toBeNull();
    expect(source.getDataAsString()).toBe("Some text to compress using gzip compression");
  });

  test("zip named blobs and restore full entry paths", () => {
    const utilities = createNodeUtilities();
    const root = utilities.newBlob("root", "text/plain", "root.txt");
    const nested = utilities.newBlob("Google グ", "text/plain", "nested/日本語.txt");

    const archive = utilities.zip([root, { getBlob: () => nested }], "bundle.zip");
    const files = utilities.unzip(archive);

    expect(archive).toBeInstanceOf(RuntimeBlob);
    expect(archive.getName()).toBe("bundle.zip");
    expect(archive.getContentType()).toBeNull();
    expect(files.map((file) => file.getName())).toStrictEqual(["root.txt", "nested/日本語.txt"]);
    expect(files.map((file) => file.getDataAsString())).toStrictEqual(["root", "Google グ"]);
    expect(files.every((file) => file.getContentType() === null)).toBe(true);
  });

  test("require a name for every zip input blob", () => {
    const utilities = createNodeUtilities();

    expect(() => utilities.zip([utilities.newBlob("unnamed")])).toThrow();
  });
});
