import fs from "node:fs";
import path from "node:path";

import * as prompts from "@clack/prompts";

import { CreateVegasUsageError } from "./error";
import { validatePackageName } from "./package-name";
import { inspectScaffoldDirectory } from "./scaffold/directory";
import type { ScaffoldDirectoryOperation } from "./scaffold/project";

export interface CreateProjectInput {
  readonly projectName: string;
  readonly packageName: string;
  readonly templateId: string;
  readonly operation: ScaffoldDirectoryOperation;
  readonly scriptId?: string;
  readonly installDependencies: boolean;
  readonly oauthClientFile?: string;
  readonly startDevServer: boolean;
}

interface CollectCreateProjectInputOptions {
  readonly cwd: string;
  readonly directory?: string;
  readonly templateOptions: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

function isPromptCancel(value: unknown): value is symbol {
  return prompts.isCancel(value);
}

async function collectProjectName(directory: string | undefined): Promise<string | undefined> {
  if (directory !== undefined) {
    return directory;
  }

  const projectName = await prompts.text({
    message: "Project name:",
    placeholder: "vegas-project",
    defaultValue: "vegas-project",
  });

  return isPromptCancel(projectName) ? undefined : projectName;
}

async function collectDirectoryOperation(
  projectName: string,
  cwd: string,
): Promise<ScaffoldDirectoryOperation | undefined> {
  const directoryState = inspectScaffoldDirectory(path.resolve(cwd, projectName));

  if (directoryState === "invalid") {
    throw new CreateVegasUsageError(`Target path "${projectName}" is not a directory.`);
  }

  if (directoryState !== "non-empty") {
    return "create";
  }

  const operation = await prompts.select({
    message: `Target directory "${projectName}" is not empty. Please choose how to proceed:`,
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

  if (isPromptCancel(operation) || operation === "cancel") {
    return undefined;
  }

  return operation;
}

async function collectPackageName(projectName: string): Promise<string | undefined> {
  const defaultPackageName = path.basename(projectName);

  if (validatePackageName(defaultPackageName) === undefined) {
    return defaultPackageName;
  }

  const normalizedPackageName = defaultPackageName.toLowerCase().replaceAll(" ", "-");

  const packageName = await prompts.text({
    message: "Package name:",
    placeholder: normalizedPackageName,
    defaultValue: normalizedPackageName,
    validate: validatePackageName,
  });

  return isPromptCancel(packageName) ? undefined : packageName;
}

async function collectScriptId(): Promise<string | undefined | null> {
  const configureAppsScript = await prompts.confirm({
    message: "Configure Apps Script now?",
  });

  if (isPromptCancel(configureAppsScript)) {
    return null;
  }

  if (!configureAppsScript) {
    return undefined;
  }

  const scriptId = await prompts.text({
    message: "Apps Script script ID:",
    validate: (value) =>
      !value || value.trim().length === 0 ? "Apps Script script ID is required" : undefined,
  });

  if (isPromptCancel(scriptId)) {
    return null;
  }

  return scriptId.trim();
}

function validateOauthClientFile(cwd: string, value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return "OAuth client JSON path is required";
  }

  const filePath = path.resolve(cwd, value.trim());

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return "OAuth client JSON file not found";
  }

  return undefined;
}

export async function collectCreateProjectInput(
  options: CollectCreateProjectInputOptions,
): Promise<CreateProjectInput | undefined> {
  const projectName = await collectProjectName(options.directory);

  if (projectName === undefined) {
    return undefined;
  }

  const operation = await collectDirectoryOperation(projectName, options.cwd);

  if (operation === undefined) {
    return undefined;
  }

  const packageName = await collectPackageName(projectName);

  if (packageName === undefined) {
    return undefined;
  }

  const templateId = await prompts.select({
    message: "Select a framework:",
    options: [...options.templateOptions],
  });

  if (isPromptCancel(templateId)) {
    return undefined;
  }

  const scriptId = await collectScriptId();

  if (scriptId === null) {
    return undefined;
  }

  const installDependencies = await prompts.confirm({
    message: "Install dependencies with npm now?",
  });

  if (isPromptCancel(installDependencies)) {
    return undefined;
  }

  let oauthClientFile: string | undefined;

  if (scriptId !== undefined && installDependencies) {
    const loginAppsScript = await prompts.confirm({
      message: "Sign in to Google for Apps Script now?",
    });

    if (isPromptCancel(loginAppsScript)) {
      return undefined;
    }

    if (loginAppsScript) {
      const clientFile = await prompts.text({
        message: "OAuth client JSON:",
        validate: (value) => validateOauthClientFile(options.cwd, value),
      });

      if (isPromptCancel(clientFile)) {
        return undefined;
      }

      oauthClientFile = path.resolve(options.cwd, clientFile.trim());
    }
  }

  let startDevServer = false;

  if (installDependencies) {
    const shouldStartDevServer = await prompts.confirm({
      message: "Start the dev server after setup?",
    });

    if (isPromptCancel(shouldStartDevServer)) {
      return undefined;
    }

    startDevServer = shouldStartDevServer;
  }

  return {
    projectName,
    packageName,
    templateId,
    operation,
    scriptId,
    installDependencies,
    oauthClientFile,
    startDevServer,
  };
}
