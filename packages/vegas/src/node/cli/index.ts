#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../../../package.json";
import { runAuth } from "./auth-login";
import { runBuild } from "./build";
import { formatCliError } from "./error";
import { runPreview } from "./preview";
import { runPush } from "./push";
import { runServe } from "./serve";

const cli = cac("vegas");
cli.version(pkg.version);

// serve
cli.command("[root]").alias("serve").alias("dev").action(runServe);

// preview
cli.command("preview [root]").action(runPreview);

// build
cli.command("build [root]").action(runBuild);

// auth
cli
  .command("auth <action> [client-file]")
  .option("--profile <profile>", "Use an Apps Script authentication profile")
  .action(runAuth);

// push
cli
  .command("push [root]")
  .option("--profile <profile>", "Use an Apps Script authentication profile")
  .action(runPush);

cli.help();

try {
  cli.parse(process.argv, { run: false });

  await cli.runMatchedCommand();
} catch (error) {
  const message = formatCliError(error);

  if (message === undefined) {
    throw error;
  }

  console.error(message);
  process.exitCode = 1;
}
