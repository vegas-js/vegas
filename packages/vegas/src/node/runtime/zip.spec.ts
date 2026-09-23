import { describe, expect, test } from "vitest";

import { createZip, extractZip } from "./node/zip";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

const PYTHON_ZIP_FIXTURE = Buffer.from(
  "UEsDBBQAAAAAAIMYIlAL+UNWBgAAAAYAAAAJAAAAcGxhaW4udHh0c3RvcmVkUEsDBBQAAAAAAIMYIlAAAAAAAAAAAAAAAAAHAAAAbmVzdGVkL1BLAwQUAAAICACDGCJQJumFphAAAAAOAAAAFAAAAG5lc3RlZC/ml6XmnKzoqp4udHh0S87PLShKLS5OTVF43LQBAFBLAQIUAxQAAAAAAIMYIlAL+UNWBgAAAAYAAAAJAAAAAAAAAAAAAACAAQAAAABwbGFpbi50eHRQSwECFAMUAAAAAACDGCJQAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAA/UEtAAAAbmVzdGVkL1BLAQIUAxQAAAgIAIMYIlAm6YWmEAAAAA4AAAAUAAAAAAAAAAAAAACAAVIAAABuZXN0ZWQv5pel5pys6KqeLnR4dFBLBQYAAAAAAwADAK4AAACUAAAAAAA=",
  "base64",
);

describe("ZIP codec", () => {
  test("extract stored and deflated files from an independent ZIP fixture", () => {
    const entries = extractZip(PYTHON_ZIP_FIXTURE);

    expect(entries.map((entry) => entry.name)).toStrictEqual(["plain.txt", "nested/日本語.txt"]);
    expect(Buffer.from(entries[0].data).toString()).toBe("stored");
    expect(Buffer.from(entries[1].data).toString()).toBe("compressed グ");
  });

  test("create and extract UTF-8 full-path entry names", () => {
    const archive = createZip([
      { name: "root.txt", data: Buffer.from("root") },
      { name: "nested/日本語.txt", data: Buffer.from("Google グ") },
    ]);
    const entries = extractZip(archive);

    expect(entries.map((entry) => entry.name)).toStrictEqual(["root.txt", "nested/日本語.txt"]);
    expect(Buffer.from(entries[0].data).toString()).toBe("root");
    expect(Buffer.from(entries[1].data).toString()).toBe("Google グ");
  });

  test("reject corrupt entry data as invalid ZIP syntax", () => {
    const archive = Buffer.from(createZip([{ name: "data.txt", data: Buffer.from("data") }]));
    const localNameLength = archive.readUInt16LE(26);
    const localExtraLength = archive.readUInt16LE(28);
    archive[30 + localNameLength + localExtraLength] ^= 0xff;

    expect(() => extractZip(archive)).toThrow(SyntaxError);
  });

  test("fail closed for ZIP features that the Local Runtime does not implement", () => {
    expect(() => createZip([{ name: "nested/", data: new Uint8Array() }])).toThrow(
      UnsupportedRuntimeOperationError,
    );

    const multiDisk = Buffer.from(createZip([{ name: "data.txt", data: Buffer.from("data") }]));
    const multiDiskEnd = multiDisk.length - 22;
    multiDisk.writeUInt16LE(1, multiDiskEnd + 4);
    expect(() => extractZip(multiDisk)).toThrow(UnsupportedRuntimeOperationError);

    const zip64 = Buffer.from(createZip([{ name: "data.txt", data: Buffer.from("data") }]));
    const zip64End = zip64.length - 22;
    zip64.writeUInt16LE(0xffff, zip64End + 10);
    expect(() => extractZip(zip64)).toThrow(UnsupportedRuntimeOperationError);

    const encrypted = Buffer.from(createZip([{ name: "data.txt", data: Buffer.from("data") }]));
    const encryptedEnd = encrypted.length - 22;
    const encryptedCentral = encrypted.readUInt32LE(encryptedEnd + 16);
    encrypted.writeUInt16LE(
      encrypted.readUInt16LE(encryptedCentral + 8) | 0x0001,
      encryptedCentral + 8,
    );
    expect(() => extractZip(encrypted)).toThrow(UnsupportedRuntimeOperationError);

    const unsupportedCompression = Buffer.from(
      createZip([{ name: "data.txt", data: Buffer.from("data") }]),
    );
    const unsupportedCompressionEnd = unsupportedCompression.length - 22;
    const unsupportedCompressionCentral = unsupportedCompression.readUInt32LE(
      unsupportedCompressionEnd + 16,
    );
    unsupportedCompression.writeUInt16LE(12, unsupportedCompressionCentral + 10);
    expect(() => extractZip(unsupportedCompression)).toThrow(UnsupportedRuntimeOperationError);
  });
});
