#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";
import { cac } from "cac";

import { createProject, type CreateProjectStep } from "./create-project";
import { CreateVegasUsageError, formatCreateVegasError } from "./error";
import { validatePackageName } from "./package-name";
import { inspectScaffoldDirectory } from "./scaffold-directory";
import type { ScaffoldDirectoryOperation } from "./scaffold-project";

const frameworkOptions: { value: string; label: string }[] = [
  { label: util.styleText("yellow", "Vanilla"), value: "template-vanilla" },
  { label: util.styleText("green", "Vue"), value: "template-vue" },
  { label: util.styleText("cyan", "React"), value: "template-react" },
  { label: util.styleText("magenta", "Preact"), value: "template-preact" },
  { label: util.styleText("red", "Svelte"), value: "template-svelte" },
  { label: util.styleText("blue", "Solid"), value: "template-solid" },
];

function cancelHandler() {
  prompts.cancel("Operation cancelled");
  process.exit(0);
}

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
  const ctx = {
    projectName: "",
    directoryOperation: "create" as ScaffoldDirectoryOperation,
    packageName: "",
    framework: "",
    useOxcStack: false,
    installDependencies: false,
    startDevServer: false,
    configureAppsScript: false,
    loginAppsScript: false,
    scriptId: "",
    oauthClientFile: "",
  };

  if (directory) {
    ctx.projectName = directory;
  } else {
    ctx.projectName = (await prompts.text({
      message: "Project name:",
      placeholder: "vegas-project",
      defaultValue: "vegas-project",
    })) as string;

    if (prompts.isCancel(ctx.projectName)) {
      cancelHandler();
    }
  }

  const directoryState = inspectScaffoldDirectory(ctx.projectName);

  if (directoryState === "invalid") {
    throw new CreateVegasUsageError(`Target path "${ctx.projectName}" is not a directory.`);
  }

  if (directoryState === "non-empty") {
    const directoryOperation = await prompts.select({
      message: `Target directory "${ctx.projectName}" is not empty. Please choose how to proceed:`,
      options: [
        {
          label: "Cancel operation",
          value: "cancel",
        },
        {
          label: "Remove existing files and continue",
          value: "remove",
        },
        {
          label: "Keep existing files and continue",
          value: "keep",
        },
      ],
    });

    if (prompts.isCancel(directoryOperation) || directoryOperation === "cancel") {
      cancelHandler();
    }

    ctx.directoryOperation = directoryOperation as ScaffoldDirectoryOperation;
  }

  const defaultPackageName = path.basename(ctx.projectName);

  ctx.packageName =
    validatePackageName(defaultPackageName) === undefined
      ? defaultPackageName
      : ((await prompts.text({
          message: "Package name:",
          placeholder: defaultPackageName.toLowerCase().replaceAll(" ", "-"),
          defaultValue: defaultPackageName.toLowerCase().replaceAll(" ", "-"),
          validate: validatePackageName,
        })) as string);

  if (prompts.isCancel(ctx.packageName)) {
    cancelHandler();
  }

  ctx.framework = (await prompts.select({
    message: "Select a framework:",
    options: frameworkOptions,
  })) as string;

  if (prompts.isCancel(ctx.framework)) {
    cancelHandler();
  }

  ctx.configureAppsScript = (await prompts.confirm({
    message: "Configure Apps Script now?",
  })) as boolean;

  if (prompts.isCancel(ctx.configureAppsScript)) {
    cancelHandler();
  }

  if (ctx.configureAppsScript) {
    ctx.scriptId = (await prompts.text({
      message: "Apps Script script ID:",
      validate: (value) =>
        !value || value.trim().length === 0 ? "Apps Script script ID is required" : undefined,
    })) as string;

    if (prompts.isCancel(ctx.scriptId)) {
      cancelHandler();
    }

    ctx.scriptId = ctx.scriptId.trim();
  }

  ctx.installDependencies = (await prompts.confirm({
    message: "Install dependencies with npm now?",
  })) as boolean;

  if (prompts.isCancel(ctx.installDependencies)) {
    cancelHandler();
  }

  if (ctx.configureAppsScript && ctx.installDependencies) {
    ctx.loginAppsScript = (await prompts.confirm({
      message: "Sign in to Google for Apps Script now?",
    })) as boolean;

    if (prompts.isCancel(ctx.loginAppsScript)) {
      cancelHandler();
    }
  }

  if (ctx.loginAppsScript) {
    const clientFile = (await prompts.text({
      message: "OAuth client JSON:",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "OAuth client JSON path is required";
        }

        const filePath = path.resolve(process.cwd(), value.trim());

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return "OAuth client JSON file not found";
        }

        return undefined;
      },
    })) as string;

    if (prompts.isCancel(clientFile)) {
      cancelHandler();
    }

    ctx.oauthClientFile = path.resolve(process.cwd(), clientFile.trim());
  }

  if (ctx.installDependencies) {
    ctx.startDevServer = (await prompts.confirm({
      message: "Start the dev server after setup?",
    })) as boolean;

    if (prompts.isCancel(ctx.startDevServer)) {
      cancelHandler();
    }
  }

  const target = await createProject({
    cwd: process.cwd(),
    projectName: ctx.projectName,
    packageName: ctx.packageName,
    templateDirectory: path.resolve(import.meta.dirname, "..", ctx.framework),
    operation: ctx.directoryOperation,
    scriptId: ctx.configureAppsScript ? ctx.scriptId : undefined,
    installDependencies: ctx.installDependencies,
    oauthClientFile: ctx.loginAppsScript ? ctx.oauthClientFile : undefined,
    startDevServer: ctx.startDevServer,
    onStep: logCreateProjectStep,
  });

  const packagePath = target.directory;

  if (!ctx.installDependencies) {
    const outroText = [
      "Done. Now run:\n",
      `  cd ${path.relative(process.cwd(), packagePath)}`,
      "  npm install",
    ];

    if (ctx.configureAppsScript) {
      outroText.push("  npm run login -- <oauth-client-json>");
    }

    outroText.push("  npm run dev");

    prompts.outro(outroText.join("\n"));
  }

  if (ctx.installDependencies && !ctx.startDevServer) {
    prompts.outro("Done.");
  }
}

const cli = cac("create-vegas");

cli.command("[directory]").action(run);

cli.help((defaultHelpSections: { title?: string; body: string }[]) => {
  return defaultHelpSections
    .concat({
      title: "Available templates (only typescript)",
      body: frameworkOptions
        .map((option) => option.value.padStart(option.value.length + 2))
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
