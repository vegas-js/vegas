#!/usr/bin/env node
import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";
import { cac } from "cac";

import { collectCreateProjectInput } from "./collect-project-input";
import { createProject, type CreateProjectStep } from "./create-project";
import { formatCreateVegasError } from "./error";
import { resolveTemplate, templates } from "./templates";

const templateOptions = templates.map((template) => ({
  label: util.styleText(template.color, template.label),
  value: template.id,
}));

function logCreateProjectStep(step: CreateProjectStep): void {
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

async function run(directory?: string) {
  const cwd = process.cwd();

  const input = await collectCreateProjectInput({
    cwd,
    directory,
    templateOptions,
  });

  if (input === undefined) {
    prompts.cancel("Operation cancelled");
    return;
  }

  const template = resolveTemplate(input.templateId);

  const target = await createProject({
    cwd,
    projectName: input.projectName,
    packageName: input.packageName,
    templateDirectory: path.resolve(import.meta.dirname, "..", template.directory),
    operation: input.operation,
    scriptId: input.scriptId,
    installDependencies: input.installDependencies,
    oauthClientFile: input.oauthClientFile,
    startDevServer: input.startDevServer,
    onStep: logCreateProjectStep,
  });

  const packagePath = target.directory;

  if (!input.installDependencies) {
    const outroText = [
      "Done. Now run:\n",
      `  cd ${path.relative(cwd, packagePath)}`,
      "  npm install",
    ];

    if (input.scriptId !== undefined) {
      outroText.push("  npm run login -- <oauth-client-json>");
    }

    outroText.push("  npm run dev");

    prompts.outro(outroText.join("\n"));
  }

  if (input.installDependencies && !input.startDevServer) {
    prompts.outro("Done.");
  }
}

const cli = cac("create-vegas");

cli.command("[directory]").action(run);

cli.help((defaultHelpSections: { title?: string; body: string }[]) => {
  return defaultHelpSections
    .concat({
      title: "Available templates (only typescript)",
      body: templates
        .map((template) => template.directory.padStart(template.directory.length + 2))
        .join("\n"),
    })
    .filter((section) => section.title?.match(/^(?!(Commands|For more info))/));
});

try {
  cli.parse(process.argv, {
    run: false,
  });

  await cli.runMatchedCommand();
} catch (error) {
  const message = formatCreateVegasError(error);

  if (message === undefined) {
    throw error;
  }

  console.error(message);
  process.exitCode = 1;
}
