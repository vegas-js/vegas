import type { SpawnOptions } from "node:child_process";

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

  options.onStep?.({ kind: "install-dependencies" });

  await runCommand("npm", ["install"], {
    cwd: target.directory,
    ...inheritedStdio,
  });

  if (options.oauthClientFile !== undefined) {
    options.onStep?.({ kind: "login-apps-script" });

    await runCommand("npm", ["run", "login", "--", options.oauthClientFile], {
      cwd: target.directory,
      ...inheritedStdio,
    });
  }

  if (options.startDevServer) {
    options.onStep?.({ kind: "start-dev-server" });

    await runCommand("npm", ["run", "dev"], {
      cwd: target.directory,
      ...inheritedStdio,
    });
  }

  return target;
}
