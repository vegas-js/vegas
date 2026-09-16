#!/usr/bin/env node
import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import * as prompts from "@clack/prompts";
import { cac } from "cac";
import spawn from "cross-spawn";

import { writeAppsScriptScriptId } from "./apps-script-config";
import { validatePackageName } from "./package-name";
import { resolveScaffoldTarget } from "./scaffold-target";

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
  { label: util.styleText("blue", "Solid"), value: "template-solid" },
];

function cancelHandler() {
  prompts.cancel("Operation cancelled");
  process.exit(0);
}

async function run(directory?: string) {
  const ctx = {
    projectName: "",
    directoryOperation: "ignore",
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

  const target = resolveScaffoldTarget(process.cwd(), ctx.projectName, ctx.packageName);
  const packagePath = target.directory;
  prompts.log.step(`Scaffolding project in ${packagePath}...`);

  if (ctx.directoryOperation === "remove") {
    fs.rmSync(packagePath, { recursive: true, force: true });
  }
  fs.cpSync(path.resolve(import.meta.dirname, "..", ctx.framework), packagePath, {
    recursive: true,
    force: true,
  });

  if (ctx.configureAppsScript) {
    writeAppsScriptScriptId(path.join(packagePath, "vegas.config.ts"), ctx.scriptId);
  }

  await runCmd("npm", ["pkg", "set", `name=${target.packageName}`], {
    cwd: packagePath,
  });
  fs.renameSync(path.join(packagePath, "_gitignore"), path.join(packagePath, ".gitignore"));
  if (fs.existsSync(path.join(packagePath, "_oxlintrc.json"))) {
    fs.renameSync(
      path.join(packagePath, "_oxlintrc.json"),
      path.join(packagePath, "oxlintrc.json"),
    );
  }
  if (ctx.installDependencies) {
    prompts.log.step("Installing dependencies with npm...");
    await runCmd("npm", ["install"], {
      cwd: packagePath,
      stdio: "inherit",
    });

    if (ctx.loginAppsScript) {
      prompts.log.step("Signing in to Google for Apps Script...");

      await runCmd("npm", ["run", "login", "--", ctx.oauthClientFile], {
        cwd: packagePath,
        stdio: "inherit",
      });
    }

    if (ctx.startDevServer) {
      prompts.log.step("Starting dev server...");

      await runCmd("npm", ["run", "dev"], {
        cwd: packagePath,
        stdio: "inherit",
      });
    }
  }

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
cli.parse();
