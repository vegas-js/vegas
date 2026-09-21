import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { scaffoldProject } from "./project";

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-project-"));
  tempDirs.push(directory);

  return directory;
}

function createTemplate(root: string): string {
  const templateDirectory = path.join(root, "template");

  fs.mkdirSync(path.join(templateDirectory, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(templateDirectory, "package.json"),
    JSON.stringify(
      {
        name: "template-project",
        private: true,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(templateDirectory, "vegas.config.ts"),
    "export default { appsScript: { scriptId: '' } };\n",
  );

  fs.writeFileSync(path.join(templateDirectory, "_gitignore"), "node_modules\n");
  fs.writeFileSync(path.join(templateDirectory, "_oxlintrc.json"), "{}\n");
  fs.writeFileSync(path.join(templateDirectory, "src", "main.ts"), "console.log('template');\n");
  fs.writeFileSync(path.join(templateDirectory, "template-only.txt"), "template\n");

  return templateDirectory;
}

function readPackageName(targetDirectory: string): string {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(targetDirectory, "package.json"), "utf8"),
  ) as { name: string };

  return packageJson.name;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

describe("scaffoldProject", () => {
  test("create project in missing directory", () => {
    const root = createTempDir();
    const templateDirectory = createTemplate(root);
    const targetDirectory = path.join(root, "project");

    scaffoldProject({
      templateDirectory,
      targetDirectory,
      packageName: "my-app",
      operation: "create",
      scriptId: "script-123",
    });

    expect(readPackageName(targetDirectory)).toBe("my-app");

    expect(fs.readFileSync(path.join(targetDirectory, ".gitignore"), "utf8")).toBe(
      "node_modules\n",
    );
    expect(fs.existsSync(path.join(targetDirectory, "_gitignore"))).toBe(false);
    expect(fs.existsSync(path.join(targetDirectory, "oxlintrc.json"))).toBe(true);
    expect(fs.readFileSync(path.join(targetDirectory, "vegas.config.ts"), "utf8")).toContain(
      'scriptId: "script-123"',
    );
  });

  test("create project in empty directory", () => {
    const root = createTempDir();
    const templateDirectory = createTemplate(root);
    const targetDirectory = path.join(root, "project");

    fs.mkdirSync(targetDirectory);

    scaffoldProject({
      templateDirectory,
      targetDirectory,
      packageName: "my-app",
      operation: "create",
    });

    expect(readPackageName(targetDirectory)).toBe("my-app");

    expect(fs.existsSync(path.join(targetDirectory, "src", "main.ts"))).toBe(true);
  });

  test("keep existing project files", () => {
    const root = createTempDir();
    const templateDirectory = createTemplate(root);
    const targetDirectory = path.join(root, "project");

    fs.mkdirSync(path.join(targetDirectory, "src"), { recursive: true });

    fs.writeFileSync(
      path.join(targetDirectory, "package.json"),
      JSON.stringify({
        name: "existing-app",
        private: true,
      }),
    );

    fs.writeFileSync(path.join(targetDirectory, "vegas.config.ts"), "existing config\n");
    fs.writeFileSync(path.join(targetDirectory, ".gitignore"), "existing ignore\n");
    fs.writeFileSync(path.join(targetDirectory, "src", "main.ts"), "existing source\n");

    scaffoldProject({
      templateDirectory,
      targetDirectory,
      packageName: "new-app",
      operation: "keep",
      scriptId: "new-script-id",
    });

    expect(readPackageName(targetDirectory)).toBe("existing-app");

    expect(fs.readFileSync(path.join(targetDirectory, "vegas.config.ts"), "utf8")).toBe(
      "existing config\n",
    );
    expect(fs.readFileSync(path.join(targetDirectory, ".gitignore"), "utf8")).toBe(
      "existing ignore\n",
    );
    expect(fs.readFileSync(path.join(targetDirectory, "src", "main.ts"), "utf8")).toBe(
      "existing source\n",
    );
    expect(fs.readFileSync(path.join(targetDirectory, "template-only.txt"), "utf8")).toBe(
      "template\n",
    );
    expect(fs.existsSync(path.join(targetDirectory, "_gitignore"))).toBe(false);
  });

  test("remove existing project before scaffolding", () => {
    const root = createTempDir();
    const templateDirectory = createTemplate(root);
    const targetDirectory = path.join(root, "project");

    fs.mkdirSync(targetDirectory);
    fs.writeFileSync(path.join(targetDirectory, "old.txt"), "old\n");
    fs.writeFileSync(path.join(targetDirectory, ".gitignore"), "old ignore\n");

    scaffoldProject({
      templateDirectory,
      targetDirectory,
      packageName: "new-app",
      operation: "remove",
    });

    expect(fs.existsSync(path.join(targetDirectory, "old.txt"))).toBe(false);

    expect(readPackageName(targetDirectory)).toBe("new-app");

    expect(fs.readFileSync(path.join(targetDirectory, ".gitignore"), "utf8")).toBe(
      "node_modules\n",
    );
  });
});
