import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";

import type { CreateProjectStep } from "../create-project";
import {
  createInstallCommand,
  createRunScriptCommand,
  type PackageManager,
  type PackageManagerCommand,
} from "../package-manager";
import { templates } from "../templates";

export interface CreateProjectResultPresentation {
  readonly cwd: string;
  readonly directory: string;
  readonly packageManager: PackageManager;
  readonly scriptId?: string;
  readonly installDependencies: boolean;
  readonly startDevServer: boolean;
}

export function createTemplatePromptOptions() {
  return templates.map((template) => ({
    label: util.styleText(template.color, template.label),
    value: template.id,
  }));
}

export function formatTemplateHelp(): string {
  return templates
    .map((template) => template.directory.padStart(template.directory.length + 2))
    .join("\n");
}

export function showCancelled(): void {
  prompts.cancel("Operation cancelled");
}

function formatPackageManagerCommand(command: PackageManagerCommand): string {
  return [command.command, ...command.args].join(" ");
}

export function showCreateProjectStep(step: CreateProjectStep): void {
  switch (step.kind) {
    case "scaffold":
      prompts.log.step(`Scaffolding project in ${step.directory}...`);
      return;
    case "install-dependencies":
      prompts.log.step(`Installing dependencies with ${step.packageManager}...`);
      return;
    case "login-apps-script":
      prompts.log.step("Signing in to Google for Apps Script...");
      return;
    case "start-dev-server":
      prompts.log.step("Starting dev server...");
  }
}

export function showCreateProjectResult(options: CreateProjectResultPresentation): void {
  if (!options.installDependencies) {
    const installCommand = createInstallCommand(options.packageManager);
    const outroText = [
      "Done. Now run:\n",
      `  cd ${path.relative(options.cwd, options.directory)}`,
      `  ${formatPackageManagerCommand(installCommand)}`,
    ];

    if (options.scriptId !== undefined) {
      const loginCommand = createRunScriptCommand(options.packageManager, "login", [
        "<oauth-client-json>",
      ]);
      outroText.push(`  ${formatPackageManagerCommand(loginCommand)}`);
    }

    const devCommand = createRunScriptCommand(options.packageManager, "dev");
    outroText.push(`  ${formatPackageManagerCommand(devCommand)}`);

    prompts.outro(outroText.join("\n"));
    return;
  }

  if (!options.startDevServer) {
    prompts.outro("Done.");
  }
}
