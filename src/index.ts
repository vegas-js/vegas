#!/usr/bin/env node
import { cac } from "cac";

import pkg from "../package.json";

const cli = cac("vegas");
cli.version(pkg.version);

cli.command("").action(() => console.log("it works!"));

cli.help();
cli.parse();
