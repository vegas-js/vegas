import { expect, test } from "vitest";

import { Blob } from "./Blob";

test("copyBlob() creates an independent copy", () => {
  const source = new Blob("original.txt")
    .setDataFromString("original")
    .setContentType("text/plain");

  const copy = source.copyBlob();

  expect(copy).not.toBe(source);

  expect(copy.getBytes()).toEqual(source.getBytes());

  expect(copy.getName()).toBe("original.txt");

  expect(copy.getContentType()).toBe("text/plain");

  copy.setName("copy.bin").setContentType("application/octet-stream").setBytes([9, 8, 7]);

  expect(source.getName()).toBe("original.txt");

  expect(source.getContentType()).toBe("text/plain");

  expect(source.getDataAsString()).toBe("original");
});

test("getBytes() and setBytes() do not alias caller arrays", () => {
  const input = [1, 2, 3];

  const blob = new Blob().setBytes(input);

  input[0] = 9;

  expect(blob.getBytes()).toEqual([1, 2, 3]);

  const bytesA = blob.getBytes();
  const bytesB = blob.getBytes();

  expect(bytesA).not.toBe(bytesB);

  bytesA[0] = 9;

  expect(bytesB).toEqual([1, 2, 3]);

  expect(blob.getBytes()).toEqual([1, 2, 3]);
});

test("setDataFromString() exposes GAS signed bytes", () => {
  const blob = new Blob().setDataFromString("café");

  expect(blob.getBytes()).toEqual([99, 97, 102, -61, -87]);

  expect(blob.getDataAsString()).toBe("café");

  expect(blob.getDataAsString("ISO-8859-1")).toBe("cafÃ©");
});

test("setDataFromString() supports ISO-8859-1", () => {
  const blob = new Blob().setDataFromString("café", "ISO-8859-1");

  expect(blob.getBytes()).toEqual([99, 97, 102, -23]);

  expect(blob.getDataAsString()).toBe("caf�");
});

test("setContentTypeFromExtension() recognizes txt files", () => {
  const blob = new Blob("note.txt").setContentType("application/octet-stream");

  const result = blob.setContentTypeFromExtension();

  expect(result).toBe(blob);

  expect(blob.getContentType()).toBe("text/plain");
});
