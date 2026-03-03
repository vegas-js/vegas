#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import * as prompts from "@clack/prompts";
import { cac } from "cac";
import spawn from "cross-spawn";

const frameworkOptions: {
  value: string;
  label?: string | undefined;
}[] = [{ label: "React", value: "template-react" }];

function cancelHandler() {
  prompts.cancel("Operation cancelled");
  process.exit(0);
}

async function run() {
  const ctx = {
    projectName: "",
    directoryOperation: "ignore",
    packageName: "",
    framework: "",
    npmStartUp: false,
  };

  ctx.projectName = (await prompts.text({
    message: "Project name:",
    placeholder: "vegas-project",
    defaultValue: "vegas-project",
  })) as string;

  if (prompts.isCancel(ctx.projectName)) {
    cancelHandler();
  }

  if (fs.existsSync(ctx.projectName)) {
    ctx.directoryOperation = (await prompts.select({
      message: `Target directory "${ctx.projectName}" is not empty. Please choose how to proceed:`,
      options: [
        { label: "Cancel operation", value: "cancel" },
        { label: "Remove existing files and continue", value: "remove" },
        { label: "Ignore files and continue", value: "ignore" },
      ],
    })) as string;

    if (prompts.isCancel(ctx.directoryOperation) || ctx.directoryOperation === "cancel") {
      cancelHandler();
    }
  }

  ctx.packageName = ctx.projectName.includes(" ")
    ? ((await prompts.text({
        message: "Package name:",
        placeholder: ctx.projectName.replaceAll(" ", "-"),
        defaultValue: ctx.projectName.replaceAll(" ", "-"),
        validate: (value) =>
          !value || value.includes(" ") ? "Invalid package.json name" : undefined,
      })) as string)
    : ctx.projectName;

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

  ctx.npmStartUp = (await prompts.confirm({
    message: "Install with npm and start now?",
  })) as boolean;

  if (prompts.isCancel(ctx.npmStartUp)) {
    cancelHandler();
  }

  if (ctx.directoryOperation === "remove") {
    fs.rmSync(ctx.projectName, { recursive: true, force: true });
  }
  fs.cpSync(path.join(import.meta.dirname, "..", ctx.framework), ctx.projectName, {
    recursive: true,
    force: true,
  });

  spawn.sync("npm", ["pkg", "set", `name=${ctx.projectName}`], { cwd: ctx.projectName });
  fs.renameSync(path.join(ctx.projectName, "_gitignore"), path.join(ctx.projectName, ".gitignore"));
  if (ctx.npmStartUp) {
    spawn.sync("npm", ["install"], { cwd: ctx.projectName });
  }
}

const cli = cac("create-vegas");

cli.command("[...option] [directory]").action(run);

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
cli.parse();
