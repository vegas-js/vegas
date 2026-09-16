import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { loadAppsScriptPushRequest } from "./load-request";

describe("loadAppsScriptPushRequest", () => {
  test("load push request from project and build output", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(root, "dist");

    try {
      fs.mkdirSync(path.join(outputDir, "pages"), { recursive: true });

      fs.writeFileSync(path.join(outputDir, "appsscript.json"), '{"timeZone":"UTC"}');
      fs.writeFileSync(path.join(outputDir, "Code.js"), "function hello() {}");
      fs.writeFileSync(path.join(outputDir, "pages", "dashboard.html"), "<h1>Dashboard</h1>");

      await expect(
        loadAppsScriptPushRequest({
          projectRoot: root,
          outputDir,
          projectScriptId: "script-id",
        }),
      ).resolves.toStrictEqual({
        scriptId: "script-id",
        content: {
          files: [
            {
              name: "Code",
              type: "SERVER_JS",
              source: "function hello() {}",
            },
            {
              name: "appsscript",
              type: "JSON",
              source: '{"timeZone":"UTC"}',
            },
            {
              name: "pages/dashboard",
              type: "HTML",
              source: "<h1>Dashboard</h1>",
            },
          ],
        },
      });
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("use provided output directory", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(root, "custom-output");

    try {
      fs.mkdirSync(outputDir);

      fs.writeFileSync(path.join(outputDir, "appsscript.json"), "{}");
      fs.writeFileSync(path.join(outputDir, "Code.js"), "function hello() {}");

      await expect(
        loadAppsScriptPushRequest({
          projectRoot: root,
          outputDir,
          projectScriptId: "script-id",
        }),
      ).resolves.toMatchObject({ scriptId: "script-id" });
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("validate build output before loading script id", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(root, "dist");

    try {
      fs.mkdirSync(outputDir);

      fs.writeFileSync(path.join(root, ".clasp.json"), "{ invalid");
      fs.writeFileSync(path.join(outputDir, "Code.js"), "function hello() {}");

      await expect(
        loadAppsScriptPushRequest({
          projectRoot: root,
          outputDir,
        }),
      ).rejects.toThrow("Apps Script manifest not found: appsscript.json");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
