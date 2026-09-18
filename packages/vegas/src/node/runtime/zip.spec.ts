import { describe, expect, test } from "vitest";

import { createZip, extractZip } from "./zip";

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

  test("validate CRC-32 when extracting entries", () => {
    const archive = Buffer.from(createZip([{ name: "data.txt", data: Buffer.from("data") }]));
    const localNameLength = archive.readUInt16LE(26);
    const localExtraLength = archive.readUInt16LE(28);
    archive[30 + localNameLength + localExtraLength] ^= 0xff;

    expect(() => extractZip(archive)).toThrow();
  });

  test("reject unsupported directory inputs", () => {
    expect(() => createZip([{ name: "nested/", data: new Uint8Array() }])).toThrow();
  });
});
