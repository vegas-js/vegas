import fs from "node:fs";
import path from "node:path";

import { writeAppsScriptScriptId } from "./apps-script-config";
import { finalizeScaffoldFile, inspectScaffoldFileState } from "./scaffold-file";

export type ScaffoldDirectoryOperation = "create" | "remove" | "keep";

export interface ScaffoldProjectOptions {
  readonly templateDirectory: string;
  readonly targetDirectory: string;
  readonly packageName: string;
  readonly operation: ScaffoldDirectoryOperation;
  readonly scriptId?: string;
}

function writePackageName(packageJsonPath: string, packageName: string): void {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as Record<
    string,
    unknown
  >;

  packageJson.name = packageName;

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

export function scaffoldProject(options: ScaffoldProjectOptions): void {
  const packageJsonPath = path.join(options.targetDirectory, "package.json");

  const vegasConfigPath = path.join(options.targetDirectory, "vegas.config.ts");

  const gitignoreSourcePath = path.join(options.targetDirectory, "_gitignore");
  const gitignorePath = path.join(options.targetDirectory, ".gitignore");

  const oxlintSourcePath = path.join(options.targetDirectory, "_oxlintrc.json");
  const oxlintPath = path.join(options.targetDirectory, "oxlintrc.json");

  const preservePackageJson = options.operation === "keep" && fs.existsSync(packageJsonPath);

  const preserveVegasConfig = options.operation === "keep" && fs.existsSync(vegasConfigPath);

  if (options.operation === "remove") {
    fs.rmSync(options.targetDirectory, {
      recursive: true,
      force: true,
    });
  }

  const gitignoreState = inspectScaffoldFileState(gitignoreSourcePath, gitignorePath);
  const oxlintState = inspectScaffoldFileState(oxlintSourcePath, oxlintPath);

  fs.cpSync(options.templateDirectory, options.targetDirectory, {
    recursive: true,
    force: options.operation !== "keep",
  });

  if (options.scriptId !== undefined && !preserveVegasConfig) {
    writeAppsScriptScriptId(vegasConfigPath, options.scriptId);
  }

  if (!preservePackageJson) {
    writePackageName(packageJsonPath, options.packageName);
  }

  finalizeScaffoldFile(gitignoreSourcePath, gitignorePath, gitignoreState);
  finalizeScaffoldFile(oxlintSourcePath, oxlintPath, oxlintState);
}
