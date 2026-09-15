import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { ArtifactStore, writeArtifacts } from "./artifact";

describe("ArtifactStore", () => {
  test("store and update artifacts", () => {
    const store = new ArtifactStore([
      {
        path: "Code.js",
        content: "first",
      },
    ]);

    expect(store.readText("Code.js")).toBe("first");

    store.write([
      {
        path: "Code.js",
        content: "second",
      },
    ]);

    expect(store.readText("Code.js")).toBe("second");
  });
});

describe("writeArtifacts", () => {
  test("write binary artifact", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const binary = new Uint8Array([0x00, 0xff, 0x80, 0x41]);

      await writeArtifacts(tempDirPath, [
        {
          path: "assets/binary.dat",
          content: binary,
        },
      ]);

      expect(
        Array.from(fs.readFileSync(path.join(tempDirPath, "assets", "binary.dat"))),
      ).toStrictEqual(Array.from(binary));
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("use last artifact for duplicate path", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      await writeArtifacts(tempDirPath, [
        {
          path: "appsscript.json",
          content: "first",
        },
        {
          path: "appsscript.json",
          content: "second",
        },
      ]);

      expect(fs.readFileSync(path.join(tempDirPath, "appsscript.json"), "utf8")).toBe("second");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
