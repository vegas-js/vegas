#!/usr/bin/env node
import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";
import { cac } from "cac";
import spawn from "cross-spawn";

function runCmd(
  cmd: string,
  args?: readonly string[],
  options?: child_process.SpawnSyncOptionsWithBufferEncoding,
) {
  return new Promise<void>((resolve, reject) => {
    const sp = spawn(cmd, args, options);
    sp.on("error", reject);
    sp.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const messages: string[] = [cmd];
        if (args) {
          messages.push(...args);
        }
        messages.push("failed.", "Exit Code:", JSON.stringify(code));
        reject(new Error(messages.join(" ")));
      }
    });
  });
}

const frameworkOptions: { value: string; label: string }[] = [
  { label: util.styleText("yellow", "Vanilla"), value: "template-vanilla" },
  { label: util.styleText("green", "Vue"), value: "template-vue" },
  { label: util.styleText("cyan", "React"), value: "template-react" },
  { label: util.styleText("magenta", "Preact"), value: "template-preact" },
  { label: util.styleText("red", "Svelte"), value: "template-svelte" },
];

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
    useOxcStack: false,
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

  const packagePath = path.resolve(path.join(process.cwd(), ctx.projectName.replace(/\.\.?/g, "")));
  prompts.log.step(`Scaffolding project in ${packagePath}...`);

  if (ctx.directoryOperation === "remove") {
    fs.rmSync(packagePath, { recursive: true, force: true });
  }
  fs.cpSync(path.join(import.meta.dirname, "..", ctx.framework), packagePath, {
    recursive: true,
    force: true,
  });

  await runCmd("npm", ["pkg", "set", `name=${path.parse(ctx.projectName).base}`], {
    cwd: packagePath,
  });
  fs.renameSync(path.join(packagePath, "_gitignore"), path.join(packagePath, ".gitignore"));
  if (ctx.npmStartUp) {
    prompts.log.step("Installing dependencies with npm...");
    await runCmd("npm", ["install"], { cwd: packagePath, stdio: "inherit" });
    prompts.log.step("Starting dev server...");
    await runCmd("npm", ["run", "dev"], { cwd: packagePath, stdio: "inherit" });
  } else {
    const outroText = [
      "Done. Now run:\n",
      `  cd ${path.relative(process.cwd(), packagePath)}`,
      "  npm install",
      "  npm run dev",
    ];
    prompts.outro(outroText.join("\n"));
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
