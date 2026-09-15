import fs from "node:fs";

import { loadProject } from "../project";
import { pushWithClasp } from "./clasp-push";

export async function runPush(root?: string) {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  if (!fs.existsSync(project.outputDir) || !fs.statSync(project.outputDir).isDirectory()) {
    throw new Error(`Build output directory not found: ${project.outputDir}`);
  }

  await pushWithClasp({
    projectRoot: project.root,
    outputDir: project.outputDir,
  });
}
