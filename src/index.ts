#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../package.json";

const cli = cac("vegas");
cli.version(pkg.version);

// serve
cli
  .command("[root]")
  .alias("serve")
  .alias("dev")
  .action((root?: string) => {
    console.log("it works!");
    console.log(`root is ${root}`);
  });

// build
cli.command("build [root]").action((_root?: string) => {
  console.log("This feature is under development!");
});

// preview
cli.command("preview [root]").action((_root?: string) => {
  console.log("This feature is under development!");
});

cli.help();
cli.parse();
