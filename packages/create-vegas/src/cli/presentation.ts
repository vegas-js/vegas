import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";

import type { CreateProjectStep } from "../create-project";
import { templates } from "../templates";

export interface CreateProjectResultPresentation {
  readonly cwd: string;
  readonly directory: string;
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

export function showCreateProjectStep(step: CreateProjectStep): void {
  switch (step.kind) {
    case "scaffold":
      prompts.log.step(`Scaffolding project in ${step.directory}...`);
      return;
    case "install-dependencies":
      prompts.log.step("Installing dependencies with npm...");
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
    const outroText = [
      "Done. Now run:\n",
      `  cd ${path.relative(options.cwd, options.directory)}`,
      "  npm install",
    ];

    if (options.scriptId !== undefined) {
      outroText.push("  npm run login -- <oauth-client-json>");
    }

    outroText.push("  npm run dev");

    prompts.outro(outroText.join("\n"));
    return;
  }

  if (!options.startDevServer) {
    prompts.outro("Done.");
  }
}
