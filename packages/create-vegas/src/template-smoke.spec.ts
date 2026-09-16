import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { scaffoldProject } from "./scaffold-project";

const CREATE_VEGAS_ROOT = path.resolve(import.meta.dirname, "..");

const templateCases = [
  ["template-vanilla", "src/client/main.ts", "setupCounter"],
  ["template-react", "src/client/main.tsx", "react-dom/client"],
  ["template-preact", "src/client/main.tsx", "from 'preact'"],
  ["template-vue", "src/client/main.tsx", 'from "vue"'],
  ["template-svelte", "src/client/main.ts", "from 'svelte'"],
  ["template-solid", "src/client/main.tsx", "solid-js/web"],
] as const;

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "create-vegas-template-smoke-"),
  );

  tempDirs.push(directory);

  return directory;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

describe("create-vegas templates", () => {
  test.each(templateCases)(
    "scaffolds %s",
    (templateName, clientEntry, clientMarker) => {
      const root = createTempDir();

      const templateDirectory = path.join(
        CREATE_VEGAS_ROOT,
        templateName,
      );

      const targetDirectory = path.join(root, "project");

      scaffoldProject({
        templateDirectory,
        targetDirectory,
        packageName: "smoke-project",
        operation: "create",
      });

      const packageJson = JSON.parse(
        fs.readFileSync(
          path.join(targetDirectory, "package.json"),
          "utf8",
        ),
      ) as {
        name?: string;
      };

      expect(packageJson.name).toBe("smoke-project");

      expect(
        fs.existsSync(path.join(targetDirectory, ".gitignore")),
      ).toBe(true);

      expect(
        fs.existsSync(path.join(targetDirectory, "_gitignore")),
      ).toBe(false);

      expect(
        fs.existsSync(path.join(targetDirectory, ".clasp.json")),
      ).toBe(false);

      const vegasConfig = fs.readFileSync(
        path.join(targetDirectory, "vegas.config.ts"),
        "utf8",
      );

      expect(vegasConfig).toContain(
        "from '@vegasjs/vegas/client'",
      );

      expect(vegasConfig).toContain("appsScript:");
      expect(vegasConfig).toContain("scriptId: ''");
      expect(vegasConfig).toContain("manifest: {}");

      const clientEntryPath = path.join(
        targetDirectory,
        clientEntry,
      );

      expect(fs.existsSync(clientEntryPath)).toBe(true);

      expect(
        fs.readFileSync(clientEntryPath, "utf8"),
      ).toContain(clientMarker);

      expect(
        fs.existsSync(
          path.join(
            targetDirectory,
            "src",
            "server",
            "Code.ts",
          ),
        ),
      ).toBe(true);
    },
  );
});
