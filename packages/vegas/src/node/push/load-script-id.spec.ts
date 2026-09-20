import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { loadAppsScriptScriptId } from "./load-script-id";

const originalScriptId = process.env.VEGAS_SCRIPT_ID;

afterEach(() => {
  vi.unstubAllEnvs();

  if (originalScriptId === undefined) {
    delete process.env.VEGAS_SCRIPT_ID;
  } else {
    process.env.VEGAS_SCRIPT_ID = originalScriptId;
  }
});

describe("loadAppsScriptScriptId", () => {
  test("use environment script id", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      vi.stubEnv("VEGAS_SCRIPT_ID", "environment-id");

      await expect(loadAppsScriptScriptId({ projectRoot: root })).resolves.toBe("environment-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("use provided environment instead of the process environment", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      vi.stubEnv("VEGAS_SCRIPT_ID", "process-id");

      await expect(
        loadAppsScriptScriptId({
          projectRoot: root,
          projectScriptId: "project-id",
          env: {
            VEGAS_SCRIPT_ID: "provided-id",
          },
        }),
      ).resolves.toBe("provided-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("do not read clasp config when environment script id is defined", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      vi.stubEnv("VEGAS_SCRIPT_ID", "environment-id");

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ invalid");

      await expect(loadAppsScriptScriptId({ projectRoot: root })).resolves.toBe("environment-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("use project script id when environment script id is not defined", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      delete process.env.VEGAS_SCRIPT_ID;

      await expect(
        loadAppsScriptScriptId({
          projectRoot: root,
          projectScriptId: "project-id",
        }),
      ).resolves.toBe("project-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("do not read clasp config when project script id is defined", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      delete process.env.VEGAS_SCRIPT_ID;

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ invalid");

      await expect(
        loadAppsScriptScriptId({
          projectRoot: root,
          projectScriptId: "project-id",
        }),
      ).resolves.toBe("project-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("read compatibility script id when environment script id is not defined", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      delete process.env.VEGAS_SCRIPT_ID;

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ scriptId: 'compatibility-id' }");

      await expect(loadAppsScriptScriptId({ projectRoot: root })).resolves.toBe("compatibility-id");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject empty environment script id instead of falling back", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      vi.stubEnv("VEGAS_SCRIPT_ID", "");

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ scriptId: 'compatibility-id' }");

      await expect(loadAppsScriptScriptId({ projectRoot: root })).rejects.toThrow(
        "Apps Script script ID is required.",
      );
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject empty project script id instead of falling back", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      delete process.env.VEGAS_SCRIPT_ID;

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ scriptId: 'compatibility-id' }");

      await expect(
        loadAppsScriptScriptId({
          projectRoot: root,
          projectScriptId: "",
        }),
      ).rejects.toThrow("Apps Script script ID is required.");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject missing script id", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      delete process.env.VEGAS_SCRIPT_ID;

      await expect(loadAppsScriptScriptId({ projectRoot: root })).rejects.toThrow(
        "Apps Script script ID is required.",
      );
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
