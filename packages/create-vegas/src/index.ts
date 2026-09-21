#!/usr/bin/env node
import path from "node:path";

import { cac } from "cac";

import { collectCreateProjectInput } from "./cli/input";
import {
  createTemplatePromptOptions,
  formatTemplateHelp,
  showCancelled,
  showCreateProjectResult,
  showCreateProjectStep,
} from "./cli/presentation";
import { createProject } from "./create-project";
import { formatCreateVegasError } from "./error";
import { resolveTemplate } from "./templates";

const templateOptions = createTemplatePromptOptions();

async function run(directory?: string) {
  const cwd = process.cwd();

  const input = await collectCreateProjectInput({
    cwd,
    directory,
    templateOptions,
  });

  if (input === undefined) {
    showCancelled();
    return;
  }

  const template = resolveTemplate(input.templateId);

  const target = await createProject({
    cwd,
    projectName: input.projectName,
    packageName: input.packageName,
    packageManager: input.packageManager,
    templateDirectory: path.resolve(import.meta.dirname, "..", template.directory),
    operation: input.operation,
    scriptId: input.scriptId,
    installDependencies: input.installDependencies,
    oauthClientFile: input.oauthClientFile,
    startDevServer: input.startDevServer,
    onStep: showCreateProjectStep,
  });

  showCreateProjectResult({
    cwd,
    directory: target.directory,
    packageManager: input.packageManager,
    scriptId: input.scriptId,
    installDependencies: input.installDependencies,
    startDevServer: input.startDevServer,
  });
}

const cli = cac("create-vegas");

cli.command("[directory]").action(run);

cli.help((defaultHelpSections: { title?: string; body: string }[]) => {
  return defaultHelpSections
    .concat({
      title: "Available templates (only typescript)",
      body: formatTemplateHelp(),
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
