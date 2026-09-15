import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { parseClaspProjectConfig, readClaspScriptId } from "./clasp-compatibility";

describe("parseClaspProjectConfig", () => {
  test("parse JSON5 project config", () => {
    expect(
      parseClaspProjectConfig(`
        {
          // Apps Script project
          scriptId: 'script',
          parentId: 'parent',
        }
      `),
    ).toStrictEqual({
      scriptId: "script",
      parentId: "parent",
    });
  });
});

describe("readClaspScriptId", () => {
  test("read script id from clasp config", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.writeFileSync(
        path.join(root, ".clasp.json"),
        `
          {
            // Apps Script project
            scriptId: 'script-id',
          }
        `,
      );

      await expect(readClaspScriptId(root)).resolves.toBe("script-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("return undefined when clasp config does not exist", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      await expect(readClaspScriptId(root)).resolves.toBeUndefined();
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("return undefined when script id does not exist", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.writeFileSync(path.join(root, ".clasp.json"), "{ parentId: 'parent' }");

      await expect(readClaspScriptId(root)).resolves.toBeUndefined();
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("return undefined when script id is not a string", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.writeFileSync(path.join(root, ".clasp.json"), "{ scriptId: 123 }");

      await expect(readClaspScriptId(root)).resolves.toBeUndefined();
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("preserve empty script id for resolver validation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.writeFileSync(path.join(root, ".clasp.json"), "{ scriptId: '' }");

      await expect(readClaspScriptId(root)).resolves.toBe("");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject invalid clasp config", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.writeFileSync(path.join(root, ".clasp.json"), "{ invalid");

      await expect(readClaspScriptId(root)).rejects.toThrow();
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
