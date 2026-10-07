import type { SpawnOptions } from "node:child_process";

import {
  createInstallCommand,
  createRunScriptCommand,
  type PackageManager,
} from "./package-manager";
import { runCommand } from "./run-command";
import { scaffoldProject, type ScaffoldDirectoryOperation } from "./scaffold/project";
import { resolveScaffoldTarget, type ScaffoldTarget } from "./scaffold/target";

export type CreateProjectStep =
  | {
      readonly kind: "scaffold";
      readonly directory: string;
    }
  | {
      readonly kind: "install-dependencies";
      readonly packageManager: PackageManager;
    }
  | {
      readonly kind: "login-apps-script";
    }
  | {
      readonly kind: "start-dev-server";
    };

export interface CreateProjectOptions {
  readonly cwd: string;
  readonly projectName: string;
  readonly packageName: string;
  readonly packageManager: PackageManager;
  readonly templateDirectory: string;
  readonly operation: ScaffoldDirectoryOperation;
  readonly scriptId?: string;
  readonly installDependencies: boolean;
  readonly oauthClientFile?: string;
  readonly startDevServer: boolean;
  readonly onStep?: (step: CreateProjectStep) => void;
}

const inheritedStdio: SpawnOptions = {
  stdio: "inherit",
};

export async function createProject(options: CreateProjectOptions): Promise<ScaffoldTarget> {
  const target = resolveScaffoldTarget(options.cwd, options.projectName, options.packageName);

  options.onStep?.({
    kind: "scaffold",
    directory: target.directory,
  });

  scaffoldProject({
    templateDirectory: options.templateDirectory,
    targetDirectory: target.directory,
    packageName: target.packageName,
    operation: options.operation,
    scriptId: options.scriptId,
  });

  if (!options.installDependencies) {
    return target;
  }

  options.onStep?.({
    kind: "install-dependencies",
    packageManager: options.packageManager,
  });

  const installCommand = createInstallCommand(options.packageManager);
  await runCommand(installCommand.command, installCommand.args, {
    cwd: target.directory,
    ...inheritedStdio,
  });

  if (options.oauthClientFile !== undefined) {
    options.onStep?.({ kind: "login-apps-script" });

    const loginCommand = createRunScriptCommand(options.packageManager, "login", [
      options.oauthClientFile,
    ]);
    await runCommand(loginCommand.command, loginCommand.args, {
      cwd: target.directory,
      ...inheritedStdio,
    });
  }

  if (options.startDevServer) {
    options.onStep?.({ kind: "start-dev-server" });

    const devCommand = createRunScriptCommand(options.packageManager, "dev");
    await runCommand(devCommand.command, devCommand.args, {
      cwd: target.directory,
      ...inheritedStdio,
    });
  }

  return target;
}
