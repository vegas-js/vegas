import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { ArtifactStore, replaceOutputArtifacts, writeArtifacts } from "./artifact";

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

  test("list a snapshot of paths in scope", () => {
    const store = new ArtifactStore();
    store.replaceScope("client", [
      {
        path: "index.html",
        content: "index",
      },
      {
        path: "admin.html",
        content: "admin",
      },
    ]);

    const paths = store.listPaths("client");

    store.replaceScope("client", [
      {
        path: "next.html",
        content: "next",
      },
    ]);

    expect(paths).toStrictEqual(["index.html", "admin.html"]);
    expect(store.listPaths("client")).toStrictEqual(["next.html"]);
    expect(store.listPaths("missing")).toStrictEqual([]);
  });

  test("replace artifacts in scope", () => {
    const store = new ArtifactStore();
    store.replaceScope("client", [
      {
        path: "index.html",
        content: "index:first",
      },
      {
        path: "admin.html",
        content: "admin",
      },
    ]);
    store.replaceScope("server", [
      {
        path: "Code.js",
        content: "server",
      },
    ]);
    store.replaceScope("client", [
      {
        path: "index.html",
        content: "index:second",
      },
    ]);

    expect(store.readText("index.html")).toBe("index:second");
    expect(store.readText("Code.js")).toBe("server");
    expect(() => store.readText("admin.html")).toThrow("Artifact not found: admin.html");
  });

  test("remove all artifacts from replaced scope", () => {
    const store = new ArtifactStore();
    store.replaceScope("client", [
      {
        path: "index.html",
        content: "html",
      },
    ]);
    store.replaceScope("client", []);

    expect(() => store.readText("index.html")).toThrow("Artifact not found: index.html");
  });

  test("reject artifact path owned by another scope", () => {
    const store = new ArtifactStore();
    store.replaceScope("client", [
      {
        path: "shared.html",
        content: "client",
      },
    ]);

    expect(() =>
      store.replaceScope("server", [
        {
          path: "shared.html",
          content: "server",
        },
      ]),
    ).toThrow('Artifact "shared.html" already belongs to scope "client".');
    expect(store.readText("shared.html")).toBe("client");
  });

  test("replace multiple scopes", () => {
    const store = new ArtifactStore();
    store.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "index.html",
            content: "index:first",
          },
          {
            path: "admin.html",
            content: "admin",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server:first",
          },
        ],
      },
    ]);
    store.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "index.html",
            content: "index:second",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server:second",
          },
        ],
      },
    ]);

    expect(store.readText("index.html")).toBe("index:second");
    expect(store.readText("Code.js")).toBe("server:second");

    expect(() => store.readText("admin.html")).toThrow("Artifact not found: admin.html");
  });

  test("do not partially replace scopes when replacement fails", () => {
    const store = new ArtifactStore();
    store.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "index.html",
            content: "client:first",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server:first",
          },
        ],
      },
    ]);

    expect(() =>
      store.replaceScopes([
        {
          scope: "client",
          artifacts: [
            {
              path: "index.html",
              content: "client:second",
            },
          ],
        },
        {
          scope: "server",
          artifacts: [
            {
              path: "index.html",
              content: "server:second",
            },
          ],
        },
      ]),
    ).toThrow('Artifact "index.html" already belongs to scope "client".');

    expect(store.readText("index.html")).toBe("client:first");
    expect(store.readText("Code.js")).toBe("server:first");
  });

  test("reject artifact ownership transfer between scopes", () => {
    const store = new ArtifactStore();
    store.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "shared.html",
            content: "client",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server",
          },
        ],
      },
    ]);

    expect(() =>
      store.replaceScopes([
        {
          scope: "client",
          artifacts: [],
        },
        {
          scope: "server",
          artifacts: [
            {
              path: "shared.html",
              content: "server:new",
            },
          ],
        },
      ]),
    ).toThrow('Artifact "shared.html" already belongs to scope "client".');

    expect(store.readText("shared.html")).toBe("client");
    expect(store.readText("Code.js")).toBe("server");
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

  test.each([
    "../outside.txt",
    "nested/../../outside.txt",
    "/absolute.txt",
    String.raw`C:\absolute.txt`,
  ])("reject artifact path outside the output directory: %s", async (artifactPath) => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(tempDirPath, "dist");

    try {
      await expect(
        writeArtifacts(outputDir, [
          {
            path: "safe.txt",
            content: "safe",
          },
          {
            path: artifactPath,
            content: "outside",
          },
        ]),
      ).rejects.toThrow(`Invalid build artifact path: ${artifactPath}`);

      expect(fs.existsSync(path.join(outputDir, "safe.txt"))).toBe(false);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("normalize equivalent artifact paths before resolving duplicates", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      await writeArtifacts(tempDirPath, [
        {
          path: "nested/../Code.js",
          content: "first",
        },
        {
          path: "Code.js",
          content: "second",
        },
      ]);

      expect(fs.readFileSync(path.join(tempDirPath, "Code.js"), "utf8")).toBe("second");
      expect(fs.existsSync(path.join(tempDirPath, "nested"))).toBe(false);
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

describe("replaceOutputArtifacts", () => {
  test("preserve existing output when preparing replacement fails", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(tempDirPath, "dist");

    try {
      fs.mkdirSync(outputDir);
      fs.writeFileSync(path.join(outputDir, "Code.js"), "previous");

      await expect(
        replaceOutputArtifacts(outputDir, [
          {
            path: "../outside.txt",
            content: "invalid",
          },
        ]),
      ).rejects.toThrow("Invalid build artifact path: ../outside.txt");

      expect(fs.readFileSync(path.join(outputDir, "Code.js"), "utf8")).toBe("previous");
      expect(fs.readdirSync(tempDirPath).some((entry) => entry.startsWith(".dist.staging-"))).toBe(
        false,
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("restore existing output when activating replacement fails", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(tempDirPath, "dist");
    const rename = fs.promises.rename.bind(fs.promises);
    let renameCalls = 0;

    try {
      fs.mkdirSync(outputDir);
      fs.writeFileSync(path.join(outputDir, "Code.js"), "previous");

      using renameMock = vi.spyOn(fs.promises, "rename").mockImplementation(async (...args) => {
        renameCalls += 1;

        if (renameCalls === 2) {
          throw new Error("activate failed");
        }

        await rename(...args);
      });

      await expect(
        replaceOutputArtifacts(outputDir, [
          {
            path: "Code.js",
            content: "next",
          },
        ]),
      ).rejects.toThrow("activate failed");

      expect(renameMock).toHaveBeenCalledTimes(3);
      expect(fs.readFileSync(path.join(outputDir, "Code.js"), "utf8")).toBe("previous");
      expect(
        fs
          .readdirSync(tempDirPath)
          .some((entry) => entry.startsWith(".dist.staging-") || entry.startsWith(".dist.backup-")),
      ).toBe(false);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("replace existing output with authoritative artifacts", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(tempDirPath, "dist");

    try {
      fs.mkdirSync(path.join(outputDir, "stale"), {
        recursive: true,
      });
      fs.writeFileSync(path.join(outputDir, "stale.txt"), "stale");
      fs.writeFileSync(path.join(outputDir, "stale", "nested.txt"), "stale");

      await replaceOutputArtifacts(outputDir, [
        {
          path: "Code.js",
          content: "server",
        },
        {
          path: "appsscript.json",
          content: "{}",
        },
      ]);

      expect(fs.existsSync(path.join(outputDir, "stale.txt"))).toBe(false);
      expect(fs.existsSync(path.join(outputDir, "stale"))).toBe(false);

      expect(fs.readFileSync(path.join(outputDir, "Code.js"), "utf8")).toBe("server");
      expect(fs.readFileSync(path.join(outputDir, "appsscript.json"), "utf8")).toBe("{}");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
