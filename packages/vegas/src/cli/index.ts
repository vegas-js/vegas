#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../../../../package.json";
import { runBuild } from "./build";
import { runServe } from "./serve";

const cli = cac("vegas");
cli.version(pkg.version);

// serve
cli.command("[root]").alias("serve").alias("dev").action(runServe);

// build
cli.command("build [root]").action(runBuild);

cli.help();
cli.parse();
