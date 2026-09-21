import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { scaffoldProject } from "./scaffold/project";
import { templates } from "./templates";

const CREATE_VEGAS_ROOT = path.resolve(import.meta.dirname, "..");

const templateCases = [
  ["template-vanilla", "src/client/main.ts", "setupCounter", "tsc -b && vegas build"],
  ["template-react", "src/client/main.tsx", "react-dom/client", "tsc -b && vegas build"],
  ["template-preact", "src/client/main.tsx", "from 'preact'", "tsc -b && vegas build"],
  ["template-vue", "src/client/main.tsx", 'from "vue"', "vue-tsc -b && vegas build"],
  ["template-svelte", "src/client/main.ts", "from 'svelte'", "vegas build"],
  ["template-solid", "src/client/main.tsx", "solid-js/web", "tsc -b && vegas build"],
] as const;

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-template-smoke-"));

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
  test("smoke matrix covers registered templates", () => {
    const smokeTemplates = templateCases.map(([templateName]) => templateName).sort();
    const registeredTemplates = templates.map((template) => template.directory).sort();

    expect(smokeTemplates).toStrictEqual(registeredTemplates);
  });

  test.each(templateCases)(
    "scaffolds %s",
    (templateName, clientEntry, clientMarker, buildScript) => {
      const root = createTempDir();

      const templateDirectory = path.join(CREATE_VEGAS_ROOT, templateName);

      const targetDirectory = path.join(root, "project");

      scaffoldProject({
        templateDirectory,
        targetDirectory,
        packageName: "smoke-project",
        operation: "create",
      });

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(targetDirectory, "package.json"), "utf8"),
      ) as {
        name?: string;
        scripts?: {
          build?: string;
          check?: string;
        };
      };

      expect(packageJson.name).toBe("smoke-project");
      expect(packageJson.scripts?.build).toBe(buildScript);
      if (templateName === "template-svelte") {
        expect(packageJson.scripts?.check).toBe(
          "svelte-check --tsconfig ./tsconfig.client.json && tsc -p tsconfig.server.json && tsc -p tsconfig.node.json",
        );
      }

      expect(fs.existsSync(path.join(targetDirectory, ".gitignore"))).toBe(true);
      expect(fs.existsSync(path.join(targetDirectory, "_gitignore"))).toBe(false);
      expect(fs.existsSync(path.join(targetDirectory, ".clasp.json"))).toBe(false);

      const vegasConfig = fs.readFileSync(path.join(targetDirectory, "vegas.config.ts"), "utf8");

      expect(vegasConfig).toContain("from '@vegasjs/vegas'");
      expect(vegasConfig).toContain("appsScript:");
      expect(vegasConfig).toContain("scriptId: ''");
      expect(vegasConfig).toContain("manifest: {}");

      const serverTsconfig = fs.readFileSync(
        path.join(targetDirectory, "tsconfig.server.json"),
        "utf8",
      );

      expect(serverTsconfig).toContain('"types": ["@vegasjs/vegas/server"]');

      const clientEntryPath = path.join(targetDirectory, clientEntry);

      expect(fs.existsSync(clientEntryPath)).toBe(true);
      expect(fs.readFileSync(clientEntryPath, "utf8")).toContain(clientMarker);

      expect(fs.existsSync(path.join(targetDirectory, "src", "server", "Code.ts"))).toBe(true);
    },
  );
});
