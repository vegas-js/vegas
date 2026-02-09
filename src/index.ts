#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../package.json";
import { runBuild } from "./build";

const cli = cac("vegas");
cli.version(pkg.version);

// serve
cli
  .command("[root]")
  .alias("serve")
  .alias("dev")
  .action((_root?: string) => {
    console.log("This feature is under development!");
  });

// build
cli.command("build [root]").action(runBuild);

// preview
cli.command("preview [root]").action((_root?: string) => {
  console.log("This feature is under development!");
});

cli.help();
cli.parse();
