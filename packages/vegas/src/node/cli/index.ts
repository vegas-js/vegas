#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../../../package.json";
import { runBuild } from "./build";
import { runPreview } from "./preview";
import { runServe } from "./serve";

const cli = cac("vegas");
cli.version(pkg.version);

// serve
cli.command("[root]").alias("serve").alias("dev").action(runServe);

// preview
cli.command("preview [root]").action(runPreview);

// build
cli.command("build [root]").action(runBuild);

cli.help();
cli.parse();
