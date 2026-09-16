import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { writeAppsScriptScriptId } from "./apps-script-config";

describe("writeAppsScriptScriptId", () => {
  test("write script id to Vegas config", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-"));
    const configPath = path.join(directory, "vegas.config.ts");

    try {
      fs.writeFileSync(
        configPath,
        `export default defineConfig({
  appsScript: {
    scriptId: '',
    manifest: {},
  },
})
`,
      );

      writeAppsScriptScriptId(configPath, "script-id");

      expect(fs.readFileSync(configPath, "utf8")).toContain('scriptId: "script-id"');
    } finally {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject config without script id placeholder", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-"));
    const configPath = path.join(directory, "vegas.config.ts");

    try {
      fs.writeFileSync(configPath, "export default defineConfig({})\n");

      expect(() => writeAppsScriptScriptId(configPath, "script-id")).toThrow(
        "Apps Script script ID placeholder not found in Vegas config.",
      );
    } finally {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
